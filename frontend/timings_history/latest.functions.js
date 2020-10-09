let my = {
  timings: null,
  dayOffset: 0
};

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
      btnNextDay.disabled = false;
      showTimings();
    } else if (msg.keyval == "Right") {
      my.dayOffset--;
      if (my.dayOffset <= 0) {
        btnNextDay.disabled = true;
      }
      showTimings();
    }
    return;
  }
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("handleServerMessage start ");
  addListenersToButtons();
  my.timings = msg;
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
    if (radioBtn24Hours.checked) {
      showTimingsOf24HourDay();
    } else {
      showTimingsOf60HourDay();
    }
  });
  radioBtn24Hours.addEventListener("change", function() {
    my.dayOffset = 0;
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
  let timings = timingsOf24HourDay(date);
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
    "showTimingsOf24HourDay timings len: " + timings.length);
  displayTimings(timings);
  createAndAppendFilterByCategory(timings);
}

function showTimingsOf60HourDay() {

  let millisIn24hours = 24*60*60*1000;
  let currentAbstractDayDiff = millisOfCurrentAbstractDayOfYear(2.5);
  let diffFrom = currentAbstractDayDiff + my.dayOffset * 2.5 * millisIn24hours;
  let diffTo = 0;
  if (my.dayOffset > 0) {
    diffTo = currentAbstractDayDiff + (my.dayOffset - 1) * 2.5 * millisIn24hours;
  }

  let timings = filterTimingsByDifference(diffFrom, diffTo);
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
    "showTimingsOf60HourDay timings len: " + timings.length);
  displayTimings(timings);
  createAndAppendFilterByCategory(timings);
}

function displayTimings(timings) {
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("displayTimings start ");
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
    window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("displayTimings error msg: " + err.message);
  }
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("displayTimings end ");
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

function timingsOf24HourDay(date) {
  let result = {
    date: date2timingDateArray(date),
    timings: []
  };
  Object.keys(my.timings).forEach(key => {
    let thisTimingsByDays = my.timings[key];
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
  return [result];
}

function threeIntsEqDate(threeInts, date) {
  return threeInts[0] == date.getDate() &&
    threeInts[1] == (date.getMonth() + 1) &&
    threeInts[2] == date.getFullYear();
}

function filterTimingsByDifference(differenceInMillisFrom, differenceInMillisTo) {
  let now = new Date();

  let timingsByDates = {};

  function dateIsWithinPastMillis(dt) {
    let d = new Date();
    let timeNow = d.getTime();

    d.setDate(dt[0]);
    d.setMonth(dt[1] - 1);
    d.setFullYear(dt[2]);
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);

    let timeAtBeginningOfDt = d.getTime();

    d.setHours(23);
    d.setMinutes(59);
    d.setSeconds(59);

    let timeAtEndOfDt = d.getTime();

    if (timeAtEndOfDt > timeNow) {
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

  Object.keys(my.timings).forEach(key => {
    let thisTimingsByDays = my.timings[key];
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      if (dateIsWithinPastMillis(dt)) {
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
