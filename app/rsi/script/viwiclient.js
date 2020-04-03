
class Viwiclient extends EventEmitter {

	constructor(registry, debug=true) {
    super();
    if (registry) {
      this.registry = registry;
    } else {
      this.registry = 'http://127.0.0.1:443';
    }
    // enable log output?
    //this.localdebug = false;
    this.localdebug = debug;
    // set to !null when needing a specific version
    this.requestVersion = null;
    // service data from registry
    this.services = {};
    // connected websockets
    this.connections = {};
    // subscriptions
    this.subscriptions = {};
  }

  get registryUri() {
    return this.registry;
  }

  versions(servicename) {
    var me = this;
    this.locallog('versions', servicename);
    return me.getService(servicename)
    .then(function(service) {
      me.locallog('versions', servicename, service.versions);
      return service.versions;
    });
  }

  get(servicename, resource) {
    var me = this;
    this.locallog('get', servicename, resource);
    return me.getService(servicename)
    .then(function(service) {
      var uri = me.buildUri(resource, service);
      return me.viwiget(uri);
    });
  }

  post(servicename, resource, data) {
    var me = this;
    this.locallog('post', servicename, resource);
    return me.getService(servicename)
    .then(function(service) {
      var uri = me.buildUri(resource, service);
      return me.viwipost(uri, data);
    });  
  }

  delete(servicename, resource) {
    var me = this;
    this.locallog('delete', servicename, resource);
    return me.getService(servicename)
    .then(function(service) {
      var uri = me.buildUri(resource, service);
      return me.viwidelete(uri);
    });
  }

  buildUri(resource, service) {
    if (resource.startsWith('http')) {
      var uri = resource;
    } else if (resource.startsWith(service.uri)) {
      var uri = service.origin + resource;
    } else if (service.uri.startsWith('http')) {
      var uri = service.uri + resource;
    } else {
      var uri = service.origin + service.uri + resource;
    }
    return uri ;
  }

  connect(servicename) {
    var me = this;
    this.locallog('connect', servicename);
    me.getService(servicename)
    .then(service => me.wsconnect(service))
    .catch(function(err) {
      me.locallog('connect', 'ERROR', err);//.message);
      me.emit('error', { id: 0, status: 'error', message: 'connect to ' + servicename + ' failed'});
    });
  }

  rawconnect(uri) {
    if (!this.services.hasOwnProperty(uri)) {
      this.services[uri] = {
        name: uri,
        origin: uri
      }
    }
    return this.wsconnect(this.services[uri]);
  }

  normalizeEvent(event) {
    // /service/resource?query#uid
    // /service/resource/?query#uid
    // /service/resource/id?query#uid
    var uid = '';
    var query = '';
    var parts = event.split('#');
    if (parts.length > 1) {
      uid = '#' + parts[1];
    }
    parts = parts[0].split('?');
    if (parts.length > 1) {
      query = '?' + parts[1];
    }
    parts = parts[0].split('/');
    var res = '/' + parts[1] + '/';
    if (parts.length > 2 && parts[2] != '') {
      res += parts[2] + '/';
    }
    if (parts.length > 3 && parts[3] != '') {
      res += parts[3];
    }
    res += query + uid;
    return res;
  }

  subscribe(servicename, subscription) {
    var me = this;
    subscription.event = this.normalizeEvent(subscription.event);
    this.locallog('subscribe', servicename, subscription.event);

    // look if already subscribed to same event etc.
    // then just increase the counter
    var id = this.findSubscription(subscription);
    if (id != null) {
      this.locallog('subscribe', 'duplicate subscription', id);
      this.subscriptions[id].counter++;  
      // fake subscribe ok response (after returning the id!)
      var me = this;
      setTimeout(function() {
        me.emit('subscribed', { id: id });
        me.emit('rawdata', { id: id, data: me.subscriptions[id].subscription });
        if (me.subscriptions[id].msg) {
          // return currently buffered data to new subscriber as initial response
          me.emit('data', { id: id, data: me.subscriptions[id].msg.data });
          me.emit('rawdata', { id: id, data: me.subscriptions[id].msg });
        }
      });
      return id;
    }

    // create new subscription
    id = this.getid();
    this.subscriptions[id] = {
      servicename: servicename,
      subscription: subscription,
      counter: 1,
      active: false
    };

    // connect first if not already connected
    //  events on:
    //   connected
    //   subscribed
    //   unsubscribed
    //   error
    //   gone
    //   data

    me.getService(servicename)
    .then(service => me.wsconnect(service))
    .then(function(connection) {
      // send subscription if already connected
      me.connections[servicename].subscriptions.push(id);
      if (me.connections[servicename].connected) {
        me.doSubscription(id);
      } // else: subscribe in connect handler
      return true;
    })
    .catch(function(err) {
      me.locallog('subscribe', 'ERROR', err);//.message);
      me.emit('error', { id: id, status: 'error', message: 'subscribe to ' + subscription.event + ' failed'});
    });
    return id;
  }

