/* ============================================================
   script.js – Home, Booking & Appointments Logic
   ============================================================ */

const APPOINTMENTS_KEY   = 'wf_appointments';
const SELECTED_DOC_KEY   = 'wf_selected_doctor';

let doctorsData          = [];
let pendingDeleteId      = null;

/* ══════════════════════════════════════════════════════════
   HOME PAGE – Doctor Listing
══════════════════════════════════════════════════════════ */

async function loadDoctors() {
    try {
        const res    = await fetch('data/doctors.json');
        doctorsData  = await res.json();

        populateSpecializations();
        renderDoctors(doctorsData);

        // Search
        const searchInput = document.getElementById('searchInput');
        const clearBtn    = document.getElementById('clearSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const hasValue = searchInput.value.length > 0;
                clearBtn && clearBtn.classList.toggle('hidden', !hasValue);
                filterDoctorList();
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.classList.add('hidden');
                filterDoctorList();
            });
        }

        // Filter / sort
        const specFilter = document.getElementById('specializationFilter');
        const sortFilter = document.getElementById('sortFilter');
        if (specFilter) specFilter.addEventListener('change', filterDoctorList);
        if (sortFilter) sortFilter.addEventListener('change', filterDoctorList);

    } catch (err) {
        console.error('Failed to load doctors:', err);
        const list = document.getElementById('doctors-list');
        if (list) list.innerHTML = `
            <div class="alert error" style="grid-column:1/-1;">
                <span>⚠️</span>
                <div>
                    <strong>Could not load doctors.</strong>
                    <p>Please open this project with a local server (e.g. VS Code Live Server) — browsers block local fetch() requests for security.</p>
                </div>
            </div>`;
    }
}

function renderDoctors(doctors) {
    const list       = document.getElementById('doctors-list');
    const countEl    = document.getElementById('resultsCount');
    if (!list) return;

    list.innerHTML = '';
    if (countEl) {
        countEl.textContent = doctors.length === 0
            ? 'No doctors match your search.'
            : `Showing ${doctors.length} doctor${doctors.length !== 1 ? 's' : ''}`;
    }

    if (doctors.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="empty-icon">🔍</div>
                <h3>No doctors found</h3>
                <p>Try a different name or specialization.</p>
            </div>`;
        return;
    }

    doctors.forEach((doc, i) => {
        const stars  = renderStars(doc.rating || 4.5);
        const card   = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${i * 0.07}s`;
        card.setAttribute('role', 'listitem');
        card.innerHTML = `
            <div class="card-header">
                <div class="avatar">${doc.avatar || '👨‍⚕️'}</div>
                <div class="doctor-meta">
                    <h3>${escapeHTML(doc.name)}</h3>
                    <span class="badge">${escapeHTML(doc.specialization)}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="card-meta-row">
                    <div class="meta-chip">🏆 ${escapeHTML(doc.experience)}</div>
                    <div class="meta-chip">💰 ₹${doc.fee}</div>
                </div>
                <p>📍 ${escapeHTML(doc.location)}</p>
                <div class="star-rating" title="${doc.rating} / 5">${stars} <small style="color:var(--text-muted)">${doc.rating}</small></div>
                <p class="card-bio">${escapeHTML(doc.bio || '')}</p>
            </div>
            <div class="card-footer">
                <button
                    id="book-btn-${doc.id}"
                    onclick="goToBooking('${doc.id}')"
                    class="btn btn-primary btn-block">
                    Book Appointment
                </button>
            </div>`;
        list.appendChild(card);
    });
}

function filterDoctorList() {
    const search   = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const spec     = document.getElementById('specializationFilter')?.value || '';
    const sort     = document.getElementById('sortFilter')?.value || '';

    let filtered = doctorsData.filter(doc => {
        const matchSearch = !search ||
            doc.name.toLowerCase().includes(search) ||
            doc.specialization.toLowerCase().includes(search) ||
            (doc.location || '').toLowerCase().includes(search);
        const matchSpec = !spec || doc.specialization === spec;
        return matchSearch && matchSpec;
    });

    if (sort === 'rating')    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sort === 'experience') filtered.sort((a, b) => parseInt(b.experience) - parseInt(a.experience));
    if (sort === 'fee-asc')   filtered.sort((a, b) => (a.fee || 0) - (b.fee || 0));
    if (sort === 'fee-desc')  filtered.sort((a, b) => (b.fee || 0) - (a.fee || 0));

    renderDoctors(filtered);
}

