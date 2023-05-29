const { PeriodType } = require('./history_period_type.js');
const { millisOfCurrentAbstractDayOfYear } = require('../millis_utils.js');
const { fromTimingsByCategoriesToTimingsByDates } = require('../converter.js');
const { buildProcessesTree } = require('../../common/processes_tree_builder.js');
const { timingDateArrays2Date, date2timingDateArray, dateDifferenceInMillis } = require('../../date_utils.js');
const { createAndAppendFilterByCategory } = require('../categories/tree_view.js');

const { displayTimings } = require('../display.js');


export function addListenersToButtons() {
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("addListenersToButtons start ");
  let btnPreviousDay = document.getElementById("previous-day");
  let btnNextDay = document.getElementById("next-day");
  let radioBtn24Hours = document.getElementById("day-of-24-hours");
  let categoriesContainer = document.getElementById('timing-category-btns-container');
  document.getElementById("day-of-60-hours").addEventListener("change", function() {
    try {
      my.dayOffset = 0;
      delete my.highlightedCategory;
      my.isHighlightingTimingRowInText = false;
      my.isHighlightingTimingItemInImage = false;
      if (radioBtn24Hours.checked) {
        showTimingsOf24HourDay();
      } else {
        showTimingsOf60HourDay();
      }
      categoriesContainer.style.removeProperty('height');
    } catch (err) {
      window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
        "radioBtn60Hours change handler error msg: " + err.message);
    }
  });
  radioBtn24Hours.addEventListener("change", function() {
    try {
      my.dayOffset = 0;
      delete my.highlightedCategory;
      my.isHighlightingTimingRowInText = false;
      my.isHighlightingTimingItemInImage = false;
      if (radioBtn24Hours.checked) {
        showTimingsOf24HourDay();
      } else {
        showTimingsOf60HourDay();
      }
      categoriesContainer.style.removeProperty('height');
    } catch (err) {
      window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
        "radioBtn24Hours change handler error msg: " + err.message);
    }
  });
  btnPreviousDay.addEventListener("click", function() {
    try {
      my.dayOffset++;
      btnNextDay.disabled = false;
      delete my.highlightedCategory;
      my.isHighlightingTimingRowInText = false;
      my.isHighlightingTimingItemInImage = false;
      if (radioBtn24Hours.checked) {
        showTimingsOf24HourDay();
      } else {
        showTimingsOf60HourDay();
      }
      categoriesContainer.style.removeProperty('height');
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
      delete my.highlightedCategory;
      my.isHighlightingTimingRowInText = false;
      my.isHighlightingTimingItemInImage = false;
      if (radioBtn24Hours.checked) {
        showTimingsOf24HourDay();
      } else {
        showTimingsOf60HourDay();
      }
      categoriesContainer.style.removeProperty('height');
    } catch (err) {
      window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
        "btnNextDay click handler error msg: " + err.message);
    }
  });
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("addListenersToButtons end ");
}

export function showTimingsOf24HourDay() {
  let date = new Date();
  date.setTime(date.getTime() - my.dayOffset*24*60*60*1000);
  let timingsPromise = timingsOf24HourDay(date);
  timingsPromise.then(timingsByCategories => {
    let timingsByDates = fromTimingsByCategoriesToTimingsByDates(timingsByCategories);
    //window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
    //  "showTimingsOf24HourDay (promise.then) timings len: " + timings.length);
    my.imageInfo.updateAsPeriodType(PeriodType.PERIOD_OF_24_HOURS);

    let processesTree = buildProcessesTree(timingsByCategories);
    my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(processesTree, 'timing-category-btns-container-in-history');
    displayTimings(timingsByDates, processesTree);
  }).catch(err => {
    window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
      "showTimingsOf24HourDay err: " + err);
    if (err.source_timing !== undefined && err.fromdateStr !== undefined) {
      showTimingsFormatError("inner-content-wrapper-in-history", err);
    }
  });
}

export function showTimingsOf60HourDay() {

  let millisIn24hours = 24*60*60*1000;
  let currentAbstractDayDiff = millisOfCurrentAbstractDayOfYear(2.5);
  let diffFrom = currentAbstractDayDiff + my.dayOffset * 2.5 * millisIn24hours;
  console.log(`showTimingsOf60HourDay. currentAbstractDayDiff: ${currentAbstractDayDiff}. my.dayOffset: ${my.dayOffset}`);
  let diffTo = 0;
  if (my.dayOffset > 0) {
    diffTo = currentAbstractDayDiff + (my.dayOffset - 1) * 2.5 * millisIn24hours;
  }

  let timingsPromise = filterTimingsByDifference(diffFrom, diffTo);
  timingsPromise.then(timingsByCategories => {
    let timingsByDates = fromTimingsByCategoriesToTimingsByDates(timingsByCategories);
    window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
      "showTimingsOf60HourDay timings len: " + timingsByDates.length);
    my.imageInfo.updateAsPeriodType(PeriodType.PERIOD_OF_60_HOURS);

    let processesTree = buildProcessesTree(timingsByCategories);
    my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(processesTree, 'timing-category-btns-container-in-history');
    displayTimings(timingsByDates, processesTree);

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
    if (err.source_timing !== undefined && err.fromdateStr !== undefined) {
      showTimingsFormatError("inner-content-wrapper-in-history", err);
    }
  });
}

