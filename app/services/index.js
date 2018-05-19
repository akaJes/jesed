const router = module.exports = require('express').Router();
const store = require('../store');

if (store.mods.editor)
  router.use('/s/editor', require('./editor'));
