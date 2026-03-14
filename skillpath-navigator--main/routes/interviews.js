const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const auth = require('../middleware/auth');
const JobCard = require('../models/JobCard');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// @route   POST api/interviews/generate
// @desc    Generate a mock interview question based on topic
// @access  Private
router.post('/generate', auth, async (req, res) => {
    try {
        const { cardId, topic } = req.body;

        if (!cardId || !topic) {
            return res.status(400).json({ message: "cardId and topic are required" });
        }
        const card = await JobCard.findById(cardId);

        if (!card) return res.status(404).json({ message: "Job card not found" });

        const prompt = `You are a Senior Technical Interviewer at a top tech company. 
        Generate ONE challenging, practical interview question for a candidate applying for a position involving: ${card.title}.
        The specific topic is: ${topic}.
        
        The question should test deep understanding, not just definitions.
        Format: Return ONLY the question text without any conversational filler.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
        });

        const question = completion.choices[0]?.message?.content;
        res.json({ question });
    } catch (error) {
        console.error("AI Interview Generation Error:", error);
        res.status(500).json({ message: "Failed to generate interview question", error: error.message });
    }
});

// @route   POST api/interviews/feedback
// @desc    Get feedback on user's interview answer
// @access  Private
router.post('/feedback', auth, async (req, res) => {
    try {
        const { question, answer, topic } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ message: "Question and answer are required" });
        }

        const prompt = `You are a Senior Technical Interviewer. 
        Question asked: "${question}"
        Candidate's Answer: "${answer}"
        Topic: ${topic}

        Provide a professional critique of the answer. 
        Structure your JSON response exactly like this:
        {
            "score": 0-10,
            "strengths": ["point 1", "point 2"],
            "improvements": ["point 1", "point 2"],
            "seniorAnswer": "How a senior developer would have answered this concisely",
            "feedback": "A brief overall summary"
        }
        Return ONLY the JSON.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            response_format: { type: "json_object" }
        });

        const feedback = JSON.parse(completion.choices[0]?.message?.content);
        res.json(feedback);
    } catch (error) {
        console.error("AI Interview Feedback Error:", error);
        res.status(500).json({ message: "Failed to get AI feedback", error: error.message });
    }
});

module.exports = router;
