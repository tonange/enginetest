/**



 **/

var url = new URL(document.referrer);
var engineInstanceUri = url.searchParams.get('engineinstanceURI');
if (!engineInstanceUri) {
  engineInstanceUri = url.searchParams.get('engineInstanceURI');
}
// ICAS3: --rsiRegistryURI=http://[::1]:80
var registryUri = url.searchParams.get('rsiRegistryURI');
if (!registryUri) {
  // default
  registryUri = 'http://127.0.0.1:443';
}
// target simulator trumps all
var viwi_port = url.searchParams.get('VIWI_PORT');
if (viwi_port) {
  registryUri = 'http://127.0.0.1:' + viwi_port;
}
log('using registry at ' + registryUri);


var storageKey = 'enginetest.notifications.data';

var data = loadData('enginetest.notifications.data');
if (!data) {
  data = {
    currentNotifications: {},
    counter: 1
  }
}

var websocket;
var wsuri;

var openSubsciptions = [];



function create(page) {
  if (page == 'notifications') {
    createNotification();
  }
}

function createNotification() {
  var fields = [
    'name',
    'headline',
    'text',
    'actionOne'
  ];
  var notification = {
    name: 'unset',
    headline: 'unset',
    timestamp: Date.now()
  };
  var form = document.getElementById('priority');
  notification.priority = parseInt(form.elements['priority'].value);
  for (var i=0; i<fields.length; i++) {
    var val = document.getElementById(fields[i]).value;
    if (val != '') {
      notification[fields[i]] = val;
    }
  }
  notification.name = notification.name + '_' + data.counter;
  data.counter++;
  if (notification.text) {
    notification.text = notification.text.replaceAll('\\n', '\n');
  }
  // additionalParameter
  var additionalParameter;
  var value = document.getElementById('additionalParameter').value;
  if (value != '' && value != ' ') {
    additionalParameter = {
      name: 'enginetest' + data.counter,
      value: value
    }
    data.counter++;
  }
  // do it
  sendNotification(notification, additionalParameter);
}

function sendNotification(notification, actionParameter) {
  log('send notification', notification);
  output('running ...');

  var transaction = {
    servicename: 'notificationmanager',
    notification: notification,
    actionParameter: actionParameter
  };

  getServiceUri(transaction)
  .then(addAdditionalParameter)
  .then(addNotification)
  .then(subscribeNotification)
  .then(notificationDone)
  .catch(function(err) {
    output(err.message);
  });
}

// service

function getServiceUri(transaction) {
  return new Promise(function(resolve, reject) {
    fetch(registryUri + '/?name=' + transaction.servicename)
    .then(function(response) {
      return response.json();
    })
    .then(function(result) {
      if (result && result.status && result.status == 'ok' && result.data && result.data.length > 0) {
        var record = result.data[0];
        transaction.servicerecord = record;
        resolve(transaction);
      } else {
        reject({message: 'did not find ' +  transaction.servicename + ' in registry'});
      }
    })
    .catch(function(err) {
      reject(err);
    });
  });
}

// notifications

function addAdditionalParameter(transaction) {
  if (transaction.actionParameter) {
    return new Promise(function(resolve, reject) {
      log('add parameter', transaction.actionParameter);
      var uri = registryUri + transaction.servicerecord.uri + 'additionalParameters/';
      fetch(uri, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transaction.actionParameter)
      })
      .then(function (response) {
        if (response.status != 201) {
          throw new Error('status not 201 but ' + response.status);
        }
        var location = response.headers.get('location');
        if (!location) {
          throw new Error('no location header in response to POST additionalParameter');
        }
        // understands '.' separated, relative and absolute uris:
        var elements = location.replace('.', '/').split('/');
        var id = elements.pop();
        var resource = elements.pop();
        var service = elements.pop();
        var actionParameter = '/' + service + '/' + resource + '/' + id;
        transaction.notification.additionalTextParameters = [ actionParameter ];
        log('add parameter:  ok');
        resolve(transaction);
      })
      .catch (reject);
    });
  } else {
    log('no parameter');
    return transaction;
  }
}

function addNotification(transaction) {
  return new Promise(function(resolve, reject) {
    log('add notification');
    var uri = registryUri + transaction.servicerecord.uri + 'notifications/';
    fetch(uri, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transaction.notification)
    })
    .then(function (response) {
      if (response.status != 201) {
        throw new Error('status not 201 but ' + response.status);
      }
      // workaround for mock (doesn't support redirect for ws upgrade)
      if (response.redirected) {
        var url = new URL(response.url);
        url = url.origin;
        wsuri = url.replace('http', 'ws');
      } else  {
        var url = registryUri;
        wsuri = url.replace('http', 'ws');
      }
      // depends on header Access-Control-Expose-Header in response!
      var location = response.headers.get('location');
      if (location === null) {
        throw new Error('No header Access-Control-Expose-Header in response!');
      }
      log('location:', location);
      var elements = location.replace('.', '/').split('/');
      var id = elements.pop();
      transaction.notificationId = id;
      log('notification id', transaction.notificationId);
      resolve(transaction);
    })
    .catch (reject);
  });
}

