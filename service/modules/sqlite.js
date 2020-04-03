const dateFormat = require('dateformat');
const uuid = require('uuid');
const fse = require('fs-extra');

// require('sqlite3')   (see below)
// require('sqlite')    (see below)


const LOCAL_STORAGE = '/local_storage/';

const DB_PATH = 'database';
const DB_NAME = 'foods.db';
const INIT_FILE = __dirname + '/../initdata/foods.sql';

var existed = false;
var log;
var db;


// ToDo: what is the final root directory for writing app data?
// preferred:
var db_path = LOCAL_STORAGE + DB_PATH;
if (!fse.existsSync(LOCAL_STORAGE)) {
  // fallback to current PCC implementation
  db_path = __dirname + '/../../' + DB_PATH;
}


module.exports = function(router, logger) {

  log = logger;

  log.info('DB_PATH: ' + db_path);
  log.info('INIT_FILE: ' + INIT_FILE);

  if (!fse.existsSync(LOCAL_STORAGE)) {
    log.error('ERROR: path ' + LOCAL_STORAGE + ' does not exist!');
  }
  
  // sqlite3 available as global module ($NODE_PATH)
  router.get('/sqlite/available', available);

  // sqlite3 working on DB in memory
  router.get('/sqlite/working', working);

  // persistent database
  router.get('/database/exists', existsDB);
  router.get('/database/init', initDB);
  router.get('/database/query', queryDB);
  router.get('/database/fts', ftsTest);
  router.get('/database/delete', deleteDB);
}

function existsDB(req, res) {
  existOrInitDB(req, res, null);
}

function initDB(req, res) {
  existOrInitDB(req, res, INIT_FILE);
}

function existOrInitDB(req, res, initfile) {
  var response = getHead();
  response += getFrontStuff();

  existed = false;
  var path = db_path + '/' + DB_NAME;
  openDB(db_path, DB_NAME, initfile)
  .then(function() {
    if (existed) {
      response += 'Persistent database ' + path + ' was found<br>';
    } else {
      if (initfile) {
        response += 'Persistent database ' + path + ' created and initiaized<br>';
      } else {
        response += 'Persistent database ' + path + ' does not exist<br>';
        fse.unlink(path)
      }
    }
    return db.close();
  })
  .then(function() {
    log.info('database closed');
    response += getFoot();
    res.send(response);
    return true;
  })
  .catch(function(err) {
    log.info('ERROR: ' + err.message);
    response += getFail() + 'ERROR checking for persistent database '
                + path + ': ' + err.message + '<br>';
    response += getFoot();
    res.send(response);
  });
}

function queryDB(req, res) {
  var response = getHead();
  response += getFrontStuff();

  existed = false;
  var path = db_path + '/' + DB_NAME;
  openDB(db_path, DB_NAME, null)
  .then(function() {
    if (existed) {
      response += 'Query<br>';
      response += '<pre>'
                  + 'SELECT foods.name AS food, food_types.name AS type\n'
                  + '    FROM foods, food_types\n'
                  + '    WHERE foods.type_id=food_types.id\n'
                  + '    ORDER BY foods.name\n'
                  + '    LIMIT 10'
                  + '</pre>';
      return db.all('SELECT foods.name AS food, food_types.name AS type'
                    + '    FROM foods, food_types'
                    + '    WHERE foods.type_id=food_types.id'
                    + '    ORDER BY foods.name'
                    + '    LIMIT 10');
    } else {
      fse.unlink(path)
      throw new Error('Persistent database ' + path + ' does not exist');
    }
  })
  .then(function(result) {
    if (result) {
      log.info('query result:');
      log.info(result);

      response += 'Result<br>';
      response += '<pre>'
      for (i=0; i<result.length; i++) {
        response += i + ': ';
        response += JSON.stringify(result[i]);
        response += '\n';
      }
      response += '</pre>'
    }
    return db.close();
  })
  .then(function() {
    log.info('database closed');
    response += getFoot();
    res.send(response);
    return true;
  })
  .catch(function(err) {
    log.info('ERROR: ' + err.message);
    response += getFail() + 'ERROR on database '
                + db_path + '/' + DB_NAME + ': ' + err.message + '<br>';
    response += getFoot();
    res.send(response);
  });
}

