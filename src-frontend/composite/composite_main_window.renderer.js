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
  clearTimingsTextWrapper,
  makeTimingsTextElementsUnminimized,
} = require('../js/timings/display.js');

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

  timingsFormatErrorHandler: (err) => {
    showTimingsFormatError("inner-content-wrapper", err)
  }

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
      document.body.style.backgroundImage = "url(" + my.wallpapers.lst[randomIndex] + ")";
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

      initPeriodButtonsRow();
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

      let mainContentWrapper = document.getElementById("main-content-wrapper");
      let keys = Object.keys(msg);
      return;
    }
    // window.webkit.messageHandlers.composite_main_window.postMessage("handleServerMessage end ");

  } catch (err) {
    window.webkit.messageHandlers.composite_main_window.postMessage("js handleServerMessage error msg: " + err.message);
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
  let leftHalf = document.getElementById('timings-container');
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
