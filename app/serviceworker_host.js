

function initWorker() {
  output('status', 'start...');
  registerWorker();
}

function registerWorker() {
  navigator.serviceWorker.addEventListener('message', onMessage);
  navigator.serviceWorker.register('serviceworker.js')
  .then(function (registration) {
    output('status', 'worker registered on scope ' + registration.scope + ' ... ');
    return navigator.serviceWorker.ready;
  })
  .then(function() {
    output('status', 'ready', true);
    handshake();
  })
  .catch(function (error) {
    output('output', 'Service worker failed to register:\n' + error);//.message);
  });
}

function handshake() {
  setTimeout(function() {
    if (!navigator.serviceWorker.controller) {
      output('output', 'error: no controller\n', true);
    } else {
      output('output', 'send ping...\n', true);
      navigator.serviceWorker.controller.postMessage('ping');
    }
  }, 1000);
}
  
function onMessage(event) {
  output('output', JSON.stringify(event.data) + '\n', true);
}



// helpers

function log() {
  var args = Array.prototype.slice.call(arguments);
  var message = args.join(' ');
  if (realDeal()) {
    var today = new Date().toISOString().slice(11, 23);
    var now =  '[' + today + ']';
    var msg = {
      source: 'enginetest.serviceworker.host',
      severity: 5,
      timestamp: now,
      message: message
    };
    console.log(JSON.stringify(msg));
  } else {
    console.log(message);
  }
}

function output(id, msg, append) {
  log('output: ' + msg);
  var elem = document.getElementById(id);
  if (elem) {
    var text = msg;
    if (append) {
      text = elem.innerHTML + text;
    }
    elem.innerHTML = text;
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
