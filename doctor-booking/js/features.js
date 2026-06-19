/* ============================================================
   features.js – Advanced Features
   1. Real-time Notifications / Reminders
   2. Doctor Reviews & Ratings System
   3. Prescription / Notes by Doctor
   4. Appointment Reschedule (enhanced)
   5. Medical History / Patient Profile
   ============================================================ */

const REVIEWS_KEY        = 'wf_reviews';
const PRESCRIPTIONS_KEY  = 'wf_prescriptions';
const MED_HISTORY_KEY    = 'wf_medical_history';
const NOTIF_KEY          = 'wf_notifications';
const NOTIF_ASKED_KEY    = 'wf_notif_permission_asked';

/* ══════════════════════════════════════════════════════════
   FEATURE 1 — REAL-TIME NOTIFICATIONS & REMINDERS
══════════════════════════════════════════════════════════ */

/**
 * Request notification permission on first visit (once per browser).
 * Call this after user is logged in.
 */
function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (localStorage.getItem(NOTIF_ASKED_KEY)) return;
    localStorage.setItem(NOTIF_ASKED_KEY, '1');
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

/**
 * Schedule in-app + browser reminders for all upcoming appointments.
 * Fires a notification 1 hour before the appointment time.
 * Should be called once on page load.
 */
function scheduleAppointmentReminders() {
    const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;
    if (!user) return;

    // Use the in-memory cache from script.js if available, otherwise skip
    const all  = (typeof getAppointments === 'function') ? getAppointments() : [];
    const mine = all.filter(a =>
        (a.userId === user.id || a.userId === 'guest') &&
        (a.status === 'pending' || a.status === 'confirmed')
    );

    mine.forEach(apt => {
        const aptDateTime = new Date(`${apt.date}T${convertTo24h(apt.time)}`);
        const reminderAt  = new Date(aptDateTime.getTime() - 60 * 60 * 1000); // 1 hour before
        const now         = new Date();
        const msUntil     = reminderAt.getTime() - now.getTime();

        // Only schedule if reminder is in the future (up to 24h away to avoid flooding)
        if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
            setTimeout(() => {
                triggerAppointmentReminder(apt);
            }, msUntil);
        }

        // If appointment is within next 15 minutes and reminder already passed, show now
        const msToApt = aptDateTime.getTime() - now.getTime();
        if (msToApt > 0 && msToApt <= 15 * 60 * 1000) {
            addInAppNotification({
                icon:    '🚨',
                title:   'Appointment Starting Soon!',
                message: `Your appointment with ${apt.doctorName} starts in ~${Math.ceil(msToApt / 60000)} minutes.`,
                time:    new Date().toISOString(),
                aptId:   apt.id
            });
        }
    });
}

function triggerAppointmentReminder(apt) {
    const msg = `Reminder: Appointment with ${apt.doctorName} in 1 hour at ${apt.time}.`;

    // Browser notification
    if (Notification.permission === 'granted') {
        new Notification('⚕️ Wellness Forever – Appointment Reminder', {
            body: msg,
            icon: 'https://via.placeholder.com/64/6366f1/ffffff?text=WF'
        });
    }

    // In-app notification bell
    addInAppNotification({
        icon:    '⏰',
        title:   'Appointment in 1 Hour',
        message: msg,
        time:    new Date().toISOString(),
        aptId:   apt.id
    });

    // Also show toast if user is on page
    if (typeof showToast === 'function') {
        showToast('⏰ ' + msg, 'success');
    }
}

function convertTo24h(timeStr) {
    if (!timeStr) return '09:00';
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes]   = time.split(':');
    if (modifier === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
    if (modifier === 'AM' && hours === '12') hours = '00';
    return `${hours.padStart(2,'0')}:${minutes}`;
}

/* ── In-App Notification Bell ── */

function addInAppNotification(notif) {
    const list = JSON.parse(localStorage.getItem(NOTIF_KEY)) || [];
    list.unshift({ ...notif, id: Date.now().toString(), read: false });
    // Keep max 20
    if (list.length > 20) list.splice(20);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
    updateNotifBell();
}

