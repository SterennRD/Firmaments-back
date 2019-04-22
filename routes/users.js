const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const validateRegisterInput = require('../validation/register');
const validateLoginInput = require('../validation/login');
var utils = require('../utils/index');

const User = require('../model/User');
var ObjectId = require('mongoose').Types.ObjectId;

router.get('/', function(req, res) {
    User.find({}, (err, users) => {
        if(err) next(err);
        res.json(users);
    });
});

// Signup Route
router.post('/signup', function(req, res) {

    const { errors, isValid } = validateRegisterInput(req.body);

    if(!isValid) {
        return res.status(400).json(errors);
    }

    User.findOne().or([{ email: req.body.email }, { username: req.body.username }]).then(user => {
        if(user) {
            if (user.email !== req.body.email && user.username == req.body.username) {
                return res.status(400).json({
                    username: 'Nom d\'utilisateur déjà pris'
                });
            } else if (user.email == req.body.email && user.username !== req.body.username) {
                return res.status(400).json({
                    email: 'Adresse mail déjà utilisée'
                });
            } else if (user.email == req.body.email && user.username == req.body.username) {
                return res.status(400).json({
                    username: 'Nom d\'utilisateur déjà pris',
                    email: 'Adresse mail déjà utilisée'
                });
            }
        }
        else {
            const newUser = new User({
                username: req.body.username,
                username_display: req.body.username,
                email: req.body.email,
                password: req.body.password,
                birth_date: req.body.birth_date,
            });

            bcrypt.genSalt(10, (err, salt) => {
                if(err) console.error('There was an error', err);
                else {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if(err) console.error('There was an error', err);
                        else {
                            newUser.password = hash;
                            newUser
                                .save()
                                .then(user => {
                                    res.json(user)
                                });
                        }
                    });
                }
            });
        }
    });
});

// Login Route
router.post('/login', (req, res, next) => {
    const { errors, isValid } = validateLoginInput(req.body);

    if(!isValid) {
        return res.status(400).json(errors);
    }

    passport.authenticate('login', (err, user, info) => {
        if(err) return next(err);
        if(!user) {
            const error = new Error(info.message);
            return next(error);
        }
        req.login(user, { session : false }, err => {
            if(err) return next(err);
            const body = {
                _id: user._id,
                email: user.email,
                username_display: user.username_display,
                username: user.username,
                birth_date: user.birth_date
            };
            const token = jwt.sign({ user : body }, process.env.JWT_SECRET, {
                expiresIn: 86400 // expires in 24 hours
            });
            return res.json({ user, token: token });
        });
    })(req, res, next);
});

router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
    return res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
    });
});

router.get('/:id', (req, res) => {
    let id = req.params.id;
    User.findOne({ "_id": new ObjectId(id)}, (err, user) => {
        if(err) next(err);
        res.json(user);
    });
});

//get current user from token
router.get('/me/from/token', function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token;
    if (!token) {
        return res.status(401).json({message: 'Must pass token'});
    }
    console.log(token)
// Check token that was passed by decoding token using secret
    jwt.verify(token, process.env.JWT_SECRET, function(err, user) {
        if (err) throw err;
        //return user using the id from w/in JWTToken
        User.findById({
    '_id': user._id
    }, function(err, user) {
            if (err) throw err;
            user = utils.getCleanUser(user);
            //Note: you can renew token by creating new token(i.e.
            //refresh it)w/ new expiration time at this point, but I’m
            //passing the old token back.
            // var token = utils.generateToken(user);
            res.json({
                user: user,
            token: token
        });
        });
    });
});

module.exports = router;