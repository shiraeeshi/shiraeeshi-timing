const { setMillisUntilNextForProcessNode } = require('./millis_until_next.js');
const { timingDateArrays2Date, dateArray2str, timeArray2str } = require('../date_utils.js');

function sortTimings(processNode) {
  if (processNode.timings.length > 0) {
    processNode.timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  }
  processNode.children.forEach((childProcessNode) => sortTimings(childProcessNode));
}


export function handleTimings(timingsByCategories, timingsBySubcategoriesTree) {
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
          let err = Error("wrong format: timing's categories should be list-typed");
          err.source_timing = key;
          err.fromdateStr = `${dateArray2str(dt)} ${timeArray2str(t.from)}`;
          throw err;
        }
        for (let index = 0; index < yamlValue.length - 1; index++) {
          let item = yamlValue[index];
          if (item.constructor !== String) {
            let err = Error("wrong format: encountered a non-string category that is not last item in the categories list. all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}). day: " + eachTimingDay.date);
            err.source_timing = key;
            err.fromdateStr = `${dateArray2str(dt)} ${timeArray2str(t.from)}`;
            throw err;
          }
          ensureChildWithName(node, item);
          node = node.childrenByName[item];
        }
        let lastItem = yamlValue[yamlValue.length - 1];
        if (lastItem.constructor === String) {
          ensureChildWithName(node, lastItem);
          node = node.childrenByName[lastItem];
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
          ensureChildWithName(node, propName);
          node = node.childrenByName[propName];
          node.isInnermostCategory = true;
          if (propValue.constructor === Array) {
            if (propValue.length === 1) {
              while (true) {
                let soleItem = propValue[0];
                if (soleItem.constructor !== Object) {
                  if (soleItem.constructor === String) {
                    ensureChildWithName(node, soleItem);
                    let childNode = node.childrenByName[soleItem];
                    childNode.isProcessInfo = true;
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
                    ensureChildWithName(node, propName);
                    let aNode = node.childrenByName[propName];
                    addNodesWithReferencedTimings(aNode, testPropValue, t);
                    node = aNode;
                  }
                  break;
                }
                ensureChildWithName(node, propName);
                propValue = testPropValue;
                node = node.childrenByName[propName];
              }
            } else if (propValue.length > 1) {
              addNodesWithReferencedTimings(node, propValue, t);
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
      });
    }
  });
  sortTimings(timingsBySubcategoriesTree);
  setMillisUntilNextForProcessNode(timingsBySubcategoriesTree);
  return timingsBySubcategoriesTree;
}

function ensureChildWithName(node, name) {
  if (!node.childrenByName[name]) {
    let newNode = {
      name: name,
      children: [],
      childrenByName: {},
      timings: [],
      referencedTimings: [],
    };
    node.childrenByName[name] = newNode;
    node.children.push(newNode);

    if (node.isInnermostCategory || node.isProcessInfo) {
      newNode.isProcessInfo = true;
    }
  }
}

function addNodesWithReferencedTimings(node, sublist, timing) {

  for (let item of sublist) {
    if (item.constructor === String) {
      ensureChildWithName(node, item);
      let childNode = node.childrenByName[item];
      childNode.isProcessInfo = true;
      if (childNode.referencedTimings === undefined) {
        childNode.referencedTimings = [];
      }
      childNode.referencedTimings.push(timing);
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
      ensureChildWithName(node, key);
      let childNode = node.childrenByName[key];
      childNode.isProcessInfo = true;
      if (childNode.referencedTimings === undefined) {
        childNode.referencedTimings = [];
      }
      childNode.referencedTimings.push(timing);
      addNodesWithReferencedTimings(childNode, value, timing);
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
