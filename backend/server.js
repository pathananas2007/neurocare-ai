const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
require('dotenv').config();

const authRoutes        = require('./routes/auth');
const doctorRoutes      = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes       = require('./routes/admin');

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/doctors',      doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin',        adminRoutes);

// ── Health Check ────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: '✅ Doctor Booking API is running!' });
});

// ── Connect MongoDB & Start Server ──────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(process.env.PORT, () => {
            console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
    });
