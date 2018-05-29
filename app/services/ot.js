const fs = require('fs');
const path = require('path');

const mime = require('../mime');
const chokidar = require('chokidar');
const sio = require('socket.io');
const ot = require('ot-jes');

const promisify = require('../helpers').promisify;
const client = require('../ot-client');

const ns = {};
const getFile = (root, file) => promisify(fs.readFile)(path.join(root, file));
const setFile = (root, file, data) => promisify(fs.writeFile)(path.join(root, file), data);

module.exports = (server, project, tokens) => {
  ns[project.ws] = {};
  const io = new sio(server, {path: project.ws});
  io.on('connection', connection)
  function connection(socket) {
    socket.on('ns', function (docId, token, name) {
      if (Object.keys(tokens).map(i => tokens[i].token).indexOf(token) < 0) return;
      getDoc(io, project, docId, name)
        .then(ob => socket.emit('ns', docId, ob.type))
        .catch(e => console.error(e))
    });
  }
  chokidar.watch(project.path + '**', {
    ignored: project.excludes || /node_modules/,
    persistent: true,
  })
  .on('change', file => {
    const docId = '/' + file;
    mime(path.join(project.path, docId))
    .then(m => canEdit(m.mime) &&
    Promise.all([getFile(project.path, docId), getDoc(io, project, docId, 'host')])
    .then(p => {
      const ob = p[1], text = p[0];
      client(io, ob, text);
    })
    )
  })
  return function() {
    io.removeListener('connection', connection);
    io.path("recycled" + new Date().getTime());
    delete io;
  }
}
function canEdit(mime) {
  var m = mime.split('/');
  return  m[0] == 'text' || m[0] == 'application'
      && ['xml', 'sql', 'json', 'javascript', 'atom+xml', 'soap+xml', 'xhtml+xml', 'xml-dtd', 'xop+xml'].indexOf(m[1]) >=0
}

function getDoc(io, project, docId, name) {
      const pp = ns[project.ws];
      if (pp[docId])
        return Promise.resolve(pp[docId])
      else {
        return Promise.all([getFile(project.path, docId), mime(path.join(project.path, docId))])
        .then(p => {
          const text = p[0], m = p[1].mime;
          if (!canEdit(m))
            throw new Error('binary format');
          const doc = new ot.EditorSocketIOServer(text.toString(), 0, docId);
          const ob = pp[docId] = {ot: doc, type: m, id: docId};
          io.of(docId)
          .on('connection', function(socket) {
            function clients(mode) {
              socket.broadcast.in(docId).emit('clients', {clients: doc.users, mode: mode});
            }
            doc.getClient(socket.id);
            doc.addClient(socket);
            name && doc.setName(socket, name);
            clients('enter');
            socket.in(docId)
            .on('disconnect', function() {
              delete doc.users[socket.id];
              clients('leave');
            })
            .on('name', function (name) {
              doc.setName(socket, name);
              clients('name');
            })
            .on('operation', function (name) {
              console.log('saving...', docId);
              ob.freeze = true;
              setFile(project.path, docId, doc.document)
              .then(a => ob.freeze = false);
            });
          })
          return ob;
        })
      }
}
