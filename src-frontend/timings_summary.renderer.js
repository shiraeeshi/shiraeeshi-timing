
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
  timingsFormatErrorHandler: (err) => {
    showTimingsFormatError("inner-content-wrapper", err)
  }
};

window.my = my;

window.webkit.messageHandlers.timings_summary_msgs.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage start ");
  if (msg.type == "key_pressed") {
    if (msg.keyval == "m") {
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
  initResizerInTimingsSummary();
  my.imageInfo = new ImageInfo();
  my.timings = msg.timings;
  my.config = msg.config;
  handleConfig();
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage end ");
}

function handleConfig() {
  let config = my.config;

  let timingsMainContainer = document.getElementById('timings-main-container');

  let bgColor = config['timings-config']['summary-window-background-color'];
  if (bgColor === undefined) {
    bgColor = 'white';
  }
  document.body.style.backgroundColor = bgColor;

  let textColor = config['timings-config']['summary-window-text-color'];
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
  timingsMainContainer.style.color = textColorToSet;

  let iconsColor = config['timings-config']['summary-window-icons-color'];
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
  timingsMainContainer.classList.add(iconsCssClass);

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

function initResizerInTimingsSummary() {
  let topPanel = document.getElementById('timing-category-btns-container');
  let resizer = document.getElementById('timings-summary-resizer');
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
