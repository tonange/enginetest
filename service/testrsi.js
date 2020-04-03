const parseArgs = require('minimist');
const Console = require('console').Console;
const fetch = require('node-fetch');
const process = require('process');

///////////////////////////////////////////////////////////
//local modules
var miblog = require('./modules/logwrapper.js');

///////////////////////////////////////////////////////////
//deferred modules (require in main() after setRunning)
var path;
var uuid;
var async;
var bodyParser;
var express;
// see below:   require('express-ws')
var cors;



const servicename = 'enginetestTestRsi';
const parameterName = 'engineinstanceURI';


polyfill();


///////////////////////////////////////////////////////////
//create log object
var log = new miblog({ source: 'enginetest.testapp' });





var appcons = new Console(process.stderr, process.stderr);
log.info('------------------------------------------------------------------------');
log.info('-                        enginetest RSI test                           -');
log.info('------------------------------------------------------------------------');
log.info('started');

log.info('process.cwd  ' + process.cwd());
log.info('process.argv ' + process.argv);


var opts = {
	alias: {
		r: 'rsiRegistryURI',	// ICAS3
    n: 'name',      // service name
		p: 'port',      // port for this server
		l: 'load',      // CPU load in percent to inflict on one core
		u: 'uptime'			// time in ms until ending the process (0 = never)  
	},
	default: {
		rsiRegistryURI: 'http://127.0.0.1:443',
    name: servicename,
    port: 48712,
		load: 0,
		uptime: 0
  }
};
var argv = parseArgs(process.argv.slice(2), opts);
log.info('parseArgs: ' + JSON.stringify(argv, null, '  '));


var registry = argv.rsiRegistryURI;

var myid; // from registration

// CPU hog
var shouldRun = false;
var desiredLoadFactor = Math.min(100,Math.max(0,argv.load))/100;

var subscriptions = {};


setRunning(argv)
.then(main)
.catch(function(err) {
	log.error('ERROR FAILED TO SET runState TO running:' + err);
});


function main() {
	log.info('start deferred main');
	// deferred requires:
	path = require('path');
	uuid = require('uuid');
	async = require('async-kit');

	bodyParser = require('body-parser');
	express = require('express');

	// see below:   require('express-ws')
	cors = require('cors');

	// deferred main:

	//var register = (argv._.indexOf('noregister') == -1) || (argv.hasOwnProperty('noregister'));
	var register = !argv.hasOwnProperty('noregister');
	if (register) {
		log.info('do RSI registration');
	}
	if (argv.load > 0) {
		log.info('start CPU hog, load factor: ' + argv.load);
	}
	if (argv.uptime > 0) {
		log.info('end process after ' + argv.uptime + ' ms');
	}

	setInterval(function() {
		log.info('still alive');
	}, 10000);

	var app = express();
	var expressWs = require('express-ws')(app);
	app.use(bodyParser.json({limit: '50mb'}));
	app.use(cors());


	var router = express.Router();

	// log requests
	router.use(function(req, res, next) {
		log.info(req.method + ' ' + req.originalUrl);
		next();
	});

	// websocket
	//
	router.ws('/', addConnection);

	// /   = root
	//
	router.get('(/api/v1)?/', returnRoot);

	// /{service}/
	//
	router.get('(/api/v1)?/:service', returnResources);
	router.post('(/api/v1)?/:service', notImplemented);
	router.delete('(/api/v1)?/:service', notImplemented);

	// /{service}/{resource}
	//
	router.get('(/api/v1)?/:service/:resource', notImplemented);
	router.post('(/api/v1)?/:service/:resource', notImplemented);

	// /{service}/{resource}/{element}
	//
	router.get('(/api/v1)?/:service/:resource/:element', notImplemented);
	router.post('(/api/v1)?/:service/:resource/:element', notImplemented);
	router.delete('(/api/v1)?/:service/:resource/:element', notImplemented);

	////////////////////////////////////////////////////////////////////////////////
	// start server

	app.use('/', router);

	// Listen for requests
	var srv = app.listen(argv.port, function() {
		log.info('listening on port ' + argv.port);
		if (register) {
			doRegistration(argv.name);
		}
	});


	///////////////////////////////////////////////////////////
	// optional end process after x ms

	if (argv.uptime > 0) {
		setTimeout(function() {
			log.info('uptime timer expired, shutting down');
			doDeRegistration(function() {
				process.exit();
			});
		}, argv.uptime);	
	}

	///////////////////////////////////////////////////////////
	// optional CPU hog (1s delayed start)

	setTimeout(function() {
		if (argv.load > 0) {
			log.info('starting CPU hog, load ' + argv.load + '%');
			shouldRun = true;
			startHog();
		}
	}, 1000);

	// app is closing
	process.on('exit', exitHandler.bind());
	// catches ctrl+c event
	process.on('SIGINT', exitHandler.bind());
	// catches kill
	process.on('SIGTERM', exitHandler.bind());

	process.on( 'asyncExit' , function( code , timeout , callback ) {
		log.info('asyncExit');
		doDeRegistration(callback);
	});

} // /main


