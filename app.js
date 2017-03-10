var express = require('express');
var session = require('express-session');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var monk = require('monk');
var db = monk('localhost:27017/my_irc');
var MongoClient = require('mongodb').MongoClient;
var URL = 'mongodb://localhost:27017/my_irc';
var sess;
var tab_room = [];
var clients = [];
var users = [];
var channel = [];
var user_login;
var sha1 = require('sha1');
var current_room;

MongoClient.connect(URL, function(err, database) {
  if (err) return;

  console.log('Database Connected');
  db = database;
});

app.use(function(req,res,next){
  req.db = db;
  next();
});

app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 600000 }, resave: true, saveUninitialized: true }));

app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');



// Get ----------------------------------------------------->

app.get('/', function(req, res){
    sess = req.session;
    if (sess.login) {
        res.redirect('/index');
    }
    else {
        res.redirect('/home');
    }
});


app.get('/home', function(req, res){
    sess = req.session;
    if (sess.login) {
        res.redirect('/index');
    }
    else {
        res.sendFile(__dirname + '/views/home.html');
    }
});
app.get('/my_account', function(req, res) {
    sess = req.session;
    if (sess.login) {
        db.collection('users').find({username: sess.login}).toArray(function(err, results) {
            if (!err) {
                if (results.length > 0) {
                    user_login = sess.login;
                    res.render('account', {
                        login: results[0].username,
                        email: results[0].email,
                        password: "",
                        alert: ""
                    });
                }
            }
            else {
                res.redirect('/index');
            }
        });
    }
    else {
        res.redirect('/home');
    }
});
app.get('/inscription', function(req, res){
    sess = req.session;
    if (sess.login) {
        res.redirect('/home');
    }
    else {
        res.render('register', {
            alert: ''
        });
    }
});
app.get('/deconnexion', function(req, res){
    req.session.destroy();
    res.redirect('/home');
});

app.get('/index', function(req, res){
    sess = req.session;
    if (sess.login) {
        user_login = sess.login;
        res.render('index', {
            users: sess.login
        });
    }
    else {
        res.redirect('/home');
    }
});

app.get('/admin', function(req, res){
    sess = req.session;
    if (sess.login && sess.login == "root") {
        user_login = sess.login;
        res.render('admin', {
            login: sess.login,
            alert: ""
        });
    }
    else {
        res.redirect('/index');
    }
});


app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({
    extended: true
}));

/**bodyParser.json(options)
 * Parses the text as JSON and exposes the resulting object on req.body.
 */

app.use(bodyParser.json());



// Post ----------------------------------------------------->



app.post("/connexion", function (req, res) {
    //req.body.login
    db.collection('users').find({username: req.body.login, password: sha1(req.body.password)}).toArray(function(err, results) {
        if (err) {
            res.sendFile(__dirname + '/views/home.html');
        }
        else {
            if (results.length > 0) {
                sess = req.session;
                sess.login = req.body.login;
                user_login = sess.login;
                res.redirect('/index');
            }
            else {
                res.redirect('/home');
            }
        }
    });
});

app.post("/register", function (req, res) {
    //req.body.login
    function validateEmail(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }
    if (req.body.login == "") {
        res.render('register', {
            alert: 'Veuillez entrez un login !'
        });
        return false;
    }
    else if (req.body.email == "" || validateEmail(req.body.email) === false) {
        res.render('register', {
            alert: 'Veuillez entrez une adresse mail valide !'
        });
        return false;
    }
    else if (req.body.password.length < 4) {
        res.render('register', {
            alert: 'Votre mot de passe doit contenir au moins 4 caractères !'
        });
        return false;
    }
    db.collection('users').find({username: req.body.login}).toArray(function(err, results) {
        if (!err) {
            if (results.length === 0) {
                MongoClient.connect(URL, function (err, db) {
                    if (!err) {
                        db.command({
                            insert: "users",
                            documents: [{username: req.body.login, email: req.body.email, password: sha1(req.body.password)}]
                        }, function (err, result) {
                            console.log(result);
                        });
                    }
                });
                res.redirect('/home');
            }
            else {
                res.render('register', {
                    alert: 'Cette utilisateur existe deja en base de donnée veuillez choisir un autre login !'
                });
            }
        }
        else {
            res.redirect('/inscription');
        }
    });
});
app.post("/account", function (req, res) {
    sess = req.session;
    function validateEmail(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }
    if (req.body.login == "") {
        res.render('account', {
            alert: 'Veuillez entrez un login !',
            login: sess.login,
            email: req.body.email,
            password: req.body.password
        });
        return false;
    }
    else if (req.body.email == "" || validateEmail(req.body.email) === false) {
        res.render('account', {
            alert: 'Veuillez entrez une adresse mail valide !',
            login: req.body.login,
            email: req.body.email,
            password: req.body.password
        });
        return false;
    }
    else if (req.body.password.length < 4) {
        res.render('account', {
            alert: 'Votre mot de passe doit contenir au moins 4 caractères !',
            login: req.body.login,
            email: req.body.email,
            password: req.body.password
        });
        return false;
    }
    if (sess.login != req.body.login) {
        db.collection('users').find({username: req.body.login}).toArray(function (err, results) {
            if (!err) {
                if (results.length === 0) {
                    MongoClient.connect(URL, function (err, db) {
                        if (!err) {
                            db.collection('users').update({username: sess.login}, {username: req.body.login, email: req.body.email, password: sha1(req.body.password)}, function (err, result) {
                                if (!err) {
                                    sess.login = req.body.login;
                                    res.redirect('/my_account');
                                }
                            });
                        }
                    });
                }
                else {
                    res.render('account', {
                        alert: 'Cette utilisateur existe deja en base de donnée veuillez choisir un autre login !',
                        login: sess.login,
                        email: req.body.email,
                        password: req.body.password
                    });
                }
            }
            else {
                res.redirect('/my_account');
            }
        });
    }
    else {
        MongoClient.connect(URL, function (err, db) {
            if (!err) {
                db.collection('users').update({username: req.body.login}, {username: req.body.login, email: req.body.email, password: sha1(req.body.password)}, function (err, result) {
                });
            }
        });
        res.redirect('/my_account');
    }
});

