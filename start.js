var Promise, Steam, _, accounts, login, e, jsonfile, moment, pad, restartStart;

_ = require('lodash');

jsonfile = require('jsonfile');

moment = require('moment');

Promise = require('bluebird');

Steam = require('./steam.js');

try {
  login = jsonfile.readFileSync('login.json');
} catch (_error) {
  e = _error;
  console.log("Error reading login.json!");
  process.exit(0);
}

pad = 24 + _.maxBy(_.keys(login), 'length').length;

accounts = _.map(login, function(arg, name) {
  var games, password, secret, sentry;
  password = arg.password, sentry = arg.sentry, secret = arg.secret, games = arg.games;
  return new Steam(name, password, sentry, secret, games, pad);
});

restartBoost = function() {
  console.log('\nRestarting...\n');
  return Promise.map(accounts, _.method('restartGames')).delay(1800000)["finally"](restartStart);
};

console.log('\nStarting...\n');

Promise.map(accounts, _.method('start')).delay(1800000).then(restartStart);
