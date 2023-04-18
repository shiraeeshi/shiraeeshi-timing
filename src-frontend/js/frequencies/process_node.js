const { TimingsCategoryNodeViewState } = require('../timings/categories/node_view_state.js');

export function ProcessNode(name, parentNode) {
  this.name = name;
  this.parent = parentNode !== undefined ? parentNode : null;
  this.childrenByName = {};
  this.children = [];
  this.timings = [];
  this.ownTimingsAsReferences = [];
  this.stashed = {};
  // this.referencedTimings = undefined;
  // this.referencedByDescendantsTimings = undefined;
  // this.timingsWithBorrowedReferences = undefined;
  // this.mergedSubprocessesTimings = undefined;
  // this.mergedSubprocessesTimingsWithBorrowedReferences = undefined;
  // this.isInnermostCategory = undefined;
  // this.hasReferencesToOutsideTimings = undefined;
  // this.isMergedChild = undefined;
  // this.hasMergedChildren = undefined;
  // this.hasBorrowedReferences = undefined;
  // this.firstTimingOfMergedProcess = undefined;
  // this.lastTimingOfMergedProcess = undefined;
}

ProcessNode.prototype.newChildWithName = function(name) {
  let that = this;
  let child = new ProcessNode(name, that);
  that.childrenByName[name] = child;
  that.children.push(child);
  return child;
};

