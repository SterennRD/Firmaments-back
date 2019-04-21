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

const StoryModel = mongoose.model('Story', StorySchema);
module.exports = StoryModel;
