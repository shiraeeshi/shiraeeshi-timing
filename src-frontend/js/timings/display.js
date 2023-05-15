const { getRandomInt } = require('../utils.js');
const { withChildren, withClass } = require('../html_utils.js');
const { timingDateArrays2Date, date2timingDateArray, date2TimingDateStr, dateArray2str, timeArray2str } = require('../date_utils.js');

export function displayTimings(timingsByDates, process) {
  window.my.currentFilteredTimings = timingsByDates;
  window.my.currentFilteredProcess = process;
  displayTimingsAsText(timingsByDates);
  if (window.my.minimalTextForTimings) {
    clearTimingsTextWrapper();
  }
  displayTimingsAsImage(process);
}

export function displayTimingsAsImage(timingsCategory, categoryToHighlight, timingItemToHighlight) {
  window.my.imageInfo.updateIfNeeded();
  let innerContentWrapper = document.getElementById("canvas-wrapper");
  innerContentWrapper.innerHTML = "";

  let canvas = document.createElement("canvas");
  let canvasWidth = 800;
  window.my.imageInfo.canvasWidth = canvasWidth;
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
  let minutesRange = window.my.imageInfo.minutesRange;
  let maxDiff = window.my.imageInfo.minutesMaxDiff;

  ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';

  function runRecursivelyForTimingsInCategories(category, action) {
    category.timings.forEach(action);
    category.children.forEach(subcat => runRecursivelyForTimingsInCategories(subcat, action));
  }

  function runRecursivelyForTimingsInHighlightedCategory(category, action) {
    category.getTimingsToHighlight().forEach(action);
    category.children.forEach(subcat => runRecursivelyForTimingsInCategories(subcat, action));
  }

  function runRecursivelyForTimingsInCategoriesExcept(category, exceptCategory, action) {
    if (category === exceptCategory) {
      return;
    }
    category.timings.forEach(action);
    category.children.forEach(subcat => runRecursivelyForTimingsInCategoriesExcept(subcat, exceptCategory, action));
  }

  function drawTiming(timingItem, fillStyle) {
    let dtFrom = timingItem.fromdate;
    let diffFrom = (now.getTime() - dtFrom.getTime()) / (60*1000.0);
    let xFrom = (maxDiff - diffFrom) * canvasWidth * 1.0 / minutesRange;
    ctx.fillStyle = fillStyle;
    if (timingItemToHighlight && timingItemEquals(timingItem, timingItemToHighlight)) {
      ctx.fillStyle = 'rgba(200, 0, 0, 0.5)';
    }
    ctx.fillRect(xFrom, 0, timingItem.minutes*canvasWidth*1.0/minutesRange, 50);
  }

  if (categoryToHighlight === undefined) {
    runRecursivelyForTimingsInCategories(timingsCategory, timingItem => {
      drawTiming(timingItem, 'rgba(0, 0, 200, 0.5)')
    });
  } else {
    runRecursivelyForTimingsInCategoriesExcept(timingsCategory, categoryToHighlight, timingItem => {
      drawTiming(timingItem, 'rgba(0, 0, 200, 0.5)')
    });
    runRecursivelyForTimingsInHighlightedCategory(categoryToHighlight, timingItem => {
      drawTiming(timingItem, 'rgba(5, 168, 82, 0.5)')
    });
  }

  canvas.addEventListener('mousemove', function(eve) {
    try {
      if (window.my.isHighlightingTimingItemInImage) {
        displayTimingsAsImage(timingsCategory, categoryToHighlight);
        window.my.isHighlightingTimingItemInImage = false;
        return;
      }
      let timingAtOffset = findTimingItemByOffset(eve.offsetX);
      if (!timingAtOffset) {
        if (window.my.isHighlightingTimingRowInText) {
          window.my.isHighlightingTimingRowInText = false;
          // let previouslyHighlightedTimingRow = document.querySelector("[data-timing-start = '" + window.my.highlightedTimingItemStart + "']");
          // if (previouslyHighlightedTimingRow) {
          //   previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
          // }
          let previouslyHighlightedTimingRow = document.querySelector(".highlighted-from-canvas");
          if (previouslyHighlightedTimingRow) {
            previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
          }
        }
        if (window.my.minimalTextForTimings) {
          clearTimingsTextWrapper();
        }
        return;
      }
      if (window.my.isHighlightingTimingRowInText &&
            window.my.highlightedTimingItemStart == timingAtOffset.from.join(".")) {
        return;
      }
      window.webkit.messageHandlers.timings_summary_msgs.postMessage("canvas mousemove. timingAtOffset.name: " + timingAtOffset.name);

      if (window.my.minimalTextForTimings) {
        highlightTimingInMinimalText(timingAtOffset);
      } else {
        highlightTimingInText(timingAtOffset);
      }

    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage("canvas mousemove. error: " + err.message);
    }
  });

  canvas.addEventListener('mouseleave', function() {
    // console.log("canvas.mouseleave window.my.isHighlightingTimingRowInText: " + window.my.isHighlightingTimingRowInText);
    if (!window.my.isHighlightingTimingRowInText) {
      return;
    }
    window.my.isHighlightingTimingRowInText = false;
    let previouslyHighlightedTimingRow = document.querySelector(".highlighted-from-canvas");
    if (previouslyHighlightedTimingRow) {
      previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
    }
    if (window.my.minimalTextForTimings) {
      clearTimingsTextWrapper();
    }
    // let previouslyHighlightedTimingRow = document.querySelector("[data-timing-start = '" + window.my.highlightedTimingItemStart + "']");
    // if (previouslyHighlightedTimingRow) {
    //   previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
    // }
  });
}

