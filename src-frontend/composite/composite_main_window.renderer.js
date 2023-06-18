const { parseTagsFromRootForest } = require('../js/notebook/parse_tags.js');
const { yamlRootObject2forest } = require('../js/notebook/yaml2forest.js');
const { CurrentNotesForestViewBuilder } = require('../js/notebook/notes_forest_view_builder.js');
const {
  addTagNodeLinksToForest,
  appendNotesForestHtml,
  buildTagsAndLinksForest,
  buildCurrentNotesForest,
  highlightNotesInForest
} = require('../js/notebook/notebook_utils.js');

const {
  initPeriodButtonsRow,
  showSummaryOfLast24Hours,
  showSummaryOfLast12Hours,
  showSummaryFromZeroHours,
  showSummaryFromZeroTwoAndAHalfHours,
} = require('../js/timings/period_buttons.js');
const { ImageInfo } = require('../js/timings/image_info.js');
const {
  displayTimings,
  displayTimingsAsImage,
  clearTimingsTextWrapper,
  makeTimingsTextElementsUnminimized,
} = require('../js/timings/display.js');

const {
  showTimingsOf24HourDay,
  showTimingsOf60HourDay,
  addListenersToButtons,
} = require('../js/timings/history/history_buttons.js');

const { HistoryImageInfo } = require('../js/timings/history/history_image_info.js');

const { FrequenciesViewBuilder } = require('../js/frequencies/frequencies_view_builder.js');
const { requestTimingsForPeriod } = require('../js/frequencies/request_timings_for_period.js');
const { initProcessesTree } = require('../js/common/processes_tree_builder.js');

const {
  turnMultilineTextIntoHtml,
  addOffsetToLineNumberInErrorMessage,
  showTimingsFormatError,
} = require('../js/html_utils.js');

const { getRandomInt } = require('../js/utils.js');


let my = {

  // notebook state
  notesForest: null,

  currentNotesForest: null,

  // timings state
  timings: null,

  // imageInfo: { // imageInfo = new ImageInfo()
  //   minutesRange: 0,
  //   minutesMaxDiff: 0
  // },

  wallpapers: {
    lst: null,
    idx: 0
  },

  colors: {
    text: {
      idx: 0,
      idx_left: undefined,
      idx_right: undefined,
      lst: [
        'white',
        '#707070',
        '#323232',
        'black'
      ],
    },
    canvas: {
      timings: {
        idx: 0,
        lst: [
          {
            "timing-regular": 'rgba(0, 0, 200, 0.5)',
            "timing-highlighted": 'rgba(200, 0, 0, 0.5)',
            "timing-highlighted-category": 'rgba(5, 168, 82, 0.5)',
            "current-time-marker": 'rgba(200, 0, 0, 0.5)',
          },
          {
            "timing-regular": 'rgba(0, 0, 200, 1.0)',
            "timing-highlighted": 'rgba(200, 0, 0, 1.0)',
            "timing-highlighted-category": 'rgba(4, 82, 40, 1.0)',
            "current-time-marker": 'rgba(200, 0, 0, 1.0)',
          },
          {
            "timing-regular": 'rgba(46, 46, 92, 1.0)',
            "timing-highlighted": 'rgba(92, 25, 25, 1.0)',
            "timing-highlighted-category": 'rgba(4, 82, 40, 1.0)',
            "current-time-marker": 'rgba(92, 25, 25, 1.0)',
          },
        ],
      },
      frequencies: {
        idx: 0,
        lst: [
          {
            "timing-regular": 'rgba(100, 120, 120, 1)',
            "timing-regular-last": 'rgba(70, 80, 80, 1)',
            "timing-has-references": 'rgba(0, 85, 255, 1)',
            "timing-has-references-last": 'rgba(0, 50, 150, 1)',
            "timing-highlighted": 'rgba(190, 0, 20, 1)',
            "timing-highlighted-last": 'rgba(140, 0, 15, 1)',
            "scrollbar": 'rgba(0, 0, 0, 0.3)'
          },
          {
            "timing-regular": 'rgba(65, 78, 78, 1)',
            "timing-regular-last": 'rgba(48, 55, 55, 1)',
            "timing-has-references": 'rgba(0, 54, 160, 1)',
            "timing-has-references-last": 'rgba(0, 35, 100, 1)',
            "timing-highlighted": 'rgba(125, 0, 15, 1)',
            "timing-highlighted-last": 'rgba(98, 0, 10, 1)',
            "scrollbar": 'rgba(0, 0, 0, 0.3)'
          },
        ]
      }
    }
  },

  timingsFormatErrorHandler: (err) => {
    showTimingsFormatError("inner-content-wrapper", err)
  },

  currentFillStylesOfTimings: undefined,
  currentFillStylesOfFrequencies: undefined,

  dayOffset: 0

};

