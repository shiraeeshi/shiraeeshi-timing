const fs = require('fs');
const YAML = require('yaml');
const path = require('path');
const crypto = require('crypto');
const { LineReader } = require('./line_reader.js');
const { PATTERN_DATE_AND_TIMING } = require('./timing_file_parser_patterns.js');
const { expanduser } = require('./file_utils.js');

const _fileExists = async filePath => fs.promises.stat(filePath).then(() => true, (e) => {console.log(`err: ${e}`); return false;});

export async function createOrRefreshIndex(configFilepath, indexDirFilepath) {
  // console.log(`configFilepath: ${configFilepath}\nindexDirFilepath: ${indexDirFilepath}`);
  const timing2indexFilename = await _createTiming2indexFilenameMap(indexDirFilepath);
  const configFileContents = await fs.promises.readFile(configFilepath, 'utf8');
  const config = YAML.parse(configFileContents);
  for (const timing of config.timings) {
    const timingName = timing['name'];
    const indexName = timing2indexFilename[timingName];
    if (indexName) {
       const timingFilepath = expanduser(timing['filepath']);
       const indexFilepath = path.join(indexDirFilepath, indexName);
       const indexFileExists = await _fileExists(indexFilepath);
       if (indexFileExists) {
         // console.log(`refresh_index() for timing ${timingName}`);
         await _refreshIndex(timing, indexName, indexDirFilepath);
       } else {
         // console.log(`create_index_for_timing() for timing ${timingName}`);
         await _createIndexForTiming(timing, indexName, indexDirFilepath);
       }
    } else {
      const uuid = crypto.randomUUID();
      timing2indexFilename[timingName] = uuid;
      // console.log(`create_index_for_timing() for timing ${timingName} with new uuid as index name`);
      await _createIndexForTiming(timing, uuid, indexDirFilepath);
    }
  }

  const setOfTimingsNamesFromConfig = new Set(config.timings.map(t => t.name));
  const namesOfTimingsNoLongerInConfig = Object.keys(timing2indexFilename).filter(x => !setOfTimingsNamesFromConfig.has(x));
  const indexFilenamesOfTimingsNoLongerInConfig = [];
  for (let name of namesOfTimingsNoLongerInConfig) {
    indexFilenamesOfTimingsNoLongerInConfig.push(timing2indexFilename[name]);
    delete timing2indexFilename[name];
  }

  // console.log('[createOrRefreshIndex] 1');
  const indexNamesFilepath = path.join(indexDirFilepath, 'filenames_of_indexes');
  const fileIndexNames = fs.createWriteStream(indexNamesFilepath, { encoding: 'utf8' });
  // console.log('[createOrRefreshIndex] 2 before loop over timing2indexFilename');
  for (const [timingName, indexName] of Object.entries(timing2indexFilename)) {
    await _writeToStream(fileIndexNames, `index-name: ${indexName}, timing-name: ${timingName}\n`);
  }

  for (let indexFilename of indexFilenamesOfTimingsNoLongerInConfig) {
    try {
      const indexFilepath = path.join(indexDirFilepath, indexFilename);
      await fs.promises.rm(indexFilepath, {force: true});
    } catch (err) {
      console.log(`[createOrRefreshIndex] error while deleting index file: ${err.message}`);
    }

    try {
      const indexLM_Filepath = path.join(indexDirFilepath, indexFilename + '.last_modified');
      await fs.promises.rm(indexLM_Filepath, {force: true});
    } catch (err) {
      console.log(`[createOrRefreshIndex] error while deleting .last_modified file: ${err.message}`);
    }
  }
  // console.log('[createOrRefreshIndex] about to return');
  return timing2indexFilename;
}

