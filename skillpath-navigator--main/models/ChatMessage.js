const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobCard: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobCard',
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'model'],
        required: true
    },
    content: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
