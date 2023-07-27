
const {
  turnMultilineTextIntoHtml,
  addOffsetToLineNumberInErrorMessage,
  showTimingsFormatError,
  withChildren
} = require('../js/html_utils.js');

const { FrequenciesViewBuilder } = require('../js/frequencies/frequencies_view_builder.js');
const { requestTimingsForPeriod } = require('../js/frequencies/request_timings_for_period.js');
const { initProcessesTree } = require('../js/common/processes_tree_builder.js');
const { TimingsHistogramsGraphic } = require('../js/frequencies/timings_histograms_graphic.js');

let my = {
  timings: null,
};

window.my = my;

window.webkit.messageHandlers.timings_frequencies_msgs.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  try {
    window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(`handleServerMessage start msg.msg_type: ${msg.msg_type}`);

    if (!my.addedKeyupListener) {
      document.body.addEventListener('keyup', (eve) => {
        runActionFromKeyEvent(eve);
      });

      my.addedKeyupListener = true;
    }

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
      let wrapper = document.getElementById("frequencies-main-content-wrapper");
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

    if (msg.msg_type === "initial_message") {
      my.config = msg.config;

      handleWindowConfig();

      my.now = new Date();
      my.viewBuilder = new FrequenciesViewBuilder();

      let millisInWeek = 7*24*60*60*1000;

      let initialPeriodTo = new Date();
      let initialPeriodFrom = new Date();
      initialPeriodFrom.setTime(initialPeriodFrom.getTime() - millisInWeek)
      requestTimingsForPeriod(initialPeriodFrom, initialPeriodTo).then(timings => {
        console.log('initial handleServerMessage. timings keys:');
        console.dir(Object.keys(timings));
        my.timings = initProcessesTree(timings, undefined);
        // console.log(`initial handleServerMessage. initProcessesTree result: ${JSON.stringify(my.timings)}`);
        my.viewBuilder.buildViews(my.timings);
        my.viewBuilder.showView();
      }).catch(err => {
        showTimingsFormatError("frequencies-main-content-wrapper", err);
        console.log(`initial handleServerMessage. err: ${err}`);
        window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
          "initial handleServerMessage. err: " + err);
        throw err;
      });
    }

    window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage end ");
  } catch (err) {
    window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage. error: " + err.message);
    throw err;
  }
}

function handleWindowConfig() {
  let config = my.config;

  if (config.frequencies === undefined) {
    config.frequencies = {};
  }

  let frequenciesMainContainer = document.getElementById('frequencies-main-content-wrapper');

  let backgroundColor = config.frequencies['frequencies-window-background-color'];
  if (backgroundColor === undefined) {
    backgroundColor = 'white';
  }
  document.body.style.backgroundColor = backgroundColor;

  let textColor = config.frequencies['frequencies-window-text-color'];
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
  frequenciesMainContainer.style.color = textColorToSet;

  let iconsColor = config.frequencies['frequencies-window-icons-color'];
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
  frequenciesMainContainer.classList.add(iconsCssClass);
}

function showTimingsBySubcategoriesAndLastModified(timingsBySubcategoriesTree) {
  let wrapper = document.getElementById("frequencies-main-content-wrapper");
  wrapper.innerHTML = "";

  let viewBuilder = new FrequenciesViewBuilder();
  viewBuilder.buildViews(timingsBySubcategoriesTree);

  wrapper.appendChild(viewBuilder.getResultHtml());
}

function showTimingsByPrefixesAndLastModified(timingsByCategoriesByPrefixes) {
  let resultElem = withChildren(document.createElement("ul"),
    ...Object.keys(timingsByCategoriesByPrefixes).map(key => {
      let byPrefixes = timingsByCategoriesByPrefixes[key];
      let byPrefixesLst = Object.entries(byPrefixes).map(([k,v],idx) => v);
      byPrefixesLst.sort((a,b) => {
        return a.lastTiming.millisUntilNow > b.lastTiming.millisUntilNow;
      });

      let hGraphic = new TimingsHistogramsGraphic(byPrefixesLst);
      hGraphic.initCanvas();
      hGraphic.redraw();

      return withChildren(document.createElement("li"),
        withChildren(document.createElement("div"),
          withChildren(document.createElement("span"),
            document.createTextNode(key)
          ),
          withChildren(document.createElement("div"), hGraphic.elem),
          withChildren(document.createElement("ul"),
            ...byPrefixesLst.map(prefixObj => {
              return withChildren(document.createElement("li"),
                (function() {
                  let aLink = document.createElement("a");
                  aLink.addEventListener("click", (eve) => {
                    hGraphic.highlightProcess(prefixObj.prefix);
                  });
                  return withChildren(aLink, document.createTextNode(prefixObj.prefix));
                })()
              );
            })
          )
        )
      )
    })
  );
  let wrapper = document.getElementById("frequencies-main-content-wrapper");
  wrapper.innerHTML = "";

  wrapper.appendChild(resultElem);
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

  if (my.config.hotkeys === undefined || my.config.hotkeys.timings_frequencies_window === undefined) {
    return;
  }

  action = my.config.hotkeys.timings_frequencies_window[key];
  
  if (action === undefined) {
    return;
  }

  runAction(action);
}

function runAction(action) {
  if (action === 'toggle-fullscreen') {
    window.webkit.messageHandlers.timings_frequencies_msgs__toggle_fullscreen.postMessage();
  } else if (action === 'open-devtools') {
    window.webkit.messageHandlers.timings_frequencies_msgs__open_devtools.postMessage();
  }
}
