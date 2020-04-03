/**
 *
 *    http2 test
 *
 **/


var http2 = require('http2');

var host = 'modapps.goip.de';
var port = 443;


describe("Testing HTTP2 client functionality", function() {

  it("gets data from a http2 server on the internet", function(done) {
		var callback = {
				success: function(res) {
          expect(res.statusCode).toEqual(200);
          expect(res.httpVersion).toEqual('2.0');
          expect(res.body).toBeDefined();
          expect(res.body).toMatch(/PASSED/);
					done();
				},
				error: function(data) {
					done.fail('http2 client GET failed: ' + data);
				}
		};
    var options = {
      host : host,
      port : 443,
      path : '/',
      method : 'GET'
    };
    //do the GET call
    var req = http2.request(options, function(res) {
      if (res.statusCode != 200) {
        callback.error(res.statusCode);
      }
      var body = [];
      res.on('data', function(chunk) {
        body.push(chunk);
      }).on('end', function() {
        res.body = Buffer.concat(body).toString();
        callback.success(res);
      });
    });
    req.end();
    req.on('error', function(e) {
        callback.console.error(e.message);
    });
  });

});