ProcessNode.prototype.ensureChildWithName = function(name) {
  let that = this;
  let child = that.childrenByName[name];
  if (child === undefined) {
    child = that.newChildWithName(name, that);
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
  that.hasBorrowedReferences = true;
  if (that.hasMergedChildren &&
      that.stashed.mergedSubprocessesTimingsWithBorrowedReferences !== undefined) {
    that._restoreMergedBorrowed();
    return;
  }
  if (that.stashed.timingsWithBorrowedReferences !== undefined) {
    that._restoreBorrowed();
    return;
  }
  let timings;
  if (that.hasMergedChildren) {
    timings = that.mergedSubprocessesTimings;
  } else {
    timings = that.ownTimingsAsReferences;
  }
  if (that.referencedTimings !== undefined && that.referencedTimings.length > 0) {
    timings = timings.concat(that.referencedTimings);
  }
  if (that.referencedByDescendantsTimings !== undefined && that.referencedByDescendantsTimings.length > 0) {
    timings = timings.concat(that.referencedByDescendantsTimings);
  }
  timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  setMillisUntilNextForEachTiming(timings);
  if (that.hasMergedChildren) {
    that.mergedSubprocessesTimingsWithBorrowedReferences = timings;
    that.stashed.mergedSubprocessesTimingsWithBorrowedReferences = timings.map(makeStashedReferencedTiming);
  } else {
    that.timingsWithBorrowedReferences = timings;
    that.stashed.timingsWithBorrowedReferences = timings.map(makeStashedReferencedTiming);
  }
  // that.children.forEach(child => child.borrowReferences());
};

ProcessNode.prototype.unborrowReferences = function() {
  let that = this;
  that.hasBorrowedReferences = false;
  // delete that.timingsWithBorrowedReferences;
  for (let ref of that.ownTimingsAsReferences) {
    delete ref.millisUntilNext;
  }
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
  if (that.hasMergedChildren) {
    // that.mergeSubprocessesOrRecalculate();
    that._restoreMerged();
  } else if (that.isMergedChild) {
    let merger = that.findAncestorThatMerged();
    if (merger !== undefined) {
      merger._restoreStashedValues();
    }
  }
  // that.children.forEach(child => child.unborrowReferences());
};

ProcessNode.prototype.findAncestorThatMerged = function() {
  let that = this;
  let parent = that.parent;
  while (parent !== null) {
    if (parent.hasMergedChildren) {
      return parent;
    }
    parent = parent.parent;
  }
};

ProcessNode.prototype._getOwnTimingsAsReferences = function() {
  let that = this;
  if (that.ownTimingsAsReferences === undefined) {
    that.ownTimingsAsReferences = that.timings.map(t => makeReferencedTiming(t));
  }
  return that.ownTimingsAsReferences;
};

ProcessNode.prototype._restoreStashedValues = function() {
  let that = this;
  if (that.hasMergedChildren) {
    if (that.hasBorrowedReferences) {
      that._restoreMergedBorrowed();
    } else {
      that._restoreMerged();
    }
  } else if (that.hasBorrowedReferences) {
    that._restoreBorrowed();
  }
};

ProcessNode.prototype._restoreMerged = function() {
  let that = this;
  that.stashed.mergedSubprocessesTimings.forEach(t => {
    Object.getPrototypeOf(t).millisUntilNext = t.millisUntilNext
  });
  that.mergedSubprocessesTimings = 
    that.stashed.mergedSubprocessesTimings.map(t => Object.getPrototypeOf(t));
};

ProcessNode.prototype._restoreBorrowed = function() {
  let that = this;
  that.stashed.timingsWithBorrowedReferences.forEach(t => {
    Object.getPrototypeOf(t).millisUntilNext = t.millisUntilNext
  });
  that.timingsWithBorrowedReferences = 
    that.stashed.timingsWithBorrowedReferences.map(t => Object.getPrototypeOf(t));
};

ProcessNode.prototype._restoreMergedBorrowed = function() {
  let that = this;
  that.stashed.mergedSubprocessesTimingsWithBorrowedReferences.forEach(t => {
    Object.getPrototypeOf(t).millisUntilNext = t.millisUntilNext
  });
  that.mergedSubprocessesTimingsWithBorrowedReferences = 
    that.stashed.mergedSubprocessesTimingsWithBorrowedReferences.map(t => Object.getPrototypeOf(t));
};

ProcessNode.prototype.deleteStashedValues = function() {
  let that = this;
  if (that.mergedSubprocessesTimings !== undefined) {
    delete that.mergedSubprocessesTimings;
  }
  if (that.stashed.mergedSubprocessesTimings !== undefined) {
    delete that.stashed.mergedSubprocessesTimings;
  }
  if (that.mergedSubprocessesTimingsWithBorrowedReferences !== undefined) {
    delete that.mergedSubprocessesTimingsWithBorrowedReferences;
  }
  if (that.stashed.mergedSubprocessesTimingsWithBorrowedReferences !== undefined) {
    delete that.stashed.mergedSubprocessesTimingsWithBorrowedReferences;
  }
  if (that.timingsWithBorrowedReferences !== undefined) {
    delete that.timingsWithBorrowedReferences;
  }
  if (that.stashed.timingsWithBorrowedReferences !== undefined) {
    delete that.stashed.timingsWithBorrowedReferences;
  }
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

  that.hasMergedChildren = true;

  if (that.hasBorrowedReferences &&
      that.stashed.mergedSubprocessesTimingsWithBorrowedReferences !== undefined) {
    that._restoreMergedBorrowed();
  } else if (that.stashed.mergedSubprocessesTimings !== undefined) {
    that._restoreMerged();
  } else {
    let timings;
    if (that.mergedSubprocessesTimings !== undefined) {
      timings = that.mergedSubprocessesTimings;
    } else {
      timings = collectTimings(that);
      // if (timings.length > 0) {
      //   that.lastTimingOfMergedProcess = timings[timings.length - 1];
      // }
      that.mergedSubprocessesTimings = timings;
    }

    timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
    setMillisUntilNextForEachTiming(timings);
    that.stashed.mergedSubprocessesTimings = timings.map(makeStashedReferencedTiming);

    if (that.hasBorrowedReferences) {
      that.borrowReferences();
    }
  }
  that.children.forEach(child => child._markAsMerged());
};

ProcessNode.prototype.unmergeSubprocesses = function() {
  let that = this;
  that.hasMergedChildren = false;
  for (let ref of that.ownTimingsAsReferences) {
    delete ref.millisUntilNext;
  }
  that.children.forEach(child => child._markAsUnmerged());

  if (that.hasBorrowedReferences) {
    if (that.timingsWithBorrowedReferences === undefined) {
      that.borrowReferences();
    } else {
      that._restoreBorrowed();
    }
  }
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

function makeStashedReferencedTiming(t) {
  let ref = Object.create(t);
  ref.isReference = true;
  ref.millisUntilNext = t.millisUntilNext;
  return ref;
}