function updateNotifBell() {
    const bell      = document.getElementById('notifBell');
    const badge     = document.getElementById('notifBadge');
    const list      = JSON.parse(localStorage.getItem(NOTIF_KEY)) || [];
    const unread    = list.filter(n => !n.read).length;
    if (badge) {
        badge.textContent = unread > 0 ? (unread > 9 ? '9+' : unread) : '';
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    const isOpen = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (!isOpen) {
        renderNotifPanel();
        markAllNotifsRead();
    }
}

function renderNotifPanel() {
    const container = document.getElementById('notifList');
    if (!container) return;
    const list = JSON.parse(localStorage.getItem(NOTIF_KEY)) || [];

    if (list.length === 0) {
        container.innerHTML = `<div class="notif-empty">🔔 No notifications yet</div>`;
        return;
    }
    container.innerHTML = list.slice(0, 10).map(n => `
        <div class="notif-item ${n.read ? '' : 'notif-unread'}">
            <span class="notif-icon">${n.icon || '🔔'}</span>
            <div class="notif-body">
                <div class="notif-title">${escapeFeatureHTML(n.title)}</div>
                <div class="notif-msg">${escapeFeatureHTML(n.message)}</div>
                <div class="notif-time">${formatRelativeTime(n.time)}</div>
            </div>
        </div>`).join('');
}

function markAllNotifsRead() {
    const list = JSON.parse(localStorage.getItem(NOTIF_KEY)) || [];
    list.forEach(n => n.read = true);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
    updateNotifBell();
}

function clearAllNotifications() {
    localStorage.removeItem(NOTIF_KEY);
    updateNotifBell();
    renderNotifPanel();
}

function formatRelativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

/* Inject notification bell into navbar (called after nav renders) */
function injectNotifBell() {
    const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;
    if (!user) return;

    if (document.getElementById('notifBell')) return; // already injected

    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;

    const li = document.createElement('li');
    li.id = 'notifBellItem';
    li.style.position = 'relative';
    li.innerHTML = `
        <button id="notifBell" class="notif-bell-btn" onclick="toggleNotifPanel()" aria-label="Notifications" title="Notifications">
            🔔
            <span id="notifBadge" class="notif-badge" style="display:none">0</span>
        </button>
        <div id="notifPanel" class="notif-panel hidden">
            <div class="notif-panel-header">
                <span>🔔 Notifications</span>
                <button class="notif-clear-btn" onclick="clearAllNotifications()">Clear all</button>
            </div>
            <div id="notifList"></div>
        </div>`;

    // Insert before auth item
    const authItem = document.getElementById('nav-auth-item');
    if (authItem) navLinks.insertBefore(li, authItem);
    else navLinks.appendChild(li);

    updateNotifBell();

    // Close panel when clicking outside
    document.addEventListener('click', e => {
        const panel = document.getElementById('notifPanel');
        const bell  = document.getElementById('notifBell');
        if (panel && !panel.classList.contains('hidden') &&
            !panel.contains(e.target) && e.target !== bell) {
            panel.classList.add('hidden');
        }
    });
}


/* ══════════════════════════════════════════════════════════
   FEATURE 2 — DOCTOR REVIEWS & RATINGS SYSTEM
══════════════════════════════════════════════════════════ */

/**
 * Submit a detailed review (called from enhanced rating modal).
 * Stores in wf_reviews keyed by doctorId.
 */
function submitDoctorReview(aptId, rating, note) {
    const apts   = JSON.parse(localStorage.getItem('wf_appointments')) || [];
    const apt    = apts.find(a => a.id === aptId);
    if (!apt) return;

    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY)) || {};
    const docId   = apt.doctorId;
    if (!reviews[docId]) reviews[docId] = [];

    // Remove existing review from same user for same appointment
    reviews[docId] = reviews[docId].filter(r => r.aptId !== aptId);

    reviews[docId].push({
        id:          Date.now().toString(),
        aptId,
        doctorId:    docId,
        doctorName:  apt.doctorName,
        patientName: apt.patientName,
        userId:      apt.userId,
        rating,
        note:        note || '',
        date:        apt.date,
        createdAt:   new Date().toISOString()
    });

    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));

    // Also update the appointment's rating field (backward compat)
    const idx = apts.findIndex(a => a.id === aptId);
    if (idx >= 0) {
        apts[idx].rating    = rating;
        apts[idx].ratingNote = note || '';
        localStorage.setItem('wf_appointments', JSON.stringify(apts));
    }
}

function getDoctorReviews(doctorId) {
    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY)) || {};
    return reviews[doctorId] || [];
}

