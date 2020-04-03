/**

https://jasmine.github.io/api/2.8/global
https://jasmine.github.io/api/2.8/Reporter.html
https://jasmine.github.io/setup/nodejs.html

**/

const octane = require('benchmark-octane');
const Jasmine = require('jasmine');
const util = require('util');
const fs=require('fs-extra');
const fsUtils = require('nodejs-fs-utils');
const StdOutFixture = require('fixture-stdout');
const os = require('os');
const fork = require('child_process').fork;


var fixture = new StdOutFixture();



const LOCAL_STORAGE = '/local_storage/';
const BLOAT_PATH = 'bloat';

const KILO = 1024;
const MEGA = 1024 * KILO;
const GIGA = 1024 * MEGA;

const CHUNK = 100 * MEGA; // 100M


var existed = false;
var log;
var db;

// CPU hog
var shouldRun = false;
var desiredLoadFactor = .5;


// ToDo: what is the final root directory for writing app data?
// preferred:
var bloat_path = LOCAL_STORAGE + BLOAT_PATH;
if (!fs.existsSync(LOCAL_STORAGE)) {
  // fallback to current PCC implementation
  bloat_path = __dirname + '/../../' + BLOAT_PATH;
}


polyfill();


var log;
var send;

module.exports = function(router, logger, wsSend) {
  log = logger;
  send = wsSend;
  // local tests
  router.get('/jsengine/rootdir', rootdir);
  router.get('/jsengine/benchmark', benchmark);
  router.get('/jsengine/bloat0', clear);
  router.get('/jsengine/bloat:size', bloat);
  router.get('/jsengine/hog:percent', hog);
  router.get('/jsengine/eater:size', eater);
  router.get('/jsengine/memkiller', memkiller);
  // jasmine tests
  router.get('/jsengine/:testID', runTest);
}

function clear(req, res) {
  var size = req.params.size;

  send('removing Bloat test data on disk\n');

  if (fs.existsSync(bloat_path)) {
    fs.removeSync(bloat_path);
  }

  var response = { status: 'ok', id: 'bloat', data: 0 };
  res.send(response);
}

function memkiller(req, res) {
  send('running Memory Killer test in JS engine, starting processes every 60s that try to eat 1GB of memory, start as many as possible\n');
  var timer = setInterval(function() {
      log.info('fork a memeater');
      var options = {
        execArgv: [],
        stdio: [0, 1, 2, 'ipc']
      };
      forked = fork(__dirname + '/memeater.js', [], options);
      if (!forked) {
        send('ERROR: fork did not return a child process');
        clearInterval(timer);
        return;
      }
      send('forked memeater, pid: ' + forked.pid);
  }, 60000);
  var response = { status: 'ok', id: 'memkiller' };
  res.send(response);
}

function bloat(req, res) {
  var size = req.params.size;
  var used = 0;

  send('running Bloat test in JS engine, try to eat ' + size + 'GB on disk\n');

  if (!fs.existsSync(bloat_path)) {
    fs.mkdirSync(bloat_path);
  } else {
    used = fsUtils.fsizeSync(bloat_path);
  }
  send('current size of bloat dir: ' + Math.round(used/MEGA) + 'MB\n');

  send('this is very slooooooow...\n');
  setTimeout(function() {
    try {
      var written = 0;
      var goal = size * GIGA;
      var count = 0;
      while (written < goal - CHUNK) {
        written += writeFile(bloat_path + '/ballast_' + count, CHUNK);
        count++;
        // update status every size*CHUNK bytes
        if (written % (size*CHUNK) == 0) {
          send('wrote ' + written/MEGA + 'MB\n');
        }
      }
      send('SUCCESS\n');
      used = fsUtils.fsizeSync(bloat_path);
      send('current size of bloat dir: ' + Math.round(used/MEGA) + 'MB\n');
    }
    catch(err) {
      send('ERROR: ' + err.message + '\n');
      used = fsUtils.fsizeSync(bloat_path);
      send('current size of bloat dir: ' + Math.round(used/MEGA) + 'MB\n');
    }
  }, 100);

  var response = { status: 'ok', id: 'bloat', data: size };
  res.send(response);
}

function writeFile(path, size) {
  var buffer = new ArrayBuffer(1024*1024);
  var fd = fs.openSync(path, 'w');
  var written = 0;
  while (written < size - 1024) {
    written += fs.writeSync(fd, buffer);
  }
  fs.closeSync(fd);
  return written;
}

function hog(req, res) {
  var percent = req.params.percent;
  if (percent <= 0 || percent > 100) {
    if (shouldRun) {
      stopHog();
      send('\nstopping CPU hog in JS engine.\n');
    }
  } else if (shouldRun) {
      send('CPU hog already running in JS engine. Once is enough.\n');
  } else {
    send('starting ' + percent + '% CPU hog (1 core) in JS engine.\n');
    desiredLoadFactor = percent/100;
    shouldRun = true;
    startHog(percent);
  }
  var response = { status: 'ok', id: 'hog', data: percent };
  res.send(response);
}
function blockCpuFor(ms) {
	var now = new Date().getTime();
	var result = 0
	while(shouldRun) {
		result += Math.random() * Math.random();
		if (new Date().getTime() > now +ms)
			return;
	}
}
var hogloop = 0;
function startHog() {
  if (shouldRun) {
    hogloop++;
    if (hogloop % 10 == 0) {
      send('HOG ');
      log.info(os.cpus());
    }
  	blockCpuFor(1000*desiredLoadFactor);
  	setTimeout(startHog, 1000* (1 - desiredLoadFactor));
  }
}
function stopHog() {
  shouldRun = false;
}

