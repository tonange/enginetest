/**

	Demo REST server
	================

	Doubles as http server to deliver reference apps to the web engine


	http server
	-----------

		static test content for basic testing
		-------------------------------------

		http://localhost:48710/static/testbild.jpg
		http://localhost:48710/static/TestbildZDF256.gif


		test and reference apps
		-----------------------

		The apps are implemented as automated tests based on Jasmine.

			test suite starter frame
			------------------------

			http://localhost:48710/app/index.html

				allows to start the tests listed below

				also starts a dedicated worker that opens a websocket to this app
				(ws://localhost:48711/ws/echo) and displays all received messages

				tests (can also be started standalone):

					- test using local REST server (this app) vis a dedicated worker
							test_worker.html

					- test shared worker (needs two or more instances to show its effect)
							test_shared.html

					- test using local REST server (this app)
							test_local.html

					- test using REST server on the internet
							test_remote.html


	Configuration
	-------------

		Port and log source name can be configured in config.json:
			{
				"port" : 48710,
				"wsport" : 48711,
				"log": {
					"source" : "enginetest"
				}
			}

	The implementation is based on express.

**/


///////////////////////////////////////////////////////////
//node modules
var parseArgs = require('minimist');
var express = require('express');
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
var cors = require('cors');
var path = require('path');
var fetch = require('node-fetch');
var process = require('process');


///////////////////////////////////////////////////////////
//local modules
var miblog = require('./modules/logwrapper.js');
var beerlocker = require('./modules/beerlocker.js');
var httptest = require('./modules/httptest.js');
var sqlite = require('./modules/sqlite.js');
var jsengine = require('./modules/jsengine.js');


polyfill();

///////////////////////////////////////////////////////////
//load configuration
var config = require('./config.json');


///////////////////////////////////////////////////////////
//create log object
var log = new miblog({ source: config.log.source });


///////////////////////////////////////////////////////////
//command line

log.info('process.cwd  ' + process.cwd());
log.info('process.argv ' + process.argv);

var opts = {
  boolean: ['noSetRunning'],
	string: ['rsiRegistryURI'],	
	alias: {
		r: 'rsiRegistryURI',
		n: 'noSetRunning'
	},
	default: {
		rsiRegistryURI: 'http://127.0.0.1:443',
		noSetRunning: false
  }
}
var argv = parseArgs(process.argv.slice(2), opts);
log.info('argv: ' + JSON.stringify(argv));

var registryUri = argv.rsiRegistryURI;


///////////////////////////////////////////////////////////
//setup express

var app = express();

//Create our Express router
var router = express.Router();

//insert logging
function reqSerializer(req) {
	return {
		method: req.method,
		url: req.url,
		headers: req.headers
	}
}
app.use(function(req, res, next){
	log.trace(reqSerializer(req));
	next();
});

// Use the body-parser package in our application
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

// allow CORS
app.use(cors());

// leave the cache stuff to the http tests
app.disable('etag');

// set the view engine to ejs
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/views'));



///////////////////////////////////////////////////////////
//http server

log.info('dirname: ' + __dirname);

//serve main test page
app.use('/app', express.static(__dirname + '/../app', {
	index: 'index.html',
	extensions: ['html']
}));

// serve some static test files
app.use('/static', express.static(__dirname + '/public'));

// for easier development
app.use('/dev', express.static(__dirname + '/main'));
app.use('/test', express.static(__dirname + '/test'));


///////////////////////////////////////////////////////////
//add the beerlocker routes
var wsSend = beerlocker(router, log);


///////////////////////////////////////////////////////////
//add the httptest routes
httptest(router, log);


///////////////////////////////////////////////////////////
//add the sqlite routes
sqlite(router, log);


///////////////////////////////////////////////////////////
//add the jsengine test routes
jsengine(router, log, wsSend);


///////////////////////////////////////////////////////////
// Register all our routes with /api
app.use('/api', router);


///////////////////////////////////////////////////////////
//Start the server

if (fs.existsSync(__dirname + '/cert/server.crt') && fs.existsSync(__dirname + '/cert/server.key')) {
	// Create https server & run
	https.createServer({
			key: fs.readFileSync(__dirname + '/cert/server.key'),
			cert: fs.readFileSync(__dirname + '/cert/server.crt')
	}, app).listen(config.tlsport, function() {
		log.info('secure background server started on port', config.tlsport);
		log.info('call as https://enginetest.webapps:' + config.tlsport + '/app');
	});
}

// listen to http and on success set state to running
app.listen(config.port, function() {
	log.info('background server started on port', config.port);
	log.info('noSetRunning: ' + argv.noSetRunning);
	if (!argv.noSetRunning) {
		setRunning(argv);
	}
});



///////////////////////////////////////////////////////////
// set engineInstace state to running
function setRunning(argv, retry=true) {
	if (argv[config.parameterName]) {
		var uri = argv[config.parameterName].replaceAll('"', '');
		if (uri.startsWith('http')) {
			var myInstanceUri = uri;
		} else {
			var myInstanceUri = registryUri + uri;
		}
		log.info('set ' + myInstanceUri + '.runState to running');
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
			log.info('set runState result:' + JSON.stringify(json));
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
		log.error('ERROR: parameter ' + config.parameterName + ' missing');
	}
}

// check if we run on the target or in a dev env
function realDeal() {
  var isWin = /win/.test(process.platform); // darwin || win32‚
  return !isWin;
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
