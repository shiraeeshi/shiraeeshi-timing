const { ProcessNode } = require('./process_node.js');
const { timingDateArrays2Date, dateArray2str, timeArray2str } = require('../date_utils.js');

function sortTimings(processNode) {
  if (processNode.timings.length > 0) {
    processNode.timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  }
  processNode.children.forEach((childProcessNode) => sortTimings(childProcessNode));
}


export function initProcessesTree(timingsByCategories, processesTree) {
  processesTree = buildProcessesTree(timingsByCategories, processesTree);
  sortTimings(processesTree);
  processesTree.initMillisUntilNext();
  return processesTree;
}


export function buildProcessesTree(timingsByCategories, timingsBySubcategoriesTree) {
  if (timingsBySubcategoriesTree === undefined) {
    timingsBySubcategoriesTree = new ProcessNode("all");
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
    let categoryRootNode = timingsBySubcategoriesTree.ensureChildWithName(key);
    let node = categoryRootNode;

    let thisTimingsByDays = timingsByCategories[key];

    for (let i = 0; i < thisTimingsByDays.length ; i++) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      eachTimingDay.timings.forEach(t => {
        node = categoryRootNode;
        let yamlValue = t.value;
        if (yamlValue.constructor !== Array) {
          let err = Error("wrong format: timing's categories should be list-typed");
          err.source_timing = key;
          err.fromdateStr = `${dateArray2str(dt)} ${timeArray2str(t.from)}`;
          throw err;
        }
        let firstReference = makeReferencedTiming(t);
        for (let index = 0; index < yamlValue.length - 1; index++) {
          let item = yamlValue[index];
          if (item.constructor !== String) {
            let err = Error("wrong format: encountered a non-string category that is not last item in the categories list. all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}). day: " + eachTimingDay.date);
            err.source_timing = key;
            err.fromdateStr = `${dateArray2str(dt)} ${timeArray2str(t.from)}`;
            throw err;
          }
          node = node.ensureChildWithName(item);
        }
        let lastItem = yamlValue[yamlValue.length - 1];
        if (lastItem.constructor === String) {
          node = node.ensureChildWithName(lastItem);
          node.isInnermostCategory = true;
          t.info = [lastItem];
        } else if (lastItem.constructor === Object) {
          let keys = Object.keys(lastItem);
          if (keys.length !== 1) {
            let err = Error("wrong format: the last item in the categories list is an object, count of properties not equals 1. all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}). day: " + eachTimingDay.date);
            err.source_timing = key;
            err.fromdateStr = `${dateArray2str(dt)} ${timeArray2str(t.from)}`;
            throw err;
          }
          let propName = keys[0];
          let propValue = lastItem[propName];
          node = node.ensureChildWithName(propName);
          node.isInnermostCategory = true;
          if (propValue.constructor === Array) {
            if (propValue.length === 1) {
              while (true) {
                let soleItem = propValue[0];
                if (soleItem.constructor !== Object) {
                  if (soleItem.constructor === String) {
                    let childNode = node.ensureChildWithName(soleItem);
                    // childNode.isProcessInfo = true;
                    node = childNode;
                    // // childNode.timings.push(t);
                    // if (childNode.referencedTimings === undefined) {
                    //   childNode.referencedTimings = [];
                    // }
                    // childNode.referencedTimings.push(t);
                  }
                  break;
                }
                let keys = Object.keys(soleItem);
                if (keys.length !== 1) {
                  break;
                }
                propName = keys[0];
                let testPropValue = soleItem[propName];
                if (testPropValue.constructor !== Array || testPropValue.length !== 1) {
                  if (testPropValue.constructor === Array && testPropValue.length > 1) {
                    let aNode = node.ensureChildWithName(propName);
                    addNodesWithReferencedTimings(aNode, testPropValue, firstReference);
                    node = aNode;
                  }
                  break;
                }
                node = node.ensureChildWithName(propName);
                propValue = testPropValue;
              }
            } else if (propValue.length > 1) {
              addNodesWithReferencedTimings(node, propValue, firstReference);
            }
          }
          t.info = propValue;
        } else {
          let err = Error("wrong format: the last item in the categories is neither string nor an object. all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}). day: " + eachTimingDay.date);
          err.source_timing = key;
          err.fromdateStr = `${dateArray2str(dt)} ${timeArray2str(t.from)}`;
          throw err;
        }
        node.timings.push(t);
        node.ownTimingsAsReferences.push(firstReference);
      });
    }
  });
  return timingsBySubcategoriesTree;
}

function makeReferencedTiming(t) {
  let ref = Object.create(t);
  ref.isReference = true;
  return ref;
}

function addNodesWithReferencedTimings(node, sublist, timing) {

  for (let item of sublist) {
    if (item.constructor === String) {
      let childNode = node.ensureChildWithName(item);
      childNode.hasReferencesToOutsideTimings = true;
      // childNode.isProcessInfo = true;
      if (childNode.referencedTimings === undefined) {
        childNode.referencedTimings = [];
      }
      childNode.referencedTimings.push(makeReferencedTiming(timing));
    } else if (item.constructor === Object) {
      let keys = Object.keys(item);
      if (keys.length !== 1) {
        return;
      }
      let key = keys[0];
      let value = item[key];
      if (value.constructor !== Array) {
        return;
      }
      let childNode = node.ensureChildWithName(key);
      childNode.hasReferencesToOutsideTimings = true;
      // childNode.isProcessInfo = true;
      // if (childNode.referencedTimings === undefined) {
      //   childNode.referencedTimings = [];
      // }
      // childNode.referencedTimings.push(timing);
      let ref = makeReferencedTiming(timing);
      if (childNode.referencedByDescendantsTimings === undefined) {
        childNode.referencedByDescendantsTimings = [];
      }
      childNode.referencedByDescendantsTimings.push(ref);
      addNodesWithReferencedTimings(childNode, value, ref);
    }
  }
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
