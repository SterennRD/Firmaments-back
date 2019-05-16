const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    user_to : [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    user_from: {
        _id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        username_display: String
    },
    story_id: {
        _id:{
            type: Schema.Types.ObjectId,
            ref: 'Story'
        },
        title: String
    },
    chapter_id: {
        _id:{
            type: Schema.Types.ObjectId,
            ref: 'Chapter'
        },
        title: String
    },
    message: String,
    seen: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const NotificationModel = mongoose.model('Notification',NotificationSchema);

module.exports = NotificationModel;