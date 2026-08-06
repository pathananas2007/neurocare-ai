const express = require('express');
const Doctor  = require('../models/Doctor');
const { protect, adminOnly, doctorOnly } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/doctors ─────────────────────────────────────
// Get all doctors (public)
router.get('/', async (req, res) => {
    try {
        const { specialization, search } = req.query;
        let filter = {};

        if (specialization) filter.specialization = specialization;
        if (search) {
            filter.$or = [
                { name:           { $regex: search, $options: 'i' } },
                { specialization: { $regex: search, $options: 'i' } },
                { location:       { $regex: search, $options: 'i' } }
            ];
        }

        const doctors = await Doctor.find(filter).sort({ rating: -1 });
        res.json({ success: true, data: doctors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/doctors/:id ─────────────────────────────────
// Get single doctor (public)
router.get('/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
        res.json({ success: true, data: doctor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST /api/doctors ────────────────────────────────────
// Add new doctor (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const doctor = await Doctor.create({ ...req.body, isCustom: true });
        res.status(201).json({ success: true, message: 'Doctor added!', data: doctor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PUT /api/doctors/:id ─────────────────────────────────
// Update doctor (admin or the doctor themselves)
router.put('/:id', protect, async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

        // Allow admin or the linked doctor user
        const isAdmin  = req.user.role === 'admin';
        const isOwner  = doctor.linkedUserId?.toString() === req.user._id.toString();
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this doctor.' });
        }

        const updated = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ success: true, message: 'Doctor updated!', data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── DELETE /api/doctors/:id ──────────────────────────────
// Delete doctor (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndDelete(req.params.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
        res.json({ success: true, message: 'Doctor deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PATCH /api/doctors/:id/blocked-dates ─────────────────
// Set blocked dates for a doctor (admin or the doctor themselves)
router.patch('/:id/blocked-dates', protect, async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

        const isAdmin = req.user.role === 'admin';
        const isOwner = doctor.linkedUserId?.toString() === req.user._id.toString();
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        const { blockedDates } = req.body;
        if (!Array.isArray(blockedDates)) {
            return res.status(400).json({ success: false, message: 'blockedDates must be an array of date strings.' });
        }

        // Validate format: YYYY-MM-DD
        const valid = blockedDates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
        if (!valid) {
            return res.status(400).json({ success: false, message: 'All dates must be in YYYY-MM-DD format.' });
        }

        doctor.blockedDates = blockedDates;
        await doctor.save();

        res.json({ success: true, message: 'Blocked dates updated.', data: doctor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
