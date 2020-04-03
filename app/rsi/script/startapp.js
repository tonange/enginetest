

const webappname = 'enginetest';
const entrypointid = 'enginetestRSItest';

const baseport = 48730;
const basename = 'etest';

const maxinstances = 8;


var url = new URL(document.referrer);
var engineInstanceUri = url.searchParams.get('engineinstanceURI');
if (!engineInstanceUri) {
  engineInstanceUri = url.searchParams.get('engineInstanceURI');
}
// ICAS3: --rsiRegistryURI=http://[::1]:80
var registryuri = url.searchParams.get('rsiRegistryURI');
if (!registryuri) {
  // default
  registryuri = 'http://127.0.0.1:443';
}
// target simulator trumps all
var viwi_port = url.searchParams.get('VIWI_PORT');
if (viwi_port) {
  registryuri = 'http://127.0.0.1:' + viwi_port;
}
log('using registry at ' + registryuri);


var registryurl = new URL(registryuri);
var baseuri = registryurl.protocol + '//' + registryurl.hostname;
var registryport = registryurl.port;


var instances = {};
var out;
var showresult;


////////////////////////////////////////////////////////////////////////////////
// api

function startappinit(statusfunc, resultfunc) {
  log('JS engine instances', 'init');
  out = statusfunc;
  showresult = resultfunc;
  setInterval(testloop, 1000);
};

function start(nr, load) {
  log('JS engine instances', 'start', nr);
  // already started?
  if (instances[nr]) {
    log('instance', nr, 'already stated');
    return;
  }
  var transaction = {
    baseuri: baseuri,
    registryuri: registryuri,
    webappname: webappname,
    entrypointid: entrypointid,
    index: nr,
    load: load
  };
  getWebappmanagement(transaction)
  .then(getWebapp)
  .then(function(transaction) {
    log('start', 'found webapp');
    out(transaction.index, 'found webapp');
    var entrypoints = transaction.webapp.entrypoints;
    for (var i=0; i<entrypoints.length; i++) {
      if (entrypoints[i].entrypointID == transaction.entrypointid) {
        transaction.entrypoint = entrypoints[i];
        out(transaction.index, 'found entrypoint');
        return transaction;
      }
    }
    throw new Error('entrypoint '+ transaction.entrypointid
                      + ' not found in webapp ' + transaction.webappname);
  })
  .then(startEntrypoint)
  .then(getInstance)
  .then(function(transaction) {
    var loadinfo = '';
    if (transaction.load) {
      loadinfo = ' , 1 core CPU load ' + transaction.load + '%';
    }
    log('created instance', transaction.instance);
    out(transaction.index, 'created instance' + loadinfo);
    showresult(transaction.index, '?');
    instances[transaction.index] = {
      engineInstance: transaction.instance,
      index: transaction.index
    };
    return transaction;
  })
  .catch(function(err) {
    log('start', 'error', err);
    out(transaction.index, err);
  });
}

function stop(nr) {
  log('JS engine instances', 'stop', nr);
  // started?
  if (!instances[nr]) {
    log('instance', nr, 'not stated');
    return;
  }
  var transaction = {
    baseuri : baseuri,
    registryuri: registryuri,
    instance: instances[nr].engineInstance,
    index: nr
  };
  getWebappmanagement(transaction)
  .then(stopEngineInstance)
  // give it a sec..
  .then(x => new Promise(resolve => setTimeout(() => resolve(x), 1000)))
  .then(deleteEngineInstance)
  .then(function(transaction) {
    out(transaction.index, 'instance deleted');
    delete instances[transaction.index];
    showresult(transaction.index, '-');
    return transaction;
  })
  .catch(function(err) {
    log('stop', 'error', err.message);
  });
}


////////////////////////////////////////////////////////////////////////////////
// promises

function getWebappmanagement(transaction) {
  return new Promise(function(resolve, reject) {
    if (transaction.webappmanagement) {
      return resolve(transaction);
    }
    // get webappmanagement
    fetch(transaction.registryuri + '/?name=webappmanagement')
    .then(function (response) {
      if (response.status != 200) {
        reject('status not 200 but ' + response.status);
      }
      return response.json();
    })
    .then(function(response) {
      if (response && response.status && response.status == 'ok'
                   && response.data && response.data.length > 0) {
        transaction.webappmanagement = response.data[0];
        resolve(transaction);
      } else {
        reject('did not get webappmanagement from registry: ' + response);
      }
    })
  });
}

function getWebapp(transaction) {
  return new Promise(function(resolve, reject) {
    log('getWebapp', transaction.webappname, transaction.entrypointName);
    var uri = transaction.baseuri 
              + transaction.webappmanagement.port + transaction.webappmanagement.uri
              + 'webapps/?serviceid=' + transaction.webappname
              + '&$expand=1';
    fetch(uri)
    .then(function (response) {
      if (response.status != 200) {
        reject('status not 200 but ' + response.status);
      }
      return response.json();
    })
    .then(function(response) {
      if (response && response.status && response.status == 'ok'
                   && response.data && response.data.length > 0) {
        transaction.webapp = response.data[0];
        resolve(transaction);
      } else {
        reject('app ' + transaction.webappname +' not found in webappmanagement/webapps');
      }
    })
    .catch(err => reject(err.message));
  });
}

