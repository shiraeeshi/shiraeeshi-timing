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
  let btnFromZeroTwoAndAHalfHours = document.getElementById("from-zero-two-and-a-half-hours");
  btnLast24Hours.addEventListener("click", function() {
    try {
      let timings = filterLast24HourTimings();
      displayTimings(timings);
      createAndAppendFilterByCategory(timings);
    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "btnLast24Hours click handler error msg: " + err.message);
    }
  });
  btnLast12Hours.addEventListener("click", function() {
    let timings = filterLast12HourTimings();
    displayTimings(timings);
    createAndAppendFilterByCategory(timings);
  });
  btnFromZeroHours.addEventListener("click", function() {
    let timings = filterTodaysTimings();
    displayTimings(timings);
    createAndAppendFilterByCategory(timings);
  });
  btnFromZeroTwoAndAHalfHours.addEventListener("click", function() {
    let timings = filterCurrentTwoAndAHalfDaysTimings();
    displayTimings(timings);
    createAndAppendFilterByCategory(timings);
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
        span.setAttribute("class", "timing-row timing-row-of-" + timingItem.category);
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

function createAndAppendFilterByCategory(timingsByDates) {
  let categories2timings = new Map();
  timingsByDates.forEach(dt => {
    dt.timings.forEach(t => {
      if (categories2timings.has(t.category)) {
        let c = categories2timings.get(t.category);
        categories2timings.set(t.category, c + 1);
      } else {
        categories2timings.set(t.category, 1);
      }
    });
  });
  let btnsContainer = document.getElementById('timing-category-btns-container');
  btnsContainer.innerHTML = "";
  let overallCount = 0;
  categories2timings.forEach((count, cat) => {
    overallCount += count;
  });

  let allBtn = document.createElement('button');
  let txt = document.createTextNode("all (" + overallCount + ")");
  allBtn.onmouseover = function (eve) {
    let trs = document.getElementsByClassName("timing-row");
    for (let i=0; i<trs.length; i++) {
      trs[i].style.color = 'black';
    }
  }
  btnsContainer.appendChild(withChildren(allBtn, txt));

  categories2timings.forEach((count, cat) => {
    let buttonText = cat + " (" + count + ")";
    let btn = document.createElement('button');
    let txt = document.createTextNode(buttonText);
    btn.onmouseover = function (eve) {
      let trs = document.getElementsByClassName("timing-row");
      for (let i=0; i<trs.length; i++) {
        trs[i].style.color = '#BEBEBE';
      }
      let ctrs = document.getElementsByClassName("timing-row-of-" + cat);
      for (let i=0; i<ctrs.length; i++) {
        ctrs[i].style.color = 'black';
      }
    };
    btnsContainer.appendChild(withChildren(btn, txt));
  });
}

function filterTimingsByCategory(category, timingsByDates) {
  return timingsByDates.map(dt => {
    return {
      date: dt.date,
      timings: dt.timings.filter(t => t.category === category)
    };
  });
}

function filterTimingsByDifference(differenceInMillis) {
  let today = new Date();
  let yesterday = yesterdayAsADate();

  let todaysTimings = [];
  let yesterdaysTimings = [];

  let timingsByDates = {};
  timingsByDates[date2timingDateArray(yesterday).join(".")] = {
    date: date2timingDateArray(yesterday),
    timings: []
  };
  timingsByDates[date2timingDateArray(today).join(".")] = {
    date: date2timingDateArray(today),
    timings: []
  };

  function dateIsWithinPastMillis(dt) {
    let d = new Date();
    let timeNow = d.getTime();

    d.setDate(dt[0]);
    d.setMonth(dt[1] - 1);
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

  Object.keys(my.timings).forEach(key => {
    let thisTimingsByDays = my.timings[key];
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

function filterCurrentTwoAndAHalfDaysTimings() {

  let diff = millisOfCurrentAbstractDayOfYear(2.5);
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("filterCurrentTwoAndAHalfDaysTimings diff: " + diff);
  return filterTimingsByDifference(diff);
}

function millisOfCurrentAbstractDayOfYear(earthDaysPerAbstractDay) {
  let now = new Date();
  let start = new Date(now.getFullYear(), 0, 0);
  let diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
  let oneDay = 1000 * 60 * 60 * 24 * earthDaysPerAbstractDay;
  let remainder = diff % oneDay;
  return remainder;
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
