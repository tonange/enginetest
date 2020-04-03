
/**
  get startet when loaded
**/
window.addEventListener('load', init, false);

var server = 'http://127.0.0.1:48710/api/';

var myLocation = window.location.origin + window.location.pathname;
var urlParams = new URLSearchParams(window.location.search);


// ToDo: add helpful trace output to console


const tests = {
  'expires'       : { result: 'not tested' },
  'etag'          : { result: 'not tested' },
  'last_modified' : { result: 'not tested' },
  'no_cache'      : { result: 'not tested' },
  'max_age'       : { result: 'not tested' }
};

const colors = {
  green: '#0f0',
  yellow: '#ff0',
  red: '#f00',
  white: '#fff',
  grey: '#888'
};

var testbox;

var w = document.documentElement.clientWidth
    || document.body.clientWidth;

var h = document.documentElement.clientHeight
    || document.body.clientHeight;


function goHome() {
  location.href = document.referrer;
}

function scale() {
  if (testbox) {
    testbox.style.width = (w - 20) + 'px';
    testbox.style.height = (h - 110) + 'px';
  }
}

function init() {
  testbox = document.getElementById('testbox');
  scale();

  // test
  if (testbox) {
    var msg = { type: 'ping' };
    testbox.contentWindow.postMessage(msg, '*');
    runTests();
  }
}

// preparation: push all tests into an array
// start recursion
function runTests() {
  var opentests = [];
  var single = urlParams.get('test');
  if (single) {
    opentests.push(single);
  } else {
    for (var test in tests) {
      opentests.push(test);
    }
  }
  var session = {
    opentests: opentests
  };
  runTest(session);
}

function singleTest(test) {
  document.location.href = myLocation + '?test=' + test;
}

// recursion:
// start a test (which removes itself from the array)
// when test resolves, recurse
// when array is empty, present result
function runTest(session) {
  if (session.opentests.length == 0) {
    // done
    showResult();
  } else {
    // start (next) test
    startTest(session)
    .then(function(session) {
      setTimeout(function() { runTest(session);});
      return session;
    })
    .catch(function(err) {
      info('runTest failed');
      comment('ERROR - runTest failed: ' + err, false);
    });
  }
}

function startTest(session) {
  return new Promise(function (resolve, reject) {
    session.test = session.opentests.splice(0,1)[0];
    info('start test: ' + session.test);
    setStatus('status_' + session.test, colors.yellow);
    session.resolve = resolve;
    session.reject = reject;
    switch (session.test) {
      case 'expires':
        testExpires(session);
        break;
      case 'etag':
        testEtag(session);
        break;
      case 'last_modified':
        testLastModified(session);
        break;
      case 'no_cache':
        testNoCache(session);
        break;
      case 'max_age':
        testMaxAge(session);
        break;
    }
  });
}

function waitForProbedata(session) {
  return new Promise(function(resolve, reject) {
    var watchdog = setTimeout(function() {
      info('waitForProbedata', 'watchdog bites');
      testbox.dispatchEvent(new Event('probedata'));
    }, 5000);
    testbox.addEventListener('probedata', function (e) {
        clearTimeout(watchdog);
        if (e.detail) {
          session.probedata = e.detail;
          resolve(session);
        } else {
          reject('waitForProbedata timed out');
        }
      }, {once: true});
  });
}

