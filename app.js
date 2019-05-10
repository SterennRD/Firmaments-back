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
var fs = require('file-system');
var multer = require('multer');


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
const User = require('./model/User');
const Story = require('./model/Story');

const socketUsers = [];


io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('currentUser', function(user) {
        if (socketUsers.length > 0) {
            socketUsers.splice(socketUsers.findIndex(function(i){
                return i.user._id === user._id;
            }), 1);
        }

        socketUsers.push({
            socketId: socket.id,
            user: user
        });
        console.log(socketUsers)
    });
    socket.on('newComment', async function (data) {
        let story = await Story.findOne({'chapters._id' : data.chapter_id}).exec();
        let user = await User.findOne({'_id' : story.author}).lean();
        let user_from = await User.findOne({'_id' : data.user_from}).lean();
        let userSocketId = socketUsers.find(u => u.user._id == user._id).socketId;
        data = {
            ...data,
            story_id: {
                '_id': story._id,
                'title': story.title
            },
            user_to: user._id,
            user_from: {
                '_id': user_from._id,
                'username': user_from.username,
                'username_display': user_from.username_display
            }
        };
        const notif = new Notification(data);
        notif.save();
        io.to(`${userSocketId}`).emit('receiveComment', notif)
    });
    socket.on('message', async function (data, to) {
        console.log(data);
        console.log(to);
        let story = await Story.findOne({'chapters._id' : data.chapter_id}).exec();
        let user = await User.findOne({'_id' : story.author}).lean();
        let userSocketId = socketUsers.find(u => u.user._id == user._id).socketId;
        if (user.followers.length > 0) {
            console.log("j'ai des followers")
        } else {
            console.log("pas de followers")
        }
        data = {...data, story_id: story._id, user_to: user.followers};

        console.log(userSocketId);
        console.log(socketUsers);
        io.to(`${userSocketId}`).emit('essai', data)
        const notif = new Notification(data);
        //notif.save();
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
app.use(express.static(__dirname + '/public'));

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