function populateSpecializations() {
    const filter = document.getElementById('specializationFilter');
    if (!filter) return;
    const specs = [...new Set(doctorsData.map(d => d.specialization))].sort();
    specs.forEach(spec => {
        const opt      = document.createElement('option');
        opt.value      = spec;
        opt.textContent = spec;
        filter.appendChild(opt);
    });
}

function goToBooking(doctorId) {
    const user = getLoggedInUser();
    if (!user) {
        showToast('Please login first to book an appointment.', 'error');
        setTimeout(() => window.location.href = `login.html?redirect=book.html`, 1200);
        return;
    }
    const doctor = doctorsData.find(d => d.id === doctorId);
    if (doctor) {
        localStorage.setItem(SELECTED_DOC_KEY, JSON.stringify(doctor));
        window.location.href = 'book.html';
    }
}


/* ══════════════════════════════════════════════════════════
   BOOKING PAGE
══════════════════════════════════════════════════════════ */

function initBookingPage() {
    const doctorStr  = localStorage.getItem(SELECTED_DOC_KEY);
    const form       = document.getElementById('booking-form');
    const errorBlock = document.getElementById('error-message');
    const infoBox    = document.getElementById('selected-doctor-info');

    if (!doctorStr) {
        errorBlock && errorBlock.classList.remove('hidden');
        return;
    }

    const doctor = JSON.parse(doctorStr);

    // Pre-fill from session
    const user = getLoggedInUser();
    if (user) {
        const nameInput  = document.getElementById('patientName');
        const emailInput = document.getElementById('patientEmail');
        const phoneInput = document.getElementById('patientPhone');
        if (nameInput  && !nameInput.value)  nameInput.value  = user.name  || '';
        if (emailInput && !emailInput.value) emailInput.value = user.email || '';
        if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
    }

    // Show doctor info banner
    if (infoBox) {
        infoBox.classList.remove('hidden');
        infoBox.innerHTML = `
            <div class="sdi-avatar">${doctor.avatar || '👨‍⚕️'}</div>
            <div>
                <h3>${escapeHTML(doctor.name)}</h3>
                <p>${escapeHTML(doctor.specialization)} • ${escapeHTML(doctor.experience)}</p>
                <p>📍 ${escapeHTML(doctor.location)} &nbsp;|&nbsp; 💰 Consultation Fee: <strong>₹${doctor.fee}</strong></p>
            </div>`;
    }

    // Show form
    form && form.classList.remove('hidden');

    // Set min date = today
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        const today    = new Date().toISOString().split('T')[0];
        dateInput.min  = today;
    }

    // Populate time slots
    const timeSelect = document.getElementById('appointmentTime');
    if (timeSelect && doctor.availableSlots?.length) {
        doctor.availableSlots.forEach(slot => {
            const opt      = document.createElement('option');
            opt.value      = slot;
            opt.textContent = slot;
            timeSelect.appendChild(opt);
        });
    }

    // Step states
    setStep(2);

    form?.addEventListener('submit', e => {
        e.preventDefault();
        if (validateBookingForm()) saveAppointment(doctor);
    });
}

function validateBookingForm() {
    let valid = true;

    const fields = [
        { id: 'patientName',      errId: 'err-name',  check: v => v.trim().length >= 2, msg: 'Enter your full name (min 2 characters).' },
        { id: 'patientPhone',     errId: 'err-phone', check: v => isValidPhone(v),       msg: 'Enter a valid 10-digit phone number.'     },
        { id: 'appointmentDate',  errId: 'err-date',  check: v => {                      
            if (!v) return false;
            const sel  = new Date(v);
            const today = new Date(); today.setHours(0,0,0,0);
            return sel >= today;
          }, msg: 'Choose a valid date (today or later).' },
        { id: 'appointmentTime',  errId: 'err-time',  check: v => v !== '',              msg: 'Please select a time slot.'               },
    ];

    fields.forEach(({ id, errId, check, msg }) => {
        const input = document.getElementById(id);
        const errEl = document.getElementById(errId);
        if (!input) return;
        const val   = input.value;
        if (!check(val)) {
            if (errEl) errEl.textContent = msg;
            input.classList.add('invalid');
            valid = false;
        } else {
            if (errEl) errEl.textContent = '';
            input.classList.remove('invalid');
        }
    });

    // Optional email validation
    const emailInput = document.getElementById('patientEmail');
    const errEmail   = document.getElementById('err-email');
    if (emailInput?.value && !isValidEmail(emailInput.value)) {
        if (errEmail) errEmail.textContent = 'Enter a valid email address.';
        emailInput.classList.add('invalid');
        valid = false;
    } else {
        if (errEmail) errEmail.textContent = '';
        emailInput?.classList.remove('invalid');
    }

    return valid;
}

