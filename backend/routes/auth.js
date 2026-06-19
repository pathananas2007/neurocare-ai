const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ── POST /api/auth/register ──────────────────────────────
// Register a new patient
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        // Allow role to be 'doctor' if explicitly passed; otherwise default to 'patient'
        const assignedRole = role === 'doctor' ? 'doctor' : 'patient';
        const user = await User.create({ name, email, password, phone, role: assignedRole });

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            data: {
                id:    user._id,
                name:  user.name,
                email: user.email,
                phone: user.phone,
                role:  user.role,
                token: generateToken(user._id)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST /api/auth/login ─────────────────────────────────
// Login user (patient, doctor, admin)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
        }

        res.json({
            success: true,
            message: 'Login successful!',
            data: {
                id:             user._id,
                name:           user.name,
                email:          user.email,
                phone:          user.phone,
                role:           user.role,
                linkedDoctorId: user.linkedDoctorId,
                token:          generateToken(user._id)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/auth/me ─────────────────────────────────────
// Get current logged in user
router.get('/me', protect, async (req, res) => {
    res.json({ success: true, data: req.user });
});

module.exports = router;