var counter = 100;
function startEntrypoint(transaction) {
  return new Promise(function(resolve, reject) {
    log('startEntrypoint', transaction.entrypoint.entrypointID);
    var port = baseport + transaction.index;
    var name = basename + transaction.index;
    var instance = {
      name:         'teststart' + (counter++),
      arguments:    'name=' + name + '&port=' + port,
      engineID:     'background',
      runState:     'startRequested',
      hmiHandleNHTSA: true,
      entrypoint:   transaction.entrypoint.uri
    };
    if (transaction.load) {
      instance.arguments += '&load=' + transaction.load;
    }
    transaction.instancename = instance.name;
    // POST instance
    var uri = transaction.baseuri
              + transaction.webappmanagement.port + transaction.webappmanagement.uri
              + 'engineInstances';
    fetch(uri, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(instance)
    })
    .then(function (response) {
      if (response.status != 201) {
        reject('status not 201 but ' + response.status);
      }
      var location = response.headers.get('location');
      if (location === null) {
        reject('No header Access-Control-Expose-Header in response!');
      }
      log('location:', location);
      // understands '.' separated, relative and absolute uris:
      var elements = location.replace('.', '/').split('/');
      var id = elements.pop();      
      transaction.instanceId = id;
      log('instanceId:', transaction.instanceId);
      resolve(transaction);
    })
    .catch (function(error) {
      reject('startEntrypoint request failed ' + error.message);
    });
  });
}

function getInstance(transaction) {
  return new Promise(function(resolve, reject) {
    log('getInstance', transaction.instanceId);
    var uri = transaction.baseuri 
              + transaction.webappmanagement.port + transaction.webappmanagement.uri
              + 'engineInstances/' + transaction.instanceId;
    fetch(uri)
    .then(function (response) {
      if (response.status != 200) {
        reject('status not 200 but ' + response.status);
      }
      return response.json();
    })
    .then(function (result) {
      if (result && result.status && result.status == 'ok'
                 && result.data) {
        transaction.instance =  result.data;
        resolve(transaction);
      } else {
        reject('could not retrieve created engine instance');
      }
      resolve(transaction);
    })
    .catch(function(error) {
      reject('getInstance request failed ' + error.message);
    });
  });
}


// FixMe: it is unclear whether a DELETE (or settimg runState to stopped) 
//        will cause webappmanagement to really stop the background process

function stopEngineInstance(transaction) {
  return new Promise(function(resolve, reject) {
    // set runState of instance to stopped
    if (transaction.instance.uri.startsWith('http')) {
      var uri = transaction.instance.uri;
    } else {
      var uri = transaction.baseuri + transaction.webappmanagement.port + transaction.instance.uri;
    }
    var body = {
      runState: 'suspendRequested'
    };
    fetch(uri, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    .then(function (response) {
      return response.json();
    })
    .then(function (result) {
      log('stopEngineInstance', 'response', result);
      resolve(transaction);
    })
    .catch (function (error) {
      reject('stopEngineInstance request failed ' + error.message);
    });
  });
}

function deleteEngineInstance(transaction) {
  return new Promise(function(resolve, reject) {
    // DELETE instance
    if (transaction.instance.uri.startsWith('http')) {
      var uri = transaction.instance.uri;
    } else {
      var uri = transaction.baseuri + transaction.webappmanagement.port + transaction.instance.uri;
    }
    fetch(uri, {
      method: 'delete'
    })
    .then(function (response) {
      return response.json();
    })
    .then(function (result) {
      log('deleteEngineInstance', 'response', result);
      resolve(transaction);
    })
    .catch (function (error) {
      reject('deleteEngineInstance request failed ' + error.message);
    });
  });
}


////////////////////////////////////////////////////////////////////////////////
// test loop


function testloop() {
  for (i in instances) {
    var instance = instances[i];
    var port = baseport + instance.index;
    var uri = 'http://127.0.0.1:' + port + '/';
    runtest(uri, instance.index);
  }
}

function runtest(uri, index) {
  fetch(uri)
  .then(function (response) {
    if (response.status != 200) {
      throw new Error('status not 200 but ' + response.status);
    } else {
      showresult(index, 'Ok');
    }
    return true;
  })
  .catch(function(error) {
    showresult(index, error.message);
  });
}

////////////////////////////////////////////////////////////////////////////////
// helpers

// check if we run on the target or in a dev env
function realDeal() {
  var real = true;
  if (navigator.platform.substring(0, 3) == 'Mac') real = false;
  if (navigator.platform.substring(0, 3) == 'Win') real = false;
  //console.log('real deal?', real);
  return real;
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
