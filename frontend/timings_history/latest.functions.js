let my = {
  timings: null,
  imageInfo: {
    minutesRange: 0,
    minutesMaxDiff: 0
  },
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
  let timings = timingsOf24HourDay(date);
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
    "showTimingsOf24HourDay timings len: " + timings.length);
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  let maxDiff = (new Date().getTime() - date.getTime()) / (60.0 * 1000);
  setImageMinutesMaxDiff(maxDiff);
  setImageMinutesRange(24*60);
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
  setImageMinutesMaxDiff(diffFrom / (60.0 * 1000));
  setImageMinutesRange(2.5*24*60);
  displayTimings(timings);
  createAndAppendFilterByCategory(timings);
  // <debug>
  let currentAbstractDayBeginning = new Date()
  currentAbstractDayBeginning.setTime(new Date().getTime() - diffFrom)
  window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
    "showTimingsOf60HourDay currentAbstractDay started at time: " +
    currentAbstractDayBeginning.getDate() + "." +
    (currentAbstractDayBeginning.getMonth() + 1) + " " +
    currentAbstractDayBeginning.getHours() + ":" +
    currentAbstractDayBeginning.getMinutes()
    );
  // </debug>
}

function setImageMinutesMaxDiff(maxDiff) {
  my.imageInfo.minutesMaxDiff = maxDiff;
}

function setImageMinutesRange(minutesRange) {
  my.imageInfo.minutesRange = minutesRange;
}

function displayTimings(timings) {
  my.currentFilteredTimings = timings;
  displayTimingsAsText(timings);
  displayTimingsAsImage(timings);
}
function displayTimingsAsText(timings) {
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
        let timingDateStr = oneDayTiming.date.join(".")
        let timingItemBeginningStr = timingItem.from.join(".")
        span.setAttribute("data-timing-day", timingDateStr)
        span.setAttribute("data-timing-start", timingItemBeginningStr)
        let txt = document.createTextNode([
          timingItemBeginningStr,
          "-",
          timingItem.to.join("."),
          timingItem2symbol(timingItem),
          ['(',timingItem.minutes,' m)'].join(""),
          timingItem.name
        ].join(" "));
        span.onmouseover = function (eve) {
          window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
            "timing onmouseover. timing: " + timingItem.name);
          my.isHighlightingTimingItemInImage = true;
          displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory, timingItem);

          if (my.isHighlightingTimingRowInText) {
            let lastHighlightedTimingRow = document.querySelector("[data-timing-start = '" + my.highlightedTimingItemStart + "']");
            lastHighlightedTimingRow.style.color = my.highlightedTimingItemPreviousColor;
            my.isHighlightingTimingRowInText = false;
          }
        };
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
    window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
      "category onmouseover. all categories ");
    delete my.highlightedCategory;
    displayTimingsAsImage(my.currentFilteredTimings);

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
      window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
        "category onmouseover. category: " + cat);
      my.highlightedCategory = cat;
      displayTimingsAsImage(my.currentFilteredTimings, cat);

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

