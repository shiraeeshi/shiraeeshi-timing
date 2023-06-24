const { NotebookNode } = require('../js/notebook/notebook_node.js');
const { turnMultilineTextIntoHtml } = require('../js/html_utils.js');
const { yamlRootObject2forest } = require('../js/notebook/yaml2forest.js');
const { parseTagsFromRootForest } = require('../js/notebook/parse_tags.js');
const { showTagsAndLinks, showTagsAndLinksOfBottomPanel } = require('../js/notebook/show_tags.js');
const { NotesForestViewBuilder } = require('../js/notebook/notes_forest_view_builder.js');
const { appendNotesForestHtml, appendNotesForestHtmlToBottomPanel, buildInitialNotesForest, openNotesInForest, highlightNotesInForest, buildTagsAndLinksForest, openTagsInForest, highlightTagsInForest } = require('../js/notebook/notebook_utils.js');
const {
  addSiblingWithInputToTheRightSideNode,
  appendChildWithInputToTheRightSideNode,
  editRightSideNode,
  deleteNodeFromTheRightSide,
} = require('../js/notebook/notebook_node_view_utils.js');

let my = {
  notesForest: null,
  isCursorOnRightSide: true,
  isKeyboardListenerDisabled: false,
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
      return;
    }

    if (!my.addedKeyupListener) {
      document.body.addEventListener('keyup', (eve) => {
        handleKeyUp(eve);
      });

      my.addedKeyupListener = true;
    }

    let config = msg.config;
    handleConfig(msg.config);
    let notes_object = msg.notes;

    let forestToConvertToNodes = yamlRootObject2forest(msg.notes);
    my.notebookTree = convertToNotebookNodes(forestToConvertToNodes);
    let forest = my.notebookTree.children;
    my.notesForest = forest;

    let tags = parseTagsFromRootForest(forest);
    let tagsAndLinksObj = buildTagsAndLinksForest(tags);
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
    delete my.rightSideNodeToCopy;
    my.rightSideNodeToCut = my.rightSideNodeInRectangle.processNode;
  } else if (eve.ctrlKey && key === 'c') {
    delete my.rightSideNodeToCut;
    my.rightSideNodeToCopy = my.rightSideNodeInRectangle.processNode;
  } else if (eve.ctrlKey && key === 'v') {
    pasteRightSideNode();
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

function initBottomPanelButtons() {
  initBottomPanelButtonsOfTagsAndLinks();
  initBottomPanelButtonsOfNotes();
}

function initBottomPanelButtonsOfTagsAndLinks() {
  let btnClose = document.getElementById('btn-close-bottom-panel-of-tags-and-links');
  btnClose.addEventListener('click', (eve) => {
    let topPanel = document.getElementById('tags-and-links-content-top-wrapper');
    topPanel.style.removeProperty('height');
    let outerWrapper = document.getElementById('tags-and-links-content-outer-wrapper');
    outerWrapper.classList.remove('as-two-panels');
  });

  let btnOpenAbove = document.getElementById('btn-open-tags-in-above-panel');
  btnOpenAbove.addEventListener('click', (eve) => {
    let tagsToOpen = window.my.lastOpenedTags;
    openTagsInForest(window.my.rootNodeViewOfTags, tagsToOpen);
  });

  let btnOpenAboveExclusively = document.getElementById('btn-open-tags-in-above-panel-exclusively');
  btnOpenAboveExclusively.addEventListener('click', (eve) => {
    let tagsToOpen = window.my.lastOpenedTags;
    highlightTagsInForest(window.my.rootNodeViewOfTags, tagsToOpen);
  });
}

function initBottomPanelButtonsOfNotes() {
  let btnClose = document.getElementById('btn-close-bottom-panel-of-notes');
  btnClose.addEventListener('click', (eve) => {
    let topPanel = document.getElementById('notes-content-top-wrapper');
    topPanel.style.removeProperty('height');
    let outerWrapper = document.getElementById('notes-content-outer-wrapper');
    outerWrapper.classList.remove('as-two-panels');
  });

  let btnOpenAbove = document.getElementById('btn-open-notes-in-above-panel');
  btnOpenAbove.addEventListener('click', (eve) => {
    let nodesToOpen = window.my.lastOpenedNodesOfNotes;
    openNotesInForest(window.my.rootNodeViewOfNotes, nodesToOpen);
  });

  let btnOpenAboveExclusively = document.getElementById('btn-open-notes-in-above-panel-exclusively');
  btnOpenAboveExclusively.addEventListener('click', (eve) => {
    let nodesToOpen = window.my.lastOpenedNodesOfNotes;
    highlightNotesInForest(window.my.rootNodeViewOfNotes, nodesToOpen);
  });

  let btnMaximize = document.getElementById('btn-maximize-bottom-panel-of-notes');
  btnMaximize.addEventListener('click', (eve) => {
    let outerWrapper = document.getElementById('notes-content-outer-wrapper');
    outerWrapper.classList.remove('as-two-panels');
    outerWrapper.classList.add('maximized-bottom-panel');
  });

  let btnUnmaximize = document.getElementById('btn-unmaximize-bottom-panel-of-notes');
  btnUnmaximize.addEventListener('click', (eve) => {

    if (my.rootNodeViewOfNotes === undefined) {
      let viewBuilder = new NotesForestViewBuilder(true);
      viewBuilder.buildView(my.notesForest);
      my.rootNodeViewOfNotes = viewBuilder.getRootNodeViewOfNotes();
      appendNotesForestHtml(viewBuilder.getHtml());

      let initialNotesForest = buildInitialNotesForest();
      highlightNotesInForest(window.my.rootNodeViewOfNotes, initialNotesForest, true);
    }

    let outerWrapper = document.getElementById('notes-content-outer-wrapper');
    outerWrapper.classList.add('as-two-panels');
    outerWrapper.classList.remove('maximized-bottom-panel');
  });
}

function initResizers() {
  initVerticalResizer();
  initHorizontalResizer('tags-and-links-content-top-wrapper', 'tags-and-links-content-bottom-outer-wrapper', 'resizer-vertical-left');
  initHorizontalResizer('notes-content-top-wrapper', 'notes-content-bottom-outer-wrapper', 'resizer-vertical-right');
}

function initHorizontalResizer(topPanelId, bottomPanelId, resizerId) {
  let topPanel = document.getElementById(topPanelId);
  let resizer = document.getElementById(resizerId);
  let bottomPanel = document.getElementById(bottomPanelId);

  let resizerX = 0;
  let resizerY = 0;

  let topPanelHeight = 0;

  resizer.addEventListener('mousedown', (eve) => {
    resizerX = eve.clientX;
    resizerY = eve.clientY;

    topPanelHeight = topPanel.getBoundingClientRect().height;

    document.documentElement.style.cursor = 'ns-resize';

    topPanel.style.userSelect = 'none';
    topPanel.style.pointerEvents = 'none';

    bottomPanel.style.userSelect = 'none';
    bottomPanel.style.pointerEvents = 'none';

    document.documentElement.addEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.addEventListener('mouseup', resizerMouseUpListener);
  });

  function resizerMouseMoveListener(eve) {
    const dx = eve.clientX - resizerX;
    const dy = eve.clientY - resizerY;

    const newTopPanelHeight = ((topPanelHeight + dy) * 100) / resizer.parentNode.getBoundingClientRect().height;

    topPanel.style.height = `${newTopPanelHeight}%`;
  }

  function resizerMouseUpListener(eve) {
    document.documentElement.style.removeProperty('cursor');

    topPanel.style.removeProperty('user-select');
    topPanel.style.removeProperty('pointer-events');

    bottomPanel.style.removeProperty('user-select');
    bottomPanel.style.removeProperty('pointer-events');

    document.documentElement.removeEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.removeEventListener('mouseup', resizerMouseUpListener);
  }
}

function initVerticalResizer() {
  let leftHalf = document.getElementById('tags-and-links-content-outer-wrapper');
  let resizer = document.getElementById('resizer-horizontal');
  let rightHalf = document.getElementById('notes-content-outer-wrapper');

  let resizerX = 0;
  let resizerY = 0;

  let leftHalfWidth = 0;

  resizer.addEventListener('mousedown', (eve) => {
    resizerX = eve.clientX;
    resizerY = eve.clientY;

    leftHalfWidth = leftHalf.getBoundingClientRect().width;

    document.documentElement.style.cursor = 'ew-resize';

    leftHalf.style.userSelect = 'none';
    leftHalf.style.pointerEvents = 'none';

    rightHalf.style.userSelect = 'none';
    rightHalf.style.pointerEvents = 'none';

    document.documentElement.addEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.addEventListener('mouseup', resizerMouseUpListener);
  });

  function resizerMouseMoveListener(eve) {
    const dx = eve.clientX - resizerX;
    const dy = eve.clientY - resizerY;

    const newLeftHalfWidth = ((leftHalfWidth + dx) * 100) / resizer.parentNode.getBoundingClientRect().width;

    leftHalf.style.width = `${newLeftHalfWidth}%`;
  }

  function resizerMouseUpListener(eve) {
    document.documentElement.style.removeProperty('cursor');

    leftHalf.style.removeProperty('user-select');
    leftHalf.style.removeProperty('pointer-events');

    rightHalf.style.removeProperty('user-select');
    rightHalf.style.removeProperty('pointer-events');

    document.documentElement.removeEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.removeEventListener('mouseup', resizerMouseUpListener);
  }
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