async function _refreshIndex(timing, indexName, indexesDirFilepath) {
  const timingName = timing['name'];
  const timingFilepath = expanduser(timing['filepath']);
  // console.log(`timingFilepath: ${timingFilepath} (before _fileExists)`);
  const timingFileExists = await _fileExists(timingFilepath);
  // console.log(`timingFilepath: ${timingFilepath} (after _fileExists, result: ${timingFileExists})`);
  if (!timingFileExists) {
    console.log(`error: cannot refresh index: timing file doesn't exist: ${timingName}. filepath: ${timingFilepath}`);
    return;
  }
  const { mtimeMs: timingLastModified } = await fs.promises.stat(timingFilepath);

  let indexLastModified = null;

  const indexLastModifiedFilepath = path.join(indexesDirFilepath, indexName + '.last_modified');
  const existsILM = await _fileExists(indexLastModifiedFilepath);
  if (existsILM) {
    indexLastModified = await fs.promises.readFile(indexLastModifiedFilepath).then(lmStr => Number(lmStr), _err => null);
  }
  // if (indexLastModified === null) {
  //   console.log(`couldn't read index_last_modified for timing ${timingName}, recreating index`);
  //   const indexFilepath = path.join(indexesDirFilepath, indexName);
  //   await fs.promises.rm(indexFilepath);
  //   _createIndexForTiming(timing, indexName, indexesDirFilepath);
  // } else if (indexLastModified === timingLastModified) {
  if (indexLastModified !== null && indexLastModified === timingLastModified) {
    // console.log(`index_last_modified is the same as timing_last_modified, skipping recreating index for timing ${timingName}`);
  } else {
    // console.log(`index_last_modified != timing_last_modified (or couldn't read index_last_modified), going to refresh the index for timing ${timingName}`);
    await _truncateAfterFirstDiffAndAppendToIndex(timing, indexName, indexesDirFilepath);
    // console.log(`refreshed the index for timing ${timingName}`);
  }
}

async function _truncateAfterFirstDiffAndAppendToIndex(timing, indexName, indexesDirFilepath) {
  const timingName = timing['name'];
  const timingFilepath = expanduser(timing['filepath']);
  const indexFilepath = path.join(indexesDirFilepath, indexName);
  const traversalResult = await _traverseIndexUntilFirstDiff(timingName, timingFilepath, indexName, indexFilepath);
  const resultType = traversalResult.resultType;

  if (resultType === TypeOfResultOfIndexTraverse.NO_DIFF) {
    // do nothing
  } else if (resultType === TypeOfResultOfIndexTraverse.REACHED_THE_DIFF) {
    await fs.promises.truncate(indexFilepath, traversalResult.truncateIndexAt);
    await _appendToIndexForTiming(timingName, timingFilepath, indexName, indexFilepath, traversalResult.traversedTimingUntil, traversalResult.traversedTimingUntilLineNum);
  } else if (resultType === TypeOfResultOfIndexTraverse.REACHED_THE_END_OF_INDEX) {
    await _appendToIndexForTiming(timingName, timingFilepath, indexName, indexFilepath, traversalResult.traversedTimingUntil, traversalResult.traversedTimingUntilLineNum);
  } else if (resultType === TypeOfResultOfIndexTraverse.INDEX_IS_LONGER_THAN_TIMING) {
    await fs.promises.truncate(indexFilepath, traversalResult.truncateIndexAt);
  } else {
    throw new Error(`unknown type of ResultOfIndexTraverse: ${resultType}`);
  }
  await _rememberTimingLastModified(timingFilepath, indexName, indexesDirFilepath);
}


function TypeOfResultOfIndexTraverse() { }
TypeOfResultOfIndexTraverse.NO_DIFF = new TypeOfResultOfIndexTraverse();
TypeOfResultOfIndexTraverse.REACHED_THE_DIFF = new TypeOfResultOfIndexTraverse();
TypeOfResultOfIndexTraverse.REACHED_THE_END_OF_INDEX = new TypeOfResultOfIndexTraverse();
TypeOfResultOfIndexTraverse.INDEX_IS_LONGER_THAN_TIMING = new TypeOfResultOfIndexTraverse();

function ResultOfIndexTraverse(typeOfResult, params) {
  this.resultType = typeOfResult;
  this.truncateIndexAt = params.truncateIndexAt;
  this.traversedTimingUntil = params.traversedTimingUntil;
  this.traversedTimingUntilLineNum = params.traversedTimingUntilLineNum;
}

