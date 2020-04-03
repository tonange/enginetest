/**

    based on viwiclient

 **/



var storageKey = 'enginetest.phoencall.data';
var data;

var viwi = new Viwiclient();
viwi.on('data', function(msg) {
  if (msg && msg.id && msg.data) {
    // for now just print to the log
    log(msg);
  }
});
viwi.on('gone', function(msg) {
  // for now just print to the log
  log(msg);
});


window.addEventListener('load', function() {
  data = loadData(storageKey);
  if (!data) {
    data = {
      currentCalls: {}
    }
  }
});

function submit() {
  var fields = [
    'name',
    'phoneNumber'
  ];
  var call = {
    phoneNumber: ''
  };
  for (var i=0; i<fields.length; i++) {
    var val = document.getElementById(fields[i]).value;
    if (val != '') {
      call[fields[i]] = val;
    }
  }

  log('place call', call);
  output('calling ...');

  viwi.post('basicphonecall', 'calls/', call)
  .then(function (response) {
    if (response.status && response.status == 'error') {
      throw new Error('Error: ' + response.code + ' ' + response.message);
    }
    if (!response.location) {
      throw new Error('POST to calls/ did not return a location');
    }
    log('location:', response.location);
  })
  .catch(function(err) {
    output(err.message);
  });
}



///////////////////////////////////////////////////////////////////////////////
//

function cleanup() {
  log('cleanup');
  saveData(storageKey, data);
}




///////////////////////////////////////////////////////////////////////////////
//speller stuff

function initSpeller(id) {
  var speller = document.getElementById(id);
  if (speller) {
    speller.onfocus = function() {
      focusSpeller(this.id);
    };
    speller.onblur = function() {
      updatedSpeller(this.id);
    };
    updatedSpeller(id);
  }
}

function focusSpeller(id) {
  var speller = document.getElementById(id);
  if (speller) {
    speller.style.color = 'white';
  }
}

function updatedSpeller(id) {
  var speller = document.getElementById(id);
  if (speller) {
    if (isEmpty(speller.value)) {
      speller.value = speller.placeholder;
    }
    if (speller.value == speller.placeholder) {
      speller.style.color = '#bbb';
    }
  }
}

function isEmpty(value){
  return (value == null || value.length === 0);
}


///////////////////////////////////////////////////////////////////////////////
//localStorage

function saveData(storageKey, data) {
	localStorage.setItem(storageKey, JSON.stringify(data));
}

function loadData(storageKey) {
  var data = localStorage.getItem(storageKey);
  if (data) {
    return JSON.parse(data);
  } else {
    return null;
  }
}


///////////////////////////////////////////////////////////////////////////////
//log stuff

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
    source: 'enginetest.phonecall',
    severity: 5,
    timestamp: now,
    message: args.join(' ')
  };
  console.log(JSON.stringify(msg));
}


///////////////////////////////////////////////////////////////////////////////
//helpers

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// check if we run on the target or in a dev env
function isDev() {
  res = false;
  if (navigator.platform.substring(0, 3) == 'Mac') res = true;
  if (navigator.platform.substring(0, 3) == 'Win') res = true;
  return res;
}
