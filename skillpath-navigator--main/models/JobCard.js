const mongoose = require('mongoose');

const JobCardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ['MERN Stack', 'Java Full Stack', 'AI/ML']
    },
    topics: [{ type: String }],
    content: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('JobCard', JobCardSchema);
