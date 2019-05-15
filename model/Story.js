
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ratingSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    label: {
        type: String,
        required: true
    }
});

const chapterSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date
    },
    content: {
        type: String,
        required: true,
        maxlength: 15999
    },
    status: {
        id: Number,
        label: String
    },
    annotations: [{
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        quote: String,
        content: String,
        created_at: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        created_at: {
            type: Date,
            default: Date.now
        }
    }],
    read: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
});
const ChapterModel = mongoose.model('Chapter', chapterSchema);
module.exports = ChapterModel;

const StorySchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 350
    },
    cover: String,
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date
    },
    category: [{
        id: Number,
        value: Number,
        label: String
    }],
    status: {
        id: Number,
        label: String
    },
    comment_authorized: Boolean,
    annotation_authorized: Boolean,
    rating: {
        type: ratingSchema,
        //required: true
    },
    chapters: [{
        type: chapterSchema
    }],
    likes: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        created_at: {
            type: Date,
            default: Date.now
        }
    }]
});

StorySchema.statics.paginate = function(pageNo, callback){
    var limit = 2;
    var skip = limit * (parseInt(pageNo) - 1);
    var totalCount;

    //count documents
    this.count({"status.label": {"$ne" : "Brouillon"}}, function(err, count) {
        console.log(count)
        if(err){
            totalCount = 0;
        }
        else{
            totalCount = count;
        }
    });
    if(totalCount == 0){
        return callback('No Document in Database..', null);
    }
    //get paginated documents
    this.aggregate([
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
            '$skip': skip
        }, {
            '$limit': limit
        }, {
            '$sort': {
                'created_at': 1
            }
        }
    ]).exec(function(err, docs){

        if(err){
            return callback('Error Occured', null);
        }
        else if(!docs){
            return callback('Docs Not Found', null);
        }
        else{
            var result = {
                "totalResults" : totalCount,
                "page": pageNo,
                "nextPage": parseInt(pageNo) + 1,
                "result": docs,
                "resultsPerPage": limit
            };
            return callback(null, result);
        }

    });

};


StorySchema.path('chapters').validate(function (val) {
    if (this.val && this.val.length > 1) {
        console.log("machin")
        return false
    } else {
        console.log("coucou")
    }
}, 'validation of `{PATH}` failed with value `{VALUE}`');
const StoryModel = mongoose.model('Story', StorySchema);



module.exports = StoryModel;

