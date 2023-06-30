const fs = require('fs');
const path = require('path')
const YAML = require('yaml');
const { yieldIndexForRangeOfDates, } = require('./timing_index_manager.js');
const { LineReader } = require('./line_reader.js');
const { PATTERN_DATE, PATTERN_TIMING, PATTERN_DATE_AND_TIMING } = require('./timing_file_parser_patterns.js');
const { expanduser } = require('./file_utils.js');

async function readTimings(config) {
  let result = {};
  for (let timing of config.timings) {
    let timingName = timing['name'];
    let filepath = expanduser(timing['filepath']);
    let timingCategoryPath = timing.categoryPath;
    if (timingCategoryPath === undefined) {
      timingCategoryPath = [timingName];
    }
    let resultObject = {
      name: timingName,
      categoryPath: timingCategoryPath,
    };
    let frmt = timing['format'];
    if (frmt === 'txt' || !frmt) {
      let f = new LineReader(filepath, { encoding: 'utf8' });
      let lines = [];
      while (true) {
        let { line, isEOF } = await f.readline();
        if (isEOF) {
          break;
        }
        lines.push(line.trimEnd());
      }
      let timings = parseTimingFileLines(lines);
      resultObject.timingsByDays = timings;
    } else if (frmt === 'yaml') {
      let fileContents = await fs.promises.readFile(filepath, { encoding: 'utf8' });
      let parsedYaml = YAML.parse(fileContents, {schema: 'failsafe'});
      let parsedTimings = parseYamlTimings(parsedYaml);
      resultObject.timingsByDays = parsedTimings;
    }
    result[timingName] = resultObject;
  }
  return result;
}

export async function readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, dateFrom, dateTo) {
  let result = {};
  for (let timing of config.timings) {
    let timingName = timing['name'];
    let filepath = expanduser(timing['filepath']);
    let indexFilename = timing2indexFilename[timingName];
    let indexFilepath = path.join(indexDirFilepath, indexFilename);
    let timingCategoryPath = timing.categoryPath;
    if (timingCategoryPath === undefined) {
      timingCategoryPath = [timingName];
    }
    let resultObject = {
      name: timingName,
      categoryPath: timingCategoryPath,
      timingsByDays: []
    };
    let frmt = timing['format'];
    if (frmt === 'txt' || !frmt) {
      const generator = await yieldIndexForRangeOfDates(indexFilepath, dateFrom, dateTo);
      while (true) {
        let { value, done } = await generator.next();
        // console.log(`[readTimingsForRangeOfDates] after yieldIndexForRangeOfDates. generator.next. done: ${done}`);
        if (done) {
          break;
        }
        let {date, lineNumOffsetFrom, offsetFrom, offsetTo} = value;
        let f = new LineReader(filepath, { encoding: 'utf8', start: offsetFrom, lineNumOffset: lineNumOffsetFrom });
        let lines = await _readLinesUntilPosition(f, offsetTo);
        let timings = parseTimingFileLines(lines);

        if (timings.length > 1) {
          throw new Error(`expected one item corresponding to timings of one date from parse_timing_file_lines. len(timings) = ${timings.length}`);
        }

        if (timings.length === 0) {
          continue;
        }

        let parsedTimingsOfDate = timings[0];
        resultObject.timingsByDays.push(parsedTimingsOfDate);
      }
    } else if (frmt === 'yaml') {
      const generator = await yieldIndexForRangeOfDates(indexFilepath, dateFrom, dateTo);
      while (true) {
        let { value, done } = await generator.next();
        // console.log(`[readTimingsForRangeOfDates] after yieldIndexForRangeOfDates. generator.next. done: ${done}`);
        if (done) {
          break;
        }
        let {date, lineNumOffsetFrom, offsetFrom, offsetTo} = value;
        let f = new LineReader(filepath, { encoding: 'utf8', start: offsetFrom, lineNumOffset: lineNumOffsetFrom });
        // console.log(`[readTimingsForRangeOfDates] about to call _readLinesUntilPosition. date: ${date}, (dateFrom: ${dateFrom}), offsetFrom: ${offsetFrom}, offsetTo: ${offsetTo}`);
        let yamlOfDate = await _readLinesUntilPosition(f, offsetTo);
        yamlOfDate = yamlOfDate.join('\n');
        let parsedYaml;
        try {
          parsedYaml = YAML.parse(yamlOfDate, {schema: 'failsafe'});
        } catch (err) {
          err.source_timing = timingName;
          err.source_timing_location = filepath;
          err.lineNumOffset = lineNumOffsetFrom;
          throw err;
        }
        let parsedTimings = parseYamlTimings(parsedYaml);

        if (parsedTimings.length > 1) {
          // console.log(`[readTimingsForRangeOfDates] about to throw error. parsedTimings: ${JSON.stringify(parsedTimings)}`);
          throw new Error(`expected one item corresponding to timings of one date from parse_yaml_timings. len(parsedTimings) = ${parsedTimings.length}`);
        }

        if (parsedTimings.length === 0) {
          continue;
        }

        let parsedTimingsOfDate = parsedTimings[0];
        resultObject.timingsByDays.push(parsedTimingsOfDate);
      }
    }
    if (resultObject.timingsByDays.length > 0) {
      result[timingName] = resultObject;
    }
  }
  return result;
}

