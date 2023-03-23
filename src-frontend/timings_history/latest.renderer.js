const {
  displayTimings,
  clearTimingsTextWrapper,
  makeTimingsTextElementsUnminimized,
  createAndAppendFilterByCategory,
  millisOfCurrentAbstractDayOfYear,
  dateDifferenceInMillis,
} = require('../js/timings_summary.functions.js');

const { turnMultilineTextIntoHtml, addOffsetToLineNumberInErrorMessage, withChildren, withClass } = require('../js/html_utils.js');

const { timingDateArrays2Date, date2timingDateArray } = require('../js/date_utils.js');

let my = {
  timings: null,
  // imageInfo: { // imageInfo = new ImageInfo()
  //   minutesRange: 0,
  //   minutesMaxDiff: 0
  // },
  dayOffset: 0
};

window.my = my;

window.webkit.messageHandlers.timings_history_latest_msgs.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  if (msg.msg_type == "keypress_event") {
    let radioBtn24Hours = document.getElementById("day-of-24-hours");
    function showTimings() {
      if (radioBtn24Hours.checked) {
        showTimingsOf24HourDay();
      } else {
        showTimingsOf60HourDay();
      }
    }
    let btnNextDay = document.getElementById("next-day");
    if (msg.keyval == "Left") {
      my.dayOffset++;

      my.highlightedCategory = false;
      my.isHighlightingTimingRowInText = false;
      my.isHighlightingTimingItemInImage = false;

      btnNextDay.disabled = false;
      showTimings();
    } else if (msg.keyval == "Right") {
      if (my.dayOffset > 0) {
        my.dayOffset--;
      }

      my.highlightedCategory = false;
      my.isHighlightingTimingRowInText = false;
      my.isHighlightingTimingItemInImage = false;

      if (my.dayOffset <= 0) {
        btnNextDay.disabled = true;
      }
      showTimings();
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
  if (msg.msg_type == "timings_query_response") {
    if (my.timingsQueryResponseCallback !== undefined) {
      my.timingsQueryResponseCallback(msg.timings);
    }
    return;
  }
  if (msg.msg_type == "error_message") {
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
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("handleServerMessage start ");
  addListenersToButtons();
  my.imageInfo = new ImageInfo();
  // my.timings = msg;
  showTimingsOf60HourDay();
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("handleServerMessage end ");
}

function addListenersToButtons() {
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("addListenersToButtons start ");
  let btnPreviousDay = document.getElementById("previous-day");
  let btnNextDay = document.getElementById("next-day");
  let radioBtn24Hours = document.getElementById("day-of-24-hours");
  document.getElementById("day-of-60-hours").addEventListener("change", function() {
    my.dayOffset = 0;
    my.highlightedCategory = false;
    my.isHighlightingTimingRowInText = false;
    my.isHighlightingTimingItemInImage = false;
    if (radioBtn24Hours.checked) {
      showTimingsOf24HourDay();
    } else {
      showTimingsOf60HourDay();
    }
  });
  radioBtn24Hours.addEventListener("change", function() {
    my.dayOffset = 0;
    my.highlightedCategory = false;
    my.isHighlightingTimingRowInText = false;
    my.isHighlightingTimingItemInImage = false;
    if (radioBtn24Hours.checked) {
      showTimingsOf24HourDay();
    } else {
      showTimingsOf60HourDay();
    }
  });
  btnPreviousDay.addEventListener("click", function() {
    try {
      my.dayOffset++;
      btnNextDay.disabled = false;
      my.highlightedCategory = false;
      my.isHighlightingTimingRowInText = false;
      my.isHighlightingTimingItemInImage = false;
      if (radioBtn24Hours.checked) {
        showTimingsOf24HourDay();
      } else {
        showTimingsOf60HourDay();
      }
    } catch (err) {
      window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
        "btnPreviousDay click handler error msg: " + err.message);
    }
  });
  btnNextDay.addEventListener("click", function() {
    try {
      if (my.dayOffset > 0) {
        my.dayOffset--;
      }
      if (my.dayOffset <= 0) {
        btnNextDay.disabled = true;
      }
      my.highlightedCategory = false;
      my.isHighlightingTimingRowInText = false;
      my.isHighlightingTimingItemInImage = false;
      if (radioBtn24Hours.checked) {
        showTimingsOf24HourDay();
      } else {
        showTimingsOf60HourDay();
      }
    } catch (err) {
      window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
        "btnPreviousDay click handler error msg: " + err.message);
    }
  });
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("addListenersToButtons end ");
}

function showTimingsOf24HourDay() {
  let date = new Date();
  date.setTime(date.getTime() - my.dayOffset*24*60*60*1000);
  let timingsPromise = timingsOf24HourDay(date);
  timingsPromise.then(timings => {
    //window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
    //  "showTimingsOf24HourDay (promise.then) timings len: " + timings.length);
    my.imageInfo.updateAsPeriodType(PeriodType.PERIOD_OF_24_HOURS);

    my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
    displayTimings(timings, my.timingsCategoryNodeViewRoot);
  }).catch(err => {
    window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
      "showTimingsOf24HourDay err: " + err);
  });
}