function timingsOf24HourDay(date) {
  return new Promise((resolve, reject) => {
    // let result = {
    //   date: date2timingDateArray(date),
    //   timings: []
    // };
    window.webkit.messageHandlers.timings_history_latest__get_timings.postMessage(
      date2stringWithDots(date));
    my.timingsQueryResponseCallback = function(timings) {
      let result = {};
      // console.log("timingsOf24HourDay callback. timings:");
      // console.dir(timings);
      Object.keys(timings).forEach(key => {
        let thisProcessObject = timings[key];
        let thisTimingsByDays = thisProcessObject.timingsByDays;

        let filteredTimingByDays = [];
        result[key] = {
          name: key,
          categoryPath: thisProcessObject.categoryPath,
          timingsByDays: filteredTimingByDays,
        };

        let addedTimingsForKey = false;

        for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
          let eachTimingDay = thisTimingsByDays[i];
          let dt = eachTimingDay.date;

          let filteredTimings = [];
          let filteredEachTimingDay = {
            date: dt,
            timings: filteredTimings
          };
          filteredTimingByDays.push(filteredEachTimingDay);

          if (threeIntsEqDate(dt, date)) {
            eachTimingDay.timings.forEach(t => {
              let d = timingDateArrays2Date(dt, t.from);
              t.fromdate = d;
              t.categoryPath = thisProcessObject.categoryPath;
            });
            // result.timings = result.timings.concat(eachTimingDay.timings);

            filteredTimings = filteredTimings.concat(eachTimingDay.timings);
            filteredEachTimingDay.timings = filteredTimings;
            addedTimingsForKey = true;
          }
        }

        if (!addedTimingsForKey) {
          delete result[key];
        }
      });
      // result.timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
      // resolve([result])
      resolve(result)
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
    console.log(`filterTimingsByDifference. differenceInMillisFrom: ${differenceInMillisFrom}`);
    console.log("filterTimingsByDifference. datesToRequest: " + datesToRequest.join(","))
    window.webkit.messageHandlers.timings_history_latest__get_timings.postMessage(
      datesToRequest.join(","));
    my.timingsQueryResponseCallback = function(timings) {

      // let timingsByDates = {};
      let result = {};

      Object.keys(timings).forEach(key => {
        let thisProcessObject = timings[key];
        let thisTimingsByDays = thisProcessObject.timingsByDays;

        let filteredTimingByDays = [];
        result[key] = {
          name: key,
          categoryPath: thisProcessObject.categoryPath,
          timingsByDays: filteredTimingByDays,
        };

        let addedTimingsForKey = false;

        for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
          let eachTimingDay = thisTimingsByDays[i];
          let dt = eachTimingDay.date;

          let filteredEachTimingDay = {
            date: dt,
            timings: []
          };
          filteredTimingByDays.push(filteredEachTimingDay);

          //if (dateIsWithinPastMillis(dt)) {
            eachTimingDay.timings.forEach(t => {
              let d = timingDateArrays2Date(dt, t.from);
              let diff = dateDifferenceInMillis(now, d);
              if (diff < differenceInMillisFrom && diff > differenceInMillisTo) {
                t.fromdate = d;
                t.categoryPath = thisProcessObject.categoryPath;
                let dtstr = dt.join(".");

                filteredEachTimingDay.timings.push(t);
                addedTimingsForKey = true;

                // if (!timingsByDates.hasOwnProperty(dtstr)) {
                //   timingsByDates[dtstr] = {
                //     date: dt,
                //     timings: []
                //   };
                // }
                // timingsByDates[dtstr].timings.push(t);
              }
            });
          //}
        }

        if (!addedTimingsForKey) {
          delete result[key];
        }
      });
      resolve(result);
      // Object.keys(timingsByDates).forEach(dtStr => {
      //   let item = timingsByDates[dtStr];
      //   item.timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
      // });
      // function threeInts2date(threeInts) {
      //   return timingDateArrays2Date(threeInts, [0,0]);
      // }
      // let timingsByDatesArr = Object.values(timingsByDates);
      // timingsByDatesArr.sort((a, b) => threeInts2date(a.date).getTime() - threeInts2date(b.date).getTime());
      // resolve(timingsByDatesArr);
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
