const { TimingsCategoryNodeViewState } = require('../timings/categories/node_view_state.js');
const { withChildren } = require('../html_utils.js');

export function TimingsHistogramsGraphic(processNode) {
  // old comment: processes[n] = {prefix:"...",timings:[], lastTiming:{...}}
  // processNode = {name: "", children: [], childrenByName: {}, timings: []}
  this.setProcessNode(processNode);
  this.rangeX = {from: 0, to: 100};
  this.rangeY = {from: 0, to: 100};
  this.rangeXpercentage = {from: 0, to: 100};
  this.rangeYpercentage = {from: 0, to: 100};
  this.distortionX = {a: 0, b: 1, c: 0};
  this.distortionY = {a: 1};
  this.scrollbarBreadth = 20;
  this.canvas = null; // invoke initCanvas()
  //this.highlightedProcessName = null; // invoke highlightProcess
  this.highlightedProcessNode = null;
  this.highlightedProcessNodeViewState = null;
  this.highlightedSubprocessOfSelectedProcessNode = null; // invoke highlightSubprocessOfSelectedProcessNode
}

TimingsHistogramsGraphic.prototype.setProcessNode = function(processNode) {
  let that = this;
  that.processNode = processNode;
  that.highlightedSubprocessOfSelectedProcessNode = null;

  // let now = new Date();
  let now = window.my.now;

  let oldestRecordMillis = findMaxRecursive(that.processNode, 0, (timings) => {
    if (timings.length == 0) {
      return 0;
    } else {
      return findMax(0, timings.map(t => now.getTime() - t.fromdate.getTime()));
    }
  });

  that.oldestRecordMillis = oldestRecordMillis;

  let maxWavelength = findMaxRecursive(that.processNode, 0, (timings) => {
    return findMax(0, timings.map(t => t.millisUntilNext));
  });

  that.maxWavelength = maxWavelength;
}

