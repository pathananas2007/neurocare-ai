const express     = require('express');
const Appointment = require('../models/Appointment');
const Doctor      = require('../models/Doctor');
const { protect, doctorOnly } = require('../middleware/auth');
const { sendBookingConfirmation, sendStatusUpdate } = require('../utils/mailer');

const router = express.Router();

// ── POST /api/appointments ───────────────────────────────
// Book an appointment (logged-in patients)
router.post('/', protect, async (req, res) => {
    try {
        const { doctorId, patientName, patientPhone, patientEmail, date, time, reason, paymentMethod, paymentStatus } = req.body;

        if (!doctorId || !patientName || !patientPhone || !date || !time) {
            return res.status(400).json({ success: false, message: 'Required fields missing.' });
        }

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

        // Check if slot already booked
        const existing = await Appointment.findOne({
            doctorId,
            date,
            time,
            status: { $nin: ['cancelled'] }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: 'This slot is already booked. Please choose another time.' });
        }

        // Check if date is blocked by the doctor
        if (doctor.blockedDates && doctor.blockedDates.includes(date)) {
            return res.status(400).json({ success: false, message: 'The doctor is unavailable on this date. Please choose another date.' });
        }

        const appointment = await Appointment.create({
            doctorId,
            doctorName:     doctor.name,
            doctorAvatar:   doctor.avatar,
            specialization: doctor.specialization,
            location:       doctor.location,
            fee:            doctor.fee,
            patientName,
            patientPhone,
            patientEmail:   patientEmail || '',
            date,
            time,
            reason:         reason || '',
            userId:         req.user._id,
            paymentMethod:  paymentMethod || 'cash',
            paymentStatus:  paymentStatus || 'pending',
            status:         'pending'
        });

        // Send confirmation email (non-blocking)
        sendBookingConfirmation(appointment).catch(console.error);

        res.status(201).json({ success: true, message: 'Appointment booked!', data: appointment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/appointments/my ─────────────────────────────
// Get current patient's own appointments
router.get('/my', protect, async (req, res) => {
    try {
        const appointments = await Appointment.find({ userId: req.user._id })
            .populate('doctorId', 'name specialization avatar')
            .sort({ date: 1 });
        res.json({ success: true, data: appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/appointments/doctor/:doctorId ───────────────
// Get appointments for a specific doctor (doctor/admin only)
router.get('/doctor/:doctorId', protect, doctorOnly, async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctorId: req.params.doctorId })
            .sort({ date: 1 });
        res.json({ success: true, data: appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PATCH /api/appointments/:id/status ──────────────────
// Update appointment status (doctor/admin) — sends email to patient
router.patch('/:id/status', protect, doctorOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });

        // Send status update email to patient (non-blocking)
        sendStatusUpdate(appointment).catch(console.error);

        res.json({ success: true, message: 'Status updated.', data: appointment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PATCH /api/appointments/:id/rate ────────────────────
// Patient rates an appointment
router.patch('/:id/rate', protect, async (req, res) => {
    try {
        const { rating, ratingNote } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
        }

        const appointment = await Appointment.findOne({ _id: req.params.id, userId: req.user._id });
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });

        appointment.rating     = rating;
        appointment.ratingNote = ratingNote || '';
        await appointment.save();

        res.json({ success: true, message: 'Rating saved!', data: appointment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── DELETE /api/appointments/:id ─────────────────────────
// Cancel/delete appointment (patient cancels own, admin deletes any)
router.delete('/:id', protect, async (req, res) => {
    try {
        const query = req.user.role === 'admin'
            ? { _id: req.params.id }
            : { _id: req.params.id, userId: req.user._id };

        const appointment = await Appointment.findOneAndDelete(query);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });

        res.json({ success: true, message: 'Appointment deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
