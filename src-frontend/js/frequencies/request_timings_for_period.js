const { date2TimingDateStrUnpadded } = require('../date_utils.js');

export function requestTimingsForPeriod(periodFrom, periodTo) {
  return new Promise((resolve, reject) => {
    window.webkit.messageHandlers.timings_frequencies_msgs__timings_for_period.postMessage(
      date2TimingDateStrUnpadded(periodFrom) +
      " - " +
      date2TimingDateStrUnpadded(periodTo)
    );
    window.my.timingsQueryResponseCallback = function(timings) {
      resolve(timings);
    };
  });
};

