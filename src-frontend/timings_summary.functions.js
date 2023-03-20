
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
  initPeriodButtonsRow();
  my.imageInfo = new ImageInfo();
  my.timings = msg;
  let mainContentWrapper = document.getElementById("main-content-wrapper");
  let keys = Object.keys(msg);
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage end ");
}

function displayTimingsAsImage(timings, categoryToHighlight, timingItemToHighlight) {
  my.imageInfo.updateIfNeeded();
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

      if (categoryToHighlight && isToHighlightTimingItem(timingItem, categoryToHighlight)) {
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
          // let previouslyHighlightedTimingRow = document.querySelector("[data-timing-start = '" + my.highlightedTimingItemStart + "']");
          // if (previouslyHighlightedTimingRow) {
          //   previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
          // }
          let previouslyHighlightedTimingRow = document.querySelector(".highlighted-from-canvas");
          if (previouslyHighlightedTimingRow) {
            previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
          }
        }
        if (my.minimalTextForTimings) {
          clearTimingsTextWrapper();
        }
        return;
      }
      if (my.isHighlightingTimingRowInText &&
            my.highlightedTimingItemStart == timingAtOffset.from.join(".")) {
        return;
      }
      window.webkit.messageHandlers.timings_summary_msgs.postMessage("canvas mousemove. timingAtOffset.name: " + timingAtOffset.name);

      if (my.minimalTextForTimings) {
        highlightTimingInMinimalText(timingAtOffset);
      } else {
        highlightTimingInText(timingAtOffset);
      }

    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage("canvas mousemove. error: " + err.message);
    }
  });

  canvas.addEventListener('mouseleave', function() {
    // console.log("canvas.mouseleave my.isHighlightingTimingRowInText: " + my.isHighlightingTimingRowInText);
    if (!my.isHighlightingTimingRowInText) {
      return;
    }
    my.isHighlightingTimingRowInText = false;
    let previouslyHighlightedTimingRow = document.querySelector(".highlighted-from-canvas");
    if (previouslyHighlightedTimingRow) {
      previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
    }
    if (my.minimalTextForTimings) {
      clearTimingsTextWrapper();
    }
    // let previouslyHighlightedTimingRow = document.querySelector("[data-timing-start = '" + my.highlightedTimingItemStart + "']");
    // if (previouslyHighlightedTimingRow) {
    //   previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
    // }
  });
}

function isToHighlightTimingItem(timingItem, categoryToHighlightFullName) {
  //console.log("isToHighlightTimingItem. categoryToHighlightFullName: " + categoryToHighlightFullName)
  if (categoryToHighlightFullName.length == 0) {
    //console.log("isToHighlightTimingItem. returning false prematurely. empty category")
    return false;
  }
  if (timingItem.value.length + 1 < categoryToHighlightFullName.length) {
    //console.log("isToHighlightTimingItem. returning false prematurely")
    return false;
  }
  function getTimingItemValueSegment(index) {
    if (index == 0) {
      return timingItem.category;
    }
    let segment = timingItem.value[index - 1];
    let type = typeof(segment);
    if (type == "string") {
      return segment;
    } else if (type == "object") {
      return Object.keys(segment)[0];
    } else {
      throw Error("isToHighlightTimingItem: unexpected type of timingItem.value[index] (expected 'string' or 'object'). index: " + index + ", type: " + type);
    }
  }
  for (let i=0; i<categoryToHighlightFullName.length; i++) {
    let categoryNameSegment = categoryToHighlightFullName[i];
    let timingItemValueSegment = getTimingItemValueSegment(i);
    //console.log("isToHighlightTimingItem. index: " + i + ", categoryNameSegment: " + categoryNameSegment + ", timingItemValueSegment: " + timingItemValueSegment)
    if (timingItemValueSegment != categoryNameSegment) {
      return false;
    }
  }
  return true;
}

