const path = require('path');
const fs = require('fs');

const router = module.exports = require('express').Router();
const formidable = require('formidable');
const ncp = require('ncp').ncp;

const git = require('../git-tool');
const promisify = require('../helpers').promisify;
const mime = require('../mime');
const sgit = require('simple-git');

const safePath = val => decodeURI(val).replace(/|\.\.|\/\//g, '');
const getRoot = req => Promise.resolve(req.project.path);
const send = (p, res) => p.then(data => res.send(data)).catch(e => res.status(501).send(e.message));

router.get('/', (req, res) => send(Promise.resolve({name: req.user.id, token: req.session.tokens[req.project.id]}), res))
//create
router.post('/file/*', (req, res) => {
  const f = req.body.type == 'file';
  const p = safePath(req.url.slice(5));
  const data = getRoot(req)
  .then(root => promisify(f && fs.writeFile || fs.mkdir)(path.join(root, p), f ? '' : 0o777)) //TODO: check if exists
  .then(a => ({id: p}))
  send(data, res);
})

//remove
router.delete('/file/*', (req, res) => {
  const p = safePath(req.url.slice(5));
  const data = getRoot(req)
  .then(root => promisify(fs.stat)(path.join(root, p)).then(stats => promisify(stats.isDirectory() ? fs.rmdir : fs.unlink)(path.join(root, p)) ))
  .then(a => ({id: p}))
  send(data, res);
})

//move //TODO check if destenation not exists ?
router.put('/file/*', (req, res) => {
  const p = safePath(req.url.slice(5));
  const t = safePath(req.body.to);
  const data = getRoot(req)
  .then(root => promisify(fs.rename)(path.join(root, p), path.join(root, t)))
  .then(a => ({id: t}))
  send(data, res);
})

//copy
router.put('/copy/*', (req, res) => {
  const p = safePath(req.url.slice(5));
  const t = safePath(req.body.to);
  const data = getRoot(req)
  .then(root => promisify(ncp)(path.join(root, p), path.join(root, t)))
  .then(a => ({id: t}))
  send(data, res);
})

//list
router.get('/tree', function(req, res) {
  var dir = safePath(req.query.id);
  dir = dir == '#' && '/' || dir;
console.log(dir);
  excludes = ['.', '..', '.htdigest', 'projects.json'].concat(req.project.excludes || [ '.git', 'node_modules']);
  const data = getRoot(req)
  .then(root => Promise.all([
      promisify(fs.readdir)(path.join(root, dir)).then(list => list.filter(name => name && excludes.indexOf(name) < 0)),
      promisify(sgit(root).status, sgit(root))(),
    ])
    .then(p => Promise.all(p[0].map(name =>
//      promisify(fs.stat)(path.join(root, dir, name))
      mime(path.join(root, dir, name))
      .then(m => ({
        children: m.stats.isDirectory(),
        type: m.stats.isDirectory() ? 'default' : "file",
        text: name,
        mime: m.mime,
        size: m.stats.size,
        changed: p[1].files.filter(i => i.path == path.join(dir, name).slice(1)).length,
        id: path.join(dir, name).replace(/\\/g, '/'),
//        icon: stats.isDirectory() ? 'jstree-folder' : "jstree-file",
      }))
      .catch(e => (console.error(e),0))
    ).filter(i => i))
    )
  )
  .then(list => dir != '/' && list || {text: req.project.name, children: list, id: '/', type: 'default', state: {opened: true, disabled: true}})
  send(data, res);
})

//content
router.get('/file/*', function(req, res) {
  const p = safePath(req.url.slice(5));
  const data = getRoot(req)
  .then(root => promisify(fs.stat)(path.join(root, p)).then(stats => !stats.isDirectory() && promisify(fs.readFile)(path.join(root, p)) || '' ))
  send(data, res);
})

const parseForm = req => new Promise((resolve, reject) => {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      return err && reject(err) || resolve([fields, files]);
    })
  })

router.post('/upload/*', function(req, res) {
  const p = safePath(req.url.slice(7));
  const data = getRoot(req)
  .then(root => parseForm(req).then(ff => promisify(fs.rename)(ff[1].data.path, path.join(root, p)).then(a => p) ))
  send(data, res);
});

router.get('/git/*', function(req, res) {
  const p = safePath(req.url.slice(5));
  const data = getRoot(req)
  .then(root => git.Tag(root).then(tag => git.Show(root, tag, p)))
  .catch(a => '')
  send(data, res);
})