// function isToHighlightTimingItem(timingItem, categoryToHighlightFullName) {
//   //console.log("isToHighlightTimingItem. categoryToHighlightFullName: " + categoryToHighlightFullName)
//   if (categoryToHighlightFullName.length == 0) {
//     //console.log("isToHighlightTimingItem. returning false prematurely. empty category")
//     return false;
//   }
//   if (timingItem.value.length + 1 < categoryToHighlightFullName.length) {
//     //console.log("isToHighlightTimingItem. returning false prematurely")
//     return false;
//   }
//   function getTimingItemValueSegment(index) {
//     if (index == 0) {
//       return timingItem.category;
//     }
//     let segment = timingItem.value[index - 1];
//     let type = typeof(segment);
//     if (type == "string") {
//       return segment;
//     } else if (type == "object") {
//       return Object.keys(segment)[0];
//     } else {
//       throw Error("isToHighlightTimingItem: unexpected type of timingItem.value[index] (expected 'string' or 'object'). index: " + index + ", type: " + type);
//     }
//   }
//   for (let i=0; i<categoryToHighlightFullName.length; i++) {
//     let categoryNameSegment = categoryToHighlightFullName[i];
//     let timingItemValueSegment = getTimingItemValueSegment(i);
//     //console.log("isToHighlightTimingItem. index: " + i + ", categoryNameSegment: " + categoryNameSegment + ", timingItemValueSegment: " + timingItemValueSegment)
//     if (timingItemValueSegment != categoryNameSegment) {
//       return false;
//     }
//   }
//   return true;
// }

function highlightTimingInText(timingAtOffset) {
  try {
    let timingRowToHighlight = document.querySelector("[data-timing-start = '" + timingAtOffset.from.join(".") + "']");
    if (timingRowToHighlight) {
      window.my.isHighlightingTimingRowInText = true;
      window.my.highlightedTimingItemStart = timingAtOffset.from.join(".");
      timingRowToHighlight.classList.add('highlighted-from-canvas');
    }
  } catch (err) {
    window.webkit.messageHandlers.timings_summary_msgs.postMessage("highlightTimingInText. error: " + err.message);
  }
}

function highlightTimingInMinimalText(timingItem) {
  try {

    let visibleLis = document.querySelectorAll('li.timing-row-parent-li:not(.minimized-to-invisibility)');
    for (let li of visibleLis) {
      li.classList.add('minimized-to-invisibility');
    }
    timingItem.htmlElem.classList.remove('minimized-to-invisibility');
    window.my.isHighlightingTimingRowInText = true;

  } catch (err) {
    window.webkit.messageHandlers.timings_summary_msgs.postMessage("highlightTimingInMinimalText. error: " + err.message);
  }
}

