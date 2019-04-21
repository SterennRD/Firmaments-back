const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BadgeSchema = new Schema({
    label: String,
    description: String
});

const BadgeModel = mongoose.model('Badge',BadgeSchema);

module.exports = BadgeModel;