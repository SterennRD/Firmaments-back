var jwt = require('jsonwebtoken');

function generateToken(user) {
    //Dont use password and other sensitive fields
    //Use fields that are useful in other parts of the app/collections/models
    var u = {
        _id: user._id,
        email: user.email,
        username_display: user.username_display,
        username: user.username,
        birth_date: user.birth_date,
        following: user.following,
    };

    return token = jwt.sign({ user : u }, process.env.JWT_SECRET, {
        expiresIn: 60 * 60 * 24 // expires in 24 hours
    });
}

//strips internal fields like password and verifyEmailToken etc
function getCleanUser(user) {
    if(!user) return {};

    var u = user.toJSON();
    return {
        _id: u._id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
        birth_date: u.birth_date,
        image: u.image,
        following: u.following,
        followers: u.followers,
    }
}

module.exports = {
    getCleanUser: getCleanUser,
    generateToken: generateToken
}