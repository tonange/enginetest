
const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

class ViwiSocket extends EventEmitter {

	constructor(url) {
    super();

    this._url = url;
    this._readyState = CONNECTING;

    this.startWorker();
  }

  get url() {
    return this._url;
  }
  get readyState() {
    return this._readyState;
  }

  addEventListener(type, target) {
    this.on(type, target);
  }
  set onopen(target) {
    this.on('open', target);
  }
  set onerror(target) {
    this.on('error', target);
  }
  set onclose(target) {
    this.on('close', target);
  }
  set onmessage(target) {
    this.on('message', target);
  }

  send(data) {
    this.sendMessage({type: 'send', url: this._url, data: data});
  }

  close() {
    this._readyState = CLOSING;
    this.sendMessage({type: 'close', url: this._url});
  }

  // worker protocol

  handleConnect() {
    console.log('handleConnect');
    this.sendMessage({type: 'open', url: this._url});
  }

  sendMessage(msg) {
    this.worker.port.postMessage(msg);
  }

  startWorker() {
    var me = this;
    this.worker = new SharedWorker('script/socketworker.js');
		this.worker.onerror = function(err) {
		  me.emit('error', {data: 'worker error'});
		}
		this.worker.port.addEventListener('message', function(event) {me.onMessage(event);}, false);
		this.worker.port.start();
  }

  onMessage(evt) {
    var msg = evt.data;
    if (msg) {
    switch (msg.type) {
      case 'connected':
        this.handleConnect();
        break;
      case 'onopen':
        this._readyState = OPEN;
        this.emit('open');
        break;
      case 'onclose':
        this._readyState = CLOSED;
        this.emit('close');
        break;
      case 'oneror':
        this.emit('error', {data: msg.data});
        break;
      case 'onmessage':
        this.emit('message', {data: msg.data});
        break;
      default:
        this.emit('error', 'received invalid message type: ' + msg.type);
      }
    }
	}

} // class ViwiSocket