function showTimingsOf60HourDay() {

  let millisIn24hours = 24*60*60*1000;
  let currentAbstractDayDiff = millisOfCurrentAbstractDayOfYear(2.5);
  let diffFrom = currentAbstractDayDiff + my.dayOffset * 2.5 * millisIn24hours;
  let diffTo = 0;
  if (my.dayOffset > 0) {
    diffTo = currentAbstractDayDiff + (my.dayOffset - 1) * 2.5 * millisIn24hours;
  }

  let timingsPromise = filterTimingsByDifference(diffFrom, diffTo);
  timingsPromise.then(timings => {
    window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
      "showTimingsOf60HourDay timings len: " + timings.length);
    my.imageInfo.updateAsPeriodType(PeriodType.PERIOD_OF_60_HOURS);

    my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
    displayTimings(timings, my.timingsCategoryNodeViewRoot);

    // <debug>
    // let currentAbstractDayBeginning = new Date()
    // currentAbstractDayBeginning.setTime(new Date().getTime() - diffFrom)
    // window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
    //   "showTimingsOf60HourDay currentAbstractDay started at time: " +
    //   currentAbstractDayBeginning.getDate() + "." +
    //   (currentAbstractDayBeginning.getMonth() + 1) + " " +
    //   currentAbstractDayBeginning.getHours() + ":" +
    //   currentAbstractDayBeginning.getMinutes()
    //   );
    // </debug>
  }).catch(err => {
    window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
      "showTimingsOf60HourDay err: " + err);
  });
}

function PeriodType() {};

PeriodType.PERIOD_OF_24_HOURS = new PeriodType();
PeriodType.PERIOD_OF_60_HOURS = new PeriodType();

function ImageInfo() {
  this.minutesMaxDiff = 0;
  this.minutesRange = 0;
  this.periodType = PeriodType.PERIOD_OF_60_HOURS;
  this.minutesMaxDiffLastModified = 0;
}

ImageInfo.prototype.updateAsPeriodType = function(periodType) {
  let that = this;
  that.periodType = periodType;
  if (periodType == PeriodType.PERIOD_OF_24_HOURS) {
    let date = new Date();
    date.setTime(date.getTime() - my.dayOffset*24*60*60*1000);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    let maxDiff = (new Date().getTime() - date.getTime()) / (60.0 * 1000);
    that.minutesRange = 24*60;
    that.minutesMaxDiff = maxDiff;
    that.minutesMaxDiffLastModified = new Date();
  } else if (periodType == PeriodType.PERIOD_OF_60_HOURS) {
    let millisIn24hours = 24*60*60*1000;
    let currentAbstractDayDiff = millisOfCurrentAbstractDayOfYear(2.5);
    let diffFrom = currentAbstractDayDiff + my.dayOffset * 2.5 * millisIn24hours;

    let maxDiff = diffFrom / (60.0 * 1000);
  
    that.minutesRange = 2.5 * 24 * 60;
    that.minutesMaxDiff = maxDiff;
    that.minutesMaxDiffLastModified = new Date();
  }
};

ImageInfo.prototype.updateIfNeeded = function() {
  let that = this;
  let now = new Date();
  let millisSinceLastModified = now.getTime() - that.minutesMaxDiffLastModified.getTime();
  that.minutesMaxDiff += (millisSinceLastModified / (60.0 * 1000));
  that.minutesMaxDiffLastModified = now;
};






function timingsOf24HourDay(date) {
  return new Promise((resolve, reject) => {
    let result = {
      date: date2timingDateArray(date),
      timings: []
    };
    window.webkit.messageHandlers.timings_history_latest__get_timings.postMessage(
      date2stringWithDots(date));
    my.timingsQueryResponseCallback = function(timings) {
      // console.log("timingsOf24HourDay callback. timings:");
      // console.dir(timings);
      Object.keys(timings).forEach(key => {
        let thisTimingsByDays = timings[key];
        for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
          let eachTimingDay = thisTimingsByDays[i];
          let dt = eachTimingDay.date;
          if (threeIntsEqDate(dt, date)) {
            eachTimingDay.timings.forEach(t => {
              let d = timingDateArrays2Date(dt, t.from);
              t.fromdate = d;
              t.category = key;
            });
            result.timings = result.timings.concat(eachTimingDay.timings);
          }
        }
      });
      result.timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
      resolve([result])
    };
  });
}






function threeIntsEqDate(threeInts, date) {
  return threeInts[0] == date.getDate() &&
    threeInts[1] == (date.getMonth() + 1) &&
    threeInts[2] == date.getFullYear();
}






