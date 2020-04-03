var registryUri;
var registry = [];

var hdr = new Headers();
hdr.append('pragma', 'no-cache');
hdr.append('cache-control', 'no-store');
// force preflight
var fetchopts = {
  headers: hdr
};

function init() {
  getRegistry();
}

function output(id, msg, append) {
  var elem = document.getElementById(id);
  if (elem) {
    var text = msg;
    if (append) {
      text = elem.innerHTML + text;
    }
    elem.innerHTML = text;
  }
}

function getRegistry() {
  var url = new URL(document.referrer);
  var engineInstanceUri = url.searchParams.get('engineinstanceURI');
  if (!engineInstanceUri) {
    engineInstanceUri = url.searchParams.get('engineInstanceURI');
  }
  // ICAS3: --rsiRegistryURI=http://[::1]:80
  registryUri = url.searchParams.get('rsiRegistryURI');
  if (!registryUri) {
    // default
    registryUri = 'http://127.0.0.1:443';
  }
  // target simulator trumps all
  var viwi_port = url.searchParams.get('VIWI_PORT');
  if (viwi_port) {
    registryUri = 'http://127.0.0.1:' + viwi_port;
  }
  log('using registry at ' + registryUri);
  output('status', 'look for registry at ' + registryUri, false);
  fetch(registryUri, fetchopts)
  .then(function(response) {
    return response.json();
  })
  .then(function(register) {
    output('status', ' ... SUCCESS', true);
    handleRegistry(register);
    return true;
  })
  .catch(function(err) {
    output('status', ' ... FAILED to fetch registry:<br>' + err, true);
  });
}

function handleRegistry(register) {
  if (register && register.status && register.status == 'ok' && register.data) {
    registry = register.data;
    checkRegistry(registry);
  } else {
    output('status', '<br>FAILED to read registry:<br>' +
            JSON.stringify(register, null, '  '), true);
  }
}

function checkRegistry(registry) {
  output('data', 'check registered services:<br>', false);
  checkService(registry, 0);
}

function getServiceOrigin(service) {
  return new Promise(function(resolve, reject) {
    log('getServiceOrigin', service.uri);
    fetch(registryUri + service.uri)
    .then(function(response) {
      if (!response.ok) {
        return reject({message: response.status + ' ' + response.statusText});
      }
      if (response.redirected) {
        // Chrome 60+x
        log('getServiceOrigin: redirected to', response.url);
        service.origin = response.url;
      } else if (response.type == "cors" && response.url != registryUri + service.uri) {
        // Chrome 51
        log('getServiceOrigin: url changed to', response.url, '(assuming redirect)');
        service.origin = response.url;
      } else {
        service.origin = registryUri + service.uri;
      }
      log('getServiceOrigin: resulting origin ' + service.origin);
      resolve(service);
    })
    .catch(function(err) {
      log('getServiceOrigin: ERROR', err.message);
      reject(err);
    })
  });
}

function checkService(registry, index) {
  var service = registry[index];
  var next = index+1;
  log('checkService', service.name + '...');
  output('status', 'check ' + service.name, false);
  getServiceOrigin(registry[index])
  .then(function(service) {
    log('checkService', service.origin);
    return fetch(service.origin, fetchopts);
  })
  .then(function(response) {
    if (response.ok) {
      return response.json();
    } else {
      var status = response.status + ' ' + response.statusText;
      log('response.status:', response.status, response.statusText);
      if (response.status == 0) {
        log('response.type', response.type);
        response.headers.forEach(function(val, key) { console.log(key + ' -> ' + val); });
        var result = {
          status: 'nok',
          data: response.status + ' ' + response.statusText
        };
      } else if (response.status == 300) {
        // Multiple Choices
        /*
        300:
        {
          "data":
            [
              {
                "description":"The content delivery network is ... consumption un-sacrificed.",
                "hostAddress":"http:\/\/127.0.0.1:49206\/cdn\/"
              },
              {
                "description":"",
                "hostAddress":"http:\/\/127.0.0.1:29734\/cdn\/"
              },
              {
                "description":"This is the placeholder for the readable description of the service.",
                "hostAddress":"http:\/\/127.0.0.1:1337\/cdn\/",
                "versions":"[\"1.1.4\"]"
              }
            ],
          "status":"ok",
          "timestamp":175930
        }
        */
        var result = {
          status: 'nok',
          data: response.status + ' ' + response.statusText + ' - not tested'
        };
      } else {
        var result = {
          status: 'nok',
          data: response.status + ' ' + response.statusText
        };
      }
      return result;
    }
  })
  .then(function(resources) {
    if (resources && resources.status && resources.status == 'ok' && resources.data) {
      var pass = '<div class="green left">PASS</div>';
      output('data', pass + service.name + ' @ port=' + service.port + ' uri=' + service.uri + '<br>', true);
    } else {
      var fail = '<div class="orange left">FAIL</div>';
      output('data', fail + service.name + ' @ port=' + service.port + ' uri=' + service.uri + ' status: ' + resources.data + '<br>', true);
    }
    nextiter(registry, next);
    return true;
  })
  .catch(function(err) {
    log(err.message);
    var fail = '<div class="orange left">FAIL</div>';
    output('data', fail + service.name + ': ' + err.message + '<br>', true);
    nextiter(registry, next);
  });
}

function nextiter(registry, next) {
  if (next < registry.length) {
    setTimeout(function() {
      checkService(registry, next);
    });
  } else {
    output('status', 'DONE', false);
    // workaround for window height 768px bug:
    if (window.innerHeight > 620) {
      var lines = (window.innerHeight - 620) / 19;
      for (var i=0; i<=lines; i++) {
        output('data', '.<br>', true);
      }
    }
  }
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
  var today = new Date().toISOString().slice(11, 23);
  var now =  '[' + today + ']';
  var msg = {
    source: 'enginetest',
    severity: 5,
    timestamp: now,
    message: args.join(' ')
  };
  console.log(JSON.stringify(msg));
}
