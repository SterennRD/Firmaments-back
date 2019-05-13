const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const UserModel = require('../model/User');
const validateRegisterInput = require('../validation/register');
const validateLoginInput = require('../validation/login');

passport.use(new JwtStrategy({
    secretOrKey: process.env.JWT_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
}, (jwt_payload, done) => {
    return done(null, jwt_payload.user);
}));

passport.use('signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
}, (req, email, password, done) => {
    UserModel.create({ username: req.body.username,
        email: req.body.email,
        password: password,
        birth_date: req.body.birth_date }, (err, user) => done(err, user));
}));

passport.use('login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, (email, password, done) => {
    console.log(email)
    var criteria = email.indexOf('@') === -1 ? {username: email} : {email: email};
    console.log(criteria)
    UserModel.findOne(criteria, (err, user) => {
        if(!user){
            console.log("user pas trouvé")
            return done(null, false, { message : 'Nom d\'utilisateur ou email introuvable'});
        }
        user.isValidPassword(password, isValid => {
            if(!isValid){
                return done(null, false, { message : 'Mot de passe invalide'});
            }
            return done(null, user, { message : 'Logged in Successfully'});
        });
    });
}));
