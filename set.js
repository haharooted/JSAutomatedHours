var SteamTotp, SteamUser, login, e, inquirer, jsonfile, promptGames, secret;

SteamUser = require('steam-user');

SteamTotp = require('steam-totp');

inquirer = require('inquirer');

jsonfile = require('jsonfile');

jsonfile.spaces = 2;

try {
  login = jsonfile.readFileSync('login.json');
} catch (_error) {
  e = _error;
  login = {};
}

secret = null;

promptGames = {
  type: 'checkbox',
  name: 'games',
  message: 'Select games:',
  choices: [
    {
      value: 730,
      name: 'CS:GO',
    }, {
      value: 399220,
      name: 'Invisible1',
    }, {
	  value: 399080,
      name: 'Invisible2',
    }, {
      value: 399480,
      name: 'Invisible3'
    }
  ]
};

inquirer.prompt([
  {
    name: 'username',
    message: 'Username:'
  }, {
    name: 'password',
    message: 'Password:',
    type: 'password'
  }
]).then(function(arg) {
  var client, password, username;
  username = arg.username, password = arg.password;
  login[username] = {};
  client = new SteamUser;
  client.setOption('promptSteamGuardCode', false);
  client.setOption('dataDirectory', null);
  client.logOn({
    accountName: username,
    password: password
  });
  client.on('steamGuard', function(domain, callback) {
    if (domain) {
      return inquirer.prompt([
        {
          name: 'code',
          message: "Steam guard code (" + domain + "):"
        }
      ]).then(function(arg1) {
        var code;
        code = arg1.code;
        return callback(code);
      });
    } else {
      return inquirer.prompt([
        {
          name: 'secret',
          message: 'Two-factor shared secret:'
        }
      ]).then(function(arg1) {
        var secret;
        secret = arg1.secret;
        return SteamTotp.generateAuthCode(secret, function(err, code) {
          login[username].secret = secret;
          return callback(code);
        });
      });
    }
  });
  client.on('sentry', function(sentry) {
    login[username].sentry = sentry.toString('base64');
    return jsonfile.writeFileSync('login.json', login);
  });
  client.on('loggedOn', function(details) {
    login[username].password = password;
    return inquirer.prompt(promptGames).then(function(arg1) {
      var games;
      games = arg1.games;
      login[username].games = games;
      jsonfile.writeFileSync('login.json', login);
      return process.exit(0);
    });
  });
  return client.on('error', function(err) {
    console.log("Error: " + err);
    return process.exit(1);
  });
});
