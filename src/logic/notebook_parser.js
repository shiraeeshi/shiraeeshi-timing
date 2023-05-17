const fs = require('fs');
const YAML = require('yaml');
const { expanduser } = require('./file_utils.js');

export async function parseNotebook(filepath) {

  let filepathExpanded = expanduser(filepath);
  let fileContents = await fs.promises.readFile(filepathExpanded, { encoding: 'utf8' });
  let parsedYaml = YAML.parse(fileContents, {schema: 'failsafe'});
  return parsedYaml;
}

