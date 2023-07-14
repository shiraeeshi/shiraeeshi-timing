
const _pattern_date = "([0-9]{2})\.([0-9]{2})\.([0-9]{2,4})";
const _pattern_timing = "([0-9]{2}):([0-9]{2}) - ([0-9]{2}):([0-9]{2})(?: [- *] \(([0-9]+) m\) )?";
const _pattern_timing_start = "([0-9]{2}):([0-9]{2})";
export const PATTERN_DATE = "^" + _pattern_date;
export const PATTERN_TIMING = "^" + _pattern_timing;
export const PATTERN_DATE_AND_TIMING = "^" + _pattern_date + " " + _pattern_timing;
export const PATTERN_TIMING_START_DATETIME = "^" + _pattern_date + " " + _pattern_timing_start;

