const { turnMultilineTextIntoHtml } = require('../js/html_utils.js');
const { yamlRootObject2forest, showTagsAndLinks, ProcessesForestViewBuilder, appendProcessesForestHtml } = require('../js/notebook.functions.js');

let my = {
  processesForest: null
};

window.webkit.messageHandlers.foobar.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  try {
    if (msg.type == "error_message") {
      let notebookContentWrapper = document.getElementById("processes-content-wrapper");
      notebookContentWrapper.innerHTML = "";
      let errorMessage = msg.message;
      if (msg.notebook_location) {
        errorMessage = `file location: ${msg.notebook_location}\n${errorMessage}`;
      }
      let msgHtml = turnMultilineTextIntoHtml(errorMessage);
      notebookContentWrapper.appendChild(msgHtml);
      return;
    }
    let processes_object = msg.processes;
    let forest = yamlRootObject2forest(msg.processes);
    my.processesForest = forest;
    showTagsAndLinks(forest);
    let viewBuilder = new ProcessesForestViewBuilder();
    viewBuilder.buildView(forest);
    my.processesForestViews = viewBuilder.getProcessesForestViews();
    appendProcessesForestHtml(viewBuilder.getHtmlElements());
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}