function readTimingsForThreeLastDays(config, timing2indexFilename, indexDirFilepath) {
  let today = new Date();
  let dayBeforeYesterday = new Date();
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  // today.setTime(Date.parse(dateAsYearMonthDayWithHyphens(today) + "T00:00:00")); // format: "YYYY-mm-ddT00:00:00"
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);
  // dayBeforeYesterday.setTime(Date.parse(dateAsYearMonthDayWithHyphens(dayBeforeYesterday) + "T00:00:00")); // format: "YYYY-mm-ddT00:00:00"
  dayBeforeYesterday.setHours(0);
  dayBeforeYesterday.setMinutes(0);
  dayBeforeYesterday.setSeconds(0);
  // console.log(`[readTimingsForThreeLastDays] dayBeforeYesterday: ${dayBeforeYesterday}, today: ${today}`);
  // console.log(`[readTimingsForThreeLastDays] dayBeforeYesterday: ${dateAsDayMonthYearWithDots(dayBeforeYesterday)}, today: ${dateAsDayMonthYearWithDots(today)}`);
  return readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, dayBeforeYesterday, today);
}

function dateAsDayMonthYearWithDots(date) {
  let pad = v => `0${v}`.slice(-2);
  let year = date.getFullYear();
  let month = pad(date.getMonth() + 1)
  let day = pad(date.getDate());
  return `${day}.${month}.${year}`;
}

// function dateAsYearMonthDayWithHyphens(date) {
//   let pad = v => `0${v}`.slice(-2);
//   let year = date.getFullYear();
//   let month = pad(date.getMonth() + 1)
//   let day = pad(date.getDate());
//   return `${year}-${month}-${day}`;
// }

