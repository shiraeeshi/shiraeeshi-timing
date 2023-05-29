const {
  filterLast12HourTimings,
  filterLast24HourTimings,
  filterTodaysTimings,
  filterCurrentTwoAndAHalfDaysTimings
} = require('./millis_utils.js');

const { fromTimingsByCategoriesToTimingsByDates } = require('./converter.js')
const { PeriodType } = require('./period_type.js');
const { buildProcessesTree } = require('../common/processes_tree_builder.js');
const { createAndAppendFilterByCategory } = require('./categories/tree_view.js');
const { displayTimings } = require('./display.js');

export function initPeriodButtonsRow() {

  let periodButtonsRow = new PeriodButtonsRow();
  window.my.periodButtonsRowVisibilityToggle = new PeriodButtonsRowVisibilityToggle(periodButtonsRow);

  addListenersToButtons();
}

function addListenersToButtons() {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("addListenersToButtons start ");

  let btnLast24Hours = document.getElementById("last-24-hours");
  let btnLast12Hours = document.getElementById("last-12-hours");
  let btnFromZeroHours = document.getElementById("from-zero-hours");
  let btnFromZeroTwoAndAHalfHours = document.getElementById("from-zero-two-and-a-half-hours");

  btnLast24Hours.addEventListener("click", showSummaryOfLast24Hours);
  btnLast12Hours.addEventListener("click", showSummaryOfLast12Hours);
  btnFromZeroHours.addEventListener("click", showSummaryFromZeroHours);
  btnFromZeroTwoAndAHalfHours.addEventListener("click", showSummaryFromZeroTwoAndAHalfHours);

  window.webkit.messageHandlers.timings_summary_msgs.postMessage("addListenersToButtons end ");
}



export function showSummaryOfLast24Hours() {
  try {
    let timingsByCategories = filterLast24HourTimings();
    let timingsByDates = fromTimingsByCategoriesToTimingsByDates(timingsByCategories);
    window.my.currentlyDisplayedTimings = timingsByDates;
    window.my.imageInfo.updateAsPeriodType(PeriodType.LAST_24_HOURS);
    let processesTree = buildProcessesTree(timingsByCategories);
    window.my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(processesTree);
    displayTimings(timingsByDates, processesTree);
    window.my.periodButtonsRowVisibilityToggle.toInitialState();
    let categoriesContainer = document.getElementById('timing-category-btns-container');
    categoriesContainer.style.removeProperty('height');
  } catch (err) {
    window.webkit.messageHandlers.timings_summary_msgs.postMessage(
      "btnLast24Hours click handler error msg: " + err.message);
    if (err.source_timing !== undefined && err.fromdateStr !== undefined) {
      if (window.my.timingsFormatErrorHandler !== undefined) {
        window.my.timingsFormatErrorHandler(err);
      }
    }
  }
}

export function showSummaryOfLast12Hours() {
  try {
    let timingsByCategories = filterLast12HourTimings();
    let timingsByDates = fromTimingsByCategoriesToTimingsByDates(timingsByCategories);
    window.my.currentlyDisplayedTimings = timingsByDates;
    window.my.imageInfo.updateAsPeriodType(PeriodType.LAST_12_HOURS);
    let processesTree = buildProcessesTree(timingsByCategories);
    window.my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(processesTree);
    displayTimings(timingsByDates, processesTree);
    window.my.periodButtonsRowVisibilityToggle.toInitialState();
    let categoriesContainer = document.getElementById('timing-category-btns-container');
    categoriesContainer.style.removeProperty('height');
  } catch (err) {
    window.webkit.messageHandlers.timings_summary_msgs.postMessage(
      "btnLast12Hours click handler error msg: " + err.message);
    if (err.source_timing !== undefined && err.fromdateStr !== undefined) {
      if (window.my.timingsFormatErrorHandler !== undefined) {
        window.my.timingsFormatErrorHandler(err);
      }
    }
  }
}