function highlightTimingInText(timingAtOffset) {
  try {
    let timingRowToHighlight = document.querySelector("[data-timing-start = '" + timingAtOffset.from.join(".") + "']");
    if (timingRowToHighlight) {
      my.isHighlightingTimingRowInText = true;
      my.highlightedTimingItemStart = timingAtOffset.from.join(".");
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
    my.isHighlightingTimingRowInText = true;

  } catch (err) {
    window.webkit.messageHandlers.timings_summary_msgs.postMessage("highlightTimingInMinimalText. error: " + err.message);
  }
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

function initPeriodButtonsRow() {

  let periodButtonsRow = new PeriodButtonsRow();
  my.periodButtonsRowVisibilityToggle = new PeriodButtonsRowVisibilityToggle(periodButtonsRow);

  addListenersToButtons();
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
      my.currentlyDisplayedTimings = timings;
      my.imageInfo.updateAsPeriodType(PeriodType.LAST_24_HOURS);
      my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
      displayTimings(timings, my.timingsCategoryNodeViewRoot);
      my.periodButtonsRowVisibilityToggle.toInitialState();
    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "btnLast24Hours click handler error msg: " + err.message);
    }
  });
  btnLast12Hours.addEventListener("click", function() {
    let timings = filterLast12HourTimings();
    my.currentlyDisplayedTimings = timings;
    my.imageInfo.updateAsPeriodType(PeriodType.LAST_12_HOURS);
    my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
    displayTimings(timings, my.timingsCategoryNodeViewRoot);
    my.periodButtonsRowVisibilityToggle.toInitialState();
  });
  btnFromZeroHours.addEventListener("click", function() {
    try {
      let timings = filterTodaysTimings();
      my.currentlyDisplayedTimings = timings;
      my.imageInfo.updateAsPeriodType(PeriodType.FROM_ZERO_HOURS_OF_24_HOUR_PERIOD);
      my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
      displayTimings(timings, my.timingsCategoryNodeViewRoot);
      my.periodButtonsRowVisibilityToggle.toInitialState();
    } catch (err) {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "btnFromZeroHours click handler error msg: " + err.message);
    }
  });
  btnFromZeroTwoAndAHalfHours.addEventListener("click", function() {
    let timings = filterCurrentTwoAndAHalfDaysTimings();
    my.currentlyDisplayedTimings = timings;
    my.imageInfo.updateAsPeriodType(PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD);
    my.timingsCategoryNodeViewRoot = createAndAppendFilterByCategory(timings);
    displayTimings(timings, my.timingsCategoryNodeViewRoot);
    my.periodButtonsRowVisibilityToggle.toInitialState();
  });
  window.webkit.messageHandlers.timings_summary_msgs.postMessage("addListenersToButtons end ");
}

function PeriodType() {};

PeriodType.LAST_24_HOURS = new PeriodType();
PeriodType.LAST_12_HOURS = new PeriodType();
PeriodType.FROM_ZERO_HOURS_OF_24_HOUR_PERIOD = new PeriodType();
PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD = new PeriodType();

function ImageInfo() {
  this.minutesMaxDiff = 0;
  this.minutesRange = 0;
  this.periodType = PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD;
  this.minutesMaxDiffLastModified = 0;
}

ImageInfo.prototype.updateAsPeriodType = function(periodType) {
  let that = this;
  that.periodType = periodType;
  if (periodType == PeriodType.LAST_24_HOURS) {
    that.minutesRange = 24*60;
    that.minutesMaxDiff = 24*60;
  } else if (periodType == PeriodType.LAST_12_HOURS) {
    that.minutesRange = 12*60;
    that.minutesMaxDiff = 12*60;
  } else if (periodType == PeriodType.FROM_ZERO_HOURS_OF_24_HOUR_PERIOD) {
    that.minutesRange = 24*60;
    that.minutesMaxDiff = calculateDifferenceBetweenNowAndStartOfDay() / (60.0 * 1000);
    that.minutesMaxDiffLastModified = new Date();
  } else if (periodType == PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD) {
    that.minutesRange = 2.5 * 24 * 60;
    that.minutesMaxDiff = millisOfCurrentAbstractDayOfYear(2.5) / (60.0 * 1000);
    that.minutesMaxDiffLastModified = new Date();
  }
};
ImageInfo.prototype.updateIfNeeded = function() {
  let that = this;
  if (that.periodType == PeriodType.LAST_24_HOURS ||
      that.periodType == PeriodType.LAST_12_HOURS) {
    return;
  }
  if (that.periodType == PeriodType.FROM_ZERO_HOURS_OF_24_HOUR_PERIOD ||
      that.periodType == PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD) {
    let now = new Date();
    let millisSinceLastModified = now.getTime() - that.minutesMaxDiffLastModified.getTime();
    that.minutesMaxDiff += (millisSinceLastModified / (60.0 * 1000));
    that.minutesMaxDiffLastModified = now;
  }
};