async function readTimingsOfToday(config, timing2indexFilename, indexDirFilepath) {
  let result = {};
  let currentTime = new Date();
  let todayStr = dateAsDayMonthYearWithDots(currentTime);
  const todayAsDate = new Date();
  // todayAsDate.setTime(Date.parse(dateAsYearMonthDayWithHyphens(currentTime) + "T00:00:00")); // format: "YYYY-mm-ddT00:00:00"
  todayAsDate.setHours(0);
  todayAsDate.setMinutes(0);
  todayAsDate.setSeconds(0);
  
  for (let timing of config.timings) {
    let timingName = timing['name'];
    let filepath = expanduser(timing['filepath']);
    let indexFilename = timing2indexFilename[timingName];
    let indexFilepath = path.join(indexDirFilepath, indexFilename);
    let offsetsOfToday = null;
    const generator = await yieldIndexForRangeOfDates(indexFilepath, todayAsDate, todayAsDate);
    let { indexEntry, done } = await generator.next();
    if (!done) {
      offsetsOfToday = indexEntry;
    }
    let timingCategoryPath = timing.categoryPath;
    if (timingCategoryPath === undefined) {
      timingCategoryPath = [timingName];
    }
    let resultObject = {
      name: timingName,
      categoryPath: timingCategoryPath,
    };
    let frmt = timing['format'];
    if (frmt === 'txt' || !frmt) {
      let timings = [];
      if (offsetsOfToday !== null) {
        let {offsetFrom, offsetTo, lineNumOffsetFrom} = offsetsOfToday;
        let f = new LineReader(filepath, { encoding: 'utf8', start: offsetFrom, lineNumOffset: lineNumOffsetFrom });
        let lines = await _readLinesUntilPosition(f, offsetTo);
        timings = parseTimingFileLines(lines);
      }
      resultObject.timingsByDays = timings;
    } else if (frmt === 'yaml') {
      let parsedYaml = {};
      if (offsetsOfToday !== null) {
        let {offsetFrom, offsetTo, lineNumOffsetFrom} = offsetsOfToday;
        let f = new LineReader(filepath, { encoding: 'utf8', start: offsetFrom, lineNumOffset: lineNumOffsetFrom });
        let yamlOfDate = await _readLinesUntilPosition(f, offsetTo);
        yamlOfDate = yamlOfDate.join('\n');
        parsedYaml = YAML.parse(yamlOfDate, {schema: 'failsafe'});
      }
      let parsedTimings = parseYamlTimings(parsedYaml);

      resultObject.timingsByDays = parsedTimings;
    }
    result[timingName] = resultObject;
  }
  return result;
}

function parseYamlTimings(parsedYaml) {
  let result = [];

  if (parsedYaml === undefined || parsedYaml === null) {
    return result;
  }

  let currentDayTimings = [];
  let currentDay = null;

  for (const [k, v] of Object.entries(parsedYaml)) {
    let timeFromTo = k;
    let match = timeFromTo.match(new RegExp(PATTERN_DATE_AND_TIMING));
    if (match === null) {
      continue;
    }
    let dayOfMonth = match[1];
    let month = match[2];
    let year = match[3];
    // let dictDate = {
    //   dayOfMonth: dayOfMonth,
    //   month: month,
    //   year: year,
    // };
    year = Number(year);
    if (year < 100) {
      year += 2000;
    }
    let dt = [Number(dayOfMonth), Number(month), year];
    if (currentDay !== null && arraysEq(dt, currentDay)) {
    } else {
      currentDay = dt;
      currentDayTimings = [];
      result.push({date: currentDay, timings: currentDayTimings});
    }
    let fromHour = match[4];
    let fromMinute = match[5];
    let toHour = match[6];
    let toMinute = match[7];
    let minutes = match[8];
    // let timing = {
    //   from_hour: fromHour,
    //   from_minute: fromMinute,
    //   to_hour: toHour,
    //   to_minute: toMinute,
    //   minutes: minutes,
    //   name: name
    // };
    fromHour = Number(fromHour);
    fromMinute = Number(fromMinute);
    toHour = Number(toHour);
    toMinute = Number(toMinute);
    if (minutes === undefined || minutes === null) {
      minutes = computeMinutes(fromHour, fromMinute, toHour, toMinute);
    } else {
      minutes = Number(minutes);
    }
    currentDayTimings.push({
      from: [fromHour, fromMinute],
      to: [toHour, toMinute],
      minutes: minutes,
      name: JSON.stringify(v),
      value: v
    });
  }
  return result;
}

