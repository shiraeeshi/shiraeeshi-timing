
function handleServerMessage(msg) {
  window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage start ");
  if (msg.msg_type == 'keypress_event') {
    return;
  }
  my.timings = msg;
  let timingsByCategoriesByPrefixes = handleTimings(my.timings);
  showTimingsByPrefixesAndLastModified(timingsByCategoriesByPrefixes);
  window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage end ");
}

function showTimingsByPrefixesAndLastModified(timingsByCategoriesByPrefixes) {
  let resultElem = withChildren(document.createElement("ul"),
    ...Object.keys(timingsByCategoriesByPrefixes).map(key => {
      let byPrefixes = timingsByCategoriesByPrefixes[key];
      let byPrefixesLst = Object.entries(byPrefixes).map(([k,v],idx) => v);
      byPrefixesLst.sort((a,b) => {
        return a.lastTiming.millisUntilNow > b.lastTiming.millisUntilNow;
      });

      return withChildren(document.createElement("li"),
        withChildren(document.createElement("div"),
          withChildren(document.createElement("span"),
            document.createTextNode(key)
          ),
          withChildren(document.createElement("div"),
            showFrequenciesOfCategoryInCanvas(byPrefixesLst)
          ),
          withChildren(document.createElement("ul"),
            ...byPrefixesLst.map(prefixObj => {
              return withChildren(document.createElement("li"),
                withChildren(document.createElement("span"),
                  document.createTextNode(prefixObj.prefix)
                )
              );
            })
          )
        )
      )
    })
  );
  let wrapper = document.getElementById("main-content-wrapper");
  wrapper.innerHTML = "";

  wrapper.appendChild(resultElem);
}

function showFrequenciesOfCategoryInCanvas(processes) { // processes[n] = {prefix:"...",timings:[], lastTiming:{...}}

  let hGraphic = new TimingsHistogramsGraphic(processes);
  hGraphic.initCanvas();
  hGraphic.redraw();

  return hGraphic.elem;
}

function TimingsHistogramsGraphic(processes) {
  this.processes = processes;
  this.rangeX = {from: 0, to: 100};
  this.rangeY = {from: 0, to: 100};
  this.scrollbarBreadth = 20;
  this.canvas = null; // invoke initCanvas()
}

TimingsHistogramsGraphic.prototype.setRangeX = function(from, to) {
  this.rangeX.from = from;
  this.rangeX.to = to;
};

TimingsHistogramsGraphic.prototype.setRangeY = function(from, to) {
  this.rangeY.from = from;
  this.rangeY.to = to;
};

