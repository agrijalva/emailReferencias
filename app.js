var http = require('http');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var swig = require('swig');

var apiEmail = require('./app_back/sendemail');

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/api/email', apiEmail );

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/app_front');
swig.setDefaults({ varControls: ['[[', ']]'] });

app.post('/', function(req, res) {
    var user = { idUsuario: req.body.idUsuario };
    res.render('index', { user });
});

app.get('*', function(req, res) {
    res.sendFile(__dirname + '/README.html');
});

let port = 5210;
http.createServer(app).listen(port, function() {
    console.log('Listen on port '+ port +' imgServer');
});