function displayTimings(timings, timingsCategoryNodeViewRoot) {
  my.currentFilteredTimings = timings;
  displayTimingsAsText(timings, timingsCategoryNodeViewRoot);
  if (my.minimalTextForTimings) {
    clearTimingsTextWrapper();
  }
  displayTimingsAsImage(timings);
}

function clearTimingsTextWrapper() {
  let allTimingTextViews = my.timingsCategoryNodeViewRoot.getTimingTextViewsRecursively();
  for (let i=0; i < allTimingTextViews.length; i++) {
    allTimingTextViews[i].classList.add('minimized-to-invisibility');
  }
}

function makeTimingsTextElementsUnminimized() {
  let allTimingTextViews = my.timingsCategoryNodeViewRoot.getTimingTextViewsRecursively();
  for (let i=0; i < allTimingTextViews.length; i++) {
    allTimingTextViews[i].classList.remove('minimized-to-invisibility');
  }
}

function displayTimingsAsText(timings, timingsCategoryNodeViewRoot) {
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
        li.setAttribute("class", "timing-row-parent-li");
        let span = document.createElement('span');
        // span.setAttribute("class", "timing-row timing-row-of-" + timingItem.category);
        span.setAttribute("class", "timing-row");
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
        span.onmouseenter = function (eve) {
          window.webkit.messageHandlers.timings_summary_msgs.postMessage(
            "timing onmouseenter. timing: " + timingItem.name);
          my.isHighlightingTimingItemInImage = true;
          displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory, timingItem);

          if (my.isHighlightingTimingRowInText) {
            let previouslyHighlightedTimingRow = document.querySelector(".highlighted-from-canvas");
            if (previouslyHighlightedTimingRow) {
              previouslyHighlightedTimingRow.classList.remove('highlighted-from-canvas');
            }
            // let lastHighlightedTimingRow = document.querySelector("[data-timing-start = '" + my.highlightedTimingItemStart + "']");
            my.isHighlightingTimingRowInText = false;
            // lastHighlightedTimingRow.classList.remove('highlighted-from-canvas');
          }
          function unhighlight() {
            console.log("span.onmouseleave unhighlight");
            my.isHighlightingTimingItemInImage = false;
            displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
            span.removeEventListener('mouseleave', unhighlight);
          }
          span.addEventListener('mouseleave', unhighlight);
        };
        let timingItemView = withChildren(li, withChildren(span, txt));
        timingItem.htmlElem = timingItemView;
        timingItemView.timingItem = timingItem;
        addTimingItemViewToCategory(timingItem, timingItemView, timingsCategoryNodeViewRoot);
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

function addTimingItemViewToCategory(timingItem, timingItemView, timingsCategoryNodeViewRoot) {
  let currentCategoryNode = timingsCategoryNodeViewRoot.subcategoryView(timingItem.category);
  for (let ind=0; ind < timingItem.value.length; ind++) {
    let timingValueOuterListItem = timingItem.value[ind];
    let type = typeof(timingValueOuterListItem)
    if (type == "string") {
      let subcategoryName = timingValueOuterListItem;
      console.log("addTimingItemViewToCategory. currentCategoryNode: " + currentCategoryNode + ", subcategoryName: " + subcategoryName);
      currentCategoryNode = currentCategoryNode.subcategoryView(subcategoryName);
    } else if (type == "object") {
      let timingValueObject = timingValueOuterListItem;
      let subcategoryName = Object.keys(timingValueObject)[0];
      console.log("addTimingItemViewToCategory. currentCategoryNode: " + currentCategoryNode + ", subcategoryName: " + subcategoryName);
      currentCategoryNode = currentCategoryNode.subcategoryView(subcategoryName);
      currentCategoryNode.appendTimingTextView(timingItemView);
      break; // should be last item
    }
  }
}

