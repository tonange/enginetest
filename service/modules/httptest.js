const dateFormat = require('dateformat');
const uuid = require('uuid');

const version = '0.1.0';

var log;

module.exports = function(router, logger) {

  log = logger;

  // echo headers
  router.get('/version', getVersion);

  // reset variables
  router.get('/reset', reset);

  // get state
  router.get('/state', getState);

  // cache tests
  // expires
  router.get('/expires', testExpires);

  // etag (+ max-age) -> if-none-match
  router.get('/etag', testEtag);

  // last-modified (+ max-age) -> if-modified-since
  router.get('/lastmodified', testLastModified);

  // no-cache
  router.get('/nocache', testNoCache);

  // max-age=0
  router.get('/maxagezero', testMaxAgeZero);

  // long cache time
  router.get('/longcache', testLongCache);

  // vary header
  router.get('/vary', testVary);

  // cookie tests
  router.get('/cookie', testCookie);

  // http status codes
  router.get('/status', returnStatus);

}

var etag = uuid.v4();
var modified = new Date().toUTCString();
var lastStatus = 404;
var expireTime = 4;
var maxAge = 4;

function reset(req, res) {
  etag = uuid.v4();
  log.info('reset etag to ' + etag);
  modified = new Date().toUTCString();
  log.info('reset last-modified to ' + modified);
  var result = {
    etag: etag,
    modified: modified
  };
  res.json(result);
}

function getVersion(req, res) {
  var response = getHead();
  response += getFrontStuff();
  response += 'request headers: \n';
  response += JSON.stringify(req.headers, null, '  ');
  response += getFoot();
  res.send(response);
}

function testVary(req, res) {
  var response = getHead();
  response += getFrontStuff();

  response += 'Check date above and id (changes with every GET): ' + uuid.v4() + '\n\n';
  response += 'The response includes a header Vary: accept-language.\n';
  response += 'The Expires header is set to 10min. Within that time requests';
  response += ' for this page must not result in a request to the server.\n';
  response += 'But when the HMI language is changed, the browser must change';
  response += ' the accept-language header and a request to this page must';
  response += ' always result in a GET request to the server.\n\n';

  response += 'request headers: \n';
  response += JSON.stringify(req.headers, null, '  ');
  response += getFoot();

  var expire = new Date(Date.now() + 60000).toUTCString();
  res.set('Expires', expire);
  res.set('Cache-Control', 'max-age=600');
  res.set('Vary', 'Accept-Language');

  res.send(response);
}

function testCookie(req, res) {

  var script = `
        function init() {
          var cookies = document.cookie;
          console.log('document.cookie', document.cookie);
          if (cookies) {
            var elem = document.getElementById('message');
            if (elem) {
              var text = '<h2 style="color:red;">FAILED: document.cookie not emtpy</h2>';
              text += '<pre>' + cookies + '</pre>';
              elem.innerHTML = text;
            }
          }
        }
        window.addEventListener('load', init, false);
`;

  var response = getHead(script);
  response += '</pre>';
  response += '<div id="message"></div>';

  // check if client sent cookie
  var cookies = parseCookies(req);
  if (!cookies.engineTestCookie) {
    // no: set a new cookie
    log.info('try to set cookie engineTestCookie');
    res.cookie('engineTestCookie',uuid.v4(), { maxAge: 900000 });
  }
  else
  {
    log.info('cookie exists (not good): ' + cookies.engineTestCookie);
    response += '<h2 style="color:red;">FAILED: received cookie: engineTestCookie in request.</h2>';
  }

  response += '<pre>';
  response += 'Load page twice.\n';
  response += 'Check request headers after 2nd load.\n';
  response += 'There must be no "cookie: engineTestCookie=(some UUID)"\n\n';

  response += getFrontStuff();
  response += 'request headers: \n';
  response += JSON.stringify(req.headers, null, '  ');
  response += getFoot();
  res.send(response);
}

function returnStatus(req, res) {
  var code = req.query['code'];
  if (code >= 400) {
    res.status(code).send('FAILED: this error page must not be visible. Status code is ' + code);
  } else {
    res.status(code).send('Status code is ' + code);
  }
}

function getState(req, res) {
  var state = {
    id: uuid.v4(),
    lastStatus: lastStatus,
    remotePort: req.connection.remotePort
  };
  res.set('Cache-Control', 'no-cache');
  res.json(state);
}

function testExpires(req, res) {
  var expire = new Date(Date.now() + (expireTime*1000)).toUTCString();
  log.info('set expires ' + expire);
  res.set('Expires', expire);
  var response = responseTemplate(req);
  response.test = 'expires';
  response.params= {
    id: uuid.v4(),
    expireTime: expireTime,
    expire: expire
  };
  var data = {
    response: JSON.stringify(response),
    test: response.test,
    text: JSON.stringify(response.request.headers, null, '  ')
  };
  res.render('cacheprobe', {data: data} );
}

