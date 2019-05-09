const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    user_to : [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    user_from: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    story_id: {
        type: Schema.Types.ObjectId,
        ref: 'Story'
    },
    chapter_id: {
        type: Schema.Types.ObjectId,
        ref: 'Chapter'
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