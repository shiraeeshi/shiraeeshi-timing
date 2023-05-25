
const {
  clearTimingsTextWrapper,
  makeTimingsTextElementsUnminimized,
  displayTimings,
} = require('./js/timings/display.js');

const {
  initPeriodButtonsRow,
  showSummaryOfLast24Hours,
  showSummaryOfLast12Hours,
  showSummaryFromZeroHours,
  showSummaryFromZeroTwoAndAHalfHours,
} = require('./js/timings/period_buttons.js');
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
    } else if (msg.keyval == "Ctrl+L") {
      my.isToUnderlineCanvas = !my.isToUnderlineCanvas;
      let canvasWrapper = document.getElementById("canvas-wrapper");
      if (canvasWrapper === undefined) {
        return;
      }
      if (my.isToUnderlineCanvas) {
        canvasWrapper.classList.add('underlined');
      } else {
        canvasWrapper.classList.remove('underlined');
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
  my.timings = msg.timings;
  my.config = msg.config;
  handleConfig();
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage end ");
}

function handleConfig() {
  let config = my.config;
  let canvasWrapper = document.getElementById("canvas-wrapper");

  my.isToUnderlineCanvas = !!config['timings-config']['underline-canvas'];
  if (my.isToUnderlineCanvas) {
    if (canvasWrapper !== undefined) {
      canvasWrapper.classList.add('underlined');
    }
  }

  my.isFlexibleWidthCanvas = !!config['timings-config']['canvas-with-flexible-width'];
  if (my.isFlexibleWidthCanvas) {
    canvasWrapper.style.width = '100%';

    function handleCanvasContainerResize(eve) {
      my.currentWidthOfCanvas = canvasWrapper.clientWidth;
      displayTimings(window.my.currentFilteredTimings, window.my.currentFilteredProcess);
    }

    new ResizeObserver(handleCanvasContainerResize).observe(canvasWrapper);
  } else {
    my.canvasWidthFromConfig = config['timings-config']['canvas-width-in-px'];
    if (my.canvasWidthFromConfig === undefined) {
      my.canvasWidthFromConfig = 800;
    }
    my.currentWidthOfCanvas = my.canvasWidthFromConfig;
    canvasWrapper.style.width = `${my.canvasWidthFromConfig}px`;
  }

  let defaultSummary = config['timings-config']['default-summary'];
  if (defaultSummary === undefined) {
    defaultSummary = 'from-zero-2.5-hours';
  }

  if (defaultSummary === 'last-24-hours') {
    showSummaryOfLast24Hours();
  } else if (defaultSummary === 'last-12-hours') {
    showSummaryOfLast12Hours();
  } else if (defaultSummary === 'from-zero-hours') {
    showSummaryFromZeroHours();
  } else if (defaultSummary === 'from-zero-2.5-hours') {
    showSummaryFromZeroTwoAndAHalfHours();
  } else {
    showSummaryFromZeroTwoAndAHalfHours();
  }
  window.my.periodButtonsRowVisibilityToggle.toggle();

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
