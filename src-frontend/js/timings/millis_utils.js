const { timingDateArrays2Date, dateDifferenceInMillis } = require('../date_utils.js');

function filterTimingsByDifference(differenceInMillis) {
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
    let thisTimingsByDays = window.my.timings[key];
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      if (dateIsWithinPastMillis(dt)) {
        eachTimingDay.timings.forEach(t => {
          let d = timingDateArrays2Date(dt, t.from);
          let diff = dateDifferenceInMillis(today, d);
          if (diff < differenceInMillis) {
            t.fromdate = d;
            t.category = key;
            let dtstr = dt.join(".");
            t.dtstr = dtstr;
            if (!timingsByDates.hasOwnProperty(dtstr)) {
              timingsByDates[dtstr] = {
                date: dt,
                timings: []
              };
            }
            timingsByDates[dtstr].timings.push(t);
          }
        });
      }
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
  return timingsByDatesArr;
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

