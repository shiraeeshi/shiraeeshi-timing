const path = require('path');
const os = require('os');

export function expanduser(path) {
  return path.replace(
    /^~([^\/]+|\/)/,
    (_, $1) => $1 === '/' ? os.homedir() + '/' : `${path.dirname(os.homedir())}/${$1}`
  );
}