  findSubscription(subscription) {
    var found = null;
    for (var id in this.subscriptions) {
      if (this.subscriptions[id].subscription.event === subscription.event &&
          this.subscriptions[id].subscription.interval === subscription.interval &&
          this.subscriptions[id].subscription.updatelimit === subscription.updatelimit &&
          this.subscriptions[id].subscription.Authorization === subscription.Authorization) {
        found = id;
        break;
      }
    }
    return found;
  }

  doSubscription(id) {
    var sub = this.subscriptions[id];
    var msg = {
      type: 'subscribe',
      event: sub.subscription.event
    };
    if (sub.subscription.hasOwnProperty.updatelimit) {
      msg.updatelimit = sub.subscription.updatelimit;
    }
    if (sub.subscription.hasOwnProperty.interval) {
      msg.interval = sub.subscription.interval;
    }
    this.locallog('doSubscription', 'send', msg);
    this.connections[sub.servicename].ws.send(JSON.stringify(msg));
  }

  unsubscribe(id) {
    this.locallog('unsubscribe', id);
    var sub = this.subscriptions[id];
    // only unsubscribe if last subscriber for event is gone (counter == 1)
    sub.counter--;
    if (sub.counter > 0) {
      this.locallog('defer unsubscribe', id, 'still', sub.counter, 'clients subscribed');
      // emit unsubscribe event 
      this.emit('unsubscribed', { id: id });
      var data = {
        type : 'unsubscribe',
        event : sub.subscription.event,
        status : 'ok'
      };
      this.emit('rawdata', { id: id, data: data })
      return;
    }
    var msg = {
      type: 'unsubscribe',
      event: sub.subscription.event
    };
    // send unsubscribe if still connected
    if (this.connections[sub.servicename].connected) {
      this.locallog('unsubscribe', 'send', msg);
      this.connections[sub.servicename].ws.send(JSON.stringify(msg));
    }
    delete this.subscriptions[id];
    var index = this.connections[sub.servicename].subscriptions.indexOf(id);
    if (index !== -1) {
      this.connections[sub.servicename].subscriptions.splice(index, 1);
    }
  }

  handleConnect(servicename) {
    this.locallog('handleConnect', servicename);
    this.emit('connected', { id: 0, data: servicename });
    // send pending subscriptions
    for (var i=0; i<this.connections[servicename].subscriptions.length; i++) {
      var id = this.connections[servicename].subscriptions[i];
      if (!this.subscriptions[id].active) {
        this.doSubscription(id);
      }
    }
  }

  handleSubscribe(servicename, msg) {
    msg.event = this.normalizeEvent(msg.event);
    this.locallog('handleSubscribe', servicename, msg.event);
    // find subscriptions and emit subscribed event
    for (var i=0; i<this.connections[servicename].subscriptions.length; i++) {
      var id = this.connections[servicename].subscriptions[i];
      var sub = this.subscriptions[id];
      if (sub && !sub.active && (sub.subscription.event == msg.event)) {
        sub.active = true;
        this.emit('subscribed', { id: id });
        this.emit('rawdata', { id: id, data: msg });
      }
    }
  }

  handleUnsubscribe(servicename, msg) {
    msg.event = this.normalizeEvent(msg.event);
    this.locallog('handleUnsubscribe', servicename, msg.event);
    // find subscription and emit unsubscribed event
    for (var i=0; i<this.connections[servicename].subscriptions.length; i++) {
      var id = this.connections[servicename].subscriptions[i];
      var sub = this.subscriptions[id];
      if (sub && sub.active && (sub.subscription.event == msg.event)) {
        this.emit('unsubscribed', { id: id });
        this.emit('rawdata', { id: id, data: msg });
        delete this.subscriptions[id];
        this.connections[servicename].subscriptions[i] = null;
        break;
      }
    }
  }

