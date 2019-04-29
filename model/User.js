const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email : {
        type : String,
        required : true,
        unique : true,
        minlength: 3
    },
    password : {
        type : String,
        required : true,
        minlength: 3
    },
    username: {
        type: String,
        required: true,
        unique: true,
        maxlength: 50
    },
    username_display: {
        type: String,
        maxlength: 50
    },
    birth_date: {
        type: Date,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    image: String,
    role: {
        type: String,
        enum: ['member', 'admin'],
        default: 'member'
    },
    badges:  [{
        type: Schema.Types.ObjectId,
        ref: 'Badge'
    }],
    followers:  [{
        _id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    following:  [{
        _id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    notes: [{
        created_at: {
            type: Date,
            default: Date.now
        },
        updated_at: {
            type: Date
        },
        title: String,
        content: String,
        tags: [String]
    }],
    todo_lists: [{
        created_at: {
            type: Date,
            default: Date.now
        },
        updated_at: {
            type: Date
        },
        title: String,
        tasks: [{
            done: Boolean,
            description: String,
            date: Date
        }]
    }],
    reading_lists: [{
        created_at: {
            type: Date,
            default: Date.now
        },
        updated_at: {
            type: Date
        },
        title: {
            type: String,
            required: true
        },
        description: String,
        stories: [{
            type: Schema.Types.ObjectId,
            ref: 'Story'
        }],
        private: Boolean
    }]
});

UserSchema.pre('save', function(next) {
    bcrypt.hash(this.password, 10, (err, hash) => {
        this.password = hash;
        next();
    });
});

UserSchema.methods.isValidPassword = function(password, done) {
    bcrypt.compare(password, this.password, (err, isEqual) => done(isEqual));
};

const UserModel = mongoose.model('User',UserSchema);

module.exports = UserModel;