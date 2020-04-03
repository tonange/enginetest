
class AppSpeller extends Viwiclient {

	constructor(registry, options) {
    super(registry);
    this.polyfill();

    this.options = options;
    this.useMatchlist = false;
    this.useEnabledCharacters = false;
    if (this.options.hasOwnProperty('matchlistData') && this.isArray(this.options.matchlistData)) {
      log('AppSpeller using matchlist');
      this.useMatchlist = true;
      if (this.options.hasOwnProperty('useEnabledCharacters')) {
        this.useEnabledCharacters = this.options.useEnabledCharacters;
        log('AppSpeller useEnabledCharacters ' + this.useEnabledCharacters);
      }
    }
    if (!this.options.hasOwnProperty('value')) {
      this.options.value = '';
    }
    if (!this.options.hasOwnProperty('type')) {
      this.options.type = 'text';
    }
    this.instance = null;
    this.speller = null;
    this.matchlist = null;

    var me = this;
    this.element = document.getElementById(this.options.id);
    if (this.element) {
      log('AppSpeller found element ' + this.options.id);
      this.showValue();
      this.element.addEventListener('touchstart', function(event) {
        me.focus(event);
      }, {passive: true});
    }

    this.on('data', function(msg) {
      if (msg && msg.id && msg.data) {
        if (msg.id === me.subscriptionId) {
          log('AppSpeller updated');
          log(msg.data);
          if (msg.data.state !== me.spellerData.state) {
            setTimeout(function() {
              me.emit('state', msg.data.state);
            }, 0);
            if (msg.data.state == 'canceled') {
              msg.data.value = '';
              me.closeSpeller();
            } else if (msg.data.state == 'confirmed') {
              me.closeSpeller();
            } else if (msg.data.state == 'matchSelected') {
              msg.data.value = me.options.matchlistData[msg.data.selectedMatchTextId];
              me.closeSpeller();
            }
          }
          if (msg.data.value !== me.spellerData.value) {
            me.updateValue(msg.data.value);
            setTimeout(function() {
              me.emit('update', msg.data.value);
            }, 0);
          }
          me.spellerData = msg.data;
        }
      }
    });
    this.on('gone', function(msg) {
      log('AppSpeller gone');
      setTimeout(function() {
        me.emit('closed');
      }, 0);
    });
    
  }

  set browserInstance(webEngine) {
    log('AppSpeller instance=' + webEngine.uri);
    this.instance = webEngine.uri;
  }

  close() {
    log('AppSpeller close');
    this.closeSpeller();
  }

  showValue() {
    var value = this.options.value;
    // substitute **** in pin anad password spellers
    if (this.options.type == 'password' || this.options.type == 'pin') {
      value = value.replace(/./g, '*');
    }
    this.element.innerHTML = value;

    // placeholder/color
    this.element.style.color = 'white';
    if (this.options.hasOwnProperty('placeholder')) {
      if (isEmpty(this.options.value) && this.options.placeholder) {
        this.element.innerHTML = this.options.placeholder;
      }
      if (this.element.innerHTML == this.options.placeholder) {
        this.element.style.color = 'orange';
      }
    }
  }

  updateValue(value) {
    this.options.value = value;
    this.showValue();
    if (this.useMatchlist && this.speller) {
      // prepare matchlist
      var matchTexts = this.getMatchtexts(this.options.matchlistData, value);
      // prepare allowed characters
      var enabledCharacters = this.getEnabledCharacters(matchTexts, value);
      var data = {
        matchTexts: matchTexts
      };
      var me = this;
      var uri = this.spellerData.matchlist.uri;
      this.post('browser', uri, data)
      .then(function (response) {
        data = {
          enabledCharacters: enabledCharacters
        };
        uri = me.spellerData.uri;
        return me.post('browser', uri, data);
      });
    }
  }