///////////////////////////////////////////////////////////////



function startHog() {
	blockCpuFor(1000*desiredLoadFactor);
	setTimeout(startHog, 1000* (1 - desiredLoadFactor));
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



///////////////////////////////////////////////////////////
// set engineInstace state to running

function setRunning(argv, retry=true) {
	return new Promise(function(resolve, reject) {
		if (argv[parameterName]) {
			var uri = argv[parameterName].replaceAll('"', '');
			if (uri.startsWith('http')) {
				var myInstanceUri = uri;
			} else {
				var myInstanceUri = registry + uri;
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
				log.info('set runState result:');
				log.info(json);
				resolve();
			})
			.catch(function(err) {
				if (retry) {
					log('WORKAROUND for missing URL parameter rsiRegistryURI in ICAS3: try with hardcoded registryURI');
					registry = 'http://[::1]:80';
					setRunning(uri, false)
					.then(resolve)
					.catch(reject);
				} else {
					reject(new Error('ERROR: set runState error: ' + err.message));
				}
			});
		} else {
			reject('ERROR: parameter ' + parameterName + ' missing');
		}
	});
}


///////////////////////////////////////////////////////////
// graceful shutdown


function exitHandler() {
	async.exit(5, 1000);
}


// deregister at central registry
function doDeRegistration(callback) {
  if (myid) {
    var uri = registry + '/' + myid;
		log.info('deregister ' + uri);
    fetch(uri, {
  		method: 'DELETE'
  	})
  	.then(function(res) {
  		return res.json();
  	})
  	.then(function(json) {
			log.info('deregistration result:');
			log.info(json);
      myid = null;
      if (callback) callback();
    })
  	.catch(function(err) {
			log.warn('deregistration error:' + err.message);
			myid = null;
      if (callback) callback();
    });
  } else {
		if (callback) callback();
	}
}

// register at central registry
function doRegistration(service) {
	var uri = registry + '/' + service;
	var registration = {
		description: service,
	  name: service,
		uri: '/' + service + '/',
	  port: argv.port,
	  privileges: [],
	  serviceCategories: [],
	  versions: [ '1.0.0' ]
	};
	log.info('register ' + service);
	log.info(registration);
	fetch(uri, {
		method: 'PUT',
		body:    JSON.stringify(registration),
		headers: { 'Content-Type': 'application/json' },
	})
	.then(function(res) {
    if (res.ok) {
			var location = res.headers.get('location');
			if (location) {
				var parts = location.split('/');
				myid = parts.pop();
				log.info('myid ' + myid);
			}
    }
		return res.json();
	})
	.then(function(json) {
		log.info('registration result:');
		log.info(json);
  })
	.catch(function(err) {
    log.error('registration error: ' + err.message);
  });
}


// catch shutdown
// deregister testservice

// testservice implementation

