const { NotebookNode } = require('../js/notebook/notebook_node.js');
const { turnMultilineTextIntoHtml } = require('../js/html_utils.js');
const { yamlNotebook2forest, convertNotebookTreeToPreYamlJson } = require('../js/notebook/yaml2forest.js');
const { parseTagsFromRootForest } = require('../js/notebook/parse_tags.js');
const { showTagsAndLinks, showTagsAndLinksOfBottomPanel } = require('../js/notebook/show_tags.js');
const { NotesForestViewBuilder } = require('../js/notebook/notes_forest_view_builder.js');
const {
  appendNotesForestHtml,
  appendNotesForestHtmlToBottomPanel,
  buildInitialNotesForest,
  openNotesInForest,
  highlightNotesInForest,
  buildTagsAndLinksForest,
  openTagsInForest,
  highlightTagsInForest,
  initResizers,
  initPanelButtons,
  initNotesContentTopWrapperContextMenu,
  handleKeyDown,
  handleKeyUp
} = require('../js/notebook/notebook_utils.js');

let my = {
  notesForest: null,
  isCursorOnRightSide: true,
  isCursorOnTopRightPanel: true,
  isCursorOnBottomRightPanel: false,
  rightBottomNodeInRectangle: undefined,
  rightTopNodeInRectangle: undefined,
  rightSideNodeInRectangle: undefined,
  isKeyboardListenerDisabled: false,
  hasChangesInNotebook: false,
  isHiddenTagsPanel: false,
};

window.my = my;

window.webkit.messageHandlers.foobar.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  try {
    if (msg.type == "error_message") {
      let notebookContentWrapper = document.getElementById("notes-content-top-wrapper");
      notebookContentWrapper.innerHTML = "";
      let errorMessage = msg.message;
      if (msg.notebook_location) {
        errorMessage = `file location: ${msg.notebook_location}\n${errorMessage}`;
      }
      let msgHtml = turnMultilineTextIntoHtml(errorMessage);
      notebookContentWrapper.appendChild(msgHtml);
      return;
    }

    if (msg.type === 'contextmenu') {
      console.log(`context menu. value: ${msg.value}`);
      if (my.contextMenuHandler) {
        my.contextMenuHandler(msg.value);
        delete my.contextMenuHandler;
      }
      return;
    }

    if (msg.type === 'save-command') {
      saveNotebook();
      return;
    }

    if (msg.type === 'save_result') {
      if (my.save_result_handler) {
        my.save_result_handler(msg.result, msg);
        delete my.save_result_handler;
      }
      return;
    }

    if (msg.type === 'confirm_quit') {
      if (!my.hasChangesInNotebook) {
        window.webkit.messageHandlers.notebook_msgs__confirm_quit.postMessage();
        return;
      }
      let result = confirm('confirm quit without saving by pressing OK');
      if (result) {
        window.webkit.messageHandlers.notebook_msgs__confirm_quit.postMessage();
      }
      return;
    }

    if (!my.addedKeyListeners) {
      // let options = { capture: true, };
      let options = false;
      // document.body.addEventListener('keyup', (eve) => {
      window.addEventListener('keydown', (eve) => {
        handleKeyDown(eve);
      }, options);

      window.addEventListener('keyup', (eve) => {
        let handled = handleKeyUp(eve);
        if (!handled) {
          runActionFromKeyEvent(eve);
        }
      }, options);

      my.addedKeyListeners = true;
    }

    let config = msg.config;
    my.config = config;
    handleConfig(msg.config);
    let notes_object = msg.notes;

    let forestToConvertToNodes = yamlNotebook2forest(msg.notes);
    my.notebookTree = convertToNotebookNodes(forestToConvertToNodes);
    let forest = my.notebookTree.children;
    my.notesForest = forest;

    let tags = parseTagsFromRootForest(forest);
    let tagsAndLinksObj = buildTagsAndLinksForest(tags);
    my.tagsTree = tagsAndLinksObj;
    showTagsAndLinks(tagsAndLinksObj);
    showTagsAndLinksOfBottomPanel(tagsAndLinksObj);

    initResizers();
    initPanelButtons();
    initNotesContentTopWrapperContextMenu(tagsAndLinksObj);

    let configMaximizeNotesBottomPanel = config.notebook['start-with-bottom-panel-of-notes-maximized'];
    if (configMaximizeNotesBottomPanel) {

      let viewBuilder = new NotesForestViewBuilder();
      viewBuilder.buildView(my.notebookTree);
      my.rootNodeViewOfNotesOfBottomPanel = viewBuilder.getRootNodeViewOfNotes();
      appendNotesForestHtmlToBottomPanel(viewBuilder.getHtml());

      my.rightBottomNodeInRectangle = my.rootNodeViewOfNotesOfBottomPanel;
      my.rightSideNodeInRectangle = my.rootNodeViewOfNotesOfBottomPanel;
      my.rightSideNodeInRectangle.wrapInRectangle();

      let initialNotesForest = buildInitialNotesForest();
      highlightNotesInForest(window.my.rootNodeViewOfNotesOfBottomPanel, initialNotesForest);

      let outerWrapper = document.getElementById('notes-content-outer-wrapper');
      outerWrapper.classList.remove('as-two-panels');
      outerWrapper.classList.add('maximized-bottom-panel');

      my.isCursorOnBottomRightPanel = true;
      my.isCursorOnTopRightPanel = false;

    } else {

      let viewBuilder = new NotesForestViewBuilder(true);
      viewBuilder.buildView(my.notebookTree);
      my.rootNodeViewOfNotes = viewBuilder.getRootNodeViewOfNotes();
      appendNotesForestHtml(viewBuilder.getHtml());

      my.rightTopNodeInRectangle = my.rootNodeViewOfNotes;
      my.rightSideNodeInRectangle = my.rootNodeViewOfNotes;
      my.rightSideNodeInRectangle.wrapInRectangle();

      let initialNotesForest = buildInitialNotesForest();
      highlightNotesInForest(window.my.rootNodeViewOfNotes, initialNotesForest, true);

      let outerWrapper = document.getElementById('notes-content-outer-wrapper');
      outerWrapper.classList.remove('as-two-panels');
      outerWrapper.classList.remove('maximized-bottom-panel');

      my.isCursorOnBottomRightPanel = false;
      my.isCursorOnTopRightPanel = true;
    }
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}

