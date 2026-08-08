const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true   // one record per patient
    },
    age:                { type: String, default: '' },
    gender:             { type: String, default: '' },
    bloodGroup:         { type: String, default: '' },
    weight:             { type: String, default: '' },
    height:             { type: String, default: '' },
    allergies:          { type: String, default: '' },
    conditions:         { type: String, default: '' },
    currentMedications: { type: String, default: '' },
    pastSurgeries:      { type: String, default: '' },
    emergencyContact:   { type: String, default: '' },
    insurance:          { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('MedicalHistory', medicalHistorySchema);
