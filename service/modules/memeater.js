const process = require('process');
const os = require('os');

var stomach;
var eaten = 0;

console.log('memeater', process.pid ,'started, free:', Math.round(os.freemem()/(1024*1024)), 'MB');

eatMemory(1024);

function eatMemory(size) {
  console.log('eatMemory', size, 'MB');
  var loops = size;
  stomach = Array(loops);
  var eater = setInterval(function() {
    // 64 bit number?
    var portion = 128*1024;
    stomach[eaten] = Array(portion);
    try {
      for (var i=0; i<(portion); i++) {
        stomach[eaten][i] = i;
      }
      eaten++;
      if (eaten > loops - 1) {
        console.log('memeater', process.pid ,'done eating, free:', Math.round(os.freemem()/(1024*1024)), 'MB');
        clearInterval(eater);
      }
    }
    catch(err) {
      console.log('memeater', process.pid ,'ERROR: ' + err.message);
      clearInterval(eater);
    }
  }, 100);
}

setInterval(function() {
  console.log('memeater', process.pid ,'still alive, eaten', eaten, 'MB, free:', Math.round(os.freemem()/(1024*1024)), 'MB');
}, 10000);