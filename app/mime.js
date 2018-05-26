const fs = require("fs");
const path = require("path");

const ft = require('file-type');
const isBinary = require('is-binary');
const mt = require('mime-types');

const {promisify} = require('./helpers');

module.exports = (name) =>
  promisify(fs.stat)(name)
  .then(stats => Promise.all([
    stats,
    new Buffer(Math.min(stats.size, 512)),
    !stats.isDirectory() && promisify(fs.open)(name, 'r'),
  ]))
  .then(a => a[2] && promisify(fs.read)(a[2], a[1], 0, a[1].length, null).then(f => a) || a)
  .then(a => [a[0], path.parse(name).ext, ft(a[1]), isBinary(a[1].toString()), mt.lookup(path.parse(name).base)])
  .then(a => a.slice(0, 2).concat(a[2] && a[2].mime || a[3] && 'application/octet-stream' || 'text/plain'))
  .then(a => ({exts: a[1], mime: a[2], stats: a[0]}))
