/**

    new version: based on viwiclient

 **/



var storageKey = 'enginetest.notifications.data';
var data;

var url = new URL(document.referrer);
var engineInstanceUri = url.searchParams.get('engineinstanceURI');
if (!engineInstanceUri) {
  engineInstanceUri = url.searchParams.get('engineInstanceURI');
}
// ICAS3: --rsiRegistryURI=http://[::1]:80
var registry = url.searchParams.get('rsiRegistryURI');
if (!registry) {
  // default
  registry = 'http://127.0.0.1:443';
}
// target simulator trumps all
var viwi_port = url.searchParams.get('VIWI_PORT');
if (viwi_port) {
  registry = 'http://127.0.0.1:' + viwi_port;
}
log('using registry at ' + registry);


var viwi = new Viwiclient(registry);
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
      currentNotifications: {},
      counter: 1
    }
  }
});

function create(page) {
  if (page == 'notifications') {
    createNotification();
  }
}

function createNotification() {
  var fields = [
    'name',
    'headline',
    'text',
    'actionOne'
  ];
  /*
      add icon:

      icon	the icon of this notification

      type: string
      format: uri

      /img/worker.png

  */
  var location = new URL(window.location.href);
  var icon = location.origin + location.pathname;
  icon = icon.replace('notifications.html', '');
  icon += 'img/worker.png';
  var notification = {
    name: 'unset',
    headline: 'unset',
    icon: icon,
    dismissable: true,
    dismissed: false,
    triggerAction: false,
    timestamp: Math.round(Date.now()/1000)
  };
  var form = document.getElementById('priority');
  notification.priority = parseInt(form.elements['priority'].value);
  for (var i=0; i<fields.length; i++) {
    var val = document.getElementById(fields[i]).value;
    if (val != '') {
      notification[fields[i]] = val;
    }
  }
  notification.name = notification.name + '_' + data.counter;
  data.counter++;
  if (notification.text) {
    notification.text = notification.text.replaceAll('\\n', '\n');
  }
  // additionalParameter
  var additionalParameter;
  var value = document.getElementById('additionalParameter').value;
  if (value != '' && value != ' ') {
    additionalParameter = {
      name: 'enginetest' + data.counter,
      value: value,
      type: 'Action',
      unit: 'none',
      conversionAccuracy: '1'
    }
    data.counter++;
  }
  // do it
  sendNotification(notification, additionalParameter);
}

function sendNotification(notification, actionParameter) {
  log('send notification', notification);
  output('running ...');

  var transaction = {
    servicename: 'notificationmanager',
    notification: notification,
    actionParameter: actionParameter
  };

  addAdditionalParameter(transaction)
  .then(addNotification)
  .then(subscribeNotification)
  .then(notificationDone)
  .catch(function(err) {
    output(err.message);
  });
}


// notifications

function addAdditionalParameter(transaction) {
  return new Promise(function(resolve, reject) {
    if (transaction.actionParameter) {
      log('add parameter', transaction.actionParameter);
      viwi.post(transaction.servicename, 'additionalParameters/', transaction.actionParameter)
      .then(function (response) {
        if (response.status && response.status == 'error') {
          throw new Error('Error: ' + response.code + ' ' + response.message);
        }
        if (!response.location) {
          throw new Error('POST to additionalParameters/ did not return a location');
        }
        transaction.notification.additionalActionParameter = response.location;
        log('add parameter:  ok');
        resolve(transaction);
      })
      .catch (reject);
    } else {
      log('no parameter');
      resolve(transaction);
    }
  });
}

function addNotification(transaction) {
  log('add notification');
  return viwi.post(transaction.servicename, 'notifications/', transaction.notification)
  .then(function (response) {
    if (response.status && response.status == 'error') {
      throw new Error('Error: ' + response.code + ' ' + response.message);
    }
    if (!response.location) {
      throw new Error('POST to additionalParameters/ did not return a location');
    }
    log('location:', response.location);
    var elements = response.location.split('/');
    transaction.notificationId = elements.pop();
    log('notification id', transaction.notificationId);
    return transaction;
  });
}

function subscribeNotification(transaction) {
  viwi.subscribe(transaction.servicename, {
    type: 'subscribe',
    event: '/notificationmanager/notifications/' + transaction.notificationId
  });
  return transaction;
}

function notificationDone(transaction) {
  output('Ok: ' + transaction.notification.name);
  return transaction;
}


// popups

// ToDo (after testing notifications on a target)






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
    source: 'enginetest.notifications',
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