function getDoctorAvgRating(doctorId) {
    const reviews = getDoctorReviews(doctorId);
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
}

/**
 * Render a reviews panel for a doctor card (used in index.html).
 * Call openDoctorReviews(doctorId) to show the modal.
 */
function openDoctorReviewsModal(doctorId, doctorName) {
    const reviews = getDoctorReviews(doctorId);
    const modal   = document.getElementById('doctorReviewsModal');
    if (!modal) return;

    document.getElementById('drm-doctorName').textContent = `⭐ Reviews for ${doctorName}`;

    const avg = getDoctorAvgRating(doctorId);
    const avgEl = document.getElementById('drm-avgRating');
    if (avgEl) {
        avgEl.innerHTML = avg
            ? `<span class="drm-avg-num">${avg}</span> <span class="drm-avg-stars">${renderFeatureStars(parseFloat(avg))}</span> <span class="drm-avg-count">(${reviews.length} review${reviews.length !== 1 ? 's' : ''})</span>`
            : '<span style="color:var(--text-muted)">No reviews yet</span>';
    }

    const listEl = document.getElementById('drm-reviewList');
    if (reviews.length === 0) {
        listEl.innerHTML = `<div class="drm-empty">No reviews yet for this doctor.</div>`;
    } else {
        const sorted = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        listEl.innerHTML = sorted.map(r => `
            <div class="drm-review-item">
                <div class="drm-review-top">
                    <div class="drm-reviewer-avatar">${r.patientName.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="drm-reviewer-name">${escapeFeatureHTML(r.patientName)}</div>
                        <div class="drm-review-date">${formatFeatureDate(r.createdAt)}</div>
                    </div>
                    <div class="drm-review-stars">${renderFeatureStars(r.rating)}</div>
                </div>
                ${r.note ? `<div class="drm-review-note">${escapeFeatureHTML(r.note)}</div>` : ''}
            </div>`).join('');
    }

    modal.classList.remove('hidden');
}

function closeDoctorReviewsModal() {
    const modal = document.getElementById('doctorReviewsModal');
    if (modal) modal.classList.add('hidden');
}

function renderFeatureStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let s = '★'.repeat(full);
    if (half) s += '½';
    s += '☆'.repeat(5 - full - (half ? 1 : 0));
    return `<span style="color:#fbbf24">${s}</span>`;
}


/* ══════════════════════════════════════════════════════════
   FEATURE 3 — PRESCRIPTION / NOTES BY DOCTOR
══════════════════════════════════════════════════════════ */

function savePrescription(aptId, notes, medicines, followUpDate) {
    const prescriptions = JSON.parse(localStorage.getItem(PRESCRIPTIONS_KEY)) || {};
    prescriptions[aptId] = {
        aptId,
        notes:        notes || '',
        medicines:    medicines || '',
        followUpDate: followUpDate || '',
        savedAt:      new Date().toISOString()
    };
    localStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(prescriptions));
}

function getPrescription(aptId) {
    const prescriptions = JSON.parse(localStorage.getItem(PRESCRIPTIONS_KEY)) || {};
    return prescriptions[aptId] || null;
}

/* ── Doctor side: open prescription editor modal ── */
function openPrescriptionModal(aptId) {
    const modal = document.getElementById('prescriptionModal');
    if (!modal) return;

    document.getElementById('presc-aptId').value = aptId;

    // Load existing prescription if any
    const existing = getPrescription(aptId);
    document.getElementById('presc-notes').value      = existing?.notes      || '';
    document.getElementById('presc-medicines').value  = existing?.medicines  || '';
    document.getElementById('presc-followup').value   = existing?.followUpDate || '';

    modal.classList.remove('hidden');
}

function closePrescriptionModal() {
    const modal = document.getElementById('prescriptionModal');
    if (modal) modal.classList.add('hidden');
}