function subscribeNotification(transaction) {
  subscribe('notifications', transaction.notificationId);
  return transaction;
}

function notificationDone(transaction) {
  output('Ok: ' + transaction.notification.name);
  return transaction;
}


// popups

// ToDo (after testing notifications on a target)



///////////////////////////////////////////////////////////////////////////////
//subscription

function subscribe(resource, id) {
  // establish websocket
  if (!websocket) {
    openSubsciptions.push({resource: resource, id: id});
    websocket = new WebSocket(wsuri);
    websocket.onopen = function(evt) { onOpen(evt) };
    websocket.onclose = function(evt) { onClose(evt) };
    websocket.onmessage = function(evt) { onMessage(evt) };
    websocket.onerror = function(evt) { onError(evt) };
  } else {
    doSubscription(resource, id);
  }
}

function doSubscription(resource, id) {
  //	{
  //		"type" : "subscribe",
  //		"event" : "/<service>/<resource>/<element>?<query-params>#<uniqueid-per-session>",
  //	}
  var msg = {
    type: 'subscribe',
    event: '/notificationmanager/' + resource + '/' + id
  };
  doSend(websocket, JSON.stringify(msg));
}



function onOpen(evt) {
  var ws = evt.target;
  log('ws CONNECTED');
  // send open subscriptions
  for (var i=0; i<openSubsciptions.length; i++) {
    var subscription = openSubsciptions.pop();
    doSubscription(subscription.resource, subscription.id);
  }
}

function onClose(evt) {
  log('ws DISCONNECTED');
  websocket = null;
}

function onMessage(evt) {
  //console.log('ws receive', evt.data);
  try {
    var msg = JSON.parse(evt.data);
    if (msg.type) {
      if (msg.type == 'data') {
        // for now just print to the log
        log(msg);
      }
    }
  } catch (e) {
    log('ERROR on ws receive:', e.message);
  }
}

function onError(evt) {
  log('ws ERROR', evt.data);
  websocket = null;
}

function doSend(ws, message) {
  log('ws send', message);
  ws.send(message);
}



///////////////////////////////////////////////////////////////////////////////
//

function cleanup() {
  log('notifications', 'cleanup');
  saveData('enginetest.notifications.data', data);
}




///////////////////////////////////////////////////////////////////////////////
//speller stuff

function initSpeller(id) {
  var speller = document.getElementById(id);
  if (speller) {
    speller.onfocus = function() {
      focusSpeller(this.id);
    };
    speller.onblur = function() {
      updatedSpeller(this.id);
    };
    updatedSpeller(id);
  }
}

function focusSpeller(id) {
  var speller = document.getElementById(id);
  if (speller) {
    speller.style.color = 'white';
  }
}

function updatedSpeller(id) {
  var speller = document.getElementById(id);
  if (speller) {
    if (isEmpty(speller.value)) {
      speller.value = speller.placeholder;
    }
    if (speller.value == speller.placeholder) {
      speller.style.color = '#bbb';
    }
  }
}

function isEmpty(value){
  return (value == null || value.length === 0);
}


///////////////////////////////////////////////////////////////////////////////
//localStorage

function saveData(storageKey, data) {
	localStorage.setItem(storageKey, JSON.stringify(data));
}

function loadData(storageKey) {
  var data = localStorage.getItem(storageKey);
  if (data) {
    return JSON.parse(data);
  } else {
    return null;
  }
}


///////////////////////////////////////////////////////////////////////////////
//log stuff

function log() {
  var args = Array.prototype.slice.call(arguments);
  for (var i=0; i<args.length; i++) {
    if (typeof args[i] === 'string' || args[i] instanceof String) {
      // already a string: don't touch it
    } else {
      try {
        args[i] = JSON.stringify(args[i]);
      } catch(err) {
        args[i] = args[i].toString();
      }
    }
  }
  var today = new Date().toISOString().slice(11, 23);
  var now =  '[' + today + ']';
  var msg = {
    source: 'enginetest.notifications',
    severity: 5,
    timestamp: now,
    message: args.join(' ')
  };
  console.log(JSON.stringify(msg));
}


///////////////////////////////////////////////////////////////////////////////
//helpers

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// check if we run on the target or in a dev env
function isDev() {
  res = false;
  if (navigator.platform.substring(0, 3) == 'Mac') res = true;
  if (navigator.platform.substring(0, 3) == 'Win') res = true;
  return res;
}
