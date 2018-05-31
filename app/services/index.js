const router = module.exports = require('express').Router();

router.use('/s/editor', require('./editor'));
router.use('/s/auth', require('./auth'));
