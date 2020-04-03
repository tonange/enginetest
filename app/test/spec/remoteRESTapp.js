/**
 *    REST test cases using remotely running demo server beerlocker_server
 */

describe("Interaction with remote REST service test", function() {

	var srv = 'http://' + remote.host;
	var path = '/api/beers';

	// unique key for each test run
	var key = makeid(6);

	var id1 = 'unknown';
	var id2 = 'unknown';

	it("requests the beer list with GET", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
					done();
				},
				error: function(data) {
					done.fail('XHR GET failed');
				}
		};
		$http(srv+path+'/'+key, remote.token)
		  .get()
		  .then(callback.success, callback.error);
	});

	it("adds a beer to the list with POST", function(done) {
		var payload = {
				'name' : 'Malzbier',
				'type' : 'Malz',
				'quantity' : 6
			};
		var callback = {
				success: function(data) {
					// pass id
					id1 = checkBeer(data, payload);
					done();
				},
				error: function(data) {
					done.fail('XHR POST failed');
				}
		};
		$http(srv+path+'/'+key, remote.token)
		  .post(payload)
		  .then(callback.success, callback.error);
	});

	it("looks for the added beer with GET", function(done) {
		var callback = {
				success: function(data) {
					checkBeer(data, {name:"Malzbier",type:"Malz",quantity:6});
					done();
				},
				error: function(data) {
					done.fail('XHR GET failed');
				}
		};
		$http(srv+path+'/'+key + '/' + id1, remote.token)
		  .get()
		  .then(callback.success, callback.error);
	});

	it("tries to look for a non existent beer with GET", function(done) {
		var callback = {
				success: function(data) {
					done.fail('XHR GET should have failed');
				},
				error: function(data) {
					expect(data).toMatch("Not Found");
					done();
				}
		};
		$http(srv+path+'/'+key + '/gibtsnicht', remote.token)
		  .get()
		  .then(callback.success, callback.error);
	});


	it("updates a quantity with PUT", function(done) {
		var payload = {
				quantity : 5
			};
		var callback = {
				success: function(data) {
					// pass id
					id1 = checkBeer(data, {name:"Malzbier",type:"Malz",quantity:5});
					done();
				},
				error: function(data) {
					done.fail('XHR PUT failed');
				}
		};
		$http(srv+path+'/'+key + '/' + id1, remote.token)
		  .put(payload)
		  .then(callback.success, callback.error);
	});

	it("adds more beer with POST", function(done) {
		var payload = {
				name : 'Maibock',
				type : 'Bock',
				quantity : 12
			};
		var callback = {
				success: function(data) {
					// pass id
					id2 = checkBeer(data, payload);
					done();
				},
				error: function(data) {
					done.fail('XHR POST failed');
				}
		};
		$http(srv+path+'/'+key, remote.token)
		  .post(payload)
		  .then(callback.success, callback.error);
	});

	it("gets the updated beer list with GET", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
					expect(data).toMatch(id1);
					expect(data).toMatch(id2);
					done();
				},
				error: function(data) {
					done.fail('XHR GET failed');
				}
		};
		$http(srv+path+'/'+key, remote.token)
		  .get()
		  .then(callback.success, callback.error);
	});

	it("deletes a beer with DELETE", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBe('OK');
					done();
				},
				error: function(data) {
					done.fail('XHR DELETE failed');
				}
		};
		$http(srv+path+'/'+key + '/' + id1, remote.token)
		  .delete()
		  .then(callback.success, callback.error);
	});

	it("gets the updated beer list with GET", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
					expect(data).not.toMatch(id1);
					expect(data).toMatch(id2);
					done();
				},
				error: function(data) {
					done.fail('XHR GET failed');
				}
		};
		$http(srv+path+'/'+key, remote.token)
		  .get()
		  .then(callback.success, callback.error);
	});

	it("deletes a beer with DELETE", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBe('OK');
					done();
				},
				error: function(data) {
					done.fail('XHR DELETE failed');
				}
		};
		$http(srv+path+'/'+key + '/' + id2, remote.token)
		  .delete()
		  .then(callback.success, callback.error);
	});

	it("gets the updated beer list with GET", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
					expect(data).not.toMatch(id1);
					expect(data).not.toMatch(id2);
					done();
				},
				error: function(data) {
					done.fail('XHR GET failed');
				}
		};
		$http(srv+path+'/'+key, remote.token)
		  .get()
		  .then(callback.success, callback.error);
	});

});

function checkBeer(beerstr, beer) {
	var result;
	expect(beerstr).toBeDefined();
	expect (function() {
		result = JSON.parse(beerstr);
	}).not.toThrow();
	if( Object.prototype.toString.call( result ) === '[object Array]' ) {
		result = result[0];
	}
	expect(result).toBeDefined();
	expect(result.name).toEqual(beer.name);
	expect(result.type).toEqual(beer.type);
	expect(result.quantity).toEqual(beer.quantity);
	// pass id
	if (result._id) {
		return result._id;
	}
	return undefined;
}
