const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true,
        unique: true   // one prescription per appointment
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    patientUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: {
        type: String,
        default: '',
        trim: true
    },
    medicines: {
        type: String,
        default: '',
        trim: true
    },
    followUpDate: {
        type: String,   // ISO date string e.g. "2026-09-01"
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