function handleConfig(config) {
  if (config.notebook === undefined) {
    config.notebook = {};
  }

  let notebookMainContainer = document.getElementById('notebook-main-container');

  let backgroundColor = config.notebook['notebook-window-background-color'];
  if (backgroundColor === undefined) {
    backgroundColor = 'white';
  }
  document.body.style.backgroundColor = backgroundColor;

  let textColor = config.notebook['notebook-window-text-color'];
  let textColorToSet = 'black';
  if (textColor === undefined) {
    textColorToSet = 'black';
  } else if (textColor === 'black') {
    textColorToSet = 'black';
  } else if (textColor === 'dark-grey') {
    textColorToSet = '#32323a';
  } else if (textColor === 'light-grey') {
    textColorToSet = '#707070';
  } else if (textColor === 'white') {
    textColorToSet = 'white';
  }
  notebookMainContainer.style.color = textColorToSet;

  let iconsColor = config.notebook['notebook-window-icons-color'];
  if (iconsColor === undefined) {
    iconsColor = 'black';
  }
  let iconsCssClass;
  if (iconsColor === 'black') {
    iconsCssClass = 'black-icons';
  } else if (iconsColor === 'dark-grey') {
    iconsCssClass = 'dark-grey-icons';
  } else if (iconsColor === 'light-grey') {
    iconsCssClass = 'light-grey-icons';
  } else if (iconsColor === 'white') {
    iconsCssClass = 'white-icons';
  } else {
    iconsCssClass = 'black-icons';
  }
  notebookMainContainer.classList.add(iconsCssClass);

  let fontSizeOfTopPanelOfNotes = config.notebook['font-size-in-px-of-top-panel-of-notes'];
  if (fontSizeOfTopPanelOfNotes === undefined) {
    fontSizeOfTopPanelOfNotes = 16;
  }
  my.fontSizeOfTopPanelOfNotes = fontSizeOfTopPanelOfNotes;

  let fontSizeOfBottomPanelOfNotes = config.notebook['font-size-in-px-of-bottom-panel-of-notes'];
  if (fontSizeOfBottomPanelOfNotes === undefined) {
    fontSizeOfBottomPanelOfNotes = 16;
  }
  my.fontSizeOfBottomPanelOfNotes = fontSizeOfBottomPanelOfNotes;

  let fontSizeOfTopPanelOfTags = config.notebook['font-size-in-px-of-top-panel-of-tags'];
  if (fontSizeOfTopPanelOfTags === undefined) {
    fontSizeOfTopPanelOfTags = 16;
  }
  my.fontSizeOfTopPanelOfTags = fontSizeOfTopPanelOfTags;

  let fontSizeOfBottomPanelOfTags = config.notebook['font-size-in-px-of-bottom-panel-of-tags'];
  if (fontSizeOfBottomPanelOfTags === undefined) {
    fontSizeOfBottomPanelOfTags = 16;
  }
  my.fontSizeOfBottomPanelOfTags = fontSizeOfBottomPanelOfTags;

  let fontSizeOfTooltips = config.notebook['font-size-in-px-of-tooltips'];
  if (fontSizeOfTooltips === undefined) {
    fontSizeOfTooltips = 16;
  }
  my.notebookTooltipFontSize = fontSizeOfTooltips;
}

