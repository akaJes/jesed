const path = require('path');
const fs = require('fs');

const router = module.exports = require('express').Router();

const promisify = require('../helpers').promisify;

const safePath = val => decodeURI(val).replace(/|\.\.|\/\//g, '');
const getRoot = req => Promise.resolve(req.project.path);
const send = (p, res) => p.then(data => res.send(data)).catch(e => res.status(501).send(e.message));

router.get('/', (req, res) => send(Promise.resolve(req.createInvite('Anonymous')), res))
