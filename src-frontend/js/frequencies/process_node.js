const { TimingsCategoryNodeViewState } = require('../timings/categories/node_view_state.js');
const { setMillisUntilNextForEachTiming } = require('./millis_until_next.js');

export function ProcessNode(name) {
  this.name = name;
  this.childrenByName = {};
  this.children = [];
  this.timings = [];
  // this.referencedTimings = undefined;
  // this.referencedByDescendantsTimings = undefined;
  // this.timingsWithBorrowedReferences = undefined;
  // this.isInnermostCategory = undefined;
  // this.hasReferencesToOutsideTimings = undefined;
  // this.isMergedChild = undefined;
  // this.hasMergedChildren = undefined;
  // this.firstTimingOfMergedProcess = undefined;
  // this.lastTimingOfMergedProcess = undefined;
}

ProcessNode.prototype.newChildWithName = function(name) {
  let that = this;
  let child = new ProcessNode(name);
  that.childrenByName[name] = child;
  that.children.push(child);
  return child;
};

ProcessNode.prototype.ensureChildWithName = function(name) {
  let that = this;
  let child = that.childrenByName[name];
  if (child === undefined) {
    child = that.newChildWithName(name);
  }

  // if (that.isInnermostCategory || that.isProcessInfo) {
  //   child.isProcessInfo = true;
  // }

  return child;
};

function makeReferencedTiming(t) {
  let ref = Object.create(t);
  ref.isReference = true;
  return ref;
}

ProcessNode.prototype.borrowReferences = function() {
  let that = this;
  let timings = that.timings.map(t => makeReferencedTiming(t));
  if (that.referencedTimings !== undefined && that.referencedTimings.length > 0) {
    timings = timings.concat(that.referencedTimings);
  }
  if (that.referencedByDescendantsTimings !== undefined && that.referencedByDescendantsTimings.length > 0) {
    timings = timings.concat(that.referencedByDescendantsTimings);
  }
  timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  setMillisUntilNextForEachTiming(timings);
  that.timingsWithBorrowedReferences = timings;
  // that.children.forEach(child => child.borrowReferences());
};

ProcessNode.prototype.unborrowReferences = function() {
  let that = this;
  delete that.timingsWithBorrowedReferences;
  if (that.referencedTimings !== undefined) {
    for (let ref of that.referencedTimings) {
      delete ref.millisUntilNext;
    }
  }
  if (that.referencedByDescendantsTimings !== undefined) {
    for (let ref of that.referencedByDescendantsTimings) {
      delete ref.millisUntilNext;
    }
  }
  // that.children.forEach(child => child.unborrowReferences());
};

ProcessNode.prototype.getTimingsToDraw = function() {
  let that = this;
  if (that.timingsWithBorrowedReferences !== undefined) {
    return that.timingsWithBorrowedReferences;
  }
  let timings = that.timings;
  if (that.referencedTimings !== undefined && that.referencedTimings.length > 0) {
    timings = timings.concat(that.referencedTimings);
  }
  return timings;
};
