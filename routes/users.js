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
var VerifyToken = require('../auth/VerifyToken');
const tokenList = {}
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
                birth_date: user.birth_date,
                following: user.following,
            };
            const token = jwt.sign({ user : body }, process.env.JWT_SECRET, {
                expiresIn: 86400 // expires in 24 hours
            });
            return res.json({ user, token: token });
            /*const token = jwt.sign({ user : body }, process.env.JWT_SECRET, { expiresIn: process.env.tokenLife})
            const refreshToken = jwt.sign({ user : body }, process.env.refreshTokenSecret, { expiresIn: process.env.refreshTokenLife})
            const response = {
                user,
                token: token,
                refreshToken: refreshToken
            }
            tokenList[refreshToken] = response
            console.log(tokenList)
            return res.json(response);*/
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
    User.aggregate([
        {
            '$match': {
                '_id': new ObjectId(id)
            }
        }, {
            '$lookup': {
                'from': 'stories',
                'localField': '_id',
                'foreignField': 'author',
                'as': 'stories'
            }
        }
    ]).exec(function(err, user) {
       if (err) return err
       else {
           res.json(user[0])
       }
    });
});

router.get('/reading-lists/:id', (req, res) => {
    let id = req.params.id;
    User.findOne({_id: new ObjectId(id)}).select({ "reading_lists": 1, "_id": 0}).exec(function(err, user) {
        if (err) return err
        else {
            res.json(user)
        }
    });
});

// Follow or unfollow user
router.post('/follow/:id/:follow', VerifyToken, function(req, res, next) {

    // connected user
    const id = req.params.id;
    // user to follow
    const follow = req.params.follow;
    const query = { _id: new ObjectId(id), "following": { $elemMatch: {_id : new ObjectId(follow)}}};

    User.findOneAndUpdate(query,{ $pull: { "following": {_id: new ObjectId(follow)} } }, {new: true}, function (err, user) {
        if(err){return next(err);}
        if (!user) {
            console.log('user pas trouvé')
            // User is not in the following list : add it
            User.findOneAndUpdate({ _id: new ObjectId(id)},{ $push: { "following": {_id: new ObjectId(follow)} } }, {new: true}, function (err, user) {
                if(err){return next(err)};
                // Update followers list for the user followed
                let response = { user: user.following };
                User.findOneAndUpdate({ _id: new ObjectId(follow) },{ $push: { "followers": {_id: new ObjectId(id)} } }, {new: true}, function (err, userFollowed) {
                    const followersList = userFollowed.followers;
                    response = { ...response, followersList : followersList };
                    res.json(response);
                });

            });
        } else {
            // User is in the following list : delete it
            // Update followers list for the user followed
            let response = { user: user.following };
            User.findOneAndUpdate({ _id: new ObjectId(follow) },{ $pull: { "followers": {_id: new ObjectId(id)} } }, {new: true}, function (err, userFollowed) {
                const followersList = userFollowed.followers;
                console.log(userFollowed)
                response = { ...response, followersList : followersList };
                res.json(response);
            });
            //res.json(user);
        }
    })
});

//get current user from token
router.get('/me/from/token', function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (!token) {
        return res.status(401).json({message: 'Must pass token'});
    }
    const postData = req.body
    console.log(postData)
    console.log("tokenList")
    console.log(tokenList)

// Check token that was passed by decoding token using secret
    jwt.verify(token, process.env.JWT_SECRET, function(err, user) {
        if (err) throw err;
        //return user using the id from w/in JWTToken
        User.findById({
    '_id': user.user._id
    }, function(err, user) {
            if (err) throw err;
            user = utils.getCleanUser(user);
            //Note: you can renew token by creating new token(i.e.
            //refresh it)w/ new expiration time at this point, but I’m
            //passing the old token back.
            var token = utils.generateToken(user);
            res.json({
                user: user,
                token: token
            });
        });
    });
});

// Add story to reading list
router.post('/add/readinglist/:id/:idStory', VerifyToken, function(req, res, next) {

    const id = req.params.id;
    const idStory = req.params.idStory;

    //const query = { "reading_lists._id": new ObjectId(id), "reading_lists.stories": { $in: [new ObjectId(idStory)] } };
    //const query = {"reading_lists":{"$elemMatch":{_id:new ObjectId(id)}}, "reading_lists.stories": { $in: [new ObjectId(idStory)] } };
    const query = {"reading_lists":{"$elemMatch":{_id: new ObjectId(id), stories:{ $in: [ new ObjectId(idStory)] }}} };
    //{"reading_lists":{"$elemMatch":{_id:ObjectId('5ccaac9ff85b1592446b73d8'), stories:{ $in: [ObjectId('5c9ca2a8a885bd809be23bfc')] }}} }


    User.findOneAndUpdate(query,{$pull:{"reading_lists.$.stories":new ObjectId(idStory)}}, {new: true}, function (err, user) {
        if (err) throw err
        if (!user) {
            User.findOneAndUpdate({"reading_lists":{"$elemMatch":{_id:new ObjectId(id)}}} ,{$push:{"reading_lists.$.stories":new ObjectId(idStory)}}, {new: true}, function (err, user) {
                if (err) throw err
                res.json(user)
            });

        } else {
            res.json(user)
        }
    });

});


module.exports = router;