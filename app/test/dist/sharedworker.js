(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**

	Shared Web Worker reference
	
	When a front end connects to the worker it sends a 'connect' event
	to all other front ends that are connected
	
	When a 'setColor' cmd is received from one front end is received
	it is forwarded to all other connected front ends
	
**/

//FixMe: does not seem to work with browserify?

var nextName = 0;
function getNextName() {
  return nextName++;
}

var clients = {};

info('started');

onconnect = function(event) {
	var name = getNextName();
	info('onconnect: my name=' + name);
  event.ports[0]._data = { port: event.ports[0], name: name };
  clients[name] = event.ports[0]._data;
  event.ports[0].onmessage = onMsg;
  distribute(name, {'event': 'connect', 'name': name});
}

function onMsg(event) {
	var name = event.target._data.name;
	info('onMsg: from ' + name + ' + data: ' + JSON.stringify(event.data));
	if (event.data.cmd) {
		handleCmd(name, event.data);
	}
}

function handleCmd(name, msg) {
	if (msg.cmd == 'setColor') {
		distribute(name, msg);
	}
}

function distribute(name, msg) {
  for (var client in clients) {
  	if (client != name) {
  		clients[client].port.postMessage(msg);
  	}
  }
}

function broadcast(msg) {
  for (var client in clients) {
    clients[client].port.postMessage(msg);
  }
}

/**
	log wrapper functions
**/
function info(msg) {
	out(5, msg);
}
function debug(msg) {
	out(6, msg);
}
function trace(msg) {
	out(7, msg);
}
function out(severity, msg) {
	if (realDeal()) {
		console.log({'source': 'sharedworker', 'severity': severity, 'message': msg});
	} else {
		console.log(msg);
	}
}

// check if we run on the target or in a dev env
function realDeal() {
	var real = true;
	if (navigator.platform.substring(0, 3) == 'Mac') real = false;
	if (navigator.platform.substring(0, 3) == 'Win') real = false;
	return real;
}
	
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc2hhcmVkd29ya2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG5cblx0U2hhcmVkIFdlYiBXb3JrZXIgcmVmZXJlbmNlXG5cdFxuXHRXaGVuIGEgZnJvbnQgZW5kIGNvbm5lY3RzIHRvIHRoZSB3b3JrZXIgaXQgc2VuZHMgYSAnY29ubmVjdCcgZXZlbnRcblx0dG8gYWxsIG90aGVyIGZyb250IGVuZHMgdGhhdCBhcmUgY29ubmVjdGVkXG5cdFxuXHRXaGVuIGEgJ3NldENvbG9yJyBjbWQgaXMgcmVjZWl2ZWQgZnJvbSBvbmUgZnJvbnQgZW5kIGlzIHJlY2VpdmVkXG5cdGl0IGlzIGZvcndhcmRlZCB0byBhbGwgb3RoZXIgY29ubmVjdGVkIGZyb250IGVuZHNcblx0XG4qKi9cblxuLy9GaXhNZTogZG9lcyBub3Qgc2VlbSB0byB3b3JrIHdpdGggYnJvd3NlcmlmeT9cblxudmFyIG5leHROYW1lID0gMDtcbmZ1bmN0aW9uIGdldE5leHROYW1lKCkge1xuICByZXR1cm4gbmV4dE5hbWUrKztcbn1cblxudmFyIGNsaWVudHMgPSB7fTtcblxuaW5mbygnc3RhcnRlZCcpO1xuXG5vbmNvbm5lY3QgPSBmdW5jdGlvbihldmVudCkge1xuXHR2YXIgbmFtZSA9IGdldE5leHROYW1lKCk7XG5cdGluZm8oJ29uY29ubmVjdDogbXkgbmFtZT0nICsgbmFtZSk7XG4gIGV2ZW50LnBvcnRzWzBdLl9kYXRhID0geyBwb3J0OiBldmVudC5wb3J0c1swXSwgbmFtZTogbmFtZSB9O1xuICBjbGllbnRzW25hbWVdID0gZXZlbnQucG9ydHNbMF0uX2RhdGE7XG4gIGV2ZW50LnBvcnRzWzBdLm9ubWVzc2FnZSA9IG9uTXNnO1xuICBkaXN0cmlidXRlKG5hbWUsIHsnZXZlbnQnOiAnY29ubmVjdCcsICduYW1lJzogbmFtZX0pO1xufVxuXG5mdW5jdGlvbiBvbk1zZyhldmVudCkge1xuXHR2YXIgbmFtZSA9IGV2ZW50LnRhcmdldC5fZGF0YS5uYW1lO1xuXHRpbmZvKCdvbk1zZzogZnJvbSAnICsgbmFtZSArICcgKyBkYXRhOiAnICsgSlNPTi5zdHJpbmdpZnkoZXZlbnQuZGF0YSkpO1xuXHRpZiAoZXZlbnQuZGF0YS5jbWQpIHtcblx0XHRoYW5kbGVDbWQobmFtZSwgZXZlbnQuZGF0YSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlQ21kKG5hbWUsIG1zZykge1xuXHRpZiAobXNnLmNtZCA9PSAnc2V0Q29sb3InKSB7XG5cdFx0ZGlzdHJpYnV0ZShuYW1lLCBtc2cpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGRpc3RyaWJ1dGUobmFtZSwgbXNnKSB7XG4gIGZvciAodmFyIGNsaWVudCBpbiBjbGllbnRzKSB7XG4gIFx0aWYgKGNsaWVudCAhPSBuYW1lKSB7XG4gIFx0XHRjbGllbnRzW2NsaWVudF0ucG9ydC5wb3N0TWVzc2FnZShtc2cpO1xuICBcdH1cbiAgfVxufVxuXG5mdW5jdGlvbiBicm9hZGNhc3QobXNnKSB7XG4gIGZvciAodmFyIGNsaWVudCBpbiBjbGllbnRzKSB7XG4gICAgY2xpZW50c1tjbGllbnRdLnBvcnQucG9zdE1lc3NhZ2UobXNnKTtcbiAgfVxufVxuXG4vKipcblx0bG9nIHdyYXBwZXIgZnVuY3Rpb25zXG4qKi9cbmZ1bmN0aW9uIGluZm8obXNnKSB7XG5cdG91dCg1LCBtc2cpO1xufVxuZnVuY3Rpb24gZGVidWcobXNnKSB7XG5cdG91dCg2LCBtc2cpO1xufVxuZnVuY3Rpb24gdHJhY2UobXNnKSB7XG5cdG91dCg3LCBtc2cpO1xufVxuZnVuY3Rpb24gb3V0KHNldmVyaXR5LCBtc2cpIHtcblx0aWYgKHJlYWxEZWFsKCkpIHtcblx0XHRjb25zb2xlLmxvZyh7J3NvdXJjZSc6ICdzaGFyZWR3b3JrZXInLCAnc2V2ZXJpdHknOiBzZXZlcml0eSwgJ21lc3NhZ2UnOiBtc2d9KTtcblx0fSBlbHNlIHtcblx0XHRjb25zb2xlLmxvZyhtc2cpO1xuXHR9XG59XG5cbi8vIGNoZWNrIGlmIHdlIHJ1biBvbiB0aGUgdGFyZ2V0IG9yIGluIGEgZGV2IGVudlxuZnVuY3Rpb24gcmVhbERlYWwoKSB7XG5cdHZhciByZWFsID0gdHJ1ZTtcblx0aWYgKG5hdmlnYXRvci5wbGF0Zm9ybS5zdWJzdHJpbmcoMCwgMykgPT0gJ01hYycpIHJlYWwgPSBmYWxzZTtcblx0aWYgKG5hdmlnYXRvci5wbGF0Zm9ybS5zdWJzdHJpbmcoMCwgMykgPT0gJ1dpbicpIHJlYWwgPSBmYWxzZTtcblx0cmV0dXJuIHJlYWw7XG59XG5cdCJdfQ==
