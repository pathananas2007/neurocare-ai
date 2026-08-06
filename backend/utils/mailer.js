/* ============================================================
   mailer.js – Nodemailer email utility
   Uses Gmail (or any SMTP) configured via .env
   ============================================================ */

const nodemailer = require('nodemailer');

/* ── Transporter ───────────────────────────────────────── */

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS   // App Password for Gmail (not your login password)
        }
    });

    return transporter;
}

/* ── HTML email wrapper ─────────────────────────────────── */

function wrapHTML(title, bodyHTML) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#f1f5f9; margin:0; padding:0; }
    .wrapper { max-width:580px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header  { background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:28px 32px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:1.5rem; letter-spacing:-0.5px; }
    .header p  { color:rgba(255,255,255,0.85); margin:6px 0 0; font-size:0.9rem; }
    .body    { padding:32px; color:#374151; line-height:1.65; }
    .info-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:18px 20px; margin:20px 0; }
    .info-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e9ecf0; font-size:0.9rem; }
    .info-row:last-child { border-bottom:none; }
    .info-label { color:#6b7280; }
    .info-value { color:#111827; font-weight:600; }
    .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600; }
    .badge-green  { background:#d1fae5; color:#065f46; }
    .badge-red    { background:#fee2e2; color:#991b1b; }
    .badge-blue   { background:#dbeafe; color:#1e40af; }
    .badge-yellow { background:#fef9c3; color:#92400e; }
    .cta { text-align:center; margin:24px 0 8px; }
    .btn { display:inline-block; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff !important; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:600; font-size:0.95rem; }
    .footer { background:#f8fafc; padding:16px 32px; text-align:center; color:#9ca3af; font-size:0.8rem; border-top:1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>⚕️ Wellness Forever</h1>
      <p>Healthcare Appointments Made Simple</p>
    </div>
    <div class="body">${bodyHTML}</div>
    <div class="footer">© ${new Date().getFullYear()} Wellness Forever · This is an automated message, please do not reply.</div>
  </div>
</body>
</html>`;
}

/* ── Format date helper ─────────────────────────────────── */

function fmtDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

/* ── Core send helper ───────────────────────────────────── */

async function sendMail({ to, subject, html }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️  Email not sent — EMAIL_USER / EMAIL_PASS not set in .env');
        return;
    }
    try {
        const info = await getTransporter().sendMail({
            from: `"Wellness Forever" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`📧 Email sent to ${to} — ${info.messageId}`);
    } catch (err) {
        // Log but never crash the server
        console.error('❌ Email send error:', err.message);
    }
}

/* ══════════════════════════════════════════════════════════
   PUBLIC EMAIL FUNCTIONS
══════════════════════════════════════════════════════════ */

/**
 * Sent to the patient right after booking.
 */
async function sendBookingConfirmation(appointment) {
    const { patientEmail, patientName, doctorName, specialization, date, time, fee, paymentMethod, _id } = appointment;
    if (!patientEmail) return;

    const payLabel = paymentMethod === 'upi' ? '📱 UPI' : paymentMethod === 'card' ? '💳 Card' : '🏥 Cash on Visit';

    const html = wrapHTML('Appointment Confirmed', `
        <p>Hi <strong>${patientName}</strong>,</p>
        <p>Your appointment has been successfully booked at <strong>Wellness Forever</strong>. Here are the details:</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">👨‍⚕️ ${doctorName}</span></div>
            <div class="info-row"><span class="info-label">Specialization</span><span class="info-value">${specialization || '—'}</span></div>
            <div class="info-row"><span class="info-label">Date</span><span class="info-value">📅 ${fmtDate(date)}</span></div>
            <div class="info-row"><span class="info-label">Time</span><span class="info-value">🕐 ${time}</span></div>
            <div class="info-row"><span class="info-label">Consultation Fee</span><span class="info-value">💰 ₹${fee || 0}</span></div>
            <div class="info-row"><span class="info-label">Payment Method</span><span class="info-value">${payLabel}</span></div>
            <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value" style="font-size:0.78rem;color:#6b7280">${_id}</span></div>
        </div>
        <p>Please arrive <strong>10 minutes early</strong>. Carry any relevant medical reports or prescriptions.</p>
        <p>If you need to cancel, please do so at least a few hours in advance via your Appointments page.</p>
        <p style="margin-top:24px;">Take care and stay healthy! 💙</p>
    `);

    await sendMail({ to: patientEmail, subject: '✅ Appointment Confirmed – Wellness Forever', html });
}

/**
 * Sent to the patient when doctor confirms or cancels.
 */
async function sendStatusUpdate(appointment) {
    const { patientEmail, patientName, doctorName, date, time, status } = appointment;
    if (!patientEmail) return;

    const isConfirmed = status === 'confirmed';
    const isCancelled = status === 'cancelled';
    const isCompleted = status === 'completed';

    let badgeHTML = '';
    let headline  = '';
    let message   = '';

    if (isConfirmed) {
        badgeHTML = '<span class="badge badge-green">✅ Confirmed</span>';
        headline  = 'Your appointment has been confirmed!';
        message   = `Great news! <strong>Dr. ${doctorName}</strong> has confirmed your appointment on <strong>${fmtDate(date)}</strong> at <strong>${time}</strong>. Please make sure to be on time.`;
    } else if (isCancelled) {
        badgeHTML = '<span class="badge badge-red">❌ Cancelled</span>';
        headline  = 'Your appointment has been cancelled';
        message   = `We regret to inform you that your appointment with <strong>Dr. ${doctorName}</strong> on <strong>${fmtDate(date)}</strong> at <strong>${time}</strong> has been cancelled. Please book a new slot at your convenience.`;
    } else if (isCompleted) {
        badgeHTML = '<span class="badge badge-blue">🏁 Completed</span>';
        headline  = 'Your appointment is marked as completed';
        message   = `Your consultation with <strong>Dr. ${doctorName}</strong> on <strong>${fmtDate(date)}</strong> is now complete. We hope you had a great experience! Don't forget to rate your visit.`;
    } else {
        return; // Don't send email for other statuses
    }

    const html = wrapHTML('Appointment Status Update', `
        <p>Hi <strong>${patientName}</strong>,</p>
        <p>${badgeHTML}</p>
        <p>${message}</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">${doctorName}</span></div>
            <div class="info-row"><span class="info-label">Date</span><span class="info-value">📅 ${fmtDate(date)}</span></div>
            <div class="info-row"><span class="info-label">Time</span><span class="info-value">🕐 ${time}</span></div>
        </div>
        <p style="margin-top:24px;">— The Wellness Forever Team 💙</p>
    `);

    const subjectMap = {
        confirmed: '✅ Appointment Confirmed by Doctor – Wellness Forever',
        cancelled:  '❌ Appointment Cancelled – Wellness Forever',
        completed:  '🏁 Appointment Completed – Wellness Forever'
    };

    await sendMail({ to: patientEmail, subject: subjectMap[status] || 'Appointment Update – Wellness Forever', html });
}

/**
 * 24-hour reminder. Called by node-cron scheduler in server.js.
 */
async function sendReminderEmail(appointment) {
    const { patientEmail, patientName, doctorName, specialization, date, time, location } = appointment;
    if (!patientEmail) return;

    const html = wrapHTML('Appointment Reminder – Tomorrow', `
        <p>Hi <strong>${patientName}</strong>,</p>
        <p>⏰ This is a friendly reminder that you have an appointment <strong>tomorrow</strong>!</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">👨‍⚕️ ${doctorName}</span></div>
            <div class="info-row"><span class="info-label">Specialization</span><span class="info-value">${specialization || '—'}</span></div>
            <div class="info-row"><span class="info-label">Date</span><span class="info-value">📅 ${fmtDate(date)}</span></div>
            <div class="info-row"><span class="info-label">Time</span><span class="info-value">🕐 ${time}</span></div>
            ${location ? `<div class="info-row"><span class="info-label">Location</span><span class="info-value">📍 ${location}</span></div>` : ''}
        </div>
        <p><strong>Tips for your visit:</strong></p>
        <ul style="color:#374151;padding-left:20px;line-height:2;">
            <li>Arrive 10 minutes before your appointment time</li>
            <li>Carry a valid photo ID</li>
            <li>Bring any previous medical reports or prescriptions</li>
            <li>Note down any symptoms or questions for the doctor</li>
        </ul>
        <p style="margin-top:24px;">See you tomorrow! Stay healthy 💙</p>
    `);

    await sendMail({ to: patientEmail, subject: '⏰ Reminder: Appointment Tomorrow – Wellness Forever', html });
}

module.exports = { sendBookingConfirmation, sendStatusUpdate, sendReminderEmail };