export function showSummaryFromZeroHours() {
  try {
    let timingsByCategories = filterTodaysTimings();
    let timingsByDates = fromTimingsByCategoriesToTimingsByDates(timingsByCategories);
    window.my.currentlyDisplayedTimings = timingsByDates;
    window.my.imageInfo.updateAsPeriodType(PeriodType.FROM_ZERO_HOURS_OF_24_HOUR_PERIOD);
    let processesTree = buildProcessesTree(timingsByCategories);
    window.my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(processesTree);
    displayTimings(timingsByDates, processesTree);
    window.my.periodButtonsRowVisibilityToggle.toInitialState();
    let categoriesContainer = document.getElementById('timing-category-btns-container');
    categoriesContainer.style.removeProperty('height');
  } catch (err) {
    window.webkit.messageHandlers.timings_summary_msgs.postMessage(
      "btnFromZeroHours click handler error msg: " + err.message);
    if (err.source_timing !== undefined && err.fromdateStr !== undefined) {
      if (window.my.timingsFormatErrorHandler !== undefined) {
        window.my.timingsFormatErrorHandler(err);
      }
    }
  }
}

export function showSummaryFromZeroTwoAndAHalfHours() {
  try {
    let timingsByCategories = filterCurrentTwoAndAHalfDaysTimings();
    let timingsByDates = fromTimingsByCategoriesToTimingsByDates(timingsByCategories);
    window.my.currentlyDisplayedTimings = timingsByDates;
    window.my.imageInfo.updateAsPeriodType(PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD);
    let processesTree = buildProcessesTree(timingsByCategories);
    window.my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(processesTree);
    displayTimings(timingsByDates, processesTree);
    window.my.periodButtonsRowVisibilityToggle.toInitialState();
    let categoriesContainer = document.getElementById('timing-category-btns-container');
    categoriesContainer.style.removeProperty('height');
  } catch (err) {
    window.webkit.messageHandlers.timings_summary_msgs.postMessage(
      "btnFromZero2.5Hours click handler error msg: " + err.message);
    if (err.source_timing !== undefined && err.fromdateStr !== undefined) {
      if (window.my.timingsFormatErrorHandler !== undefined) {
        window.my.timingsFormatErrorHandler(err);
      } else {
        window.webkit.messageHandlers.timings_summary_msgs.postMessage(
          "btnFromZero2.5Hours click handler error. window.my.timingsFormatErrorHandler is undefined");
      }
    } else {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        `btnFromZero2.5Hours click handler error. err.source_timing: ${err.source_timing}, err.fromdateStr: ${err.fromdateStr}`);
    }
    throw err;
  }
}

let PeriodButtonsRow = (function() {
  function PeriodButtonsRowInitFunction() {
    this.elem = document.getElementById("period-btns-container");
    this.isVisible = true;
  }
  PeriodButtonsRowInitFunction.prototype.show = function() {
    this.elem.style.display = 'block';
    this.isVisible = true;
  };
  PeriodButtonsRowInitFunction.prototype.hide = function() {
    this.elem.style.display = 'none';
    this.isVisible = false;
  };
  return PeriodButtonsRowInitFunction;
})();

let PeriodButtonsRowVisibilityToggle = (function() {
  function InitFunction(periodButtonsRow) {
    let that = this;
    that.row = periodButtonsRow;
    that.btnHide = document.getElementById("btn-hide-period-btns");
    that.btnShow = document.getElementById("btn-show-period-btns");
    that.btnHide.onclick = function() {
      that.toggle();
    };
    that.btnShow.onclick = function() {
      that.toggle();
    };
  }
  InitFunction.prototype.toggle = function() {
    if (this.row.isVisible) {
      this.row.hide();
      this.btnHide.style.display = 'none';
      this.btnShow.style.display = 'inline';
    } else {
      this.row.show();
      this.btnHide.style.display = 'inline';
      this.btnShow.style.display = 'none';
    }
  };
  InitFunction.prototype.toInitialState = function() {
    this.btnHide.style.display = 'inline';
    this.btnShow.style.display = 'none';
  };
  return InitFunction;
})();
