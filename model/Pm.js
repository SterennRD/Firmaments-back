const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PmSchema = new Schema({
    user_to : {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    user_from: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: true,
        maxlength: 50
    },
    content: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    read: Boolean
});

const PmModel = mongoose.model('Pm',PmSchema);

module.exports = PmModel;