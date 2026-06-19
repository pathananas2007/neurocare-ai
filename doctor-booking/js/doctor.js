/* ============================================================
   doctor.js – Doctor Dashboard Logic (API-backed)
   ============================================================ */

let docAllApts    = [];
let docFilter     = 'all';
let currentDoctor = null;

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */

function initDoctorDashboard() {
    const user = getLoggedInUser();
    if (!user || user.role !== 'doctor') {
        document.getElementById('accessDenied').classList.remove('hidden');
        return;
    }
    document.getElementById('dashboardContent').classList.remove('hidden');
    loadDoctorProfile(user);
}

async function loadDoctorProfile(user) {
    // Find the doctor record linked to this user via email match from the API
    const { ok, data } = await apiCall('/doctors');
    let doctor = null;

    if (ok && data) {
        const doctors = data.map(d => ({ ...d, id: d._id || d.id }));
        // Match by linkedUserId, or email, or name
        doctor = doctors.find(d =>
            d.linkedUserId?.toString() === user.id ||
            (d.email && user.email && d.email.toLowerCase() === user.email.toLowerCase())
        ) || doctors.find(d => d.name?.toLowerCase() === user.name?.toLowerCase());

        if (doctor) doctor = { ...doctor, linkedUserId: user.id };
    }

    // If no match, create a blank placeholder
    if (!doctor) {
        doctor = {
            id: 'doc_' + user.id, linkedUserId: user.id,
            name: user.name, specialization: '', experience: '',
            location: '', fee: 0, bio: '', avatar: '👨‍⚕️',
            availableSlots: [], rating: 5.0
        };
    }

    currentDoctor = doctor;
    renderDoctorProfileHeader(doctor);
    prefillProfileForm(doctor);
    await loadDocAppointments(doctor);

    // Search
    document.getElementById('docSearch')?.addEventListener('input', () => applyDocFilter());
    document.getElementById('patientSearchDoc')?.addEventListener('input', () => renderPatientsTab());

    // Profile form
    document.getElementById('doctorProfileForm')?.addEventListener('submit', saveDoctorProfile);
}

/* ══════════════════════════════════════════════════════════
   PROFILE HEADER
══════════════════════════════════════════════════════════ */

function renderDoctorProfileHeader(doctor) {
    const el = document.getElementById('doctorProfileHeader');
    if (!el) return;
    el.innerHTML = `
        <div class="doc-profile-card">
            <div class="doc-profile-avatar">${doctor.avatar || '👨‍⚕️'}</div>
            <div class="doc-profile-info">
                <h1>${escapeDocHTML(doctor.name)}</h1>
                <span class="badge">${escapeDocHTML(doctor.specialization || 'No specialization set')}</span>
                ${doctor.experience ? `<p>🏆 ${escapeDocHTML(doctor.experience)}</p>` : ''}
                ${doctor.location   ? `<p>📍 ${escapeDocHTML(doctor.location)}</p>`   : ''}
                ${doctor.fee        ? `<p>💰 Consultation Fee: <strong>₹${doctor.fee}</strong></p>` : ''}
            </div>
        </div>`;
}

/* ══════════════════════════════════════════════════════════
   APPOINTMENTS
══════════════════════════════════════════════════════════ */

async function loadDocAppointments(doctor) {
    const doctorId = doctor._id || doctor.id;

    // Only fetch if doctor has a real DB id
    if (doctorId && !doctorId.startsWith('doc_')) {
        const { ok, data } = await apiCall(`/appointments/doctor/${doctorId}`);
        if (ok && data) {
            docAllApts = data.map(a => ({ ...a, id: a._id || a.id }));
        }
    } else {
        docAllApts = [];
    }

    renderDocStats(docAllApts);
    renderDocTable(docAllApts, 'all');
    renderPatientsTab();
}

