/**
 *    REST test cases using remotely running demo server beerlocker_server
 */

const fetch = require('node-fetch');

var remote =
{
   "host" : "service.modpush.eu:23123"
 , "token" : "aS9ZzmhCXNOVWJ696kH6YKJQ6B7WPLggskqcLRDeuDl2FM0Ab2xiHE8PRdGVllIBuSYKB2RNlSNtTTTTyhoB2kH2RWTHJU1t8j7jDCT74eB7OW3mWp5vK6LCWOMgcb5tXkGB4xzHgfrpGKgW8ew4ElpR7AR8MQKemwpb1jsIlPmTMsuNDYoDxdZIit5a2NCNJ5D7JRGrApe4WWobA8yI8zinLEwyIiQ5CaI7OaB0s084bvD88FZx7oW4JEe4qQSr"
};


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
					done.fail('GET failed');
				}
		};
		fetch(srv+path+'/'+key, {
			method: 'GET',
			headers: { 'Authorization': 'Bearer ' + remote.token }
		})
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
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
					done.fail('POST failed');
				}
		};
		fetch(srv+path+'/'+key, {
			method: 'POST',
			body : JSON.stringify(payload),
			headers: {
				'Authorization': 'Bearer ' + remote.token,
				'Content-Type': 'application/json'
			}
		})
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
	});

	it("looks for the added beer with GET", function(done) {
		var callback = {
				success: function(data) {
					checkBeer(data, {name:"Malzbier",type:"Malz",quantity:6});
					done();
				},
				error: function(data) {
					done.fail('GET failed');
				}
		};
		fetch(srv+path+'/'+key + '/' + id1, {
			method: 'GET',
			headers: {
				'Authorization': 'Bearer ' + remote.token
			}
		})
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
	});

	it("tries to look for a non existent beer with GET", function(done) {
		var callback = {
				success: function(data) {
					expect(data.status).toBe(404);
					done();
				},
				error: function(data) {
					done.fail('GET failed');
				}
		};
		fetch(srv+path+'/'+key + '/gibtsnicht', {
			method: 'GET',
			headers: {
				'Authorization': 'Bearer ' + remote.token
			}
		})
		.then(callback.success)
		.catch(callback.error);
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
					done.fail('PUT failed');
				}
		};
		fetch(srv+path+'/'+key + '/' + id1, {
			method: 'PUT',
			body : JSON.stringify(payload),
			headers: {
				'Authorization': 'Bearer ' + remote.token,
				'Content-Type': 'application/json'
			}
		})
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
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
					done.fail('POST failed');
				}
		};
		fetch(srv+path+'/'+key, {
			method: 'POST',
			body : JSON.stringify(payload),
			headers: {
				'Authorization': 'Bearer ' + remote.token,
				'Content-Type': 'application/json'
			}
		})
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
	});

	it("gets the updated beer list with GET", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
					expect(data).toContain(jasmine.objectContaining({
      				_id: id1
    			}));
					expect(data).toContain(jasmine.objectContaining({
      				_id: id2
    			}));
					done();
				},
				error: function(data) {
					done.fail('GET failed');
				}
		};
		fetch(srv+path+'/'+key, {
			method: 'GET',
			headers: { 'Authorization': 'Bearer ' + remote.token }
		})
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
	});

	it("deletes a beer with DELETE", function(done) {
		var callback = {
				success: function(data) {
					expect(data.status).toBe(200);
					done();
				},
				error: function(data) {
					done.fail('DELETE failed');
				}
		};
		fetch(srv+path+'/'+key + '/' + id1, {
			method: 'DELETE',
			headers: { 'Authorization': 'Bearer ' + remote.token }
		})
		.then(callback.success)
		.catch(callback.error);
	});

	it("gets the updated beer list with GET", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
					expect(data).not.toContain(jasmine.objectContaining({
							_id: id1
					}));
					expect(data).toContain(jasmine.objectContaining({
							_id: id2
					}));
					done();
				},
				error: function(data) {
					done.fail('GET failed');
				}
		};
		fetch(srv+path+'/'+key, {
			method: 'GET',
			headers: { 'Authorization': 'Bearer ' + remote.token }
		})
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
	});

	it("deletes a beer with DELETE", function(done) {
		var callback = {
				success: function(data) {
					expect(data.status).toBe(200);
					done();
				},
				error: function(data) {
					done.fail('DELETE failed');
				}
		};
		fetch(srv+path+'/'+key + '/' + id2, {
			method: 'DELETE',
			headers: { 'Authorization': 'Bearer ' + remote.token }
		})
		.then(callback.success)
		.catch(callback.error);
	});

	it("gets the updated beer list with GET", function(done) {
		var callback = {
				success: function(data) {
					expect(data).toBeDefined();
					expect(data).not.toContain(jasmine.objectContaining({
							_id: id1
					}));
					expect(data).not.toContain(jasmine.objectContaining({
							_id: id2
					}));
					done();
				},
				error: function(data) {
					done.fail('GET failed');
				}
		};
		fetch(srv+path+'/'+key, {
			method: 'GET',
			headers: { 'Authorization': 'Bearer ' + remote.token }
		})
		.then(function(res) {
			return res.json();
		})
		.then(callback.success)
		.catch(callback.error);
	});

});

function checkBeer(res, beer) {
	var result = res;
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

function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