TimingsHistogramsGraphic.prototype.initCanvas = function() {
  let that = this;
  let canvas = document.createElement("canvas");
  let canvasWidth = 800;
  let canvasHeight = 400;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  this.canvas = canvas;
  this.canvasWidth = canvasWidth;
  this.canvasHeight = canvasHeight;

  let canvasMouseState = {
    isOnVScrollbarThumb: false,
    isOnVScrollbarThumbTopEdge: false,
    isOnVScrollbarThumbBottomEdge: false,
    isOnHScrollbarThumb: false,
    isOnHScrollbarThumbLeftEdge: false,
    isOnHScrollbarThumbRightEdge: false,
    resetDragModes: function() {
      this.dragModeStartedAt = 0;
      this.dragModeStartedAtRange = null;
      this.isInDragModeVMove = false;
      this.isInDragModeVResizeTop = false;
      this.isInDragModeVResizeBottom = false;
      this.isInDragModeHMove = false;
      this.isInDragModeHResizeLeft = false;
      this.isInDragModeHResizeRight = false;
    },
    enterDragModeVMove: function(position) {
      this.resetDragModes();
      this.isInDragModeVMove = true;
      this.dragModeStartedAt = position;
      this.dragModeStartedAtRange = Object.assign({}, that.rangeY);
    },
    enterDragModeVResizeTop: function() {
      this.resetDragModes();
      this.isInDragModeVResizeTop = true;
    },
    enterDragModeVResizeBottom: function() {
      this.resetDragModes();
      this.isInDragModeVResizeBottom = true;
    },
    enterDragModeHMove: function(position) {
      this.resetDragModes();
      this.isInDragModeHMove = true;
      this.dragModeStartedAt = position;
      this.dragModeStartedAtRange = Object.assign({}, that.rangeX);
    },
    enterDragModeHResizeLeft: function() {
      this.resetDragModes();
      this.isInDragModeHResizeLeft = true;
    },
    enterDragModeHResizeRight: function() {
      this.resetDragModes();
      this.isInDragModeHResizeRight = true;
    },
  };

  canvas.addEventListener('mousedown', function(eve) {
    try {
      if (canvasMouseState.isOnVScrollbarThumbTopEdge) {
        canvasMouseState.enterDragModeVResizeTop();
      } else if (canvasMouseState.isOnVScrollbarThumbBottomEdge) {
        canvasMouseState.enterDragModeVResizeBottom();
      } else if (canvasMouseState.isOnVScrollbarThumb) {
        canvasMouseState.enterDragModeVMove(eve.offsetY);
      } else if (canvasMouseState.isOnHScrollbarThumbLeftEdge) {
        canvasMouseState.enterDragModeHResizeLeft();
      } else if (canvasMouseState.isOnHScrollbarThumbRightEdge) {
        canvasMouseState.enterDragModeHResizeRight();
      } else if (canvasMouseState.isOnHScrollbarThumb) {
        canvasMouseState.enterDragModeHMove(eve.offsetX);
      } else {
        canvasMouseState.resetDragModes();
      }
    } catch (err) {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("canvas mousedown. error: " + err.message);
    }
  });
  canvas.addEventListener('mouseup', function(eve) {
    try {
      canvasMouseState.resetDragModes();
    } catch (err) {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("canvas mouseup. error: " + err.message);
    }
  });
  canvas.addEventListener('mousemove', function(eve) {
    try {

      if (canvasMouseState.isInDragModeVMove) {
        let diff = eve.offsetY - canvasMouseState.dragModeStartedAt;
        let startRange = canvasMouseState.dragModeStartedAtRange
        let from = startRange.from + diff;
        let to = startRange.to + diff;
        that.setRangeY(from, to);
        that.redraw();
      } else if (canvasMouseState.isInDragModeVResizeTop) {
        that.setRangeY(eve.offsetY, that.rangeY.to);
        that.redraw();
      } else if (canvasMouseState.isInDragModeVResizeBottom) {
        that.setRangeY(that.rangeY.from, eve.offsetY);
        that.redraw();
      } else if (canvasMouseState.isInDragModeHMove) {
        let diff = eve.offsetX - canvasMouseState.dragModeStartedAt;
        let startRange = canvasMouseState.dragModeStartedAtRange
        let from = startRange.from + diff;
        let to = startRange.to + diff;
        that.setRangeX(from, to);
        that.redraw();
      } else if (canvasMouseState.isInDragModeHResizeLeft) {
        that.setRangeX(eve.offsetX, that.rangeX.to);
        that.redraw();
      } else if (canvasMouseState.isInDragModeHResizeRight) {
        that.setRangeX(that.rangeX.from, eve.offsetX);
        that.redraw();
      } else {

        let isOnVScrollbar = eve.offsetX > that.canvasWidth - that.scrollbarBreadth &&
          eve.offsetY < that.canvasHeight - that.scrollbarBreadth;

        let isOnVScrollbarThumb = isOnVScrollbar &&
          eve.offsetY > that.rangeY.from &&
          eve.offsetY < that.rangeY.to;

        let isOnVScrollbarThumbTopEdge = isOnVScrollbar &&
            withinRangeOf(eve.offsetY, that.rangeY.from, 5);

        let isOnVScrollbarThumbBottomEdge = isOnVScrollbar &&
            withinRangeOf(eve.offsetY, that.rangeY.to, 5);

        canvasMouseState.isOnVScrollbarThumb = isOnVScrollbarThumb;
        canvasMouseState.isOnVScrollbarThumbTopEdge = isOnVScrollbarThumbTopEdge;
        canvasMouseState.isOnVScrollbarThumbBottomEdge = isOnVScrollbarThumbBottomEdge;
          

        let isOnHScrollbar = eve.offsetY > that.canvasHeight - that.scrollbarBreadth &&
          eve.offsetX < that.canvasWidth - that.scrollbarBreadth;

        let isOnHScrollbarThumb = isOnHScrollbar &&
          eve.offsetX > that.rangeX.from &&
          eve.offsetX < that.rangeX.to;

        let isOnHScrollbarThumbLeftEdge = isOnHScrollbar &&
            withinRangeOf(eve.offsetX, that.rangeX.from, 5);

        let isOnHScrollbarThumbRightEdge = isOnHScrollbar &&
            withinRangeOf(eve.offsetX, that.rangeX.to, 5);

        canvasMouseState.isOnHScrollbarThumb = isOnHScrollbarThumb;
        canvasMouseState.isOnHScrollbarThumbLeftEdge = isOnHScrollbarThumbLeftEdge;
        canvasMouseState.isOnHScrollbarThumbRightEdge = isOnHScrollbarThumbRightEdge;

        if (isOnVScrollbarThumbTopEdge || isOnVScrollbarThumbBottomEdge) {
          that.canvas.style.cursor = 'ns-resize';
        } else if (isOnHScrollbarThumbLeftEdge || isOnHScrollbarThumbRightEdge) {
          that.canvas.style.cursor = 'ew-resize';
        } else if (isOnVScrollbarThumb) {
          //that.canvas.style.cursor = "url(frontend/img/cursor-hand-36px.png)";
          that.canvas.style.cursor = 'grab';
          //that.canvas.style.cursor = 'ns-resize';
        } else if (isOnHScrollbarThumb) {
          //that.canvas.style.cursor = "url(frontend/img/cursor-hand-36px.png)";
          that.canvas.style.cursor = 'grab';
          //that.canvas.style.cursor = 'ew-resize';
        } else {
          that.canvas.style.cursor = 'initial';
        }
      }

    } catch (err) {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("canvas mousemove. error: " + err.message);
    }
  });

  let inputXFrom = document.createElement('input');
  inputXFrom.type = 'text';
  inputXFrom.value = that.rangeX.from;
  let inputXTo = document.createElement('input');
  inputXTo.type = 'text';
  inputXTo.value = that.rangeX.to;
  let inputYFrom = document.createElement('input');
  inputYFrom.type = 'text';
  inputYFrom.value = that.rangeY.from;
  let inputYTo = document.createElement('input');
  inputYTo.type = 'text';
  inputYTo.value = that.rangeY.to;

  function addEnterListener(input, handler) {
    input.addEventListener('keyup', (eve) => {
      if (eve.key == 'Enter') {
        handler(input.value);
      }
    });
  }

  addEnterListener(inputXFrom, (value) => {
    this.setRangeX(parseInt(value), parseInt(inputXTo.value));
    this.redraw();
  });
  addEnterListener(inputXTo, (value) => {
    this.setRangeX(parseInt(inputXFrom.value), parseInt(value));
    this.redraw();
  });
  addEnterListener(inputYFrom, (value) => {
    this.setRangeY(parseInt(value), parseInt(inputYTo.value));
    this.redraw();
  });
  addEnterListener(inputYTo, (value) => {
    this.setRangeY(parseInt(inputYFrom.value), parseInt(value));
    this.redraw();
  });


  let buttonsPanel = withChildren(document.createElement('div'),
    withChildren(document.createElement('span'), document.createTextNode('x:')),
    inputXFrom,
    inputXTo,
    withChildren(document.createElement('span'), document.createTextNode('y:')),
    inputYFrom,
    inputYTo,
  );

  this.elem = withChildren(document.createElement('div'),
    canvas,
    buttonsPanel,
  );
};

