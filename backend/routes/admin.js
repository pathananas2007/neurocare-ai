const express     = require('express');
const User        = require('../models/User');
const Doctor      = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All admin routes require login + admin role
router.use(protect, adminOnly);

// ── GET /api/admin/stats ─────────────────────────────────
// Dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalApts, upcomingApts, totalDoctors, totalPatients] = await Promise.all([
            Appointment.countDocuments(),
            Appointment.countDocuments({ date: { $gte: today.toISOString().split('T')[0] } }),
            Doctor.countDocuments(),
            User.countDocuments({ role: 'patient' })
        ]);

        res.json({
            success: true,
            data: { totalApts, upcomingApts, pastApts: totalApts - upcomingApts, totalDoctors, totalPatients }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/admin/appointments ──────────────────────────
// Get all appointments with filters
router.get('/appointments', async (req, res) => {
    try {
        const { search, specialization } = req.query;
        let filter = {};

        if (specialization) filter.specialization = specialization;
        if (search) {
            filter.$or = [
                { patientName:  { $regex: search, $options: 'i' } },
                { doctorName:   { $regex: search, $options: 'i' } },
                { patientPhone: { $regex: search, $options: 'i' } },
                { patientEmail: { $regex: search, $options: 'i' } }
            ];
        }

        const appointments = await Appointment.find(filter).sort({ date: 1 });
        res.json({ success: true, data: appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── DELETE /api/admin/appointments/all ──────────────────
// Clear all appointments
router.delete('/appointments/all', async (req, res) => {
    try {
        await Appointment.deleteMany({});
        res.json({ success: true, message: 'All appointments cleared.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/admin/patients ──────────────────────────────
// Get all patients
router.get('/patients', async (req, res) => {
    try {
        const { search } = req.query;
        let filter = { role: 'patient' };

        if (search) {
            filter.$or = [
                { name:  { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const patients = await User.find(filter).select('-password').sort({ createdAt: -1 });

        // Attach booking count per patient
        const patientsWithCount = await Promise.all(patients.map(async (p) => {
            const bookingCount = await Appointment.countDocuments({ userId: p._id });
            return { ...p.toObject(), bookingCount };
        }));

        res.json({ success: true, data: patientsWithCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
