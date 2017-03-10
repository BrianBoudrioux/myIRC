var params = document.body.getElementsByTagName('script');
query = params[2].classList;
var username = query[0];
$(".first-menu").append('<a class="dropdown-toggle" data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false">'+ username + '<span class="caret"></span></a>');
$(".under-first").append('<li><a href="/my_account">Mon compte</a></li><li><a href="/deconnexion">Déconnexion</a></li>');
if (username == "root") {
    $(".under-first").append('<li><a href="/admin">Administration</a></li>');
}