function testExpires(session) {
  comment('test ' + session.test, false);
  tests[session.test].result = '';

  // start watchdog timeout
  var watchdog = setTimeout(function() {
    info('testExpires watchdog bites');
    session.reject('test case watchdog timeout');
  }, 60000);

  // test sequence
  // fetch reset to clear all
  fetch(server + 'reset')
  .then(function(response) {
    return response.json();
  })
  // load expires
  .then(function(data) {
    comment(', 1st load', true);
    loadIframe('testbox', server + 'expires');
    return session;
  })
  .then(waitForProbedata)
  // on message event save id
  .then(function(session) {
    session.firstParams = session.probedata.params;
    // wait 1 sec
    comment(', wait 1s', true);
    session.delay = 1000;
    return session;
  })
  .then(waitabit)
  // load expires
  .then(function(data) {
    comment(', 2nd load', true);
    loadIframe('testbox', server + 'expires');
    return session;
  })
  .then(waitForProbedata)
  // on message event get id and expires date
  .then(function(session) {
    session.secondParams = session.probedata.params;
    // must be from cache (same id)
    if (session.secondParams.id != session.firstParams.id) {
      tests[session.test].result = 'FAILED: 2nd GET should have come from cache';
      throw 'FAILED: 2nd GET should have come from cache';
    }
    // wait beyond expires data
    var delay = session.firstParams.expireTime + 1;
    comment(', wait ' + delay + 's', true);
    session.delay = delay * 1000;
    return session;
  })
  .then(waitabit)
  // load expires
  .then(function(data) {
    comment(', 3rd load', true);
    loadIframe('testbox', server + 'expires');
    return session;
  })
  .then(waitForProbedata)
  // on message event get id
  .then(function(session) {
    session.thirdParams = session.probedata.params;
    // must be fresh different id
    if (session.thirdParams.id == session.secondParams.id) {
      tests[session.test].result = 'FAILED: 3rd GET should have fetched a fresh vesion';
      throw 'FAILED: 3rd GET should have fetched a fresh vesion';
    }
    return session;
  })
  .then (function(session) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.green);
    tests[session.test].result = 'PASSED';
    info(session.test + ': PASSED');
    return session.resolve(session);
  })
  .catch(function(err) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.red);
    info(session.test + ': ' + tests[session.test].result);
    tests[session.test].result = tests[session.test].result;
    session.resolve(session);
  });
}

function testEtag(session) {
  comment('test ' + session.test, false);
  tests[session.test].result = '';

  // start watchdog timeout
  var watchdog = setTimeout(function() {
    info('testEtag watchdog bites');
    session.reject('test case watchdog timeout');
  }, 60000);

  // test sequence
  // fetch reset to clear etag
  fetch(server + 'reset')
  .then(function(response) {
    return response.json();
  })
  // load etag
  .then(function(data) {
    comment(', 1st load', true);
    loadIframe('testbox', server + 'etag');
    return session;
  })
  .then(waitForProbedata)
  // on message event save max-age, id and etag
  .then(function(session) {
    session.firstParams = session.probedata.params;
    // wait 1 sec
    comment(', wait 1s', true);
    session.delay = 1000;
    return session;
  })
  .then(waitabit)
  // load etag
  .then(function(data) {
    comment(', 2nd load', true);
    loadIframe('testbox', server + 'etag');
    return session;
  })
  .then(waitForProbedata)
  // on message event compare id (equal)
  .then(function(session) {
    session.secondParams = session.probedata.params;
    if (session.secondParams.id != session.firstParams.id) {
      tests[session.test].result = 'FAILED: 2nd GET should have come from cache';
      throw 'FAILED: 2nd GET should have come from cache';
    }
    return session;
  })
  // fetch state
  .then(function(session) {
    return fetch(server + 'state');
  })
  .then(function(response) {
    return response.json();
  })
  // check lastStatus is not 304
  .then(function(data) {
    if (data.lastStatus == 304) {
      tests[session.test].result = 'FAILED: 2nd GET should have come from cache without if-none-match/not modfied detour';
      throw 'FAILED: 2nd GET should have come from cache without if-none-match/not modfied detour';
    }
    // wait beyond max-age
    var delaySec = session.secondParams.maxAge + 1;
    comment(', wait ' + delaySec + 's', true);
    session.delay = delaySec * 1000;
    return session;
  })
  .then(waitabit)
  // load etag
  .then(function(session) {
    comment(', 3rd load', true);
    loadIframe('testbox', server + 'etag');
    return session;
  })
  .then(waitForProbedata)
  // on message event compare id (equal)
  .then(function(session) {
    session.thirdParams = session.probedata.params;
    if (session.thirdParams.id != session.secondParams.id) {
      tests[session.test].result = 'FAILED: 3rd GET should have come from cache';
      throw 'FAILED: 3rd GET should have come from cache';
    }
    return session;
  })
  // fetch state
  .then(function(session) {
    return fetch(server + 'state');
  })
  .then(function(response) {
    return response.json();
  })
  // check lastStatus is 304
  .then(function(data) {
    if (data.lastStatus != 304) {
      tests[session.test].result = 'FAILED: 3rd GET should have caused a if-none-match/not modfied sequence';
      throw 'FAILED: 3rd GET should have caused a if-none-match/not modfied sequence';
    }
    // wait beyond max-age
    var delaySec = session.secondParams.maxAge + 1;
    comment(', wait ' + delaySec + 's', true);
    session.delay = delaySec * 1000;
    return session;
  })
  .then(waitabit)
  // fetch reset
  .then(function(session) {
    return fetch(server + 'reset');
  })
  // load etag
  .then(function(data) {
    comment(', 4th load', true);
    loadIframe('testbox', server + 'etag');
    return session;
  })
  .then(waitForProbedata)
  // on message event compare id and etag (different)
  .then(function(session) {
    session.fourthParams = session.probedata.params;
    if (   session.fourthParams.id   == session.thirdParams.id
        || session.fourthParams.etag == session.thirdParams.etag) {
      tests[session.test].result = 'FAILED: 4th GET should have fetched a fresh vesion';
      throw 'FAILED: 4th GET should have fetched a fresh vesion';
    }
    // wait beyond max-age
    var delaySec = session.secondParams.maxAge + 1;
    comment(', wait ' + delaySec + 's', true);
    session.delay = delaySec * 1000;
    return session;
  })
  .then(waitabit)
  .then (function(session) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.green);
    tests[session.test].result = 'PASSED';
    info(session.test + ': PASSED');
    return session.resolve(session);
  })
  .catch(function(err) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.red);
    info(session.test + ': ' + tests[session.test].result);
    tests[session.test].result = tests[session.test].result;
    session.resolve(session);
  });
}