function ftsTest(req, res) {
  var response = getHead();
  response += getFrontStuff();

  existed = false;
  var path = db_path + '/' + DB_NAME;
  openDB(db_path, DB_NAME, null)
  .then(function() {
    if (existed) {
      response += 'Query<br>';
      response += '<pre>'
                  + 'CREATE VIRTUAL TABLE EpisodeFoods USING fts4(food, type, episode)'
                  + '</pre>';
      return db.exec('CREATE VIRTUAL TABLE EpisodeFoods USING fts4(food, type, episode)');
    } else {
      fse.unlink(path)
      throw new Error('Persistent database ' + path + ' does not exist');
    }
  })
  .then(function() {
    response += '<pre>'
                + 'INSERT INTO EpisodeFoods SELECT f.name AS food, ft.name AS type, e.name AS episode\n'
                + '    FROM foods f\n'
                + '    INNER JOIN food_types ft on f.type_id=ft.id\n'
                + '    INNER JOIN foods_episodes fe ON f.id=fe.food_id}\n'
                + '    INNER JOIN episodes e ON fe.episode_id=e.id'
                + '</pre>';
    return db.exec('INSERT INTO EpisodeFoods SELECT f.name AS food, ft.name AS type, e.name AS episode'
                    + '    FROM foods f'
                    + '    INNER JOIN food_types ft on f.type_id=ft.id'
                    + '    INNER JOIN foods_episodes fe ON f.id=fe.food_id'
                    + '    INNER JOIN episodes e ON fe.episode_id=e.id');
  })
  .then(function() {
    response += '<pre>'
                + "SELECT food, type, episode FROM EpisodeFoods WHERE EpisodeFoods MATCH 'Soup'"
                + '</pre>';
    return db.all('SELECT food, type, episode FROM EpisodeFoods WHERE EpisodeFoods MATCH ?', 'Soup');
  })
  .then(function(result) {
    if (result) {
      log.info('query result:');
      log.info(result);

      response += 'Result<br>';
      response += '<pre>'
      for (i=0; i<result.length; i++) {
        response += i + ': ';
        response += JSON.stringify(result[i]);
        response += '\n';
      }
      response += '</pre>'
    }
    return db.exec('DROP TABLE EpisodeFoods');
  })
  .then(function() {
    return db.close();
  })
  .then(function() {
    log.info('database closed');
    response += getFoot();
    res.send(response);
    return true;
  })
  .catch(function(err) {
    log.info('ERROR: ' + err.message);
    response += getFail() + 'ERROR on database '
                + db_path + '/' + DB_NAME + ': ' + err.message + '<br>';
    response += getFoot();
    res.send(response);
  });
};


function deleteDB(req, res) {
  var response = getHead();
  response += getFrontStuff();

  var path = db_path + '/' + DB_NAME;
  fse.unlink(path)
  .then(function() {
    log.info('deleted DB ' + path);
    response += 'deleted DB ' + path;
    response += getFoot();
    res.send(response);
    return true;
  })
  .catch(function(err) {
    log.info('could not delete DB ' + err.message);
    response += 'could not delete DB '  + path + ': '+ err.message;
    response += getFoot();
    res.send(response);
  })
}

function available(req, res) {
  var response = getHead();
  response += getFrontStuff();

  var found = false;
  try {
    var sqlite3 = require('sqlite3').verbose();
    log.info('PASSED: found and loaded sqlite3 module');
    response += getPass() + 'sqlite3 module found and loaded';
    found = true;
  } catch(err) {
    log.error('FAILED: could not open sqlite3 module: ' + err.message);
    response += getFail() + 'could not open sqlite3 module: ' + err.message;
  }

  response += getFoot();
  res.send(response);
}

