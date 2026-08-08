const express        = require('express');
const MedicalHistory = require('../models/MedicalHistory');
const { protect, doctorOnly } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/medical-history/me ───────────────────────────
// Patient reads their own medical history
router.get('/me', protect, async (req, res) => {
    try {
        const history = await MedicalHistory.findOne({ userId: req.user._id });
        res.json({ success: true, data: history || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PUT /api/medical-history/me ───────────────────────────
// Patient saves / updates their own medical history
router.put('/me', protect, async (req, res) => {
    try {
        const {
            age, gender, bloodGroup, weight, height,
            allergies, conditions, currentMedications,
            pastSurgeries, emergencyContact, insurance
        } = req.body;

        const history = await MedicalHistory.findOneAndUpdate(
            { userId: req.user._id },
            {
                userId: req.user._id,
                age:                age                || '',
                gender:             gender             || '',
                bloodGroup:         bloodGroup         || '',
                weight:             weight             || '',
                height:             height             || '',
                allergies:          allergies          || '',
                conditions:         conditions         || '',
                currentMedications: currentMedications || '',
                pastSurgeries:      pastSurgeries      || '',
                emergencyContact:   emergencyContact   || '',
                insurance:          insurance          || ''
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({ success: true, message: 'Medical history saved!', data: history });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/medical-history/patient/:userId ──────────────
// Doctor/admin reads a specific patient's medical history
router.get('/patient/:userId', protect, doctorOnly, async (req, res) => {
    try {
        const history = await MedicalHistory.findOne({ userId: req.params.userId });
        res.json({ success: true, data: history || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
