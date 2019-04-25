var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const Story = require('../model/Story');

const User = require('../model/User');
var ObjectId = require('mongoose').Types.ObjectId;
const jwt = require('jsonwebtoken');
var VerifyToken = require('../auth/VerifyToken');

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
    });

});

// Get last stories
router.get('/last/posted', async function (req, res) {
    /*Story.find(
        {
            '$lookup': {
                'from': 'users',
                'localField': '_id',
                'foreignField': 'reading_lists',
                'as': 'faved'
            }
        }, {
            '$addFields': {
                'nb_favorites': {
                    '$size': '$faved'
                }
            }
        }
    ).sort('-created_at').populate('author').limit(10).exec(function(err, stories){
        if (err)
            return err
        else {

            console.log(stories[1].author.username);
            res.json(stories);
        }
    });*/
    Story.aggregate([
        {
            '$lookup': {
                'from': 'users',
                'localField': 'author',
                'foreignField': '_id',
                'as': 'author'
            }
        }, {
            '$unwind': {
                'path': '$chapters'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': '_id',
                'foreignField': 'reading_lists.stories',
                'as': 'faved'
            }
        }, {
            '$addFields': {
                'nb_favorites': {
                    '$size': '$faved'
                },
                'nb_comments': {
                    '$size': '$chapters.comments'
                }
            }
        }, {
            '$unwind': {
                'path': '$author',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$project': {
                'faved': 0,
                'author.reading_lists': 0,
                'author.badges': 0
            }
        }, {
            '$group': {
                '_id': '$_id',
                'doc': {
                    '$first': '$$ROOT'
                }
            }
        }, {
            '$replaceRoot': {
                'newRoot': '$doc'
            }
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
router.post('/edit/:id', VerifyToken, function(req, res, next) {
    console.log("les modifs arrivent")
    console.log(req.body)
    var query = { _id: new ObjectId(req.body._id) };
    Story.findOneAndUpdate(query,{$set: req.body} , function (err, story) {
        return res.json(req.body);
    })
});

// Get chapter from id
router.get('/:id/chapter/:idChapter', async function (req, res) {
    let id = req.params.id;
    let idChapter = req.params.idChapter;

    let histoire = await Story.findById(id).lean().exec();

    Story.findById(id, function (err, story){
        if(err) {
            console.log(err)
            throw err
        } else {
            let chapter = story.chapters.id(idChapter);
            let response = {...histoire, selectedChapter:chapter}
            res.json(response)
        }
    });
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



module.exports = router;
