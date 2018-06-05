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
  const pp = ns[project.ws] = {docs: {}, users: {}};
  const io = new sio(server, {path: project.ws});
  io.on('connection', connection)
  function connection(socket) {
    const sh = socket.handshake.headers
    const user = pp.users[socket.id] = {ip: sh['x-forwarded-for'], auth: sh.authorization && sh.authorization.split(',')[0].split('=')[1].slice(1, -1)};
    socket.on('ns', function (docId, token, name) {
      var t = Object.keys(tokens).map(i => tokens[i]).filter(i => i.token == token)
      if (!t.length) return;
      user.auth || (user.auth = t[0].user);
      io.sockets.emit('users', pp.users);
      getDoc(io, project, docId, name)
        .then(ob => socket.emit('ns', docId, ob.type),socket.emit('users', pp.users))
        .catch(e => console.error(e))
    });
    socket.on('disconnect', function() {
      delete pp.users[socket.id];
      io.sockets.emit('users', pp.users);
    })
  }
  var host = chokidar.watch(['**', '*', '.*'], {
    cwd: path.resolve(project.path),
    ignored: ['node_modules', '.git'].concat(project.excludes),
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
  .on('unlink', file => {
    const docId = '/' + file;
    const pp = ns[project.ws].docs;
    pp[docId] && pp[docId].remove();
    io.sockets.emit('files', 'unlink', docId);
  })
  .on('add', file => {
    const docId = '/' + file;
    io.sockets.emit('files', 'add', docId);
  })
  return function() {
    host.close();
    io.removeListener('connection', connection);
    io.path("recycled" + new Date().getTime());
  }
}
function canEdit(mime) {
  var m = mime.split('/');
  return  m[0] == 'text' || m[0] == 'application'
      && ['xml', 'sql', 'json', 'javascript', 'atom+xml', 'soap+xml', 'xhtml+xml', 'xml-dtd', 'xop+xml'].indexOf(m[1]) >=0
}

function getDoc(io, project, docId, name) {
      const pp = ns[project.ws].docs;
      if (pp[docId])
        return Promise.resolve(pp[docId])
      else {
        return Promise.all([getFile(project.path, docId), mime(path.join(project.path, docId))])
        .then(p => {
          const text = p[0], m = p[1].mime;
          if (!canEdit(m))
            throw new Error('binary format');
          const ns = docId.replace(/ /g, ':')
          const doc = new ot.EditorSocketIOServer(text.toString(), 0, ns);
          const ob = pp[docId] = {ot: doc, type: m, id: docId, remove: remove, clients: []};
          io.of(ns)
          .on('connection', nsConn);
          function remove() {
            io.of(ns).removeAllListeners();
            ob.clients.map(i => i())
            delete io.nsps[ns];
            delete pp[docId];
          }
          function nsConn(socket) {
            function clients(mode) {
              socket.broadcast.in(ns).emit('clients', {clients: doc.users, mode: mode});
            }
            doc.getClient(socket.id);
            doc.addClient(socket);
            name && doc.setName(socket, name);
            clients('enter');
            socket.in(ns)
            .on('doc', function() {
              socket.in(ns).emit('doc', {
                str: doc.document,
                revision: doc.operations.length,
                clients: doc.users
              })
            })
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
            ob.clients.push(function() {
              socket.in(ns).removeAllListeners();
              socket.in(ns).emit('disconnect');
            })
          }
          return ob;
        })
      }
}
