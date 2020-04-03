
self.addEventListener('message', onMsg);

self.addEventListener('install', function(event) {
  log('Installed serviceworker.js');
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', function(event) {
  log('Activated serviceworker.js');
  event.waitUntil(self.clients.claim()); // Become available to all pages
  broadcast('activated');
});

function broadcast(msg) {
  self.clients.matchAll()
  .then(function(clients) {
    return Promise.all(clients.map(function(client) {
      log('broadcast send to client: ' + client.id);
      send(client.id, msg);
    }));
  })
  .catch(function(err) {
    log('broadcast error: ' + err.message);
  });
}

function onMsg(event) {
  var id = event.source.id;
  log('onMsg: from ' + id + ' data: ' + JSON.stringify(event.data));
  send(id, 'pong');
}

function send(id, msg) {
  self.clients.get(id)
  .then(function(client) {
    client.postMessage({
      client: id,
      message: msg
    });
  })
  .catch(function(err) {
    log('send error: ' + err.message);
  });
}


// helpers

function log() {
  var args = Array.prototype.slice.call(arguments);
  var message = args.join(' ');
  if (realDeal()) {
    var today = new Date().toISOString().slice(11, 23);
    var now =  '[' + today + ']';
    var msg = {
      source: 'enginetest.serviceworker',
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
  //log('real deal?', real);
  return real;
}
