var jwt = require('jsonwebtoken');

function generateToken(user) {
    //Dont use password and other sensitive fields
    //Use fields that are useful in other parts of the app/collections/models
    var u = {
        name: user.name,
        username: user.username,
        role: user.role,
        _id: user._id.toString(),
        image: user.image
    };

    return token = jwt.sign(u, process.env.JWT_SECRET, {
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
    }
}

module.exports = {
    getCleanUser: getCleanUser,
    generateToken: generateToken
}