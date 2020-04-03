
function init() {
  var url = new URL(window.location.href);
  var view = url.searchParams.get('view');
  if (view) {
    if (view == 'services') {
      var monitor = new ServicesMonitor();
    } else {
      log('start', 'ERROR: unknown view', view);
    }
  }    
}


///////////////////////////////////////////////////////////////////////////////
//
//    Monitor base class
//

class Monitor extends Viwiclient {

  constructor(servicename) {
    super();

    this.servicename = servicename;
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
    output('status', 'subscribing...', false);
    this.subscription = this.subscribe(this.servicename, subscription);
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
        this.subscribe(this.servicename, subscription);
      }
    }
  }

  handleElement(element) {
    log('handleElement', element.uri);
    var id = element.id;
    this.elements[id] = element;
    var display = document.getElementById('id');
    if (!display) {
      // create a element div as display
      this.addElement('apps', this.getStyle(element), element);
    }
    // update element in display
    this.updateElement(element);
  }

  addElement(parentid, style, element) {
    log('addElement', element.id);
    var parent = document.getElementById(this.getParent(element));
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
        log('handleGone: remove display for', element.id);
        display.outerHTML = '';
      }
      log('handleGone: delete element', element.id);
      delete me.elements[element.id];
    }, delay);    
  }

  // "virtual"

  getParent(element) {
    return 'other';
  }

  getStyle(element) {
    return 'service';
  }

  updateElement(element) {
    log('ERROR: updateElement needs to be overloaded');
    var content = element.id;
    var display = document.getElementById(element.id);
    if (display) {
      log('updateElement', element.id, content);
      display.innerHTML = content;
    } else {
      log('ERROR: cannot find display element');
    }
  }

  handleGone(event) {
    log('ERROR: handleGone needs to be overloaded');
  }

} // class Monitor


///////////////////////////////////////////////////////////////////////////////
//
//    Monitor servicelist
//

class ServicesMonitor extends Monitor {

  constructor() {
    super('servicemanagement');

    this.expand = '?$expand=1';
    this.style = 'service';

    var subscription = {
      event: '/servicemanagement/services/'
    };

    this.subscribeResource(subscription);
  }

  getParent(element) {
    if (element.type && element.type.includes('webApp')) {
      return 'apps';
    }
    return 'other';
  }

  getStyle(element) {
    if (element.type && element.type.includes('webApp')) {
      return 'app';
    }
    return 'service';
  }

  updateElement(element) {

    var content = element.id + '\n';

    // serviceid, type
    content += element.name + ' ';
    for (var i=0; i<element.type.length; i++) {
      content += element.type[i] + ' ';
    }
    content += ' ';

    // apnType, blocksDisabling
    content += element.apnType;
    if (element.blocksDisabling) {
      content += ' blocksDisabling';
    }
    content += '\n';

    // disableReasons
    if (element.disableReasons && element.disableReasons.length > 0) {
      content += 'disableReasons:';
      for (i=0; i<element.disableReasons.length; i++) {
        content += ' ' + element.disableReasons[i];
      }
      content += '\n';
    }

    // privacyGroups
    if (element.privacyGroups && element.privacyGroups.length > 0) {
      content += 'privacyGroups:';
      for (var i=0; i<element.privacyGroups.length; i++) {
        content += ' ' + element.privacyGroups[i];
      }
      content += '\n';
    }

    // operations
    content += 'operations:';
    if (element.operations && element.operations.length > 0) {
      for (var i=0; i<element.operations.length; i++) {
        content += '\n  ' + element.operations[i].name + ', id: ' + element.operations[i].operationId;
      }
    }
    content += '\n';

    // licences
    content += 'licences:';
    if (element.licenses && element.licenses.length > 0) {
      for (var i=0; i<element.licenses.length; i++) {
        content += '\n  ' + element.licenses[i].name + ' ' + element.licenses[i].state;
      }
    }
    content += '\n';

    // serviceHostSystem

    if (element.serviceHostSystem == '') {
      content += '>>>  DELETED <<<\n';
    } else {
      content += 'serviceHostSystem: ' + element.serviceHostSystem + '\n';
    }

    // updata

    var display = document.getElementById(element.id);
    if (display) {
      log('updateElement', element.id, content);
      display.innerHTML = content;
    } else {
      log('ERROR: cannot find display element');
    }
  }

  handleGone(event) {
    var id = event.split('?')[0];
    id = id.split('/').pop();
    log('handleGone', event, id);
    // put DELETED in display
    var element = this.elements[id];
    element.serviceHostSystem = '';
    this.updateElement(element);
    this.delayedRevove(element, 60000);
  }

}


///////////////////////////////////////////////////////////////////////////////
// helpers

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