  focus(event) {
    log('AppSpeller focus');

    if (!this.instance) {
      log('AppSpeller ERROR instance not set');
      return;
    }

    if (this.speller !== null) {
      log('AppSpeller already open: no  action');
      return;
    }

    // get current value, placeholder, title, type
    this.spellerData = {
      name: 'enginetestTestSpeller',
      value: this.options.value,
      placeholder: this.options.placeholder,
      title: this.options.title,
      type: this.options.type,
      useMatchlist: this.useMatchlist,
      useEnabledCharacters: this.useEnabledCharacters,
      instance: this.instance,
      state: 'active'
    };

    log(this.spellerData);

    if (this.useMatchlist) {
      // prepare matchlist
      var matchlist = {
        matchTexts: this.getMatchtexts(this.options.matchlistData, this.spellerData.value)
      };

      // prepare allowed characters
      this.spellerData.enabledCharacters = this.getEnabledCharacters(matchlist.matchTexts, this.spellerData.value);

      // POST matchlist (create or update)
      var uri = "matchlists/";
      if (this.matchlist) {
        uri = this.matchlist;
      }
      var me = this;
      this.post('browser', uri, matchlist)
      .then(function (response) {
        if (response.status && response.status == 'error') {
          throw new Error('Error: ' + response.code + ' ' + response.message);
        }
        if (!me.matchlist) {
          if (!response.location) {
            throw new Error('POST to matchlists/ did not return a location');
          }
          me.matchlist = response.location;
          log('AppSpeller created matchlist ' + response.location);
        }
        me.spellerData.matchlist = me.matchlist;
        me.openSpeller(me.spellerData);
      });
      // ToDo: catch -> log
    } else {
      this.openSpeller(this.spellerData);
    } // useMatchlist

  }

  openSpeller(speller) {
    // POST speller
    var me = this;
    this.post('browser', 'spellers/', speller)
    .then(function (response) {
      if (response.status && response.status == 'error') {
        throw new Error('Error: ' + response.code + ' ' + response.message);
      }
      if (!response.location) {
        throw new Error('POST to spellers/ did not return a location');
      }
      me.speller = response.location;
      log('AppSpeller created speller ' + response.location);
      
      // subscribe to speller
      var spellerId = response.location.split('/').pop();
      me.subscriptionId = me.subscribe('browser', {
        type: 'subscribe',
        event: '/browser/spellers/' + spellerId
      });
    });
    // ToDo: catch -> log
  }

  closeSpeller() {
    // speller still exists: delete it
    if (this.speller) {
      this.delete('browser', this.speller);
      this.speller = null;
      this.delete('browser', this.spellerData.matchlist.uri);
      this.matchlist = null;
    }    
  }

  getMatchtexts(matchlistData, value) {
    var match = '';
    if (value) {
      match = value.toLowerCase();
    }
    var matchTexts = matchlistData.filter(function(item) {
      return item.toLowerCase().indexOf(match) === 0;
    })
    return matchTexts;
  }

  getEnabledCharacters(matchTexts, value) {
    var enabledCharacters = '';
    matchTexts.map(function(text) {
      var next = text.charAt(value.length).toLowerCase();
      if (!enabledCharacters.includes(next)) {
        enabledCharacters += next;
      }
    });
    enabledCharacters += enabledCharacters.toUpperCase();
    return enabledCharacters;
  }

  polyfill() {

    if (!String.prototype.charAt) {
      log('need polyfill for charAt');
      Object.defineProperty(String.prototype, 'charAt', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function(index) {
          if (this === null || this === undefined) {
            throw TypeError('"this" is null or undefined');
          }
          return (isFinite(index) && ('' + this)[index | 0]) || '';
        }
      });
    }

    if (!String.prototype.toLowerCase) {
      log('need polyfill for toLowerCase');
      Object.defineProperty(String.prototype, 'toLowerCase', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function() {
          // TODO: Support Unicode characters.
          if (this === null || this === undefined) {
            throw TypeError('"this" is null or undefined');
          }
          var str = '' + this;
          var lower = 'abcdefghijklmnopqrstuvwxyz';
          var upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          var outStr = '';
          for (var i = 0; i < str.length; i++) {
            var x = upper.indexOf(str[i]);
            if (x == -1) {
              outStr += str[i];
            } else {
              outStr += lower[x];
            }
          }
          return outStr;
        }
      });
    }

    if (!String.prototype.toUpperCase) {
      log('need polyfill for toUpperCase');
      Object.defineProperty(String.prototype, 'toUpperCase', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function() {
          // TODO: Support Unicode characters.
          if (this === null || this === undefined) {
            throw TypeError('"this" is null or undefined');
          }
          var str = '' + this;
          var lower = 'abcdefghijklmnopqrstuvwxyz';
          var upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          var outStr = '';
          for (var i = 0; i < str.length; i++) {
            var x = lower.indexOf(str[i]);
            if (x == -1) {
              outStr += str[i];
            } else {
              outStr += upper[x];
            }
          }
          return outStr;
        }
      });
    }
  }

  isArray(o) {
    return Object.prototype.toString.call(o) === '[object Array]';
  }

} // class AppSpeller
