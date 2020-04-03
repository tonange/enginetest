
describe("check server", function() {

	// https://davidwalsh.name/query-string-javascript
	var urlParams = new URLSearchParams(window.location.search);
	//console.log(urlParams.has('all'));

	var srv = 'http://127.0.0.1:48710/api/';
	console.log('srv', srv);

	it("tries if the server responds", function(done) {
		var callback = {
				success: function(data) {
					console.log('data', data);
					expect(data).toBeDefined();
					done();
				},
				error: function(data) {
					done.fail('GET failed');
				}
		};
		console.log('fetch', 'version');
		fetch(srv + 'version').then(callback.success, callback.error);
	});

	if (!urlParams.has('first')) {

		it("checks if keep-alive works", function(done) {
			var port1 = 0;
			var port2 = 1;
			var id1 = '';
			var id2 = '';
			var callback = {
					success: function() {
						expect(id1).not.toEqual(id2);
						expect(port1).toEqual(port2);
						done();
					},
					error: function(data) {
						done.fail('GET failed');
					}
			};
			fetch(srv + 'state')
			.then(function(response) { return response.json(); })
			.then(function(state) {
				id1 = state.id;
				port1 = state.remotePort;
				console.log('id1', id1, 'port1', port1);
				return 5000;
			})
			.then(waitabit)
			.then(function() {
				return fetch(srv + 'state');
			})
			.then(function(response) { return response.json(); })
			.then(function(state) {
				id2 = state.id;
				port2 = state.remotePort;
				console.log('id2', id2, 'port2', port2);
				return true;
			})
			.then(callback.success, callback.error);
		}, 10000); // timeout 10s

	}

});

/*
	usage:

	.then(function() {
		//...
		return 1000; // ms
	})
	.then(waitabit)
*/
function waitabit(milli) {
	return new Promise(function(resolve) {
		console.log('wait ', milli+'ms...');
		setTimeout(resolve, milli);
	});
}
