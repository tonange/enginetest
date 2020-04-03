/**

	dedicated web worker implementation

	opens a client websocket

	sends a test message when opened

**/

// ToDo: get socket address from parent in a config message
const wsUri = "ws://127.0.0.1:48711/ws/echo";

var websocket;
var timer;


function init() {
  openWebSocket();
}


function out(text) {
  if (text == 'ping') return;
  log('console', 'out', text);
  var output = document.getElementById('output');
  if (output) {
    output.innerHTML = output.innerHTML + text;
  }
}

function clearConsole() {
  log('console', 'clear');
  var output = document.getElementById('output');
  if (output) {
    output.innerHTML = '';
  }
}


function openWebSocket() {
  websocket = new WebSocket(wsUri);
  websocket.onopen = function(evt) { onOpen(evt) };
  websocket.onclose = function(evt) { onClose(evt) };
  websocket.onmessage = function(evt) { onMessage(evt) };
  websocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt) {
  writeToParent("CONNECTED\n");
  if (!timer) {
    timer = setInterval(function() {
      if (websocket) {
        websocket.send('alive');
      }
    }, 1000);
  }
}

function onClose(evt) {
  writeToParent("DISCONNECTED\n");
  clearInterval(timer);
  timer = null;
  setTimeout(openWebSocket, 100);
}

function onMessage(evt) {
  if (evt.data == 'ping') {
    websocket.send('pong');
    return;
  }
  writeToParent(evt.data);
}

function onError(evt) {
  writeToParent('ERROR: ' + evt.data + '\n');
}

function doSend(message) {
  websocket.send(message);
}

function writeToParent(message) {
  out(message);
}

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
    source: 'enginetest.console',
    severity: 5,
    timestamp: now,
    message: args.join(' ')
  };
  console.log(JSON.stringify(msg));
}