function parseTimingFileLines(lines) {
  let result = [];
  let currentDayTimings = [];
  let currentDay = null;

  for (let line of lines) {
    let match = line.match(new RegExp(PATTERN_DATE));
    if (match !== null) {
      if (currentDay !== null) {
        result.push({date: currentDay, timings: currentDayTimings});
      }
      let dayOfMonth = match[1];
      let month = match[2];
      let year = match[3];
      // let dictDate = {
      //   dayOfMonth: dayOfMonth,
      //   month: month,
      //   year: year,
      // };
      year = Number(year);
      if (year < 100) {
        year += 2000;
      }
      currentDay = [Number(dayOfMonth), Number(month), year]
      currentDayTimings = []
    }
    match = line.match(new RegExp(PATTERN_TIMING));
    if (match !== null) {
      let fromHour = match[1];
      let fromMinute = match[2];
      let toHour = match[3];
      let toMinute = match[4];
      let minutes = match[5];
      let name = match[6];
      // let timing = {
      //   from_hour: fromHour,
      //   from_minute: fromMinute,
      //   to_hour: toHour,
      //   to_minute: toMinute,
      //   minutes: minutes,
      //   name: name
      // };
      fromHour = Number(fromHour);
      fromMinute = Number(fromMinute);
      toHour = Number(toHour);
      toMinute = Number(toMinute);
      if (minutes === undefined || minutes === null) {
        minutes = computeMinutes(fromHour, fromMinute, toHour, toMinute);
      } else {
        minutes = Number(minutes);
      }
      currentDayTimings.push({
        from: [fromHour, fromMinute],
        to: [toHour, toMinute],
        minutes: minutes,
        name: name
      });
    }
    match = line.match(new RegExp(PATTERN_DATE_AND_TIMING));
    if (match !== null) {
      let dayOfMonth = match[1];
      let month = match[2];
      let year = match[3];
      // let dictDate = {
      //   dayOfMonth: dayOfMonth,
      //   month: month,
      //   year: year,
      // };
      year = Number(year);
      if (year < 100) {
        year += 2000;
      }
      let dt = [Number(dayOfMonth), Number(month), year];
      if (currentDay !== null && arraysEq(dt, currentDay)) {
      } else {
        currentDay = dt;
        currentDayTimings = [];
        result.push({date: currentDay, timings: currentDayTimings});
      }
      let fromHour = match[4];
      let fromMinute = match[5];
      let toHour = match[6];
      let toMinute = match[7];
      let minutes = match[8];
      let name = match[9];
      // let timing = {
      //   from_hour: fromHour,
      //   from_minute: fromMinute,
      //   to_hour: toHour,
      //   to_minute: toMinute,
      //   minutes: minutes,
      //   name: name
      // };
      fromHour = Number(fromHour);
      fromMinute = Number(fromMinute);
      toHour = Number(toHour);
      toMinute = Number(toMinute);
      if (minutes === undefined || minutes === null) {
        minutes = computeMinutes(fromHour, fromMinute, toHour, toMinute);
      } else {
        minutes = Number(minutes);
      }
      currentDayTimings.push({
        from: [fromHour, fromMinute],
        to: [toHour, toMinute],
        minutes: minutes,
        name: name
      });
    }
    if (line === '-') { continue; }
  }
  if (currentDay !== null && currentDayTimings.length > 0) {
    result.push({date: currentDay, timings: currentDayTimings});
  }
  return result;
}

function computeMinutes(fromHour, fromMinute, toHour, toMinute) {
  let hourDiff = toHour - fromHour;
  if (hourDiff < 0) {
    hourDiff += 24;
  }
  let minutes = toMinute - fromMinute + 60*hourDiff;
  return minutes;
}

function arraysEq(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

async function _readLinesUntilPosition(lineReader, position) {
  let lines = [];
  while (true) {
    let offset = lineReader.getOffset();
    // console.log(`[_readLinesUntilPosition] offset: ${offset}, position: ${position}`);
    if (offset >= position) {
      // console.log(`[_readLinesUntilPosition] exiting loop (reached position)`);
      break;
    }
    let { line, isEOF } = await lineReader.readline();
    if (isEOF) {
      // console.log(`[_readLinesUntilPosition] exiting loop (eof)`);
      break;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

