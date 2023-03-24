const { turnMultilineTextIntoHtml } = require('../js/html_utils.js');
const { yamlRootObject2forest } = require('../js/notebook/yaml2forest.js');
const { showTagsAndLinks } = require('../js/notebook/show_tags.js');
const { NotesForestViewBuilder } = require('../js/notebook/notes_forest_view_builder.js');
const { appendNotesForestHtml } = require('../js/notebook/notebook_utils.js');

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
    my.notesForestViews = viewBuilder.getNotesForestViews();
    appendNotesForestHtml(viewBuilder.getHtmlElements());
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}
