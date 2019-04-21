const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WallStatusSchema = new Schema({
    user_id: {
        type: [Schema.Types.ObjectId],
        ref: 'User'
    },
    content: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    comments: [{
        author: {
            type: [Schema.Types.ObjectId],
            ref: 'User'
        },
        created_at: {
            type: Date,
            default: Date.now
        },
        content: {
            type: String,
            required: true
        }
    }]
});

const WallStatusModel = mongoose.model('WallStatus',WallStatusSchema);

module.exports = WallStatusModel;