function runActionFromKeyEvent(eve) {

  let key = eve.key;

  let prefix = '';

  if (eve.shiftKey) {
    prefix = 'Shift+' + prefix;
  }

  if (eve.altKey) {
    prefix = 'Alt+' + prefix;
  }

  if (eve.ctrlKey) {
    prefix = 'Ctrl+' + prefix;
  }

  key = prefix + key;

  let action;

  if (my.config.hotkeys === undefined || my.config.hotkeys.notebook_window === undefined) {
    return;
  }

  action = my.config.hotkeys.notebook_window[key];
  
  if (action === undefined) {
    return;
  }

  runAction(action);
}

function runAction(action) {
  if (action === 'toggle-fullscreen') {
    window.webkit.messageHandlers.notebook_msgs__toggle_fullscreen.postMessage();
  } else if (action === 'open-devtools') {
    window.webkit.messageHandlers.notebook_msgs__open_devtools.postMessage();
  } else if (action === 'save-notebook') {
    saveNotebook();
  }
}

function saveNotebook() {
  let preYamlJson = convertNotebookTreeToPreYamlJson(my.notebookTree);

  my.save_result_handler = (result, msg) => {
    if (result === 'error') {
      alert(`There was an error while saving a file. Error message: "${msg.error_message}"`);
      return;
    }
    if (result === 'success') {
      my.hasChangesInNotebook = false;
      alert('Saved the notebook successfully');
      return;
    }
  };
  window.webkit.messageHandlers.notebook_msgs__save_notebook.postMessage(preYamlJson, my.config.notebook.filepath);
}

function convertToNotebookNodes(jsonForest) {
  let rootNotebookNode = new NotebookNode("all");
  for (let obj of jsonForest) {
    let notebookNode = rootNotebookNode.ensureChildWithName(obj.name);
    convertChildrenToNotebookNodes(obj, notebookNode);
  }
  return rootNotebookNode;
}

function convertChildrenToNotebookNodes(jsonObject, notebookNode) {
  jsonObject.children.forEach(ch => {
    let childNotebookNode = notebookNode.ensureChildWithName(ch.name);
    convertChildrenToNotebookNodes(ch, childNotebookNode);
  });
}