ResultOfIndexTraverse.noDiff = function() {
  return new ResultOfIndexTraverse(TypeOfResultOfIndexTraverse.NO_DIFF, {});
};
ResultOfIndexTraverse.reachedTheDiff = function(params) {
  return new ResultOfIndexTraverse(TypeOfResultOfIndexTraverse.REACHED_THE_DIFF, params);
};
ResultOfIndexTraverse.reachedTheEndOfIndex = function(params) {
  return new ResultOfIndexTraverse(TypeOfResultOfIndexTraverse.REACHED_THE_END_OF_INDEX, params);
};
ResultOfIndexTraverse.indexIsLongerThanTiming = function(params) {
  return new ResultOfIndexTraverse(TypeOfResultOfIndexTraverse.INDEX_IS_LONGER_THAN_TIMING, params);
};

async function _traverseIndexUntilFirstDiff(timingName, timingFilepath, indexName, indexFilepath) {
  const indexReader = new LineReader(indexFilepath, { encoding: 'utf8' });
  const timingReader = new LineReader(timingFilepath, { encoding: 'utf8' });
  const { line: firstLineOfIndex, isEOF: indexIsEmpty } = await indexReader.readline();
  if (indexIsEmpty || firstLineOfIndex !== "date,line_num_offset,offset_from,offset_to") {
    throw new Error(`error reading index: wrong format (doesn't start with header \"date,line_num_offset,offset_from,offset_to\"). timing: ${timingName}, index file: ${indexName}`);
  }
  // console.log('index file starts with header \"date,line_num_offset,offset_from,offset_to\"');
  let prevIndexEntry = null;
  while (true) {
    let indexOffset = indexReader.getOffset();
    let { line: lineOfIndex, isEOF: indexEOF } = await indexReader.readline();
    if (indexEOF) {
      // console.log(`_traverseIndexUntilFirstDiff: about to return (reached the end of the index) for timing ${timingName}`);
      if (prevIndexEntry === null) {
        // console.log('reachedTheEndOfIndex' + JSON.stringify({
        //   traversedTimingUntil: timingReader.getOffset(),
        //   traversedTimingUntilLineNum: timingReader.getLineNumOffset()
        // }));
        return ResultOfIndexTraverse.reachedTheEndOfIndex({
          traversedTimingUntil: timingReader.getOffset(),
          traversedTimingUntilLineNum: timingReader.getLineNumOffset()
        });
      } else {
        // console.log('reachedTheEndOfIndex' + JSON.stringify({
        //   traversedTimingUntil: prevIndexEntry.offsetFrom,
        //   traversedTimingUntilLineNum: prevIndexEntry.lineNumOffset
        // }));
        return ResultOfIndexTraverse.reachedTheEndOfIndex({
          traversedTimingUntil: prevIndexEntry.offsetFrom,
          traversedTimingUntilLineNum: prevIndexEntry.lineNumOffset
        });
      }
    }
    while (true) {
      let offset = timingReader.getOffset();
      let lineNumOffset = timingReader.getLineNumOffset();
      let { line: lineTiming, isEOF: timingEOF } = await timingReader.readline();
      // console.log(`line of timing: ${lineTiming}, offset: ${offset}`);
      if (timingEOF) {
        if (prevIndexEntry !== null) {
          let expectedIndexLine = `${prevIndexEntry.date},${prevIndexEntry.lineNumOffset},${prevIndexEntry.offsetFrom},${offset}`;
          if (lineOfIndex !== expectedIndexLine) {
            // console.log(`(last line) _traverse_index_prefix_and_truncate_after_first_diff: about to truncate for timing ${timingName}: line_of_index != expected_index_line, line_of_index: ${lineOfIndex}, expected_index_line: ${expectedIndexLine}`);
            // console.log('reachedTheDiff' + JSON.stringify({
            //   truncateIndexAt: indexOffset,
            //   traversedTimingUntil: prevIndexEntry.offsetFrom,
            //   traversedTimingUntilLineNum: prevIndexEntry.lineNumOffset
            // }));
            return ResultOfIndexTraverse.reachedTheDiff({
              truncateIndexAt: indexOffset,
              traversedTimingUntil: prevIndexEntry.offsetFrom,
              traversedTimingUntilLineNum: prevIndexEntry.lineNumOffset
            });
          }
        }
        let { line: tmpIndexLine, isEOF: endOfIndexReached } = await indexReader.readline();
        if (endOfIndexReached) {
          return ResultOfIndexTraverse.noDiff();
        } else {
          // console.log(`_traverse_index_prefix_and_truncate_after_first_diff: about to truncate (end_of_index_reached is False) for timing ${timingName}. index line: ${tmpIndexLine}`);
          // console.log('indexIsLongerThanTiming' + JSON.stringify({
          //   truncateIndexAt: indexReader.getOffset(),
          // }));
          return ResultOfIndexTraverse.indexIsLongerThanTiming({
            truncateIndexAt: indexReader.getOffset(),
          });
        }
      }
      let match = lineTiming.match(new RegExp(PATTERN_DATE_AND_TIMING));
      if (match === null) {
        continue;
      }
      let dayOfMonth = match[1];
      let month = match[2];
      let year = match[3];
      year = Number(year);
      if (year < 100) {
        year += 2000;
      }
      let aDate = `${dayOfMonth}.${month}.${year}`;
      // console.log(`aDate: ${aDate}`);
      if (prevIndexEntry === null) {
        prevIndexEntry = {date: aDate, lineNumOffset: lineNumOffset, offsetFrom: offset};
        continue;
      }
      if (aDate !== prevIndexEntry.date) {
        let expectedIndexLine = `${prevIndexEntry.date},${prevIndexEntry.lineNumOffset},${prevIndexEntry.offsetFrom},${offset}`;
        if (lineOfIndex !== expectedIndexLine) {
          // console.log(`_traverse_index_prefix_and_truncate_after_first_diff: about to truncate for timing ${timingName}: line_of_index != expected_index_line, line_of_index: ${lineOfIndex}, expected_index_line: ${expectedIndexLine}`);
          // console.log('reachedTheDiff' + JSON.stringify({
          //   truncateIndexAt: indexOffset,
          //   traversedTimingUntil: prevIndexEntry.offsetFrom,
          //   traversedTimingUntilLineNum: prevIndexEntry.lineNumOffset
          // }));
          return ResultOfIndexTraverse.reachedTheDiff({
            truncateIndexAt: indexOffset,
            traversedTimingUntil: prevIndexEntry.offsetFrom,
            traversedTimingUntilLineNum: prevIndexEntry.lineNumOffset
          });
        } else {
          prevIndexEntry = {date: aDate, lineNumOffset: lineNumOffset, offsetFrom: offset};
          break;
        }
      }
    }
  }
}

