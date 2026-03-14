const express = require('express');
const router = express.Router();
const JobCard = require('../models/JobCard');
const ChatMessage = require('../models/ChatMessage');
const auth = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Get all Job Cards
router.get('/', async (req, res) => {
    try {
        const cards = await JobCard.find();
        res.json(cards);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Get a single Job Card
router.get('/:id', async (req, res) => {
    try {
        const card = await JobCard.findById(req.params.id);
        if (!card) return res.status(404).json({ message: "Card not found" });
        res.json(card);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Create a new Job Card
router.post('/', async (req, res) => {
    try {
        const { title, description, category, topics, content } = req.body;
        const newCard = new JobCard({ title, description, category, topics, content });
        await newCard.save();
        res.status(201).json(newCard);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Update a Job Card
router.put('/:id', async (req, res) => {
    try {
        const { title, description, category, topics, content } = req.body;
        const updatedCard = await JobCard.findByIdAndUpdate(
            req.params.id,
            { title, description, category, topics, content },
            { new: true }
        );
        if (!updatedCard) return res.status(404).json({ message: "Card not found" });
        res.json(updatedCard);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Delete a Job Card
router.delete('/:id', async (req, res) => {
    try {
        const deletedCard = await JobCard.findByIdAndDelete(req.params.id);
        if (!deletedCard) return res.status(404).json({ message: "Card not found" });
        res.json({ message: "Card deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Seed Initial Data
router.post('/seed', async (req, res) => {
    try {
        const seedData = [
            {
                title: "MERN Stack",
                description: "Master MongoDB, Express, React, and Node.js for modern web development.",
                category: "MERN Stack",
                topics: ["React Hooks", "Node.js Streams", "MongoDB Aggregation", "Express Middleware"],
                content: "Detailed study materials for MERN stack."
            },
            {
                title: "Java Full Stack",
                description: "Learn Spring Boot, Hibernate, and Angular/React for enterprise applications.",
                category: "Java Full Stack",
                topics: ["Spring Boot", "Microservices", "Hibernate ORM", "JPA"],
                content: "Detailed study materials for Java Full Stack."
            },
            {
                title: "AI/ML",
                description: "Dive into Python, TensorFlow, and Scikit-Learn to build intelligent systems.",
                category: "AI/ML",
                topics: ["Neural Networks", "Pandas & NumPy", "Deep Learning", "NLP"],
                content: "Detailed study materials for AI/ML."
            }
        ];

        await JobCard.deleteMany(); // Clear existing
        const cards = await JobCard.insertMany(seedData);
        res.status(201).json({ message: "Seed successful", cards });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Get Chat History for a Card
router.get('/:id/chat', auth, async (req, res) => {
    try {
        const messages = await ChatMessage.find({
            user: req.user.id,
            jobCard: req.params.id
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Send Chat Message and get Groq Response
router.post('/:id/chat', auth, async (req, res) => {
    try {
        const { message } = req.body;
        const jobCard = await JobCard.findById(req.params.id);

        if (!jobCard) {
            return res.status(404).json({ message: "Job card not found" });
        }

        // 1. Save User Message
        const userMessage = new ChatMessage({
            user: req.user.id,
            jobCard: req.params.id,
            role: 'user',
            content: message
        });
        await userMessage.save();

        // 2. Prepare Groq Logic
        const apiKey = (process.env.GROQ_API_KEY || "").trim();
        if (!apiKey) {
            throw new Error("GROQ_API_KEY is not defined in the server .env file.");
        }

        // 3. Prepare Context & History
        const systemInstructionText = `You are a specialized AI assistant for ${jobCard.title}. 
Strictly answer questions related to ${jobCard.category} and topics like ${(jobCard.topics || []).join(', ')}.
If the user asks something outside this, politely steer them back.
CONTEXT: ${jobCard.content || 'N/A'}`;

        // Fetch recent history
        const history = await ChatMessage.find({
            user: req.user.id,
            jobCard: req.params.id,
            _id: { $ne: userMessage._id }
        }).sort({ createdAt: -1 }).limit(6);

        const sortedHistory = history.reverse();

        // Construct messages for Groq
        const messages = [
            { role: "system", content: systemInstructionText },
            ...sortedHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: "user", content: message }
        ];

        // USE llama-3.1-8b-instant AS llama3-8b-8192 IS DECOMMISSIONED
        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.1-8b-instant",
        });

        const responseText = chatCompletion.choices[0].message.content;

        if (!responseText) {
            throw new Error("AI returned an empty response.");
        }

        // 4. Save Groq Response
        const aiMessage = new ChatMessage({
            user: req.user.id,
            jobCard: req.params.id,
            role: 'model', // Keep as 'model' in DB to maintain frontend compatibility
            content: responseText
        });
        await aiMessage.save();

        res.json({ response: responseText });
    } catch (error) {
        console.error("DEBUG - AI Route Error:", error);
        res.status(500).json({
            message: "AI Error: " + (error.message || "Unknown error"),
            details: error.stack
        });
    }
});

module.exports = router;
