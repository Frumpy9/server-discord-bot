const follow = require('./follow');
const help = require('./help');
const listAllFollows = require('./listAllFollows');
const listFollows = require('./listFollows');
const map = require('./map');
const memory = require('./memory');
const notify = require('./notify');
const players = require('./players');
const removeUser = require('./removeUser');
const unfollow = require('./unfollow');
const check = require('./check');
const addServer = require('./addServer');
const removeServer = require('./removeServer');

module.exports = (context) => [
  help(context),
  players(context),
  map(context),
  follow(context),
  unfollow(context),
  listFollows(context),
  check(context),
  listAllFollows(context),
  notify(context),
  removeUser(context),
  addServer(context),
  removeServer(context),
  memory(context)
];
