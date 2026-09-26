const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    otp: {
        type: String, // Stored as bcrypt hash for security
        required: true,
    },
    attempts: {
        type: Number,
        default: 0, // Max 3-5 failed attempts before invalidation
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // MongoDB TTL Index: Document automatically deletes after 300 seconds (5 mins)
    }
})

const otpModel = mongoose.model('otps', otpSchema);
module.exports = otpModel;