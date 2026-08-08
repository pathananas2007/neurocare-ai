const express      = require('express');
const Prescription = require('../models/Prescription');
const Appointment  = require('../models/Appointment');
const { protect, doctorOnly } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/prescriptions/:appointmentId ─────────────────
// Get prescription for an appointment.
// Doctors can read any; patients can only read their own.
router.get('/:appointmentId', protect, async (req, res) => {
    try {
        const prescription = await Prescription.findOne({ appointmentId: req.params.appointmentId });
        if (!prescription) {
            return res.status(404).json({ success: false, message: 'No prescription found.' });
        }

        const isDoctor  = req.user.role === 'doctor' || req.user.role === 'admin';
        const isPatient = prescription.patientUserId?.toString() === req.user._id.toString();

        if (!isDoctor && !isPatient) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        res.json({ success: true, data: prescription });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST /api/prescriptions ───────────────────────────────
// Create or update a prescription (doctor only)
router.post('/', protect, doctorOnly, async (req, res) => {
    try {
        const { appointmentId, notes, medicines, followUpDate } = req.body;

        if (!appointmentId) {
            return res.status(400).json({ success: false, message: 'appointmentId is required.' });
        }
        if (!notes && !medicines) {
            return res.status(400).json({ success: false, message: 'Provide at least notes or medicines.' });
        }

        // Verify the appointment exists
        const apt = await Appointment.findById(appointmentId);
        if (!apt) {
            return res.status(404).json({ success: false, message: 'Appointment not found.' });
        }

        // Upsert prescription
        const prescription = await Prescription.findOneAndUpdate(
            { appointmentId },
            {
                appointmentId,
                doctorId:      apt.doctorId,
                patientUserId: apt.userId,
                notes:         notes    || '',
                medicines:     medicines || '',
                followUpDate:  followUpDate || ''
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(201).json({ success: true, message: 'Prescription saved!', data: prescription });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
