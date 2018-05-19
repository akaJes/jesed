const path = require('path');
const fs = require('fs');
const router = module.exports = require('express').Router();
const formidable = require('formidable');
const git = require('../git-tool');
const store = require('../store').mods.editor;
const promisify = require('../helpers').promisify;

const safePath = val => decodeURI(val).replace(/|\.\.|\/\//g, '');
const getRoot = req => Promise.resolve(store.root(req))

const wrap = (req, res, next) => {
    
    var result = next()
    console.log(result)
}
//create
router.post('/file/*', (req, res) => {
  const f = req.query.type == 'file';
  const p = safePath(req.url.slice(5));
  return getRoot(req)
  .then(root => promisify(f && fs.writeFile || fs.mkdir)(path.join(root, p), f ? '' : 0o777)) //TODO: check if exists
  .then(a => ({id: p}))
  .then(data => res.send(data))
  .catch(e => res.status(501).send(e.message))
})

//remove
router.delete('/file/*', (req, res) => {
  const p = safePath(req.url.slice(5));
  return getRoot(req)
  .then(root => promisify(fs.stat)(path.join(root, p)).then(stats => promisify(stats.isDirectory() ? fs.rmdir : fs.unlink)(path.join(root, p)) ))
  .then(a => ({id: p}))
  .then(data => res.send(data))
  .catch(e => res.status(501).send(e.message))
})

//move //TODO check if destenation not exists ?
router.put('/file/*', (req, res) => {
  const p = safePath(req.url.slice(5));
  const t = safePath(req.body.to);
  return getRoot(req)
  .then(root => promisify(fs.rename)(path.join(root, p), path.join(root, t)))
  .then(a => ({id: t}))
  .then(data => res.send(data))
  .catch(e => res.status(501).send(e.message))
})

//TODO:copy

//list
router.get('/tree', function(req, res) {
  var dir = req.query.id == '#' && '/' || req.query.id || '';
  dir = dir.replace(/\.\./g, '');
  return getRoot(req)
  .then(root => promisify(fs.readdir)(path.join(root, dir))
    .then(list => list.filter(name => name && (name != '.' || name != '..')))
    .then(list => Promise.all(list.map(name => promisify(fs.stat)(path.join(root, dir, name))
      .then(stats => ({
        children: stats.isDirectory(),
        type: stats.isDirectory() ? 'default' : "file",
        text: name,
        id: path.join(dir, name),
//        icon: stats.isDirectory() ? 'jstree-folder' : "jstree-file",
      }))))
    )
  )
  .then(list => dir != '/' && list || {text: store.name(req), children: list, id: '/', type: 'default', state: {opened: true, disabled: true}})
  .then(data => res.send(data))
  .catch(e => res.status(501).send(e.message))
})

//content
router.get('/file/*', wrap, function(req, res) {
  const p = safePath(req.url.slice(5));
  return getRoot(req)
  .then(root => promisify(fs.stat)(path.join(root, p)).then(stats => !stats.isDirectory() && promisify(fs.readFile)(path.join(root, p)) || '' ))
  .then(data => res.send(data))
  .catch(e => res.status(501).send(e.message))
})

const parseForm = req => new Promise((resolve, reject) => {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      return err && reject(err) || resolve([fields, files]);
    })
  })

router.post('/upload/*', function(req, res) {
  const p = safePath(req.url.slice(7));
  return getRoot(req)
  .then(root => parseForm(req).then(ff => promisify(fs.rename)(ff[1].data.path, path.join(root, p)).then(a => p) ))
  .then(data => res.send(data))
  .catch(e => res.status(501).send(e.message))
 });


//git file TODO: git for multiproject
router.get('/git/*', function(req, res) {
  git.Tag()
  .then(tag => git.Show(tag, req.originalUrl.replace(/.*git\//, '')).catch(a=>''))
  .then(data => res.send(data))
  .catch(e => res.status(501).send(e.message))
})
