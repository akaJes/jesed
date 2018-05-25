const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const Strategy = require('passport-http').DigestStrategy;

const {promisify, walk, getAllFiles} = require('./helpers');

const app = express();
const server = http.Server(app);

const md5 = data => crypto.createHash('md5').update(data).digest("hex");

app.set('views', path.join(__dirname, '..', 'static'));
app.set('view engine', 'ejs');
app.engine('.html', require('ejs').renderFile);

app.use(require('body-parser').urlencoded({ extended: false }));

module.exports = (config) => {
const tokens = {};

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
  const url = req.url;
  const auth = passport.authenticate('digest', { session: true });
  req.url = (config.baseURI || '') + req.url;
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

  config.projects.map(p => (
    (tokens[p.id] || (tokens[p.id] = {})),
    (p.ws = '/' + p.id + '/ws'),
    app.use('/' + p.id, auth(p), express.static(path.join(__dirname, '..', 'static', 'editor'))),
    app.use('/' + p.id, auth(p), require('./services')),
    require('./services/ot')(server, p, tokens[p.id])
  ));
  app.get('/', function(req, res) {
    if (req.isAuthenticated()) {
      var list = config.projects
        .filter(p => p.editors.indexOf(req.user.id) >= 0)
      return res.render('login.html', {projects: list});
    }
    res.send('no access')
  });
  server.listen(config.port, function () {
    console.log('started at port ' + config.port);
  });
}