function saveAppointment(doctor) {
    const submitBtn  = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = 'Booking…';
    }

    const user = getLoggedInUser();

    const appointment = {
        id:             Date.now().toString(),
        doctorId:       doctor.id,
        doctorName:     doctor.name,
        doctorAvatar:   doctor.avatar || '👨‍⚕️',
        specialization: doctor.specialization,
        location:       doctor.location,
        fee:            doctor.fee,
        patientName:    document.getElementById('patientName').value.trim(),
        patientPhone:   document.getElementById('patientPhone').value.trim(),
        patientEmail:   document.getElementById('patientEmail').value.trim(),
        date:           document.getElementById('appointmentDate').value,
        time:           document.getElementById('appointmentTime').value,
        reason:         document.getElementById('reason')?.value.trim() || '',
        userId:         user?.id || 'guest',
        createdAt:      new Date().toISOString(),
    };

    // Simulate a tiny delay for UX polish
    setTimeout(() => {
        const appointments = getAppointments();
        appointments.push(appointment);
        localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
        localStorage.removeItem(SELECTED_DOC_KEY);

        // UI swap
        document.getElementById('booking-form').classList.add('hidden');
        document.getElementById('selected-doctor-info').classList.add('hidden');
        document.getElementById('success-message').classList.remove('hidden');
        setStep(3);
    }, 600);
}

function setStep(n) {
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById(`step${i}-dot`);
        if (!dot) continue;
        dot.classList.remove('active', 'done');
        if (i < n)  dot.classList.add('done');
        if (i === n) dot.classList.add('active');
    }
}


/* ══════════════════════════════════════════════════════════
   APPOINTMENTS PAGE
══════════════════════════════════════════════════════════ */

let currentFilter = 'all';

function loadAppointments() {
    renderAppointments(currentFilter);

    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.dataset.filter;
            renderAppointments(currentFilter);
        });
    });

    // Modal wiring
    wireModal(
        'confirmModal',
        'modalCancelBtn',
        'modalConfirmBtn',
        () => {
            if (!pendingDeleteId) return;
            deleteAppointment(pendingDeleteId);
            pendingDeleteId = null;
        }
    );
}

function renderAppointments(filter = 'all') {
    const list     = document.getElementById('appointments-list');
    const emptyEl  = document.getElementById('no-appointments');
    if (!list) return;

    const user         = getLoggedInUser();
    const all          = getAppointments();
    const today        = new Date(); today.setHours(0,0,0,0);

    // Show user's own appointments (or all if no session)
    let visible = user
        ? all.filter(a => a.userId === user.id || a.userId === 'guest')
        : all;

    if (filter === 'upcoming') visible = visible.filter(a => new Date(a.date) >= today);
    if (filter === 'past')     visible = visible.filter(a => new Date(a.date) <  today);

    visible.sort((a, b) => new Date(a.date) - new Date(b.date));

    list.innerHTML = '';

    if (visible.length === 0) {
        emptyEl && emptyEl.classList.remove('hidden');
        return;
    }

    emptyEl && emptyEl.classList.add('hidden');

    visible.forEach((apt, i) => {
        const isPast   = new Date(apt.date) < today;
        const card     = document.createElement('div');
        card.className = 'apt-card';
        card.style.animationDelay = `${i * 0.06}s`;
        card.innerHTML = `
            <div class="apt-card-top">
                <div class="apt-avatar">${apt.doctorAvatar || '👨‍⚕️'}</div>
                <div>
                    <div class="apt-doc-name">${escapeHTML(apt.doctorName)}</div>
                    <span class="badge">${escapeHTML(apt.specialization)}</span>
                    &nbsp;
                    <span class="status-badge ${isPast ? 'status-past' : 'status-upcoming'}">
                        ${isPast ? '⏰ Past' : '✅ Upcoming'}
                    </span>
                </div>
            </div>
            <div class="apt-details-grid">
                <div class="apt-detail">
                    <div class="label">Patient</div>
                    <div class="value">${escapeHTML(apt.patientName)}</div>
                </div>
                <div class="apt-detail">
                    <div class="label">Phone</div>
                    <div class="value">${escapeHTML(apt.patientPhone || '—')}</div>
                </div>
                <div class="apt-detail">
                    <div class="label">Date</div>
                    <div class="value">${formatDate(apt.date)}</div>
                </div>
                <div class="apt-detail">
                    <div class="label">Time</div>
                    <div class="value">${escapeHTML(apt.time)}</div>
                </div>
                ${apt.reason ? `
                <div class="apt-detail" style="grid-column:1/-1">
                    <div class="label">Reason</div>
                    <div class="value">${escapeHTML(apt.reason)}</div>
                </div>` : ''}
            </div>
            <div class="apt-card-actions">
                <button
                    id="cancel-btn-${apt.id}"
                    class="btn btn-danger"
                    style="flex:1"
                    onclick="confirmCancel('${apt.id}')">
                    🗑️ Cancel
                </button>
                <button
                    id="receipt-btn-${apt.id}"
                    class="btn btn-outline"
                    style="flex:1"
                    onclick="downloadReceipt('${apt.id}')">
                    📄 Receipt
                </button>
            </div>`;
        list.appendChild(card);
    });
}

