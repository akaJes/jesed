const git = require('simple-git');

const {promisify} = require('./helpers');

var root;

const gitRoot = (dir) =>
  promisify('revparse', git(dir))(['--show-toplevel'])
  .then(str => str.replace(/\r|\n/, ''))
  .then(str => (console.log('[gitRoot]', str), root = str))
  .catch(mst => { console.log('no root'); throw mst; });

exports.root = dir => dir || !root ? gitRoot(dir) : Promise.resolve(root);

exports.Tag = () => promisify('raw', git(root))(['describe', '--all']);

exports.Show = (branch, file) => promisify('show', git(root))([branch + ':' + file.replace(/\\/g, '/')]);