TimingsHistogramsGraphic.prototype.setRangeXFrom = function(from) {
  if (from < 0) {
    this.rangeX.from = 0;
    this.rangeXpercentage.from = 0;
  } else {
    this.rangeX.from = from;
    let maxX = this.canvas.width - this.scrollbarBreadth;
    let fromPercentage = from * 100.0 / maxX;
    this.rangeXpercentage.from = fromPercentage;
  }
};
TimingsHistogramsGraphic.prototype.setRangeXTo = function(to) {
  let maxX = this.canvas.width - this.scrollbarBreadth;
  if (to > maxX) {
    this.rangeX.to = maxX;
    this.rangeXpercentage.to = 100.0;
  } else {
    this.rangeX.to = to;
    let toPercentage = to * 100.0 / maxX;
    this.rangeXpercentage.to = toPercentage;
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

  let fromPercentage = newFrom * 100.0 / maxX;
  let toPercentage = newTo * 100.0 / maxX;

  this.rangeXpercentage.from = fromPercentage;
  this.rangeXpercentage.to = toPercentage;
};

TimingsHistogramsGraphic.prototype.setRangeYFrom = function(from) {
  if (from < 0) {
    this.rangeY.from = 0;
    this.rangeYpercentage.from = 0;
  } else {
    this.rangeY.from = from;
    let maxY = this.canvas.height - this.scrollbarBreadth;
    let fromPercentage = from * 100.0 / maxY;
    this.rangeYpercentage.from = fromPercentage;
  }
};
// TimingsHistogramsGraphic.prototype.translateAndSetRangeYTo = function(to) {
//   let that = this;
//   let diff = that.translateVerticalScrollbarRangeToPixels() - to;
//   console.log(`[translateAndSetRangeYTo] rangeY.to: ${that.rangeY.to}, diff: ${diff}`);
//   that.setRangeYTo(that.rangeY.to - diff);
// };
TimingsHistogramsGraphic.prototype.setRangeYTo = function(to) {
  let maxY = this.canvas.height - this.scrollbarBreadth;
  if (to > maxY) {
    this.rangeY.to = maxY;
    this.rangeYpercentage.to = 100.0;
  } else {
    if (to < 0) {
      return;
    }
    this.rangeY.to = to;
    let maxY = this.canvas.height - this.scrollbarBreadth;
    let toPercentage = to * 100.0 / maxY;
    this.rangeYpercentage.to = toPercentage;
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

  let fromPercentage = newFrom * 100.0 / maxY;
  let toPercentage = newTo * 100.0 / maxY;

  this.rangeYpercentage.from = fromPercentage;
  this.rangeYpercentage.to = toPercentage;
};

TimingsHistogramsGraphic.prototype.highlightProcess = function(processNode, processNodeViewState) {
  this.highlightedProcessNode = processNode;
  this.highlightedProcessNodeViewState = processNodeViewState;
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

TimingsHistogramsGraphic.prototype.handleCanvasContainerResize = function(newWidth, newHeight) {
  let that = this;
  that.canvas.width = newWidth;
  that.canvas.height = newHeight;
  // that.canvas.style.width = `${newWidth}px`;
  // that.canvas.style.height = `${newHeight}px`;
  that.canvasWidth = newWidth;
  that.canvasHeight = newHeight;

  let workAreaWidth = newWidth - that.scrollbarBreadth;
  let workAreaHeight = newHeight - that.scrollbarBreadth;

  that.rangeX.from = workAreaWidth * that.rangeXpercentage.from / 100.0;
  that.rangeX.to = workAreaWidth * that.rangeXpercentage.to / 100.0;

  that.rangeY.from = workAreaHeight * that.rangeYpercentage.from / 100.0;
  that.rangeY.to = workAreaHeight * that.rangeYpercentage.to / 100.0;

  that.redraw();
};

TimingsHistogramsGraphic.prototype.initCanvas = function(bottomHalfOfPage) {
  let that = this;
  that.refreshRanges();
  let canvas = document.createElement("canvas");
  canvas.setAttribute('id', 'canvas');
  let canvasWidth = 800;
  let canvasHeight = 400;
  // canvas.width = canvasWidth;
  // canvas.height = canvasHeight;
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
    enterDragModeVResizeBottom: function(position) {
      this.resetDragModes();
      this.isInDragModeVResizeBottom = true;
      this.dragModeStartedAt = position;
      this.dragModeStartedAtRange = Object.assign({}, that.rangeY);
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
        let canvasRect = that.getCanvasPosition();
        let offsetY = eve.clientY - canvasRect.top;

        canvasMouseState.enterDragModeVResizeBottom(offsetY);
        document.documentElement.addEventListener('mouseup', canvasMouseUp);
        document.documentElement.addEventListener('mousemove', canvasMouseMove);

        bottomHalfOfPage.style.userSelect = 'none';
        bottomHalfOfPage.style.pointerEvents = 'none';
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

      bottomHalfOfPage.style.removeProperty('user-select');
      bottomHalfOfPage.style.removeProperty('pointer-events');
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

        bottomHalfOfPage.style.removeProperty('user-select');
        bottomHalfOfPage.style.removeProperty('pointer-events');
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
        let diff = offsetY - canvasMouseState.dragModeStartedAt;
        let startRange = canvasMouseState.dragModeStartedAtRange
        let graphicHeight = that.canvasHeight - that.scrollbarBreadth;
        let to;
        if (diff < 0 && startRange.to < graphicHeight) {
          to = startRange.to + diff * startRange.to / graphicHeight;
        } else {
          to = startRange.to + diff;
        }
        // let yRatio = graphicHeight * 1.0 / that.maxWavelength
        // let to = startRange.to + diff * (yRatio < 1 && yRatio > 0 ? yRatio : 1);
        // let to = startRange.to + diff;
        // // that.translateAndSetRangeYTo(offsetY);
        // console.log(`setRangeYTo: to: ${to}`);
        that.setRangeYTo(to);
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
            // withinRangeOf(offsetY, that.translateVerticalScrollbarRangeToPixels(), 5);
            // withinRangeOf(offsetY, that.rangeY.to, 5);
            withinRangeOf(offsetY, that.canvasHeight - that.scrollbarBreadth, 5);

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

  this.elem = canvas;
  // this.elem = withChildren(document.createElement('div')
  //   , canvas
  //   , that.buildDistortionButtonsPanel()
  //   // , buttonsPanel
  // );
};

// TimingsHistogramsGraphic.prototype.setDistortionXa = function(newValue) {
//   this.distortionX.a = newValue;
// };
// TimingsHistogramsGraphic.prototype.setDistortionXb = function(newValue) {
//   this.distortionX.b = newValue;
// };
// TimingsHistogramsGraphic.prototype.setDistortionXc = function(newValue) {
//   this.distortionX.c = newValue;
// };
// 
// TimingsHistogramsGraphic.prototype.setDistortionY = function(newValue) {
//   this.distortionY.a = newValue;
// };
// 
// TimingsHistogramsGraphic.prototype.buildDistortionButtonsPanel = function() {
//   let that = this;
// 
//   let inputDistortionXa = document.createElement('input');
//   inputDistortionXa.type = 'text';
//   inputDistortionXa.value = that.distortionX.a;
// 
//   let inputDistortionXb = document.createElement('input');
//   inputDistortionXb.type = 'text';
//   inputDistortionXb.value = that.distortionX.b;
// 
//   let inputDistortionXc = document.createElement('input');
//   inputDistortionXc.type = 'text';
//   inputDistortionXc.value = that.distortionX.c;
// 
//   let inputDistortionY = document.createElement('input');
//   inputDistortionY.type = 'text';
//   inputDistortionY.value = that.distortionY.a;
// 
//   function addEnterListener(input, handler) {
//     input.addEventListener('keyup', (eve) => {
//       if (eve.key == 'Enter') {
//         handler(input.value);
//       }
//     });
//   }
// 
//   function setDistorionXAndRedraw() {
//     that.setDistortionXa(parseFloat(inputDistortionXa.value));
//     that.setDistortionXb(parseFloat(inputDistortionXb.value));
//     that.setDistortionXc(parseFloat(inputDistortionXc.value));
//     that.redraw();
//   }
// 
//   addEnterListener(inputDistortionXa, setDistorionXAndRedraw);
//   addEnterListener(inputDistortionXb, setDistorionXAndRedraw);
//   addEnterListener(inputDistortionXc, setDistorionXAndRedraw);
// 
//   function setDistorionYAndRedraw() {
//     that.setDistortionY(parseFloat(inputDistortionY.value));
//     that.redraw();
//   }
// 
//   addEnterListener(inputDistortionY, setDistorionYAndRedraw);
// 
//   let buttonsPanel =
//     withChildren(document.createElement('div'),
//       withChildren(document.createElement('div'),
//         withChildren(document.createElement('span'), document.createTextNode('distortion x: a:')),
//         inputDistortionXa,
//         withChildren(document.createElement('span'), document.createTextNode('b:')),
//         inputDistortionXb,
//         withChildren(document.createElement('span'), document.createTextNode('c:')),
//         inputDistortionXc
//       ),
//       withChildren(document.createElement('div'),
//         withChildren(document.createElement('span'), document.createTextNode('distortion y:')),
//         inputDistortionY
//       )
//     );
//   return buttonsPanel;
// };
TimingsHistogramsGraphic.prototype.refreshRanges = function() {
  let that = this;
  that.setProcessNode(that.processNode);
};
TimingsHistogramsGraphic.prototype.redraw = function() {
  let that = this;

  if (that.canvas === null) {
    return;
  }

  let ctx = that.canvas.getContext('2d');

  //let someProcess = that.processes[0]
  //let someTimingFromProcess = someProcess.timings[0]

  //someTimingFromProcess.millisUntilNext
  //someTimingFromProcess.millisFromPrevious
  //someProcess.lastTiming.millisUntilNow

  // let now = new Date();
  let now = window.my.now;

  //ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';
  //ctx.fillRect(xFrom, yFrom, timingItem.minutes*canvasWidth*1.0/minutesRange, 50);
  //ctx.fillRect(xFrom, yFrom, xTo, yTo);

  let oldestRecordMillis = that.oldestRecordMillis;
  let maxWavelength = that.maxWavelength;
  // let maxWavelength = findMaxRecursive(that.processNode, 0, (timings) => {
  //   return findMax(0, timings.map(t => t.millisUntilNext));
  // });

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

  // window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
  //   "canvas redraw. " +
  //   ", millisFrom: " + millisFrom +
  //   ", millisTo: " + millisTo +
  //   ", xRatio: " + xRatio +
  //   ", wavelengthFrom: " + wavelengthFrom +
  //   ", wavelengthTo: " + wavelengthTo +
  //   ", yRatio: " + yRatio
  // );

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

  function drawTimingsOfProcessNode(processNode, colorRGBA, lastTimingColorRGBA, exceptChildNode, isHighlighted) {
    // //function distort(timeDiff, y) {
    // function distort(y) {
    //   // let xa = that.distortionX.a;
    //   // let xb = that.distortionX.b;
    //   // let xc = that.distortionX.c;

    //   let ya = that.distortionY.a;

    //   // let coeff = (ya*Math.sqrt(timeDiff / timeRange) + yb*(timeDiff / timeRange) + yc);
    //   // let coeff = Math.exp(Math.log(timeDiff/timeRange) / ya) / (timeDiff/timeRange);
    //   // return coeff * y;
    //   let wr = wavelengthRange;
    //   //let normal = (wr - y)/wr;
    //   let normal = y/wr;
    //   let root = Math.exp(Math.log(normal) / ya);
    //   let coeff = (root - normal) / normal;
    //   return y + y*coeff;
    // }
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
          //yTo: distort(t.millisUntilNext) / yRatio
          yTo: t.millisUntilNext / yRatio
        });
      }
    }

    if (processNode === exceptChildNode) {
      return;
    }

    if (colorRGBA) {
      ctx.fillStyle = colorRGBA;
    }

    let timings;
    if (isHighlighted) {
      timings = processNode.getTimingsToHighlight();
    } else {
      timings = processNode.getTimingsToDraw();
    }
    timings.forEach(t => drawTiming(t));

    processNode.children
      .forEach((childProcessNode) => {
        drawTimingsOfProcessNode(childProcessNode, colorRGBA, lastTimingColorRGBA, exceptChildNode);
      });

    if (lastTimingColorRGBA !== undefined && (!processNode.isMergedChild || isHighlighted)) {
      let lastTiming;
      if (isHighlighted) {
        lastTiming = processNode.getLastTimingToHighlight();
      } else {
        lastTiming = processNode.getLastTimingToDraw();
      }
      if (lastTiming !== undefined) {
        ctx.fillStyle = lastTimingColorRGBA;
        drawTiming(lastTiming);
      }
    }

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
    let timingsColor = 'rgba(100, 120, 120, 1)';
    let lastTimingColor = 'rgba(70, 80, 80, 1)';
    // that.processes
    //   .filter(p => p.prefix != that.highlightedProcessName)
    //   .forEach(p => drawTimingsOfProcess(p, timingsColor, lastTimingColor));
    drawTimingsOfProcessNode(that.processNode, timingsColor, lastTimingColor, that.highlightedProcessNode);

    // if (that.highlightedProcessNodeViewState !== TimingsCategoryNodeViewState.HIGHLIGHTED &&
    //     that.highlightedProcessNode.referencedTimings !== undefined &&
    //     that.highlightedProcessNode.referencedTimings.length > 0) {
    if (that.highlightedProcessNodeViewState !== TimingsCategoryNodeViewState.HIGHLIGHTED &&
        that.highlightedProcessNode.hasReferencesToOutsideTimings) {
      timingsColor = 'rgba(0, 85, 255, 1)';
      lastTimingColor = 'rgba(0, 50, 150, 1)';
    } else {
      timingsColor = 'rgba(190, 0, 20, 1)';
      lastTimingColor = 'rgba(140, 0, 15, 1)';
    }
    drawTimingsOfProcessNode(that.highlightedProcessNode, timingsColor, lastTimingColor, undefined, true);
  } else {
    let timingsColor = 'rgba(100, 120, 120, 1)';
    let lastTimingColor = 'rgba(70, 80, 80, 1)';
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
    // yTo: that.translateVerticalScrollbarRangeToPixels()
    // yTo: that.rangeY.to
    yTo: that.canvasHeight - scrollbarBreadth
  };
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  that.fillRect(ctx, vScrollbarThumbsCoords);
};