function testLastModified(session) {
  comment('test ' + session.test, false);
  tests[session.test].result = '';

  // start watchdog timeout
  var watchdog = setTimeout(function() {
    info('testLastModified watchdog bites');
    session.reject('test case watchdog timeout');
  }, 60000);

  // test sequence
  // fetch reset to clear modified date
  fetch(server + 'reset')
  .then(function(response) {
    return response.json();
  })
  // load lastmodified
  .then(function(data) {
    comment(', 1st load', true);
    loadIframe('testbox', server + 'lastmodified');
    return session;
  })
  .then(waitForProbedata)
  // on message event save max-age, id and modfied
  .then(function(session) {
    session.firstParams = session.probedata.params;
    // wait 1 sec
    comment(', wait 1s', true);
    session.delay = 1000;
    return session;
  })
  .then(waitabit)
  // load lastmodified
  .then(function(data) {
    comment(', 2nd load', true);
    loadIframe('testbox', server + 'lastmodified');
    return session;
  })
  .then(waitForProbedata)
  // on message event compare id (equal)
  .then(function(session) {
    session.secondParams = session.probedata.params;
    if (session.secondParams.id != session.firstParams.id) {
      tests[session.test].result = 'FAILED: 2nd GET should have come from cache';
      throw 'FAILED: 2nd GET should have come from cache';
    }
    return session;
  })
  // fetch state
  .then(function(session) {
    return fetch(server + 'state');
  })
  .then(function(response) {
    return response.json();
  })
  // check lastStatus is not 304
  .then(function(data) {
    if (data.lastStatus == 304) {
      tests[session.test].result = 'FAILED: 2nd GET should have come from cache without if-modified-since/not modfied detour';
      throw 'FAILED: 2nd GET should have come from cache without if-modified-since/not modfied detour';
    }
    // wait beyond max-age
    var delaySec = session.secondParams.maxAge + 1;
    comment(', wait ' + delaySec + 's', true);
    session.delay = delaySec * 1000;
    return session;
  })
  .then(waitabit)
  // load lastmodified
  .then(function(session) {
    comment(', 3rd load', true);
    loadIframe('testbox', server + 'lastmodified');
    return session;
  })
  .then(waitForProbedata)
  // on message event compare id (equal)
  .then(function(session) {
    session.thirdParams = session.probedata.params;
    if (session.thirdParams.id != session.secondParams.id) {
      tests[session.test].result = 'FAILED: 3rd GET should have come from cache';
      throw 'FAILED: 3rd GET should have come from cache';
    }
    return session;
  })
  // fetch state
  .then(function(session) {
    return fetch(server + 'state');
  })
  .then(function(response) {
    return response.json();
  })
  // check lastStatus is 304
  .then(function(data) {
    if (data.lastStatus != 304) {
      tests[session.test].result = 'FAILED: 3rd GET should have caused a if-modified-since/not modfied sequence';
      throw 'FAILED: 3rd GET should have caused a if-modified-since/not modfied sequence';
    }
    // wait beyond max-age
    var delaySec = session.secondParams.maxAge + 1;
    comment(', wait ' + delaySec + 's', true);
    session.delay = delaySec * 1000;
    return session;
  })
  .then(waitabit)
  // fetch reset
  .then(function(session) {
    return fetch(server + 'reset');
  })
  // load lastmodified
  .then(function(data) {
    comment(', 4th load', true);
    loadIframe('testbox', server + 'lastmodified');
    return session;
  })
  .then(waitForProbedata)
  // on message event compare id and modified date (different)
  .then(function(session) {
    session.fourthParams = session.probedata.params;
    if (   session.fourthParams.id   == session.thirdParams.id
        || session.fourthParams.modified == session.thirdParams.modified) {
      tests[session.test].result = 'FAILED: 4th GET should have fetched a fresh vesion';
      throw 'FAILED: 4th GET should have fetched a fresh vesion';
    }
    // wait beyond max-age
    var delaySec = session.secondParams.maxAge + 1;
    comment(', wait ' + delaySec + 's', true);
    session.delay = delaySec * 1000;
    return session;
  })
  .then(waitabit)
  .then (function(session) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.green);
    tests[session.test].result = 'PASSED';
    info(session.test + ' PASSED');
    return session.resolve(session);
  })
  .catch(function(err) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.red);
    info(session.test + ': ' + tests[session.test].result);
    tests[session.test].result = tests[session.test].result;
    session.resolve(session);
  });
}

