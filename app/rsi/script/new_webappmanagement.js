
function init() {
  var url = new URL(window.location.href);
  var view = url.searchParams.get('view');

  // web app housekeeping
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

  if (view) {
    start(view, registry);
  }
}


function start(view, registry) {
  if (view == 'instances') {
    var monitor = new InstanceMonitor(registry);
  } else if (view == 'apps') {
    var monitor = new AppMonitor(registry);
  } else if (view == 'jobs') {
    var monitor = new JobsMonitor(registry);
  } else {
    log('start ERROR: unknown view ' + view);
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
    source: 'enginetest.webappmanagement',
    severity: 5,
    timestamp: now,
    message: args.join(' ')
  };
  console.log(JSON.stringify(msg));
}


///////////////////////////////////////////////////////////////////////////////
//
//    Monitor base class
//

class Monitor extends Viwiclient {

  constructor(registry) {
    super(registry);

    this.elements = {};
    this.expand = '';
    this.style = '';

    this.on('data', function(msg) {
      if (msg && msg.id && msg.data) {
        if (msg.id == this.subscription) {
          this.handleResource(msg.data);
        } else {
          this.handleElement(msg.data);
        }
      }
    });

    this.on('gone', function(msg) {
      if (msg && msg.id && msg.data) {
        this.handleGone(msg.data);
      }
    });
  }

  subscribeResource(subscription) {
    output('status', 'subscribing ' + subscription.event, false);
    this.subscription = this.subscribe('webappmanagement', subscription);
  }

  handleResource(data) {
    log('handleResource');
    output('status', 'found ' + data.length + ' elements', false);
    for (var i=0; i<data.length; i++) {
      var element = data[i];
      if (!this.elements.hasOwnProperty(element.id)) {
        // this one is new
        this.elements[element.id] = element;
        var subscription = {
          event: element.uri + this.expand
        };
        this.subscribe('webappmanagement', subscription);
      }
    }
  }

  handleElement(element) {
    log('handleElement ' + element.uri);
    var id = element.id;
    this.elements[id] = element;
    var display = document.getElementById('id');
    if (!display) {
      // create a element div as display
      this.addElement('tree', this.style, element);
    }
    // update element in display
    this.updateElement(element);
  }

  addElement(parentid, style, element) {
    var parent = document.getElementById(parentid);
    if (parent) {
      var content = parent.innerHTML;
      content += '<div id="' + element.id + '" class="' + style + '"></div>';
      parent.innerHTML = content;
    }
  }

  delayedRevove(element, delay) {
    // set timer to remove from display after some time
    var me = this;
    setTimeout(function() {
      var display = document.getElementById(element.id);
      if (display) {
        log('handleGone: remove display for ' + element.id);
        display.outerHTML = '';
      }
      log('handleGone: delete element ' + element.id);
      delete me.elements[element.id];
    }, delay);    
  }

  // "virtual"

  updateElement(element) {
    log('ERROR: updateElement needs to be overloaded');
    var content = element.id;
    var display = document.getElementById(element.id);
    if (display) {
      log('updateElement ' + element.id + ': ' + content);
      display.innerHTML = content;
    } else {
      log('ERROR: cannot find display element');
    }
  }

  handleGone(event) {
    log('ERROR: handleGone needs to be overloaded');
  }

} // class InstanceMonitor


///////////////////////////////////////////////////////////////////////////////
//
//    Monitor engineInstances
//

class InstanceMonitor extends Monitor {

  constructor(registry) {
    super(registry);

    this.expand = '?$expand=2';
    this.style = 'instance';

    var subscription = {
      event: '/webappmanagement/engineInstances/'
    };

    this.subscribeResource(subscription);
  }

  updateElement(element) {
    var content = element.id + '\n';
    if (element.engineID == '') {
      content += '>>>  DELETED <<<\n';
    } else {
      content += 'engineID: ' + element.engineID + ', ';
      content += 'runState: ' + element.runState + '\n';
      }
    content += 'serviceid: ' + element.entrypoint.webapp.serviceid + '\n';
    content += 'entrypointID: ' + element.entrypoint.entrypointID + '\n';
    if (!element.engineID.startsWith('background') && element.engineID != '') {
      content += 'statusBarVisible: ' + element.statusBarVisible + ', ';
      content += 'hmiHandleNHTSA: ' + element.hmiHandleNHTSA;
    } else {
      content += ' ';
    }
    var display = document.getElementById(element.id);
    if (display) {
      log('updateElement ' + element.id + ': ' + content);
      display.innerHTML = content;
    } else {
      log('ERROR: cannot find display element');
    }
  }

  handleGone(event) {
    var id = event.split('?')[0];
    id = id.split('/').pop();
    log('handleGone ' + event + ' '  + id);
    // put DELETED in display
    var element = this.elements[id];
    element.engineID = '';
    this.updateElement(element);
    this.delayedRevove(element, 60000);
  }

}


///////////////////////////////////////////////////////////////////////////////
//
//    Monitor webapps
//

class AppMonitor extends Monitor {

  constructor(registry) {
    super(registry);

    this.style = 'app';

    var subscription = {
      event: '/webappmanagement/webapps/'
    };

    this.subscribeResource(subscription);
  }

  updateElement(element) {
    var content = element.id + '\n';
    content += 'name: ' + element.name + '\n';
    content += 'serviceid: ' + element.serviceid + '\n';
    content += 'version: ' + element.version + '\n';
    content += 'availabilityState: ' + element.availabilityState;
    var display = document.getElementById(element.id);
    if (display) {
      log('updateElement ' + element.id + ': ' + content);
      display.innerHTML = content;
    } else {
      log('ERROR: cannot find display element');
    }
  }

  handleGone(event) {
    log('handleGone ' + event);
    var id = event.split('?')[0];
    id = id.split('/').pop();
    // put DELETED in display
    var element = this.elements[id];
    element.availabilityState = '>>>  DELETED <<<';
    this.updateElement(element);
  }

} // class AppMonitor


///////////////////////////////////////////////////////////////////////////////
//
//    Monitor installjobs
//

class JobsMonitor extends Monitor {

  constructor(registry) {
    super(registry);

    this.expand = '?$expand=1';
    this.style = 'job';

    var subscription = {
      event: '/webappmanagement/installjobs/'
    };

    this.subscribeResource(subscription);
  }

  updateElement(element) {
    var content = element.id + '\n';
    content += 'serviceid: ' + element.webapp.serviceid + '\n';
    content += 'start: ' + element.startTimestamp + '\n';
    content += 'state: ' + element.installationState;
    if (element.progress || element.progress == 0) {
      content += ' (' + element.progress + '%)\n';
    } else {
      content += '\n';
    }
    if (element.errorCode) {
      content += 'errorCode: ' + element.errorCode + '\n';
    }
    content += 'updated: ' + element.lastUpdateTimestamp;
    var display = document.getElementById(element.id);
    if (display) {
      log('updateElement ' + element.id + ': ' + content);
      display.innerHTML = content;
    } else {
      log('ERROR: cannot find display element');
    }
  }

  handleGone(event) {
    log('handleGone ' + event);
    var id = event.split('?')[0];
    id = id.split('/').pop();
    // put DELETED in display
    var element = this.elements[id];
    element.lastUpdateTimestamp = '>>>  DELETED <<<';
    this.updateElement(element);
  }

} // class JobsMonitor