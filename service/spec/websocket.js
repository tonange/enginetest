/**
 *
 *    websocket test using secure websocket echo server (wss:)
 *
 **/

var WebSocketClient = require('websocket').client;

var srv = 'wss://modappsws.goip.de/';


describe("Interaction with remote wss server test", function() {

  it("connects to a secure websocket server checks its echo function", function(done) {
    var number = Math.round(Math.random() * 0xFFFFFF).toString();
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
          expect(data.type).toEqual('utf8');
          expect(data.utf8Data).toEqual(number);
					done();
				},
				error: function(data) {
					done.fail('wss client test failed: ' + data);
				}
		};

    var client = new WebSocketClient();
    client.on('connectFailed', function(error) {
        callback.error('Connect Error: ' + error.toString());
    });

    client.on('connect', function(connection) {
      console.log('wss client test: WebSocket Client Connected to', srv);
      console.log('wss client test: send', number);
      connection.sendUTF(number);
      connection.on('error', function(error) {
          callback.error("Connection Error: " + error.toString());
      });
      connection.on('close', function() {
        console.log('wss client test: Connection Closed');
      });
      connection.on('message', function(message) {
        console.log('wss client test: received', message);
        callback.success(message);
      });
    });
    client.connect(srv);
  });

});
