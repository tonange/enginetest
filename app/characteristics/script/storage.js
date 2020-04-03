
var localKey = 'MOD.test.storage.characteristics';


function init() {
  var url = new URL(window.location.href);
  var persistent = url.searchParams.get('persistent') == '1';
  deleteAllData(persistent);
  testSize(persistent);
}


function testSize(persistent) {

  try {
    out('before');
    logStorageSpace(persistent);

    out('1000:');
    var thousand = '';
    for (var i=0; i<512; i++) {
      thousand += '#';
    }
    saveData(localKey, persistent, thousand);
    logStorageSpace(persistent);

    out('100k:');
    var hundredthousand = [];
    for (var i=0; i<102; i++) {
      hundredthousand.push(thousand);
    }
    saveData(localKey, persistent, hundredthousand);
    logStorageSpace(persistent);

    out('1M:');
    var oneMeg = [];
    for (var i=0; i<10; i++) {
      oneMeg.push(hundredthousand);
    }
    saveData(localKey, persistent, oneMeg);
    logStorageSpace(persistent);

    out('10M:');
    var tenMeg = [];
    for (var i=0; i<100; i++) {
      tenMeg.push(hundredthousand);
    }
    saveData(localKey, persistent, tenMeg);
    logStorageSpace(persistent);

    out('11M:');
    var elevenMeg = [];
    for (var i=0; i<110; i++) {
      elevenMeg.push(hundredthousand);
    }
    saveData(localKey, persistent, elevenMeg);
    logStorageSpace(persistent);

    out('50M:');
    var fiftyMeg = [];
    for (var i=0; i<5; i++) {
      fiftyMeg.push(tenMeg);
    }
    saveData(localKey, persistent, fiftyMeg);
    logStorageSpace(persistent);

    out('100M:');
    var hundredMeg = [];
    for (var i=0; i<10; i++) {
      hundredMeg.push(tenMeg);
    }
    saveData(localKey, persistent, hundredMeg);
    logStorageSpace(persistent);
  }
  catch(err) {
    out('ERROR: ' + err.message);
  }
  deleteAllData(persistent);
}

function localStorageSpace() {
  return storageSpace(window.localStorage);
}

function sessionStorageSpace() {
  return storageSpace(window.sessionStorage);
}

function storageSpace(storage) {
  var size = 0;
  for (var key in storage) {
    if (storage.hasOwnProperty(key)) {
      var data = storage[key];
      size += data.length*2;
    }
  }
  return size;
}

function logStorageSpace(persistent) {
  if (persistent) {
    var size = localStorageSpace();
  } else {
    var size = sessionStorageSpace();
  }
  if (size < 1024*1024) {
    var sizeStr = (size / 1024).toFixed(1) + ' kB';
  } else {
    var sizeStr = (size / (1024*1024)).toFixed(1) + ' MB';
  }
  if (persistent) {
    out('localStorage uses ' + sizeStr);
  } else {
    out('sessionStorage uses ' + sizeStr);
  }
}


/*
 * delete localStorage
 */
function deleteAllData(persistent) {
  log('deleteAllData');
  if (persistent) {
    localStorage.clear();
  } else {
    sessionStorage.clear();
  }
}

/*
 * write data to WebStorage
 */
function saveData(storageKey, persistent, data) {
	if (persistent) {
		if (localStorage) {
			localStorage.setItem(storageKey, data);
		}
	} else {
		if (sessionStorage) {
			sessionStorage.setItem(storageKey, data);
		}
  }
}

/*
 * get data from WebStorage
 */
function loadData(storageKey, persistent) {
	var data = '';
	if (persistent) {
		if (localStorage) {
			if (localStorage.getItem(storageKey)) {
				data = localStorage.getItem(storageKey);
			}
		}
	} else {
		if (sessionStorage) {
			if (sessionStorage.getItem(storageKey)) {
				data = sessionStorage.getItem(storageKey);
			}
		}
	}
	return data;
}

function out() {
  var args = Array.prototype.slice.call(arguments);
  for (var i=0; i<args.length; i++) {
    if (isObject(args[i])) {
      try {
        args[i] = JSON.stringify(args[i]);
      } catch(err) {
        args[i] = args[i].toString();
      }
    }
  }
  var msg = args.join(' ');
  log(msg);
  var output = document.getElementById('output');
  if (output) {
    var text = output.innerHTML;
    text += '\n';
    text += msg;
    output.innerHTML = text;
  }
}

var consoleLog;
function log() {
  var args = Array.prototype.slice.call(arguments);
  for (var i=0; i<args.length; i++) {
    if (isObject(args[i])) {
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

function isArray(o) {
  return Object.prototype.toString.call(o) === '[object Array]';
}
function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}
