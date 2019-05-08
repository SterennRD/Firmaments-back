var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const Story = require('../model/Story');
const path = require('path');

const User = require('../model/User');
var ObjectId = require('mongoose').Types.ObjectId;
const jwt = require('jsonwebtoken');
var VerifyToken = require('../auth/VerifyToken');


var multer = require('multer');
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});
var upload = multer({storage: storage});
//var upload = multer({ dest: 'uploads/' });

// Get all stories
router.get('/', function(req, res) {
    Story.find({}).sort('-created_at').populate('author').exec(function(err, stories){
        if (err)
            next(err)
        else {
            res.json(stories);
        }
    });
});

router.get('/all/:page', (req, res) => {
    let pageNo = req.params.page ;
    Story.paginate(pageNo, function (err, response) {

        if (err) {
            return res.status(500).json({
                message: "Error",
                error: err
            });
        }
        return res.status(200).json(response);
    });
});
// Get all stories
router.get('/all/:page/:perpage', function(req, res) {
    console.log('page number : ' + req.params.page);
    console.log('per page : ' + req.params.perpage);

    let pageNumber = req.params.page ; // parseInt(req.query.pageNo)
    let size = req.params.perpage;
    let query = {}

    if (pageNumber < 0 || pageNumber == 0 || isNaN(pageNumber)) {
    if (pageNumber < 0 || pageNumber == 0 || isNaN(pageNumber)) {
        response = { "error": true, "message": "Numéro de page invalide" };
        res.json(response)
    } else {

        query.skip = size * (pageNumber - 1)
        query.limit = parseInt(size)
        // Find some documents
        Story.aggregate([
            {
                '$match': {
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
                '$skip': query.skip
            }, {
                '$limit': query.limit
            }, {
                '$sort': {
                    'created_at': 1
                }
            }
        ]).exec(function (err, data) {
            // Mongo command to fetch all data from collection.
            if (err) {
                response = {"error": true, "message": "Error fetching data"};
            } else {
                res.json(data);
            }
        });
    }
    }
});

// Get story from user
router.get('/user/:id', async function (req, res) {
    var id = req.params.id;

    let stories = await Story.find({ author: new ObjectId(id) }).exec();

    res.json(stories);
});

// Get story from id
router.get('/:id', async function (req, res) {
    var id = req.params.id;


    /*Story.findOne({ _id: new ObjectId(id) }).populate('author').lean().exec(function(err, stories){
        if (err)
            return err
        else {
            const newStory = {
            ...stories,
            author: {
                _id: stories.author._id,
                username: stories.author.username,
                username_display: stories.author.username_display
                },
            }
            res.json(newStory);
        }
    });*/

    /*Story.aggregate([
        {
            '$match': {
                '_id': new ObjectId(id)
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': '_id',
                'foreignField': 'reading_lists.stories',
                'as': 'faved'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'author',
                'foreignField': '_id',
                'as': 'author'
            }
        }, {
            '$unwind': {
                'path': '$author'
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
                'status': 1,
                'chapters': 1,
                'likes': 1,
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
                'nb_favorites': {
                    '$size': '$faved'
                },
                'nb_likes': {
                    '$size': '$likes'
                }
            }
        }
    ]).exec(function(err, story){
        if (err)
            return err
        else {
            res.json(story[0]);
        }
    });*/
    Story.aggregate([
        {
            '$match': {
                '_id': new ObjectId(id)
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': '_id',
                'foreignField': 'reading_lists.stories',
                'as': 'faved'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'author',
                'foreignField': '_id',
                'as': 'author'
            }
        }, {
            '$unwind': {
                'path': '$author'
            }
        }, {
            '$unwind': {
                'path': '$chapters'
            }
        }, {
            '$addFields': {
                'chapters.comments.title': '$chapters.title',
                'chapters.comments.chapter_id': '$chapters._id'
            }
        }, {
            '$group': {
                '_id': '$_id',
                'doc': {
                    '$first': '$$ROOT'
                },
                'chap': {
                    '$push': '$chapters'
                }
            }
        }, {
            '$addFields': {
                'doc.chapters': '$chap'
            }
        }, {
            '$replaceRoot': {
                'newRoot': '$doc'
            }
        }, {
            '$addFields': {
                'all_comments': {
                    '$reduce': {
                        'input': '$chapters.comments',
                        'initialValue': [],
                        'in': {
                            '$concatArrays': [
                                '$$value', '$$this'
                            ]
                        }
                    }
                }
            }
        }, {
            '$unwind': {
                'path': '$all_comments',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$sort': {
                'all_comments.created_at': -1
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'all_comments.author',
                'foreignField': '_id',
                'as': 'all_comments.author'
            }
        }, {
            '$unwind': {
                'path': '$all_comments.author',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$project': {
                'all_comments.author.password': 0,
                'all_comments.author.followers': 0,
                'all_comments.author.following': 0,
                'all_comments.author.reading_lists': 0,
                'all_comments.author.email': 0,
                'all_comments.author.created_at': 0,
                'all_comments.author.badges': 0,
                'all_comments.author.notes': 0,
                'all_comments.author.todo_lists': 0,
                'all_comments.author.birth_date': 0,
                'chapters.comments.title': 0,
                'chapters.comments.chapter_id': 0
            }
        }, {
            '$group': {
                '_id': '$_id',
                'doc': {
                    '$first': '$$ROOT'
                },
                'all_comments': {
                    '$push': '$all_comments'
                }
            }
        }, {
            '$addFields': {
                'doc.all_comments': '$all_comments'
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
                'cover': 1,
                'annotation_authorized': 1,
                'comment_authorized': 1,
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
                'nb_favorites': {
                    '$size': '$faved'
                },
                'nb_likes': {
                    '$size': '$likes'
                },
                'last_comments': {
                    '$cond': {
                        'if': {
                            '$eq': [
                                {
                                    '$arrayElemAt': [
                                        '$all_comments', 0
                                    ]
                                }, {}
                            ]
                        },
                        'then': [],
                        'else': {
                            '$slice': [
                                '$all_comments', 10
                            ]
                        }
                    }
                }
            }
        }
    ]).exec(function(err, story){
        if (err)
            return err
        else {
            console.log(story)
            res.json(story[0]);
        }
    });

});

// Get last stories
router.get('/last/posted', async function (req, res) {
    /*Story.aggregate([
        {
            '$match' : {
                "status.label": {"$ne" : "Brouillon"}
            }
        },
        {
            '$lookup': {
                'from': 'users',
                'localField': 'author',
                'foreignField': '_id',
                'as': 'author'
            }
        }, {
            '$unwind': {
                'path': '$author'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': '_id',
                'foreignField': 'reading_lists.stories',
                'as': 'faved'
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
                'status': 1,
                'chapters': 1,
                'cover': 1,
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
                'nb_favorites': {
                    '$size': '$faved'
                },
                'nb_likes': {
                    '$size': '$likes'
                }
            }
        }, {
            '$limit': 10
        }, {
            '$sort': {
                'created_at': 1
            }
        }
    ]).exec(function(err, stories){
        if (err)
            return err
        else {
            res.json(stories);
        }
    });*/
    Story.aggregate([
        {
            '$match': {
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
    ]).exec(function(err, stories){
        if (err)
            return err
        else {
            res.json(stories);
        }
    });
});

// Post a story
router.post('/', VerifyToken, function(req, res, next) {
    console.log(req.body);
    const id = req.userId;

    const story = new Story({
        ...req.body,
        author: new ObjectId(id)
    });

    story.save((err, newStory) => {
        if(err) next(err);
        res.json(newStory);
    });
});

// Edit a story
router.post('/edit/:id', upload.single('cover'), VerifyToken, function(req, res, next) {
    console.log("les modifs arrivent")
    console.log(req.body);
    console.log(JSON.parse(req.body.postData));
    console.log(req.file);
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    let body;
    if (req.file) {
        body = {...req.body, updated_at: new Date(), cover: req.file.filename};
    } else {
        body = {...JSON.parse(req.body.postData), updated_at: new Date()};
    }
    Story.findOneAndUpdate(query,{$set: body}, { new: true} , function (err, story) {
        if (err) return err
        return res.json(story);
    })
});

// Add like
router.post('/like/:id', VerifyToken, function(req, res, next) {
    console.log("les modifs arrivent")
    console.log(req.body)
    const id = req.body.id;
    const idStory = req.params.id;
    const query = { _id: new ObjectId(idStory), "likes": { $elemMatch: {user : new ObjectId(id)}}};

    /*Story.findOneAndUpdate(query,{ $push: { "likes": {user: new ObjectId(id)} } }, function (err, story) {
        return res.json(story);
    })*/
    Story.findOneAndUpdate(query,{ $pull: { "likes": {user: new ObjectId(id)} } }, {new: true}, function (err, story) {
        if(err){return next(err);}
        if (!story) {
            console.log("pas de like")
            Story.findOneAndUpdate({ _id: new ObjectId(idStory)},{ $push: { "likes": {user: new ObjectId(id)} } }, {new: true}, function (err, story) {
                if(err){return next(err)};
                console.log(story.likes)
                res.json(story.likes);
            });
        } else {
            console.log("je like déjà, je supprime")
            console.log(story.likes)
            res.json(story.likes);
        }
    })
});

// Get chapter from id
router.get('/:id/chapter/:idChapter', async function (req, res) {
    let id = req.params.id;
    let idChapter = req.params.idChapter;

    const query = [
        {
            '$match': {
                '_id': new ObjectId(id)
            }
        }, {
            '$addFields': {
                'selectedChapter': {
                    '$filter': {
                        'input': '$chapters',
                        'as': 'c',
                        'cond': {
                            '$eq': [
                                '$$c._id', new ObjectId(idChapter)
                            ]
                        }
                    }
                }
            }
        }, {
            '$unwind': {
                'path': '$selectedChapter'
            }
        }, {
            '$unwind': {
                'path': '$selectedChapter.comments',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'selectedChapter.comments.author',
                'foreignField': '_id',
                'as': 'selectedChapter.comments.author'
            }
        }, {
            '$unwind': {
                'path': '$selectedChapter.comments.author',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$group': {
                '_id': '$_id',
                'selectedChapter_comments': {
                    '$push': '$selectedChapter.comments'
                },
                'doc': {
                    '$first': '$$ROOT'
                }
            }
        }, {
            '$addFields': {
                'doc.selectedChapter.comments': '$selectedChapter_comments'
            }
        }, {
            '$replaceRoot': {
                'newRoot': '$doc'
            }
        }, {
            '$project': {
                'story': '$$ROOT',
                'selectedChapter': '$selectedChapter'
            }
        }, {
            '$addFields': {
                'selectedChapter.comments': {
                    '$map': {
                        'input': '$selectedChapter.comments',
                        'as': 's',
                        'in': {
                            '_id': '$$s._id',
                            'content': '$$s.content',
                            'author': {
                                '$let': {
                                    'vars': {
                                        'a': '$$s.author'
                                    },
                                    'in': {
                                        'username': '$$a.username',
                                        '_id': '$$a._id',
                                        'username_display': '$$a.username_display'
                                    }
                                }
                            }
                        }
                    }
                },
                'story.selectedChapter': '$$REMOVE'
            }
        }
    ];

    Story.aggregate(query).exec(function(err, story){
        if (err)
            return err
        else {
            let selectedchapter = story[0].selectedChapter
            let selectedstory = story[0].story
            res.json({story: selectedstory, selectedChapter: selectedchapter});
        }
    });

    /*let histoire = await Story.findById(id).lean().exec();

    Story.findById(id, function (err, story){
        if(err) {
            console.log(err)
            throw err
        } else {
            let chapter = story.chapters.id(idChapter);
            let response = {...histoire, selectedChapter:chapter}
            res.json(response)
        }
    });*/
});

// Edit chapter from id
router.post('/:id/chapter/:idChapter/edit', async function (req, res) {
    let id = req.params.id;
    let idChapter = req.params.idChapter;

    const newChap = {...req.body, updated_at: new Date()}

    Story.findOneAndUpdate(
        { "_id": new ObjectId(id), "chapters._id": new ObjectId(idChapter) },
        {
            "$set": {
                "chapters.$": newChap
            }
        },
        function(err,doc) {
            if(err) {
                throw err
            } else {
                res.json(newChap)
            }
        }
    );
});
// Post a chapter
router.post('/:id/new/chapter', VerifyToken, function(req, res, next) {
    const id = req.params.id;
    console.log(req.body)
    Story.findByIdAndUpdate(
        id,
        { $push: { chapters: req.body } },
        function (err, story) {
            return res.json(story);
    })
});

router.post('/posts/validate/fields', function(req, res, next) {
    var body = req.body;
    var title = body.title ? body.title.trim() : '';

    Story.findOne({
        'title': new RegExp(title, "i")
    }, function(err, post) {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: 'Could not find post for title uniqueness'
            });
        }
        if (post) {
            res.json({
                title: 'Title "' + title + '" is not unique!'
            });
        } else {
            return res.json({});
        }

    });
});

