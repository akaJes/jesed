#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');

const express = require('express');
const mmm = require('mmmagic');
const passport = require('passport');
const Strategy = require('passport-http').DigestStrategy;
//local store
const store = require('./app/store');
const {promisify, walk, getAllFiles} = require('./app/helpers');

const magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
const app = express();
const server = http.Server(app);

const passA = fs.readFileSync('.htpasswd').toString().split(/\r\n?|\n/)
const pass = passA.reduce((p, i) => (p[i.split(':')[0]]=i.split(':')[2], p) , {})

app.use('/', express.static(path.join('static', 'editor')));
app.use('/nm', express.static(path.join('node_modules')));

app.use(require('body-parser').urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  done(null, {id: id, name: id });
});

passport.use(new Strategy({realm: 'Users', qop: 'auth' },
  function(username, cb) {
    if (pass[username])
      return cb(null, {id: username, name: username}, {ha1: pass[username]});
    return cb(null, false);
  }));

const auth = passport.authenticate('digest', { session: true })

if(0)
walk('/home/jes/marlin-config')
.then(a => Promise.all(a.map(name => promisify(magic.detectFile, magic)(name).then(mime => ({name, mime})))))
.then(a => JSON.stringify(a,0,2))
.then(console.log);

store.mods.editor.root = () => Promise.resolve('./');

app.use('/', require('./app/services'));
require('./app/services/ot').init(server, '/ws');


server.listen(store.vars.httpPort, function () {
  console.log('Приклад застосунку, який прослуховує 3000-ий порт!');
});

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

if(0)
process.on('SIGINT', function() {
  console.log('Graceful closing...');
  server.close(function() {
    process.exit(0);
  });
});