function filterTimingsByDifference(differenceInMillisFrom, differenceInMillisTo) {
  return new Promise((resolve, reject) => {
    let now = new Date();

    function dateIsWithinPastMillis(dt) {
      let d = new Date();
      let timeNow = d.getTime();

      d.setDate(1);
      d.setMonth(dt[1] - 1);
      d.setDate(dt[0]);
      d.setFullYear(dt[2]);
      d.setHours(0);
      d.setMinutes(0);
      d.setSeconds(0);

      let timeAtBeginningOfDt = d.getTime();

      d.setHours(23);
      d.setMinutes(59);
      d.setSeconds(59);

      let timeAtEndOfDt = d.getTime();

      if (timeAtEndOfDt > timeNow && timeAtBeginningOfDt < timeNow) {
        return true;
      }
      let dtBeginningDiff = timeNow - timeAtBeginningOfDt;
      let dtEndDiff = timeNow - timeAtEndOfDt;

      // { [}]
      // [{}]
      // [{] }
      
      if (dtBeginningDiff > differenceInMillisFrom) {
        return dtEndDiff < differenceInMillisFrom && dtEndDiff > differenceInMillisTo;
      }
      return dtBeginningDiff > differenceInMillisTo;
    }

    let datesToRequest = (function() {
      let result = [];
      let date = new Date();
      date.setTime(new Date().getTime() - differenceInMillisFrom);
      // console.log("filterTimingsByDifference. creating datesToRequest. differenceInMillisFrom: " + differenceInMillisFrom + ", first date is within: " + dateIsWithinPastMillis(date2timingDateArray(date)));
      while (dateIsWithinPastMillis(date2timingDateArray(date))) {
        result[result.length] = date2stringWithDots(date);
        date.setTime(date.getTime() + 24*60*60*1000);
      }
      return result;
    })();
    console.log("filterTimingsByDifference. datesToRequest: " + datesToRequest.join(","))
    window.webkit.messageHandlers.timings_history_latest__get_timings.postMessage(
      datesToRequest.join(","));
    my.timingsQueryResponseCallback = function(timings) {

      let timingsByDates = {};

      Object.keys(timings).forEach(key => {
        let thisTimingsByDays = timings[key];
        for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
          let eachTimingDay = thisTimingsByDays[i];
          let dt = eachTimingDay.date;
          //if (dateIsWithinPastMillis(dt)) {
            eachTimingDay.timings.forEach(t => {
              let d = timingDateArrays2Date(dt, t.from);
              let diff = dateDifferenceInMillis(now, d);
              if (diff < differenceInMillisFrom && diff > differenceInMillisTo) {
                t.fromdate = d;
                t.category = key;
                let dtstr = dt.join(".");
                if (!timingsByDates.hasOwnProperty(dtstr)) {
                  timingsByDates[dtstr] = {
                    date: dt,
                    timings: []
                  };
                }
                timingsByDates[dtstr].timings.push(t);
              }
            });
          //}
        }
      });
      Object.keys(timingsByDates).forEach(dtStr => {
        let item = timingsByDates[dtStr];
        item.timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
      });
      function threeInts2date(threeInts) {
        return timingDateArrays2Date(threeInts, [0,0]);
      }
      let timingsByDatesArr = Object.values(timingsByDates);
      timingsByDatesArr.sort((a, b) => threeInts2date(a.date).getTime() - threeInts2date(b.date).getTime());
      resolve(timingsByDatesArr);
    };
  });
}


function date2stringWithDots(date) {
  let arr = date2timingDateArray(date);
  let dateDateStr = "" + date.getDate();
  let dateMonthStr =  "" + (date.getMonth() + 1);
  let dateYearStr =  "" + date.getFullYear();
  if (dateDateStr.length == 1) {
    dateDateStr = "0" + dateDateStr;
  }
  if (dateMonthStr.length == 1) {
    dateMonthStr = "0" + dateMonthStr;
  }
  return [ dateDateStr
         , dateMonthStr
         , dateYearStr
         ].join(".");
}

function turnMultilineTextIntoHtml(text) {
  return withChildren(document.createElement('div'),
    ...text.split("\n")
      .map(line => turnWhitespacePrefixIntoNbsp(line))
      .flatMap(el => [el,document.createElement("br")])
      .slice(0, -1)
  )
}

function turnWhitespacePrefixIntoNbsp(line) {
  let match = line.match(/^(\s+)(.*)/);
  let elem = document.createElement('span');
  if (!match) {
    elem.innerHTML = line;
    return elem;
  }
  let prefix = match[1];
  let afterPrefix = match[2];
  let nbsps = Array.prototype.map.call(prefix, _ => '&nbsp;').join('');
  elem.innerHTML = nbsps + afterPrefix;
  return elem;
}

function addOffsetToLineNumberInErrorMessage(text, offset) {
  return text.replace(/at line (\d+)/g, (_, n) => {
    n = parseInt(n);
    return `at line ${n + offset}`;
  });
}