let PeriodButtonsRow = (function() {
  function PeriodButtonsRowInitFunction() {
    this.elem = document.getElementById("period-btns-container");
    this.isVisible = true;
  }
  PeriodButtonsRowInitFunction.prototype.show = function() {
    this.elem.style.display = 'block';
    this.isVisible = true;
  };
  PeriodButtonsRowInitFunction.prototype.hide = function() {
    this.elem.style.display = 'none';
    this.isVisible = false;
  };
  return PeriodButtonsRowInitFunction;
})();

let PeriodButtonsRowVisibilityToggle = (function() {
  function InitFunction(periodButtonsRow) {
    let that = this;
    that.row = periodButtonsRow;
    that.btnHide = document.getElementById("btn-hide-period-btns");
    that.btnShow = document.getElementById("btn-show-period-btns");
    that.btnHide.onclick = function() {
      that.toggle();
    };
    that.btnShow.onclick = function() {
      that.toggle();
    };
  }
  InitFunction.prototype.toggle = function() {
    if (this.row.isVisible) {
      this.row.hide();
      this.btnHide.style.display = 'none';
      this.btnShow.style.display = 'inline';
    } else {
      this.row.show();
      this.btnHide.style.display = 'inline';
      this.btnShow.style.display = 'none';
    }
  };
  InitFunction.prototype.toInitialState = function() {
    this.btnHide.style.display = 'inline';
    this.btnShow.style.display = 'none';
  };
  return InitFunction;
})();

let TimingsCategoryTreeNode = (function() {
  function InitFunction(name, parentCategory) {
    this.name = name;
    this.parentCategory = parentCategory;
    this.subcategories = [];
    this.subcategoriesByName = {};
    this.timings = [];
    this.timingsCountRecursive = 0;
  }
  InitFunction.prototype.subcategory = function(name) {
    let childExists = Object.hasOwnProperty.call(this.subcategoriesByName, name);
    if (childExists) {
      return this.subcategoriesByName[name];
    } else {
      let newSubcategory = new TimingsCategoryTreeNode(name, this);
      this.subcategoriesByName[name] = newSubcategory;
      this.subcategories[this.subcategories.length] = newSubcategory;
      return newSubcategory;
    }
  }
  InitFunction.prototype.appendTiming = function(timing) {
    this.timings[this.timings.length] = timing;
    incrementTimingsCountRecursive(this);
  }
  InitFunction.prototype.fullName = function() {
    if (this.parentCategory === undefined) {
      return [];
    } else {
      let parentFullName = this.parentCategory.fullName();
      return parentFullName.concat(this.name)
    }
  }
  let incrementTimingsCountRecursive = function(categoryNode) {
    categoryNode.timingsCountRecursive++;
    if (categoryNode.parentCategory !== undefined) {
      incrementTimingsCountRecursive(categoryNode.parentCategory);
    }
  }
  return InitFunction;
})();

TimingsCategoryTreeNode.createRootCategory = function() {
  return new TimingsCategoryTreeNode("all");
}

