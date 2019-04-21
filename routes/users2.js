const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
var User = require('../model/User');
const validateRegisterInput = require('../validation/register');
const validateLoginInput = require('../validation/login');

router.get('/', function(req, res) {
    User.find({}, (err, users) => {
        if(err) next(err);
        res.json(users);
    });
});

router.post('/signup', passport.authenticate('signup', { session : false }) , (req, res, next) => {
    res.json({ message : 'Signup successful', user : req.user });
});

router.post('/login', (req, res, next) => {
    passport.authenticate('login', (err, user, info) => {
        if(err) return next(err);
        if(!user) {
            const error = new Error(info.message);
            return next(error);
        }
        req.login(user, { session : false }, err => {
            if(err) return next(err);
            const body = { _id: user._id, email: user.email };
            const token = jwt.sign({ user : body }, 'top_secret');
            console.log(user);
            return res.json({ user, token });
        });
    })(req, res, next);
});

router.get('/profile', passport.authenticate('jwt', { session : false }), (req, res, next) => {
    res.json({
        message : 'You made it to the secure route',
        user : req.user,
        token : req.query.secret_token
    })
});

module.exports = router;


router.post('/signup', (req, res) => {
        const {errors, isValid} = validateRegisterInput(req.body);

        if (!isValid) {
            console.log("titi")
            return res.status(400).json(errors);
        }
    },
    passport.authenticate('signup', { session : false }) , (req, res, next) => {
        res.json({ message : 'Signup successful', user : req.user });
    });
router.post('/signup', function(req, res) {

    const { errors, isValid } = validateRegisterInput(req.body);

    if(!isValid) {
        return res.status(400).json(errors);
    }
    User.findOne({
        email: req.body.email
    }).then(user => {
        if(user) {
            return res.status(400).json({
                email: 'Email already exists'
            });
        }
        else {
            passport.use('signup', new LocalStrategy({
                usernameField: 'email',
                passwordField: 'password',
                passReqToCallback: true,
            }, (req, email, password, done) => {
                User.create({ username: req.body.username,
                    email: req.body.email,
                    password: password,
                    birth_date: req.body.birth_date }, (err, user) => done(err, user));
            }));
        }
    });
});


router.post('/login', (req, res, next) => {
    const { errors, isValid } = validateLoginInput(req.body);

    if(!isValid) {
        return res.status(400).json(errors);
    }
    passport.authenticate('signup', { session : false }) , (req, res, next) => {
        res.json({ message : 'Signup successful', user : req.user });
    }
});