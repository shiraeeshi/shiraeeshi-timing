
const { PeriodType } = require('./period_type.js');

const {
  calculateDifferenceBetweenNowAndStartOfDay,
  millisOfCurrentAbstractDayOfYear
} = require('./millis_utils.js');

export function ImageInfo() {
  this.minutesMaxDiff = 0;
  this.minutesRange = 0;
  this.periodType = PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD;
  this.minutesMaxDiffLastModified = 0;
}

ImageInfo.prototype.updateAsPeriodType = function(periodType) {
  let that = this;
  that.periodType = periodType;
  if (periodType == PeriodType.LAST_24_HOURS) {
    that.minutesRange = 24*60;
    that.minutesMaxDiff = 24*60;
  } else if (periodType == PeriodType.LAST_12_HOURS) {
    that.minutesRange = 12*60;
    that.minutesMaxDiff = 12*60;
  } else if (periodType == PeriodType.FROM_ZERO_HOURS_OF_24_HOUR_PERIOD) {
    that.minutesRange = 24*60;
    that.minutesMaxDiff = calculateDifferenceBetweenNowAndStartOfDay() / (60.0 * 1000);
    that.minutesMaxDiffLastModified = new Date();
  } else if (periodType == PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD) {
    that.minutesRange = 2.5 * 24 * 60;
    that.minutesMaxDiff = millisOfCurrentAbstractDayOfYear(2.5) / (60.0 * 1000);
    that.minutesMaxDiffLastModified = new Date();
  }
};
ImageInfo.prototype.updateIfNeeded = function() {
  let that = this;
  if (that.periodType == PeriodType.LAST_24_HOURS ||
      that.periodType == PeriodType.LAST_12_HOURS) {
    return;
  }
  if (that.periodType == PeriodType.FROM_ZERO_HOURS_OF_24_HOUR_PERIOD ||
      that.periodType == PeriodType.FROM_ZERO_HOURS_OF_60_HOUR_PERIOD) {
    let now = new Date();
    let millisSinceLastModified = now.getTime() - that.minutesMaxDiffLastModified.getTime();
    that.minutesMaxDiff += (millisSinceLastModified / (60.0 * 1000));
    that.minutesMaxDiffLastModified = now;
  }
};

