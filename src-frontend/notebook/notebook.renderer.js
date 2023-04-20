const { turnMultilineTextIntoHtml } = require('../js/html_utils.js');
const { yamlRootObject2forest } = require('../js/notebook/yaml2forest.js');
const { showTagsAndLinks } = require('../js/notebook/show_tags.js');
const { NotesForestViewBuilder } = require('../js/notebook/notes_forest_view_builder.js');
const { appendNotesForestHtml, buildInitialNotesForest, highlightNotesInForest } = require('../js/notebook/notebook_utils.js');

let my = {
  notesForest: null
};

window.my = my;

window.webkit.messageHandlers.foobar.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  try {
    if (msg.type == "error_message") {
      let notebookContentWrapper = document.getElementById("notes-content-wrapper");
      notebookContentWrapper.innerHTML = "";
      let errorMessage = msg.message;
      if (msg.notebook_location) {
        errorMessage = `file location: ${msg.notebook_location}\n${errorMessage}`;
      }
      let msgHtml = turnMultilineTextIntoHtml(errorMessage);
      notebookContentWrapper.appendChild(msgHtml);
      return;
    }
    let notes_object = msg.notes;
    let forest = yamlRootObject2forest(msg.notes);
    my.notesForest = forest;
    showTagsAndLinks(forest);
    let viewBuilder = new NotesForestViewBuilder();
    viewBuilder.buildView(forest);
    my.rootNodeViewOfNotes = viewBuilder.getRootNodeViewOfNotes();
    appendNotesForestHtml(viewBuilder.getHtml());
    let initialNotesForest = buildInitialNotesForest();
    highlightNotesInForest(window.my.rootNodeViewOfNotes, initialNotesForest);
    initResizer();
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}

function initResizer() {
  let leftHalf = document.getElementById('tags-and-links-content-wrapper');
  let resizer = document.getElementById('resizer');
  let rightHalf = document.getElementById('notes-content-wrapper');

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
