const { TimingsCategoryNodeViewState } = require('../js/timings_summary.functions.js');

const { turnMultilineTextIntoHtml, addOffsetToLineNumberInErrorMessage, withChildren, withClass } = require('../js/html_utils.js');

const { timingDateArrays2Date, date2timingDateArray } = require('../js/date_utils.js');

let my = {
  timings: null
};

window.my = my;

window.webkit.messageHandlers.timings_frequencies_msgs.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  try {
    window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage start ");
    if (msg.msg_type == 'keypress_event') {
      return;
    }
    if (msg.msg_type == "timings_query_response") {
      if (my.timingsQueryResponseCallback !== undefined) {
        my.timingsQueryResponseCallback(msg.timings);
      }
      return;
    }
    if (msg.msg_type == "error_message") {
      let wrapper = document.getElementById("main-content-wrapper");
      let errorMessage = msg.message;
      if (msg.lineNumOffset) {
        errorMessage = addOffsetToLineNumberInErrorMessage(errorMessage, msg.lineNumOffset);
      }
      if (msg.source_timing_location) {
        errorMessage = `(source timing location: ${msg.source_timing_location})\n${errorMessage}`;
      }
      if (msg.source_timing) {
        errorMessage = `(source timing: ${msg.source_timing})\n${errorMessage}`;
      }
      wrapper.innerHTML = "";
      let errorMessageHtml = turnMultilineTextIntoHtml(errorMessage);
      wrapper.appendChild(errorMessageHtml);
      return;
    }

    // old
    // my.timings = msg;
    // let timingsBySubcategoriesTree = handleTimings(my.timings);
    // showTimingsBySubcategoriesAndLastModified(timingsBySubcategoriesTree);

    // new
    initViewBuilder();

    let millisInWeek = 7*24*60*60*1000;

    let initialPeriodTo = new Date();
    let initialPeriodFrom = new Date();
    initialPeriodFrom.setTime(initialPeriodFrom.getTime() - millisInWeek)
    requestTimingsForPeriod(initialPeriodFrom, initialPeriodTo).then(timings => {
      console.log('initial handleServerMessage. timings keys:');
      console.dir(Object.keys(timings));
      my.timings = handleTimings(timings, undefined);
      my.viewBuilder.buildViews(my.timings);
    }).catch(err => {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
        "initial handleServerMessage. err: " + err);
    });

    window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage end ");
  } catch (err) {
    window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage. error: " + err.message);
  }
}

function initViewBuilder() {
  let wrapper = document.getElementById("main-content-wrapper");
  wrapper.innerHTML = "";
  my.viewBuilder = new ProcessesSubcategoriesViewBuilder();
  wrapper.appendChild(my.viewBuilder.getResultHtml());
}

function showTimingsBySubcategoriesAndLastModified(timingsBySubcategoriesTree) {
  let wrapper = document.getElementById("main-content-wrapper");
  wrapper.innerHTML = "";

  let viewBuilder = new ProcessesSubcategoriesViewBuilder();
  viewBuilder.buildViews(timingsBySubcategoriesTree);

  wrapper.appendChild(viewBuilder.getResultHtml());
}

