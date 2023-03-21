const fs = require('fs');

function LineReaderResponse(line, isEOF) {
  this.line = line;
  this.isEOF = isEOF;
}
LineReaderResponse.EOF = new LineReaderResponse(undefined, true);



function LineReaderState() {}

LineReaderState.STREAM_UNINITIALIZED = new LineReaderState();
LineReaderState.STREAM_ACTIVE_READABLE = new LineReaderState();
LineReaderState.STREAM_ACTIVE_NOT_READABLE = new LineReaderState();
LineReaderState.STREAM_ENDED = new LineReaderState();

LineReaderState.prototype.isActive = function() {
  return this === LineReaderState.STREAM_ACTIVE_READABLE ||
         this === LineReaderState.STREAM_ACTIVE_NOT_READABLE;
};



export function LineReader(filepath, readStreamConfig) {
  const that = this;
  that.filepath = filepath;
  that.readStreamConfig = readStreamConfig;
  that.stream = null;
  that.state = LineReaderState.STREAM_UNINITIALIZED;
  that.position = readStreamConfig.start !== undefined ? readStreamConfig.start : 0;
  that.prevBeginningIndexInChunk = 0;
  that.lastBeginningOfLinePosition = that.position;
  that.lineNumOffset = readStreamConfig.lineNumOffset !== undefined ? readStreamConfig.lineNumOffset : 0;
  that.chunk = null;
  that.isWaitingForNewChunk = true;
  that.lastLinePrefix = '';
  that.currentPromise = null;
  that.currentPromiseResolve = null;
  that.currentPromiseErr = null;
  that.isWaitingToResolvePromise = false;
}

LineReader.prototype.readline = function() {
  // It is not allowed to use lineReader.readline() multiple times on the same lineReader without waiting for the promise to be resolved (or rejected).
  const that = this;
  if (that.state === LineReaderState.STREAM_UNINITIALIZED) {
    that._initStream();
  }
  if (that.isWaitingToResolvePromise) {
    // const promise = that.currentPromise;
    // that._tryResolvePromise();
    // return promise;
    throw new Error("trying to 'readline' while waiting for previous 'readline' is not implemented.");
  }
  if (that.state.isActive()) {
    const promise = new Promise((resolve, err) => {
      that.currentPromiseResolve = resolve;
      that.currentPromiseErr = err;
      that.isWaitingToResolvePromise = true;
      that._tryResolvePromise();
    });
    return promise;
  } else if (that.state === LineReaderState.STREAM_ENDED) {
    return new Promise((resolve) => resolve(LineReaderResponse.EOF));
  }
};

LineReader.prototype.getOffset = function() {
  const that = this;
  return that.lastBeginningOfLinePosition;
};

LineReader.prototype.getLineNumOffset = function() {
  const that = this;
  return that.lineNumOffset;
};

LineReader.prototype._initStream = function() {
  const that = this;
  const stream = fs.createReadStream(that.filepath, that.readStreamConfig);
  that.stream = stream;
  that.state = LineReaderState.STREAM_ACTIVE_NOT_READABLE;
  stream.on('readable', () => {
    that._handleStreamReadable();
  });
  stream.on('end', () => {
    that._handleStreamEnd();
  });
};

LineReader.prototype._handleStreamReadable = function() {
  const that = this;
  that.state = LineReaderState.STREAM_ACTIVE_READABLE;
  that._tryResolvePromise();
};

LineReader.prototype._handleStreamEnd = function() {
  const that = this;
  console.log(`stream ended.\n  filepath: ${that.filepath}\n  chunk: ${that.chunk}`);
  that.state = LineReaderState.STREAM_ENDED;
  that._tryResolvePromise();
};

LineReader.prototype._tryResolvePromise = function() {
  const that = this;
  if (that.isWaitingForNewChunk) { // read from stream if done with previous chunk and stream is readable
    if (that.state !== LineReaderState.STREAM_ACTIVE_READABLE) {
      if (that.state === LineReaderState.STREAM_ENDED && that.isWaitingToResolvePromise) {
        that.currentPromiseResolve(LineReaderResponse.EOF);
        that.currentPromiseResolve = null;
        that.currentPromiseErr = null;
        that.isWaitingToResolvePromise = false;
        that.isWaitingForNewChunk = false;
      }
      return;
    } else {
      that.chunk = that.stream.read();
      if (that.chunk === null) {
        return;
      }
      that.state = LineReaderState.STREAM_ACTIVE_NOT_READABLE;
      that.isWaitingForNewChunk = false;
    }
  }
  if (!that.isWaitingToResolvePromise) {
    return;
  }
  // if (that.state === LineReaderState.STREAM_ENDED) {
  //   that.currentPromiseResolve(LineReaderResponse.EOF);
  //   that.currentPromiseResolve = null;
  //   that.currentPromiseErr = null;
  //   that.isWaitingToResolvePromise = false;
  //   that.isWaitingForNewChunk = false;
  //   return;
  // }
  const chunk = that.chunk;
  let i = that.prevBeginningIndexInChunk;
  while (true) {
    // try {
    //   let smth = chunk.length;
    // } catch (err) {
    //   console.log(`chunk is null. state is readable: ${that.state === LineReaderState.STREAM_ACTIVE_READABLE}, state is not readable: ${that.state === LineReaderState.STREAM_ACTIVE_NOT_READABLE}`);
    //   throw err;
    // }
    if (i > (chunk.length - 1)) {
      if (that.prevBeginningIndexInChunk < chunk.length) {
        if (that.prevBeginningIndexInChunk === 0) {
          that.lastLinePrefix = that.lastLinePrefix + chunk;
	} else {
          that.lastLinePrefix = chunk.slice(that.prevBeginningIndexInChunk);
	}
      }
      that.position += Buffer.byteLength(chunk, 'utf8');
      that.prevBeginningIndexInChunk = 0;
      that.chunk = null;
      that.isWaitingForNewChunk = true;
      that._tryResolvePromise();
      return;
    }
    const char = chunk.charAt(i);
    const isOnLastChar = i === (chunk.length - 1);
    const isAtEOL = char === '\n' || (char === '\r' && !isOnLastChar && chunk.charAt(i+1) !== '\n');
    if (isAtEOL) {
      const subchunk = chunk.slice(that.prevBeginningIndexInChunk, i+1);
      let line;
      if (that.prevBeginningIndexInChunk === 0) {
        line = that.lastLinePrefix + subchunk;
      } else {
        that.lastLinePrefix = '';
        line = subchunk;
      }
      that.prevBeginningIndexInChunk = i + 1;
      // that.lastBeginningOfLinePosition += Buffer.byteLength(subchunk, 'utf8');
      that.lastBeginningOfLinePosition = that.position + Buffer.byteLength(chunk.slice(0, that.prevBeginningIndexInChunk), 'utf8');
      that.currentPromiseResolve(new LineReaderResponse(line.trimEnd()));
      that.currentPromiseResolve = null;
      that.currentPromiseErr = null;
      that.isWaitingToResolvePromise = false;
      that.lineNumOffset++;
      return;
    }
    i++;
  }
};

