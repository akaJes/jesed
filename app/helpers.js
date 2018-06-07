'use strict';
const fs = require('fs');
const path = require('path');

const atob = b64 => process.version < "v6.0.0" ? Buffer.from(b64, 'base64') : new Buffer(b64, 'base64');

const promisify = (func, that) => (...args) =>
    new Promise((resolve, reject) => func.apply(that || null, args.concat((err, data) => err && reject(err) || resolve(data))));

const flatten = arr => arr.reduce((a, i) => a.concat(Array.isArray(i) ? flatten(i) : i), []);

Array.prototype.chunk ||
Object.defineProperty(Array.prototype, 'chunk', {
    value: function(chunkSize){
        if (!chunkSize)
          return [this];
        var temporal = [];
        for (var i = 0; i < this.length; i += chunkSize){
            temporal.push(this.slice(i, i + chunkSize));
        }
        return temporal;
    }
});

const getAllFiles = (dir, deep = 999) =>
  promisify(fs.readdir)(dir)
  .then(list => Promise.all(
      list
      .map(file => path.join(dir, file))
      .reduce((files, name) => files.concat(promisify(fs.stat)(name).then(stat => stat.isDirectory() && deep ? getAllFiles(name, deep - 1) : name)), [])
    )
  )
  .catch(e => [dir])

const walk = (dir, deep = 999) => getAllFiles(dir, deep).then(flatten)

function getFirstFile(paths) {
  if (!paths || paths.length == 0)
    return Promise.reject();
  var filePath = paths.shift();
  return promisify(fs.access)(filePath, fs.constants.R_OK)
    .then(a => filePath)
    .catch(e => getFirstFile(paths) );
}

const unique = a => a.filter((elem, index, self) => index == self.indexOf(elem))

const arrRemove = (arr, cond) => (arr.map((o, i) => cond(o) ? i : -1).reverse().map(i => i >= 0 && arr.splice(i, 1)), arr);

module.exports = {
  promisify,
  atob,
  getFirstFile,
  unique,
  walk,
  getAllFiles,
  arrRemove,
};