function showTimingsByPrefixesAndLastModified(timingsByCategoriesByPrefixes) {
  let resultElem = withChildren(document.createElement("ul"),
    ...Object.keys(timingsByCategoriesByPrefixes).map(key => {
      let byPrefixes = timingsByCategoriesByPrefixes[key];
      let byPrefixesLst = Object.entries(byPrefixes).map(([k,v],idx) => v);
      byPrefixesLst.sort((a,b) => {
        return a.lastTiming.millisUntilNow > b.lastTiming.millisUntilNow;
      });

      let hGraphic = new TimingsHistogramsGraphic(byPrefixesLst);
      hGraphic.initCanvas();
      hGraphic.redraw();

      return withChildren(document.createElement("li"),
        withChildren(document.createElement("div"),
          withChildren(document.createElement("span"),
            document.createTextNode(key)
          ),
          withChildren(document.createElement("div"), hGraphic.elem),
          withChildren(document.createElement("ul"),
            ...byPrefixesLst.map(prefixObj => {
              return withChildren(document.createElement("li"),
                (function() {
                  let aLink = document.createElement("a");
                  aLink.addEventListener("click", (eve) => {
                    hGraphic.highlightProcess(prefixObj.prefix);
                  });
                  return withChildren(aLink, document.createTextNode(prefixObj.prefix));
                })()
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


function TimingsHistogramsGraphic(processNode) {
  // old comment: processes[n] = {prefix:"...",timings:[], lastTiming:{...}}
  // processNode = {name: "", children: [], childrenByName: {}, timings: []}
  this.processNode = processNode;
  this.rangeX = {from: 0, to: 100};
  this.rangeY = {from: 0, to: 100};
  this.distortionX = {a: 0, b: 1, c: 0};
  this.distortionY = {a: 1};
  this.scrollbarBreadth = 20;
  this.canvas = null; // invoke initCanvas()
  //this.highlightedProcessName = null; // invoke highlightProcess
  this.selectedProcessNode = null; // invoke selectProcess
  this.highlightedSubprocessOfSelectedProcessNode = null; // invoke highlightSubprocessOfSelectedProcessNode
}

TimingsHistogramsGraphic.prototype.setRangeXFrom = function(from) {
  if (from < 0) {
    this.rangeX.from = 0;
  } else {
    this.rangeX.from = from;
  }
};
TimingsHistogramsGraphic.prototype.setRangeXTo = function(to) {
  let maxX = this.canvas.width - this.scrollbarBreadth;
  if (to > maxX) {
    this.rangeX.to = maxX;
  } else {
    this.rangeX.to = to;
  }
};
TimingsHistogramsGraphic.prototype.shiftRangeX = function(newFrom, newTo) {
  let range = this.rangeX.to - this.rangeX.from;
  if (newFrom < 0) {
    newFrom = 0;
    newTo = range;
  }
  let maxX = this.canvas.width - this.scrollbarBreadth;
  if (newTo > maxX) {
    newTo = maxX;
    newFrom = maxX - range;
  }
  this.rangeX.from = newFrom;
  this.rangeX.to = newTo;
};

TimingsHistogramsGraphic.prototype.setRangeYFrom = function(from) {
  if (from < 0) {
    this.rangeY.from = 0;
  } else {
    this.rangeY.from = from;
  }
};
TimingsHistogramsGraphic.prototype.setRangeYTo = function(to) {
  let maxY = this.canvas.height - this.scrollbarBreadth;
  if (to > maxY) {
    this.rangeY.to = maxY;
  } else {
    this.rangeY.to = to;
  }
};
TimingsHistogramsGraphic.prototype.shiftRangeY = function(newFrom, newTo) {
  let range = this.rangeY.to - this.rangeY.from;
  if (newFrom < 0) {
    newFrom = 0;
    newTo = range;
  }
  let maxY = this.canvas.height - this.scrollbarBreadth;
  if (newTo > maxY) {
    newTo = maxY;
    newFrom = maxY - range;
  }
  this.rangeY.from = newFrom;
  this.rangeY.to = newTo;
};

TimingsHistogramsGraphic.prototype.selectProcess = function(selectedProcessNode) {
  let that = this;
  resetMillisUntilNextForProcessNode(that.processNode, selectedProcessNode);
  that.selectedProcessNode = selectedProcessNode;
  that.highlightedProcessNode = selectedProcessNode;
  that.redraw();
};

TimingsHistogramsGraphic.prototype.highlightProcess = function(processNode) {
  this.highlightedProcessNode = processNode;
  this.redraw();
};

TimingsHistogramsGraphic.prototype.getCanvasPosition = function() {
  let that = this;
  let canvas = that.canvas;
  let box = canvas.getBoundingClientRect();
  let de = document.documentElement;
  //let top = box.top - de.scrollTop - de.clientTop;
  //let top = box.top - de.scrollTop;
  let top = box.top - de.clientTop;
  //let left = box.left - de.scrollLeft - de.clientLeft;
  //let left = box.left - de.scrollLeft;
  let left = box.left - de.clientLeft;
  return {
    top: top,
    left: left
  }
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
    isInAnyDragMode: function() {
      return this.isInDragModeVMove ||
             this.isInDragModeVResizeTop ||
             this.isInDragModeVResizeBottom ||
             this.isInDragModeHMove ||
             this.isInDragModeHResizeLeft ||
             this.isInDragModeHResizeRight;
    },
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
        document.documentElement.addEventListener('mouseup', canvasMouseUp);
        document.documentElement.addEventListener('mousemove', canvasMouseMove);
      } else if (canvasMouseState.isOnVScrollbarThumbBottomEdge) {
        canvasMouseState.enterDragModeVResizeBottom();
        document.documentElement.addEventListener('mouseup', canvasMouseUp);
        document.documentElement.addEventListener('mousemove', canvasMouseMove);
      } else if (canvasMouseState.isOnVScrollbarThumb) {
        let canvasRect = that.getCanvasPosition();
        let offsetY = eve.clientY - canvasRect.top;

        canvasMouseState.enterDragModeVMove(offsetY);
        document.documentElement.addEventListener('mouseup', canvasMouseUp);
        document.documentElement.addEventListener('mousemove', canvasMouseMove);
      } else if (canvasMouseState.isOnHScrollbarThumbLeftEdge) {
        canvasMouseState.enterDragModeHResizeLeft();
        document.documentElement.addEventListener('mouseup', canvasMouseUp);
        document.documentElement.addEventListener('mousemove', canvasMouseMove);
      } else if (canvasMouseState.isOnHScrollbarThumbRightEdge) {
        canvasMouseState.enterDragModeHResizeRight();
        document.documentElement.addEventListener('mouseup', canvasMouseUp);
        document.documentElement.addEventListener('mousemove', canvasMouseMove);
      } else if (canvasMouseState.isOnHScrollbarThumb) {
        let canvasRect = that.getCanvasPosition();
        let offsetX = eve.clientX - canvasRect.left;

        canvasMouseState.enterDragModeHMove(offsetX);
        document.documentElement.addEventListener('mouseup', canvasMouseUp);
        document.documentElement.addEventListener('mousemove', canvasMouseMove);
      } else {
        canvasMouseState.resetDragModes();
      }
    } catch (err) {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("canvas mousedown. error: " + err.message);
    }
  });

  function canvasMouseUp(eve) {
    try {
      canvasMouseState.resetDragModes();
      document.documentElement.removeEventListener('mouseup', canvasMouseUp);
      document.documentElement.removeEventListener('mousemove', canvasMouseMove);
      document.documentElement.style.cursor = 'initial';
    } catch (err) {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("canvas mouseup. error: " + err.message);
    }
  }

  canvas.addEventListener('mouseleave', function(eve) {
    try {
      if (!canvasMouseState.isInAnyDragMode()) {
        document.documentElement.removeEventListener('mouseup', canvasMouseUp);
        document.documentElement.removeEventListener('mousemove', canvasMouseMove);
        document.documentElement.style.cursor = 'initial';
      }
    } catch (err) {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("canvas mouseleave. error: " + err.message);
    }
  });

  canvas.addEventListener('mousemove', canvasMouseMove);

  function canvasMouseMove(eve) {
    try {

      let canvasRect = that.getCanvasPosition();
      let offsetY = eve.clientY - canvasRect.top;
      let offsetX = eve.clientX - canvasRect.left;

      if (canvasMouseState.isInDragModeVMove) {
        let diff = offsetY - canvasMouseState.dragModeStartedAt;
        let startRange = canvasMouseState.dragModeStartedAtRange
        let from = startRange.from + diff;
        let to = startRange.to + diff;
        that.shiftRangeY(from, to);
        that.redraw();
      } else if (canvasMouseState.isInDragModeVResizeTop) {
        that.setRangeYFrom(offsetY);
        that.redraw();
      } else if (canvasMouseState.isInDragModeVResizeBottom) {
        that.setRangeYTo(offsetY);
        that.redraw();
      } else if (canvasMouseState.isInDragModeHMove) {
        let diff = offsetX - canvasMouseState.dragModeStartedAt;
        let startRange = canvasMouseState.dragModeStartedAtRange
        let from = startRange.from + diff;
        let to = startRange.to + diff;
        that.shiftRangeX(from, to);
        that.redraw();
      } else if (canvasMouseState.isInDragModeHResizeLeft) {
        that.setRangeXFrom(offsetX);
        that.redraw();
      } else if (canvasMouseState.isInDragModeHResizeRight) {
        that.setRangeXTo(offsetX);
        that.redraw();
      } else {
        if (eve.target !== canvas) {
          return;
        }

        let isOnGraph = offsetX < that.canvasWidth - that.scrollbarBreadth &&
          offsetY < that.canvasHeight - that.scrollbarBreadth;

        let isOnVScrollbar = offsetY < that.canvasHeight - that.scrollbarBreadth &&
          offsetX > that.canvasWidth - that.scrollbarBreadth;

        let isOnVScrollbarThumb = isOnVScrollbar &&
          offsetY > that.rangeY.from &&
          offsetY < that.rangeY.to;

        let isOnVScrollbarThumbTopEdge = isOnVScrollbar &&
            withinRangeOf(offsetY, that.rangeY.from, 5);

        let isOnVScrollbarThumbBottomEdge = isOnVScrollbar &&
            withinRangeOf(offsetY, that.rangeY.to, 5);

        canvasMouseState.isOnVScrollbarThumb = isOnVScrollbarThumb;
        canvasMouseState.isOnVScrollbarThumbTopEdge = isOnVScrollbarThumbTopEdge;
        canvasMouseState.isOnVScrollbarThumbBottomEdge = isOnVScrollbarThumbBottomEdge;
          

        let isOnHScrollbar = offsetX < that.canvasWidth - that.scrollbarBreadth &&
          offsetY > that.canvasHeight - that.scrollbarBreadth;

        let isOnHScrollbarThumb = isOnHScrollbar &&
          offsetX > that.rangeX.from &&
          offsetX < that.rangeX.to;

        let isOnHScrollbarThumbLeftEdge = isOnHScrollbar &&
            withinRangeOf(offsetX, that.rangeX.from, 5);

        let isOnHScrollbarThumbRightEdge = isOnHScrollbar &&
            withinRangeOf(offsetX, that.rangeX.to, 5);

        canvasMouseState.isOnHScrollbarThumb = isOnHScrollbarThumb;
        canvasMouseState.isOnHScrollbarThumbLeftEdge = isOnHScrollbarThumbLeftEdge;
        canvasMouseState.isOnHScrollbarThumbRightEdge = isOnHScrollbarThumbRightEdge;

        if (isOnVScrollbarThumbTopEdge || isOnVScrollbarThumbBottomEdge) {
          document.documentElement.style.cursor = 'ns-resize';
        } else if (isOnHScrollbarThumbLeftEdge || isOnHScrollbarThumbRightEdge) {
          document.documentElement.style.cursor = 'ew-resize';
        } else if (isOnVScrollbarThumb) {
          //document.documentElement.style.cursor = "url(frontend/img/cursor-hand-36px.png)";
          document.documentElement.style.cursor = 'grab';
          //document.documentElement.style.cursor = 'ns-resize';
        } else if (isOnHScrollbarThumb) {
          //document.documentElement.style.cursor = "url(frontend/img/cursor-hand-36px.png)";
          document.documentElement.style.cursor = 'grab';
          //document.documentElement.style.cursor = 'ew-resize';
        } else {
          document.documentElement.style.cursor = 'initial';
        }
      }

    } catch (err) {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("canvas mousemove. error: " + err.message);
    }
  }

  // let inputXFrom = document.createElement('input');
  // inputXFrom.type = 'text';
  // inputXFrom.value = that.rangeX.from;
  // let inputXTo = document.createElement('input');
  // inputXTo.type = 'text';
  // inputXTo.value = that.rangeX.to;
  // let inputYFrom = document.createElement('input');
  // inputYFrom.type = 'text';
  // inputYFrom.value = that.rangeY.from;
  // let inputYTo = document.createElement('input');
  // inputYTo.type = 'text';
  // inputYTo.value = that.rangeY.to;

  // function addEnterListener(input, handler) {
  //   input.addEventListener('keyup', (eve) => {
  //     if (eve.key == 'Enter') {
  //       handler(input.value);
  //     }
  //   });
  // }

  // addEnterListener(inputXFrom, (value) => {
  //   this.setRangeX(parseInt(value), parseInt(inputXTo.value));
  //   this.redraw();
  // });
  // addEnterListener(inputXTo, (value) => {
  //   this.setRangeX(parseInt(inputXFrom.value), parseInt(value));
  //   this.redraw();
  // });
  // addEnterListener(inputYFrom, (value) => {
  //   this.setRangeY(parseInt(value), parseInt(inputYTo.value));
  //   this.redraw();
  // });
  // addEnterListener(inputYTo, (value) => {
  //   this.setRangeY(parseInt(inputYFrom.value), parseInt(value));
  //   this.redraw();
  // });


  // let buttonsPanel = withChildren(document.createElement('div'),
  //   withChildren(document.createElement('span'), document.createTextNode('x:')),
  //   inputXFrom,
  //   inputXTo,
  //   withChildren(document.createElement('span'), document.createTextNode('y:')),
  //   inputYFrom,
  //   inputYTo,
  // );

  this.elem = withChildren(document.createElement('div')
    , canvas
    , that.buildDistortionButtonsPanel()
    // , buttonsPanel
  );
};

TimingsHistogramsGraphic.prototype.setDistortionXa = function(newValue) {
  this.distortionX.a = newValue;
};
TimingsHistogramsGraphic.prototype.setDistortionXb = function(newValue) {
  this.distortionX.b = newValue;
};
TimingsHistogramsGraphic.prototype.setDistortionXc = function(newValue) {
  this.distortionX.c = newValue;
};

TimingsHistogramsGraphic.prototype.setDistortionY = function(newValue) {
  this.distortionY.a = newValue;
};

TimingsHistogramsGraphic.prototype.buildDistortionButtonsPanel = function() {
  let that = this;

  let inputDistortionXa = document.createElement('input');
  inputDistortionXa.type = 'text';
  inputDistortionXa.value = that.distortionX.a;

  let inputDistortionXb = document.createElement('input');
  inputDistortionXb.type = 'text';
  inputDistortionXb.value = that.distortionX.b;

  let inputDistortionXc = document.createElement('input');
  inputDistortionXc.type = 'text';
  inputDistortionXc.value = that.distortionX.c;

  let inputDistortionY = document.createElement('input');
  inputDistortionY.type = 'text';
  inputDistortionY.value = that.distortionY.a;

  function addEnterListener(input, handler) {
    input.addEventListener('keyup', (eve) => {
      if (eve.key == 'Enter') {
        handler(input.value);
      }
    });
  }

  function setDistorionXAndRedraw() {
    that.setDistortionXa(parseFloat(inputDistortionXa.value));
    that.setDistortionXb(parseFloat(inputDistortionXb.value));
    that.setDistortionXc(parseFloat(inputDistortionXc.value));
    that.redraw();
  }

  addEnterListener(inputDistortionXa, setDistorionXAndRedraw);
  addEnterListener(inputDistortionXb, setDistorionXAndRedraw);
  addEnterListener(inputDistortionXc, setDistorionXAndRedraw);

  function setDistorionYAndRedraw() {
    that.setDistortionY(parseFloat(inputDistortionY.value));
    that.redraw();
  }

  addEnterListener(inputDistortionY, setDistorionYAndRedraw);

  let buttonsPanel =
    withChildren(document.createElement('div'),
      withChildren(document.createElement('div'),
        withChildren(document.createElement('span'), document.createTextNode('distortion x: a:')),
        inputDistortionXa,
        withChildren(document.createElement('span'), document.createTextNode('b:')),
        inputDistortionXb,
        withChildren(document.createElement('span'), document.createTextNode('c:')),
        inputDistortionXc
      ),
      withChildren(document.createElement('div'),
        withChildren(document.createElement('span'), document.createTextNode('distortion y:')),
        inputDistortionY
      )
    );
  return buttonsPanel;
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

  function findMaxRecursive(processNode, defaultValue, innerMaxFunc) {
    let localMax = defaultValue;
    if (processNode.timings.length > 0) {
      localMax = innerMaxFunc(processNode.timings);
    }
    return findMax(defaultValue,
      [localMax].concat(processNode.children.map((childProcessNode) => {
        return findMaxRecursive(childProcessNode, defaultValue, innerMaxFunc)
      })));
  }
  // let oldestRecordMillis = findMax(0, that.processes.map(p => now.getTime() - p.timings[0].fromdate.getTime()));
  let oldestRecordMillis = findMaxRecursive(that.processNode, 0, (timings) => {
    if (timings.length == 0) {
      return 0;
    } else {
      return now.getTime() - timings[0].fromdate.getTime();
    }
  });
  // let maxWavelength = findMax(0, that.processes.map(p => {
  //   return findMax(0, p.timings.map(t => t.millisUntilNext));
  // }));
  let maxWavelength = findMaxRecursive(that.processNode, 0, (timings) => {
    return findMax(0, timings.map(t => t.millisUntilNext));
  });

  let graphicWidth = that.canvasWidth - that.scrollbarBreadth;
  let graphicHeight = that.canvasHeight - that.scrollbarBreadth;

  let millisFrom = oldestRecordMillis * (graphicWidth - that.rangeX.from) / graphicWidth;
  let millisTo = oldestRecordMillis * (graphicWidth - that.rangeX.to) / graphicWidth;
  let timeRange = millisFrom - millisTo;
  let xRatio = (millisFrom - millisTo) / graphicWidth;

  let wavelengthFrom = maxWavelength * that.rangeY.from / graphicHeight;
  let wavelengthTo = maxWavelength * that.rangeY.to / graphicHeight;
  let wavelengthRange = wavelengthTo - wavelengthFrom;
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

  // function drawTimingsOfProcess(p, colorRGBA, lastTimingColorRGBA) {
  //   if (colorRGBA) {
  //     ctx.fillStyle = colorRGBA;
  //   }
  //   function drawTiming(t) {
  //     let time = now.getTime() - t.fromdate.getTime();
  //     if (withinTimeRange(time, millisFrom, millisTo)) {
  //       //let xFrom = (time - millisFrom) * xRatio
  //       let xFrom = graphicWidth * (millisFrom - time) / (millisFrom - millisTo);
  //       that.fillRect(ctx, {
  //         xFrom: xFrom,
  //         xTo: xFrom + 5,
  //         yFrom: 0,
  //         yTo: t.millisUntilNext / yRatio
  //       });
  //     }
  //   }
  //   p.timings.forEach(t => drawTiming(t));
  //   if (lastTimingColorRGBA) {
  //     ctx.fillStyle = lastTimingColorRGBA;
  //     if (p.lastTiming) {
  //       drawTiming(p.lastTiming);
  //     } else {
  //       window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
  //         "TimingsHistogramsGraphic.redraw drawTimingsOfProcess. NO LAST TIMING");
  //     }
  //   }
  // }

  function drawTimingsOfProcessNode(processNode, colorRGBA, lastTimingColorRGBA, exceptChildNode) {
    if (colorRGBA) {
      ctx.fillStyle = colorRGBA;
    }
    //function distort(timeDiff, y) {
    function distort(y) {
      // let xa = that.distortionX.a;
      // let xb = that.distortionX.b;
      // let xc = that.distortionX.c;

      let ya = that.distortionY.a;

      // let coeff = (ya*Math.sqrt(timeDiff / timeRange) + yb*(timeDiff / timeRange) + yc);
      // let coeff = Math.exp(Math.log(timeDiff/timeRange) / ya) / (timeDiff/timeRange);
      // return coeff * y;
      let wr = wavelengthRange;
      //let normal = (wr - y)/wr;
      let normal = y/wr;
      let root = Math.exp(Math.log(normal) / ya);
      let coeff = (root - normal) / normal;
      return y + y*coeff;
    }
    function drawTiming(t) {
      let timeDiff = now.getTime() - t.fromdate.getTime();
      if (withinTimeRange(timeDiff, millisFrom, millisTo)) {
        //let xFrom = (timeDiff - millisFrom) * xRatio
        //let xFrom = graphicWidth * (millisFrom - timeDiff) / (millisFrom - millisTo);
        let xFrom = (millisFrom - timeDiff) / xRatio;
        that.fillRect(ctx, {
          xFrom: xFrom,
          xTo: xFrom + 5,
          yFrom: 0,
          //yTo: t.millisUntilNext / yRatio
          //yTo: distort(millisFrom - timeDiff, t.millisUntilNext) / yRatio
          yTo: distort(t.millisUntilNext) / yRatio
        });
      }
    }
    processNode.timings.forEach(t => drawTiming(t));
    if (lastTimingColorRGBA) {
      ctx.fillStyle = lastTimingColorRGBA;
      if (processNode.timings.length > 0) {
        drawTiming(processNode.timings[processNode.timings.length - 1]);
      }
    }
    processNode.children
      .filter((childNode) => childNode !== exceptChildNode)
      .forEach((childProcessNode) => {
        drawTimingsOfProcessNode(childProcessNode, colorRGBA, lastTimingColorRGBA);
      });
  }

  // if (that.highlightedProcessName) {
  //   let timingsColor = 'rgba(0, 85, 255, 1)';
  //   let lastTimingColor = 'rgba(0, 50, 150, 1)';
  //   that.processes
  //     .filter(p => p.prefix != that.highlightedProcessName)
  //     .forEach(p => drawTimingsOfProcess(p, timingsColor, lastTimingColor));

  //   let highlightedProcess = that.processes.find(p => p.prefix == that.highlightedProcessName);
  //   if (highlightedProcess) {
  //     timingsColor = 'rgba(190, 0, 20, 1)';
  //     lastTimingColor = 'rgba(140, 0, 15, 1)';
  //     drawTimingsOfProcess(highlightedProcess, timingsColor, lastTimingColor);
  //   }
  // } else {
  //   let timingsColor = 'rgba(0, 85, 255, 1)';
  //   let lastTimingColor = 'rgba(0, 50, 150, 1)';
  //   that.processes.forEach(p => drawTimingsOfProcess(p, timingsColor, lastTimingColor));
  // }

  if (that.highlightedProcessNode) {
    let timingsColor = 'rgba(0, 85, 255, 1)';
    let lastTimingColor = 'rgba(0, 50, 150, 1)';
    // that.processes
    //   .filter(p => p.prefix != that.highlightedProcessName)
    //   .forEach(p => drawTimingsOfProcess(p, timingsColor, lastTimingColor));
    drawTimingsOfProcessNode(that.processNode, timingsColor, lastTimingColor, that.highlightedProcessNode);

    timingsColor = 'rgba(190, 0, 20, 1)';
    lastTimingColor = 'rgba(140, 0, 15, 1)';
    drawTimingsOfProcessNode(that.highlightedProcessNode, timingsColor, lastTimingColor);
  } else {
    let timingsColor = 'rgba(0, 85, 255, 1)';
    let lastTimingColor = 'rgba(0, 50, 150, 1)';
    //that.processes.forEach(p => drawTimingsOfProcess(p, timingsColor, lastTimingColor));
    drawTimingsOfProcessNode(that.processNode, timingsColor, lastTimingColor);
  }

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

// function handleTimings(timingsByCategories) {
//   let timingsByCategoriesByPrefixes = {}; // obj[cat][prefix] = {prefix:"...",timings:[], lastTiming:{...}}
// 
//   Object.keys(timingsByCategories).forEach(key => {
//     let byPrefixes = {};
//     timingsByCategoriesByPrefixes[key] = byPrefixes;
// 
//     let thisTimingsByDays = my.timings[key];
//     for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
//       let eachTimingDay = thisTimingsByDays[i];
//       let dt = eachTimingDay.date;
//       if (eachTimingDay === undefined || eachTimingDay.timings === undefined) {
//         continue; // TODO fix
//       }
//       eachTimingDay.timings.forEach(t => {
//         let prefix = t.name;
//         if (t.name.includes("(")) {
//           prefix = t.name.slice(0, t.name.indexOf("("));
//         }
//         prefix = prefix.trim();
//         if (!byPrefixes.hasOwnProperty(prefix)) {
//           byPrefixes[prefix] = {
//             prefix: prefix,
//             timings: []
//           };
//         }
//         byPrefixes[prefix].timings.push(t);
// 
//         let d = timingDateArrays2Date(dt, t.from);
//         t.fromdate = d;
//       });
//     }
//   });
//   Object.keys(timingsByCategoriesByPrefixes).forEach(key => {
//     let byPrefixes = timingsByCategoriesByPrefixes[key];
//     Object.keys(byPrefixes).forEach(prefix => {
//       let timings = byPrefixes[prefix].timings;
//       timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
//       let previousTiming = timings[0];
//       let i = 1;
//       while (i < timings.length) {
//         let timing = timings[i];
//         let diff = timing.fromdate.getTime() - previousTiming.fromdate.getTime();
//         previousTiming.millisUntilNext = diff;
//         timing.millisFromPrevious = diff;
//         previousTiming = timing;
//         i++;
//       }
//       let lastTiming = timings[timings.length - 1];
//       let now = new Date();
//       let millisUntilNow = now.getTime() - lastTiming.fromdate.getTime();
//       lastTiming.millisUntilNow = millisUntilNow;
//       lastTiming.millisUntilNext = millisUntilNow;
//       byPrefixes[prefix].lastTiming = lastTiming;
//     });
//   });
//   return timingsByCategoriesByPrefixes;
// }

function resetMillisUntilNextForProcessNode(processNode, selectedProcessNode) {
  //console.log("[start] resetMillisUntilNextForProcessNode");
  setMillisUntilNextForProcessNode(processNode, selectedProcessNode);
  setMillisUntilNextForEachTimingInSelectedProcess(selectedProcessNode);
  //console.log("[end] resetMillisUntilNextForProcessNode");
}

function setMillisUntilNextForEachTimingInSelectedProcess(processNode) {
  //console.log("[start] setMillisUntilNextForEachTimingInSelectedProcess");
  function collectTimings(processNode) {
    let timingsOfChildren = [];
    if (processNode.children.length > 0) {
      timingsOfChildren =
        processNode.children
          .map(n => collectTimings(n))
          .reduce((a, b) => a.concat(b));
    }
    return processNode.timings.concat(timingsOfChildren);
  }
  let timings = collectTimings(processNode);
  timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  setMillisUntilNextForEachTiming(timings);
  //console.log("[end] setMillisUntilNextForEachTimingInSelectedProcess");
}

function setMillisUntilNextForEachTiming(timings) {
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
}

function setMillisUntilNextForProcessNode(processNode, selectedProcessNode) {
  //console.log("[start] setMillisUntilNextForProcessNode");
  if (processNode.timings.length > 0) {
    setMillisUntilNextForEachTiming(processNode.timings);
  }
  processNode.children
    .filter((childProcessNode) => childProcessNode !== selectedProcessNode)
    .forEach((childProcessNode) => setMillisUntilNextForProcessNode(childProcessNode, selectedProcessNode));
  //console.log("[end] setMillisUntilNextForProcessNode");
}

function sortTimings(processNode) {
  if (processNode.timings.length > 0) {
    processNode.timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  }
  processNode.children.forEach((childProcessNode) => sortTimings(childProcessNode));
}


function handleTimings(timingsByCategories, timingsBySubcategoriesTree) {
  if (timingsBySubcategoriesTree === undefined) {
    timingsBySubcategoriesTree = {}; // obj.childrenByName[subCategoryName].childrenByName[subCategoryName] = {timings: []}

    timingsBySubcategoriesTree.name = "all";
    timingsBySubcategoriesTree.childrenByName = {};
    timingsBySubcategoriesTree.children = [];
    timingsBySubcategoriesTree.timings = [];
  }

  // populate each timing's fromdate field
  Object.keys(timingsByCategories).forEach(key => {
    let thisTimingsByDays = timingsByCategories[key];
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      eachTimingDay.timings.forEach(t => {
        let d = timingDateArrays2Date(dt, t.from);
        t.fromdate = d;
      });
    }
  });

  Object.keys(timingsByCategories).forEach(key => {
    let categoryRootNode = timingsBySubcategoriesTree.childrenByName[key];
    if (categoryRootNode === undefined) {
      categoryRootNode = {
        name: key,
        children: [],
        childrenByName: {},
        timings: []
      };
      timingsBySubcategoriesTree.childrenByName[key] = categoryRootNode;
      timingsBySubcategoriesTree.children.push(categoryRootNode);
    }
    let node = categoryRootNode;

    let thisTimingsByDays = timingsByCategories[key];

    for (let i = thisTimingsByDays.length - 1; i >= 0 ; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      eachTimingDay.timings.forEach(t => {
        node = categoryRootNode;
        let yamlValue = t.value;
        if (yamlValue.constructor !== Array) {
          throw Error("wrong format: timing's categories should be list-typed");
        }
        for (let index = 0; index < yamlValue.length; index++) {
          let item = yamlValue[index];
          if (item.constructor === Object) {
            let keys = Object.keys(item);
            if (keys.length !== 1 || index !== (yamlValue.length - 1)) {
              throw Error("wrong format: all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}). day: " + eachTimingDay.date);
            }
            let propName = keys[0];
            let propValue = item[propName];
            if (!node.childrenByName[propName]) {
              let newNode = {
                name: propName,
                children: [],
                childrenByName: {},
                timings: []
              };
              node.childrenByName[propName] = newNode;
              node.children.push(newNode);
            }
            node = node.childrenByName[propName];
            t.info = propValue;
          } else {
            if (!node.childrenByName[item]) {
              let newNode = {
                name: item,
                children: [],
                childrenByName: {},
                timings: []
              };
              node.childrenByName[item] = newNode;
              node.children.push(newNode);
            }
            node = node.childrenByName[item];
          }
        }
        node.timings.push(t);
      });
    }
  });
  sortTimings(timingsBySubcategoriesTree);
  setMillisUntilNextForProcessNode(timingsBySubcategoriesTree);
  return timingsBySubcategoriesTree;
}

function ProcessesSubcategoriesViewBuilder() {
  this.subtreesByName = {};
  this.htmls = [];
  this.views = [];
  this.viewsByName = {};
  this.htmlChildrenContainerUl = document.createElement('ul');
}

ProcessesSubcategoriesViewBuilder.prototype.buildViews = function(timingsBySubcategoriesTree) {
  let that = this;
  that.addSubtree(timingsBySubcategoriesTree);
  for (let subtree of timingsBySubcategoriesTree.children) {
    that.addSubtree(subtree);
  }
};

ProcessesSubcategoriesViewBuilder.prototype.addSubtree = function(timingsBySubcategoriesSubtree) {
  console.log("ProcessesSubcategoriesViewBuilder.prototype.addSubtree. name: " + timingsBySubcategoriesSubtree.name);
  let that = this;
  let htmls = that.htmls;
  let views = that.views;
  let oldChild = that.viewsByName[timingsBySubcategoriesSubtree.name];
  if (oldChild !== undefined) {
    console.log("ProcessesSubcategoriesViewBuilder.prototype.addSubtree. about to invoke oldChild.mergeWithNewTimings()");
    oldChild.mergeWithNewTimings(timingsBySubcategoriesSubtree);
    oldChild.hGraphic.redraw();
  } else {
    console.log("ProcessesSubcategoriesViewBuilder.prototype.addSubtree. oldChild is undefined.");
    that.subtreesByName[timingsBySubcategoriesSubtree.name] = timingsBySubcategoriesSubtree;
    let treeView = new ProcessCategoryNodeView(timingsBySubcategoriesSubtree);
    views.push(treeView);
    treeView.buildAsHtmlLiElement();
    treeView.hGraphic.redraw();
    htmls.push(treeView.html);
    that.viewsByName[timingsBySubcategoriesSubtree.name] = treeView;

    that.htmlChildrenContainerUl.appendChild(treeView.html);
  }
};

ProcessesSubcategoriesViewBuilder.prototype.getResultHtml = function() {
  let that = this;
  return withChildren(that.htmlChildrenContainerUl,
    ...that.htmls
  );
};

ProcessesSubcategoriesViewBuilder.prototype.getHtmlElements = function() {
  return this.htmls;
};

ProcessesSubcategoriesViewBuilder.prototype.getProcessesForestViews = function() {
  return this.views;
};

function ProcessSubcategoryNodeView(processNode, hGraphic, rootNodeView) {
  let that = this;
  that.processNode = processNode;
  that.hGraphic = hGraphic;
  that.rootNodeView = rootNodeView;
  that.name = processNode.name;
  that.isCollapsed = false;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.children = processNode.children.map(childNode => new ProcessSubcategoryNodeView(childNode, hGraphic, rootNodeView));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.htmlChildrenContainerUl = document.createElement('ul');
}

ProcessSubcategoryNodeView.prototype.getRoot = function() {
  let that = this;
  if (that.rootNodeView !== undefined) {
    return that.rootNodeView;
  } else {
    return that;
  }
};

ProcessSubcategoryNodeView.prototype.findSubtreeByViewState = function(viewState) {
  let that = this;
  if (that.viewState === viewState) {
    return that;
  }
  for (let child of that.children) {
    let foundInChild = child.findSubtreeByViewState(viewState);
    if (foundInChild !== undefined) {
      return foundInChild;
    }
  }
  return undefined;
};

ProcessSubcategoryNodeView.prototype.mergeWithNewTimings = function(processNode) {
  let that = this;
  that.processNode = processNode;
  processNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = new ProcessSubcategoryNodeView(childNode, that.hGraphic);
      newChildView.buildAsHtmlLiElement();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
      that.htmlChildrenContainerUl.appendChild(newChildView.html);
    } else {
      oldChild.mergeWithNewTimings(childNode);
    }
  });
};

ProcessSubcategoryNodeView.prototype.highlightTree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED;
  that.html.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

ProcessSubcategoryNodeView.prototype.highlightSubtree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.html.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

ProcessSubcategoryNodeView.prototype.unhighlightTree = function() {
  let that = this;
  that.isUnhighlighted = true;
  that.viewState = TimingsCategoryNodeViewState.UNHIGHLIGHTED;
  that.html.classList.add('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.unhighlightTree();
  }
};

ProcessSubcategoryNodeView.prototype.name2html = function() {
  let that = this;
  let a = document.createElement('a');
  a.onclick = function() {
    let viewState = that.viewState;
    if (viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
      that.getRoot().unhighlightTree();
      that.highlightTree();
      // let categoryFullName = that.timingsCategoryNode.fullName();
      // my.highlightedCategory = categoryFullName;
      // displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);
      if (that.hGraphic) {
        that.hGraphic.highlightProcess(that.processNode);
      }

      console.log("a.onclick. categoryFullName: " + categoryFullName);

      // let trs = document.getElementsByClassName("timing-row-parent-li");
      // for (let i=0; i < trs.length; i++) {
      //   trs[i].classList.add('greyed-out');
      //   trs[i].classList.remove('extra-unhighlighted');
      // }
      // let timingTextViews = that.getTimingTextViewsRecursively();
      // for (let i=0; i < timingTextViews.length; i++) {
      //   timingTextViews[i].classList.remove('greyed-out');
      //   timingTextViews[i].classList.remove('extra-unhighlighted');
      // }

      // function unhighlight() {
      //   // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was UNHIGHLIGHTED)");
      //   if (my.highlightedCategory !== undefined
      //     && my.highlightedCategory.length > 0
      //     && !that.isHighlighted()) {
      //     a.removeEventListener('mouseleave', unhighlight);
      //     return;
      //   }
      //   // displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
      //   
      //   if (that.hGraphic) {
      //     that.hGraphic.redraw();
      //   }
      //   a.removeEventListener('mouseleave', unhighlight);
      // }
      // a.addEventListener('mouseleave', unhighlight)

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED) {

      that.viewState = TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED;
      if (that.hGraphic) {
        that.hGraphic.selectProcess(that.processNode);
      }
      // let trs = document.getElementsByClassName("timing-row-parent-li");
      // for (let i=0; i < trs.length; i++) {
      //   trs[i].classList.add('extra-unhighlighted');
      // }
      // let timingTextViews = that.getTimingTextViewsRecursively();
      // console.log("a.onlick. timingTextViews.length: " + timingTextViews.length);
      // for (let i=0; i < timingTextViews.length; i++) {
      //   timingTextViews[i].classList.remove('greyed-out');
      //   timingTextViews[i].classList.remove('extra-unhighlighted');
      // }

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
      that.getRoot().unhighlightTree();
      that.highlightTree();
      if (that.hGraphic) {
        that.hGraphic.highlightProcess(that.processNode);
      }
      // let categoryFullName = that.timingsCategoryNode.fullName();
      // my.highlightedCategory = categoryFullName;
      // displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

      // console.log("a.onclick. categoryFullName: " + categoryFullName);

      // let trs = document.querySelectorAll(".timing-row-parent-li:not(.greyed-out)");
      // for (let i=0; i < trs.length; i++) {
      //   trs[i].classList.add('greyed-out');
      // }
      // let timingTextViews = that.getTimingTextViewsRecursively();
      // for (let i=0; i < timingTextViews.length; i++) {
      //   timingTextViews[i].classList.remove('greyed-out');
      // }

      // function unhighlight() {
      //   // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was HIGHLIGHTED_AS_CHILD)");
      //   if (my.highlightedCategory !== undefined
      //     && my.highlightedCategory.length > 0
      //     && !that.isHighlighted()) {
      //     a.removeEventListener('mouseleave', unhighlight);
      //     return;
      //   }
      //   // // my.highlightedCategory = [];
      //   // displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
      //   if (that.hGraphic) {
      //     that.hGraphic.redraw();
      //   }
      //   // for (let i=0; i < trs.length; i++) {
      //   //   trs[i].classList.remove('greyed-out');
      //   // }
      //   a.removeEventListener('mouseleave', unhighlight);
      // }
      // a.addEventListener('mouseleave', unhighlight)
    } else if (viewState === TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED) {
      that.getRoot().highlightTree();
      if (that.hGraphic) {
        setMillisUntilNextForProcessNode(that.processNode);
        that.hGraphic.highlightProcess(that.processNode);
      }
      // my.highlightedCategory = [];
      // let categoryFullName = that.timingsCategoryNode.fullName();
      // displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

      // let allTimingTextViews = that.getRoot().getTimingTextViewsRecursively();
      // for (let i=0; i < allTimingTextViews.length; i++) {
      //   allTimingTextViews[i].classList.add('greyed-out');
      //   allTimingTextViews[i].classList.remove('extra-unhighlighted');
      // }
      // let timingTextViews = that.getTimingTextViewsRecursively();
      // for (let i=0; i < timingTextViews.length; i++) {
      //   timingTextViews[i].classList.remove('greyed-out');
      // }
      function unhighlight() {
        // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was EXTRA_HIGHLIGHTED)");
        // if (my.highlightedCategory !== undefined
        //   && my.highlightedCategory.length > 0
        //   && !that.isHighlighted()) {
        //   a.removeEventListener('mouseleave', unhighlight);
        //   return;
        // }
        // // my.highlightedCategory = [];
        // displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
        // for (let i=0; i < allTimingTextViews.length; i++) {
        //   allTimingTextViews[i].classList.remove('greyed-out')
        // }
        if (that.hGraphic) {
          delete that.hGraphic.highlightedProcessNode;
          that.hGraphic.redraw();
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
    if (that.hGraphic) {
      if (that.hGraphic.highlightedProcessNode !== undefined
         && that.viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
        return;
      }
      that.hGraphic.highlightProcess(that.processNode);
    }
    // if (my.highlightedCategory !== undefined
    //    && my.highlightedCategory.length > 0
    //    && !that.isHighlighted()) {
    //   return;
    // }
    // let categoryFullName = that.timingsCategoryNode.fullName();
    // // my.highlightedCategory = categoryFullName;
    // displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

    // console.log("a.onmouseenter. categoryFullName: " + categoryFullName);

    // let trs = document.getElementsByClassName("timing-row-parent-li");
    // let trsHighlighted = document.querySelectorAll(".timing-row-parent-li:not(.greyed-out)");
    // for (let i=0; i < trs.length; i++) {
    //   trs[i].classList.add('greyed-out');
    // }
    // let timingTextViews = that.getTimingTextViewsRecursively();
    // for (let i=0; i < timingTextViews.length; i++) {
    //   timingTextViews[i].classList.remove('greyed-out');
    // }
    function unhighlight() {
      console.log("TimingsCategoryNodeView.onmouseenter unhighlight");

      // let noCategoryIsHighlighted =
      //   my.highlightedCategory === undefined ||
      //   my.highlightedCategory.length === 0;

      // if (noCategoryIsHighlighted) {
      //   displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
      //   for (let i=0; i < trs.length; i++) {
      //     trs[i].classList.remove('greyed-out');
      //     trs[i].classList.remove('extra-unhighlighted');
      //   }
      // } else
      if (that.viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
        // for (let i=0; i < timingTextViews.length; i++) {
        //   timingTextViews[i].classList.add('greyed-out');
        // }
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED ||
                 that.viewState === TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED) {
        // do nothing
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
        if (that.hGraphic) {
          let highlightedViewNode = that.getRoot().findSubtreeByViewState(TimingsCategoryNodeViewState.HIGHLIGHTED);
          if (highlightedViewNode === undefined || highlightedViewNode === that.getRoot()) {
            delete that.hGraphic.highlightedProcessNode;
            that.hGraphic.redraw();
          } else {
            that.hGraphic.highlightProcess(highlightedViewNode.processNode);
          }
          // that.hGraphic.redraw();
        }
        // displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
        // for (let i=0; i < trsHighlighted.length; i++) {
        //   trsHighlighted[i].classList.remove('greyed-out');
        // }
      } else {
        window.webkit.messageHandlers.timings_summary_msgs.postMessage(
          "TimingsCategoryNodeView.onmousemove. unexpected viewState (expected a member of TimingsCategoryNodeViewState enum): " + that.viewState);
      }
      a.removeEventListener('mouseleave', unhighlight);
    }
    a.addEventListener('mouseleave', unhighlight)
  };
  if (that.name.includes("\n")) {
    // let elem = withChildren(document.createElement('div'),
    //              ...that.name.split("\n")
    //                          .map(line => document.createTextNode(line))
    //                          .flatMap(el => [el,document.createElement("br")])
    //                          .slice(0, -1)
    //            );
    // elem.onclick = clickHandler;
    // elem.onmouseover = hoverHandler;
    // return elem;

    // let timingsCount = that.timingsCategoryNode.timingsCountRecursive;
    return
      withChildren(a,
        withChildren(document.createElement('div'),
          ...that.name.split("\n")
                      .map(line => document.createTextNode(line))
                      .flatMap(el => [el,document.createElement("br")])
                      .slice(0, -1)
                      //.concat(document.createTextNode(" (" + timingsCount + ")"))
        )
      );
  } else {
    // let elem = withChildren(document.createElement('span'),
    //              document.createTextNode(that.name)
    //            );
    // elem.onclick = clickHandler;
    // elem.onmouseover = hoverHandler;
    // return elem;

    //let timingsCount = that.timingsCategoryNode.timingsCountRecursive;
    return withChildren(a,
            // document.createTextNode(that.name + " (" + timingsCount + ")")
            document.createTextNode(that.name)
          );
  }
}

ProcessSubcategoryNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;
  if (that.children.length == 0) {
    let htmlElement = withClass(withChildren(document.createElement('li'), that.name2html()), 'proc-leaf');
    that.html = htmlElement;
    return;
  }

  if (that.html !== undefined) {
    for (let childNode of that.children) {
      if (childNode.html !== undefined) {
        continue;
      } else {
        childNode.buildAsHtmlLiElement();
        that.htmlChildrenContainerUl.appendChild(childNode.html);
      }
    }
  } else {
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
        withChildren(that.htmlChildrenContainerUl,
          ...that.children.map(childNode => childNode.html)
        )
      );
    that.html = htmlElement;
  }
};

ProcessSubcategoryNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

ProcessSubcategoryNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    that.uncollapse();
  } else {
    that.collapse();
  }
};

ProcessSubcategoryNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (that.html.classList.contains("proc-node-open")) {
    that.html.classList.remove("proc-node-open");
    that.html.classList.add("proc-node-closed");
  }
};

ProcessSubcategoryNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html.classList.contains("proc-node-closed")) {
    that.html.classList.remove("proc-node-closed");
    that.html.classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
};

ProcessSubcategoryNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
};

ProcessSubcategoryNodeView.prototype.hide = function() {
  let that = this;
  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  }
  that.html.style.display = 'none';
  that.children.forEach(childView => childView.hide());
};

ProcessSubcategoryNodeView.prototype.unhide = function() {
  let that = this;

  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  } else {
    that.html.style.display = that.oldDisplay;
  }
  that.children.forEach(childView => childView.unhide());
};

// ProcessSubcategoryNodeView.prototype.highlightTree = function(nodeToHighlight) {
//   let that = this;
// 
//   if (that.html.style.display != 'none') {
//     that.oldDisplay = that.html.style.display;
//   } else {
//     that.html.style.display = that.oldDisplay;
//   }
// 
//   if (nodeToHighlight.children.length == 0) {
//     if (!that.isLeaf()) {
//       if (!that.isCollapsed) {
//         that.collapse();
//       }
//       that.children.forEach(childView => childView.parentIsHighlighted());
//     }
//   } else {
//     if (!that.isLeaf()) {
//       if (that.isCollapsed) {
//         that.uncollapse();
//       }
//       nodeToHighlight.children.forEach(childNodeToHighlight => {
//         if (that.childrenByName.hasOwnProperty(childNodeToHighlight.name)) {
//           that.childrenByName[childNodeToHighlight.name].highlightTree(childNodeToHighlight);
//         }
//       });
//     }
//   }
// };

