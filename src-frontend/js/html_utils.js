

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
