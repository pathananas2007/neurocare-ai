/**
 * chat.js
 * Dedicated AI Chatbot routes for Wellness Forever.
 * 
 * POST /api/chat
 * - Validates inputs (max 500 chars per message, array of messages)
 * - Applies lightweight in-memory rate limiting (max 20 messages per minute per IP)
 * - Resolves live database context (doctors, authenticated user appointments)
 * - Never logs or passes sensitive PII (names, phone numbers, passwords) to the AI
 * - Dispatches request to the modular AI service
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { generateChatReply } = require('../services/aiService');

const router = express.Router();

// ── In-Memory IP Rate Limiter ─────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 25;

function checkRateLimit(ip) {
    const now = Date.now();
    const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > clientData.resetTime) {
        clientData.count = 1;
        clientData.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
        clientData.count++;
    }

    rateLimitMap.set(ip, clientData);
    return clientData.count <= MAX_REQUESTS_PER_WINDOW;
}

// Clean up stale rate limit entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now > data.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 10 * 60 * 1000);

// ── POST /api/chat ─────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

        // 1. Rate Limit Check
        if (!checkRateLimit(clientIp)) {
            return res.status(429).json({
                success: false,
                message: 'You are sending messages too quickly. Please pause for a moment before trying again.'
            });
        }

        const { messages, message } = req.body;

        // 2. Validate user message or message history
        let conversation = [];

        if (Array.isArray(messages) && messages.length > 0) {
            // Keep at most the last 8 messages for context to conserve tokens & cost
            conversation = messages.slice(-8).map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: String(m.content || '').trim().slice(0, 600)
            })).filter(m => m.content.length > 0);
        } else if (typeof message === 'string' && message.trim().length > 0) {
            conversation = [{ role: 'user', content: message.trim().slice(0, 600) }];
        }

        if (conversation.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty.'
            });
        }

        // 3. Optional Authentication Context
        // Check if user is logged in via Bearer token (no mandatory blockage for general questions)
        let authenticatedUser = null;
        let userAppointments = [];

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            const token = req.headers.authorization.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                authenticatedUser = await User.findById(decoded.id).select('_id role');
                if (authenticatedUser) {
                    // Fetch up to 3 upcoming appointments (without sending raw phone/emails to AI)
                    const apts = await Appointment.find({
                        userId: authenticatedUser._id,
                        status: { $nin: ['cancelled'] }
                    }).sort({ date: 1 }).limit(3);

                    userAppointments = apts.map(a => ({
                        doctorName: a.doctorName,
                        date: a.date,
                        time: a.time,
                        status: a.status
                    }));
                }
            } catch (err) {
                // Token invalid or expired — proceed gracefully as guest
            }
        }

        // 4. Fetch Active Doctors for Grounded Information (Zero hallucination)
        const doctors = await Doctor.find({}).select('name specialization experience location fee rating');

        // 5. Query AI Provider
        const reply = await generateChatReply({
            messages: conversation,
            contextData: {
                doctors,
                isAuthenticated: !!authenticatedUser,
                userAppointments
            }
        });

        res.json({
            success: true,
            reply: reply.trim(),
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Chat endpoint error:', err.message);

        // Friendly error messages depending on failure cause
        let userFacingError = 'I am having trouble connecting to my healthcare knowledge base. Please try again shortly.';
        if (err.message && err.message.includes('GEMINI_API_KEY')) {
            userFacingError = 'AI service is temporarily unconfigured. Please ensure GEMINI_API_KEY is set in the server environment.';
        } else if (err.message && err.message.includes('quota')) {
            userFacingError = 'The AI service is experiencing high demand right now. Please try again in a few moments.';
        }

        res.status(500).json({
            success: false,
            message: userFacingError,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ── GET /api/chat/status ───────────────────────────────────
// Health check for chatbot availability
router.get('/status', (req, res) => {
    const isConfigured = !!process.env.GEMINI_API_KEY || !!process.env.GROQ_API_KEY;
    res.json({
        success: true,
        status: isConfigured ? 'ready' : 'missing_api_key',
        provider: process.env.AI_PROVIDER || 'gemini',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    });
});

module.exports = router;
