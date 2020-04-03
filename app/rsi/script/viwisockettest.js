

window.addEventListener('load', init, false);
window.addEventListener('beforeunload', shutdown, false);


var url = new URL(document.referrer);
var engineInstanceUri = url.searchParams.get('engineinstanceURI');
if (!engineInstanceUri) {
  engineInstanceUri = url.searchParams.get('engineInstanceURI');
}
// ICAS3: --rsiRegistryURI=http://[::1]:80
var registry = url.searchParams.get('rsiRegistryURI');
if (!registry) {
  // default
  registry = 'http://127.0.0.1:443';
}
// target simulator trumps all
var viwi_port = url.searchParams.get('VIWI_PORT');
if (viwi_port) {
  registry = 'http://127.0.0.1:' + viwi_port;
}
log('using registry at ' + registry);


// used for websockets via worker:
var vs;
var vs2;
// only used for http requests and to get the uris for websockets:
var vc = new Viwiclient(registry);

function shutdown() {
  if (vs) {
    vs.close();
  }
  if (vs2) {
    vs2.close();
  }
}

function init() {
  output('status', 'init');
  vc.getService('webappmanagement')
  .then(function(service) {
    var wsUri = service.origin.replace('http', 'ws');
    vs = new ViwiSocket(wsUri);
    /* alternative syntax also working:
    vs.on('open', function(event) {
      log('vs.on');
    });
    vs.addEventListener('open', function(event) {
      log('vs.addEventListener');
    });
    */
    vs.onopen = function(event) {
      log('vs.onopen');
      output('status', 'opened');
      output('output', 'opened ' + vs.url, true);
      // test a subscription:
      log('subscribe to /webappmanagement/engineInstances/');
      subscribe(vs, '/webappmanagement/engineInstances/');
    };
    vs.onclose = function(event) {
      log('vs.onclose');
      output('output', 'closed ' + vs.url, true);
    };
    vs.onerror = function(event) {
      log('vs.onerror ');
      output('output', 'onerror: ' + event.data, true);
    };
    vs.onmessage = function(event) {
      log('vs.onmessage');
      handleMessage(vs, event.data);
    };
  })
  .catch(function(err) {
    output('output', 'ERROR: ' + err.message, true);
  });
  
  vc.getService('servicemanagement')
  .then(function(service) {
    var wsUri = service.origin.replace('http', 'ws');
    vs2 = new ViwiSocket(wsUri);
    vs2.onopen = function(event) {
      log('vs2.onopen');
      output('output', 'opened ' + vs2.url, true);
      // test a subscription:
      log('subscribe to /servicemanagement/services/');
      subscribe(vs2, '/servicemanagement/services/');
    };
    vs2.onclose = function(event) {
      log('vs2.onclose');
      output('output', 'closed ' + vs2.url, true);
    };
    vs2.onerror = function(event) {
      log('vs2.onerror ');
      output('output', 'onerror: ' + event.data, true);
    };
    vs2.onmessage = function(event) {
      log('vs2.onmessage');
      handleMessage(vs2, event.data);
    };
  })
  .catch(function(err) {
    output('output', 'ERROR: ' + err.message, true);
  });
  
}

function subscribe(viwisocket, event) {
  var subscription = {
    type: 'subscribe',
    event: event
  };
  viwisocket.send(JSON.stringify(subscription));
}

function handleMessage(viwisocket, msg) {
  log('handleMessage ' + JSON.stringify(msg));
  output('output', msg.type + ' from ' + viwisocket.url + ' event: ' + msg.event, true);

  // do more?

}


// helper

function output(id, msg, append) {
  log('output: ' + msg);
  var elem = document.getElementById(id);
  if (elem) {
    var text = msg;
    if (append) {
      text = elem.innerHTML  + '\n' + text;
    }
    elem.innerHTML = text;
  }
}

function log() {
  var args = Array.prototype.slice.call(arguments);
  var message = args.join(' ');
  if (realDeal()) {
    var today = new Date().toISOString().slice(11, 23);
    var now =  '[' + today + ']';
    var msg = {
      source: 'enginetest.viwisockettest',
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