function findTimingItemByOffset(offsetX) {
  let now = new Date();
  let canvasWidth = window.my.imageInfo.canvasWidth;
  let maxDiff = window.my.imageInfo.minutesMaxDiff;
  let minutesRange = window.my.imageInfo.minutesRange;
  for (let oneDayTiming of window.my.currentFilteredTimings) {
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

export function clearTimingsTextWrapper() {
  let allTimingTextViews = window.my.timingsCategoryNodeViewRoot.getTimingTextViewsRecursively();
  for (let i=0; i < allTimingTextViews.length; i++) {
    allTimingTextViews[i].classList.add('minimized-to-invisibility');
  }
}

export function makeTimingsTextElementsUnminimized() {
  let allTimingTextViews = window.my.timingsCategoryNodeViewRoot.getTimingTextViewsRecursively();
  for (let i=0; i < allTimingTextViews.length; i++) {
    allTimingTextViews[i].classList.remove('minimized-to-invisibility');
  }
}

function sortDatesAndTimingsInsideThem(timingsByDates) {
  timingsByDates.forEach(timingsByDate => {
    timingsByDate.timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  });
  function threeInts2date(threeInts) {
    return timingDateArrays2Date(threeInts, [0,0]);
  }
  timingsByDates.sort((a, b) => threeInts2date(a.date).getTime() - threeInts2date(b.date).getTime());
}

export function displayTimingsAsText(timingsByDates) {
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("displayTimings start ");
  try {
    sortDatesAndTimingsInsideThem(timingsByDates);

    let innerContentWrapper = document.getElementById("inner-content-wrapper");
    innerContentWrapper.innerHTML = "";

    let timingsInDivs = timingsByDates.map(oneDayTiming => {
      let oneDayTimingWrapper = document.createElement('div');
      let dateParagraph = document.createElement('p');
      let dateTextNode = document.createTextNode(dateArray2str(oneDayTiming.date));
      let ul = document.createElement('ul');
      let lis = oneDayTiming.timings.map(timingItem => {
        let li = document.createElement('li');
        li.setAttribute("class", "timing-row-parent-li");
        let span = document.createElement('span');
        // span.setAttribute("class", "timing-row timing-row-of-" + timingItem.category);
        span.setAttribute("class", "timing-row");
        let timingDateStr = oneDayTiming.date.join(".")
        let timingItemBeginningStr = timingItem.from.join(".")
        span.setAttribute("data-timing-day", timingDateStr)
        span.setAttribute("data-timing-start", timingItemBeginningStr)
        timingItemBeginningStr = timeArray2str(timingItem.from);
        let txt = document.createTextNode([
          timingItemBeginningStr,
          "-",
          timeArray2str(timingItem.to),
          timingItem2symbol(timingItem),
          ['(',timingItem.minutes,' m)'].join(""),
          timingItem.name
        ].join(" "));
        span.onmouseenter = function (eve) {
          window.webkit.messageHandlers.timings_summary_msgs.postMessage(
            "timing onmouseenter. timing: " + timingItem.name);
          window.my.isHighlightingTimingItemInImage = true;
          displayTimingsAsImage(window.my.currentFilteredProcess, window.my.highlightedCategory, timingItem);

          if (window.my.isHighlightingTimingRowInText) {
            let previouslyHighlightedTimingRow = document.querySelector(".highlighted-from-canvas");
            if (previouslyHighlightedTimingRow) {
              previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
            }
            // let lastHighlightedTimingRow = document.querySelector("[data-timing-start = '" + window.my.highlightedTimingItemStart + "']");
            window.my.isHighlightingTimingRowInText = false;
            // lastHighlightedTimingRow.classList.remove('highlighted-from-canvas');
          }
          function unhighlight() {
            console.log("span.onmouseleave unhighlight");
            window.my.isHighlightingTimingItemInImage = false;
            displayTimingsAsImage(window.my.currentFilteredProcess, window.my.highlightedCategory);
            span.removeEventListener('mouseleave', unhighlight);
          }
          span.addEventListener('mouseleave', unhighlight);
        };
        let timingItemView = withChildren(li, withChildren(span, txt));
        timingItem.htmlElem = timingItemView;
        timingItemView.timingItem = timingItem;
        return timingItemView;
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

// function addTimingItemViewToCategory(timingItem, timingItemView, timingsCategoryNodeViewRoot) {
//   let currentCategoryNode = timingsCategoryNodeViewRoot.subcategoryView(timingItem.category);
//   for (let ind=0; ind < timingItem.value.length - 1; ind++) {
//     let timingValueOuterListItem = timingItem.value[ind];
//     let type = typeof(timingValueOuterListItem)
//     if (type !== "string") {
//       let err = Error("wrong format: encountered a non-string category that is not last item in the categories list. all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}).");
//       err.source_timing = timingItem.category;
//       err.fromdateStr = `${date2TimingDateStr(timingItem.fromdate)} ${timeArray2str(timingItem.from)}`;
//       throw err;
//     }
//     let subcategoryName = timingValueOuterListItem;
//     console.log("addTimingItemViewToCategory. currentCategoryNode: " + currentCategoryNode + ", subcategoryName: " + subcategoryName);
//     currentCategoryNode = currentCategoryNode.subcategoryView(subcategoryName);
//   }
//   let lastItem = timingItem.value[timingItem.value.length - 1];
//   if (lastItem.constructor === String) {
//     let subcategoryName = lastItem;
//     currentCategoryNode = currentCategoryNode.subcategoryView(subcategoryName);
//     currentCategoryNode.appendTimingTextView(timingItemView);
//   } else if (lastItem.constructor === Object) {
//     let subcategoryName = Object.keys(lastItem)[0];
//     console.log("addTimingItemViewToCategory. currentCategoryNode: " + currentCategoryNode + ", subcategoryName: " + subcategoryName);
//     currentCategoryNode = currentCategoryNode.subcategoryView(subcategoryName);
//     currentCategoryNode.appendTimingTextView(timingItemView);
//   } else {
//     let err = Error("wrong format: the last item in the categories is neither string nor an object. all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}).");
//     err.source_timing = timingItem.category;
//     err.fromdateStr = `${date2TimingDateStr(timingItem.fromdate)} ${timeArray2str(timingItem.from)}`;
//     throw err;
//   }
// }



function timingDateEquals(timingDate, date) {
  if (timingDate[0] != date.getDate()) return false;
  if (timingDate[1] != date.getMonth() + 1) return false;
  if (timingDate[2] != date.getFullYear()) return false;
  return true;
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
