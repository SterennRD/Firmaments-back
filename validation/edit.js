const Validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function validateEditInput(data) {
    let errors = {};

    data.email = !isEmpty(data.email) ? data.email : '';
    data.password = !isEmpty(data.password) ? data.password : '';
    data.username = !isEmpty(data.username) ? data.username : '';

    if(!Validator.isLength(data.username, {min: 3, max: 50})) {
        errors.username = 'Le nom d\'utilisateur doit être compris entre 3 et 50 caractères';
    }

    if(!Validator.isAlphanumeric(data.username)) {
        errors.username = 'Le nom d\'utilisateur doit contenir seulement des chiffres ou des lettres';
    }

    if(!Validator.isEmail(data.email)) {
        errors.email = 'Email is invalid';
    }


    return {
        errors,
        isValid: isEmpty(errors)
    }
}