// Delete a story
router.delete('/:id', VerifyToken, async function (req, res, next) {
    var id = req.params.id;
    var userId = req.userId;
    console.log("je supprime une histoire")

    Story.findOneAndDelete({ _id: new ObjectId(id) }).exec((err, doc) => {
        if (err) {
            console.log(err)
        } else {
            res.json(doc);
        }
    });

    let stories = await Story.find({ author: new ObjectId(userId) }).exec();
    //res.json(stories);
});

// Search story
router.get('/search/story', async function (req, res) {
    const searchWords = req.query.search;
    console.log(req.query)
    //
    //const searchWords = "qui";

    var regex = new RegExp(req.query.search, 'i');
    var query = Story.find({title: regex}, { 'title': 1 }).populate({ path: 'author', select: 'username_display' }).sort({"updated_at":-1}).sort({"created_at":-1});

    // Execute query in a callback and return users list
        var totalCount;
    Story.countDocuments({title: regex}, function(err, count) {
        console.log(count)
        if (err){
            totalCount = 0;
        }
        else{
            totalCount = count;
        }
    });
    query.limit(5).exec(function(err, stories) {
        if (!err) {
            // Method to construct the json result set
            //count documents

            var result = {
                "totalResults" : totalCount,
                "result": stories,
            };
            res.send(result);
        } else {
            res.send(JSON.stringify(err), {
                'Content-Type': 'application/json'
            }, 404);
        }
    });
    /*Story.find( { $text: { $search : searchWords, "$caseSensitive": false, "$diacriticSensitive": false } },{ score : { $meta: "textScore" } } ).sort( {
        score: { $meta : "textScore" }} ).exec((err, doc) => {
        if (err) {
            console.log(err)
        } else {
            res.json(doc);
        }
    });*/
});



module.exports = router;
