/* ============================================================
   seed.js – Seeds MongoDB with doctors from doctors.json
   Run: node seed.js
============================================================ */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config();

const Doctor = require('./models/Doctor');
const User   = require('./models/User');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected');

        // ── Seed Doctors ──────────────────────────────────
        const jsonPath   = path.join(__dirname, '../doctor-booking/data/doctors.json');
        const rawDoctors = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        await Doctor.deleteMany({});
        const doctors = await Doctor.insertMany(rawDoctors.map(d => ({
            name:           d.name,
            specialization: d.specialization,
            experience:     d.experience,
            location:       d.location,
            fee:            d.fee,
            email:          d.email,
            avatar:         d.avatar || '👨‍⚕️',
            bio:            d.bio || '',
            rating:         d.rating || 5.0,
            availableSlots: d.availableSlots || [],
            isCustom:       false
        })));
        console.log(`✅ ${doctors.length} doctors seeded`);

        // ── Seed Admin User ───────────────────────────────
        const adminExists = await User.findOne({ email: 'admin@wellnessforever.in' });
        if (!adminExists) {
            await User.create({
                name:     'Admin',
                email:    'admin@wellnessforever.in',
                password: 'admin123',
                phone:    '0000000000',
                role:     'admin'
            });
            console.log('✅ Admin user created → admin@wellnessforever.in / admin123');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        console.log('\n🎉 Database seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
};

seedData();
