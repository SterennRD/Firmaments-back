const Validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function validateChangePassword(data) {
    let errors = {};

    data.password = !isEmpty(data.password) ? data.password : '';
    data.newPassword = !isEmpty(data.newPassword) ? data.newPassword : '';
    data.newPasswordConfirm = !isEmpty(data.newPasswordConfirm) ? data.newPasswordConfirm : '';

    if(!Validator.isLength(data.password, {min: 3, max: 30})) {
        errors.password = 'Password must have 3 chars';
    }

    if(Validator.isEmpty(data.password)) {
        errors.password = 'Password is required';
    }

    if(!Validator.isLength(data.newPassword, {min: 3, max: 30})) {
        errors.newPassword = 'Password must have 3 chars';
    }
    if(!Validator.isLength(data.newPassword, { max: 30})) {
        errors.newPassword = 'Max 30 chars';
    }

    if(!Validator.equals(data.newPasswordConfirm, data.newPassword)) {
        errors.newPassword = 'Password and Confirm Password must match';
    }

    if(Validator.isEmpty(data.newPassword)) {
        errors.newPassword = 'Password is required';
    }


    return {
        errors,
        isValid: isEmpty(errors)
    }
}