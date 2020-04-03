(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**

	dedicated web worker implementation

	opens a client websocket

	sends a test message when opened

**/

// ToDo: get socket address from parent in a config message
var wsUri = "ws://localhost:48711/ws/echo";

var websocket;
var timer;

//testWebSocket();


function testWebSocket() {
  writeToParent("OPEN");
  websocket = new WebSocket(wsUri);
  websocket.onopen = function(evt) { onOpen(evt) };
  websocket.onclose = function(evt) { onClose(evt) };
  websocket.onmessage = function(evt) { onMessage(evt) };
  websocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt) {
  writeToParent("CONNECTED");
  doSend("WebSocket rocks");
  if (!timer) {
    timer = setInterval(function() {
      if (websocket) {
        websocket.send('alive');
      }
    }, 1000);
  }
}

function onClose(evt) {
  writeToParent("DISCONNECTED");
  clearInterval(timer);
  timer = null;
  setTimeout(testWebSocket, 100);
}

function onMessage(evt) {
  if (evt.data == 'ping') {
    websocket.send('pong');
    return;
  }
  writeToParent('RESPONSE: ' + evt.data);
}

function onError(evt) {
  writeToParent('ERROR: ' + evt.data);
}

function doSend(message) {
  writeToParent("SENT: " + message);
  websocket.send(message);
}

function writeToParent(message) {
  log(message);
//  self.postMessage(message);
  writeToScreen(message);
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
  var msg = {
    source: 'enginetest.wsworker',
    severity: 5,
    message: args.join(' ')
  };
  console.log(JSON.stringify(msg));
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvd3N3b3JrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcblxuXHRkZWRpY2F0ZWQgd2ViIHdvcmtlciBpbXBsZW1lbnRhdGlvblxuXG5cdG9wZW5zIGEgY2xpZW50IHdlYnNvY2tldFxuXG5cdHNlbmRzIGEgdGVzdCBtZXNzYWdlIHdoZW4gb3BlbmVkXG5cbioqL1xuXG4vLyBUb0RvOiBnZXQgc29ja2V0IGFkZHJlc3MgZnJvbSBwYXJlbnQgaW4gYSBjb25maWcgbWVzc2FnZVxudmFyIHdzVXJpID0gXCJ3czovL2xvY2FsaG9zdDo0ODcxMS93cy9lY2hvXCI7XG5cbnZhciB3ZWJzb2NrZXQ7XG52YXIgdGltZXI7XG5cbi8vdGVzdFdlYlNvY2tldCgpO1xuXG5cbmZ1bmN0aW9uIHRlc3RXZWJTb2NrZXQoKSB7XG4gIHdyaXRlVG9QYXJlbnQoXCJPUEVOXCIpO1xuICB3ZWJzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHdzVXJpKTtcbiAgd2Vic29ja2V0Lm9ub3BlbiA9IGZ1bmN0aW9uKGV2dCkgeyBvbk9wZW4oZXZ0KSB9O1xuICB3ZWJzb2NrZXQub25jbG9zZSA9IGZ1bmN0aW9uKGV2dCkgeyBvbkNsb3NlKGV2dCkgfTtcbiAgd2Vic29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2dCkgeyBvbk1lc3NhZ2UoZXZ0KSB9O1xuICB3ZWJzb2NrZXQub25lcnJvciA9IGZ1bmN0aW9uKGV2dCkgeyBvbkVycm9yKGV2dCkgfTtcbn1cblxuZnVuY3Rpb24gb25PcGVuKGV2dCkge1xuICB3cml0ZVRvUGFyZW50KFwiQ09OTkVDVEVEXCIpO1xuICBkb1NlbmQoXCJXZWJTb2NrZXQgcm9ja3NcIik7XG4gIGlmICghdGltZXIpIHtcbiAgICB0aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHdlYnNvY2tldCkge1xuICAgICAgICB3ZWJzb2NrZXQuc2VuZCgnYWxpdmUnKTtcbiAgICAgIH1cbiAgICB9LCAxMDAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBvbkNsb3NlKGV2dCkge1xuICB3cml0ZVRvUGFyZW50KFwiRElTQ09OTkVDVEVEXCIpO1xuICBjbGVhckludGVydmFsKHRpbWVyKTtcbiAgdGltZXIgPSBudWxsO1xuICBzZXRUaW1lb3V0KHRlc3RXZWJTb2NrZXQsIDEwMCk7XG59XG5cbmZ1bmN0aW9uIG9uTWVzc2FnZShldnQpIHtcbiAgaWYgKGV2dC5kYXRhID09ICdwaW5nJykge1xuICAgIHdlYnNvY2tldC5zZW5kKCdwb25nJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHdyaXRlVG9QYXJlbnQoJ1JFU1BPTlNFOiAnICsgZXZ0LmRhdGEpO1xufVxuXG5mdW5jdGlvbiBvbkVycm9yKGV2dCkge1xuICB3cml0ZVRvUGFyZW50KCdFUlJPUjogJyArIGV2dC5kYXRhKTtcbn1cblxuZnVuY3Rpb24gZG9TZW5kKG1lc3NhZ2UpIHtcbiAgd3JpdGVUb1BhcmVudChcIlNFTlQ6IFwiICsgbWVzc2FnZSk7XG4gIHdlYnNvY2tldC5zZW5kKG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiB3cml0ZVRvUGFyZW50KG1lc3NhZ2UpIHtcbiAgbG9nKG1lc3NhZ2UpO1xuLy8gIHNlbGYucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gIHdyaXRlVG9TY3JlZW4obWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIGxvZygpIHtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICBmb3IgKHZhciBpPTA7IGk8YXJncy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0eXBlb2YgYXJnc1tpXSA9PT0gJ3N0cmluZycgfHwgYXJnc1tpXSBpbnN0YW5jZW9mIFN0cmluZykge1xuICAgICAgLy8gYWxyZWFkeSBhIHN0cmluZzogZG9uJ3QgdG91Y2ggaXRcbiAgICB9IGVsc2Uge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXJnc1tpXSA9IEpTT04uc3RyaW5naWZ5KGFyZ3NbaV0pO1xuICAgICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgYXJnc1tpXSA9IGFyZ3NbaV0udG9TdHJpbmcoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgdmFyIG1zZyA9IHtcbiAgICBzb3VyY2U6ICdlbmdpbmV0ZXN0Lndzd29ya2VyJyxcbiAgICBzZXZlcml0eTogNSxcbiAgICBtZXNzYWdlOiBhcmdzLmpvaW4oJyAnKVxuICB9O1xuICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShtc2cpKTtcbn1cbiJdfQ==
