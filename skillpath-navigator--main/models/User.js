const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    learningGoals: { type: String },
    profilePicture: { type: String, default: '' },
    bio: { type: String, default: '' },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    progress: [{
        cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCard' },
        completedTopics: [String],
        quizResults: [{
            topic: String,
            score: Number,
            totalQuestions: Number,
            date: { type: Date, default: Date.now }
        }]
    }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
