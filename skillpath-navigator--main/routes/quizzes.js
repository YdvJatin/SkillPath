const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const JobCard = require('../models/JobCard');
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// @route   POST /api/quizzes/generate
// @desc    Generate a quiz for a specific topic using AI
router.post('/generate', auth, async (req, res) => {
    try {
        const { cardId, topic } = req.body;

        if (!cardId || !topic) {
            return res.status(400).json({ message: "cardId and topic are required" });
        }

        const jobCard = await JobCard.findById(cardId);
        if (!jobCard) {
            return res.status(404).json({ message: "Job card not found" });
        }

        const prompt = `
            Generate a technical quiz for the topic: "${topic}" within the context of "${jobCard.title}".
            The quiz should have exactly 3 multiple-choice questions.
            Return ONLY a JSON object with this structure:
            {
              "questions": [
                {
                  "question": "The question text",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswer": 0
                }
              ]
            }
            Ensure the questions are challenging but relevant to ${jobCard.category}.
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });

        const quizData = JSON.parse(chatCompletion.choices[0].message.content);
        res.json(quizData);
    } catch (error) {
        console.error("Quiz Generation Error:", error);
        res.status(500).json({ message: "Failed to generate quiz", error: error.message });
    }
});

// @route   POST /api/quizzes/submit
// @desc    Submit quiz results and save to user profile
router.post('/submit', auth, async (req, res) => {
    try {
        const { cardId, topic, score, totalQuestions } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Find or create progress for this card
        let progressItem = user.progress.find(p => p.cardId.toString() === cardId);

        if (!progressItem) {
            progressItem = { cardId, completedTopics: [], quizResults: [] };
            user.progress.push(progressItem);
        }

        progressItem.quizResults.push({
            topic,
            score,
            totalQuestions,
            date: new Date()
        });

        // Award XP: 50 XP per correct answer
        const xpEarned = score * 50;
        user.xp += xpEarned;

        // Simple Leveling: Every 500 XP is a new level
        const newLevel = Math.floor(user.xp / 500) + 1;

        let leveledUp = false;
        if (newLevel > user.level) {
            user.level = newLevel;
            leveledUp = true;
        }

        await user.save();
        res.json({
            message: leveledUp ? `Level Up! You are now level ${user.level}` : "Score saved successfully",
            xpEarned,
            totalXp: user.xp,
            level: user.level,
            leveledUp,
            progress: user.progress
        });
    } catch (error) {
        console.error("Quiz Submission Error:", error);
        res.status(500).json({ message: "Failed to save score" });
    }
});

module.exports = router;
