/**
 * 		helper functions for the test cases
 */

/**
 * 		taken from MDN tutorial
 * 		
 * 		Example using XMLHttpRequest
 *			Creating a Promise
 * 		
 * 		https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#Example_using_new_XMLHttpRequest%28%29
 */

// A-> $http function is implemented in order to follow the standard Adapter pattern
function $http(url, token){
 
  // A small example of object
  var core = {

    // Method that performs the ajax request
    ajax: function (method, url, token, args) {

      // Creating a promise
      var promise = new Promise( function (resolve, reject) {

      var params = '';	  
      if (args && (method === 'POST' || method === 'PUT')) {
          var argcount = 0;
          for (var key in args) {
            if (args.hasOwnProperty(key)) {
              if (argcount++) {
                params += '&';
              }
              params += encodeURIComponent(key) + '=' + encodeURIComponent(args[key]);
            }
          }
        }

        // Instantiates the XMLHttpRequest
        var client = new XMLHttpRequest();
        var uri = url;

        log('helper ' + method + ' ' + url);

        client.open(method, uri);
        
        if (token) {
        	client.setRequestHeader('Authorization', 'Bearer ' + token);        	
        }
        
        if (args && (method === 'POST' || method === 'PUT')) {
        	client.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            client.send(params);
        } else {
            client.send();        	
        }

        client.onload = function () {
          log('helper status ' + this.status + ' ' + this.statusText);
          if (this.status >= 200 && this.status < 300) {
            // Performs the function "resolve" when this.status is equal to 2xx
            resolve(this.response);
          } else {
            // Performs the function "reject" when this.status is different than 2xx
            reject(this.statusText);
          }
        };
        client.onerror = function (err) {
          log('helper error ' + err.message);
          reject(err.message);
        };
      });

      // Return the promise
      return promise;
    }
  };

  // Adapter pattern
  return {
    'get': function(args) {
      return core.ajax('GET', url, token, args);
    },
    'post': function(args) {
      return core.ajax('POST', url, token, args);
    },
    'put': function(args) {
      return core.ajax('PUT', url, token, args);
    },
    'delete': function(args) {
      return core.ajax('DELETE', url, token, args);
    }
  };
};
// End A

function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
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
    source: 'enginetest.testhttp',
    severity: 5,
    message: args.join(' ')
  };
  console.log(JSON.stringify(msg));
}
