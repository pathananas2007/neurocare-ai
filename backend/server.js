// ── Force Google DNS to fix SRV resolution on restricted networks ──
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const cron       = require('node-cron');
require('dotenv').config();

const authRoutes           = require('./routes/auth');
const doctorRoutes         = require('./routes/doctors');
const appointmentRoutes    = require('./routes/appointments');
const adminRoutes          = require('./routes/admin');
const reviewRoutes         = require('./routes/reviews');
const prescriptionRoutes   = require('./routes/prescriptions');
const medicalHistoryRoutes = require('./routes/medicalHistory');
const Appointment          = require('./models/Appointment');
const { sendReminderEmail } = require('./utils/mailer');

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/doctors',         doctorRoutes);
app.use('/api/appointments',    appointmentRoutes);
app.use('/api/admin',           adminRoutes);
app.use('/api/reviews',         reviewRoutes);
app.use('/api/prescriptions',   prescriptionRoutes);
app.use('/api/medical-history', medicalHistoryRoutes);

// ── Health Check ────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: '✅ Doctor Booking API is running!' });
});

// ── 24-Hour Appointment Reminder Cron ───────────────────
// Runs every day at 10:00 AM — sends reminder emails for tomorrow's appointments
cron.schedule('0 10 * * *', async () => {
    console.log('⏰ Running 24-hour reminder cron job...');
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const appointments = await Appointment.find({
            date:         tomorrowStr,
            status:       { $in: ['pending', 'confirmed'] },
            patientEmail: { $ne: '' }
        });

        console.log(`📋 Found ${appointments.length} appointment(s) for tomorrow (${tomorrowStr})`);

        for (const apt of appointments) {
            await sendReminderEmail(apt);
        }
    } catch (err) {
        console.error('❌ Reminder cron error:', err.message);
    }
});

// ── Connect MongoDB & Start Server ──────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(process.env.PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
            console.log(`📧 Email notifications: ${process.env.EMAIL_USER ? 'enabled (' + process.env.EMAIL_USER + ')' : 'disabled (set EMAIL_USER and EMAIL_PASS in .env)'}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
    });