  handleError(servicename, msg) {
    msg.event = this.normalizeEvent(msg.event);
    this.locallog('handleError', servicename, msg.event);
    // find subscriptions and emit error event
    for (var i=0; i<this.connections[servicename].subscriptions.length; i++) {
      var id = this.connections[servicename].subscriptions[i];
      var sub = this.subscriptions[id];
      if (sub && (sub.subscription.event == msg.event)) {
        // {"type":"error","code":410,"data":"element gone","event":"/webappstorage/items/25b130ef-60ef-475e-8bbf-254eb23657ca"}
        if (msg.hasOwnProperty('code') && msg.code == 410) {
          this.locallog('emit gone ' + JSON.stringify({ id: id, data: msg.data }));
          this.emit('gone', { id: id, data: msg.event });
          this.emit('rawdata', { id: id, data: msg });
        } else {
          this.locallog('emit error ' + JSON.stringify({ id: id, data: msg.data }));
          this.emit('error', { id: id, data: msg.data });
          this.emit('rawdata', { id: id, data: msg });
        }
      }
    }
  }

  handleMessage(servicename, msg) {
    msg.event = this.normalizeEvent(msg.event);
    this.locallog('handleMessage ' + servicename + ', event: ' + msg.event);
    // find subscriptions and emit data event
    for (var i=0; i<this.connections[servicename].subscriptions.length; i++) {
      var id = this.connections[servicename].subscriptions[i];
      var sub = this.subscriptions[id];
      if (sub && (sub.subscription.event == msg.event)) {
        // buffer data in case a further subscription for same event comes in
        sub.msg = msg;
        this.locallog('emit data, id:' + id + ', data: ' + JSON.stringify(msg.data));
        this.emit('data', { id: id, data: msg.data });
        this.emit('rawdata', { id: id, data: msg });
      }
    }
  }

  getService(servicename, retry=true) {
    var me = this;
    return new Promise(function(resolve, reject) {
      if (me.services.hasOwnProperty(servicename)) {
        resolve(me.services[servicename]);
      } else {
        me.locallog('getService ' + servicename);
        me.viwiget(me.registry + '/?name=' + servicename)
        .then(function(data) {
          if (data.length > 0) {
            var record = data[0];
            if (record.uri.startsWith('http')) {
              record.location = record.uri;
            } else {
              record.location = me.registry + record.uri;
            }
            me.services[servicename] = record;
            var probeUri = record.location;
            // FixMe (fix notificationmanager that is)
            // workaround (1/2) for current notificationmanager not supporting introspection of resources
            if (servicename == 'notificationmanager') {
              probeUri += 'notifications/';
            } else if (servicename == 'servicemanagement') {
              probeUri += 'services/';
            }
            me.locallog('getService, get redirect target, probe ' + probeUri);
            return fetch(probeUri);
          } else {
            reject({message: 'did not find ' +  servicename + ' in registry'});
          }
        })
        .then(function(response) {
          if (!response.ok) {
            return reject({message: response.status + ' ' + response.statusText});
          }
          if (response.redirected) {
            // Chrome 60+x
            me.locallog('service redirected to ' + response.url);
            me.services[servicename].location = response.url;
          } else if (response.type == "cors") {
            // Chrome 51
            me.locallog('service url changed to ' + response.url + ' (assuming redirect)');
            me.services[servicename].location = response.url;
          }
          // FixMe (fix notificationmanager that is)
          // workaround (2/2) for current notificationmanager not supporting introspection of resources
          if (servicename == 'notificationmanager') {
            me.services[servicename].location = response.url.replace('notifications/', '');
          } else if (servicename == 'servicemanagement') {
            me.services[servicename].location = response.url.replace('services/', '');
          }
          var url = new URL(me.services[servicename].location);
          me.services[servicename].origin = url.origin;
          me.locallog('service location: ' + me.services[servicename].location);
          me.locallog('service origin  : ' + me.services[servicename].origin);
          resolve(me.services[servicename]);
        })
        .catch(function(err) {
          if (retry) {
            me.locallog('WORKAROUND for missing URL parameter rsiRegistryURI in ICAS3: try with hardcoded registryURI');
            me.registry = 'http://[::1]:80';
            me.getService(servicename, false)
            .then(function(service) {
              resolve(service);
            })
            .catch(function(err) {
              reject(err);
            });
          } else {
            reject(err);
          }
        });
      }
    });
  }

  ////////////////////////////////////////////////////////////////////////////////
  // websocket

