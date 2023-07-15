export function turnMultilineTextIntoHtml(text) {
  return withChildren(document.createElement('div'),
    ...text.split("\n")
      .map(line => turnWhitespacePrefixIntoNbsp(line))
      .flatMap(el => [el,document.createElement("br")])
      .slice(0, -1)
  )
}

function turnWhitespacePrefixIntoNbsp(line) {
  let match = line.match(/^(\s+)(.*)/);
  let elem = document.createElement('span');
  if (!match) {
    elem.innerHTML = line;
    return elem;
  }
  let prefix = match[1];
  let afterPrefix = match[2];
  let nbsps = Array.prototype.map.call(prefix, _ => '&nbsp;').join('');
  elem.innerHTML = nbsps + afterPrefix;
  return elem;
}

export function addOffsetToLineNumberInErrorMessage(text, offset) {
  return text.replace(/at line (\d+)/g, (_, n) => {
    n = parseInt(n);
    return `at line ${n + offset}`;
  });
}

export function showTimingsFormatError(wrapperElementId, err) {
  let wrapper = document.getElementById(wrapperElementId);
  let errorMessage = err.message;
  if (err.fromdateStr !== undefined) {
    errorMessage = `(timing at: ${err.fromdateStr})\n${errorMessage}`;
  }
  if (err.source_timing) {
    errorMessage = `(source timing: ${err.source_timing})\n${errorMessage}`;
  }
  wrapper.innerHTML = "";
  let errorMessageHtml = turnMultilineTextIntoHtml(errorMessage);
  wrapper.appendChild(errorMessageHtml);
}

export function withChildren(elem, ...children) {
  children.forEach(child => elem.appendChild(child));
  return elem;
}

export function withClass(elem, ...classes) {
  for (let cls of classes) {
    elem.classList.add(cls);
  }
  return elem;
}

export function withId(elem, id) {
  elem.id = id;
  return elem;
}
