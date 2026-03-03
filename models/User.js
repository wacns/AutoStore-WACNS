const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String },
    growId: { type: String, default: null }, // Tambahan: GrowID
    balance: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);