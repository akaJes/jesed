const fs = require('fs');
const path = require('path');

const mmm = require('mmmagic');
const sio = require('socket.io');
const ot = require('ot');
const store = require('../store').mods.editor;
const promisify = require('../helpers').promisify;

var ns = {};
const getFile = file => store.root().then(root => promisify(fs.readFile)(path.join(root, file)));
const setFile = (file, data) => store.root().then(root => promisify(fs.writeFile)(path.join(root, file), data));
const magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
const getMime = file => store.root().then(root => promisify(magic.detectFile, magic)(path.join(root, file)));

exports.init = (server, url) => {
  const io = new sio(server, {path: url});
  io.on('connection', function(socket) {
    socket.on('ns', function (docId) {
      if (ns[docId])
        getMime(docId)
        .then(type => socket.emit('ns', docId, type));
      else {
        Promise.all([getFile(docId), getMime(docId)])
        .then(p => {
          const text = p[0], type = p[1];
          if (type.indexOf('audio') == 0 || type.indexOf('application') == 0)
            throw new Error('uneditable format');
          const doc = ns[docId] = new ot.EditorSocketIOServer(text.toString(), 0, docId);
          socket.emit('ns', docId, type);
          io.of(docId)
          .on('connection', function(socket) {
            function clients(mode) {
              socket.broadcast.in(docId).emit('clients', {clients: doc.users, mode: mode});
            }
            doc.getClient(socket.id);
            doc.addClient(socket);
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
              console.log('saving...');
              setFile(docId, doc.document);
            });
          })
        })
        .catch(e => console.error(e))
      }
    });
  });
}