function working(req, res) {
  var response = getHead();
  response += getFrontStuff();

  var found = false;
  try {
    var sqlite3 = require('sqlite3').verbose();
    log.info('found and loaded sqlite3 module');
    found = true;
  } catch(err) {
    log.error('FAILED: could not open sqlite3 module: ' + err.message);
    response += getFail() + 'could not open sqlite3 module: ' + err.message;
  }

  if (found) {
    try {
      var testdb = new sqlite3.Database(':memory:');
      response += "created test database in memory<br>";
      log.info('could create test database in memory');

      testdb.serialize(function() {
        response += "CREATE TABLE lorem (info TEXT)<br>";
        testdb.run("CREATE TABLE lorem (info TEXT)");

        response += "INSERT INTO lorem VALUES (?)<br>";
        var stmt = testdb.prepare("INSERT INTO lorem VALUES (?)");
        for (var i = 0; i < 10; i++) {
          stmt.run("Ipsum " + i);
        }
        stmt.finalize();

        response += "SELECT rowid AS id, info FROM lorem<br>";
        testdb.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
          log.debug(row.id + ": " + row.info);
        });
      });

      testdb.close();

      response += getPass() + 'could create test database in memory and use it';

    } catch(err) {
      log.error('ERROR using sqlite3 module: ' + err.message);
      response += getFail() + 'could not open sqlite3 module: ' + err.message;
    }
  }

  response += getFoot();
  res.send(response);
}

function getFrontStuff() {
  var result = ''

  return result;
}


function openDB(path, name, initfile) {
  var dbfile = path + '/' + name;
  return new Promise(function(resolve, reject) {
    try {
      var sqlite3 = require('sqlite3');
      log.info('found sqlite3 module');
      db = require('sqlite');
    } catch(err) {
      log.info('FAILED: could not open sqlite3 module: ' + err.message);
      return reject('FAILED: could not open sqlite3 module: ' + err.message);
    }

    fse.mkdir(path)
    .then(function() {
      log.info('created dir ' + path);
      return true;
    })
    .catch(function(err) {
      if (err.code === 'EEXIST') {
        log.info('dir ' + path + ' already exits');
        return true;
      } else {
        throw new Error(err.message);
      }
    })
    .then(function() {
      return db.open(dbfile, { Promise });
    })
    .then(function() {
      log.info('database ' + dbfile + ' opened');
      return db.get('SELECT name FROM sqlite_master WHERE type=? AND name=?', 'table', 'foods');
    })
    .then(function(result) {
      if (result && result.name && result.name == 'foods') {
        log.info('found table foods');
        existed = true;
        return true;
      }
      log.info('table foods not found');
      if (initfile) {
        return setupDB(db, initfile);
      } else {
        // no initfile: just check
        return true;
      }
    })
    .then(resolve)
    .catch(function(err) {
      log.info('openDB failed: ' + err.message);
      reject(err);
    });
  });
}


function setupDB(db, initfile) {
  return new Promise(function(resolve, reject) {
    log.info('setupDB from ' + initfile);
    fse.readFile(initfile, 'utf8')
    .then(function(sql) {
      return(db.exec(sql));
    })
    .then(function() {
      log.info('initialized database');
      resolve();
    })
    .catch(function(err) {
      reject(err);
    });
  });
}



function getHead() {
  var html = `<!DOCTYPE html>
<html lang="en">
  <head>
      <meta charset="utf-8">
      <title>SQLite tests</title>
      <style>
        body {
          color: #fff;
          background-color: #000;
          font: 16px Arial, sans-serif;
          line-height: 150%;
        }
        pre {
          border-top: 1px solid white;
          border-bottom: 1px solid white;
          margin-left: 20px;
          margin-right: 20px;
        }
        .green {
          color: #5f5;
        }
        .orange {
          color: orange;
        }
        .left {
          float: left;
          margin-right: 10px;
        }
      </style>
  </head>
  <body>
    <h3>SQLite test backend result</h3>
    <div>
`;
  return html;
}

function getPass() {
  return '<div class="green left">PASS</div>';
}

function getFail() {
  return '<div class="orange left">FAIL</div>';
}

function getFoot() {
  var html = `
    </div>
  </body>
</html>
`;
  return html;
}