TimingsHistogramsGraphic.prototype.redraw = function() {
  let that = this;

  let ctx = that.canvas.getContext('2d');

  //let someProcess = that.processes[0]
  //let someTimingFromProcess = someProcess.timings[0]

  //someTimingFromProcess.millisUntilNext
  //someTimingFromProcess.millisFromPrevious
  //someProcess.lastTiming.millisUntilNow

  let now = new Date();

  //ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';
  //ctx.fillRect(xFrom, yFrom, timingItem.minutes*canvasWidth*1.0/minutesRange, 50);
  //ctx.fillRect(xFrom, yFrom, xTo, yTo);

  let oldestRecordMillis = findMax(0, that.processes.map(p => now.getTime() - p.timings[0].fromdate.getTime()));
  let maxWavelength = findMax(0, that.processes.map(p => {
    return findMax(0, p.timings.map(t => t.millisUntilNext));
  }));

  let graphicWidth = that.canvasWidth - that.scrollbarBreadth;
  let graphicHeight = that.canvasHeight - that.scrollbarBreadth;

  let millisFrom = oldestRecordMillis * (graphicWidth - that.rangeX.from) / graphicWidth;
  let millisTo = oldestRecordMillis * (graphicWidth - that.rangeX.to) / graphicWidth;
  let xRatio = (millisFrom - millisTo) / graphicWidth;

  let wavelengthFrom = maxWavelength * that.rangeY.from / graphicHeight;
  let wavelengthTo = maxWavelength * that.rangeY.to / graphicHeight;
  let yRatio = (wavelengthTo - wavelengthFrom) / graphicHeight;

  window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
    "canvas redraw. " +
    ", millisFrom: " + millisFrom +
    ", millisTo: " + millisTo +
    ", xRatio: " + xRatio +
    ", wavelengthFrom: " + wavelengthFrom +
    ", wavelengthTo: " + wavelengthTo +
    ", yRatio: " + yRatio
  );

  function withinTimeRange(millis, millisFrom, millisTo) {
    return millisFrom >= millis && millis >= millisTo;
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  that.fillRect(ctx, {
    xFrom: 0,
    yFrom: 0,
    xTo: that.canvasWidth,
    yTo: that.canvasHeight
  });
  ctx.fillStyle = 'rgba(0, 0, 255, 1)';

  that.processes.forEach(p => {
    p.timings.forEach(t => {
      let time = now.getTime() - t.fromdate.getTime();
      if (withinTimeRange(time, millisFrom, millisTo)) {
        //let xFrom = (time - millisFrom) * xRatio
        let xFrom = graphicWidth * (millisFrom - time) / (millisFrom - millisTo);
        that.fillRect(ctx, {
          xFrom: xFrom,
          xTo: xFrom + 5,
          yFrom: 0,
          yTo: t.millisUntilNext / yRatio
        });
      }
    });
  });

  // 0   rangeX.from     rangeX.to    oldestRecordMillis
  // 0   rangeY.from     rangeY.to    maxWavelength

  let scrollbarBreadth = that.scrollbarBreadth;

  let hScrollbarCoords = {
    xFrom: 0,
    yFrom: that.canvasHeight - scrollbarBreadth,
    xTo: that.canvasWidth - scrollbarBreadth,
    yTo: that.canvasHeight
  };
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  that.fillRect(ctx, hScrollbarCoords);

  let hScrollbarThumbsCoords = {
    xFrom: that.rangeX.from,
    yFrom: that.canvasHeight - scrollbarBreadth,
    xTo: that.rangeX.to,
    yTo: that.canvasHeight
  };
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  that.fillRect(ctx, hScrollbarThumbsCoords);

  let vScrollbarCoords = {
    xFrom: that.canvasWidth - scrollbarBreadth,
    yFrom: 0,
    xTo: that.canvasWidth,
    yTo: that.canvasHeight - scrollbarBreadth
  };
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  that.fillRect(ctx, vScrollbarCoords);

  let vScrollbarThumbsCoords = {
    xFrom: that.canvasWidth - scrollbarBreadth,
    yFrom: that.rangeY.from,
    xTo: that.canvasWidth,
    yTo: that.rangeY.to
  };
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  that.fillRect(ctx, vScrollbarThumbsCoords);
};

