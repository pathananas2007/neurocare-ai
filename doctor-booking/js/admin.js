/* ============================================================
   admin.js – Admin Panel Logic (API-backed)
   ============================================================ */

let pendingDeleteId   = null;
let pendingDeleteType = 'appointment';
let allAppointments   = [];
let allDoctors        = [];
let allPatients       = [];

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */

async function loadAdminPanel() {
    renderStats({ totalApts: 0, upcomingApts: 0, pastApts: 0 });

    // Load all data in parallel
    const [statsRes, aptsRes, doctorsRes, patientsRes] = await Promise.all([
        apiCall('/admin/stats'),
        apiCall('/admin/appointments'),
        apiCall('/doctors'),
        apiCall('/admin/patients')
    ]);

    // Stats
    if (statsRes.ok && statsRes.data) renderStats(statsRes.data);

    // Appointments
    if (aptsRes.ok && aptsRes.data) {
        allAppointments = aptsRes.data.map(a => ({ ...a, id: a._id || a.id }));
    }

    // Doctors
    if (doctorsRes.ok && doctorsRes.data) {
        allDoctors = doctorsRes.data.map(d => ({ ...d, id: d._id || d.id }));
    }

    // Patients
    if (patientsRes.ok && patientsRes.data) {
        allPatients = patientsRes.data.map(p => ({ ...p, id: p._id || p.id }));
    }

    populateAdminSpecFilter(allAppointments);
    renderTable(allAppointments);
    renderDoctorsTable(allDoctors);
    renderPatientsTable(allPatients);

    // Search / filter listeners
    document.getElementById('adminSearch')?.addEventListener('input', applyAdminFilters);
    document.getElementById('adminSpecFilter')?.addEventListener('change', applyAdminFilters);

    document.getElementById('patientSearch')?.addEventListener('input', () => {
        const q = document.getElementById('patientSearch').value.toLowerCase().trim();
        renderPatientsTable(allPatients.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.email || '').toLowerCase().includes(q) ||
            (p.phone || '').includes(q)
        ));
    });

    // Clear All
    document.getElementById('clearAllBtn')?.addEventListener('click', () => {
        if (allAppointments.length === 0) { showToast('No appointments to clear.', 'error'); return; }
        pendingDeleteType = 'appointment';
        pendingDeleteId   = '__ALL__';
        document.getElementById('confirmModalTitle').textContent = 'Clear All Appointments?';
        document.getElementById('confirmModalMsg').textContent   = 'This will permanently delete ALL appointments.';
        document.getElementById('confirmModal').classList.remove('hidden');
    });

    // Doctor form submit
    document.getElementById('doctorForm')?.addEventListener('submit', saveDoctorFromModal);

    wireAdminModal();
}

/* ══════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════ */

function switchAdminTab(tab) {
    ['appointments', 'doctors', 'patients'].forEach(t => {
        document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1))
            .classList.toggle('hidden', t !== tab);
    });
    document.querySelectorAll('.doc-tab').forEach((btn, i) => {
        const tabs = ['appointments', 'doctors', 'patients'];
        btn.classList.toggle('active', tabs[i] === tab);
    });
}

/* ══════════════════════════════════════════════════════════
   STATS
══════════════════════════════════════════════════════════ */

function renderStats(d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? 0; };
    set('statTotal',    d.totalApts);
    set('statUpcoming', d.upcomingApts);
    set('statPast',     d.pastApts);
    set('statUnique',   d.totalPatients ?? allPatients.length);
}

/* ══════════════════════════════════════════════════════════
   APPOINTMENTS TAB
══════════════════════════════════════════════════════════ */

function populateAdminSpecFilter(apts) {
    const filter = document.getElementById('adminSpecFilter');
    if (!filter) return;
    while (filter.options.length > 1) filter.remove(1);
    const specs = [...new Set(apts.map(a => a.specialization).filter(Boolean))].sort();
    specs.forEach(spec => {
        const opt = document.createElement('option');
        opt.value = spec; opt.textContent = spec;
        filter.appendChild(opt);
    });
}

function applyAdminFilters() {
    const search = (document.getElementById('adminSearch')?.value || '').toLowerCase().trim();
    const spec   = document.getElementById('adminSpecFilter')?.value || '';
    const filtered = allAppointments.filter(a => {
        const matchSearch = !search ||
            (a.patientName || '').toLowerCase().includes(search) ||
            (a.doctorName  || '').toLowerCase().includes(search) ||
            (a.patientPhone|| '').includes(search)               ||
            (a.patientEmail|| '').toLowerCase().includes(search);
        return matchSearch && (!spec || a.specialization === spec);
    });
    renderTable(filtered);
}