ProcessSubcategoryNodeView.prototype.parentIsHighlighted = function() {
  let that = this;
  that.unhide();
  if (!that.isCollapsed) {
    that.collapse();
  }
};

function ProcessCategoryNodeView(processNode) {
  let that = this;
  that.processNode = processNode;
  that.name = processNode.name;
  that.isCollapsed = false;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.currentPeriod = createCurrentPeriodInitial();
  that.htmlSpanPeriodInfo = createHtmlSpanPeriodInfo(that.currentPeriod);
  that.hGraphic = new TimingsHistogramsGraphic(processNode);
  that.children = processNode.children.map(childNode => new ProcessSubcategoryNodeView(childNode, that.hGraphic, that));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.htmlChildrenContainerUl = document.createElement('ul');
}

for (let propName in ProcessSubcategoryNodeView.prototype) {
  ProcessCategoryNodeView.prototype[propName] = ProcessSubcategoryNodeView.prototype[propName];
}

ProcessCategoryNodeView.prototype.mergeWithNewTimings = function(processNode) {
  let that = this;
  that.processNode = processNode;
  processNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = new ProcessSubcategoryNodeView(childNode, that.hGraphic);
      newChildView.buildAsHtmlLiElement();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
      that.htmlChildrenContainerUl.appendChild(newChildView.html);
    } else {
      oldChild.mergeWithNewTimings(childNode);
    }
  });
};

