
var registry;

var appspeller;
var apppinspeller;

function goHome() {
  location.href = document.referrer;
}

function init() {
  // web app housekeeping
  var url = new URL(document.referrer);
  var engineInstanceUri = url.searchParams.get('engineinstanceURI');
  if (!engineInstanceUri) {
    engineInstanceUri = url.searchParams.get('engineInstanceURI');
  }
  // ICAS3: --rsiRegistryURI=http://[::1]:80
  registry = url.searchParams.get('rsiRegistryURI');
  if (!registry) {
    // default
    registry = 'http://127.0.0.1:443';
  }
  // target simulator trumps all
  var viwi_port = url.searchParams.get('VIWI_PORT');
  if (viwi_port) {
    registry = 'http://127.0.0.1:' + viwi_port;
  }
  if (engineInstanceUri) {
    var housekeeping = new Housekeeping('enginetest', engineInstanceUri, registry);
    housekeeping.on('instanceUpdate', updateInstance);
    housekeeping.subscribeEngineState();
  }

  // a real web app would search for all input elements
  initSpeller('demo');
  initSpeller('number');
  initSpeller('sensitive');
  initSpeller('pin');
  
  initAppSpeller();
  initAppPinSpeller();
}

function initAppSpeller() {
  var speller = {
    id: 'app',
    value: '',
    type: 'text',
    title: 'Street Name in Braunschweig',
    placeholder: 'street name',
    matchlistData: streets,
    useEnabledCharacters: true
  };
  appspeller = new AppSpeller(registry, speller);

  appspeller.on('update', function(value) {
    if (value == 'exit') {
      appspeller.close();
      focus('home');
    }
  });
  appspeller.on('state', function(state) {
    log('state '+ state);
  });
  appspeller.on('closed', function() {
    focus('home');
  });
}

function initAppPinSpeller() {
  var speller = {
    id: 'apppin',
    type: 'pin',
    title: 'Entry must be hidden',
    placeholder: 'any number',
  };
  apppinspeller = new AppSpeller(registry, speller);

  apppinspeller.on('update', function(value) {
  });
  apppinspeller.on('state', function(state) {
    log('state '+ state);
  });
  apppinspeller.on('closed', function() {
    focus('home');
  });
}

function focus(id) {
  var elem = document.getElementById(id);
  if (elem) {
    log('focus ' + id);
    elem.focus();
  }
}

function updateInstance(data) {
  log('updateInstance, webEngine=' + data.webEngine.uri);
  if (appspeller && data.hasOwnProperty('webEngine')) {
    appspeller.browserInstance = data.webEngine;
  }
  if (apppinspeller && data.hasOwnProperty('webEngine')) {
    apppinspeller.browserInstance = data.webEngine;
  }
}

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

function setFocus(id) {
  var speller = document.getElementById(id);
  if (speller) {
    log('try to setFocus: to ' + id);

    // doesn't work on target:
    speller.focus();

    // also doesn't work on target:
    speller.click();
  }
}

function report(e) {
  log( 'report ' + e.type );
  if (e.type == 'touchstart') {
    displaytext = '';
  }
  displaytext += 'event: ' + e.type + '\n';
  displaytext += '  touches:\n';
  for (t=0; t<e.touches.length; t++) {
    displaytext += '    ' + t + ':\n';
    displaytext += '      clientX: ' + e.touches[t].clientX + '\n';
    displaytext += '      clientY: ' + e.touches[t].clientY + '\n';
    displaytext += '      pageX: '   + e.touches[t].pageX + '\n';
    displaytext += '      pageY: '   + e.touches[t].pageY + '\n';
    displaytext += '      screenX: ' + e.touches[t].screenX + '\n';
    displaytext += '      screenY: ' + e.touches[t].screenY + '\n';
  }
  log('output ' + displaytext);
}


function updatedSpeller(id) {
  var speller = document.getElementById(id);
  if (speller) {
    log('speller ' + speller.id + '.onBlur, value: ' + speller.value);
    if (speller.id == 'number') {
      var val = document.getElementById('value');
      if (val) {
        val.innerHTML = 'value: ' + speller.value;
      }
    }
    if (isEmpty(speller.value) && speller.placeholder) {
      speller.value = speller.placeholder;
    }
    if (speller.value == speller.placeholder) {
      speller.style.color = 'grey';
    }
  }
}

function isEmpty(value){
  return (value == null || value.length === 0);
}

