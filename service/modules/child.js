const async = require('async-kit');
const Console = require('console').Console;


const logname = 'enginetest.modular.child';



var appcons = new Console(process.stderr, process.stderr);


// ToDo: move all log stiuff to an own module and just require it

/**
	3       Error: error conditions
	4       Warning: warning conditions
	5       Notice: normal but significant condition
	6       Informational: informational messages
	7       Debug: debug-level messages
 **/
const ERROR  = 3;
const WARN   = 4;
const NOTICE = 5;
const INFO   = 6;
const DEBUG  = 7;



process.on('message', (msg) => {
  if (msg.type == 'message') {
    log(NOTICE, 'Message from parent:', msg.text);
  } else if (msg.type == 'command' && msg.action == 'shutdown') {
    log(NOTICE, 'Command from parent:', msg.action);
    cancelInterval(loop);
    process.send({ type: 'status', value: 'exit' });
  }
});

var counter = 0;

var loop = setInterval(() => {
  process.send({ type: 'message', text: 'heap ' + heapsize() + ' MB' });
}, 1000);

function heapsize() {
  var heap = process.memoryUsage().heapUsed / 1000000;
  return Math.round( heap * 10) / 10;
}


///////////////////////////////////////////////////////////
// graceful shutdown

function exitHandler() {
	async.exit(5, 1000);
}

// app is closing
process.on('exit', exitHandler.bind());
// catches ctrl+c event
process.on('SIGINT', exitHandler.bind());
// catches kill
process.on('SIGTERM', exitHandler.bind());

process.on('asyncExit' , function( code , timeout, callback) {
	log(NOTICE, 'child', 'asyncExit');
  callback();
});


////////////////////////////////////////////////////////////////////////////////
// helpers

function log() {
  var args = Array.prototype.slice.call(arguments);
	var level = args[0];
  for (var i=1; i<args.length; i++) {
    try {
      args[i] = JSON.stringify(args[i]);
    } catch(err) {
      args[i] = args[i].toString();
    }
  }
  var msg = {
    source: logname,
    severity: level,
		timestamp: formatNow(),
    message: args.slice(1).join(' ')
  };
  appcons.log(JSON.stringify(msg));
}

function formatNow() {
	var today = new Date().toISOString().slice(11, 23);
	var res =  '[' + today + ']';
	return res;
}
