const fs = require('fs');

const { PATTERN_DATE_AND_TIMING, PATTERN_TIMING_START_DATETIME } = require('./timing_file_parser_patterns.js');

export function TimingTimerManager(timingStartFilepath, timingFilepath, lastTimingStartFilepath, lastTimingFilepath) {
  this.timingStartFilepath = timingStartFilepath;
  this.timingFilepath = timingFilepath;
  this.lastTimingStartFilepath = lastTimingStartFilepath;
  this.lastTimingFilepath = lastTimingFilepath;
  this.currentTimingInfo = undefined;
}

TimingTimerManager.prototype.init = function() {
  let that = this;
  function readOrUndefined(whichFile, filepath) {
    return fs.promises.readFile(filepath, { encoding: 'utf8' }).catch(err => {
      console.log(`error reading ${whichFile}: ${err.message}`);
    });
  }
  Promise.all([
    readOrUndefined('last_timing_start_datetime', that.lastTimingStartFilepath),
    readOrUndefined('last_timing', that.lastTimingFilepath),
  ]).then(results => {
    let [lastTimingStartFileContents, lastTimingFileContents] = results;
    let lastTimingInfo = parseLastTiming(lastTimingFileContents);
    let lastTimingStartInfo = parseLastTimingStart(lastTimingStartFileContents);
    if (lastTimingInfo === undefined) {
      if (lastTimingStartInfo === undefined) {
        return;
      } else {
        that.currentTimingInfo = TimingTimerInfo.createFromLastTimingStart(lastTimingStartInfo);
      }
    }
    if (lastTimingStartInfo === undefined) {
      return;
    }
    if (areReferringToSameStartTime(lastTimingInfo, lastTimingStartInfo)) {
      return;
    }
    that.currentTimingInfo = TimingTimerInfo.createFromLastTimingStart(lastTimingStartInfo);
  }).catch(err => {
    console.log(`[timing_timer_manager.js] error while initializing: ${err.message}`);
  });
};

function areReferringToSameStartTime(lastTimingInfo, lastTimingStartInfo) {
  let lt = lastTimingInfo;
  let lts = lastTimingStartInfo;
  return lt.date[0] === lts.date[0] &&
    lt.date[1] === lts.date[1] &&
    lt.date[2] === lts.date[2] &&
    lt.fromHour === lts.hours &&
    lt.fromMinute === lts.minutes;
}

function parseLastTimingStart(lastTimingStartFileContents) {
  if (lastTimingStartFileContents === undefined) {
    return;
  }
  let match = lastTimingStartFileContents.match(new RegExp(PATTERN_TIMING_START_DATETIME));
  if (match === null) {
    return;
  }
  let dayOfMonth = match[1];
  let month = match[2];
  let year = match[3];
  year = Number(year);
  if (year < 100) {
    year += 2000;
  }
  let dt = [Number(dayOfMonth), Number(month), year];
  let fromHour = match[4];
  let fromMinute = match[5];
  fromHour = Number(fromHour);
  fromMinute = Number(fromMinute);
  return {
    date: dt,
    hours: fromHour,
    minutes: fromMinute,
  };
}

function parseLastTiming(lastTimingFileContents) {
  if (lastTimingFileContents === undefined) {
    return;
  }
  let match = lastTimingFileContents.match(new RegExp(PATTERN_DATE_AND_TIMING));
  if (match === null) {
    return;
  }
  let dayOfMonth = match[1];
  let month = match[2];
  let year = match[3];
  year = Number(year);
  if (year < 100) {
    year += 2000;
  }
  let dt = [Number(dayOfMonth), Number(month), year];
  let fromHour = match[4];
  let fromMinute = match[5];
  let toHour = match[6];
  let toMinute = match[7];
  let minutes = match[8];
  fromHour = Number(fromHour);
  fromMinute = Number(fromMinute);
  toHour = Number(toHour);
  toMinute = Number(toMinute);
  if (minutes === undefined || minutes === null) {
    minutes = computeMinutes(fromHour, fromMinute, toHour, toMinute);
  } else {
    minutes = Number(minutes);
  }
  return {
    date: dt,
    fromHour,
    fromMinute,
    toHour,
    toMinute,
    minutes,
  };
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
  let row = `${currentDateStr} ${timingStartStr}`;
  let rowWithNewline = row + '\n';

  const lastTimingStartFile = fs.createWriteStream(that.lastTimingStartFilepath, { flags: 'w', encoding: 'utf8' });
  await _writeToStream(lastTimingStartFile, row);

  const timingStartFile = fs.createWriteStream(that.timingStartFilepath, { flags: 'a', encoding: 'utf8' });
  await _writeToStream(timingStartFile, rowWithNewline);
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

  let row = `${currentDateStr} ${timingStartStr} - ${timingEndStr}   (${deltaStr})`;
  let rowWithTimingNameAndNewline = `${row} ${that.currentTimingInfo.timingName}\n`;

  const lastTimingFile = fs.createWriteStream(that.lastTimingFilepath, { flags: 'w', encoding: 'utf8' });
  await _writeToStream(lastTimingFile, row);

  const timingFile = fs.createWriteStream(that.timingFilepath, { flags: 'a', encoding: 'utf8' });
  await _writeToStream(timingFile, rowWithTimingNameAndNewline);

  delete that.currentTimingInfo;

  return row;
};

function TimingTimerInfo(timingName, startedAt) {
  this.timingName = timingName;
  this.startedAt = startedAt;
}

TimingTimerInfo.createFromLastTimingStart = function(lastTimingStartInfo) {
  let info = lastTimingStartInfo;
  let timingName = 'testtiming';
  let startedAt = new Date();
  startedAt.setDate(1);
  startedAt.setMonth(info.date[1] - 1);
  startedAt.setDate(info.date[0]);
  startedAt.setFullYear(info.date[2]);
  startedAt.setHours(info.hours);
  startedAt.setMinutes(info.minutes);
  return new TimingTimerInfo(timingName, startedAt);
}

function timingDateArrays2Date(dateArray, hourMinuteArray) {
  let d = new Date();
  return d;
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

function computeMinutes(fromHour, fromMinute, toHour, toMinute) {
  let hourDiff = toHour - fromHour;
  if (hourDiff < 0) {
    hourDiff += 24;
  }
  let minutes = toMinute - fromMinute + 60*hourDiff;
  return minutes;
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
