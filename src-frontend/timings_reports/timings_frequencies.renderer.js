
const {
  turnMultilineTextIntoHtml,
  addOffsetToLineNumberInErrorMessage,
  showTimingsFormatError,
  withChildren
} = require('../js/html_utils.js');

const { FrequenciesViewBuilder } = require('../js/frequencies/frequencies_view_builder.js');
const { requestTimingsForPeriod } = require('../js/frequencies/request_timings_for_period.js');
const { handleTimings } = require('../js/frequencies/handle_timings.js');
const { TimingsHistogramsGraphic } = require('../js/frequencies/timings_histograms_graphic.js');

let my = {
  timings: null
};

window.my = my;

window.webkit.messageHandlers.timings_frequencies_msgs.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  try {
    window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage start ");
    if (msg.msg_type == 'keypress_event') {
      return;
    }
    if (msg.msg_type == "timings_query_response") {
      if (my.timingsQueryResponseCallback !== undefined) {
        my.timingsQueryResponseCallback(msg.timings);
      }
      return;
    }
    if (msg.msg_type == "error_message") {
      let wrapper = document.getElementById("main-content-wrapper");
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

    // old
    // my.timings = msg;
    // let timingsBySubcategoriesTree = handleTimings(my.timings);
    // showTimingsBySubcategoriesAndLastModified(timingsBySubcategoriesTree);

    // new
    my.viewBuilder = new FrequenciesViewBuilder();

    let millisInWeek = 7*24*60*60*1000;

    let initialPeriodTo = new Date();
    let initialPeriodFrom = new Date();
    initialPeriodFrom.setTime(initialPeriodFrom.getTime() - millisInWeek)
    requestTimingsForPeriod(initialPeriodFrom, initialPeriodTo).then(timings => {
      console.log('initial handleServerMessage. timings keys:');
      console.dir(Object.keys(timings));
      my.timings = handleTimings(timings, undefined);
      console.log(`initial handleServerMessage. handleTimings result: ${JSON.stringify(my.timings)}`);
      my.viewBuilder.buildViews(my.timings);
      my.viewBuilder.showView();
    }).catch(err => {
      showTimingsFormatError("main-content-wrapper", err);
      console.log(`initial handleServerMessage. err: ${err}`);
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
        "initial handleServerMessage. err: " + err);
    });

    window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage end ");
  } catch (err) {
    window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage. error: " + err.message);
  }
}

function showTimingsBySubcategoriesAndLastModified(timingsBySubcategoriesTree) {
  let wrapper = document.getElementById("main-content-wrapper");
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
  let wrapper = document.getElementById("main-content-wrapper");
  wrapper.innerHTML = "";

  wrapper.appendChild(resultElem);
}


function mergeTimings(timingsA, timingsB) {
  return timingsB;
}