function renderDocStats(apts) {
    const today    = new Date(); today.setHours(0,0,0,0);
    const upcoming = apts.filter(a => new Date(a.date) >= today).length;
    const past     = apts.filter(a => new Date(a.date) <  today).length;
    const unique   = new Set(apts.map(a => (a.patientPhone || a.patientName || '').toLowerCase())).size;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('docStatTotal',    apts.length);
    set('docStatUpcoming', upcoming);
    set('docStatPast',     past);
    set('docStatPatients', unique);
}

function filterDocApts(btn, filter) {
    document.querySelectorAll('[data-filter]').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    docFilter = filter;
    applyDocFilter();
}

function applyDocFilter() {
    const search = (document.getElementById('docSearch')?.value || '').toLowerCase().trim();
    const today  = new Date(); today.setHours(0,0,0,0);

    let filtered = docAllApts;
    if (docFilter === 'upcoming')  filtered = filtered.filter(a => new Date(a.date) >= today);
    if (docFilter === 'past')      filtered = filtered.filter(a => new Date(a.date) <  today);
    if (docFilter === 'pending')   filtered = filtered.filter(a => (a.status || 'pending') === 'pending');
    if (docFilter === 'confirmed') filtered = filtered.filter(a => a.status === 'confirmed');

    if (search) {
        filtered = filtered.filter(a =>
            (a.patientName  || '').toLowerCase().includes(search) ||
            (a.patientPhone || '').includes(search) ||
            (a.patientEmail || '').toLowerCase().includes(search)
        );
    }
    renderDocTable(filtered, docFilter);
}

