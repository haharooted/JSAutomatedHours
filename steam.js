var EventEmitter, Promise, S, Steam, SteamTotp, SteamUser, moment,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

S = require('string');

SteamUser = require('steam-user');

SteamTotp = require('steam-totp');

Promise = require('bluebird');

moment = require('moment');

EventEmitter = require('events');

module.exports = Steam = (function(superClass) {
  extend(Steam, superClass);

  function Steam(name, password, sentry, secret, games, indent) {
    var options;
    this.name = name;
    this.password = password;
    this.sentry = sentry;
    this.secret = secret;
    this.games = games;
    this.indent = indent != null ? indent : 0;
    this.restartGames = bind(this.restartGames, this);
    this.start = bind(this.start, this);
    this.logoff = bind(this.logoff, this);
    this.login = bind(this.login, this);
    this.error = bind(this.error, this);
    this.logheader = bind(this.logheader, this);
    options = {
      promptSteamGuardCode: false,
      dataDirectory: null
    };
    this.client = new SteamUser(null, options);
    if (this.sentry) {
      this.client.setSentry(Buffer.from(this.sentry, 'base64'));
    }
    this.client.on('error', (function(_this) {
      return function(err) {
        return _this.emit('clientError', err);
      };
    })(this));
    this.client.on('steamGuard', (function(_this) {
      return function() {
        return _this.emit('clientSteamGuard');
      };
    })(this));
    this.client.once('steamGuard', (function(_this) {
      return function() {
        return _this.steamGuardRequested = true;
      };
    })(this));
  }

  Steam.prototype.logheader = function() {
    return S("[" + (moment().format('YYYY-MM-DD HH:mm:ss')) + " - " + this.name + "]").padRight(this.indent).s;
  };

  Steam.prototype.error = function(err) {
    return this.emit('customError', err);
  };

  Steam.prototype.login = function() {
    if (this.client.client.loggedOn) {
      return Promise.resolve();
    }
    if (this.steamGuardRequested && !this.secret) {
      return Promise.reject("Steam guard requested!");
    }
    return new Promise((function(_this) {
      return function(resolve, reject) {
        _this.once('clientError', reject);
        _this.once('clientSteamGuard', function() {
          return reject("Steam guard requested!");
        });
        _this.client.once('loggedOn', resolve);
        if (_this.secret) {
          return SteamTotp.getAuthCode(_this.secret, function(err, code) {
            return _this.client.logOn({
              accountName: _this.name,
              password: _this.password,
              twoFactorCode: code
            });
          });
        } else {
          return _this.client.logOn({
            accountName: _this.name,
            password: _this.password
          });
        }
      };
    })(this)).timeout(10000)["catch"](Promise.TimeoutError, function() {
      return Promise.reject("Timed out at login");
    })["finally"]((function(_this) {
      return function() {
        _this.removeAllListeners('clientError');
        _this.removeAllListeners('clientSteamGuard');
        return _this.client.removeAllListeners('loggedOn');
      };
    })(this));
  };

  Steam.prototype.logoff = function() {
    if (!this.client.client.loggedOn) {
      return;
    }
    this.client.gamesPlayed([]);
    return this.client.logOff();
  };

  Steam.prototype.start = function() {
    return this.login().then((function(_this) {
      return function() {
        var ref;
        _this.client.setPersona(SteamUser.EPersonaState.Offline);
        _this.client.gamesPlayed((ref = _this.games) != null ? ref : [10, 399220, 399080, 399480]);
        return console.log((_this.logheader()) + " Starting to start games!");
      };
    })(this))["catch"]((function(_this) {
      return function(err) {
        return console.error((_this.logheader()) + " " + err);
      };
    })(this));
  };

  Steam.prototype.restartGames = function() {
    this.client.gamesPlayed([]);
    return Promise.delay('5000').then(this.start);
  };

  return Steam;

})(EventEmitter);
