const { NotebookNode } = require('../js/notebook/notebook_node.js');
const { turnMultilineTextIntoHtml } = require('../js/html_utils.js');
const { yamlRootObject2forest, convertNotebookTreeToPreYamlJson } = require('../js/notebook/yaml2forest.js');
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
  initBottomPanelButtons,
} = require('../js/notebook/notebook_utils.js');
const {
  addSiblingWithInputToTheRightSideNode,
  appendChildWithInputToTheRightSideNode,
  editRightSideNode,
  deleteNodeFromTheRightSide,
  pasteNodeInto,
} = require('../js/notebook/notebook_node_view_utils.js');

let my = {
  notesForest: null,
  isCursorOnRightSide: true,
  isKeyboardListenerDisabled: false,
  hasChangesInNotebook: false,
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

      let preYamlJson = convertNotebookTreeToPreYamlJson(my.notebookTree);

      my.save_result_handler = (result, msg) => {
        if (result === 'error') {
          alert(`There was an error while saving a file. Error message: "${msg.error_message}"`);
          return;
        }
        if (result === 'success') {
          alert('Saved the notebook successfully');
          return;
        }
      };
      window.webkit.messageHandlers.notebook_msgs__save_notebook.postMessage(preYamlJson, my.config.notebook.filepath);
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

    if (!my.addedKeyupListener) {
      document.body.addEventListener('keyup', (eve) => {
        handleKeyUp(eve);
      });

      my.addedKeyupListener = true;
    }

    let config = msg.config;
    my.config = config;
    handleConfig(msg.config);
    let notes_object = msg.notes;

    let forestToConvertToNodes = yamlRootObject2forest(msg.notes);
    my.notebookTree = convertToNotebookNodes(forestToConvertToNodes);
    let forest = my.notebookTree.children;
    my.notesForest = forest;

    let tags = parseTagsFromRootForest(forest);
    let tagsAndLinksObj = buildTagsAndLinksForest(tags);
    my.tagsTree = tagsAndLinksObj;
    showTagsAndLinks(tagsAndLinksObj);
    showTagsAndLinksOfBottomPanel(tagsAndLinksObj);

    initResizers();
    initBottomPanelButtons();

    let configMaximizeNotesBottomPanel = config.notebook['start-with-bottom-panel-of-notes-maximized'];
    if (configMaximizeNotesBottomPanel) {

      let viewBuilder = new NotesForestViewBuilder();
      viewBuilder.buildView(my.notebookTree);
      my.rootNodeViewOfNotesOfBottomPanel = viewBuilder.getRootNodeViewOfNotes();
      appendNotesForestHtmlToBottomPanel(viewBuilder.getHtml());

      let initialNotesForest = buildInitialNotesForest();
      highlightNotesInForest(window.my.rootNodeViewOfNotesOfBottomPanel, initialNotesForest);

      let outerWrapper = document.getElementById('notes-content-outer-wrapper');
      outerWrapper.classList.remove('as-two-panels');
      outerWrapper.classList.add('maximized-bottom-panel');

    } else {

      let viewBuilder = new NotesForestViewBuilder(true);
      viewBuilder.buildView(my.notebookTree);
      my.rootNodeViewOfNotes = viewBuilder.getRootNodeViewOfNotes();
      appendNotesForestHtml(viewBuilder.getHtml());

      my.rightSideNodeInRectangle = my.rootNodeViewOfNotes;
      my.rightSideNodeInRectangle.wrapInRectangle();

      let initialNotesForest = buildInitialNotesForest();
      highlightNotesInForest(window.my.rootNodeViewOfNotes, initialNotesForest, true);

      let outerWrapper = document.getElementById('notes-content-outer-wrapper');
      outerWrapper.classList.remove('as-two-panels');
      outerWrapper.classList.remove('maximized-bottom-panel');
    }
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}

