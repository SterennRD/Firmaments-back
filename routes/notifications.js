var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const User = require('../model/User');
const Notification = require('../model/Notification');
var ObjectId = require('mongoose').Types.ObjectId;
const jwt = require('jsonwebtoken');
var VerifyToken = require('../auth/VerifyToken');

// Get all notifs
router.get('/:id', VerifyToken, function(req, res) {
    const id = req.params.id;
    Notification.find({'user_to': {$in: [new ObjectId(id)]}}).sort('-created_at').exec(function(err, notifs){
        if (err)
            next(err)
        else {
            res.json(notifs);
        }
    });
});

// Get all unread notifs
router.get('/unread/:id', VerifyToken, function(req, res) {
    const id = req.params.id;
    Notification.find({'user_to': {$in: [new ObjectId(id)]}, 'seen': false}).sort('-created_at').exec(function(err, notifs){
        if (err)
            next(err)
        else {
            res.json(notifs);
        }
    });
});

module.exports = router;