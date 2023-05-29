const { PeriodType } = require('./history_period_type.js');
const { millisOfCurrentAbstractDayOfYear } = require('../millis_utils.js');

export function HistoryImageInfo() {
  this.minutesMaxDiff = 0;
  this.minutesRange = 0;
  this.periodType = PeriodType.PERIOD_OF_60_HOURS;
  this.minutesMaxDiffLastModified = new Date();
}

HistoryImageInfo.prototype.updateAsPeriodType = function(periodType) {
  let that = this;
  that.periodType = periodType;
  if (periodType == PeriodType.PERIOD_OF_24_HOURS) {
    let date = new Date();
    date.setTime(date.getTime() - my.dayOffset*24*60*60*1000);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    let maxDiff = (new Date().getTime() - date.getTime()) / (60.0 * 1000);
    that.minutesRange = 24*60;
    that.minutesMaxDiff = maxDiff;
    that.minutesMaxDiffLastModified = new Date();
  } else if (periodType == PeriodType.PERIOD_OF_60_HOURS) {
    let millisIn24hours = 24*60*60*1000;
    let currentAbstractDayDiff = millisOfCurrentAbstractDayOfYear(2.5);
    let diffFrom = currentAbstractDayDiff + my.dayOffset * 2.5 * millisIn24hours;

    let maxDiff = diffFrom / (60.0 * 1000);
  
    that.minutesRange = 2.5 * 24 * 60;
    that.minutesMaxDiff = maxDiff;
    that.minutesMaxDiffLastModified = new Date();
  }
};

HistoryImageInfo.prototype.updateIfNeeded = function() {
  let that = this;
  let now = new Date();
  let millisSinceLastModified = now.getTime() - that.minutesMaxDiffLastModified.getTime();
  that.minutesMaxDiff += (millisSinceLastModified / (60.0 * 1000));
  that.minutesMaxDiffLastModified = now;
};

