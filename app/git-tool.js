const git = require('simple-git');

const {promisify} = require('./helpers');

var root;

const getFirst = text => text.split(/\r\n?|\n/)[0]
const gitRoot = (dir) =>
  promisify(git(dir).revparse, git(dir))(['--show-toplevel'])
  .then(getFirst)
  .then(str => (console.log('[gitRoot]', str), root = str))
  .catch(mst => {console.error('no root'); throw mst; });

exports.Tag = (root) => promisify(git(root).raw, git(root))(['describe', '--all']).then(getFirst)

exports.Show = (root, branch, file) => promisify(git(root).show, git(root))([branch + ':' + file.replace(/\\/g, '/')]);