function renderTable(apts) {
    const tbody   = document.getElementById('adminTableBody');
    const emptyEl = document.getElementById('adminEmpty');
    const table   = document.getElementById('adminTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (apts.length === 0) {
        table  && (table.style.display = 'none');
        emptyEl && emptyEl.classList.remove('hidden');
        return;
    }
    table  && (table.style.display = '');
    emptyEl && emptyEl.classList.add('hidden');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    apts.forEach((apt, i) => {
        const isPast = new Date(apt.date) < today;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${i + 1}</strong></td>
            <td><strong>${escapeAdminHTML(apt.patientName)}</strong>
                ${apt.patientEmail ? `<br><small style="color:var(--text-muted)">${escapeAdminHTML(apt.patientEmail)}</small>` : ''}
            </td>
            <td>${escapeAdminHTML(apt.patientPhone || '—')}</td>
            <td>${apt.doctorAvatar || '👨‍⚕️'} ${escapeAdminHTML(apt.doctorName)}</td>
            <td><span class="badge">${escapeAdminHTML(apt.specialization || '—')}</span></td>
            <td>${formatAdminDate(apt.date)}</td>
            <td>${escapeAdminHTML(apt.time)}</td>
            <td>${isPast
                ? '<span class="status-badge status-past">⏰ Past</span>'
                : '<span class="status-badge status-upcoming">✅ Upcoming</span>'}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="adminConfirmDelete('${apt.id}','appointment')">🗑️ Delete</button>
            </td>`;
        tbody.appendChild(row);
    });
}

/* ══════════════════════════════════════════════════════════
   DOCTORS TAB
══════════════════════════════════════════════════════════ */

function renderDoctorsTable(doctors) {
    const tbody   = document.getElementById('doctorsTableBody');
    const emptyEl = document.getElementById('doctorsEmpty');
    const table   = document.getElementById('doctorsTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (doctors.length === 0) {
        table  && (table.style.display = 'none');
        emptyEl && emptyEl.classList.remove('hidden');
        return;
    }
    table  && (table.style.display = '');
    emptyEl && emptyEl.classList.add('hidden');

    doctors.forEach((doc, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${i + 1}</strong></td>
            <td>
                <span style="font-size:1.3rem">${doc.avatar || '👨‍⚕️'}</span>
                <strong style="margin-left:8px;">${escapeAdminHTML(doc.name)}</strong>
            </td>
            <td><span class="badge">${escapeAdminHTML(doc.specialization)}</span></td>
            <td>${escapeAdminHTML(doc.experience || '—')}</td>
            <td>${escapeAdminHTML(doc.location || '—')}</td>
            <td>₹${doc.fee || '—'}</td>
            <td>⭐ ${doc.rating || '—'}</td>
            <td style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" onclick="openDoctorModal('${doc.id}')">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="adminConfirmDelete('${doc.id}','doctor')">🗑️</button>
            </td>`;
        tbody.appendChild(row);
    });
}

function openDoctorModal(editId) {
    const form = document.getElementById('doctorForm');
    form.reset();
    document.getElementById('dmEditId').value = '';
    document.getElementById('doctorModalTitle').textContent = editId ? '✏️ Edit Doctor' : '👨‍⚕️ Add Doctor';

    if (editId) {
        const doc = allDoctors.find(d => d.id === editId);
        if (doc) {
            document.getElementById('dmName').value     = doc.name || '';
            document.getElementById('dmSpec').value     = doc.specialization || '';
            document.getElementById('dmExp').value      = doc.experience || '';
            document.getElementById('dmFee').value      = doc.fee || '';
            document.getElementById('dmEmail').value    = doc.email || '';
            document.getElementById('dmLocation').value = doc.location || '';
            document.getElementById('dmRating').value   = doc.rating || '';
            document.getElementById('dmBio').value      = doc.bio || '';
            document.getElementById('dmSlots').value    = (doc.availableSlots || []).join(', ');
            document.getElementById('dmEditId').value   = editId;
        }
    }
    document.getElementById('doctorModal').classList.remove('hidden');
}

function closeDoctorModal() {
    document.getElementById('doctorModal').classList.add('hidden');
}