async function _appendToIndexForTiming(timingName, timingFilepath, indexName, indexFilepath, startingPositionInTimingFile, lineNumOffsetInTimingFile) {
  const timingReader = new LineReader(timingFilepath, { encoding: 'utf8', start: startingPositionInTimingFile, lineNumOffset: lineNumOffsetInTimingFile});
  // const { size: indexFileSize } = await fs.promises.stat(indexFilepath);
  // console.log(`[_appendToIndexForTiming] indexFileSize: ${indexFileSize}`);
  // const indexFile = fs.createWriteStream(indexFilepath, { encoding: 'utf8', start: indexFileSize });
  const indexFile = fs.createWriteStream(indexFilepath, { flags: 'a', encoding: 'utf8' });
  let prevIndexEntry = null;
  while (true) {
    let offset = timingReader.getOffset();
    let lineNumOffset = timingReader.getLineNumOffset();
    let { line: lineTiming, isEOF: timingEOF } = await timingReader.readline();
    // console.log(`line of timing: ${lineTiming}, offset: ${offset}`);
    if (timingEOF) {
      if (prevIndexEntry !== null) {
        await _writeToStream(indexFile, `${prevIndexEntry.date},${prevIndexEntry.lineNumOffsetFrom},${prevIndexEntry.offsetFrom},${offset}\n`);
      }
      indexFile.end();
      break;
    }
    let match = lineTiming.match(new RegExp(PATTERN_DATE_AND_TIMING));
    if (match === null) {
      continue;
    }
    let dayOfMonth = match[1];
    let month = match[2];
    let year = match[3];
    year = Number(year);
    if (year < 100) {
      year += 2000;
    }
    let aDate = `${dayOfMonth}.${month}.${year}`;
    // console.log(`aDate: ${aDate}`);
    if (prevIndexEntry === null) {
      prevIndexEntry = {date: aDate, lineNumOffsetFrom: lineNumOffset, offsetFrom: offset};
      continue;
    }
    if (aDate !== prevIndexEntry.date) {
      await _writeToStream(indexFile, `${prevIndexEntry.date},${prevIndexEntry.lineNumOffsetFrom},${prevIndexEntry.offsetFrom},${offset}\n`);
      prevIndexEntry = {date: aDate, lineNumOffsetFrom: lineNumOffset, offsetFrom: offset};
    }
  }
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

async function _createIndexForTiming(timing, indexName, indexDirFilepath) {
  const timingName = timing['name'];
  const timingFilepath = expanduser(timing['filepath']);
  const indexFilepath = path.join(indexDirFilepath, indexName);

  await fs.promises.writeFile(indexFilepath, "date,line_num_offset,offset_from,offset_to\n", { encoding: 'utf8' });
  // <debug>
  // const { size: indexFileSize } = await fs.promises.stat(indexFilepath);
  // console.log(`[_createIndexForTiming] indexFileSize: ${indexFileSize}`);
  // </debug>
  // console.log(`[_createIndexForTiming] before _appendToIndexForTiming. timingFilepath: ${timingFilepath}`);
  await _appendToIndexForTiming(timingName, timingFilepath, indexName, indexFilepath, 0, 0);
  // console.log('[_createIndexForTiming] after _appendToIndexForTiming');
  // console.log('[_createIndexForTiming] before _rememberTimingLastModified');
  await _rememberTimingLastModified(timingFilepath, indexName, indexDirFilepath);
  // console.log('[_createIndexForTiming] after _rememberTimingLastModified');
}

async function _rememberTimingLastModified(timingFilepath, indexName, indexDirFilepath) {
  const indexLM_Filepath = path.join(indexDirFilepath, indexName + '.last_modified');
  const { mtimeMs: timingLastModified } = await fs.promises.stat(timingFilepath);
  await fs.promises.writeFile(indexLM_Filepath, `${timingLastModified}`);
}

export async function* yieldIndexForRangeOfDates(indexFilepath, dateFrom, dateTo) {
  const f = new LineReader(indexFilepath, { encoding: 'utf8' });
  let lineNumber = 0;
  while (true) {
    let { line, isEOF } = await f.readline();
    // console.log(`[yieldIndexForRangeOfDates] line: ${line}, isEOF: ${isEOF}`);
    if (isEOF) {
      break;
    }
    lineNumber++;
    if (lineNumber === 1) {
      const firstLine = line;
      if (firstLine !== "date,line_num_offset,offset_from,offset_to") {
        throw new Error("error reading index: wrong format (doesn't start with header \"date,line_num_offset,offset_from,offset_to\")");
      }
      continue;
    }
    let words = line.split(",");
    if (words.length != 4) {
      throw new Error(`error while parsing timing index: wrong format (line.split(",").length != 4). line ${lineNumber}: ${line}`);
    }
    let dateAsStr = words[0];
    let dateAsStrSplitted = dateAsStr.split("."); // format: "%d.%m.%Y"
    let dayOfMonth = dateAsStrSplitted[0];
    let month = dateAsStrSplitted[1];
    let year = dateAsStrSplitted[2];

    let date = new Date();
    date.setTime(Date.parse(`${year}-${month}-${dayOfMonth}T00:00:00`));

    if (date < dateFrom) {
      continue;
    }
    if (date > dateTo) {
      break;
    }

    let lineNumOffsetFrom = words[1];
    let offsetFrom = words[2];
    let offsetTo = words[3];
    try {
      lineNumOffsetFrom = parseInt(lineNumOffsetFrom);
      offsetFrom = parseInt(offsetFrom);
      offsetTo = parseInt(offsetTo);
      let offsetsLineObj = {date: dateAsStr, lineNumOffsetFrom: lineNumOffsetFrom, offsetFrom: offsetFrom, offsetTo: offsetTo};
      yield offsetsLineObj;
    } catch (err) {
      console.log(`error while parsing timing index: wrong format (couldn't parse as int). line ${lineNumber}: ${line}`);
      throw err;
    }
  }
}

async function readIndexForSetOfDates(indexFilepath, setOfDates) {
  const f = new LineReader(indexFilepath, { encoding: 'utf8' });
  let lineNumber = 0;
  let offsetsByDate = {};
  while (true) {
    let { line, isEOF } = await f.readline();
    if (isEOF) {
      break;
    }
    lineNumber++;
    if (lineNumber === 1) {
      const firstLine = line;
      if (firstLine !== "date,line_num_offset,offset_from,offset_to") {
        throw new Error("error reading index: wrong format (doesn't start with header \"date,line_num_offset,offset_from,offset_to\")");
      }
      continue;
    }
    let words = line.split(",");
    if (words.length != 4) {
      throw new Error(`error while parsing timing index: wrong format (line.split(",").length != 4). line ${lineNumber}: ${line}`);
    }
    let dateAsStr = words[0];
    if (!setOfDates.has(dateAsStr)) {
      continue;
    }

    let lineNumOffsetFrom = words[1];
    let offsetFrom = words[2];
    let offsetTo = words[3];
    try {
      lineNumOffsetFrom = parseInt(lineNumOffsetFrom);
      offsetFrom = parseInt(offsetFrom);
      offsetTo = parseInt(offsetTo);
      offsetsByDate[dateAsStr] = {lineNumOffsetFrom: lineNumOffsetFrom, offsetFrom: offsetFrom, offsetTo: offsetTo};
    } catch (err) {
      console.log(`error while parsing timing index: wrong format (couldn't parse as int). line ${lineNumber}: ${line}`);
      throw err;
    }
  }
  return offsetsByDate;
}

export async function forgetLastModifiedTimeOfTimings(timingsNames, indexDirFilepath) {
  const timing2indexFilename = await _createTiming2indexFilenameMap(indexDirFilepath);

  for (let timingName of timingsNames) {
    let indexFilename = timing2indexFilename[timingName];
    if (indexFilename === undefined) {
      continue;
    }

    const indexLM_Filepath = path.join(indexDirFilepath, indexFilename + '.last_modified');
    try {
      await fs.promises.rm(indexLM_Filepath, {force: true});
    } catch (err) {
      console.log(`[forgetLastModifiedTimeOfTimings] error while deleting .last_modified file: ${err.message}`);
    }
  }
}

async function _createTiming2indexFilenameMap(indexDirFilepath) {
  const indexNamesFilepath = path.join(indexDirFilepath, 'filenames_of_indexes');
  const timing2indexFilename = {};
  const indexNamesFileExists = await _fileExists(indexNamesFilepath);
  // console.log(`indexNamesFileExists: ${indexNamesFileExists}`);
  if (indexNamesFileExists) {
    const patternNames = /index-name: ([a-z0-9-]+), timing-name: (.+)$/;
    const lineReader = new LineReader(indexNamesFilepath, { encoding: 'utf8' });
    while (true) {
      let { line, isEOF } = await lineReader.readline();
      if (isEOF) {
        break;
      }
      // console.log(`line: ${line}`);
      const match = line.match(patternNames);
      const indexName = match[1];
      const timingName = match[2];
      // console.log(`  parsed index-name: '${indexName}'\n  parsed timings file name: '${timingName}'`);
      timing2indexFilename[timingName] = indexName;
    }
  }
  return timing2indexFilename;
}
