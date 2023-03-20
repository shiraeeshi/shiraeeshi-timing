const fs = require('fs');

export function TimingTimerManager(timingStartFilepath, timingFilepath) {
  this.timingStartFilepath = timingStartFilepath;
  this.timingFilepath = timingFilepath;
  this.currentTimingInfo = undefined;
}

TimingTimerManager.prototype.hasTiming = function() {
  return this.currentTimingInfo !== undefined;
};

TimingTimerManager.prototype.startTiming = async function(timingName) {
  let that = this;
  let currentTime = new Date();
  that.currentTimingInfo = new TimingTimerInfo(timingName, currentTime);
  let currentDateStr = dateAsDayMonthYearWithDots(currentTime);
  let timingStartStr = timeAsHoursAndMinutes(currentTime);
  let row = `${currentDateStr} ${timingStartStr}\n`;
  const timingStartFile = fs.createWriteStream(that.timingStartFilepath, { flags: 'a', encoding: 'utf8' });
  await _writeToStream(timingStartFile, row);
};

TimingTimerManager.prototype.stopTiming = async function() {
  let that = this;
  if (!that.hasTiming()) {
    throw new Error("timing manager can't stop non-existent timing.");
  }
  let currentTime = new Date();
  let startedAt = that.currentTimingInfo.startedAt;

  let currentDateStr = dateAsDayMonthYearWithDots(startedAt);
  let timingStartStr = timeAsHoursAndMinutes(startedAt);
  let timingEndStr = timeAsHoursAndMinutes(currentTime);

  let delta = currentTime.getTime() - startedAt.getTime();
  let deltaMinutes = Math.floor(delta / 60000);
  let deltaStr = `${deltaMinutes} m`;

  let row = `${currentDateStr} ${timingStartStr} - ${timingEndStr}   (${deltaStr}) ${that.currentTimingInfo.timingName}\n`;

  const timingFile = fs.createWriteStream(that.timingFilepath, { flags: 'a', encoding: 'utf8' });
  await _writeToStream(timingFile, row);

  delete that.currentTimingInfo;
};

function TimingTimerInfo(timingName, startedAt) {
  this.timingName = timingName;
  this.startedAt = startedAt;
}

function _writeToStream(stream, data) {
  return new Promise((resolve, err) => {
    function func() {
      if (stream.write(data)) {
        resolve(undefined);
      } else {
        stream.once('drain', func);
      }
    }
    func();
  });
}

function pad(v) {
  return `0${v}`.slice(-2);
}

function dateAsDayMonthYearWithDots(date) {
  let year = date.getFullYear();
  let month = pad(date.getMonth() + 1)
  let day = pad(date.getDate());
  return `${day}.${month}.${year}`;
}

function timeAsHoursAndMinutes(date) {
  let hours = pad(date.getHours());
  let minutes = pad(date.getMinutes());
  return `${hours}:${minutes}`;
}
