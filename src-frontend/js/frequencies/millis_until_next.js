
export function resetMillisUntilNextForProcessNode(processNode, selectedProcessNode) {
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

export function setMillisUntilNextForProcessNode(processNode, selectedProcessNode) {
  //console.log("[start] setMillisUntilNextForProcessNode");
  if (processNode.timings.length > 0) {
    setMillisUntilNextForEachTiming(processNode.timings);
  }
  processNode.children
    .filter((childProcessNode) => childProcessNode !== selectedProcessNode)
    .forEach((childProcessNode) => setMillisUntilNextForProcessNode(childProcessNode, selectedProcessNode));
  //console.log("[end] setMillisUntilNextForProcessNode");
}

