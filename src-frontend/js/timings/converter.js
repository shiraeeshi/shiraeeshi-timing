
export function fromTimingsByCategoriesToTimingsByDates(timingsByCategories) {

  let timingsByDates = {};

  Object.keys(timingsByCategories).forEach(key => {
    let thisProcessObject = timingsByCategories[key];
    let thisTimingsByDays = thisProcessObject.timingsByDays;
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      eachTimingDay.timings.forEach(t => {
        let dtstr = dt.join(".");
        if (!timingsByDates.hasOwnProperty(dtstr)) {
          timingsByDates[dtstr] = {
            date: dt,
            timings: []
          };
        }
        timingsByDates[dtstr].timings.push(t);
      });
    }
  });
  // Object.keys(timingsByDates).forEach(dtStr => {
  //   let item = timingsByDates[dtStr];
  //   item.timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
  // });
  // function threeInts2date(threeInts) {
  //   return timingDateArrays2Date(threeInts, [0,0]);
  // }
  let timingsByDatesArr = Object.values(timingsByDates);
  // timingsByDatesArr.sort((a, b) => threeInts2date(a.date).getTime() - threeInts2date(b.date).getTime());
  return timingsByDatesArr;
}