function confirmCancel(id) {
    pendingDeleteId = id;
    document.getElementById('confirmModal').classList.remove('hidden');
}

function deleteAppointment(id) {
    let apts = getAppointments().filter(a => a.id !== id);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(apts));
    showToast('Appointment cancelled.', 'success');
    renderAppointments(currentFilter);
}


/* ══════════════════════════════════════════════════════════
   SHARED UTILITIES
══════════════════════════════════════════════════════════ */

function getAppointments() {
    return JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)) || [];
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    // Add T00:00 to avoid timezone offset issues
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday:'short', year:'numeric', month:'long', day:'numeric' });
}

function renderStars(rating) {
    const full    = Math.floor(rating);
    const half    = rating % 1 >= 0.5;
    let stars     = '★'.repeat(full);
    if (half)   stars += '½';
    stars        += '☆'.repeat(5 - full - (half ? 1 : 0));
    return stars;
}

function escapeHTML(str) {
    if (typeof str !== 'string') return str ?? '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ══════════════════════════════════════════════════════════
   DOWNLOAD RECEIPT
══════════════════════════════════════════════════════════ */

function downloadReceipt(aptId) {
    const apts = getAppointments();
    const apt  = apts.find(a => a.id === aptId);
    if (!apt) { showToast('Appointment not found.', 'error'); return; }

    const bookedOn = new Date(apt.createdAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const aptDate = new Date(apt.date + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Appointment Receipt – ${apt.doctorName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Outfit',sans-serif;background:#f0f4ff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:40px 20px}
    .receipt{background:#fff;max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(99,102,241,0.18)}
    .receipt-header{background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;padding:36px 40px;text-align:center}
    .receipt-header .logo{font-size:1.1rem;font-weight:700;opacity:0.9;margin-bottom:10px}
    .receipt-header h1{font-size:2rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px}
    .receipt-header p{opacity:0.85;font-size:0.95rem}
    .receipt-id{background:rgba(255,255,255,0.2);border-radius:50px;padding:6px 18px;display:inline-block;font-size:0.8rem;font-weight:700;margin-top:14px;letter-spacing:1px}
    .receipt-body{padding:36px 40px}
    .section-title{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #f1f5f9}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
    .info-item .label{font-size:0.78rem;color:#94a3b8;font-weight:600;margin-bottom:4px}
    .info-item .value{font-size:0.97rem;font-weight:700;color:#0f172a}
    .info-item.full{grid-column:1/-1}
    .highlight-box{background:linear-gradient(135deg,#eef2ff,#fdf2f8);border:1px solid rgba(99,102,241,0.2);border-radius:14px;padding:22px 24px;margin-bottom:28px;display:flex;align-items:center;gap:16px}
    .doc-avatar{font-size:2.8rem}
    .doc-name{font-size:1.15rem;font-weight:800;margin-bottom:4px;color:#0f172a}
    .doc-spec{display:inline-block;background:#eef2ff;color:#6366f1;padding:4px 12px;border-radius:50px;font-size:0.8rem;font-weight:700}
    .doc-meta{font-size:0.87rem;color:#64748b;margin-top:8px}
    .fee-row{background:#0f172a;color:#fff;border-radius:14px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:28px}
    .fee-label{font-size:0.9rem;opacity:0.7;font-weight:600}
    .fee-amount{font-size:1.8rem;font-weight:800;color:#a5b4fc}
    .badge-row{margin-bottom:28px}
    .status-badge{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:50px;font-size:0.85rem;font-weight:700;background:#d1fae5;color:#065f46}
    .footer-note{text-align:center;font-size:0.82rem;color:#94a3b8;padding:20px 40px;border-top:1px solid #f1f5f9;line-height:1.6}
    .footer-logo{font-weight:800;color:#6366f1}
    @media print{
      body{background:#fff;padding:0}
      .receipt{box-shadow:none;border-radius:0;max-width:100%}
      .no-print{display:none}
    }
    .print-btn{display:block;width:100%;padding:16px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;text-align:center;margin-top:0}
    .print-btn:hover{background:linear-gradient(135deg,#4f46e5,#6366f1)}
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <div class="logo">⚕️ Wellness Forever</div>
      <h1>Appointment Receipt</h1>
      <p>Thank you for choosing Wellness Forever</p>
      <div class="receipt-id">REF# WF-${apt.id.slice(-8).toUpperCase()}</div>
    </div>
    <div class="receipt-body">
      <p class="section-title">Doctor Information</p>
      <div class="highlight-box">
        <div class="doc-avatar">${apt.doctorAvatar || '👨\u200d⚕️'}</div>
        <div>
          <div class="doc-name">${apt.doctorName}</div>
          <span class="doc-spec">${apt.specialization}</span>
          <div class="doc-meta">📍 ${apt.location || 'N/A'}</div>
        </div>
      </div>

      <p class="section-title">Appointment Details</p>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">📅 Date</div>
          <div class="value">${aptDate}</div>
        </div>
        <div class="info-item">
          <div class="label">🕐 Time Slot</div>
          <div class="value">${apt.time}</div>
        </div>
      </div>

      <p class="section-title">Patient Information</p>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">👤 Patient Name</div>
          <div class="value">${apt.patientName}</div>
        </div>
        <div class="info-item">
          <div class="label">📞 Phone</div>
          <div class="value">${apt.patientPhone || '—'}</div>
        </div>
        ${apt.patientEmail ? `<div class="info-item full"><div class="label">📧 Email</div><div class="value">${apt.patientEmail}</div></div>` : ''}
        ${apt.reason ? `<div class="info-item full"><div class="label">📝 Reason for Visit</div><div class="value">${apt.reason}</div></div>` : ''}
      </div>

      <div class="fee-row">
        <span class="fee-label">💰 Consultation Fee</span>
        <span class="fee-amount">₹${apt.fee || '—'}</span>
      </div>

      <div class="badge-row">
        <span class="status-badge">✅ Confirmed &amp; Booked</span>
      </div>

      <div class="info-grid">
        <div class="info-item full">
          <div class="label">🗓️ Booked On</div>
          <div class="value" style="font-weight:600;color:#64748b;font-size:0.9rem">${bookedOn}</div>
        </div>
      </div>
    </div>

    <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

    <div class="footer-note">
      This is a computer-generated receipt and does not require a signature.<br>
      For queries call <strong>1800-WELLNESS</strong> or visit <span class="footer-logo">WellnessForever.in</span>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Receipt_WF-${apt.id.slice(-8).toUpperCase()}_${apt.patientName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Receipt downloaded! Open it in any browser.', 'success');
}

function wireModal(overlayId, cancelBtnId, confirmBtnId, onConfirm) {
    const overlay    = document.getElementById(overlayId);
    const cancelBtn  = document.getElementById(cancelBtnId);
    const confirmBtn = document.getElementById(confirmBtnId);
    if (!overlay) return;

    cancelBtn?.addEventListener('click',  () => { overlay.classList.add('hidden'); pendingDeleteId = null; });
    confirmBtn?.addEventListener('click', () => { overlay.classList.add('hidden'); onConfirm(); });
    overlay.addEventListener('click', e => {
        if (e.target === overlay) { overlay.classList.add('hidden'); pendingDeleteId = null; }
    });
}