function testEtag(req, res) {
  log.info('if-none-match: ' + req.headers['if-none-match']);
  var match = false;
  // process if-none-match
  if (req.headers.hasOwnProperty('if-none-match')) {
    // check against test etag
    if (etag == req.headers['if-none-match']) {
      match = true;
      log.info('etag matches');
    }
  }
  if (match) {
    lastStatus = 304;
    return res.sendStatus(304);
  }
  log.info('use etag ' + etag);
  res.set('Etag', etag);
  res.set('Cache-Control', 'max-age=' + maxAge);
  var response = responseTemplate(req);
  response.test = 'etag';
  response.params= {
    id: uuid.v4(),
    etag: etag,
    maxAge: maxAge
  };
  var data = {
    response: JSON.stringify(response),
    test: response.test,
    text: JSON.stringify(response.request.headers, null, '  ')
  };
  lastStatus = 200;
  res.render('cacheprobe', {data: data} );
}

function testLastModified(req, res) {
  log.info('if-modified-since: ' + req.headers['if-modified-since']);
  var match = false;
  // process if-modified-since
  if (req.headers.hasOwnProperty('if-modified-since')) {
    // check against test modified date
    var modifiedDate = new Date(modified);
    var requestDate = new Date(req.headers['if-modified-since']);
    if (modifiedDate <= requestDate) {
      match = true;
      log.info('modified date matches');
    }
  }
  if (match) {
    lastStatus = 304;
    return res.sendStatus(304);
  }
  log.info('set last-modified ' + modified);
  res.set('Last-Modified', modified);
  res.set('Cache-Control', 'max-age=' + maxAge);
  var response = responseTemplate(req);
  response.test = 'last-modified';
  response.params= {
    id: uuid.v4(),
    modified: modified,
    maxAge: maxAge
  };
  var data = {
    response: JSON.stringify(response),
    test: response.test,
    text: JSON.stringify(response.request.headers, null, '  ')
  };
  lastStatus = 200;
  res.render('cacheprobe', {data: data} );
}

function testNoCache(req, res) {
  res.set('Cache-Control', 'no-cache');
  var response = responseTemplate(req);
  response.test = 'no-cache';
  response.params= {
    id: uuid.v4()
  };
  var data = {
    response: JSON.stringify(response),
    test: response.test,
    text: JSON.stringify(response.request.headers, null, '  ')
  };
  res.render('cacheprobe', {data: data} );
}

function testMaxAgeZero(req, res) {
  res.set('Cache-Control', 'max-age=0');
  var response = responseTemplate(req);
  response.test = 'max-age';
  response.params= {
    id: uuid.v4(),
    maxAge: 0
  };
  var data = {
    response: JSON.stringify(response),
    test: response.test,
    text: JSON.stringify(response.request.headers, null, '  ')
  };
  res.render('cacheprobe', {data: data} );
}

function testLongCache(req, res) {
  // 1 week = 7 days * 24h * 60min * 60s * 1000ms
  var week = 7 * 24 * 60 * 60 * 1000;
  var expire = new Date(Date.now() + week).toUTCString();
  log.info('set expires ' + expire);
  res.set('Expires', expire);
  var response = responseTemplate(req);
  var now = new Date(Date.now());
  response.test = 'long cache time, expires: ' + expire + ', created: ' + now.toUTCString();
  response.params= {
    id: uuid.v4(),
    expireTime: expireTime,
    expire: expire
  };
  var data = {
    response: JSON.stringify(response),
    test: response.test,
    text: JSON.stringify(response.request.headers, null, '  ')
  };
  res.render('cacheprobe', {data: data} );
}

function responseTemplate(req) {
  var now = new Date();
  var response = {
    time: now,
    request: {}
  };
  // originator
  response.request.remotePort = req.connection.remotePort;
  response.request.headers = req.headers;
  return response;
}

function getFrontStuff() {
  var result = ''
  var d = new Date();
  var now = dateFormat(d, "UTC:HH:MM:ss.l yyyymmdd");
  result += '\n' + now + ' (UTC) - server version: ' + version + '\n\n';
  return result;
}

function getHead(script) {
  var html = `<!DOCTYPE html>
<html lang="en">
  <head>
      <meta charset="utf-8">
      <title>echo request headers</title>
      <style>
        body {
          color: #fff;
          background-color: #000;
          font: 16px Arial, sans-serif;
        }
        pre {
          white-space: pre-wrap;       /* css-3 */
        }
      </style>
      `;
  if (script) {
    html += '      <script>\n';
    html += script;
    html += '      </script>\n';
  }
  html += `     </head>
  <body>
    <pre>
`;
  return html;
}

function getFoot() {
  var html = `
    </pre>
  </body>
</html>
`;
  return html;
}

function parseCookies (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}
