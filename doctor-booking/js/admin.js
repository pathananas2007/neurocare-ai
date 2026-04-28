/* ============================================================
   admin.js – Admin Panel Logic
   ============================================================ */

const APPOINTMENTS_KEY = 'wf_appointments';
let pendingDeleteId    = null;
let allAppointments    = [];

function loadAdminPanel() {
    allAppointments = getAdminAppointments();

    renderStats(allAppointments);
    populateAdminSpecFilter(allAppointments);
    renderTable(allAppointments);

    // Search
    const searchInput = document.getElementById('adminSearch');
    if (searchInput) {
        searchInput.addEventListener('input', applyAdminFilters);
    }

    // Spec filter
    const specFilter = document.getElementById('adminSpecFilter');
    if (specFilter) {
        specFilter.addEventListener('change', applyAdminFilters);
    }

    // Clear All
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (allAppointments.length === 0) {
                showToast('No appointments to clear.', 'error');
                return;
            }
            pendingDeleteId = '__ALL__';
            document.getElementById('confirmModal').classList.remove('hidden');
        });
    }

    // Modal wiring
    wireAdminModal();
}

/* ── Stats ── */
function renderStats(apts) {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const upcoming = apts.filter(a => new Date(a.date) >= today).length;
    const past     = apts.filter(a => new Date(a.date) <  today).length;
    const unique   = new Set(apts.map(a => (a.patientPhone || a.patientName || '').toLowerCase())).size;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('statTotal',    apts.length);
    set('statUpcoming', upcoming);
    set('statPast',     past);
    set('statUnique',   unique);
}

/* ── Specialization Filter ── */
function populateAdminSpecFilter(apts) {
    const filter = document.getElementById('adminSpecFilter');
    if (!filter) return;
    // Remove old dynamic options
    while (filter.options.length > 1) filter.remove(1);

    const specs = [...new Set(apts.map(a => a.specialization))].sort();
    specs.forEach(spec => {
        const opt       = document.createElement('option');
        opt.value       = spec;
        opt.textContent = spec;
        filter.appendChild(opt);
    });
}

/* ── Filter Logic ── */
function applyAdminFilters() {
    const search = (document.getElementById('adminSearch')?.value || '').toLowerCase().trim();
    const spec   = document.getElementById('adminSpecFilter')?.value || '';

    const filtered = allAppointments.filter(a => {
        const matchSearch = !search ||
            a.patientName.toLowerCase().includes(search)   ||
            a.doctorName.toLowerCase().includes(search)    ||
            (a.patientPhone || '').includes(search)        ||
            (a.patientEmail || '').toLowerCase().includes(search);
        const matchSpec = !spec || a.specialization === spec;
        return matchSearch && matchSpec;
    });

    renderTable(filtered);
}

/* ── Table Render ── */
function renderTable(apts) {
    const tbody  = document.getElementById('adminTableBody');
    const emptyEl = document.getElementById('adminEmpty');
    const table   = document.getElementById('adminTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (apts.length === 0) {
        table  && (table.style.display  = 'none');
        emptyEl && emptyEl.classList.remove('hidden');
        return;
    }

    table  && (table.style.display  = '');
    emptyEl && emptyEl.classList.add('hidden');

    const today = new Date(); today.setHours(0, 0, 0, 0);

    apts.forEach((apt, i) => {
        const isPast   = new Date(apt.date) < today;
        const statusBadge = isPast
            ? '<span class="status-badge status-past">⏰ Past</span>'
            : '<span class="status-badge status-upcoming">✅ Upcoming</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${i + 1}</strong></td>
            <td>
                <strong>${escapeAdminHTML(apt.patientName)}</strong>
                ${apt.patientEmail ? `<br><small style="color:var(--text-muted)">${escapeAdminHTML(apt.patientEmail)}</small>` : ''}
            </td>
            <td>${escapeAdminHTML(apt.patientPhone || '—')}</td>
            <td>
                ${apt.doctorAvatar || '👨‍⚕️'} ${escapeAdminHTML(apt.doctorName)}
            </td>
            <td><span class="badge">${escapeAdminHTML(apt.specialization)}</span></td>
            <td>${formatAdminDate(apt.date)}</td>
            <td>${escapeAdminHTML(apt.time)}</td>
            <td>${statusBadge}</td>
            <td>
                <button
                    id="admin-del-${apt.id}"
                    class="btn btn-danger btn-sm"
                    onclick="adminConfirmDelete('${apt.id}')">
                    🗑️ Delete
                </button>
            </td>`;
        tbody.appendChild(row);
    });
}

/* ── Delete ── */
function adminConfirmDelete(id) {
    pendingDeleteId = id;
    document.getElementById('confirmModal').classList.remove('hidden');
}

function performDelete() {
    if (!pendingDeleteId) return;

    let apts;
    if (pendingDeleteId === '__ALL__') {
        apts = [];
        showToast('All appointments cleared.', 'success');
    } else {
        apts = getAdminAppointments().filter(a => a.id !== pendingDeleteId);
        showToast('Appointment deleted.', 'success');
    }

    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(apts));
    allAppointments = apts;
    pendingDeleteId = null;

    renderStats(apts);
    populateAdminSpecFilter(apts);
    renderTable(apts);
}

/* ── Modal Wiring ── */
function wireAdminModal() {
    const overlay    = document.getElementById('confirmModal');
    const cancelBtn  = document.getElementById('modalCancelBtn');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    if (!overlay) return;

    cancelBtn?.addEventListener('click', () => {
        overlay.classList.add('hidden');
        pendingDeleteId = null;
    });
    confirmBtn?.addEventListener('click', () => {
        overlay.classList.add('hidden');
        performDelete();
    });
    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            overlay.classList.add('hidden');
            pendingDeleteId = null;
        }
    });
}

/* ── Utilities ── */
function getAdminAppointments() {
    return JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)) || [];
}

function formatAdminDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeAdminHTML(str) {
    if (typeof str !== 'string') return str ?? '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
