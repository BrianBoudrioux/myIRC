var params = document.body.getElementsByTagName('script');
query = params[2].classList;
var username = query[0];
$(".first-menu").append('<a class="dropdown-toggle" data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false">' + username + '<span class="caret"></span></a>');
$(".nav_first").append('<li><a href="#" class="channels active_channel">home</a></li>');
$(".under-first").append('<li><a href="/my_account">Mon compte</a></li><li><a href="/deconnexion">Déconnexion</a></li>');
if (username == "root") {
    $(".under-first").append('<li><a href="/admin">Administration</a></li>');
}
var socket = io();
var current_room = "home";
var clients = [];
var channel = [];
var nickname = "nickname";
channel[username] = ["home"];


$("#users").click(function () {
    if (current_room !== "") {
        $("#users_block").html("");
        socket.emit('list_users', {room: current_room});
    }
});
$("#channel").click(function () {
    $('#channel_block').html("");
    socket.emit('list_room', {search: 'all'});
});

$('form').submit(function(e){
    e.preventDefault();
    e.stopPropagation();
    var pattern_join = new RegExp("/join ");
    var pattern_list = new RegExp("/list");
    var pattern_leave = new RegExp("/part");
    var pattern_msg = new RegExp("/msg ");
    var pattern_users = new RegExp("/users");
    var pattern_nick = new RegExp("/nick ");
    var pattern_help = new RegExp("/help");
    var tab;
    if (pattern_join.exec($('#m').val()) !== null) {
         tab = $('#m').val().split(" ");
        if (tab.length == 2) {
            if (tab[1] == " " || tab[1] === "" || tab[1] == "/") {
                tab[1] = "home";
            }
            current_room = tab[1];
            channel[username].push(current_room);
            socket.emit('join_room', { room: tab[1], author: username + " [ " + nickname + " ]"});
        }
    }
    else if (pattern_list.exec($('#m').val()) !== null) {
         tab = $('#m').val().split(" ");
        if (tab.length == 2) {
            socket.emit('list_room', {search: tab[1]});
        }
        else if (tab.length == 1) {
            socket.emit('list_room', {search: 'all'});
        }
    }
    else if (pattern_leave.exec($('#m').val()) !== null) {
        tab = $('#m').val().split(" ");
        if (tab.length == 2) {
            socket.emit('leave_room', {search: tab[1], author: username + " [ " + nickname + " ]", message: 'Leaving room'});
            var tab_channel = [];
            for (var o = 0; o < channel[username].length; o++) {
                if (channel[username][o] != tab[1]) {
                    tab_channel.push(channel[username][o]);
                }
            }
            channel[username] = tab_channel;
            for (var f = 0; f < channel[username].length; f++) {
                current_room = channel[socket.id][f];
            }
            if (channel[username].length === 0) {
                current_room = '';
            }
        }
    }
    else if (pattern_msg.exec($('#m').val()) !== null) {
        tab = $('#m').val().split(" ");
        if (tab.length >= 3) {
            var dest = tab[1];
            tab.shift();
            tab.shift();
            var msg = tab.join(" ");
            socket.emit('msg_perso', {dest: dest, msg: msg, author: username + " [ " + nickname + " ]"});
        }
    }
    else if (pattern_users.exec($('#m').val()) !== null) {
        if (current_room !== "") {
            socket.emit('list_users', {room: current_room});
        }
    }
    else if (pattern_nick.exec($('#m').val()) !== null) {
        tab = $('#m').val().split(" ");
        if (tab.length == 2) {
            if (tab[1] != " " || tab[1] !== "") {
                nickname = tab[1];
            }
        }
    }
    else if (pattern_help.exec($('#m').val()) !== null) {
        $('#messages').prepend('<li>/join channel_name (rejoindre un channel)<br/>' +
            '/part channel_name (quitter un channel)<br/>' +
            '/nick nickname (definit un surnom)<br/>' +
            '/msg username votre message (envoi un message a un utilisateur connecté)<br/>' +
            '/list search (list les channels correspondant a la recherche)</li>');
    }
    else {
        socket.emit('send', {room: current_room, message: $('#m').val(), author: username + " [ " + nickname + " ]"});
    }
    $('#m').val('');
    return false;
});
socket.on('message', function(msg){
    if (msg.author == "root") {
        $('#messages').prepend($('<li style="background: rgba(255, 255, 255, 0.71)">').text(msg.author + " : " + msg.message));
    }
    else {
        $('#messages').prepend($('<li>').text(msg.author + " : " + msg.message));
    }
});
socket.on('leaving_room', function(msg){
    if (msg.author == "root") {
        $('#messages').prepend($('<li style="background: rgba(255, 255, 255, 0.71)">').text(msg.author + " : " + msg.message + " " + msg.search));
    }
    else {
        $('#messages').prepend($('<li>').text(msg.author + " : " + msg.message + " " + msg.search));
    }
    $('#m').val('');
});
socket.on('nav_remove', function (msg) {
    $(".channels").each(function () {
        if ($(this).text() === msg.search) {
            $(this).remove();
        }
        else {
            current_room = $(this).text();
            $(".channels").removeClass('active_channel');
            $(this).addClass('active_channel');
        }
    });
});
socket.on('in_room', function(msg){
    if (msg.room == " " || msg.room == "/" || msg.room === "") {
        msg.room = "home";
    }
    $('#messages').prepend($('<li>').text(msg.author + " joining room : " + msg.room));
});
socket.on('switch_room', function(msg){
    if (msg.room == " " || msg.room == "/" || msg.room === "") {
        msg.room = "home";
    }
    $('#messages').prepend($('<li>').text(msg.author + " switched to room : " + msg.room));
});
socket.on('nav_room', function (msg) {
    $(".channels").removeClass('active_channel');
    var check = false;
    $(".channels").each(function () {
        if ($(this).text() == msg.room) {
            check = true;
            $(this).addClass('active_channel');
        }
    });
    if (check === false) {
        $(".nav_first").append('<li><a href="#" class="channels active_channel">' + msg.room + '</a></li>');
    }
});
socket.on('list_message', function(msg){
    var list = [];
    for(var i=0; i < msg.list.length; i++){
        list.push(msg.list[i]);
    }
    list.forEach(function (el) {
        $('#channel_block').prepend('<li class="channel"><a href="#">' + el + '</a></li>');
    });
    $(".channel").click(function () {
        $('#m').focus().val('/join ' + $(this).text());
    });
});
socket.on('list_message_search', function(msg){
    $('#messages').prepend('<li class="channel">' + msg.list + '</li>');
});
socket.on('show_users', function(msg){
    var users = msg.users;
    users.forEach(function (el) {
        $('#users_block').prepend('<li class="msg_user"><a href="#">' + el + '</a></li>');
    });
    $(".msg_user").click(function () {
        $('#m').focus().val('/msg ' + $(this).text() + " ");
    });
});