window.my = my;

window.webkit.messageHandlers.composite_main_window.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  try {
    // window.webkit.messageHandlers.composite_main_window.postMessage("handleServerMessage start ");


    if (!my.hasInitializedMainResizer) {
      initVerticalResizer();
      my.hasInitializedMainResizer = true;
    }


    if (msg.msg_type == "timings_query_response") {
      if (my.currentView === 'timings-summary') {
        return;
      }
      if (my.timingsQueryResponseCallback !== undefined) {
        my.timingsQueryResponseCallback(msg.timings);
      }
      return;
    }
    if (msg.type == "wallpapers") {
      if (msg.config !== undefined) {
        my.config = msg.config;
        if (my.notesForest !== undefined) {
          handleNotebookConfig(my.config);
        }
        if (my.timings !== null) {
          handleTimingConfig(my.config);
        }
      }
      console.log('[handleServerMessage] msg.type = wallpapers.');
      my.wallpapers.lst = msg.wallpapers;
      let randomIndex = getRandomInt(my.wallpapers.lst.length);
      document.body.style.backgroundImage = `url("${my.wallpapers.lst[randomIndex]}")`;
      return;
    }
    if (msg.type == "key_pressed") {
      if (msg.keyval == "w") {
        my.wallpapers.idx++;
        if (my.wallpapers.idx >= my.wallpapers.lst.length) {
          my.wallpapers.idx = 0;
        }
        // window.webkit.messageHandlers.composite_main_window.postMessage("handleServerMessage current wallpaper: " +
        //   my.wallpapers.lst[my.wallpapers.idx]);
        document.body.style.backgroundImage = `url("${my.wallpapers.lst[my.wallpapers.idx]}")`;
      } else if (msg.keyval == "m") {
        my.minimalTextForTimings = !my.minimalTextForTimings;
        if (my.minimalTextForTimings) {
          clearTimingsTextWrapper();
        } else {
          makeTimingsTextElementsUnminimized();
        }
      } else if (msg.keyval == "Left") {
        my.dayOffset++;

        delete my.highlightedCategory;
        my.isHighlightingTimingRowInText = false;
        my.isHighlightingTimingItemInImage = false;

        let btnNextDay = document.getElementById("next-day");
        btnNextDay.disabled = false;
        let radioBtn24Hours = document.getElementById("day-of-24-hours");
        function showTimings() {
          if (radioBtn24Hours.checked) {
            showTimingsOf24HourDay();
          } else {
            showTimingsOf60HourDay();
          }
        }
        showTimings();
      } else if (msg.keyval == "Right") {
        if (my.dayOffset > 0) {
          my.dayOffset--;
        }

        delete my.highlightedCategory;
        my.isHighlightingTimingRowInText = false;
        my.isHighlightingTimingItemInImage = false;

        if (my.dayOffset <= 0) {
          let btnNextDay = document.getElementById("next-day");
          btnNextDay.disabled = true;
        }
        let radioBtn24Hours = document.getElementById("day-of-24-hours");
        function showTimings() {
          if (radioBtn24Hours.checked) {
            showTimingsOf24HourDay();
          } else {
            showTimingsOf60HourDay();
          }
        }
        showTimings();
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
      } else if (msg.keyval == "Ctrl+S") {
        showOnlyTimingsSummaryInLeftPanel();
        initPeriodButtonsRow();
        initResizerInTimingsSummary();
        my.imageInfo = new ImageInfo();
        my.timings = msg.timings;

        if (msg.config !== undefined) {
          my.config = msg.config;
        }
        if (my.config !== undefined) {
          handleTimingConfig(my.config);

          // if (my.notesForest !== undefined) {
          //   handleNotebookConfig(my.config);
          // }
        }
      } else if (msg.keyval == "Ctrl+H") {
        showOnlyHistoryInLeftPanel();
        my.config = msg.config;
        window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("handleServerMessage start ");
        addListenersToButtons();
        initResizerInHistory();
        my.imageInfo = new HistoryImageInfo();
        // my.timings = msg;
        showTimingsOf60HourDay();
        handleHistoryConfig();
        window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("handleServerMessage end ");
      } else if (msg.keyval == "Ctrl+F") {
        showOnlyFrequenciesInLeftPanel();
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
      } else if (msg.keyval == "t") {
        my.colors.text.idx = (my.colors.text.idx + 1) % my.colors.text.lst.length;
        delete my.colors.text.idx_left;
        delete my.colors.text.idx_right;
        let color = my.colors.text.lst[my.colors.text.idx];
        let leftPanel = document.getElementById('left-panel');
        leftPanel.style.color = color;

        let notesContentWrapper = document.getElementById('notes-content-top-wrapper');
        notesContentWrapper.style.color = color;
      } else if (msg.keyval == "l") {
        if (my.colors.text.idx_left === undefined) {
          my.colors.text.idx_left = my.colors.text.idx;
        }
        my.colors.text.idx_left = (my.colors.text.idx_left + 1) % my.colors.text.lst.length;
        let color = my.colors.text.lst[my.colors.text.idx_left];

        let leftPanel = document.getElementById('left-panel');
        leftPanel.style.color = color;
      } else if (msg.keyval == "r") {
        if (my.colors.text.idx_right === undefined) {
          my.colors.text.idx_right = my.colors.text.idx;
        }
        my.colors.text.idx_right = (my.colors.text.idx_right + 1) % my.colors.text.lst.length;
        let color = my.colors.text.lst[my.colors.text.idx_right];

        let notesContentWrapper = document.getElementById('notes-content-top-wrapper');
        notesContentWrapper.style.color = color;
      } else if (msg.keyval == "g") {
        if (my.currentView === 'timings-summary' || my.currentView === 'history') {
          my.colors.canvas.timings.idx++;
          if (my.colors.canvas.timings.idx >= my.colors.canvas.timings.lst.length) {
            my.colors.canvas.timings.idx = 0; 
          }
          let obj = my.colors.canvas.timings.lst[my.colors.canvas.timings.idx];
          my.currentFillStylesOfTimings = obj;
          displayTimingsAsImage(my.currentFilteredProcess, my.highlightedCategory);
        } else {
          my.colors.canvas.frequencies.idx++;
          if (my.colors.canvas.frequencies.idx >= my.colors.canvas.frequencies.lst.length) {
            my.colors.canvas.frequencies.idx = 0; 
          }
          let obj = my.colors.canvas.frequencies.lst[my.colors.canvas.frequencies.idx];
          my.currentFillStylesOfFrequencies = obj;
          my.viewBuilder.viewsByName["all"].hGraphic.redraw();
        }
      }
      return;
    }
    if (msg.type == "error_message") {
      console.log('[handleServerMessage] msg.type = error_message.');
      if (msg.error_source == "timings") {
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
      } else if (msg.error_source == "notebook") {
        let notebookContentWrapper = document.getElementById("notes-content-wrapper");
        notebookContentWrapper.innerHTML = "";
        let errorMessage = msg.message;
        if (msg.notebook_location) {
          errorMessage = `file location: ${msg.notebook_location}\n${errorMessage}`;
        }
        let errorMessageHtml = turnMultilineTextIntoHtml(errorMessage);
        notebookContentWrapper.appendChild(errorMessageHtml);
        return;
      }
    }
    if (msg.type == "timings") {
      console.log('[handleServerMessage] msg.type = timings.');

      showOnlyTimingsSummaryInLeftPanel();
      initPeriodButtonsRow();
      initResizerInTimingsSummary();
      my.imageInfo = new ImageInfo();
      my.timings = msg.timings;

      if (msg.config !== undefined) {
        my.config = msg.config;
      }
      if (my.config !== undefined) {
        handleTimingConfig(my.config);

        if (my.notesForest !== undefined) {
          handleNotebookConfig(my.config);
        }
      }
      return;
    }

    if (msg.type == "notebook") {
      console.log('[handleServerMessage] msg.type = notebook.');
      if (msg.config !== undefined) {
        my.config = msg.config;
      }
      if (my.config !== undefined) {
        handleNotebookConfig(my.config);

        if (my.timings !== null) {
          handleTimingConfig(my.config);
        }
      }
      let notes_object = msg.notes;
      let forest = yamlRootObject2forest(msg.notes);
      my.notesForest = forest;

      // showTagsAndLinks(forest);
      let taggedNodes = parseTagsFromRootForest(forest);
      let tagsAndLinksForestObj = buildTagsAndLinksForest(taggedNodes);

      let viewBuilder = new CurrentNotesForestViewBuilder();
      viewBuilder.buildView(forest);
      my.rootNodeViewOfNotes = viewBuilder.getRootNodeViewOfNotes();
      appendNotesForestHtml(viewBuilder.getHtml());

      let currentNotesForest = buildCurrentNotesForest(tagsAndLinksForestObj);
      my.currentNotesForest = currentNotesForest;
      highlightNotesInForest(my.rootNodeViewOfNotes, currentNotesForest);

      return;
    }
    // window.webkit.messageHandlers.composite_main_window.postMessage("handleServerMessage end ");

  } catch (err) {
    window.webkit.messageHandlers.composite_main_window.postMessage("js handleServerMessage error msg: " + err.message);
    throw err;
  }
}

