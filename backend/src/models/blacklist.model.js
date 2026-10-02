const mongoose = require('mongoose')

const blackListTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "Token is required to be added in blacklist"]
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 7 * 24 * 60 * 60 // 7 days (matches JWT expiration)
    }
})

const tokenBlackListModel = mongoose.model('blackListTokens', blackListTokenSchema)

module.exports = tokenBlackListModel    