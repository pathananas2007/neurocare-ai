const express     = require('express');
const Review      = require('../models/Review');
const Appointment = require('../models/Appointment');
const Doctor      = require('../models/Doctor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/reviews/doctor/:doctorId ────────────────────
// Get all reviews for a doctor (public)
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const reviews = await Review.find({ doctorId: req.params.doctorId })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST /api/reviews ────────────────────────────────────
// Submit a review (patient, after completed appointment)
router.post('/', protect, async (req, res) => {
    try {
        const { appointmentId, rating, note } = req.body;

        if (!appointmentId || !rating) {
            return res.status(400).json({ success: false, message: 'appointmentId and rating are required.' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
        }

        // Verify the appointment belongs to this user
        const apt = await Appointment.findOne({ _id: appointmentId, userId: req.user._id });
        if (!apt) {
            return res.status(404).json({ success: false, message: 'Appointment not found.' });
        }

        // Upsert: update existing review or create new one
        const review = await Review.findOneAndUpdate(
            { appointmentId },
            {
                doctorId:      apt.doctorId,
                appointmentId,
                userId:        req.user._id,
                patientName:   apt.patientName,
                rating,
                note:          note || ''
            },
            { upsert: true, new: true, runValidators: true }
        );

        // Also update the rating field on the appointment itself
        apt.rating     = rating;
        apt.ratingNote = note || '';
        await apt.save();

        // Recalculate and update doctor's average rating
        const allReviews = await Review.find({ doctorId: apt.doctorId });
        if (allReviews.length > 0) {
            const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
            await Doctor.findByIdAndUpdate(apt.doctorId, { rating: parseFloat(avg.toFixed(1)) });
        }

        res.status(201).json({ success: true, message: 'Review saved!', data: review });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