function returnRoot(req, res) {
	var data = [
    {
      id: argv.name,
      name: argv.name,
      uri: '/' + argv.name,
      description: 'engintest test RSI'
    }
  ];
	resultOk(req, res, data);
}

function returnResources(req, res) {
  var data = [
    {
      id: 'testres',
      name: 'testres',
      uri: '/' + argv.name + '/testres',
      description: 'engintest test RSI resource'
    }
  ];
  resultOk(req, res, data);
}

function resultOk(req, res, elem) {
	var result = {
		status: 'ok',
		data: elem
	};
	res.json(result);
}

function notFound(req, res) {
	errorResponse(req, res, 404);
}

function notImplemented(req, res) {
	errorResponse(req, res, 501);
}

function errorResponse(req, res, status) {
	var message = '';
	switch (status) {
		case 400:
			message = "bad request";
			break;
		case 404:
			message = "not found";
			break;
		case 501:
			message = "not implemented";
			break;
	}
	var response = {
		status: 'error',
		message: message,
		code: status
	}
	res.status(status).json(response);
}

function addConnection(ws, req) {
	ws.on('message', function(msg) {
		log.info('websocket message: ' + msg);
		if (!ws.connectionId) {
			ws.connectionId = uuid.v4();
			log.info('client ' + ws.connectionId + ' connected');
		}
		// ws.protocol: 'subscription-json'
		// ws.upgradeReq.headers: { ... }
		var request = JSON.parse(msg);
		if (request && request.type) {
			switch(request.type) {
				case 'subscribe':
					handleSubscribe(request, ws);
					break;
				case 'unsubscribe':
					handleUnsubscribe(request, ws);
					break;
				// case 'reauthorize':
				default:
					log.info('websocket unhandled request: ' + request.type);
			}
		}
	});
	ws.on('close', function() {
		if (ws.connectionId) {
			log.info('client ' + ws.connectionId + ' disconnected');
			delete subscriptions[ws.connectionId];
		}
	});
};

function handleSubscribe(request, ws) {
	if (request.event) {
		if (!subscriptions[ws.connectionId]) {
			subscriptions[ws.connectionId] = {
				ws: ws,
				events: []
			};
		}
		// remove optional [/api/v1]
		var event = request.event.replace('/api/v1', '');
		subscriptions[ws.connectionId].events.push(event);
		var response = {
			type: 'subscribe',
			event: request.event,
			status: 'ok'
		};
		log.info('websocket response:');
		log.info(response);
		send(ws, JSON.stringify(response));
	}
}

function handleUnsubscribe(request, ws) {
	if (request.event) {
		// remove optional [/api/v1]
		var event = request.event.replace('/api/v1', '');
		var index = subscriptions[ws.connectionId].events.indexOf(event);
		if (index !== -1) {
			subscriptions[ws.connectionId].events.splice(index, 1);
			var response = {
				type: 'unsubscribe',
				event: request.event,
				status: 'ok'
			};
		} else {
			var response = {
				type: 'error',
				code: 404,
				event: request.event,
				data: 'subscription not found'
			};
		}
		log.info('websocket response:');
		log.info(response);
		send(ws, JSON.stringify(response));
	}
}

function informSubscribers(service, resource) {
	var pattern = '/' + service + '/' + resource;
	for (session in subscriptions) {
		for (var i=0; i<subscriptions[session].events.length; i++) {
			var event = subscriptions[session].events[i];
			if (pattern == event.substring(0, pattern.length)) {

        var data = 'ToDo';

				var response = {
					type: 'data',
					event: event,
					data: data
				};
				send(subscriptions[session].ws, JSON.stringify(response));
			}
		}
	}
}

function send(ws, msg) {
	if (ws.readyState == 1) { // OPENED
		ws.send(msg);
	}
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


////////////////////////////////////////////////////////////////////////////////
// helpers

// check if we run on the target or in a dev env
function realDeal() {
  var isWin = /win/.test(process.platform); // darwin || win32‚
  return !isWin;
}

function isArray(o) {
  return Object.prototype.toString.call(o) === '[object Array]';
}
function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}