function handleKeyUp(eve) {

  if (my.isKeyboardListenerDisabled) {
    return;
  }

  let key = eve.key;

  if (key === 'ArrowLeft') {
    if (my.isCursorOnRightSide) {
      if (my.rightSideNodeInRectangle.parentNodeView !== undefined) {
        my.rightSideNodeInRectangle.removeRectangleWrapper();

        let newNodeInRectangle = my.rightSideNodeInRectangle.parentNodeView;
        newNodeInRectangle.wrapInRectangle();

        my.rightSideNodeInRectangle = newNodeInRectangle;
      }
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.parentNodeView !== undefined) {
        nodeInRectangle.removeRectangleWrapper();

        let newNodeInRectangle = nodeInRectangle.parentNodeView;
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
    }
  } else if (key === 'ArrowRight') {
    if (my.isCursorOnRightSide) {
      if (my.rightSideNodeInRectangle.children.length > 0) {
        my.rightSideNodeInRectangle.removeRectangleWrapper();

        if (my.rightSideNodeInRectangle.isCollapsed) {
          my.rightSideNodeInRectangle.toggleCollapse();
        }

        let newNodeInRectangle = my.rightSideNodeInRectangle.children[0];
        newNodeInRectangle.wrapInRectangle();

        my.rightSideNodeInRectangle = newNodeInRectangle;
      }
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.children.length > 0) {
        nodeInRectangle.removeRectangleWrapper();

        if (nodeInRectangle.isCollapsed) {
          nodeInRectangle.toggleCollapse();
        }

        let newNodeInRectangle = nodeInRectangle.children[0];
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
    }
  } else if (key === 'ArrowUp') {
    if (my.isCursorOnRightSide) {
      if (my.rightSideNodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = my.rightSideNodeInRectangle.findPreviousSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        my.rightSideNodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        my.rightSideNodeInRectangle = newNodeInRectangle;
      }
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = nodeInRectangle.findPreviousSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        nodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
    }
  } else if (key === 'ArrowDown') {
    if (my.isCursorOnRightSide) {
      if (my.rightSideNodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = my.rightSideNodeInRectangle.findNextSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        my.rightSideNodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        my.rightSideNodeInRectangle = newNodeInRectangle;
      }
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = nodeInRectangle.findNextSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        nodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
    }
  } else if (key === ' ') {
    if (my.isCursorOnRightSide) {
      my.rightSideNodeInRectangle.toggleCollapse();
    } else {
      that.nodeInRectangle.toggleCollapse();
    }
  } else if (key === 'o') {
    if (!my.isCursorOnRightSide) {
      return;
    }
    addSiblingWithInputToTheRightSideNode(my.rightSideNodeInRectangle);
  } else if (key === 'a') {
    if (!my.isCursorOnRightSide) {
      return;
    }
    appendChildWithInputToTheRightSideNode(my.rightSideNodeInRectangle);
  } else if (eve.ctrlKey && key === 'x') {
    delete my.notebookNodeToCopy;
    my.notebookNodeToCut = my.rightSideNodeInRectangle.notebookNode;
  } else if (eve.ctrlKey && key === 'c') {
    delete my.notebookNodeToCut;
    my.notebookNodeToCopy = my.rightSideNodeInRectangle.notebookNode;
  } else if (eve.ctrlKey && key === 'v') {
    pasteNodeInto(my.rightSideNodeInRectangle.notebookNode);
  } else if (key === 'F2') {
    if (!my.isCursorOnRightSide) {
      return;
    }
    editRightSideNode(my.rightSideNodeInRectangle);
  } else if (key === 'Delete') {
    if (my.isCursorOnRightSide) {
      deleteNodeFromTheRightSide(my.rightSideNodeInRectangle);
    } else {
      that.deleteCorrespondingNodeFromTheRightSide(that.nodeInRectangle)
    }
  } else if (eve.ctrlKey && key === 's') {
    save();
  }
}

function handleConfig(config) {
  if (config.notebook === undefined) {
    config.notebook = {};
  }
  let backgroundColor = config.notebook['background-color'];
  if (backgroundColor !== undefined) {
    document.body.style.backgroundColor = backgroundColor;
  }
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
