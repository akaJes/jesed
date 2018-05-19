exports.vars = {
  httpPort: 3000,
};

exports.config = {
};

exports.mods = {
  editor: {
    root(req) {}, //replace it!
    name(req) { return 'change my name' },
  },
};