function createAndAppendFilterByCategory(timingsByDates) {
  let categoriesTreeRoot = TimingsCategoryTreeNode.createRootCategory();
  timingsByDates.forEach(dt => {
    dt.timings.forEach(t => {
      console.log("about to call subcategory function. t.category: " + t.category)
      let currentCategoryNode = categoriesTreeRoot.subcategory(t.category);
      for (let ind=0; ind<t.value.length; ind++) {
        let timingValueOuterListItem = t.value[ind];
        let type = typeof(timingValueOuterListItem)
        if (type == "string") {
          let subcategoryName = timingValueOuterListItem;
          console.log("about to call currentCategoryNode.subcategory. 1. subcategoryName: " + subcategoryName)
          currentCategoryNode = currentCategoryNode.subcategory(subcategoryName);
        } else if (type == "object") {
          let timingValueObject = timingValueOuterListItem;
          let subcategoryName = Object.keys(timingValueObject)[0];
          console.log("about to call currentCategoryNode.subcategory. 2. subcategoryName: " + subcategoryName)
          currentCategoryNode = currentCategoryNode.subcategory(subcategoryName);
          currentCategoryNode.appendTiming(t);
          break; // should be last item
        } else {
          throw Error("createAndAppendFilterByCategory: unexpected type of timingItem.value[index] (expected 'string' or 'object'). index: " + ind + ", type: " + type);
        }
      }
    });
  });
  let btnsContainer = document.getElementById('timing-category-btns-container');
  btnsContainer.innerHTML = "";

  let timingsCategoryNodeViewRoot = new TimingsCategoryNodeView(categoriesTreeRoot);
  timingsCategoryNodeViewRoot.buildAsHtmlLiElement();
  btnsContainer.appendChild(
    withChildren(
      withClass(document.createElement("ul"), "timings-categories-tree"),
      timingsCategoryNodeViewRoot.html
    )
  );
  return timingsCategoryNodeViewRoot;
}

function TimingsCategoryNodeView(timingsCategoryNode) {
  let that = this;
  that.timingsCategoryNode = timingsCategoryNode;
  that.name = timingsCategoryNode.name;
  that.isCollapsed = false;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.children = timingsCategoryNode.subcategories.map(childNode => new TimingsCategoryNodeView(childNode));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.timingTextViews = [];
}

let TimingsCategoryNodeViewState = (function() {
  let InitFunction = function() {}
  InitFunction.UNHIGHLIGHTED = new InitFunction();
  InitFunction.HIGHLIGHTED = new InitFunction();
  InitFunction.HIGHLIGHTED_AS_CHILD = new InitFunction();
  InitFunction.EXTRA_HIGHLIGHTED = new InitFunction();
  return InitFunction;
})();

TimingsCategoryNodeView.prototype.subcategoryView = function(subCategoryName) {
  let that = this;
  let hasSubcategory = Object.hasOwnProperty.call(that.childrenByName, subCategoryName);
  if (!hasSubcategory) {
    throw Error("TimingsCategoryNodeView.subcategoryView: no child found with name: " + subCategoryName);
  }
  return that.childrenByName[subCategoryName];
}

TimingsCategoryNodeView.prototype.appendTimingTextView = function(timingTextView) {
  this.timingTextViews[this.timingTextViews.length] = timingTextView;
}

TimingsCategoryNodeView.prototype.getTimingTextViewsRecursively = function(timingTextView) {
  let that = this;
  let result = that.timingTextViews;
  for (let subcategory of that.children) {
    result = result.concat(subcategory.getTimingTextViewsRecursively());
  }
  return result;
}

TimingsCategoryNodeView.prototype.isHighlighted = function() {
  return !this.isUnhighlighted;
};

TimingsCategoryNodeView.prototype.highlightTree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED;
  that.html.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

TimingsCategoryNodeView.prototype.highlightSubtree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.html.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

TimingsCategoryNodeView.prototype.unhighlightTree = function() {
  let that = this;
  that.isUnhighlighted = true;
  that.viewState = TimingsCategoryNodeViewState.UNHIGHLIGHTED;
  that.html.classList.add('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.unhighlightTree();
  }
};

