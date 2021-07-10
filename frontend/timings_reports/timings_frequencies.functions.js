
function handleServerMessage(msg) {
  window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage start ");
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

function handleTimings(timingsByCategories) {
  let timingsByCategoriesByPrefixes = {}; // obj[cat][prefix] = {prefix:"...",timings:[], lastTiming:{...}}

  Object.keys(timingsByCategories).forEach(key => {
    let byPrefixes = {};
    timingsByCategoriesByPrefixes[key] = byPrefixes;

    let thisTimingsByDays = my.timings[key];
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
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
      lastTiming.millisUntilNow = now.getTime() - lastTiming.fromdate.getTime();
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
