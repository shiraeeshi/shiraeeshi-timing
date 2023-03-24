
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

function pad(v) {
  return `0${v}`.slice(-2);
}

export function dateArray2str(dateArray) {
  let day = pad(dateArray[0]);
  let month = pad(dateArray[1]);
  let year = dateArray[2];
  return `${day}.${month}.${year}`;
}

export function timeArray2str(timeArray) {
  let hours = pad(timeArray[0]);
  let minutes = pad(timeArray[1])
  return `${hours}:${minutes}`;
}

export function dateDifferenceInMillis(d1, d2) {
  return d1.getTime() - d2.getTime();
}
