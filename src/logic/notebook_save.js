const path = require('path')
const fs = require('fs');
const YAML = require('yaml');

const { expanduser } = require('./file_utils.js');

export async function saveNotebook(preYamlJson, filepath) {
  // // let stringified = YAML.stringify(preYamlJson, {indent: 2, indentSeq: false});
  // let stringified = YAML.stringify(preYamlJson, {
  //   indent: 2,
  //   indentSeq: false,
  //   // blockQuote: 'literal',
  //   defaultKeyType: 'PLAIN',
  //   // defaultStringType: 'BLOCK_LITERAL',
  // });

  let doc = new YAML.Document(preYamlJson);
  YAML.visit(doc, (key, node, path) => {
    if (key === 'key' && node.type === undefined) {
      let containsNewline = node.value.indexOf('\n') >= 0;
      if (containsNewline) {
        node.type = 'BLOCK_LITERAL';
        return node;
      }
    }
  });

  let stringified = YAML.stringify(doc, {
    indent: 2,
    indentSeq: false,
  });

  const filepathWithExpandedUser = expanduser(filepath);
  const dirname = path.dirname(filepathWithExpandedUser);
  const ext = path.extname(filepath);
  const filenameNoExt = path.basename(filepath, ext);
  let suffix = (function() {
    const date = new Date();

    function pad(v) {
      return `0${v}`.slice(-2);
    }

    let day = pad(date.getDate());
    let month = pad(date.getMonth() + 1);
    let year = date.getFullYear()
    let hours = pad(date.getHours());
    let minutes = pad(date.getMinutes());
    let seconds = pad(date.getSeconds());
    return `_${year}_${month}_${day}__${hours}_${minutes}_${seconds}`;
  })();

  const copyTo = path.join(dirname, filenameNoExt + suffix + ext);
  await fs.promises.copyFile(filepathWithExpandedUser, copyTo);
  await fs.promises.writeFile(filepathWithExpandedUser, stringified);
}
