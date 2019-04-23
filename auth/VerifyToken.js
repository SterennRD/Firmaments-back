var jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    console.log("Je vérifie le token");
    var token = req.headers['x-access-token'];
    console.log(token);
    if (!token)
        return res.status(403).send({ auth: false, message: 'No token provided.' });
    jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
        if (err)
            console.log(err)
            return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
        // if everything good, save to request for use in other routes
        req.userId = decoded.user._id;
        console.log("token vérifié")
        next();
    });
}
module.exports = verifyToken;