function testNoCache(session) {
  comment('test ' + session.test, false);
  tests[session.test].result = '';

  // start watchdog timeout
  var watchdog = setTimeout(function() {
    info('testNoCache watchdog bites');
    session.reject('test case watchdog timeout');
  }, 60000);

  // test sequence
  // fetch reset to clear all
  fetch(server + 'reset')
  .then(function(response) {
    return response.json();
  })
  // load nocache
  .then(function(data) {
    comment(', 1st load', true);
    loadIframe('testbox', server + 'nocache');
    return session;
  })
  .then(waitForProbedata)
  // on message event save id
  .then(function(session) {
    session.firstParams = session.probedata.params;
    // wait 1 sec
    comment(', wait 1s', true);
    session.delay = 1000;
    return session;
  })
  .then(waitabit)
  // load nocache
  .then(function(data) {
    comment(', 2nd load', true);
    loadIframe('testbox', server + 'nocache');
    return session;
  })
  .then(waitForProbedata)
  // on message event get id and expires date
  .then(function(session) {
    session.secondParams = session.probedata.params;
    // must be frech (diffrent id)
    if (session.secondParams.id == session.firstParams.id) {
      tests[session.test].result = 'FAILED: 2nd GET should have fetched a fresh vesion';
      throw 'FAILED: 2nd GET should have fetched a fresh vesion';
    }
    return session;
  })
  .then (function(session) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.green);
    tests[session.test].result = 'PASSED';
    info(session.test + ': PASSED');
    return session.resolve(session);
  })
  .catch(function(err) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.red);
    info(session.test + ': ' + tests[session.test].result);
    tests[session.test].result = tests[session.test].result;
    session.resolve(session);
  });
}

