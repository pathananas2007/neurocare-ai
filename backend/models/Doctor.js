const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Doctor name is required'],
        trim: true
    },
    specialization: {
        type: String,
        required: [true, 'Specialization is required'],
        trim: true
    },
    experience: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    fee: {
        type: Number,
        default: 0
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    avatar: {
        type: String,
        default: '👨‍⚕️'
    },
    bio: {
        type: String,
        default: ''
    },
    rating: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5
    },
    availableSlots: {
        type: [String],
        default: []
    },
    blockedDates: {
        type: [String],   // ISO date strings e.g. "2026-08-15"
        default: []
    },
    linkedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isCustom: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
