
export function timingDateArrays2Date(dateArray, hourMinuteArray) {
  let d = new Date();
  d.setDate(1);
  d.setMonth(dateArray[1] - 1);
  d.setDate(dateArray[0]);
  d.setFullYear(dateArray[2]);
  d.setHours(hourMinuteArray[0]);
  d.setMinutes(hourMinuteArray[1]);
  return d;
}

export function date2timingDateArray(dt) {
  return [
    dt.getDate(),
    dt.getMonth() + 1,
    dt.getFullYear()
  ];
}

