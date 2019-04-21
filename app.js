var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
require('dotenv').config();
const passport = require('passport');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var storiesRouter = require('./routes/stories');

var app = express();

// Socket io
const http = require('http').Server(app);
const io = require('socket.io')(http);
http.listen(4001, function(){
    console.log('listening on *:4001');
});

const Notification = require('./model/Notification');
io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('message', function (data) {
        console.log(data);
        const notif = new Notification(data);
        notif.save();
    });
});


mongoose.connect('mongodb://localhost/litterally', { useNewUrlParser: true });
mongoose.connection.on('error', error => console.log(error));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
require('./auth/auth');
app.use(passport.initialize());
require('./passport')(passport);


//middleware that checks if JWT token exists and verifies it if it does exist.
//In all the future routes, this helps to know if the request is authenticated or not.
/*app.use(function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.headers['authorization'];
    if (!token) return next();

    token = token.replace('Bearer ', '');


    jwt.verify(token, process.env.JWT_SECRET, function(err, user) {
        if (err) {
            console.log("middleware err")
            return res.status(401).json({
                success: false,
                message: 'Please register Log in using a valid email to submit posts'
            });
        } else {
            console.log("middleware")
            req.user = user;
            next();
        }
    });

});*/


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/stories', storiesRouter);

function validateUser(req, res, next) {
    var token = req.headers['authorization'];
    if (!token) return next();

    token = token.replace('Bearer ', '');
    jwt.verify(token, process.env.JWT_SECRET, function(err, user) {
        if (err) {
            console.log("middleware err")
            return res.status(401).json({
                success: false,
                message: 'Please register Log in using a valid email to submit posts'
            });
        } else {
            console.log("middleware")
            req.user = user;
            next();
        }
    });

}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    console.log(err);
    res.status(err.status || 500);
    res.json(err.message);
});


module.exports = app;
