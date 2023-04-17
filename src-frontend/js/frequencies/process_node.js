const { TimingsCategoryNodeViewState } = require('../timings/categories/node_view_state.js');

export function ProcessNode(name) {
  this.name = name;
  this.childrenByName = {};
  this.children = [];
  this.timings = [];
  this.ownTimingsAsReferences = [];
  // this.referencedTimings = undefined;
  // this.referencedByDescendantsTimings = undefined;
  // this.timingsWithBorrowedReferences = undefined;
  // this.mergedSubprocessesTimings = undefined;
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

ProcessNode.prototype.getFirstTiming = function() {
  let that = this;
  let firstTiming;
  let firstFromChildren = that.children.map(ch => ch.getFirstTiming()).reduce(minTiming, undefined);
  if (that.timings.length > 0) {
    firstTiming = minTiming(firstFromChildren, that.timings[0]);
  } else if (that.referencedTimings && that.referencedTimings.length > 0) {
    firstTiming = minTiming(firstFromChildren, that.referencedTimings[0]);
  } else {
    firstTiming = firstFromChildren;
  }
  return firstTiming;
};


ProcessNode.prototype.initMillisUntilNext = function() {
  let that = this;
  if (that.timings.length > 0) {
    setMillisUntilNextForEachTiming(that.timings);
  }
  that.children
    .forEach(childProcessNode => childProcessNode.initMillisUntilNext());
};

ProcessNode.prototype.borrowReferences = function() {
  let that = this;
  let timings;
  if (that.hasMergedChildren) {
    timings = that.mergedSubprocessesTimings.map(makeReferencedTiming);
  } else {
    timings = that.timings.map(t => makeReferencedTiming(t));
  }
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

ProcessNode.prototype._getOwnTimingsAsReferences = function() {
  let that = this;
  if (that.ownTimingsAsReferences === undefined) {
    that.ownTimingsAsReferences = that.timings.map(t => makeReferencedTiming(t));
  }
  return that.ownTimingsAsReferences;
};

ProcessNode.prototype.mergeSubprocesses = function() {
  let that = this;
  function collectTimings(processNode) {
    let timingsOfChildren = [];
    if (processNode.children.length > 0) {
      timingsOfChildren =
        processNode.children
          .map(n => collectTimings(n))
          .reduce((a, b) => a.concat(b));
    }
    return processNode.ownTimingsAsReferences.concat(timingsOfChildren);
  }
  let timings;
  if (that.mergedSubprocessesTimings !== undefined) {
    timings = that.mergedSubprocessesTimings;
    timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
    setMillisUntilNextForEachTiming(timings);
  } else {
    timings = collectTimings(that);
    timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
    setMillisUntilNextForEachTiming(timings);
    // if (timings.length > 0) {
    //   that.lastTimingOfMergedProcess = timings[timings.length - 1];
    // }
    that.mergedSubprocessesTimings = timings;
  }
  that.hasMergedChildren = true;
  that.children.forEach(child => child._markAsMerged());
};

ProcessNode.prototype.unmergeSubprocesses = function() {
  let that = this;
  that.hasMergedChildren = false;
  for (let ref of that.ownTimingsAsReferences) {
    delete ref.millisUntilNext;
  }
  that.children.forEach(child => child._markAsUnmerged());
};

ProcessNode.prototype._markAsMerged = function() {
  let that = this;
  that.isMergedChild = true;
  that.children.forEach(child => child._markAsMerged());
};

ProcessNode.prototype._markAsUnmerged = function() {
  let that = this;
  that.isMergedChild = false;
  for (let ref of that.ownTimingsAsReferences) {
    delete ref.millisUntilNext;
  }
  that.children.forEach(child => child._markAsUnmerged());
};

ProcessNode.prototype.getLastTimingToDraw = function() {
  let that = this;
  if (that.timingsWithBorrowedReferences !== undefined) {
    let len = that.timingsWithBorrowedReferences.length;
    return that.timingsWithBorrowedReferences[len - 1];
  }
  let lastTimingSoFar;
  if (that.hasMergedChildren) {
    let timings = that.mergedSubprocessesTimings;
    let len = timings.length;
    lastTimingSoFar = timings[len - 1];
  } else if (that.isMergedChild) {
    let ownTimings = that.ownTimingsAsReferences;
    let len = ownTimings.length;
    lastTimingSoFar = ownTimings[len - 1];
  } else {
    let len = that.timings.length;
    lastTimingSoFar = that.timings[len - 1];
  }
  let lastTiming = lastTimingSoFar;
  if (that.referencedTimings !== undefined && that.referencedTimings.length > 0) {
    lastTiming = that.referencedTimings.concat([lastTiming]).reduce(maxTiming, lastTiming);
  }
  return lastTiming;
};

ProcessNode.prototype.getTimingsToDraw = function() {
  let that = this;
  if (that.timingsWithBorrowedReferences !== undefined) {
    return that.timingsWithBorrowedReferences;
  }
  let timings;
  if (that.hasMergedChildren || that.isMergedChild) {
    timings = that.ownTimingsAsReferences;
  } else {
    timings = that.timings;
  }
  return timings;
};

ProcessNode.prototype.getTimingsToHighlight = function() {
  let that = this;
  if (that.timingsWithBorrowedReferences !== undefined) {
    return that.timingsWithBorrowedReferences;
  }
  let timings;
  if (that.hasMergedChildren || that.isMergedChild) {
    timings = that.ownTimingsAsReferences;
  } else {
    timings = that.timings;
  }
  if (that.referencedTimings !== undefined && that.referencedTimings.length > 0) {
    timings = timings.concat(that.referencedTimings);
  }
  if (that.referencedByDescendantsTimings !== undefined && that.referencedByDescendantsTimings.length > 0) {
    timings = timings.concat(that.referencedByDescendantsTimings);
  }
  return timings;
};

function minTiming(a, b) {
  if (a === undefined) {
    return b;
  } else if (b === undefined) {
    return a;
  } else {
    if (a.fromdate.getTime() < b.fromdate.getTime()) {
      return a;
    } else {
      return b;
    }
  }
}

function maxTiming(a, b) {
  if (a === undefined) {
    return b;
  } else if (b === undefined) {
    return a;
  } else {
    if (a.fromdate.getTime() < b.fromdate.getTime()) {
      return b;
    } else {
      return a;
    }
  }
}

function setMillisUntilNextForEachTiming(timings) {
  if (timings.length === 0) {
    return;
  }
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

function makeReferencedTiming(t) {
  let ref = Object.create(t);
  ref.isReference = true;
  return ref;
}