function renderDocTable(apts, filter) {
    const tbody   = document.getElementById('docAptTableBody');
    const emptyEl = document.getElementById('docAptEmpty');
    const table   = document.getElementById('docAptTable');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (apts.length === 0) {
        table  && (table.style.display = 'none');
        emptyEl && emptyEl.classList.remove('hidden');
        return;
    }
    table  && (table.style.display = '');
    emptyEl && emptyEl.classList.add('hidden');

    const today = new Date(); today.setHours(0,0,0,0);
    apts.sort((a, b) => new Date(a.date) - new Date(b.date));

    apts.forEach((apt, i) => {
        const isPast    = new Date(apt.date) < today;
        const aptStatus = apt.status || (isPast ? 'completed' : 'pending');

        const statusConfig = {
            pending:   { cls: 'status-pending',   label: '⏳ Pending'   },
            confirmed: { cls: 'status-confirmed',  label: '✅ Confirmed' },
            completed: { cls: 'status-completed',  label: '🏁 Completed' },
            cancelled: { cls: 'status-cancelled',  label: '❌ Cancelled' },
        };
        const sc = statusConfig[aptStatus] || statusConfig.pending;

        const paymentBadge =
            apt.paymentMethod === 'upi'  ? '<span class="status-badge" style="background:#ede9fe;color:#5b21b6;">📱 UPI</span>'  :
            apt.paymentMethod === 'card' ? '<span class="status-badge" style="background:#dbeafe;color:#1e40af;">💳 Card</span>' :
            apt.paymentMethod === 'cash' ? '<span class="status-badge" style="background:#fef9c3;color:#854d0e;">🏥 Cash</span>' :
            '<span style="color:var(--text-light)">—</span>';

        let actionHTML = '<span style="color:var(--text-light);font-size:0.82rem;">—</span>';
        if (!isPast && aptStatus !== 'cancelled' && aptStatus !== 'completed') {
            if (aptStatus === 'pending') {
                actionHTML = `
                    <button class="btn btn-sm" style="background:#d1fae5;color:#065f46;border:1px solid #86efac;padding:6px 12px;font-size:0.8rem;"
                        onclick="updateAptStatus('${apt.id}','confirmed')">✅ Accept</button>
                    <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca;padding:6px 12px;font-size:0.8rem;margin-left:6px;"
                        onclick="updateAptStatus('${apt.id}','cancelled')">❌ Reject</button>`;
            } else if (aptStatus === 'confirmed') {
                actionHTML = `
                    <button class="btn btn-sm" style="background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;padding:6px 12px;font-size:0.8rem;"
                        onclick="updateAptStatus('${apt.id}','completed')">🏁 Complete</button>
                    <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca;padding:6px 12px;font-size:0.8rem;margin-left:6px;"
                        onclick="updateAptStatus('${apt.id}','cancelled')">❌ Cancel</button>`;
            }
        }

        const canPrescribe    = aptStatus === 'completed' || aptStatus === 'confirmed';
        const hasPrescription = (typeof getPrescription === 'function') && getPrescription(apt.id);
        const prescBtn        = canPrescribe
            ? `<button class="btn btn-sm" style="background:${hasPrescription ? '#f0fdf4' : '#eff6ff'};color:${hasPrescription ? '#166534' : '#1e40af'};border:1px solid ${hasPrescription ? '#86efac' : '#bfdbfe'};padding:6px 10px;font-size:0.78rem;margin-top:6px;"
                onclick="openPrescriptionModal('${apt.id}')">${hasPrescription ? '💊 Edit Rx' : '💊 Add Rx'}</button>`
            : '';

        const medHistBtn = `<button class="btn btn-sm med-hist-btn" style="padding:6px 10px;font-size:0.78rem;margin-top:6px;"
            onclick="viewPatientMedHistory('${apt.userId}','${escapeDocHTML(apt.patientName)}')">🏥 Med History</button>`;

        const ratingHTML = apt.rating
            ? `<br><small style="color:#fbbf24">${'★'.repeat(apt.rating)}${'☆'.repeat(5 - apt.rating)}</small>`
            : '';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${i + 1}</strong></td>
            <td>
                <strong>${escapeDocHTML(apt.patientName)}</strong>
                ${apt.patientEmail ? `<br><small style="color:var(--text-muted)">${escapeDocHTML(apt.patientEmail)}</small>` : ''}
                ${ratingHTML}
            </td>
            <td>${escapeDocHTML(apt.patientPhone || '—')}</td>
            <td>${formatDocDate(apt.date)}</td>
            <td>${escapeDocHTML(apt.time)}</td>
            <td>${apt.reason ? escapeDocHTML(apt.reason) : '<span style="color:var(--text-light)">—</span>'}</td>
            <td>${paymentBadge}</td>
            <td><span class="status-badge ${sc.cls}">${sc.label}</span></td>
            <td style="white-space:nowrap;">
                <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;">
                    ${actionHTML}
                    ${prescBtn}
                    ${medHistBtn}
                </div>
            </td>`;
        tbody.appendChild(row);
    });
}

/* ══════════════════════════════════════════════════════════
   STATUS MANAGEMENT
══════════════════════════════════════════════════════════ */

async function updateAptStatus(aptId, newStatus) {
    const { ok, message } = await apiCall(`/appointments/${aptId}/status`, {
        method: 'PATCH',
        body:   JSON.stringify({ status: newStatus })
    });

    if (!ok) { showToast(message || 'Could not update status.', 'error'); return; }

    const idx = docAllApts.findIndex(a => a.id === aptId);
    if (idx >= 0) docAllApts[idx].status = newStatus;

    const labels = {
        confirmed: 'Appointment confirmed ✅',
        cancelled: 'Appointment rejected ❌',
        completed: 'Marked as completed 🏁'
    };
    showToast(labels[newStatus] || 'Status updated.', newStatus === 'cancelled' ? 'error' : 'success');
    applyDocFilter();
    renderDocStats(docAllApts);
}

/* ══════════════════════════════════════════════════════════
   PROFILE EDIT
══════════════════════════════════════════════════════════ */

function prefillProfileForm(doctor) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('dpName',     doctor.name);
    set('dpSpec',     doctor.specialization);
    set('dpExp',      doctor.experience);
    set('dpFee',      doctor.fee);
    set('dpLocation', doctor.location);
    set('dpBio',      doctor.bio);
    set('dpSlots',    (doctor.availableSlots || []).join(', '));
}

async function saveDoctorProfile(e) {
    e.preventDefault();

    const name     = document.getElementById('dpName').value.trim();
    const spec     = document.getElementById('dpSpec').value.trim();
    const exp      = document.getElementById('dpExp').value.trim();
    const fee      = parseFloat(document.getElementById('dpFee').value) || 0;
    const location = document.getElementById('dpLocation').value.trim();
    const bio      = document.getElementById('dpBio').value.trim();
    const slotsRaw = document.getElementById('dpSlots').value.trim();

    if (!name || !spec) { showToast('Name and specialization are required.', 'error'); return; }

    const slots   = slotsRaw ? slotsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const updated = { name, specialization: spec, experience: exp, fee, location, bio, availableSlots: slots };

    // Save to API if doctor has a real DB id
    const doctorId = currentDoctor._id || currentDoctor.id;
    if (doctorId && !doctorId.startsWith('doc_')) {
        const { ok, message } = await apiCall(`/doctors/${doctorId}`, {
            method: 'PUT',
            body:   JSON.stringify(updated)
        });
        if (!ok) { showToast(message || 'Could not save profile.', 'error'); return; }
    }

    currentDoctor = { ...currentDoctor, ...updated };
    renderDoctorProfileHeader(currentDoctor);
    showToast('Profile updated successfully! ✅', 'success');
}

/* ══════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════ */

function switchDocTab(tab) {
    document.getElementById('tabAppointments').classList.toggle('hidden', tab !== 'appointments');
    document.getElementById('tabPatients').classList.toggle('hidden',     tab !== 'patients');
    document.getElementById('tabProfile').classList.toggle('hidden',      tab !== 'profile');

    document.querySelectorAll('.doc-tab').forEach((btn, i) => {
        btn.classList.toggle('active',
            (i === 0 && tab === 'appointments') ||
            (i === 1 && tab === 'patients')     ||
            (i === 2 && tab === 'profile')
        );
    });
}

/* ══════════════════════════════════════════════════════════
   PATIENTS TAB
══════════════════════════════════════════════════════════ */

function renderPatientsTab() {
    const grid    = document.getElementById('docPatientsList');
    const emptyEl = document.getElementById('docPatientsEmpty');
    if (!grid) return;

    const query = (document.getElementById('patientSearchDoc')?.value || '').toLowerCase().trim();

    const patientMap = {};
    docAllApts.forEach(apt => {
        const key = apt.patientPhone || apt.patientName.toLowerCase();
        if (!patientMap[key]) {
            patientMap[key] = { name: apt.patientName, phone: apt.patientPhone || '—', email: apt.patientEmail || '', apts: [] };
        }
        patientMap[key].apts.push(apt);
    });

    let patients = Object.values(patientMap);
    if (query) {
        patients = patients.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.phone.includes(query) ||
            p.email.toLowerCase().includes(query)
        );
    }

    grid.innerHTML = '';
    if (patients.length === 0) { emptyEl && emptyEl.classList.remove('hidden'); return; }
    emptyEl && emptyEl.classList.add('hidden');

    const today = new Date(); today.setHours(0,0,0,0);

    patients.forEach((p, i) => {
        const upcoming = p.apts.filter(a => new Date(a.date) >= today).length;
        const past     = p.apts.filter(a => new Date(a.date) <  today).length;
        const lastApt  = [...p.apts].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const initial  = p.name.trim().charAt(0).toUpperCase();

        const card = document.createElement('div');
        card.className = 'doc-patient-card';
        card.style.animationDelay = `${i * 0.05}s`;
        card.innerHTML = `
            <div class="dpc-top">
                <div class="dpc-avatar">${escapeDocHTML(initial)}</div>
                <div class="dpc-info">
                    <div class="dpc-name">${escapeDocHTML(p.name)}</div>
                    <div class="dpc-contact">📞 ${escapeDocHTML(p.phone)}${p.email ? `&nbsp;·&nbsp;📧 ${escapeDocHTML(p.email)}` : ''}</div>
                </div>
            </div>
            <div class="dpc-stats">
                <div class="dpc-stat"><span class="dpc-stat-num">${p.apts.length}</span><span class="dpc-stat-label">Total</span></div>
                <div class="dpc-stat"><span class="dpc-stat-num" style="color:var(--success)">${upcoming}</span><span class="dpc-stat-label">Upcoming</span></div>
                <div class="dpc-stat"><span class="dpc-stat-num" style="color:var(--text-muted)">${past}</span><span class="dpc-stat-label">Past</span></div>
            </div>
            <div class="dpc-last">🗓️ Last visit: <strong>${lastApt ? formatDocDate(lastApt.date) : '—'}</strong></div>
            <button class="btn btn-outline" style="width:100%;margin-top:14px;font-size:0.88rem;"
                onclick="openPatientModal('${escapeDocHTML(p.phone || p.name)}')">👁️ View Details</button>`;
        grid.appendChild(card);
    });

    window._docPatientMap = patientMap;
}

function openPatientModal(key) {
    const map = window._docPatientMap || {};
    const p   = map[key];
    if (!p) return;

    document.getElementById('pmAvatar').textContent = p.name.trim().charAt(0).toUpperCase();
    document.getElementById('pmName').textContent   = p.name;
    document.getElementById('pmContact').innerHTML  =
        `📞 ${escapeDocHTML(p.phone)}${p.email ? '&nbsp;&nbsp;📧 ' + escapeDocHTML(p.email) : ''}`;

    const today  = new Date(); today.setHours(0,0,0,0);
    const sorted = [...p.apts].sort((a, b) => new Date(b.date) - new Date(a.date));
    const listEl = document.getElementById('pmAptList');

    listEl.innerHTML = sorted.map(apt => {
        const isPast   = new Date(apt.date) < today;
        const payLabel = apt.paymentMethod === 'upi'  ? '📱 UPI'
                       : apt.paymentMethod === 'card' ? '💳 Card'
                       : apt.paymentMethod === 'cash' ? '🏥 Cash' : '—';
        return `
        <div class="pm-apt-row">
            <div class="pm-apt-date">
                <strong>${formatDocDate(apt.date)}</strong>
                <span style="color:var(--text-muted);font-size:0.82rem;">${escapeDocHTML(apt.time)}</span>
            </div>
            <div class="pm-apt-meta">
                ${apt.reason ? `<div class="pm-apt-reason">📝 ${escapeDocHTML(apt.reason)}</div>` : ''}
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
                    <span class="status-badge ${isPast ? 'status-past' : 'status-upcoming'}">${isPast ? '⏰ Past' : '✅ Upcoming'}</span>
                    <span class="status-badge" style="background:#f1f5f9;color:var(--text-muted);">${payLabel}</span>
                    <span class="status-badge" style="background:#f0fdf4;color:#166534;">💰 ₹${apt.fee || '—'}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    document.getElementById('patientModal').classList.remove('hidden');
}

function closePatientModal() {
    document.getElementById('patientModal').classList.add('hidden');
}

/* ══════════════════════════════════════════════════════════
   MEDICAL HISTORY BRIDGE
══════════════════════════════════════════════════════════ */

function viewPatientMedHistory(userId, patientName) {
    if (typeof openPatientMedHistoryModal === 'function') {
        openPatientMedHistoryModal(userId, patientName);
    }
}

/* ══════════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════════ */

function formatDocDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeDocHTML(str) {
    if (typeof str !== 'string') return str ?? '';
    return str
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
