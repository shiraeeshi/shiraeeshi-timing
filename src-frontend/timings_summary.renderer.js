const {
  clearTimingsTextWrapper,
  makeTimingsTextElementsUnminimized,
  initPeriodButtonsRow,
  ImageInfo,
} = require('./js/timings_summary.functions.js');

const { turnMultilineTextIntoHtml, addOffsetToLineNumberInErrorMessage } = require('./js/html_utils.js');

const { getRandomInt } = require('./js/utils.js');

let my = {
  timings: null,
  // imageInfo: {  // imageInfo = new ImageInfo()
  //   minutesRange: 0,
  //   minutesMaxDiff: 0
  // },
  wallpapers: {
    lst: null,
    idx: 0
  }
};

window.my = my;

window.webkit.messageHandlers.timings_summary_msgs.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage start ");
  if (msg.type == "wallpapers") {
    my.wallpapers.lst = msg.wallpapers;
    let randomIndex = getRandomInt(my.wallpapers.lst.length);
    document.body.style.backgroundImage = "url(" + my.wallpapers.lst[randomIndex] + ")";
    return;
  }
  if (msg.type == "key_pressed") {
    if (msg.keyval == "w") {
      my.wallpapers.idx++;
      if (my.wallpapers.idx >= my.wallpapers.lst.length) {
        my.wallpapers.idx = 0;
      }
      window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage current wallpaper: " +
        my.wallpapers.lst[my.wallpapers.idx]);
      // document.body.style.backgroundImage = "url(wallpapers/" + my.wallpapers.lst[my.wallpapers.idx] + ")";
      document.body.style.backgroundImage = "url(" + my.wallpapers.lst[my.wallpapers.idx] + ")";
    } else if (msg.keyval == "m") {
      my.minimalTextForTimings = !my.minimalTextForTimings;
      if (my.minimalTextForTimings) {
        clearTimingsTextWrapper();
      } else {
        makeTimingsTextElementsUnminimized();
      }
    }
    return;
  }
  if (msg.type == "error_message") {
    let innerContentWrapper = document.getElementById("inner-content-wrapper");
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
    innerContentWrapper.innerHTML = "";
    let errorMessageHtml = turnMultilineTextIntoHtml(errorMessage);
    innerContentWrapper.appendChild(errorMessageHtml);
    return;
  }
  initPeriodButtonsRow();
  my.imageInfo = new ImageInfo();
  my.timings = msg;
  let mainContentWrapper = document.getElementById("main-content-wrapper");
  let keys = Object.keys(msg);
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage end ");
}

