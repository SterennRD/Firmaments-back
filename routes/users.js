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
const Story = require('../model/Story');
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
    /*User.aggregate([
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
        }, {
            '$addFields': {
                'nb_stories': {
                    '$size': '$stories'
                }
            }
        }, {
            '$unwind': {
                'path': '$stories',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'stories._id',
                'foreignField': 'reading_lists.stories',
                'as': 'faved'
            }
        }, {
            '$addFields': {
                'stories.nb_favorites': {
                    '$size': {
                        '$filter': {
                            'input': {
                                '$reduce': {
                                    'input': {
                                        '$reduce': {
                                            'input': '$faved.reading_lists.stories',
                                            'initialValue': [],
                                            'in': {
                                                '$concatArrays': [
                                                    '$$value', '$$this'
                                                ]
                                            }
                                        }
                                    },
                                    'initialValue': [],
                                    'in': {
                                        '$concatArrays': [
                                            '$$value', '$$this'
                                        ]
                                    }
                                }
                            },
                            'as': 't',
                            'cond': {
                                '$eq': [
                                    '$$t', '$stories._id'
                                ]
                            }
                        }
                    }
                },
                'stories.nb_comments': {
                    '$sum': {
                        '$map': {
                            'input': '$stories.chapters',
                            'as': 'c',
                            'in': {
                                '$size': '$$c.comments'
                            }
                        }
                    }
                },
                'stories.nb_likes': {
                    '$size': '$stories.likes'
                }
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'stories.author',
                'foreignField': '_id',
                'as': 'stories.author'
            }
        }, {
            '$limit': 6
        }, {
            '$group': {
                '_id': '$_id',
                'doc': {
                    '$first': '$$ROOT'
                },
                'stories': {
                    '$push': '$stories'
                }
            }
        }, {
            '$addFields': {
                'doc.stories': '$stories'
            }
        }, {
            '$replaceRoot': {
                'newRoot': '$doc'
            }
        }, {
            '$project': {
                'username': 1,
                'username_display': 1,
                'followers': 1,
                'following': 1,
                'nb_stories': 1,
                'nb_readinglists': {
                    '$size': {
                        '$filter': {
                            'input': '$reading_lists',
                            'as': 'rl',
                            'cond': {
                                '$eq': [
                                    '$$rl.private', false
                                ]
                            }
                        }
                    }
                },
                'reading_lists': 1,
                'stories._id': 1,
                'stories.title': 1,
                'stories.nb_comments': 1,
                'stories.nb_favorites': 1,
                'stories.nb_likes': 1,
                'stories.author.username': 1,
                'stories.author.username_display': 1,
                'stories.author._id': 1,
                'stories.description': 1,
                'stories.updated_at': 1,
                'stories.category': 1,
                'stories.rating': 1,
                'stories.status': 1
            }
        }
    ]).exec(function(err, user) {
       if (err) return err
       else {
           res.json(user[0])
       }
    });*/
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
        }, {
            '$addFields': {
                'nb_stories': {
                    '$size': '$stories'
                }
            }
        }, {
            '$unwind': {
                'path': '$stories',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'stories._id',
                'foreignField': 'reading_lists.stories',
                'as': 'faved'
            }
        }, {
            '$addFields': {
                'stories.nb_favorites': {
                    '$size': {
                        '$filter': {
                            'input': {
                                '$reduce': {
                                    'input': {
                                        '$reduce': {
                                            'input': '$faved.reading_lists.stories',
                                            'initialValue': [],
                                            'in': {
                                                '$concatArrays': [
                                                    '$$value', '$$this'
                                                ]
                                            }
                                        }
                                    },
                                    'initialValue': [],
                                    'in': {
                                        '$concatArrays': [
                                            '$$value', '$$this'
                                        ]
                                    }
                                }
                            },
                            'as': 't',
                            'cond': {
                                '$eq': [
                                    '$$t', '$stories._id'
                                ]
                            }
                        }
                    }
                },
                'stories.nb_comments': {
                    '$sum': {
                        '$map': {
                            'input': '$stories.chapters',
                            'as': 'c',
                            'in': {
                                '$size': '$$c.comments'
                            }
                        }
                    }
                },
                'stories.nb_likes': {
                    '$size': '$stories.likes'
                }
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'stories.author',
                'foreignField': '_id',
                'as': 'stories.author'
            }
        }, {
            '$unwind': {
                'path': '$stories.author'
            }
        }, {
            '$limit': 6
        }, {
            '$group': {
                '_id': '$_id',
                'doc': {
                    '$first': '$$ROOT'
                },
                'stories': {
                    '$push': '$stories'
                }
            }
        }, {
            '$addFields': {
                'doc.stories': '$stories'
            }
        }, {
            '$replaceRoot': {
                'newRoot': '$doc'
            }
        }, {
            '$unwind': {
                'path': '$reading_lists',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$lookup': {
                'from': 'stories',
                'localField': 'reading_lists.stories',
                'foreignField': '_id',
                'as': 'reading_lists.stories'
            }
        }, {
            '$unwind': {
                'path': '$reading_lists.stories',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'reading_lists.stories.author',
                'foreignField': '_id',
                'as': 'reading_lists.stories.author'
            }
        }, {
            '$unwind': {
                'path': '$reading_lists.stories.author',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$group': {
                '_id': '$reading_lists._id',
                'doc': {
                    '$first': '$$ROOT'
                },
                'reading_lists_stories': {
                    '$push': '$reading_lists.stories'
                }
            }
        }, {
            '$addFields': {
                'doc.reading_lists.stories': '$reading_lists_stories'
            }
        }, {
            '$group': {
                '_id': '$doc._id',
                'reading_lists': {
                    '$push': '$doc.reading_lists'
                },
                'doc': {
                    '$first': '$doc'
                }
            }
        }, {
            '$addFields': {
                'doc.reading_lists': '$reading_lists'
            }
        }, {
            '$replaceRoot': {
                'newRoot': '$doc'
            }
        }, {
            '$project': {
                'username': 1,
                'username_display': 1,
                'followers': 1,
                'following': 1,
                'nb_stories': 1,
                'nb_readinglists': {
                    '$size': {
                        '$filter': {
                            'input': '$reading_lists',
                            'as': 'rl',
                            'cond': {
                                '$eq': [
                                    '$$rl.private', false
                                ]
                            }
                        }
                    }
                },
                'stories._id': 1,
                'stories.title': 1,
                'stories.nb_comments': 1,
                'stories.nb_favorites': 1,
                'stories.nb_likes': 1,
                'stories.author.username': 1,
                'stories.author.username_display': 1,
                'stories.author._id': 1,
                'stories.description': 1,
                'stories.updated_at': 1,
                'stories.category': 1,
                'stories.rating': 1,
                'stories.status': 1,
                'reading_lists': {
                    '$let': {
                        'vars': {
                            's': {
                                '$arrayElemAt': [
                                    '$reading_lists', 0
                                ]
                            }
                        },
                        'in': {
                            '$cond': [
                                {
                                    '$eq': [
                                        '$$s.stories', [
                                            {}
                                        ]
                                    ]
                                }, '$$REMOVE', {
                                    '$map': {
                                        'input': '$reading_lists',
                                        'as': 'rl',
                                        'in': {
                                            'title': '$$rl.title',
                                            'stories': {
                                                '$map': {
                                                    'input': '$$rl.stories',
                                                    'as': 's',
                                                    'in': {
                                                        'title': '$$s.title',
                                                        '_id': '$$s._id',
                                                        'author': {
                                                            '$let': {
                                                                'vars': {
                                                                    'u': '$$s.author.username_display',
                                                                    'id': '$$s.author._id'
                                                                },
                                                                'in': {
                                                                    'username_display': '$$u',
                                                                    '_id': '$$id'
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            'private': '$$rl.private',
                                            '_id': '$$rl._id'
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }
    ]).exec(function(err, user) {
       if (err) return err
       else {
           res.json(user[0])
       }
    });
});

// Get all reading lists
router.get('/reading-lists/:id', (req, res) => {
    let id = req.params.id;
    User.aggregate([
        {
            '$match': {
                '_id': new ObjectId(id)
            }
        }, {
            '$unwind': {
                'path': '$reading_lists'
            }
        }, {
            '$lookup': {
                'from': 'stories',
                'localField': 'reading_lists.stories',
                'foreignField': '_id',
                'as': 'reading_lists.stories'
            }
        }, {
            '$unwind': {
                'path': '$reading_lists.stories'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'reading_lists.stories.author',
                'foreignField': '_id',
                'as': 'reading_lists.stories.author'
            }
        }, {
            '$group': {
                '_id': '$reading_lists._id',
                'reading_lists_stories': {
                    '$push': '$reading_lists.stories'
                },
                'doc': {
                    '$first': '$$ROOT'
                }
            }
        }, {
            '$addFields': {
                'doc.reading_lists.stories': '$reading_lists_stories'
            }
        }, {
            '$group': {
                '_id': '$doc._id',
                'reading_lists': {
                    '$push': '$doc.reading_lists'
                },
                'doc': {
                    '$first': '$doc'
                }
            }
        }, {
            '$addFields': {
                'doc.reading_lists': '$reading_lists'
            }
        }, {
            '$project': {
                'reading_lists': {
                    '$map': {
                        'input': '$doc.reading_lists',
                        'as': 'rl',
                        'in': {
                            '_id': '$$rl._id',
                            'title': '$$rl.title',
                            'private': '$$rl.private',
                            'stories': {
                                '$map': {
                                    'input': '$$rl.stories',
                                    'as': 's',
                                    'in': {
                                        'title': '$$s.title',
                                        '_id': '$$s._id',
                                        'author': {
                                            '$let': {
                                                'vars': {
                                                    'username_display': '$$s.author.username_display',
                                                    'id': '$$s.author._id'
                                                },
                                                'in': {
                                                    'username_display': '$$username_display',
                                                    '_id': '$$id'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    ]).exec(function(err, user) {
        if (err) return err
        else {
            res.json(user[0])
        }
    });
});

// Get one reading list
router.get('/reading-lists/details/:idRL', (req, res) => {
    let id = req.params.id;
    let idRL = req.params.idRL;
    User.aggregate([
        {
            '$match': {
                'reading_lists._id': new ObjectId(idRL)
            }
        }, {
            '$project': {
                'reading_lists': {
                    '$filter': {
                        'input': '$reading_lists',
                        'as': 'rl',
                        'cond': {
                            '$eq': [
                                '$$rl._id', new ObjectId(idRL)
                            ]
                        }
                    }
                }
            }
        }, {
            '$unwind': {
                'path': '$reading_lists'
            }
        }, {
            '$lookup': {
                'from': 'stories',
                'localField': 'reading_lists.stories',
                'foreignField': '_id',
                'as': 'reading_lists.stories'
            }
        }, {
            '$unwind': {
                'path': '$reading_lists.stories'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'reading_lists.stories.author',
                'foreignField': '_id',
                'as': 'reading_lists.stories.author'
            }
        }, {
            '$unwind': {
                'path': '$reading_lists.stories.author'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'reading_lists.stories._id',
                'foreignField': 'reading_lists.stories',
                'as': 'reading_lists.stories.faved'
            }
        }, {
            '$addFields': {
                'reading_lists.stories.total_fav': {
                    '$filter': {
                        'input': {
                            '$reduce': {
                                'input': {
                                    '$reduce': {
                                        'input': '$reading_lists.stories.faved.reading_lists.stories',
                                        'initialValue': [],
                                        'in': {
                                            '$concatArrays': [
                                                '$$value', '$$this'
                                            ]
                                        }
                                    }
                                },
                                'initialValue': [],
                                'in': {
                                    '$concatArrays': [
                                        '$$value', '$$this'
                                    ]
                                }
                            }
                        },
                        'as': 'fav',
                        'cond': {
                            '$eq': [
                                '$$fav', '$reading_lists.stories._id'
                            ]
                        }
                    }
                },
                'reading_lists.stories.nb_comments': {
                    '$sum': {
                        '$map': {
                            'input': '$reading_lists.stories.chapters',
                            'as': 'c',
                            'in': {
                                '$size': '$$c.comments'
                            }
                        }
                    }
                }
            }
        }, {
            '$group': {
                '_id': '$_id',
                'reading_lists_stories': {
                    '$push': '$reading_lists.stories'
                },
                'doc': {
                    '$first': '$$ROOT'
                }
            }
        }, {
            '$project': {
                'owner': '$_id',
                'title': '$doc.reading_lists.title',
                '_id': '$doc.reading_lists._id',
                'description': '$doc.reading_lists.description',
                'private': '$doc.reading_lists.private',
                'stories': {
                    '$map': {
                        'input': '$reading_lists_stories',
                        'as': 's',
                        'in': {
                            'title': '$$s.title',
                            '_id': '$$s._id',
                            'nb_likes': {
                                '$size': '$$s.likes'
                            },
                            'nb_favorites': {
                                '$size': '$$s.total_fav'
                            },
                            'status': '$$s.status',
                            'rating': '$$s.rating',
                            'description': '$$s.description',
                            'category': '$$s.category',
                            'nb_comments': '$$s.nb_comments',
                            'author': {
                                '$let': {
                                    'vars': {
                                        'username_display': '$$s.author.username_display',
                                        'id': '$$s.author._id'
                                    },
                                    'in': {
                                        'username_display': '$$username_display',
                                        '_id': '$$id'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    ]).exec(function(err, user) {
        if (err) return err
        else {
            res.json(user[0])
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

    const queryStory = [
        {
            '$match': {
                '_id': new ObjectId(idStory),
                'status.label': {
                    '$ne': 'Brouillon'
                }
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'author',
                'foreignField': '_id',
                'as': 'author'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': '_id',
                'foreignField': 'reading_lists.stories',
                'as': 'faved'
            }
        }, {
            '$unwind': {
                'path': '$author'
            }
        }, {
            '$group': {
                '_id': '$_id',
                'total_fav': {
                    '$push': {
                        '$reduce': {
                            'input': {
                                '$reduce': {
                                    'input': '$faved.reading_lists.stories',
                                    'initialValue': [],
                                    'in': {
                                        '$concatArrays': [
                                            '$$value', '$$this'
                                        ]
                                    }
                                }
                            },
                            'initialValue': [],
                            'in': {
                                '$concatArrays': [
                                    '$$value', '$$this'
                                ]
                            }
                        }
                    }
                },
                'doc': {
                    '$first': '$$ROOT'
                }
            }
        }, {
            '$unwind': {
                'path': '$total_fav',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$addFields': {
                'doc.all_faved': '$total_fav'
            }
        }, {
            '$replaceRoot': {
                'newRoot': '$doc'
            }
        }, {
            '$project': {
                'title': 1,
                'author.username': 1,
                'author.username_display': 1,
                'author._id': 1,
                'description': 1,
                'updated_at': 1,
                'category': 1,
                'rating': 1,
                'chapters': 1,
                'likes': 1,
                'status': 1,
                'nb_comments': {
                    '$sum': {
                        '$map': {
                            'input': '$chapters',
                            'as': 'c',
                            'in': {
                                '$size': '$$c.comments'
                            }
                        }
                    }
                },
                'nb_likes': {
                    '$size': '$likes'
                },
                'nb_favorites': {
                    '$size': {
                        '$filter': {
                            'input': '$all_faved',
                            'as': 't',
                            'cond': {
                                '$eq': [
                                    '$$t', '$_id'
                                ]
                            }
                        }
                    }
                }
            }
        }, {
            '$limit': 10
        }, {
            '$sort': {
                'updated_at': 1
            }
        }
    ];


    User.findOneAndUpdate(query,{$pull:{"reading_lists.$.stories":new ObjectId(idStory)}}, {new: true}, async function (err, user) {
        if (err) throw err
        if (!user) {
            User.findOneAndUpdate({"reading_lists":{"$elemMatch":{_id:new ObjectId(id)}}} ,{$push:{"reading_lists.$.stories":new ObjectId(idStory)}}, {new: true}, async function (err, user) {
                if (err) throw err
                let story = await Story.aggregate(queryStory).exec();
                res.json({user: user, story: story[0]})
            });

        } else {
            let story = await Story.aggregate(queryStory).exec();
            res.json({user: user, story: story[0]})
        }
    });

});

// Create reading list
router.post('/new/readinglist/:id/:idStory', VerifyToken, function(req, res, next) {
    const idStory = req.params.idStory;
    const id = req.params.id;

    const reading_list = {
        title: req.body.title,
        createdAt: new Date(),
        private: false,
        stories: [new ObjectId(idStory)]
    }


    User.findOneAndUpdate({_id: new ObjectId(id)}, { $push: { "reading_lists": reading_list } }, {new: true}, function (err, user) {
        if (err) return err
        res.send(user)
    });

});

module.exports = router;