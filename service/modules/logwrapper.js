/**

	Log wrapper module for node apps
	================================

	preconditions:

		requires bunyan

	usage:

		var miblog = require('./modules/logwrapper.js');

		var log = new miblog({ source: 'myappsourcename' });

		log.info('hi on info');

	description:

		The log wrapper writes log records as JSON objects and adds the required
		properties source and severity so that the log records are accepted by
		the system's log processor.

		The log wrapper is based on bunyan (https://github.com/trentm/node-bunyan).
		So all features of bunyan are available from a log wrapper instance.

	API:

		use the log wrapper

			var miblog = require('./modules/logwrapper.js');

		create a logger instance

			var log = new miblog({source: 'mysource'});

				parameters

					source - string to be added to each log record as property "source"

		output log records

			log.error(text);
			log.warn(text);
			log.info(text);
			log.debug(text);
			log.trace(text);

				parameters

					text	- can be a string or an object, objects will strigified

**/

var bunyan = require('bunyan');

var rawlog = bunyan.createLogger({
	name: 'nodeapp'
, stream: process.stderr
, level: 'trace'
});

function MIBLog(options) {
  this.log = rawlog.child({source: options.source});
}
MIBLog.prototype.error = function (msg) {
	var today = new Date().toISOString().slice(11, 23);
	var now =  '[' + today + ']';
  this.log.error({severity: 3, timestamp: now, message: msg});
}
MIBLog.prototype.warn = function (msg) {
	var today = new Date().toISOString().slice(11, 23);
	var now =  '[' + today + ']';
  this.log.warn({severity: 4, timestamp: now, message: msg});
}
MIBLog.prototype.info = function (msg) {
	var today = new Date().toISOString().slice(11, 23);
	var now =  '[' + today + ']';
  this.log.info({severity: 5, timestamp: now, message: msg});
}
MIBLog.prototype.debug = function (msg) {
	var today = new Date().toISOString().slice(11, 23);
	var now =  '[' + today + ']';
  this.log.debug({severity: 6, timestamp: now, message: msg});
}
MIBLog.prototype.trace = function (msg) {
	var today = new Date().toISOString().slice(11, 23);
	var now =  '[' + today + ']';
  this.log.trace({severity: 7, timestamp: now, message: msg});
}


module.exports = MIBLog;
