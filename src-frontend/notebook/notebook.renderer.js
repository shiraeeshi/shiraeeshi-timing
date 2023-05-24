const { turnMultilineTextIntoHtml } = require('../js/html_utils.js');
const { yamlRootObject2forest } = require('../js/notebook/yaml2forest.js');
const { parseTagsFromRootForest } = require('../js/notebook/parse_tags.js');
const { showTagsAndLinks, showTagsAndLinksOfBottomPanel } = require('../js/notebook/show_tags.js');
const { NotesForestViewBuilder } = require('../js/notebook/notes_forest_view_builder.js');
const { appendNotesForestHtml, appendNotesForestHtmlToBottomPanel, buildInitialNotesForest, openNotesInForest, highlightNotesInForest, openTagsInForest, highlightTagsInForest } = require('../js/notebook/notebook_utils.js');

let my = {
  notesForest: null
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
    let config = msg.config;
    handleConfig(msg.config);
    let notes_object = msg.notes;
    let forest = yamlRootObject2forest(msg.notes);
    my.notesForest = forest;
    let tags = parseTagsFromRootForest(forest);
    showTagsAndLinks(tags);
    showTagsAndLinksOfBottomPanel(tags);

    initResizers();
    initBottomPanelButtons();

    let configMaximizeNotesBottomPanel = config.notebook['start-with-bottom-panel-of-notes-maximized'];
    if (configMaximizeNotesBottomPanel) {

      let viewBuilder = new NotesForestViewBuilder();
      viewBuilder.buildView(forest);
      my.rootNodeViewOfNotesOfBottomPanel = viewBuilder.getRootNodeViewOfNotes();
      appendNotesForestHtmlToBottomPanel(viewBuilder.getHtml());

      let initialNotesForest = buildInitialNotesForest();
      highlightNotesInForest(window.my.rootNodeViewOfNotesOfBottomPanel, initialNotesForest);

      let outerWrapper = document.getElementById('notes-content-outer-wrapper');
      outerWrapper.classList.remove('as-two-panels');
      outerWrapper.classList.add('maximized-bottom-panel');

    } else {

      let viewBuilder = new NotesForestViewBuilder();
      viewBuilder.buildView(forest);
      my.rootNodeViewOfNotes = viewBuilder.getRootNodeViewOfNotes();
      appendNotesForestHtml(viewBuilder.getHtml());

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

function handleConfig(config) {
  if (config.notebook === undefined) {
    config.notebook = {};
  }
  let backgroundColor = config.notebook['background-color'];
  if (backgroundColor !== undefined) {
    document.body.style.backgroundColor = backgroundColor;
  }
  let notesFontSize = config.notebook['notes-font-size-px'];
  if (notesFontSize === undefined) {
    notesFontSize = 16;
  }
  my.notesFontSize = notesFontSize;
  let tagsFontSize = config.notebook['tags-font-size-px'];
  if (tagsFontSize === undefined) {
    tagsFontSize = 16;
  }
  my.tagsFontSize = tagsFontSize;
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