  wsconnect(service) {
    var me = this;
    return new Promise(function(resolve, reject) {
      if (me.connections.hasOwnProperty(service.name)) {
        resolve(me.connections[service.name]);
      } else {
        var wsUri = service.origin.replace('http', 'ws');
        me.locallog('wsconnect ' + service.name + ' at ' + wsUri);
        try {
          var websocket = new WebSocket(wsUri);
          websocket.servicename = service.name;
          websocket.onopen    = function(evt) { me.onOpen(evt) };
          websocket.onclose   = function(evt) { me.onClose(evt) };
          websocket.onmessage = function(evt) { me.onMessage(evt) };
          websocket.onerror   = function(evt) { me.onError(evt) };
          me.connections[service.name] = {
            ws: websocket,
            subscriptions: [],
            connected: false
          };
          resolve(me.connections[service.name]);
        }
        catch(err) {
          reject(err.message);
        };
      }
    });
  }

  onOpen(evt) {
    var ws = evt.target;
    this.locallog('websocket connected ' + ws.servicename);
    this.connections[ws.servicename].connected = true;
    this.handleConnect(ws.servicename);
  }

  onClose(evt) {
    var ws = evt.target;
    this.locallog('websocket disconnected ' + ws.servicename);
    this.connections[ws.servicename].connected = false;

    // ToDo: reconnect retry loop and then re-subscribe
  }

  onError(evt) {
    var ws = evt.target;
    this.locallog('websocket error ' + ws.servicename + evt.message);
  }

  onMessage(evt) {
    var me = this;
    var ws = evt.target;
    this.locallog('websocket message ' + ws.servicename);
    try {
      var msg = JSON.parse(evt.data);
      if (msg && msg.type) {
        switch (msg.type) {
          case 'data':
            if (msg.data && msg.event) {
              this.handleMessage(ws.servicename, msg);
            } else {
              throw new Error('missing message element');
            }
            break;
          case 'subscribe':
            this.handleSubscribe(ws.servicename, msg);
            break;
          case 'unsubscribe':
            this.handleUnsubscribe(ws.servicename, msg);
            break;
          case 'error':
            this.handleError(ws.servicename, msg);
            break;
          default:
            me.locallog(msg);
            throw new Error('unknown message type ' + msg.type);
        }
      } else {
        throw new Error('malformed message');
      }
    } catch(e) {
      me.locallog('websocket receive error: ' + e.message);
      return;
    };
  }

  viwiget(uri) {
    var me = this;
    var opts = {
    };
    if (this.requestVersion) {
      me.locallog('viwiget request version ' + this.requestVersion);
      opts.headers = { Accept: 'application/vnd.viwi.v' + this.requestVersion + '+json' };
    }
    return fetch(uri, opts)
    .then(function(response) {
      me.locallog(response.status + '  ' + response.statusText);
      response.headers.forEach(function(val, key) {
        me.locallog(key + ': ' + val);
      });
      if (response.ok) {
        return response.json();
      } else {
        response.text()
        .then(function(body) {
          me.locallog('body: ' + body);
        });
        me.locallog('viwiget http response code not ok: ' + response.status + ' ' + response.statusText);
        throw new Error('http response code not ok: ' + response.status + ' ' + response.statusText);
      }
    })
    .then(function(result) {
      if (result && result.status && result.status == 'ok' && result.data) {
        return result.data;
      } else {
        throw new Error('invalid viwi response');
      }
    });
  }

  viwipost(uri, data) {
    var me = this;
    me.locallog('viwipost to ' + uri);
    var opts = {
      method: 'POST',
      body:    JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.requestVersion) {
      me.locallog('viwiget request version ' + this.requestVersion);
      opts.headers.Accept = 'application/vnd.viwi.v' + this.requestVersion + '+json';
    }
    return fetch(uri, opts)
    .then(function(response) {
      me.locallog(response.status + '  ' + response.statusText);
      response.headers.forEach(function(val, key) {
        me.locallog(key + ': ' + val);
      });
      if (response.status != 200 && response.status != 201 && response.status != 202) {
        response.text()
        .then(function(body) {
          me.locallog('body: ' + body);
        });
        me.locallog('http response code not 200, 201 or 202: ' + response.status + ' ' + response.statusText);
        throw new Error('http response code not 200, 201 or 202: ' + response.status + ' ' + response.statusText);
      } else {
        if (uri.endsWith('/')) {
          var location = response.headers.get('location');
          if (!location) {
            me.locallog('received headers:');
            for (var key of response.headers.keys()) {
              me.locallog(key + ': ' + response.headers.get(key));
            }
            response.text()
            .then(function(body) {
              me.locallog('body: ' + body);
            });
            me.locallog('no location header in response to create');
            throw new Error('no location header in response to create');
          }
          // understands '.' separated, relative and absolute uris:
          var elements = location.replace('.', '/').split('/');
          var id = elements.pop();
          var resource = elements.pop();
          var service = elements.pop();
          response.location = '/' + service + '/' + resource + '/' + id;
        }
        return response;
      }
    });
  }

