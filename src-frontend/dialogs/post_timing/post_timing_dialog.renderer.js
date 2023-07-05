
const { PostTimingViewBuilder } = require('../../js/dialogs/post_timing/post_timing_view_builder.js');
const { requestTimingsForPeriod } = require('../../js/frequencies/request_timings_for_period.js');
const { buildProcessesTree } = require('../../js/common/processes_tree_builder.js');
const { ProcessNode } = require('../../js/common/process_node.js')


const {
  turnMultilineTextIntoHtml,
  addOffsetToLineNumberInErrorMessage,
  showTimingsFormatError,
  withChildren,
  withClass
} = require('../../js/html_utils.js');

let my = {
  timings: null,
};

window.my = my;

window.webkit.messageHandlers.post_timing_dialog_msgs.onMessage(handleServerMessage);

function handleServerMessage(msg) {

  try {

    if (msg.msg_type == "timings_query_response") {
      if (my.timingsQueryResponseCallback !== undefined) {
        my.timingsQueryResponseCallback(msg.timings);
      }
      return;
    }

    if (msg.msg_type === 'contextmenu') {
      console.log(`context menu. value: ${msg.value}`);
      if (my.contextMenuHandler) {
        my.contextMenuHandler(msg.value);
        delete my.contextMenuHandler;
      }
      return;
    }

    if (msg.msg_type == "error_message") {
      let wrapper = document.getElementById("post-timing-dialog-main-container");
      let errorMessage = msg.message;
      if (msg.lineNumOffset) {
        errorMessage = addOffsetToLineNumberInErrorMessage(errorMessage, msg.lineNumOffset);
      }
      if (msg.source_timing_location) {
        errorMessage = `(source timing location: ${msg.source_timing_location})\n${errorMessage}`;
      }
      if (msg.source_timing) {
        errorMessage = `(source timing: ${msg.source_timing})\n${errorMessage}`;
      }
      wrapper.innerHTML = "";
      let errorMessageHtml = turnMultilineTextIntoHtml(errorMessage);
      wrapper.appendChild(errorMessageHtml);
      return;
    }
    if (msg.type === 'save_result') {
      if (my.save_result_handler) {
        my.save_result_handler(msg.result, msg);
        delete my.save_result_handler;
      }
      return;
    }

    if (!my.addedKeyupListener) {
      document.body.addEventListener('keyup', (eve) => {
        my.viewBuilder.treeView.handleKeyUp(eve);
      });

      my.addedKeyupListener = true;
    }

    let config = msg.config;

    my.config = msg.config;

    my.categoryPath2File = buildTreeFromCategoryPathToFile(config);

    my.now = new Date();
    my.viewBuilder = new PostTimingViewBuilder();

    try {
      // my.timings = buildProcessesTree(my.categoryPath2File, undefined);
      my.timings = buildInitialProcessesTree();
      my.viewBuilder.buildAndShowViews(my.timings);
    } catch (err) {
      showTimingsFormatError("post-timing-dialog-main-container", err);
      console.log(`initial handleServerMessage. err: ${err}`);
      window.webkit.messageHandlers.post_timing_dialog_msgs.postMessage(
        "initial handleServerMessage. err: " + err);
      throw err;
    }

    let millisInWeek = 7*24*60*60*1000;

    let initialPeriodTo = new Date();
    let initialPeriodFrom = new Date();
    initialPeriodFrom.setTime(initialPeriodFrom.getTime() - millisInWeek)
    requestTimingsForPeriod(initialPeriodFrom, initialPeriodTo).then(timings => {
      console.log('initial handleServerMessage. timings keys:');
      console.dir(Object.keys(timings));
      my.timings = buildProcessesTree(timings, my.timings);
      my.viewBuilder.buildAndShowViews(my.timings);
      // my.viewBuilder.showView();
    }).catch(err => {
      showTimingsFormatError("post-timing-dialog-main-container", err);
      console.log(`initial handleServerMessage. err: ${err}`);
      window.webkit.messageHandlers.post_timing_dialog_msgs.postMessage(
        "initial handleServerMessage. err: " + err);
      throw err;
    });

    window.webkit.messageHandlers.post_timing_dialog_msgs.postMessage("handleServerMessage end ");
  } catch (err) {
    window.webkit.messageHandlers.post_timing_dialog_msgs.postMessage("handleServerMessage. error: " + err.message);
    throw err;
  }
}


function categoryPathIsSameAsName(timingsFileInfo) {
  return timingsFileInfo.categoryPath === undefined ||
    (
      timingsFileInfo.categoryPath.length === 1 &&
      timingsFileInfo.categoryPath[0] === timingsFileInfo.name
    );
}

function buildTreeFromCategoryPathToFile(config) {
  function ensureChildWithName(node, name) {
    if (node.childrenByName.hasOwnProperty(name)) {
      return node.childrenByName[name];
    } else {
      let newNode = {
        name: name,
        childrenByName: {}
      };
      node.childrenByName[name] = newNode;
      return newNode;
    }
  }
  let rootNode = {
    name: 'all',
    childrenByName: {}
  };
  config.timings.forEach(timingsFileInfo => {
    let node = rootNode;
    if (timingsFileInfo.categoryPath === undefined) {
      node = ensureChildWithName(node, timingsFileInfo.name);
    } else {
      for (let cat of timingsFileInfo.categoryPath) {
        node = ensureChildWithName(node, cat);
      }
    }
    if (node.filepathInfos === undefined) {
      node.filepathInfos = [];
    }
    node.filepathInfos.push({
      filepath: timingsFileInfo.filepath,
      competitivenessLevel: timingsFileInfo.competitivenessLevel,
    });
  });
  return rootNode;
}

function buildInitialProcessesTree() {
  function func(cp2fNode, processNode) {
    if (cp2fNode.filepathInfos !== undefined &&
        cp2fNode.filepathInfos.length > 0) {
      processNode.isAtFilepath = true;
    }
    let childrenAreCoveredByFilepath =
      processNode.isCoveredByFilepath ||
      processNode.isAtFilepath;
    Object.keys(cp2fNode.childrenByName).forEach(name => {
      let childCp2fNode = cp2fNode.childrenByName[name];
      let childProcessNode = processNode.ensureChildWithName(name);
      if (childrenAreCoveredByFilepath) {
        childProcessNode.isCoveredByFilepath = true;
      }
      func(childCp2fNode, childProcessNode);
    });
  }
  let rootProcessNode = new ProcessNode("all");
  func(my.categoryPath2File, rootProcessNode)
  return rootProcessNode;
}
