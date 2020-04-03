
importScripts('eventEmitter/EventEmitter.js', 'viwiclient.js');


var nextName = 1;
function getNextName() {
  return nextName++;
}

var clients = {};
var sockets = {};
var uris = {};

// a bit awkward because viwiclient was not created to be used like this:
var vc = new Viwiclient();
vc.on('connected', function(msg) {
  log('on connected ' + msg.data);
  for (var name in sockets[msg.data]) {
    if (sockets[msg.data][name].open_notified == false) {
      sockets[msg.data][name].open_notified = true;
      send(name, {type: 'onopen'});
    }
  }
});
vc.on('rawdata', function(msg) {
  log('on rawdata id: ' + msg.id);
  if (uris.hasOwnProperty(msg.id)) {
    var uri = uris[msg.id];
    // find clients (names) for subscription id
    for (var name in sockets[uri]) {
      var socket = sockets[uri][name];
      if (socket.subscriptions.hasOwnProperty(msg.id)) {
        if (msg.data.type == 'subscribe') {
          if (sockets[uri][name].subscriptions[msg.id].notified) {
            continue;
          }
          sockets[uri][name].subscriptions[msg.id].notified = true;
        } else if (msg.data.type == 'unsubscribe') {
          if (sockets[uri][name].subscriptions[msg.id].denotified) {
            continue;
          }
          sockets[uri][name].subscriptions[msg.id].denotified = true;
        }
        log('send to ' + name + ' event: ' + msg.data.event);
        send(name, {type: 'onmessage', data: msg.data});
      }
    }
  } else {
    log('error: unknown id ' + msg.id);
  }
});


log('started');


onconnect = function(event) {
	var name = getNextName();
	log(name + ' onconnect');
  event.ports[0]._data = { port: event.ports[0], name: name };
  clients[name] = event.ports[0]._data;
  event.ports[0].onmessage = onMsg;
  send(name, {type: 'connected'});
}

function onMsg(event) {
	var name = event.target._data.name;
  log(name + ' onMsg ' + JSON.stringify(event.data));
  var msg = event.data;
  switch(msg.type) {
    case 'open':
      requestOpen(name, msg);
      break;
    case 'close':
      requestClose(name, msg);
      break;
    case 'send':
      requestSend(name, msg);
      break;
  }
}


function requestOpen(name, msg) {
  log(name + ' request open ' + msg.url);
  if (!sockets.hasOwnProperty(msg.url)) {
    sockets[msg.url] = {};  
  }
  sockets[msg.url][name] = { 
    subscriptions: {},
    open_notified: false
  };
  vc.rawconnect(msg.url)
  .then(function(connection) {
    log(name + ' open requested for '+ msg.url);
    if (connection.connected) {
      log(name + ' socket already connected');
      sockets[msg.url][name].open_notified = true;
      send(name, {type: 'onopen'});
    }
  })
  .catch(function(err) {
    log(name + ' open request failed for ' + msg.url + ' ' + err);
  });
}

function requestClose(name, msg) {
  log(name + ' request close ' + msg.url);
  // ToDo: leave websocket open anyway?
  log(name + ' leaving websocket open');
  send(name, {type: 'onclose'});  
  // remove client
  for (var uri in sockets) {
    if (sockets[uri].hasOwnProperty(name)) {
      delete sockets[uri][name];
      delete clients[name];
    }
  }
}

function requestSend(name, msg) {      
  log(name + ' send to ' + msg.url + ', data ' + msg.data);
  try {
    var message = JSON.parse(msg.data);
    switch (message.type) {
      case 'subscribe':
        var id = vc.subscribe(msg.url, message);
        uris[id] = msg.url;
        if (sockets[msg.url][name].subscriptions.hasOwnProperty(id)) {
          log(name + ' event was already subscribed, id ' + id);
          sockets[msg.url][name].subscriptions[id].count++;
        } else {
          log(name + ' subscribed, id ' + id);
          sockets[msg.url][name].subscriptions[id] = {
            subscription: message,
            notified: false,
            denotified: false,
            count: 1
          };
        }
        break;
      case 'unsubscribe':
        for (var id in sockets[msg.url][name].subscriptions) {
          var sub = sockets[msg.url][name].subscriptions[id];
          if (message.event == sub.subscription.event) {
            sub.count--;
            if (sub.count == 0) {
              log(name + ' last subscription: unsubscribe');
              vc.unsubscribe(id);
            } else {
              log(name + ' not last subscription');
            }
            break;
          }
        }
        break;
    }
  } catch(e) {
    log(name + ' error in message ' + e);//.message);
  }
}

// send to parent app:
function send(name, msg) {
  if (name && clients[name]) {
    clients[name].port.postMessage(msg);
  }
}


// helper

function log() {
  var args = Array.prototype.slice.call(arguments);
  var message = args.join(' ');
  if (realDeal()) {
    var today = new Date().toISOString().slice(11, 23);
    var now =  '[' + today + ']';
    var msg = {
      source: 'enginetest.socketworker',
      severity: 5,
      timestamp: now,
      message: message
    };
    console.log(JSON.stringify(msg));
  } else {
    console.log(message);
  }
}

// check if we run on the target or in a dev env
function realDeal() {
  var real = true;
  if (navigator.platform.substring(0, 3) == 'Mac') real = false;
  if (navigator.platform.substring(0, 3) == 'Win') real = false;
  return real;
}