function displayTimingsAsImage(timings, categoryToHighlight, timingItemToHighlight) {
  let innerContentWrapper = document.getElementById("canvas-wrapper");
  innerContentWrapper.innerHTML = "";

  let canvas = document.createElement("canvas");
  let canvasWidth = 800;
  my.imageInfo.canvasWidth = canvasWidth;
  canvas.width = canvasWidth;
  canvas.height = 50;

  innerContentWrapper.appendChild(canvas);

  let ctx = canvas.getContext('2d');

  //ctx.fillStyle = 'rgb(200, 0, 0)';
  //ctx.fillRect(10, 10, 50, 50);

  //ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';
  //ctx.fillRect(60, 30, 50, 50);

  let now = new Date();
  //let maxDiff = 2.5 * 24 * 60 * 60 * 1000;
  //let maxDiff = 2.5 * 24 * 60;
  //let maxDiff = 24 * 60;
  //let firstDay = timings[0];
  //let dtFirstTimingFrom = timingDateArrays2Date(firstDay.date, firstDay.timings[0].from);
  //let maxDiff = (now.getTime() - dtFirstTimingFrom.getTime()) / (60*1000.0);
  let minutesRange = my.imageInfo.minutesRange;
  let maxDiff = my.imageInfo.minutesMaxDiff;

  ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';

  timings.forEach(oneDayTiming => {
    oneDayTiming.timings.forEach(timingItem => {
      let dtFrom = timingDateArrays2Date(oneDayTiming.date, timingItem.from);
      let diffFrom = (now.getTime() - dtFrom.getTime()) / (60*1000.0);
      let xFrom = (maxDiff - diffFrom) * canvasWidth * 1.0 / minutesRange;

      if (categoryToHighlight && timingItem.category == categoryToHighlight) {
        ctx.fillStyle = 'rgba(5, 168, 82, 0.5)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';
      }
      if (timingItemToHighlight && timingItemEquals(timingItem, timingItemToHighlight)) {
        ctx.fillStyle = 'rgba(200, 0, 0, 0.5)';
      }
      ctx.fillRect(xFrom, 0, timingItem.minutes*canvasWidth*1.0/minutesRange, 50);
      //window.webkit.messageHandlers.timings_history_latest_msgs.postMessage(
      //  " displayTimingsAsImage. timing from " + oneDayTiming.date.join(".") + " " + timingItem.from.join(":") +
      //  ", diffFrom: " + diffFrom +
      //  ", xFrom: " + xFrom
      //);
    });
  });

  canvas.addEventListener('mousemove', function(eve) {
    try {
      if (my.isHighlightingTimingItemInImage) {
        displayTimingsAsImage(timings, categoryToHighlight);
        my.isHighlightingTimingItemInImage = false;
        return;
      }
      let timingAtOffset = findTimingItemByOffset(eve.offsetX);
      if (!timingAtOffset) {
        if (my.isHighlightingTimingRowInText) {
          my.isHighlightingTimingRowInText = false;
          let previouslyHighlightedTimingRow = document.querySelector("[data-timing-start = '" + my.highlightedTimingItemStart + "']");
          if (previouslyHighlightedTimingRow) {
            previouslyHighlightedTimingRow.style.color = my.highlightedTimingItemPreviousColor;
          }
        }
        return;
      }
      if (my.isHighlightingTimingRowInText &&
            my.highlightedTimingItemStart == timingAtOffset.from.join(".")) {
        return;
      }
      window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("canvas mousemove. timingAtOffset.name: " + timingAtOffset.name);
      if (my.highlightedCategory) {
        let trs = document.getElementsByClassName("timing-row");
        for (let i=0; i<trs.length; i++) {
          trs[i].style.color = '#BEBEBE';
        }
        let ctrs = document.getElementsByClassName("timing-row-of-" + my.highlightedCategory);
        for (let i=0; i<ctrs.length; i++) {
          ctrs[i].style.color = 'black';
        }
      } else {
        let trs = document.getElementsByClassName("timing-row");
        for (let i=0; i<trs.length; i++) {
          trs[i].style.color = 'black';
        }
      }
      let timingRowToHighlight = document.querySelector("[data-timing-start = '" + timingAtOffset.from.join(".") + "']");
      if (timingRowToHighlight) {
        my.isHighlightingTimingRowInText = true;
        my.highlightedTimingItemPreviousColor = timingRowToHighlight.style.color;
        my.highlightedTimingItemStart = timingAtOffset.from.join(".");
        timingRowToHighlight.style.color = 'red';
      }
    } catch (err) {
      window.webkit.messageHandlers.timings_history_latest_msgs.postMessage("canvas mousemove. error: " + err.message);
    }
  });
}

function findTimingItemByOffset(offsetX) {
  let now = new Date();
  let canvasWidth = my.imageInfo.canvasWidth;
  let maxDiff = my.imageInfo.minutesMaxDiff;
  let minutesRange = my.imageInfo.minutesRange;
  for (let oneDayTiming of my.currentFilteredTimings) {
    for (let timingItem of oneDayTiming.timings) {
      let dtFrom = timingDateArrays2Date(oneDayTiming.date, timingItem.from);
      let diffFrom = (now.getTime() - dtFrom.getTime()) / (60*1000.0);
      let xFrom = (maxDiff - diffFrom) * canvasWidth * 1.0 / minutesRange;
      let xTo = xFrom + timingItem.minutes*canvasWidth*1.0/minutesRange;

      if (xFrom < offsetX && offsetX < xTo) {
        return timingItem;
      }
    }
  }
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
  let start = new Date(now.getFullYear(), 0);
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
  d.setDate(1);
  d.setMonth(dateArray[1] - 1);
  d.setDate(dateArray[0]);
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

function timingItemEquals(a, b) {
    return a.name == b.name &&
    a.from.join(".") == b.from.join(".") &&
    a.to.join(".") == b.to.join(".");
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
