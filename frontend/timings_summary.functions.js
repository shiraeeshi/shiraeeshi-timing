let my = {
  timings: null,
  imageInfo: {
    minutesRange: 0,
    minutesMaxDiff: 0
  },
  wallpapers: {
    lst: null,
    idx: 0
  }
};

function handleServerMessage(msg) {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage start ");
  if (msg.type == "wallpapers") {
    my.wallpapers.lst = msg.wallpapers;
    let randomIndex = getRandomInt(my.wallpapers.lst.length);
    document.body.style.backgroundImage = "url(wallpapers/" + my.wallpapers.lst[randomIndex] + ")";
    return;
  }
  if (msg.type == "key_pressed") {
    if (msg.keyval == "w") {
      my.wallpapers.idx++;
      if (my.wallpapers.idx >= my.wallpapers.lst.length) {
        my.wallpapers.idx = 0;
      }
      window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage current wallpaper: " +
        my.wallpapers.lst[my.wallpapers.idx]);
      document.body.style.backgroundImage = "url(wallpapers/" + my.wallpapers.lst[my.wallpapers.idx] + ")";
    }
    return;
  }
  addListenersToButtons();
  my.timings = msg;
  let mainContentWrapper = document.getElementById("main-content-wrapper");
  let keys = Object.keys(msg);
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage end ");
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
      //window.webkit.messageHandlers.timings_summary_msgs.postMessage(
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
            Object.assign(previouslyHighlightedTimingRow.style, my.highlightedTimingItemPreviousStyle);
          }
        }
        return;
      }
      if (my.isHighlightingTimingRowInText &&
            my.highlightedTimingItemStart == timingAtOffset.from.join(".")) {
        return;
      }
      window.webkit.messageHandlers.timings_summary_msgs.postMessage("canvas mousemove. timingAtOffset.name: " + timingAtOffset.name);
      if (my.highlightedCategory) {
        let trs = document.getElementsByClassName("timing-row");
        for (let i=0; i<trs.length; i++) {
          trs[i].style.color = 'white';
          trs[i].style.opacity = '.3';
        }
        let ctrs = document.getElementsByClassName("timing-row-of-" + my.highlightedCategory);
        for (let i=0; i<ctrs.length; i++) {
          ctrs[i].style.color = 'white';
          ctrs[i].style.opacity = '1';
        }
      } else {
        let trs = document.getElementsByClassName("timing-row");
        for (let i=0; i<trs.length; i++) {
          trs[i].style.color = 'white';
          trs[i].style.opacity = '1';
        }
      }
      let timingRowToHighlight = document.querySelector("[data-timing-start = '" + timingAtOffset.from.join(".") + "']");
      if (timingRowToHighlight) {
        my.isHighlightingTimingRowInText = true;
        my.highlightedTimingItemPreviousStyle = Object.assign({}, timingRowToHighlight.style);
        my.highlightedTimingItemStart = timingAtOffset.from.join(".");
        Object.assign(timingRowToHighlight.style, {color: 'red', opacity: '1'});
      }
    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage("canvas mousemove. error: " + err.message);
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

function addListenersToButtons() {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("addListenersToButtons start ");
  let btnLast24Hours = document.getElementById("last-24-hours");
  let btnLast12Hours = document.getElementById("last-12-hours");
  let btnFromZeroHours = document.getElementById("from-zero-hours");
  let btnFromZeroTwoAndAHalfHours = document.getElementById("from-zero-two-and-a-half-hours");
  btnLast24Hours.addEventListener("click", function() {
    try {
      let timings = filterLast24HourTimings();
      setImageMinutesRange(24*60);
      setImageMinutesMaxDiff(24*60);
      displayTimings(timings);
      createAndAppendFilterByCategory(timings);
    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "btnLast24Hours click handler error msg: " + err.message);
    }
  });
  btnLast12Hours.addEventListener("click", function() {
    let timings = filterLast12HourTimings();
    setImageMinutesRange(12*60);
    setImageMinutesMaxDiff(12*60);
    displayTimings(timings);
    createAndAppendFilterByCategory(timings);
  });
  btnFromZeroHours.addEventListener("click", function() {
    try {
      let timings = filterTodaysTimings();
      setImageMinutesRange(24 * 60);
      setImageMinutesMaxDiff(calculateDifferenceBetweenNowAndStartOfDay() / (60.0 * 1000));
      displayTimings(timings);
      createAndAppendFilterByCategory(timings);
    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "btnFromZeroHours click handler error msg: " + err.message);
    }
  });
  btnFromZeroTwoAndAHalfHours.addEventListener("click", function() {
    let timings = filterCurrentTwoAndAHalfDaysTimings();
    setImageMinutesRange(2.5 * 24 * 60);
    setImageMinutesMaxDiff(millisOfCurrentAbstractDayOfYear(2.5) / (60.0 * 1000));
    displayTimings(timings);
    createAndAppendFilterByCategory(timings);
  });
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("addListenersToButtons end ");
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
          window.webkit.messageHandlers.timings_summary_msgs.postMessage(
            "timing onmouseover. timing: " + timingItem.name);
          my.isHighlightingTimingItemInImage = true;
          displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory, timingItem);

          if (my.isHighlightingTimingRowInText) {
            let lastHighlightedTimingRow = document.querySelector("[data-timing-start = '" + my.highlightedTimingItemStart + "']");
            Object.assign(lastHighlightedTimingRow.style, my.highlightedTimingItemPreviousStyle);
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
    window.webkit.messageHandlers.timings_summary_msgs.postMessage(
      "category onmouseover. all categories ");
    delete my.highlightedCategory;
    displayTimingsAsImage(my.currentFilteredTimings);

    let trs = document.getElementsByClassName("timing-row");
    for (let i=0; i<trs.length; i++) {
      trs[i].style.color = 'white';
      trs[i].style.opacity = '1';
    }
  }
  btnsContainer.appendChild(withChildren(allBtn, txt));

  categories2timings.forEach((count, cat) => {
    let buttonText = cat + " (" + count + ")";
    let btn = document.createElement('button');
    let txt = document.createTextNode(buttonText);
    btn.onmouseover = function (eve) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "category onmouseover. category: " + cat);
      my.highlightedCategory = cat;
      displayTimingsAsImage(my.currentFilteredTimings, cat);

      let trs = document.getElementsByClassName("timing-row");
      for (let i=0; i<trs.length; i++) {
        trs[i].style.backgroundColor = "";
        //trs[i].style.color = '#BEBEBE';
        trs[i].style.color = 'white';
        trs[i].style.opacity = ".3";
      }
      let ctrs = document.getElementsByClassName("timing-row-of-" + cat);
      for (let i=0; i<ctrs.length; i++) {
        //ctrs[i].style.backgroundColor = 'white';
        ctrs[i].style.color = 'white';
        ctrs[i].style.opacity = "1";
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

function calculateDifferenceBetweenNowAndStartOfDay() {
  let dt = new Date();
  let todayZero = new Date();
  todayZero.setHours(0);
  todayZero.setMinutes(0);
  todayZero.setSeconds(0);
  return dt.getTime() - todayZero.getTime();
}

function filterTodaysTimings() {
  let differenceBetweenNowAndStartOfDay = calculateDifferenceBetweenNowAndStartOfDay();
  return filterTimingsByDifference(differenceBetweenNowAndStartOfDay);
}

function filterCurrentTwoAndAHalfDaysTimings() {

  let diff = millisOfCurrentAbstractDayOfYear(2.5);
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("filterCurrentTwoAndAHalfDaysTimings diff: " + diff);
  return filterTimingsByDifference(diff);
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

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