function createCurrentPeriodInitial() {
  let dateTo = new Date();

  let dateFrom = new Date();

  let millisInWeek = 7*24*60*60*1000;
  dateFrom.setTime(dateFrom.getTime() - millisInWeek);

  return {
    from: dateFrom,
    to: dateTo
  };
}

function createHtmlSpanPeriodInfo(initialPeriod) {
  return withChildren(document.createElement('span'),
    document.createTextNode(periodInfoText(initialPeriod))
  )
}

function periodInfoText(period) {
  let that = this;
  let fromDateStr = date2TimingDateStr(period.from)
  let toDateStr = date2TimingDateStr(period.to)
  let periodInfoText = "period: " + fromDateStr + " - " + toDateStr;
  return periodInfoText;
}

function requestTimingsForPeriod(periodFrom, periodTo) {
  return new Promise((resolve, reject) => {
    window.webkit.messageHandlers.timings_frequencies_msgs__timings_for_period.postMessage(
      date2TimingDateStr(periodFrom) +
      " - " +
      date2TimingDateStr(periodTo)
    );
    my.timingsQueryResponseCallback = function(timings) {
      resolve(timings);
    };
  });
};

ProcessCategoryNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;
  // if (that.children.length == 0) {
  //   let htmlElement = withClass(withChildren(document.createElement('li'), that.name2html()), 'proc-leaf');
  //   that.html = htmlElement;
  //   return;
  // }

  if (that.html !== undefined) {
    for (let childNode of that.children) {
      if (childNode.html !== undefined) {
        continue;
      }
      childNode.buildAsHtmlLiElement();
      that.htmlChildrenContainerUl.appendChild(childNode.html);
    }
  } else {
    let hGraphic = that.hGraphic;
    hGraphic.initCanvas();
    hGraphic.redraw();

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
          withChildren(document.createElement('div'),
            that.name2html(),
            that.buildPeriodButtonsRow(),
            withChildren(document.createElement('div'),
              hGraphic.elem
            )
          )
        ),
        withChildren(that.htmlChildrenContainerUl,
          ...that.children.map(childNode => childNode.html)
        )
      );
    that.html = htmlElement;
  }
};

