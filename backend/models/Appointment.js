const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    doctorName: {
        type: String,
        required: true
    },
    doctorAvatar: {
        type: String,
        default: '👨‍⚕️'
    },
    specialization: {
        type: String
    },
    location: {
        type: String
    },
    fee: {
        type: Number,
        default: 0
    },
    patientName: {
        type: String,
        required: [true, 'Patient name is required'],
        trim: true
    },
    patientPhone: {
        type: String,
        required: [true, 'Patient phone is required'],
        trim: true
    },
    patientEmail: {
        type: String,
        trim: true,
        default: ''
    },
    date: {
        type: String,
        required: [true, 'Appointment date is required']
    },
    time: {
        type: String,
        required: [true, 'Appointment time is required']
    },
    reason: {
        type: String,
        default: ''
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'upi', 'card'],
        default: 'cash'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    ratingNote: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
