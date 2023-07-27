const {
  showTimingsOf24HourDay,
  showTimingsOf60HourDay,
  addListenersToButtons,
} = require('../js/timings/history/history_buttons.js');

const { HistoryImageInfo } = require('../js/timings/history/history_image_info.js');

const {
  displayTimings,
  clearTimingsTextWrapper,
  makeTimingsTextElementsUnminimized,
} = require('../js/timings/display.js');

const {
  turnMultilineTextIntoHtml,
  addOffsetToLineNumberInErrorMessage,
  showTimingsFormatError,
  withChildren,
  withClass
} = require('../js/html_utils.js');


let my = {
  timings: null,
  // imageInfo: { // imageInfo = new ImageInfo()
  //   minutesRange: 0,
  //   minutesMaxDiff: 0
  // },
  currentView: 'history',
  dayOffset: 0
};

window.my = my;

window.webkit.messageHandlers.timings_history_latest_msgs.onMessage(handleServerMessage);

function handleServerMessage(msg) {

  if (!my.addedKeyupListener) {
    document.body.addEventListener('keyup', (eve) => {
      runActionFromKeyEvent(eve);
    });

    my.addedKeyupListener = true;
  }

  if (msg.msg_type == "run_action") {
    runAction(msg.action);
    return;
  }
  if (msg.msg_type == "timings_query_response") {
    if (my.timingsQueryResponseCallback !== undefined) {
      my.timingsQueryResponseCallback(msg.timings);
    }
    return;
  }
  if (msg.msg_type == "error_message") {
    let innerContentWrapper = document.getElementById("inner-content-wrapper-in-history");
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
  if (msg.msg_type == "config") {
    my.config = msg.config;
    window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("handleServerMessage start ");
    addListenersToButtons();
    initResizerInHistory();
    my.imageInfo = new HistoryImageInfo();
    // my.timings = msg;
    showTimingsOf60HourDay();
    handleHistoryConfig();
    window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("handleServerMessage end ");
  }
}

function handleHistoryConfig() {
  let config = my.config;

  let historyMainContainer = document.getElementById('history-main-container');

  let bgColor = config['timings-config']['history-window-background-color'];
  if (bgColor === undefined) {
    bgColor = 'white';
  }
  document.body.style.backgroundColor = bgColor;

  let textColor = config['timings-config']['history-window-text-color'];
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
  historyMainContainer.style.color = textColorToSet;

  let iconsColor = config['timings-config']['history-window-icons-color'];
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
  historyMainContainer.classList.add(iconsCssClass);

  let canvasWrapper = document.getElementById("canvas-wrapper-in-history");

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
      if (window.my.currentFilteredTimings !== undefined) {
        displayTimings(window.my.currentFilteredTimings, window.my.currentFilteredProcess);
      }
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
}





function initResizerInHistory() {
  let topPanel = document.getElementById('timing-category-btns-container');
  let resizer = document.getElementById('resizer-in-history');
  let bottomPanel = document.getElementById('inner-content-wrapper-in-history');

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

  if (my.config.hotkeys === undefined || my.config.hotkeys.timings_history_window === undefined) {
    return;
  }

  action = my.config.hotkeys.timings_history_window[key];
  
  if (action === undefined) {
    return;
  }

  runAction(action);
}

function runAction(action) {
  let radioBtn24Hours = document.getElementById("day-of-24-hours");
  function showTimings() {
    if (radioBtn24Hours.checked) {
      showTimingsOf24HourDay();
    } else {
      showTimingsOf60HourDay();
    }
  }
  let btnNextDay = document.getElementById("next-day");
  if (action === 'toggle-fullscreen') {
    window.webkit.messageHandlers.history_msg__toggle_fullscreen.postMessage();
  } else if (action === 'open-devtools') {
    window.webkit.messageHandlers.history_msg__open_devtools.postMessage();
  } else if (action == "go-to-previous-day") {
    my.dayOffset++;

    delete my.highlightedCategory;
    my.isHighlightingTimingRowInText = false;
    my.isHighlightingTimingItemInImage = false;

    btnNextDay.disabled = false;
    showTimings();
  } else if (action == "go-to-next-day") {
    if (my.dayOffset > 0) {
      my.dayOffset--;
    }

    delete my.highlightedCategory;
    my.isHighlightingTimingRowInText = false;
    my.isHighlightingTimingItemInImage = false;

    if (my.dayOffset <= 0) {
      btnNextDay.disabled = true;
    }
    showTimings();
  } else if (action == "toggle-minimal-text-for-timings") {
    my.minimalTextForTimings = !my.minimalTextForTimings;
    if (my.minimalTextForTimings) {
      clearTimingsTextWrapper();
    } else {
      makeTimingsTextElementsUnminimized();
    }
  } else if (action == "toggle-underline-canvas") {
    my.isToUnderlineCanvas = !my.isToUnderlineCanvas;
    let canvasWrapper = document.getElementById("canvas-wrapper-in-history");
    if (canvasWrapper === undefined) {
      return;
    }
    if (my.isToUnderlineCanvas) {
      canvasWrapper.classList.add('underlined');
    } else {
      canvasWrapper.classList.remove('underlined');
    }
  }
}
