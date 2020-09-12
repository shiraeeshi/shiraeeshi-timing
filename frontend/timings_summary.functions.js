let my = {
  timings: null
};

function handleServerMessage(msg) {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage start ");
  addListenersToButtons();
  my.timings = msg;
  let mainContentWrapper = document.getElementById("main-content-wrapper");
  let keys = Object.keys(msg);
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage end ");
}

function addListenersToButtons() {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("addListenersToButtons start ");
  let btnLast24Hours = document.getElementById("last-24-hours");
  let btnLast12Hours = document.getElementById("last-12-hours");
  let btnFromZeroHours = document.getElementById("from-zero-hours");
  btnLast24Hours.addEventListener("click", function() {
    let timings = filterLast24HourTimings();
    displayTimings(timings);
  });
  btnLast12Hours.addEventListener("click", function() {
    let timings = filterLast12HourTimings();
    displayTimings(timings);
  });
  btnFromZeroHours.addEventListener("click", function() {
    let timings = filterTodaysTimings();
    displayTimings(timings);
  });
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("addListenersToButtons end ");
}

function displayTimings(timings) {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("displayTimings start ");
  try {
  let innerContentWrapper = document.getElementById("inner-content-wrapper");
  innerContentWrapper.innerHTML = "";

  let timingsInDivs = timings.map(oneDayTiming => {
    let oneDayTimingWrapper = document.createElement('div');
    let dateParagraph = document.createElement('p');
    let dateTextNode = document.createTextNode(oneDayTiming.date.join("."));
    let ul = document.createElement('ul');
    let lis = oneDayTiming.timings.map(timingItem => {
      let li = document.createElement('li');
      let span = document.createElement('span');
      let txt = document.createTextNode([
        timingItem.from.join("."),
        "-",
        timingItem.to.join("."),
        timingItem2symbol(timingItem),
        ['(',timingItem.minutes,' m)'].join(""),
        timingItem.name
      ].join(" "));
      return withChildren(li, withChildren(span, txt));
    });
    return withChildren(oneDayTimingWrapper,
      withChildren(dateParagraph, dateTextNode),
      withChildren(ul, ...lis),
    );
  });
  timingsInDivs.forEach(elem => innerContentWrapper.appendChild(elem));
  } catch (err) {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("displayTimings error msg: " + err.message);
  }
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("displayTimings end ");
}

function filterTimingsByDifference(differenceInMillis) {
  let today = new Date();
  let yesterday = yesterdayAsADate();

  let todaysTimings = [];
  let yesterdaysTimings = [];

  Object.keys(my.timings).forEach(key => {
    let thisTimingsByDays = my.timings[key];
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      if (timingDateEquals(dt, today)) {
        eachTimingDay.timings.forEach(t => {
          let d = timingDateArrays2Date(eachTimingDay.date, t.from);
          let diff = dateDifferenceInMillis(today, d);
          if (diff < differenceInMillis) {
            t.fromdate = d;
            todaysTimings.push(t);
          }
        });
      }
      if (timingDateEquals(dt, yesterday)) {
        eachTimingDay.timings.forEach(t => {
          let d = timingDateArrays2Date(eachTimingDay.date, t.from);
          let diff = dateDifferenceInMillis(today, d);
          if (diff < differenceInMillis) {
            t.fromdate = d;
            yesterdaysTimings.push(t);
          }
        });
      }
    }
  });
  yesterdaysTimings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  todaysTimings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  return [
    {
      date: date2timingDateArray(yesterday),
      timings: yesterdaysTimings
    },
    {
      date: date2timingDateArray(today),
      timings: todaysTimings
    }
  ];
}

function filterLast24HourTimings() {
  return filterTimingsByDifference(24*60*60*1000);
}

function filterLast12HourTimings() {
  return filterTimingsByDifference(12*60*60*1000);
}

function filterTodaysTimings() {
  let dt = new Date();
  let todayZero = new Date();
  todayZero.setHours(0);
  todayZero.setMinutes(0);
  todayZero.setSeconds(0);
  return filterTimingsByDifference(dt.getTime() - todayZero.getTime());
}

function dateDifferenceInMillis(d1, d2) {
  return d1.getTime() - d2.getTime();
}

function timingDateArrays2Date(dateArray, hourMinuteArray) {
  let d = new Date();
  d.setDate(dateArray[0]);
  d.setMonth(dateArray[1] - 1);
  d.setFullYear(dateArray[2]);
  d.setHours(hourMinuteArray[0]);
  d.setMinutes(hourMinuteArray[1]);
  return d;
}

function date2timingDateArray(dt) {
  return [
    dt.getDate(),
    dt.getMonth() + 1,
    dt.getFullYear()
  ];
}

function timingDateEquals(timingDate, date) {
  if (timingDate[0] != date.getDate()) return false;
  if (timingDate[1] != date.getMonth() + 1) return false;
  if (timingDate[2] != date.getFullYear()) return false;
  return true;
}

function yesterdayAsADate() {
  let date = new Date();
  date.setTime(date.getTime() - 24*60*60*1000);
  return date;
}

function withChildren(elem, ...children) {
  children.forEach(child => elem.appendChild(child));
  return elem;
}

function timingItem2symbol(timingItem) {
  if (timingItem.minutes > 60) {
    return "*";
  } else if (timingItem.minutes < 60) {
    return "-";
  } else {
    return " ";
  }
}