app.post('/send/:room/', function (req, res) {
    var room = req.params.room;
    var message = req.body;
    io.sockets.in(room).emit('message', { room: room, message: message});
    res.end('message sent');
});





// Sockets ----------------------------------------------------->




io.on('connection', function (socket) {
  if (user_login !== undefined) {
    socket.nickname = user_login;
    users[socket.id] = socket.nickname;
    io.sockets.in("home").emit('in_room', { room: "home", author: user_login});
    var test = false;
    for (var u = 0; u < clients.length; u++) {
      if (clients[u][0] == socket.id) {
        test = true;
      }
    }
    if (test === false) {
      clients.push([socket.id, user_login]);
    }
  }
  if (channel[socket.id] === undefined) {
    channel[socket.id] = [];
  }
  channel[socket.id].push("home");
  socket.join("home");
  current_room = "home";
  //clients.push(socket.id + "/" + sess.login);
  socket.on('make_admin', function(msg) {
    for (var o = 0; o < channel[socket.id].length; o++) {
        socket.leave(channel[socket.id][o]);
    }
  });

  socket.on('root_delete', function(msg) {
    db.collection('channel').find({name: msg.search}).toArray(function(err, results) {
      if (!err) {
        if (results.length > 0) {
          MongoClient.connect(URL, function (err, db) {
            if (!err) {
              db.collection('channel').remove({name: msg.search}, function(err, results) {
                if (!err) {
                  io.sockets.emit('message', {author: "root", message: "Channel " + msg.search + " as been removed !"});
                  MongoClient.connect(URL, function (err, db) {
                    if (!err) {
                      db.command({ insert: "message",
                        documents: [ {user: "root", commande: '/delete', message: "root deleted room " + msg.search } ]}, function (err, result) {
                      });
                    }
                  });
                }
              });
            }
          });
        }
      }
    });
  });

  socket.on('root_rename', function(msg) {
    db.collection('channel').find({name: msg.search}).toArray(function(err, results) {
      if (!err) {
        if (results.length > 0) {
          MongoClient.connect(URL, function (err, db) {
            if (!err) {
              db.collection('channel').update({name: msg.search}, {name: msg.newvalue, created: results[0].created,last_connect: results[0].last_connect}, function (err, result) {
                if (!err) {
                  io.sockets.emit('message', {author: "root", message: "Channel " + msg.search + " as been rename to " + msg.newvalue});
                  MongoClient.connect(URL, function (err, db) {
                    if (!err) {
                      db.command({ insert: "message",
                        documents: [ {user: "root", commande: '/rename', message: "root rename room " + msg.search } ]}, function (err, result) {
                      });
                    }
                  });
                }
              });
            }
          });
        }
      }
    });
  });

  socket.on('global', function(msg) {
    io.sockets.emit('message', {author: "root", message: msg.search});
    MongoClient.connect(URL, function (err, db) {
      if (!err) {
        db.command({ insert: "message",
          documents: [ {user: "root", commande: '/root', message: msg.search } ]}, function (err, result) {
        });
      }
    });
  });

  socket.on('join_room', function (room) {
    if (room.room == " " || room.room == "/" || room.room === "") {
      room.room = "home";
    }
    db.collection('channel').find({name: room.room}).toArray(function(err, results) {
      if (!err) {
        if (results.length === 0) {
          MongoClient.connect(URL, function (err, db) {
            if (!err) {
              var date = new Date();
              date = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
              db.command({ insert: "channel",
                documents: [ {name: room.room, created: date, last_connect: date } ]}, function (err, result) {
              });
            }
          });
        }
        else {
          MongoClient.connect(URL, function (err, db) {
            if (!err) {
              var date = new Date();
              date = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
              db.collection('channel').update({name: room.room}, {name: room.room, created: results[0].created,last_connect: date}, function (err, result) {
              });
            }
          });
        }
      }
    });
    MongoClient.connect(URL, function (err, db) {
      if (!err) {
        var date = new Date();
        date = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
        db.command({ insert: "message",
          documents: [ {user: room.author, commande: '/join', message: room.author + " joining room " + room.room } ]}, function (err, result) {
        });
      }
    });
    socket.nickname = room.author;
    users[socket.id] = socket.nickname;
    channel[socket.id].push(room.room);
    socket.join(room.room);
      io.sockets.in(current_room).emit('switch_room', { room: room.room, author: room.author});
      current_room = room.room;
    io.sockets.in(room.room).emit('in_room', { room: room.room, author: room.author});
    io.sockets.to(socket.id).emit('nav_room', { room: room.room, author: room.author});
  });
  socket.on('list_room', function (data) {
    if (data.search == 'all') {

      db.collection('channel').find().toArray(function(err, results) {
        for (var e = 0; e < results.length; e++) {
          tab_room.push(results[e].name);
        }
        io.sockets.to(socket.id).emit('list_message', {list: tab_room});
        tab_room = [];
      });
    }
    else {
      db.collection('channel').find({name: {'$regex': data.search} }).toArray(function(err, results) {
        for (var e = 0; e < results.length; e++) {
          tab_room.push(results[e].name);
        }
        io.sockets.to(socket.id).emit('list_message_search', {list: tab_room});
        tab_room = [];
      });
    }
    MongoClient.connect(URL, function (err, db) {
      if (!err) {
        var date = new Date();
        date = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
        db.command({ insert: "message",
          documents: [ {user: user_login, commande: '/list', message: "list room" } ]}, function (err, result) {
        });
      }
    });
  });
  socket.on('leave_room', function (data) {
    io.sockets.in(data.search).emit('leaving_room', data);
    io.sockets.to(socket.id).emit('nav_remove', data);
    var tab_channel = [];
    for (var o = 0; o < channel[socket.id].length; o++) {
      if (channel[socket.id][o] != data.search) {
        tab_channel.push(channel[socket.id][o]);
          current_room = channel[socket.id][o];
      }
    }
    channel[socket.id] = tab_channel;
    MongoClient.connect(URL, function (err, db) {
      if (!err) {
        var date = new Date();
        date = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
        db.command({ insert: "message",
          documents: [ {user: user_login, commande: '/part', message: "leaving room " + data.search } ]}, function (err, result) {
        });
      }
    });
      socket.leave(data.search);
  });

  socket.on('list_users', function (room) {
    var response = [];
      if (socket.adapter.rooms[room.room] !== undefined) {
          var usersSocketIds = Object.keys(socket.adapter.rooms[room.room].sockets);
          for (var f = 0; f < usersSocketIds.length; f++) {
              for (var key in users) {
                  if (usersSocketIds[f] == key) {
                      response.push(users[key]);
                  }
              }
          }
          io.sockets.to(socket.id).emit('show_users', {users: response});
          MongoClient.connect(URL, function (err, db) {
              if (!err) {
                  var date = new Date();
                  date = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
                  db.command({
                      insert: "message",
                      documents: [{user: user_login, commande: '/users', message: "list user"}]
                  }, function (err, result) {
                  });
              }
          });
      }
  });

  socket.on('msg_perso', function (data) {
    for (var s = 0; s < clients.length; s++) {
      if (clients[s][1] == data.dest) {
        io.sockets.to(clients[s][0]).emit('message', {author: data.author, message: data.msg});
      }
    }
  });

  socket.on('send', function (data) {
    var test = false;
    for (var u = 0; u < clients.length; u++) {
      if (clients[u][0] == socket.id) {
        test = true;
      }
    }
    if (test === false) {
      clients.push([socket.id, data.author]);
    }
    if (data.message !== "") {
        io.sockets.in(data.room).emit('message', data);
    }
  });

});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

// 404 ---------------------->

app.get('/*', function (req, res) {
    res.render('error', {});
});