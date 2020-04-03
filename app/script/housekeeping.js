
class Housekeeping extends Viwiclient {

  constructor(name, engineInstance, registry) {
    super(registry);
    this.name = name;
    this.subscribing = false;
    this.engineInstance = engineInstance;
    if (this.engineInstance.startsWith('http')) {
      this.engineInstanceUri = this.engineInstance;
    } else {
      this.engineInstanceUri = this.registryUri + this.engineInstance;
    }
    this.log('engineInstanceUri', this.engineInstanceUri);
    var url = new URL(this.engineInstanceUri);
    this.event = url.pathname;
    this.servicename = this.event.split('/')[1];
    this.resource = this.event.split('/')[2];
    this.id = this.event.split('/')[3];
  }

  setRunning() {
    this.setEngineState({runState: 'running'});
  }

  setSuspended() {
    this.setEngineState({runState: 'suspended'});
  }

  setUnstoppable(state) {
    var val = Boolean(state);
    this.setEngineState({unstoppable: val});
  }

  setStatusbar(state) {
    var show = Boolean(state);
    this.setEngineState({statusBarVisible: show});
  }

  setNHTSA(state) {
    var val = Boolean(state);
    this.setEngineState({hmiHandleNHTSA: state});
  }

  setSignal(signal) {
    this.setEngineState({signa: signal});
  }

  setEngineState(state) {
    var me = this;
    var d = new Date();
    this.log(d.toISOString() + ': setState ' + JSON.stringify(state));
    this.post(this.servicename, this.resource + '/' + this.id, state)
    .then(function() {
      me.subscribeEngineState(true);
    });
  }

  subscribeEngineState() {
    var me  = this;
    if (this.subscribing) return;
    this.subscribing = true;
    var subscription = {
      type: 'subscribe',
      event: this.event
    };
    this.on('data', function(msg) { me.onData(msg.data) });
    this.subscribe(this.servicename, subscription);
  }

  onData(data) {
    this.emit('instanceUpdate', data);
    if (data && data.runState && data.runState == 'suspendRequested') {
      this.log('received suspendRequested: set suspended');
      this.setSuspended();
    }
  }

  log() {
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
      source: this.name,
      severity: 5,
      timestamp: now,
      message: args.join(' ')
    };
    console.log(JSON.stringify(msg));
  }

} // class Housekeeping
