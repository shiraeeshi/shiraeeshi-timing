const { timingDateArrays2Date, dateDifferenceInMillis } = require('../date_utils.js');

function filterTimingsByDifference(differenceInMillis) {
  let result = {};

  let today = new Date();
  let yesterday = yesterdayAsADate();

  let todaysTimings = [];
  let yesterdaysTimings = [];

  let timingsByDates = {};
  /*
  timingsByDates[date2timingDateArray(yesterday).join(".")] = {
    date: date2timingDateArray(yesterday),
    timings: []
  };
  timingsByDates[date2timingDateArray(today).join(".")] = {
    date: date2timingDateArray(today),
    timings: []
  };
  */

  function dateIsWithinPastMillis(dt) {
    let d = new Date();
    let timeNow = d.getTime();

    d.setDate(1);
    d.setMonth(dt[1] - 1);
    d.setDate(dt[0]);
    d.setFullYear(dt[2]);
    d.setHours(23);
    d.setMinutes(59);
    d.setSeconds(59);

    let timeAtEndOfDt = d.getTime();

    if (timeAtEndOfDt > timeNow) {
      return true;
    }
    let dtDiff = timeNow - timeAtEndOfDt;
    return dtDiff < differenceInMillis;
  }

  Object.keys(window.my.timings).forEach(key => {
    let thisProcessObject = window.my.timings[key];
    let thisTimingsByDays = thisProcessObject.timingsByDays;

    let filteredTimingByDays = [];
    result[key] = {
      name: key,
      categoryPath: thisProcessObject.categoryPath,
      timingsByDays: filteredTimingByDays,
    };

    let addedTimingsForKey = false;

    for (let i = 0; i < thisTimingsByDays.length; i++) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;

      let filteredEachTimingDay = {
        date: dt,
        timings: []
      };
      filteredTimingByDays.push(filteredEachTimingDay);

      if (dateIsWithinPastMillis(dt)) {
        eachTimingDay.timings.forEach(t => {
          let d = timingDateArrays2Date(dt, t.from);
          let diff = dateDifferenceInMillis(today, d);
          if (diff < differenceInMillis) {
            t.fromdate = d;
            t.categoryPath = thisProcessObject.categoryPath;
            let dtstr = dt.join(".");
            t.dtstr = dtstr;

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
      }
    }

    if (!addedTimingsForKey) {
      delete result[key];
    }
  });
  return result;
}

export function filterLast24HourTimings() {
  return filterTimingsByDifference(24*60*60*1000);
}

export function filterLast12HourTimings() {
  return filterTimingsByDifference(12*60*60*1000);
}

export function calculateDifferenceBetweenNowAndStartOfDay() {
  let dt = new Date();
  let todayZero = new Date();
  todayZero.setHours(0);
  todayZero.setMinutes(0);
  todayZero.setSeconds(0);
  return dt.getTime() - todayZero.getTime();
}

export function filterTodaysTimings() {
  let differenceBetweenNowAndStartOfDay = calculateDifferenceBetweenNowAndStartOfDay();
  return filterTimingsByDifference(differenceBetweenNowAndStartOfDay);
}

export function filterCurrentTwoAndAHalfDaysTimings() {

  let diff = millisOfCurrentAbstractDayOfYear(2.5);
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("filterCurrentTwoAndAHalfDaysTimings diff: " + diff);
  return filterTimingsByDifference(diff);
}

export function millisOfCurrentAbstractDayOfYear(earthDaysPerAbstractDay) {
  let now = new Date();
  let start = new Date(now.getFullYear(), 0);
  let diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
  let oneDay = 1000 * 60 * 60 * 24 * earthDaysPerAbstractDay;
  let remainder = diff % oneDay;
  return remainder;
}

function yesterdayAsADate() {
  let date = new Date();
  date.setTime(date.getTime() - 24*60*60*1000);
  return date;
}

