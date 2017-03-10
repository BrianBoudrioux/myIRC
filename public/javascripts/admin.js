var params = document.body.getElementsByTagName('script');
query = params[2].classList;
var username = query[0];
$(".first-menu").append('<a class="dropdown-toggle" data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false">' + username + '<span class="caret"></span></a>');
$(".under-first").append('<li><a href="/my_account">Mon compte</a></li><li><a href="/deconnexion">Déconnexion</a></li>');
if (username == "root") {
    $(".under-first").append('<li><a href="/admin">Administration</a></li>');
}
var socket = io();
$('form').submit(function(){
    var pattern_list = new RegExp("/list");
    var pattern_msg = new RegExp("/msg ");
    var pattern_delete = new RegExp("/delete ");
    var pattern_rename = new RegExp("/rename ");
    var pattern_global = new RegExp("/root ");
    var tab;
    if (pattern_list.exec($('#m').val()) !== null) {
        tab = $('#m').val().split(" ");
        if (tab.length == 2) {
            socket.emit('list_room', {search: tab[1]});
        }
        else if (tab.length == 1) {
            socket.emit('list_room', {search: 'all'});
        }
    }
    else if (pattern_msg.exec($('#m').val()) !== null) {
        tab = $('#m').val().split(" ");
        if (tab.length >= 3) {
            var dest = tab[1];
            tab.shift();
            tab.shift();
            var msg = tab.join(" ");
            socket.emit('msg_perso', {dest: dest, msg: msg, author: username});
        }
    }
    else if (pattern_delete.exec($('#m').val()) !== null) {
        tab = $('#m').val().split(" ");
        if (tab.length == 2) {
            socket.emit('root_delete', {search: tab[1]});
        }
    }
    else if (pattern_rename.exec($('#m').val()) !== null) {
        tab = $('#m').val().split(" ");
        if (tab.length == 3) {
            socket.emit('root_rename', {search: tab[1], newvalue: tab[2]});
        }
    }
    else if (pattern_global.exec($('#m').val()) !== null) {
        tab = $('#m').val().split(" ");
        if (tab.length >= 2) {
            tab.shift();
            var msg = tab.join(" ");
            socket.emit('global', {search: msg});
        }
    }
    else {
        socket.emit('root_send', {message: $('#m').val(), author: username});
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
socket.on('list_message', function(msg){
    var list = "";
    for(var i=0; i < msg.list.length; i++){
        list += msg.list[i] + " / ";
    }
    $('#messages').prepend($('<li>').text(list));
});