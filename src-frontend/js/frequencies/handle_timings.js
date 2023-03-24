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
        for (let index = 0; index < yamlValue.length; index++) {
          let item = yamlValue[index];
          if (item.constructor === Object) {
            let keys = Object.keys(item);
            if (keys.length !== 1 || index !== (yamlValue.length - 1)) {
              let err = Error("wrong format: all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}). day: " + eachTimingDay.date);
              err.source_timing = key;
              err.fromdateStr = `${dateArray2str(dt)} ${timeArray2str(t.from)}`;
              throw err;
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