function savePrescriptionFromModal() {
    const aptId      = document.getElementById('presc-aptId').value;
    const notes      = document.getElementById('presc-notes').value.trim();
    const medicines  = document.getElementById('presc-medicines').value.trim();
    const followUp   = document.getElementById('presc-followup').value;

    if (!notes && !medicines) {
        if (typeof showToast === 'function') showToast('Please add notes or medicines.', 'error');
        return;
    }

    savePrescription(aptId, notes, medicines, followUp);
    closePrescriptionModal();

    if (typeof showToast === 'function') showToast('Prescription saved successfully! ✅', 'success');

    // Add notification for patient
    const apts = JSON.parse(localStorage.getItem('wf_appointments')) || [];
    const apt  = apts.find(a => a.id === aptId);
    if (apt) {
        addInAppNotification({
            icon:    '💊',
            title:   'Prescription Added',
            message: `Dr. ${apt.doctorName} has added a prescription for your visit on ${formatFeatureDate(apt.date)}.`,
            time:    new Date().toISOString(),
            aptId
        });
    }
}

/* ── Patient side: view prescription modal ── */
function openViewPrescriptionModal(aptId) {
    const modal = document.getElementById('viewPrescriptionModal');
    if (!modal) return;

    const rx  = getPrescription(aptId);
    const apts = JSON.parse(localStorage.getItem('wf_appointments')) || [];
    const apt  = apts.find(a => a.id === aptId);

    const content = document.getElementById('viewPresc-content');
    if (!rx) {
        content.innerHTML = `<div class="presc-empty">No prescription has been added by the doctor yet.</div>`;
    } else {
        content.innerHTML = `
            <div class="presc-view-card">
                <div class="presc-header">
                    <span class="presc-logo">⚕️ Wellness Forever</span>
                    <span class="presc-date">Date: ${formatFeatureDate(rx.savedAt)}</span>
                </div>
                ${apt ? `<div class="presc-patient-info">
                    <p><strong>Patient:</strong> ${escapeFeatureHTML(apt.patientName)}</p>
                    <p><strong>Doctor:</strong> ${escapeFeatureHTML(apt.doctorName)} (${escapeFeatureHTML(apt.specialization)})</p>
                    <p><strong>Visit Date:</strong> ${formatFeatureDate(apt.date)}</p>
                </div>` : ''}
                ${rx.notes ? `
                <div class="presc-section">
                    <div class="presc-section-title">📋 Doctor's Notes</div>
                    <div class="presc-section-body">${escapeFeatureHTML(rx.notes)}</div>
                </div>` : ''}
                ${rx.medicines ? `
                <div class="presc-section">
                    <div class="presc-section-title">💊 Prescribed Medicines</div>
                    <div class="presc-section-body presc-medicines">${escapeFeatureHTML(rx.medicines)}</div>
                </div>` : ''}
                ${rx.followUpDate ? `
                <div class="presc-section">
                    <div class="presc-section-title">📅 Follow-up Date</div>
                    <div class="presc-section-body">${formatFeatureDate(rx.followUpDate)}</div>
                </div>` : ''}
            </div>`;
    }

    modal.classList.remove('hidden');
}

function closeViewPrescriptionModal() {
    const modal = document.getElementById('viewPrescriptionModal');
    if (modal) modal.classList.add('hidden');
}


/* ══════════════════════════════════════════════════════════
   FEATURE 5 — MEDICAL HISTORY / PATIENT PROFILE
   (Feature 4 = Reschedule is already in script.js; enhanced below)
══════════════════════════════════════════════════════════ */

function getMedicalHistory(userId) {
    const all = JSON.parse(localStorage.getItem(MED_HISTORY_KEY)) || {};
    return all[userId] || {};
}

function saveMedicalHistory(userId, data) {
    const all = JSON.parse(localStorage.getItem(MED_HISTORY_KEY)) || {};
    all[userId] = { ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(MED_HISTORY_KEY, JSON.stringify(all));
}

/* ── Patient: open/close medical history modal ── */
function openMedicalHistoryModal() {
    const modal = document.getElementById('medHistoryModal');
    if (!modal) return;

    const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;
    if (!user) return;

    const hist = getMedicalHistory(user.id);

    // Fill form fields
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };
    set('mh-age',        hist.age);
    set('mh-gender',     hist.gender);
    set('mh-blood',      hist.bloodGroup);
    set('mh-weight',     hist.weight);
    set('mh-height',     hist.height);
    set('mh-allergies',  hist.allergies);
    set('mh-conditions', hist.conditions);
    set('mh-medications',hist.currentMedications);
    set('mh-surgeries',  hist.pastSurgeries);
    set('mh-emergency',  hist.emergencyContact);
    set('mh-insurance',  hist.insurance);

    modal.classList.remove('hidden');
}

