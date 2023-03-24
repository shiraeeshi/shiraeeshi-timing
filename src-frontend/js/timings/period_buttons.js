const {
  filterLast12HourTimings,
  filterLast24HourTimings,
  filterTodaysTimings,
  filterCurrentTwoAndAHalfDaysTimings
} = require('./millis_utils.js');

const { PeriodType } = require('./period_type.js');
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
  btnLast24Hours.addEventListener("click", function() {
    try {
      let timings = filterLast24HourTimings();
      window.my.currentlyDisplayedTimings = timings;
      window.my.imageInfo.updateAsPeriodType(PeriodType.LAST_24_HOURS);
      window.my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
      displayTimings(timings, window.my.timingsCategoryNodeViewRoot);
      window.my.periodButtonsRowVisibilityToggle.toInitialState();
    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "btnLast24Hours click handler error msg: " + err.message);
      if (err.source_timing !== undefined && err.fromdateStr !== undefined) {
        if (window.my.timingsFormatErrorHandler !== undefined) {
          window.my.timingsFormatErrorHandler(err);
        }
      }
    }
  });
  btnLast12Hours.addEventListener("click", function() {
    try {
      let timings = filterLast12HourTimings();
      window.my.currentlyDisplayedTimings = timings;
      window.my.imageInfo.updateAsPeriodType(PeriodType.LAST_12_HOURS);
      window.my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
      displayTimings(timings, window.my.timingsCategoryNodeViewRoot);
      window.my.periodButtonsRowVisibilityToggle.toInitialState();
    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "btnLast12Hours click handler error msg: " + err.message);
      if (err.source_timing !== undefined && err.fromdateStr !== undefined) {
        if (window.my.timingsFormatErrorHandler !== undefined) {
          window.my.timingsFormatErrorHandler(err);
        }
      }
    }
  });
  btnFromZeroHours.addEventListener("click", function() {
    try {
      let timings = filterTodaysTimings();
      window.my.currentlyDisplayedTimings = timings;
      window.my.imageInfo.updateAsPeriodType(PeriodType.FROM_ZERO_HOURS_OF_24_HOUR_PERIOD);
      window.my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
      displayTimings(timings, window.my.timingsCategoryNodeViewRoot);
      window.my.periodButtonsRowVisibilityToggle.toInitialState();
    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "btnFromZeroHours click handler error msg: " + err.message);
      if (err.source_timing !== undefined && err.fromdateStr !== undefined) {
        if (window.my.timingsFormatErrorHandler !== undefined) {
          window.my.timingsFormatErrorHandler(err);
        }
      }
    }
  });
  btnFromZeroTwoAndAHalfHours.addEventListener("click", function() {
    try {
      let timings = filterCurrentTwoAndAHalfDaysTimings();
      window.my.currentlyDisplayedTimings = timings;
      window.my.imageInfo.updateAsPeriodType(PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD);
      window.my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
      displayTimings(timings, window.my.timingsCategoryNodeViewRoot);
      window.my.periodButtonsRowVisibilityToggle.toInitialState();
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
    }
  });
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("addListenersToButtons end ");
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