  viwidelete(uri) {
    var me = this;
    var opts = {
      method: 'DELETE'
    };
    if (this.requestVersion) {
      me.locallog('viwiget request version ' + this.requestVersion);
      opts.headers.Accept = 'application/vnd.viwi.v' + this.requestVersion + '+json';
    }
    return fetch(uri, opts)
    .then(function(response) {
      me.locallog(response.status + '  ' + response.statusText);
      response.headers.forEach(function(val, key) {
        me.locallog(key + ': ' + val);
      });
      if (response.ok) {
        return response.json();
      } else {
        response.text()
        .then(function(body) {
          me.locallog('body: ' + body);
        });
        me.locallog('viwidelete http response code not ok: ' + response.status + ' ' + response.statusText);
        throw new Error('http response code not ok: ' + response.status + ' ' + response.statusText);
      }
    })
    .then(function(result) {
      if (result && result.status) {
        return result.status;
      } else {
        throw new Error('invalid viwi response');
      }
    });
  }

  supported(requested, versions) {
    var parts = requested.split('.');
    var req_major = parseInt(parts[0]);
    var req_minor = parseInt(parts[1]);
    var req_patch = parseInt(parts[2]);
    for (var i=0; i<versions.length; versions++) {
      var version = versions[i];
      var range = false;
      if (version.startsWith('~')) {
        version = version.replace('~', '');
        range = true;
      }
      parts = version.split('.');
      var major = parseInt(parts[0]);
      var minor = parseInt(parts[1]);
      var patch = parseInt(parts[2]);
      if (major == req_major && minor == req_minor) {
        if ((range && req_patch >= patch) || (req_patch == patch)) {
          return true;
        }
      }
    }
    return false;
  }
  
  isMaxVersion(requested, versions) {
    if (!this.supported(requested, versions)) {
      return false;
    }
    var max_major = 0;
    var max_minor = 0;
    var max_patch = 0;
    var max_range = false;
    var parts = requested.split('.');
    var req_major = parseInt(parts[0]);
    var req_minor = parseInt(parts[1]);
    var req_patch = parseInt(parts[2]);
    for (var i=0; i<versions.length; i++) {
      var version = versions[i];
      var range = false;
      if (version.startsWith('~')) {
        version = version.replace('~', '');
        range = true;
      }
      parts = version.split('.');
      var major = parseInt(parts[0]);
      var minor = parseInt(parts[1]);
      var patch = parseInt(parts[2]);
      if (major > max_major) {
        max_major = major;
        max_minor = minor;
        max_patch = patch;
        max_range = range;
      } else if (major == max_major && minor > max_minor) {
        max_minor = minor;
        max_patch = patch;
        max_range = range;
      } else if (major == max_major && minor == max_minor && patch > max_patch) {
        max_patch = patch;
        max_range = range;
      }
    }
    if (max_major == req_major && max_minor == req_minor) {
      if ((max_range && req_patch >= max_patch) || (req_patch == max_patch)) {
        return true;
      }
    }
    return false;
  }
  
  getid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }

  locallog() {
    if (!this.localdebug) return;
    var args = Array.prototype.slice.call(arguments);
    /*
    if (!this.realDeal()) {
      return console.log('viwiclient: ' + args.join(' '));
    }
    */
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
      source: 'viwiclient',
      severity: 5,
      timestamp: now,
      message: args.join(' ')
    };
    console.log(JSON.stringify(msg));
  }

  // check if we run on the target or in a dev env
  realDeal() {
    var real = true;
    if (navigator.platform.substring(0, 3) == 'Mac') real = false;
    if (navigator.platform.substring(0, 3) == 'Win') real = false;
    return real;
  }

} // class Viwiclient


//module.exports = Viwiclient;