TimingsCategoryNodeView.prototype.name2html = function() {
  let that = this;
  let a = document.createElement('a');
  a.onclick = function() {
    let viewState = that.viewState;
    if (viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
      my.timingsCategoryNodeViewRoot.unhighlightTree();
      that.highlightTree();
      let categoryFullName = that.timingsCategoryNode.fullName();
      my.highlightedCategory = categoryFullName;
      displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

      console.log("a.onclick. categoryFullName: " + categoryFullName);

      let trs = document.getElementsByClassName("timing-row-parent-li");
      for (let i=0; i < trs.length; i++) {
        trs[i].classList.add('greyed-out');
        trs[i].classList.remove('extra-unhighlighted');
      }
      let timingTextViews = that.getTimingTextViewsRecursively();
      for (let i=0; i < timingTextViews.length; i++) {
        timingTextViews[i].classList.remove('greyed-out');
        timingTextViews[i].classList.remove('extra-unhighlighted');
      }
      function unhighlight() {
        // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was UNHIGHLIGHTED)");
        if (my.highlightedCategory !== undefined
          && my.highlightedCategory.length > 0
          && !that.isHighlighted()) {
          a.removeEventListener('mouseleave', unhighlight);
          return;
        }
        displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
        a.removeEventListener('mouseleave', unhighlight);
      }
      a.addEventListener('mouseleave', unhighlight)

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED) {

      that.viewState = TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED;
      let trs = document.getElementsByClassName("timing-row-parent-li");
      for (let i=0; i < trs.length; i++) {
        trs[i].classList.add('extra-unhighlighted');
      }
      let timingTextViews = that.getTimingTextViewsRecursively();
      console.log("a.onlick. timingTextViews.length: " + timingTextViews.length);
      for (let i=0; i < timingTextViews.length; i++) {
        timingTextViews[i].classList.remove('greyed-out');
        timingTextViews[i].classList.remove('extra-unhighlighted');
      }

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
      my.timingsCategoryNodeViewRoot.unhighlightTree();
      that.highlightTree();
      let categoryFullName = that.timingsCategoryNode.fullName();
      my.highlightedCategory = categoryFullName;
      displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

      console.log("a.onclick. categoryFullName: " + categoryFullName);

      let trs = document.querySelectorAll(".timing-row-parent-li:not(.greyed-out)");
      for (let i=0; i < trs.length; i++) {
        trs[i].classList.add('greyed-out');
      }
      let timingTextViews = that.getTimingTextViewsRecursively();
      for (let i=0; i < timingTextViews.length; i++) {
        timingTextViews[i].classList.remove('greyed-out');
      }
      function unhighlight() {
        // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was HIGHLIGHTED_AS_CHILD)");
        if (my.highlightedCategory !== undefined
          && my.highlightedCategory.length > 0
          && !that.isHighlighted()) {
          a.removeEventListener('mouseleave', unhighlight);
          return;
        }
        // my.highlightedCategory = [];
        displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
        for (let i=0; i < trs.length; i++) {
          trs[i].classList.remove('greyed-out');
        }
        a.removeEventListener('mouseleave', unhighlight);
      }
      a.addEventListener('mouseleave', unhighlight)
    } else if (viewState === TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED) {
      my.timingsCategoryNodeViewRoot.highlightTree();
      my.highlightedCategory = [];
      let categoryFullName = that.timingsCategoryNode.fullName();
      displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

      let allTimingTextViews = my.timingsCategoryNodeViewRoot.getTimingTextViewsRecursively();
      for (let i=0; i < allTimingTextViews.length; i++) {
        allTimingTextViews[i].classList.add('greyed-out');
        allTimingTextViews[i].classList.remove('extra-unhighlighted');
      }
      let timingTextViews = that.getTimingTextViewsRecursively();
      for (let i=0; i < timingTextViews.length; i++) {
        timingTextViews[i].classList.remove('greyed-out');
      }
      function unhighlight() {
        // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was EXTRA_HIGHLIGHTED)");
        if (my.highlightedCategory !== undefined
          && my.highlightedCategory.length > 0
          && !that.isHighlighted()) {
          a.removeEventListener('mouseleave', unhighlight);
          return;
        }
        // my.highlightedCategory = [];
        displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
        for (let i=0; i < allTimingTextViews.length; i++) {
          allTimingTextViews[i].classList.remove('greyed-out')
        }
        a.removeEventListener('mouseleave', unhighlight);
      }
      a.addEventListener('mouseleave', unhighlight)
    } else {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "TimingsCategoryNodeView.onclick. unexpected viewState (expected a member of TimingsCategoryNodeViewState enum): " + viewState);
    }
  };
  a.onmouseenter = function(eve) {
    if (my.highlightedCategory !== undefined
       && my.highlightedCategory.length > 0
       && !that.isHighlighted()) {
      return;
    }
    let categoryFullName = that.timingsCategoryNode.fullName();
    // my.highlightedCategory = categoryFullName;
    displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

    console.log("a.onmouseenter. categoryFullName: " + categoryFullName);

    let trs = document.getElementsByClassName("timing-row-parent-li");
    let trsHighlighted = document.querySelectorAll(".timing-row-parent-li:not(.greyed-out)");
    for (let i=0; i < trs.length; i++) {
      trs[i].classList.add('greyed-out');
    }
    let timingTextViews = that.getTimingTextViewsRecursively();
    for (let i=0; i < timingTextViews.length; i++) {
      timingTextViews[i].classList.remove('greyed-out');
    }
    function unhighlight() {
      console.log("TimingsCategoryNodeView.onmouseenter unhighlight");

      let noCategoryIsHighlighted =
        my.highlightedCategory === undefined ||
        my.highlightedCategory.length === 0;

      if (noCategoryIsHighlighted) {
        displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
        for (let i=0; i < trs.length; i++) {
          trs[i].classList.remove('greyed-out');
          trs[i].classList.remove('extra-unhighlighted');
        }
      } else if (that.viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
        for (let i=0; i < timingTextViews.length; i++) {
          timingTextViews[i].classList.add('greyed-out');
        }
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED ||
                 that.viewState === TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED) {
        // do nothing
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
        displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
        for (let i=0; i < trsHighlighted.length; i++) {
          trsHighlighted[i].classList.remove('greyed-out');
        }
      } else {
        window.webkit.messageHandlers.timings_summary_msgs.postMessage(
          "TimingsCategoryNodeView.onmousemove. unexpected viewState (expected a member of TimingsCategoryNodeViewState enum): " + that.viewState);
      }
      a.removeEventListener('mouseleave', unhighlight);
    }
    a.addEventListener('mouseleave', unhighlight)
  };
  if (that.name.includes("\n")) {
    let timingsCount = that.timingsCategoryNode.timingsCountRecursive;
    return
      withChildren(a,
        withChildren(document.createElement('div'),
          ...that.name.split("\n")
                      .map(line => document.createTextNode(line))
                      .flatMap(el => [el,document.createElement("br")])
                      .slice(0, -1)
                      .concat(document.createTextNode(" (" + timingsCount + ")"))
        )
      );
  } else {
    let timingsCount = that.timingsCategoryNode.timingsCountRecursive;
    return withChildren(a,
            document.createTextNode(that.name + " (" + timingsCount + ")")
          );
  }
}

TimingsCategoryNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;
  if (that.children.length == 0) {
    let htmlElement = withClass(withChildren(document.createElement('li'), that.name2html()), 'proc-leaf');
    that.html = htmlElement;
    return;
  }

  that.children.forEach(childNode => childNode.buildAsHtmlLiElement());
  let htmlElement =
    withChildren(
      withChildren(withClass(document.createElement('li'), 'proc-node', 'proc-node-open'),
        (function() {
          let elem = document.createElement('span');
          elem.classList.add('proc-node-icon');
          elem.addEventListener('click', eve => {
            that.toggleCollapse();
          });
          return elem;
        })(),
        that.name2html()
      ),
      withChildren(document.createElement('ul'),
        ...that.children.map(childNode => childNode.html)
      )
    );
  that.html = htmlElement;
};

TimingsCategoryNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

TimingsCategoryNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    that.uncollapse();
  } else {
    that.collapse();
  }
};

TimingsCategoryNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (that.html.classList.contains("proc-node-open")) {
    that.html.classList.remove("proc-node-open");
    that.html.classList.add("proc-node-closed");
  }
};

TimingsCategoryNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html.classList.contains("proc-node-closed")) {
    that.html.classList.remove("proc-node-closed");
    that.html.classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
};

TimingsCategoryNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
};


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

function withClass(elem, ...classes) {
  for (let cls of classes) {
    elem.classList.add(cls);
  }
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