async function saveDoctorFromModal(e) {
    e.preventDefault();
    const editId   = document.getElementById('dmEditId').value;
    const name     = document.getElementById('dmName').value.trim();
    const spec     = document.getElementById('dmSpec').value.trim();
    const exp      = document.getElementById('dmExp').value.trim();
    const fee      = parseFloat(document.getElementById('dmFee').value) || 0;
    const location = document.getElementById('dmLocation').value.trim();
    const rating   = parseFloat(document.getElementById('dmRating').value) || 5.0;
    const bio      = document.getElementById('dmBio').value.trim();
    const email    = document.getElementById('dmEmail').value.trim();
    const slotsRaw = document.getElementById('dmSlots').value.trim();
    const slots    = slotsRaw ? slotsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!name || !spec) { showToast('Name and specialization are required.', 'error'); return; }

    const body = { name, specialization: spec, experience: exp, fee, location, rating, bio, email, availableSlots: slots };

    let res;
    if (editId) {
        res = await apiCall(`/doctors/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
        res = await apiCall('/doctors', { method: 'POST', body: JSON.stringify(body) });
    }

    if (!res.ok) { showToast(res.message || 'Could not save doctor.', 'error'); return; }

    showToast(editId ? 'Doctor updated! ✅' : 'Doctor added! ✅', 'success');
    closeDoctorModal();

    // Refresh doctors list
    const fresh = await apiCall('/doctors');
    if (fresh.ok && fresh.data) {
        allDoctors = fresh.data.map(d => ({ ...d, id: d._id || d.id }));
        renderDoctorsTable(allDoctors);
    }
}

/* ══════════════════════════════════════════════════════════
   PATIENTS TAB
══════════════════════════════════════════════════════════ */

function renderPatientsTable(patients) {
    const tbody   = document.getElementById('patientsTableBody');
    const emptyEl = document.getElementById('patientsEmpty');
    const table   = document.getElementById('patientsTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (patients.length === 0) {
        table  && (table.style.display = 'none');
        emptyEl && emptyEl.classList.remove('hidden');
        return;
    }
    table  && (table.style.display = '');
    emptyEl && emptyEl.classList.add('hidden');

    patients.forEach((p, i) => {
        const bookingCount = p.bookingCount ?? 0;
        const joinDate = p.createdAt
            ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${i + 1}</strong></td>
            <td><strong>${escapeAdminHTML(p.name)}</strong></td>
            <td>${escapeAdminHTML(p.email || '—')}</td>
            <td>${escapeAdminHTML(p.phone || '—')}</td>
            <td>${joinDate}</td>
            <td><span class="badge">${bookingCount} booking${bookingCount !== 1 ? 's' : ''}</span></td>`;
        tbody.appendChild(row);
    });
}

/* ══════════════════════════════════════════════════════════
   DELETE
══════════════════════════════════════════════════════════ */

function adminConfirmDelete(id, type) {
    pendingDeleteId   = id;
    pendingDeleteType = type;
    document.getElementById('confirmModalTitle').textContent =
        type === 'doctor' ? 'Delete Doctor?' : 'Delete Appointment?';
    document.getElementById('confirmModalMsg').textContent =
        'This will permanently remove the record from the system.';
    document.getElementById('confirmModal').classList.remove('hidden');
}

async function performDelete() {
    if (!pendingDeleteId) return;

    if (pendingDeleteType === 'doctor') {
        const { ok, message } = await apiCall(`/doctors/${pendingDeleteId}`, { method: 'DELETE' });
        if (!ok) { showToast(message || 'Delete failed.', 'error'); return; }
        allDoctors = allDoctors.filter(d => d.id !== pendingDeleteId);
        renderDoctorsTable(allDoctors);
        showToast('Doctor deleted.', 'success');

    } else if (pendingDeleteId === '__ALL__') {
        const { ok, message } = await apiCall('/admin/appointments/all', { method: 'DELETE' });
        if (!ok) { showToast(message || 'Could not clear appointments.', 'error'); return; }
        allAppointments = [];
        renderStats({ totalApts: 0, upcomingApts: 0, pastApts: 0, totalPatients: allPatients.length });
        populateAdminSpecFilter([]);
        renderTable([]);
        showToast('All appointments cleared.', 'success');

    } else {
        const { ok, message } = await apiCall(`/appointments/${pendingDeleteId}`, { method: 'DELETE' });
        if (!ok) { showToast(message || 'Delete failed.', 'error'); return; }
        allAppointments = allAppointments.filter(a => a.id !== pendingDeleteId);
        // Refresh stats
        const statsRes = await apiCall('/admin/stats');
        if (statsRes.ok) renderStats(statsRes.data);
        populateAdminSpecFilter(allAppointments);
        renderTable(allAppointments);
        showToast('Appointment deleted.', 'success');
    }

    pendingDeleteId = null;
}

/* ══════════════════════════════════════════════════════════
   MODAL WIRING
══════════════════════════════════════════════════════════ */

function wireAdminModal() {
    const overlay    = document.getElementById('confirmModal');
    const cancelBtn  = document.getElementById('modalCancelBtn');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    if (!overlay) return;

    cancelBtn?.addEventListener('click',  () => { overlay.classList.add('hidden'); pendingDeleteId = null; });
    confirmBtn?.addEventListener('click', () => { overlay.classList.add('hidden'); performDelete(); });
    overlay.addEventListener('click', e => {
        if (e.target === overlay) { overlay.classList.add('hidden'); pendingDeleteId = null; }
    });

    const docOverlay = document.getElementById('doctorModal');
    docOverlay?.addEventListener('click', e => { if (e.target === docOverlay) closeDoctorModal(); });
}

/* ══════════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════════ */

function formatAdminDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeAdminHTML(str) {
    if (typeof str !== 'string') return str ?? '';
    return str
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