var stomach;
var eaten;
var reporter;

function eater(req, res) {
  var size = req.params.size;
  var total = Math.round(os.totalmem()/(1024*1024));

  send('running RAM Eater test in JS engine. Eat ' + size + 'MB ...\n');

  if (reporter) {
    clearInterval(reporter);
    reporter = null;
  }
  if (size <= 0) {
    send('give eaten memory to garbage collector.\n');
    delete stomach;
  } else {
    send('total RAM: ' + total + 'MB\n');
    send('free [MB]:');
    eaten = 0;
    eatMemory(size);
    reporter = setInterval(function() {
      var free = Math.round(os.freemem()/(1024*1024));
      send(' ' + free);
    }, 10000);
  }

  var response = { status: 'ok', id: 'eater', data: size };
  res.send(response);
}

function eatMemory(size) {
  var loops = size;
  stomach = Array(loops);
  var eater = setInterval(function() {
    // 64 bit number?
    var portion = 128*1024;
    stomach[eaten] = Array(portion);
    try {
      for (var i=0; i<(portion); i++) {
        stomach[eaten][i] = i;
      }
      eaten++;
      if (eaten > loops - 1) {
        send('\ndone, eaten: ' + eaten + 'MB\n');
        clearInterval(eater);
        clearInterval(reporter);
      }
    }
    catch(err) {
      send('\nERROR: ' + err.message + '\n');
      send('eaten so far: ' + eaten + 'MB\n');
      clearInterval(eater);
      clearInterval(reporter);
    }
  }, 100);
}

function benchmark(req, res) {

  send('running Octane 2.0 benchmark in JS engine, please wait...\n');

  setTimeout(function() {
    // Capture a write to stdout
    fixture.capture( function onWrite (string, encoding, fd) {
      send(string);
      // If you return `false`, you'll prevent the write to the original stream (useful for preventing log output during tests.)
      return false;
    });

    octane.run();

    // back to the original version of stdout
    fixture.release();
  }, 100);

  var response = { status: 'ok', id: 'benchmark', data: '' };
  res.send(response);
}

function runTest(req, res) {
  var testID = req.params.testID;
  var specs = [ __dirname + '/../spec/' + testID + '.js' ];
  log.info('jsengine.runTest ' + testID);

  var response = { status: 'ok', id: testID };
  res.send(response);

  var jasmine = new Jasmine();

  jasmine.loadConfigFile(__dirname + '/jasmine.json');

  jasmine.configureDefaultReporter({
    print: function() {
      send(util.format.apply(this, arguments));
    },
    showColors: false
  });

  // custom reporter
  var myReporter = {
    jasmineStarted: function(suiteInfo) {
      send('Running suite with ' + suiteInfo.totalSpecsDefined + ' specs' + '\n');
    },
    suiteStarted: function(result) {
      send('Start: ' + result.description + '\n');
    },
    specStarted: function(result) {
    },
    specDone: function(result) {
    },
    suiteDone: function(result) {
    },
    jasmineDone: function(suiteInfo) {
      send('Done\n');
    }
  };
  jasmine.addReporter(myReporter);

  jasmine.onComplete(function(passed) {
    // own onComplete: prevent from exit
    send('Complete\n');
  });

  /*
  Run the tests
  */
  jasmine.execute(specs);
}

function rootdir(req, res) {
  var dir = fs.readdirSync('/');
  var dirlist = [];
  for (i=0; i<dir.length; i++) {
    var stats = fs.statSync('/' + dir[i]);
    var mode = (stats["mode"] & 0040000 ? 'd' : '-');
    mode += (stats["mode"] & 400 ? 'r' : '-');
    mode += (stats["mode"] & 200 ? 'w' : '-');
    mode += (stats["mode"] & 100 ? 'x' : '-');
    mode += (stats["mode"] & 40 ? 'r' : '-');
    mode += (stats["mode"] & 20 ? 'w' : '-');
    mode += (stats["mode"] & 10 ? 'x' : '-');
    mode += (stats["mode"] & 4 ? 'r' : '-');
    mode += (stats["mode"] & 2 ? 'w' : '-');
    mode += (stats["mode"] & 1 ? 'x' : '-');
    var uid = stats["uid"].toString();
    var gid = stats["gid"].toString();
    var size = stats["size"].toString()
    var elem = mode + uid.padStart(5);
    elem += gid.padStart(5);
    elem += size.padStart(10);
    elem += '  ' + dir[i];
    dirlist.push(elem);
    send(elem + '\n');
  }
  var response = { status: 'ok', id: 'rootdir', data: dirlist };
  res.send(response);
}


function polyfill() {
  String.prototype.padStart =
  function (maxLength, fillString=' ') {
      let str = String(this);
      if (str.length >= maxLength) {
          return str;
      }

      fillString = String(fillString);
      if (fillString.length === 0) {
          fillString = ' ';
      }

      let fillLen = maxLength - str.length;
      let timesToRepeat = Math.ceil(fillLen / fillString.length);
      let truncatedStringFiller = fillString
          .repeat(timesToRepeat)
          .slice(0, fillLen);
      return truncatedStringFiller + str;
  };
}
