/**

REST API
--------

  GET /api/beers

  GET /api/beers/id

  POST /api/beers

  PUT /api/beers/id

  DELETE /api/beers/id


Websocket API
-------------

  A websocket server is opened that echoes all messages sent to it

    ws://localhost:48711/ws/echo

  Additionally all connected clients receive notifications when the
  REST server processed a POST, PUT or DELETE



  REST server is inspired by beerlocker tutorial (part2)

  		Beer Locker: Building a RESTful API With Node - CRUD

  		by Scott Smith

  		http://scottksmith.com/blog/2014/05/05/beer-locker-building-a-restful-api-with-node-crud/

	  removed use of mongoDB for data persistency and
	  simplfied by using volatile storage of data in variables

**/


var ws = require('ws');
var uuid = require('node-uuid');


///////////////////////////////////////////////////////////
//load configuration
var config = require('../config.json');

var log;

module.exports = function(router, logger) {

  log = logger;

  // Create a new route with the prefix /beers
  var beersRoute = router.route('/beers');

  // Create endpoint /api/beers for POSTS
  beersRoute.post(postBeers);

  // Create endpoint /api/beers for GET
  beersRoute.get(getBeers);

  // Create a new route with the /beers/:beer_id prefix
  var beerRoute = router.route('/beers/:beer_id');

  // Create endpoint /api/beers/:beer_id for GET
  beerRoute.get(getBeer);

  // Create endpoint /api/beers/:beer_id for PUT
  beerRoute.put(putBeer);

  // Create endpoint /api/beers/:beer_id for DELETE
  beerRoute.delete(deleteBeer);

  return informClients;
}


///////////////////////////////////////////////////////////
//REST server

// fake database
var beers = {}; // id : { name: , type: , quantity }


// endpoint /api/beers for POSTS
function postBeers(req, res) {
	// Create a new instance of the Beer model
	var beer = {};

	// Set the beer properties that came from the POST data
	beer.name = req.body.name;
	beer.type = req.body.type;
	beer.quantity = req.body.quantity;

	var id = uid();

	// Save the beer and check for errors
	beers[id] = beer;

	log.debug('Add: ' + JSON.stringify({ id: id, beer: beer }));
	res.json({ id: id, beer: beer });
	informClients('new beer: ' + id);
}

// endpoint /api/beers for GET
function getBeers(req, res) {
	// Use the Beer model to find all beer
	log.debug('return all beers');
	res.json(beers);
}

// endpoint /api/beers/:beer_id for GET
function getBeer(req, res) {
	// Use the Beer model to find a specific beer
	var id = req.params.beer_id;
	if (id in beers) {
		var beer = beers[id];
		log.debug('return beer ' + id);
		res.json({ id: id, beer: beer })
	} else {
		log.debug('NOT FOUND: ' + id);
		res.sendStatus(404);
	}
}

// endpoint /api/beers/:beer_id for PUT
function putBeer(req, res) {
	// Use the Beer model to find a specific beer
	var id = req.params.beer_id;
	if (!req.body.quantity) {
		log.debug('INVALID: parameter quantity missing');
		res.sendStatus(400);
	} else {
		if (id in beers) {
			beers[id].quantity = req.body.quantity;
			var beer = beers[id];
			log.debug('return updated beer ' + id);
			res.json({ id: id, beer: beer })
			informClients('updated beer: ' + id);
		} else {
			log.debug('NOT FOUND: ' + id);
			res.sendStatus(404);
		}
	}
}

// endpoint /api/beers/:beer_id for DELETE
function deleteBeer(req, res) {
	// Use the Beer model to find a specific beer and remove it
	var id = req.params.beer_id;
	if (id in beers) {
		delete beers[id];
		log.debug('Delete ' + id);
		res.sendStatus(200);
		informClients('deleted beer: ' + id);
	} else {
		log.debug('NOT FOUND: ' + id);
		res.sendStatus(404);
	}
}


///////////////////////////////////////////////////////////
//Websocket server

// ToDo: share server (use same port) with express instead of using own port
var WebSocketServer = ws.Server;

var clients = {};
var clientkey = 1;

//simple echo server
var wss = new WebSocketServer({ port: config.wsport });
//Wire its handlers
wss.on('connection', function (ws) {
	ws.clientkey = clientkey++;
	ws.isAlive = true;
	clients[ws.clientkey] = ws;
	log.info('ws ' + ws.clientkey + ' connection established');
	log.debug(ws.upgradeReq.headers);

	//Wire the event handlers
	ws.on('message', function (data) {
		if (data == 'pong' || data == 'alive') return;
		log.trace('ws ' + ws.clientkey + ' received ' + data);
		ws.isAlive = true;
		// echo
		ws.send(data);
	});
	ws.on('close', function () {
		log.info('ws ' + ws.clientkey + ' connection closed');
		ws.isAlive = false;
		if (ws.clientkey in clients) {
			delete clients[ws.clientkey];
		}
	});
	ws.on('error', function () {
		log.error('ws ' + ws.clientkey + ' connection error');
		ws.isAlive = false;
		if (ws.clientkey in clients) {
			delete clients[ws.clientkey];
		}
	});
});

// start a pinger
setInterval(function() {
	for(var clientkey in clients) {
		var ws = clients[clientkey];
		ws.send('ping');
	}
}, 1000);

function informClients(msg) {
	log.trace('inform clients: ' + msg);
	for(var clientkey in clients) {
		clients[clientkey].send(msg);
	}
}

///////////////////////////////////////////////////////////
//helpers

function uid() {
	var id = uuid.v4();
	return id.replace(new RegExp('-', 'g'), '');
}