function closeMedicalHistoryModal() {
    const modal = document.getElementById('medHistoryModal');
    if (modal) modal.classList.add('hidden');
}

function saveMedicalHistoryFromModal(e) {
    if (e) e.preventDefault();
    const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;
    if (!user) return;

    const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

    const data = {
        age:               get('mh-age'),
        gender:            get('mh-gender'),
        bloodGroup:        get('mh-blood'),
        weight:            get('mh-weight'),
        height:            get('mh-height'),
        allergies:         get('mh-allergies'),
        conditions:        get('mh-conditions'),
        currentMedications:get('mh-medications'),
        pastSurgeries:     get('mh-surgeries'),
        emergencyContact:  get('mh-emergency'),
        insurance:         get('mh-insurance')
    };

    saveMedicalHistory(user.id, data);
    closeMedicalHistoryModal();
    if (typeof showToast === 'function') showToast('Medical profile saved! ✅', 'success');
}

/* ── Doctor/Admin: view patient medical history in modal ── */
function openPatientMedHistoryModal(userId, patientName) {
    const modal = document.getElementById('viewMedHistoryModal');
    if (!modal) return;

    const hist    = getMedicalHistory(userId);
    const titleEl = document.getElementById('vmh-title');
    if (titleEl) titleEl.textContent = `🏥 Medical History – ${patientName}`;

    const content = document.getElementById('vmh-content');
    const fields  = [
        { label: 'Age',                value: hist.age                ? hist.age + ' years' : null },
        { label: 'Gender',             value: hist.gender             || null },
        { label: 'Blood Group',        value: hist.bloodGroup         || null },
        { label: 'Weight',             value: hist.weight             ? hist.weight + ' kg' : null },
        { label: 'Height',             value: hist.height             ? hist.height + ' cm' : null },
        { label: 'Allergies',          value: hist.allergies          || null },
        { label: 'Existing Conditions',value: hist.conditions         || null },
        { label: 'Current Medications',value: hist.currentMedications || null },
        { label: 'Past Surgeries',     value: hist.pastSurgeries      || null },
        { label: 'Emergency Contact',  value: hist.emergencyContact   || null },
        { label: 'Insurance',          value: hist.insurance          || null },
    ];

    const hasAny = fields.some(f => f.value);
    if (!hasAny) {
        content.innerHTML = `<div class="presc-empty">Patient has not filled their medical history yet.</div>`;
    } else {
        content.innerHTML = `<div class="vmh-grid">
            ${fields.filter(f => f.value).map(f => `
                <div class="vmh-field">
                    <div class="vmh-label">${f.label}</div>
                    <div class="vmh-value">${escapeFeatureHTML(f.value)}</div>
                </div>`).join('')}
        </div>
        ${hist.updatedAt ? `<p class="vmh-updated">Last updated: ${formatFeatureDate(hist.updatedAt)}</p>` : ''}`;
    }

    modal.classList.remove('hidden');
}

function closeViewMedHistoryModal() {
    const modal = document.getElementById('viewMedHistoryModal');
    if (modal) modal.classList.add('hidden');
}


/* ══════════════════════════════════════════════════════════
   SHARED UTILITIES
══════════════════════════════════════════════════════════ */

function escapeFeatureHTML(str) {
    if (typeof str !== 'string') return str ?? '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatFeatureDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    // Check if it's a date-only string (no time)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        return new Date(parts[0], parts[1]-1, parts[2])
            .toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    }
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}


/* ══════════════════════════════════════════════════════════
   INIT — call on every page after updateNavForAuth()
══════════════════════════════════════════════════════════ */

function initFeatures() {
    requestNotificationPermission();
    injectNotifBell();
    scheduleAppointmentReminders();

    // Wire modal close-on-overlay-click for all feature modals
    [
        'doctorReviewsModal',
        'prescriptionModal',
        'viewPrescriptionModal',
        'medHistoryModal',
        'viewMedHistoryModal'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', e => {
                if (e.target === el) el.classList.add('hidden');
            });
        }
    });

    // Wire medical history form
    const mhForm = document.getElementById('medHistoryForm');
    if (mhForm) mhForm.addEventListener('submit', saveMedicalHistoryFromModal);

    // Wire prescription save button
    const prescSaveBtn = document.getElementById('prescSaveBtn');
    if (prescSaveBtn) prescSaveBtn.addEventListener('click', savePrescriptionFromModal);
}
