#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const mmm = require('mmmagic');
const passport = require('passport');
const Strategy = require('passport-http').DigestStrategy;
//local store
const {promisify, walk, getAllFiles} = require('./app/helpers');
const pkg = require('./package.json');

const magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
const app = express();
const server = http.Server(app);

const getMode = () => pkg.config && pkg.config[pkg.config.mode || 'local'] || {};
const md5 = data => crypto.createHash('md5').update(data).digest("hex");
const config = {};
const tokens = {};

const configFiles = Promise.all([
  promisify(fs.readFile)('.htdigest'),
  promisify(fs.readFile)('projects.json') //maybe simply require?
]).catch(e => {
  console.error('missing config', e)
  process.exit();
})

app.set('views', path.join(__dirname, 'static'));
app.set('view engine', 'ejs');
app.engine('.html', require('ejs').renderFile);

app.use(require('body-parser').urlencoded({ extended: false }));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  done(null, {id: id, name: id });
});

passport.use(new Strategy({realm: 'Users', qop: 'auth' }, //password
  function(username, cb) {
    if (config.pass[username])
      return cb(null, {id: username, name: username}, {ha1: config.pass[username]});
    return cb(null, false);
  }/*,
    function(params, done) {
        return done(null, true);
    }*/
));
app.use(session({
  store: new FileStore(),
  secret: 'lazzy keyboard cat',
  resave: false,
  saveUninitialized: true
}))

app.use(passport.initialize());
app.use(passport.session());
//app.get('/logout', function(req, res) { res.redirect('/') }) //'//' + req.headers.host + 
const modAuth = (req, res, next) => {
console.log(req);
  const url = req.url;
  const auth = passport.authenticate('digest', { session: true });
  req.url = (getMode().baseURI || '') + req.url;
  auth(req, res, () => {
    req.url = url;
    next();
  })
}
app.use(modAuth);//, passport.authenticate('digest', { session: true }));
const auth = p => (req, res, next) => {
  req.project = p;
  req.session.tokens || (req.session.tokens = {});
  if (req.isAuthenticated() && p.editors.indexOf(req.user.id) >= 0) {
    tokens[p.id][req.sessionID] || (req.session.tokens[p.id] = tokens[p.id][req.sessionID] = {user: req.user.id, token: md5(req.sessionID + new Date().getTime())});
    next();
  } else
    res.redirect('/');
}

app.use('/nm', express.static(path.join('node_modules')));

if(0)
walk('/home/jes/marlin-config')
.then(a => Promise.all(a.map(name => promisify(magic.detectFile, magic)(name).then(mime => ({name, mime})))))
.then(a => JSON.stringify(a,0,2))
.then(console.log);

configFiles.then(files => {
  const passA = files[0].toString().split(/\r\n?|\n/).map(i => i.split(':'));
  config.pass = passA.reduce((p, i) => (p[i[0]] = i[2], p) , {});
  config.projects = JSON.parse(files[1].toString());
  config.projects.map(p => (
    (tokens[p.id] || (tokens[p.id] = {})),
    app.use('/' + p.id, auth(p), express.static(path.join(__dirname, 'static', 'editor'))),
    app.use('/' + p.id, auth(p), require('./app/services')),
    require('./app/services/ot').init(server, '/' + p.id + '/ws', p.path, tokens[p.id])
  ));

  app.get('/', function(req, res) {
    if (req.isAuthenticated()) {
      var list = config.projects
        .filter(p => p.editors.indexOf(req.user.id) >= 0)
      return res.render('login.html', {projects: list});
    }
    res.send('no access')
  });
  server.listen(getMode().port, function () {
    console.log('started at port ' + getMode().port);
  });
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

