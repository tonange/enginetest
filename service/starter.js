
const fork = require('child_process').fork;
const process = require('process');
const fetch = require('node-fetch');

polyfill();


var registryUri = 'http://127.0.0.1:443';

var uri;
var forked;

log(process.argv);
log(process.execArgv);

// remove cmd and script from argv[]
process.argv.shift();
process.argv.shift();
for (i=0; i<process.argv.length; i++) {
  if (process.argv[i].startsWith('--rsiRegistryURI')) {
    registryUri = process.argv[i].split('=')[1];
    log('using registry at ' + registryUri);
  }
}
for (i=0; i<process.argv.length; i++) {
  if (process.argv[i].startsWith('--engineinstanceURI')) {
    uri = process.argv[i].split('=')[1];
    uri = uri.replaceAll('"', '');
  }
}

setRunning(uri)
.then(function() {
  process.argv.push('--noSetRunning');
  // remove --debug arg from process.execArgv and pass on the rest
  var execArgv = [];
  for (var i=0; i<process.execArgv.length; i++) {
    if (!process.execArgv[i].startsWith('--debug') && !process.execArgv[i].startsWith('--inspect')) {
      execArgv.push(process.execArgv[i]);
    }
  }
  setImmediate(function() {
    forkApp(process.argv, execArgv);
  });
})
.catch(function(err) {
  log('ERROR: ' + err.message);
  process.exit(10);
});

function forkApp(args, execArgv) {
  log('forkApp', args, execArgv);
  var options = {
    execArgv: execArgv,
    stdio: [0, 1, 2, 'ipc']
  };
  forked = fork(__dirname + '/index.js', args, options);
  if (!forked) {
    log('ERROR: fork did not return a child process');
    process.exit(20);
  }
  log('forked pid: ' + forked.pid);
}

///////////////////////////////////////////////////////////
// set engineInstace state to running
function setRunning(uri, retry=true) {
  return new Promise(function(resolve, reject) {
    if (uri) {
      if (uri.startsWith('http')) {
        var myInstanceUri = uri;
      } else {
        var myInstanceUri = registryUri + uri;
      }
      log('set ' + myInstanceUri + '.runState to running');
      var body = {
        runState: 'running'
      };
      fetch(myInstanceUri, {
        method: 'POST',
        body:    JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })
      .then(function(res) {
        return res.json();
      })
      .then(function(json) {
        log('set runState result:');
        log(json);
        resolve();
      })
      .catch(function(err) {
        if (retry) {
          log('WORKAROUND for missing URL parameter rsiRegistryURI in ICAS3: try with hardcoded registryURI');
          registryUri = 'http://[::1]:80';
          setRunning(uri, false)
          .then(resolve)
          .catch(reject);
        } else {
          reject(new Error('ERROR: set runState error: ' + err.message));
        }
      });
    } else {
        reject(new Error('ERROR: parameter engineinstanceURI missing'));
    }
  });
}

function log() {
  var args = Array.prototype.slice.call(arguments);
  for (var i=0; i<args.length; i++) {
    try {
      args[i] = JSON.stringify(args[i]);
    } catch(err) {
      args[i] = args[i].toString();
    }
  }
  var today = new Date().toISOString().slice(11, 23);
  var now =  '[' + today + ']';
  var msg = {
    source: 'enginetest',
    severity: 5,
    timestamp: now,
    message: args.join(' ')
  };
  console.log(JSON.stringify(msg));
}

//////////////////////////////////////////////////////////////////////////////
// polyfill

function polyfill() {
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(search, replacement) {
      var target = this;
      return target.split(search).join(replacement);
    };
  }
}
