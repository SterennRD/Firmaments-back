const Validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function validateRegisterInput(data) {
    let errors = {};
    data.username = !isEmpty(data.username) ? data.username : '';
    data.email = !isEmpty(data.email) ? data.email : '';
    data.password = !isEmpty(data.password) ? data.password : '';
    data.password_confirm = !isEmpty(data.password_confirm) ? data.password_confirm : '';

    function isUserUnique(reqBody, cb) {
        var username = reqBody.username ? reqBody.username.trim() : '';
        var email = reqBody.email ? reqBody.email.trim() : '';

        User.findOne({
            $or: [{
                'username': new RegExp(["^", username, "$"].join(""), "i")
            }, {
                'email': new RegExp(["^", email, "$"].join(""), "i")
            }]
        }, function(err, user) {
            if (err)
                throw err;

            if (!user) {
                cb();
                return;
            }

            var err;
            if (user.username === username) {
                err = {};
                err.username = '"' + username + '" is not unique';
            }
            if (user.email === email) {
                err = err ? err : {};
                err.email = '"' + email + '" is not unique';
            }

            cb(err);
        });
    }

    if(!Validator.isLength(data.username, { min: 2, max: 30 })) {
        errors.username = 'Name must be between 2 to 30 chars';
    }

    if(Validator.isEmpty(data.username)) {
        errors.username = 'Name field is required';
    }

    if(!Validator.isEmail(data.email)) {
        errors.email = 'Email is invalid';
    }

    if(Validator.isEmpty(data.email)) {
        errors.email = 'Email is required';
    }

    if(!Validator.isLength(data.password, {min: 3, max: 30})) {
        errors.password = 'Password must have 3 chars';
    }

    if(Validator.isEmpty(data.password)) {
        errors.password = 'Password is required';
    }

    if(!Validator.isLength(data.password_confirm, {min: 3, max: 30})) {
        errors.password_confirm = 'Password must have 3 chars';
    }

    if(!Validator.equals(data.password, data.password_confirm)) {
        errors.password_confirm = 'Password and Confirm Password must match';
    }

    if(Validator.isEmpty(data.password_confirm)) {
        errors.password_confirm = 'Password is required';
    }

    return {
        errors,
        isValid: isEmpty(errors)
    }
}