// TimingsHistogramsGraphic.prototype.translateVerticalScrollbarRangeToPixels = function() {
//   let that = this;
//   let yTo;
//   let oneMinute = 60 * 1000;
//   let rangeYInMillis = that.maxWavelength * that.rangeYpercentage.to / 100.0;
//   if (rangeYInMillis < oneMinute * 30) {
//     console.log(`[translateVerticalScrollbarRangeToPixels] rangeYInMillis: ${rangeYInMillis} is less than one * 30 (${rangeYInMillis} < ${oneMinute * 30})`);
//     let rangeYInMillisRatio = rangeYInMillis / (oneMinute * 30);
//     let graphicHeight = that.canvasHeight - that.scrollbarBreadth;
//     yTo = graphicHeight * rangeYInMillisRatio;
//   } else {
//     console.log(`[translateVerticalScrollbarRangeToPixels] rangeYInMillis: ${rangeYInMillis}`);
//     yTo = that.canvasHeight - that.scrollbarBreadth;
//   }
//   return yTo;
// };

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

function findMaxRecursive(processNode, defaultValue, innerMaxFunc) {
  let localMax = defaultValue;
  let timings = [];
  let processNodeTimings = processNode.ownTimingsAsReferences;
  if (processNodeTimings.length > 0) {
    timings = processNodeTimings;
  }
  if (processNode.referencedTimings !== undefined && processNode.referencedTimings.length > 0) {
    timings = timings.concat(processNode.referencedTimings);
  }
  if (processNode.referencedByDescendantsTimings !== undefined && processNode.referencedByDescendantsTimings.length > 0) {
    timings = timings.concat(processNode.referencedByDescendantsTimings);
  }
  if (timings.length > 0) {
    localMax = innerMaxFunc(timings);
  }
  return findMax(defaultValue,
    [localMax].concat(processNode.children.map((childProcessNode) => {
      return findOwnMaxRecursive(childProcessNode, defaultValue, innerMaxFunc)
    })));
}

function findOwnMaxRecursive(processNode, defaultValue, innerMaxFunc) {
  let localMax = defaultValue;
  let timings = [];
  let processNodeTimings = processNode.ownTimingsAsReferences;
  if (processNodeTimings.length > 0) {
    timings = processNodeTimings;
  }
  if (timings.length > 0) {
    localMax = innerMaxFunc(timings);
  }
  return findMax(defaultValue,
    [localMax].concat(processNode.children.map((childProcessNode) => {
      return findOwnMaxRecursive(childProcessNode, defaultValue, innerMaxFunc)
    })));
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