function handleTimingConfig(config) {

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
  my.periodButtonsRowVisibilityToggle.toggle();


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

}

function handleHistoryConfig() {
  let config = my.config;
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

function handleNotebookConfig(config) {
  if (config.notebook === undefined) {
    config.notebook = {};
  }

  let fontSizeOfTopPanelOfNotes = config.notebook['font-size-in-px-of-top-panel-of-notes'];
  if (fontSizeOfTopPanelOfNotes === undefined) {
    fontSizeOfTopPanelOfNotes = 16;
  }
  my.fontSizeOfTopPanelOfNotes = fontSizeOfTopPanelOfNotes;
}

function initVerticalResizer() {
  let leftHalf = document.getElementById('left-panel');
  let resizer = document.getElementById('resizer-between-timings-and-notes');
  let rightHalf = document.getElementById('current-notes-tree-nodes-container');

  let resizerX = 0;
  let resizerY = 0;

  let leftHalfWidth = 0;

  resizer.addEventListener('mousedown', (eve) => {
    resizerX = eve.clientX;
    resizerY = eve.clientY;

    leftHalfWidth = leftHalf.getBoundingClientRect().width;

    document.documentElement.style.cursor = 'ew-resize';

    leftHalf.style.userSelect = 'none';
    leftHalf.style.pointerEvents = 'none';

    rightHalf.style.userSelect = 'none';
    rightHalf.style.pointerEvents = 'none';

    document.documentElement.addEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.addEventListener('mouseup', resizerMouseUpListener);
  });

  function resizerMouseMoveListener(eve) {
    const dx = eve.clientX - resizerX;
    const dy = eve.clientY - resizerY;

    const newLeftHalfWidth = ((leftHalfWidth + dx) * 100) / resizer.parentNode.getBoundingClientRect().width;

    leftHalf.style.width = `${newLeftHalfWidth}%`;
  }

  function resizerMouseUpListener(eve) {
    document.documentElement.style.removeProperty('cursor');

    leftHalf.style.removeProperty('user-select');
    leftHalf.style.removeProperty('pointer-events');

    rightHalf.style.removeProperty('user-select');
    rightHalf.style.removeProperty('pointer-events');

    document.documentElement.removeEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.removeEventListener('mouseup', resizerMouseUpListener);
  }
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

function initResizerInHistory() {
  let topPanel = document.getElementById('timing-category-btns-container-in-history');
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

function showOnlyTimingsSummaryInLeftPanel() {
  my.currentView = 'timings-summary';
  let timingsSummaryContainer = document.getElementById('timings-main-container');
  let historyContainer = document.getElementById('history-main-container');
  let frequenciesContainer = document.getElementById('frequencies-main-content-wrapper');

  timingsSummaryContainer.style.display = 'flex';
  historyContainer.style.display = 'none';
  frequenciesContainer.style.display = 'none';
}

function showOnlyHistoryInLeftPanel() {
  my.currentView = 'history';
  let timingsSummaryContainer = document.getElementById('timings-main-container');
  let historyContainer = document.getElementById('history-main-container');
  let frequenciesContainer = document.getElementById('frequencies-main-content-wrapper');

  timingsSummaryContainer.style.display = 'none';
  historyContainer.style.display = 'flex';
  frequenciesContainer.style.display = 'none';
}

function showOnlyFrequenciesInLeftPanel() {
  my.currentView = 'frequencies';
  let timingsSummaryContainer = document.getElementById('timings-main-container');
  let historyContainer = document.getElementById('history-main-container');
  let frequenciesContainer = document.getElementById('frequencies-main-content-wrapper');

  timingsSummaryContainer.style.display = 'none';
  historyContainer.style.display = 'none';
  frequenciesContainer.style.removeProperty('display');
}