TimingsHistogramsGraphic.prototype.fillRect = function(ctx, coords) {
  ctx.fillRect(coords.xFrom, coords.yFrom, coords.xTo - coords.xFrom, coords.yTo - coords.yFrom);
};

function withinRangeOf(a, b, range) {
  if (a > b) {
    return (a - b) <= range;
  } else {
    return (b - a) <= range;
  }
}

function findMax(defaultValue, arr) {
  if (arr.length === 0) {
    return defaultValue;
  }
  return arr.reduce((a, b) => {
    if (a > b) {
      return a;
    } else {
      return b;
    }
  });
}

function handleTimings(timingsByCategories) {
  let timingsByCategoriesByPrefixes = {}; // obj[cat][prefix] = {prefix:"...",timings:[], lastTiming:{...}}

  Object.keys(timingsByCategories).forEach(key => {
    let byPrefixes = {};
    timingsByCategoriesByPrefixes[key] = byPrefixes;

    let thisTimingsByDays = my.timings[key];
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      if (eachTimingDay === undefined || eachTimingDay.timings === undefined) {
        continue; // TODO fix
      }
      eachTimingDay.timings.forEach(t => {
        let prefix = t.name;
        if (t.name.includes("(")) {
          prefix = t.name.slice(0, t.name.indexOf("("));
        }
        prefix = prefix.trim();
        if (!byPrefixes.hasOwnProperty(prefix)) {
          byPrefixes[prefix] = {
            prefix: prefix,
            timings: []
          };
        }
        byPrefixes[prefix].timings.push(t);

        let d = timingDateArrays2Date(dt, t.from);
        t.fromdate = d;
      });
    }
  });
  Object.keys(timingsByCategoriesByPrefixes).forEach(key => {
    let byPrefixes = timingsByCategoriesByPrefixes[key];
    Object.keys(byPrefixes).forEach(prefix => {
      let timings = byPrefixes[prefix].timings;
      timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
      let previousTiming = timings[0];
      let i = 1;
      while (i < timings.length) {
        let timing = timings[i];
        let diff = timing.fromdate.getTime() - previousTiming.fromdate.getTime();
        previousTiming.millisUntilNext = diff;
        timing.millisFromPrevious = diff;
        previousTiming = timing;
        i++;
      }
      let lastTiming = timings[timings.length - 1];
      let now = new Date();
      let millisUntilNow = now.getTime() - lastTiming.fromdate.getTime();
      lastTiming.millisUntilNow = millisUntilNow;
      lastTiming.millisUntilNext = millisUntilNow;
      byPrefixes[prefix].lastTiming = lastTiming;
    });
  });
  return timingsByCategoriesByPrefixes;
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

function withChildren(elem, ...children) {
  children.forEach(child => elem.appendChild(child));
  return elem;
}
