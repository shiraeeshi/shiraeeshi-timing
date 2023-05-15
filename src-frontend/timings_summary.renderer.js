
const {
  clearTimingsTextWrapper,
  makeTimingsTextElementsUnminimized,
} = require('./js/timings/display.js');

const { initPeriodButtonsRow } = require('./js/timings/period_buttons.js');
const { ImageInfo } = require('./js/timings/image_info.js');

const {
  turnMultilineTextIntoHtml,
  addOffsetToLineNumberInErrorMessage,
  showTimingsFormatError,
} = require('./js/html_utils.js');

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
  },
  timingsFormatErrorHandler: (err) => {
    showTimingsFormatError("inner-content-wrapper", err)
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
  initResizer();
  my.imageInfo = new ImageInfo();
  my.timings = msg;
  let mainContentWrapper = document.getElementById("main-content-wrapper");
  let keys = Object.keys(msg);
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage end ");
}

function initResizer() {
  let topPanel = document.getElementById('timing-category-btns-container');
  let resizer = document.getElementById('resizer');
  let bottomPanel = document.getElementById('inner-content-wrapper');

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
