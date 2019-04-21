const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChapterSchema = new Schema({
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
        required: true
    },
    status: {
        id: Number,
        label: String
    },
    annotations: [{
        author: {
            type: [Schema.Types.ObjectId],
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
            type: [Schema.Types.ObjectId],
            ref: 'User'
        },
        content: String,
        created_at: {
            type: Date,
            default: Date.now
        }
    }],
    read: {type: [Schema.Types.ObjectId], ref: 'User'}
});

const ChapterModel = mongoose.model('Chapter', ChapterSchema);
module.exports = ChapterModel;