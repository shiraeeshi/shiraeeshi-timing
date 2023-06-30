const { date2TimingDateStrUnpadded } = require('../date_utils.js');

export function requestTimingsForPeriod(periodFrom, periodTo) {
  let messageHandlerName = my.messageHandlerNameRequestTimingsForPeriod;
  return new Promise((resolve, reject) => {
    window.webkit.messageHandlers[messageHandlerName].postMessage(
      date2TimingDateStrUnpadded(periodFrom) +
      " - " +
      date2TimingDateStrUnpadded(periodTo)
    );
    window.my.timingsQueryResponseCallback = function(timings) {
      resolve(timings);
    };
  });
};