function testMaxAge(session) {
  comment('test ' + session.test, false);
  tests[session.test].result = '';

  // start watchdog timeout
  var watchdog = setTimeout(function() {
    info('testMaxAge watchdog bites');
    session.reject('test case watchdog timeout');
  }, 60000);

  // test sequence
  // fetch reset to clear all
  fetch(server + 'reset')
  .then(function(response) {
    return response.json();
  })
  // load maxagezero
  .then(function(data) {
    comment(', 1st load', true);
    loadIframe('testbox', server + 'maxagezero');
    return session;
  })
  .then(waitForProbedata)
  // on message event save id
  .then(function(session) {
    session.firstParams = session.probedata.params;
    // wait 1 sec
    comment(', wait 1s', true);
    session.delay = 1000;
    return session;
  })
  .then(waitabit)
  // load maxagezero
  .then(function(data) {
    comment(', 2nd load', true);
    loadIframe('testbox', server + 'maxagezero');
    return session;
  })
  .then(waitForProbedata)
  // on message event get id and expires date
  .then(function(session) {
    session.secondParams = session.probedata.params;
    // must be frech (diffrent id)
    if (session.secondParams.id == session.firstParams.id) {
      tests[session.test].result = 'FAILED: 2nd GET should have fetched a fresh vesion';
      throw 'FAILED: 2nd GET should have fetched a fresh vesion';
    }
    return session;
  })
  .then (function(session) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.green);
    tests[session.test].result = 'PASSED';
    info(session.test + ': PASSED');
    return session.resolve(session);
  })
  .catch(function(err) {
    clearTimeout(watchdog);
    setStatus('status_' + session.test, colors.red);
    info(session.test + ': ' + tests[session.test].result);
    tests[session.test].result = tests[session.test].result;
    session.resolve(session);
  });
}

function showResult() {
  comment('', false);
  var result = 'Results\n\n';
  var log = {
    results: []
  };
  for (var test in tests) {
    result += test.padLength(13) + ': ' + tests[test].result + '\n';
    log.results.push({ test: test, result: tests[test].result });
  }
  info(log);
  var clientarea = document.getElementById('clientarea');
  if (clientarea) {
    clientarea.innerHTML = '<pre>' + result + '</pre>';
  }
}

function loadIframe(id, url) {
  var elem = document.getElementById(id);
  if (elem) {
    info('loadIframe ' + id + ' ' + url);
    elem.src = url;
  } else {
    info('loadIframe NOT FOUND: ' + id);
  }
}

function comment(text, add) {
  var elem = document.getElementById('commentary');
  if (elem) {
    var old = '';
    if (add) {
      var old = elem.innerHTML;
    }
    elem.innerHTML = old + text;
  }
}

window.onmessage = function(e) {
  if (e.data && e.data.type) {
    switch (e.data.type) {
      case 'probedata':
        // emit event with received data
        var event = new CustomEvent('probedata', { 'detail': e.data.data });
        testbox.dispatchEvent(event);
        break;
    }
  }
}


function setStatus(id, color) {
  var elem = document.getElementById(id);
  if (elem) {
    elem.style.color = color;
    elem.style.borderColor = color;
  }
}

/**
	log wrapper functions
**/
function info(msg) {
	out(5, msg);
}
function debug(msg) {
	out(6, msg);
}
function trace(msg) {
	out(7, msg);
}
function out(severity, msg) {
  var today = new Date().toISOString().slice(11, 23);
  var now =  '[' + today + ']';
	console.log(JSON.stringify({source: 'enginetest', severity: severity, timestamp: now, message: msg}));
}

/*
	usage:

	.then(function() {
		//...
		return 1000; // ms
	})
	.then(waitabit)
*/
function waitabit(session) {
	return new Promise(function(resolve) {
		//info('wait ' + session.delay+'ms...');
    if (session.delay > 1000) {
      var progress = setInterval(function() {
        comment('.', true);
      }, 1000);
    }
		setTimeout(function() {
      if (progress) {
        clearInterval(progress);
      }
      resolve(session);
    }, session.delay);
	});
}


String.prototype.padLength = function (size) {
  var pad = '';
  for (var i=this.length; i<=size; i++) pad += ' ';
  return String(this + pad);
};
