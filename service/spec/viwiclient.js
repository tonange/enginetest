/**
 *    viwi/RSI client test cases
 */

const fetch = require('node-fetch');

// test can only run in sequence because of globals:
var wamuri;

describe("Interaction with RSI services test", function() {

	var srv = 'http://127.0.0.1:443';

  it("requests the registry root", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
          expect(data.status).toBeDefined();
          expect(data.status).toEqual('ok');
          expect(data.data).toBeDefined();
          var services = data.data;
          expect(Array.isArray(services)).toBeTruthy();
					done();
				},
				error: function(data) {
					done.fail('GET failed');
				}
		};
		fetch(srv + '/')
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(function(err) {
			srv = 'http://[::1]:80';
			fetch(srv + '/')
			.then(function(res) {
				return res.json();
			})
			.then(callback.success)
			.catch(callback.error);
		});
	});

  it("gets the webappmanagement uri", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
          expect(data.status).toBeDefined();
          expect(data.status).toEqual('ok');
          expect(data.data).toBeDefined();
          var services = data.data;
          expect(Array.isArray(services)).toBeTruthy();
          expect(services.length).toBeGreaterThan(0);
          var wam = services[0];
          expect(wam.uri).toBeDefined;
          wamuri = wam.uri;
          if (!wamuri.startsWith('/')) {
            wamuri = '/' + wamuri;
          }
          if (!wamuri.endsWith('/')) {
            wamuri = wamuri + '/';
          }
					done();
				},
				error: function(data) {
					done.fail('GET failed');
				}
		};
		fetch(srv + '/?name=webappmanagement')
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
	});

  it("requests the list of installed webapps", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
          expect(data.status).toBeDefined();
          expect(data.status).toEqual('ok');
          expect(data.data).toBeDefined();
          var webapps = data.data;
          expect(Array.isArray(webapps)).toBeTruthy();
          expect(webapps.length).toBeGreaterThan(0);
          // contains enginetest entry
          /*
          [
            {
              id: '5b842bce-80a2-4ae5-9071-613a000bdf85',
              name: 'enginetest',
              uri: '/webappmanagement/webapps/5b842bce-80a2-4ae5-9071-613a000bdf85',
              availabilityState: 'executable',
              description: '',
              entrypoints: [ [Object], [Object], [Object] ],
              installjobs: [],
              namePhoneme: '',
              serviceid: 'enginetest',
              version: '0.2.0'
            },
            ...
          ]
          */
          expect(webapps).toContain(jasmine.objectContaining({
      				serviceid: 'enginetest'
    			}));
					done();
				},
				error: function(data) {
					done.fail('GET failed');
				}
		};
		fetch(srv + wamuri + 'webapps/')
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
	});

});