ProcessCategoryNodeView.prototype.buildPeriodButtonsRow = function() {
  let that = this;
  function buttonWithText(text) {
    let btn = document.createElement('button');
    return withChildren(btn, document.createTextNode(text));
  }
  let btnPlusHalfYear = buttonWithText('+6months');
  let btnPlusMonth = buttonWithText('+month');
  btnPlusHalfYear.onclick = function() {
    console.log('+6months');
    let oldPeriodFrom = that.currentPeriod.from;
    let newPeriodFrom = new Date();
    let millisInMonth = 6*30*24*60*60*1000;
    newPeriodFrom.setTime(oldPeriodFrom.getTime() - millisInMonth);
    that.currentPeriod.from = newPeriodFrom;
    that.htmlSpanPeriodInfo.innerHTML = periodInfoText(that.currentPeriod);
    requestTimingsForPeriod(newPeriodFrom, oldPeriodFrom).then(timings => {
      console.log('btnPlusHalfYear.onclick timings keys:');
      console.dir(Object.keys(timings));
      my.timings = handleTimings(timings, my.timings);
      my.viewBuilder.buildViews(my.timings);
    }).catch(err => {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
        "btnPlusHalfYear.onclick err: " + err);
    });
  };
  btnPlusMonth.onclick = function() {
    console.log('+month');
    let oldPeriodFrom = that.currentPeriod.from;
    let newPeriodFrom = new Date();
    let millisInMonth = 30*24*60*60*1000;
    newPeriodFrom.setTime(oldPeriodFrom.getTime() - millisInMonth);
    that.currentPeriod.from = newPeriodFrom;
    that.htmlSpanPeriodInfo.innerHTML = periodInfoText(that.currentPeriod);
    requestTimingsForPeriod(newPeriodFrom, oldPeriodFrom).then(timings => {
      console.log('btnPlusMonth.onclick timings keys:');
      console.dir(Object.keys(timings));
      my.timings = handleTimings(timings, my.timings);
      my.viewBuilder.buildViews(my.timings);
    }).catch(err => {
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
        "btnPlusMonth.onclick err: " + err);
    });
  };
  return withChildren(document.createElement('div'),
    btnPlusHalfYear,
    btnPlusMonth,
    that.htmlSpanPeriodInfo
  );
};

function mergeTimings(timingsA, timingsB) {
  return timingsB;
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

function date2TimingDateStr(dt) {
  return date2timingDateArray(dt).join(".");
}