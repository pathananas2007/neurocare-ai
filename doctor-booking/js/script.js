/* ============================================================
   script.js – Home, Booking & Appointments Logic
   Connected to MongoDB backend via REST API.
   ============================================================ */

const SELECTED_DOC_KEY   = 'wf_selected_doctor';

// In-memory cache of appointments (loaded from API)
let _appointmentsCache   = null;

let doctorsData          = [];
let pendingDeleteId      = null;

/* ── Convenience wrapper (auth.js exposes apiCall & getToken) ── */
async function _api(endpoint, options = {}) {
    if (typeof apiCall === 'function') {
        return apiCall(endpoint, options);
    }
    // Fallback if auth.js not loaded
    const token = localStorage.getItem('wf_session')
        ? JSON.parse(localStorage.getItem('wf_session')).token : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
        const res  = await fetch(`http://localhost:5000/api${endpoint}`, { ...options, headers });
        const json = await res.json();
        return { ok: res.ok, status: res.status, data: json.data, message: json.message || '' };
    } catch {
        return { ok: false, status: 0, data: null, message: 'Cannot connect to server.' };
    }
}

/* ══════════════════════════════════════════════════════════
   HOME PAGE – Doctor Listing
══════════════════════════════════════════════════════════ */

async function loadDoctors() {
    const list = document.getElementById('doctors-list');

    try {
        const { ok, data, message } = await _api('/doctors');

        if (!ok || !data) {
            throw new Error(message || 'Failed to load doctors');
        }

        // Normalise: MongoDB uses _id, UI uses id
        doctorsData = data.map(d => ({ ...d, id: d._id || d.id }));

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
        if (list) list.innerHTML = `
            <div class="alert error" style="grid-column:1/-1;">
                <span>⚠️</span>
                <div>
                    <strong>Could not load doctors.</strong>
                    <p>${escapeHTML(err.message)}</p>
                    <p style="margin-top:8px;font-size:0.88rem;">Make sure the backend is running: <code>npm run dev</code> in the <strong>backend</strong> folder.</p>
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

    // Build a map of doctorId → patient list from cached appointments
    const allApts = getAppointments();
    const patientMap = {};
    allApts.forEach(a => {
        const key = a.doctorId;
        if (!patientMap[key]) patientMap[key] = [];
        const firstName = (a.patientName || '').split(' ')[0];
        if (firstName && !patientMap[key].includes(firstName)) {
            patientMap[key].push(firstName);
        }
    });

    doctors.forEach((doc, i) => {
        const stars  = renderStars(doc.rating || 4.5);
        const card   = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${i * 0.07}s`;
        card.setAttribute('role', 'listitem');

        // Build patient snippet for this doctor
        const patients = patientMap[doc.id] || [];
        let patientHTML = '';
        if (patients.length > 0) {
            const shown   = patients.slice(0, 3);
            const extra   = patients.length - shown.length;
            const avatars = shown.map(n =>
                `<span class="patient-avatar" title="${escapeHTML(n)}">${escapeHTML(n.charAt(0).toUpperCase())}</span>`
            ).join('');
            const extraLabel = extra > 0 ? `<span class="patient-extra">+${extra}</span>` : '';
            patientHTML = `
                <div class="doc-patients-row">
                    <div class="patient-avatars">${avatars}${extraLabel}</div>
                    <span class="patient-count">${patients.length} patient${patients.length !== 1 ? 's' : ''} booked</span>
                </div>`;
        }

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
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                    <div class="star-rating" title="${doc.rating} / 5">${stars} <small style="color:var(--text-muted)">${doc.rating}</small></div>
                    <span class="review-count-chip" id="review-chip-${doc.id}" onclick="openDoctorReviewsModal('${doc.id}','${escapeHTML(doc.name)}')">⭐ 0 reviews</span>
                </div>
                <p class="card-bio">${escapeHTML(doc.bio || '')}</p>
                ${patientHTML}
            </div>
            <div class="card-footer" style="display:flex;gap:10px;">
                <button
                    class="btn btn-outline btn-reviews"
                    style="flex:0 0 auto;"
                    onclick="openDoctorReviewsModal('${doc.id}','${escapeHTML(doc.name)}')">
                    💬 Reviews
                </button>
                <button
                    id="book-btn-${doc.id}"
                    onclick="goToBooking('${doc.id}')"
                    class="btn btn-primary"
                    style="flex:1">
                    Book Appointment
                </button>
            </div>`;
        list.appendChild(card);
    });

    // Update review count chips after all cards are rendered
    if (typeof getDoctorReviews === 'function') {
        doctors.forEach(doc => {
            const chip  = document.getElementById(`review-chip-${doc.id}`);
            if (!chip) return;
            const revs  = getDoctorReviews(doc.id);
            const avg   = revs.length > 0
                ? (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1)
                : null;
            chip.textContent = avg
                ? `⭐ ${avg} (${revs.length})`
                : `⭐ ${revs.length} review${revs.length !== 1 ? 's' : ''}`;
        });
    }
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
        setTimeout(() => window.location.href = `login-patient.html?redirect=book.html`, 1200);
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
    // Show availability calendar
    const calEl = document.getElementById('availabilityCalendar');
    if (calEl) calEl.classList.remove('hidden');

    // Set min date = today
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        const today    = new Date().toISOString().split('T')[0];
        dateInput.min  = today;
        // When date changes, update available slots
        dateInput.addEventListener('change', () => updateAvailableSlots(doctor, dateInput.value));
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

    // Render availability calendar
    renderAvailabilityCalendar(doctor);

    // Step states
    setStep(2);

    form?.addEventListener('submit', e => {
        e.preventDefault();
        if (validateBookingForm()) showPaymentSection(doctor);
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

async function saveAppointment(doctor, paymentMethod, paymentStatus) {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = 'Booking…';
    }

    const body = {
        doctorId:      doctor._id || doctor.id,
        patientName:   document.getElementById('patientName').value.trim(),
        patientPhone:  document.getElementById('patientPhone').value.trim(),
        patientEmail:  document.getElementById('patientEmail').value.trim(),
        date:          document.getElementById('appointmentDate').value,
        time:          document.getElementById('appointmentTime').value,
        reason:        document.getElementById('reason')?.value.trim() || '',
        paymentMethod: paymentMethod || 'cash',
        paymentStatus: paymentStatus || 'pending'
    };

    const { ok, data, message } = await _api('/appointments', {
        method: 'POST',
        body:   JSON.stringify(body)
    });

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').textContent = '✅ Proceed to Payment';
    }

    if (!ok) {
        showToast(message || 'Booking failed. Please try again.', 'error');
        return;
    }

    // Normalise _id → id for receipt
    const appointment = { ...data, id: data._id || data.id };

    // Invalidate cache so next page load re-fetches
    _appointmentsCache = null;

    localStorage.removeItem(SELECTED_DOC_KEY);
    window._lastBookedAptId = appointment.id;
    window._lastBookedApt   = appointment;   // store full object for receipt

    document.getElementById('booking-form')?.classList.add('hidden');
    document.getElementById('selected-doctor-info')?.classList.add('hidden');
    document.getElementById('payment-section')?.classList.add('hidden');
    document.getElementById('success-message').classList.remove('hidden');
    setStep(4);
}

function setStep(n) {
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`step${i}-dot`);
        if (!dot) continue;
        dot.classList.remove('active', 'done');
        if (i < n)  dot.classList.add('done');
        if (i === n) dot.classList.add('active');
    }
}


/* ══════════════════════════════════════════════════════════
   AVAILABILITY CALENDAR
══════════════════════════════════════════════════════════ */

function renderAvailabilityCalendar(doctor) {
    const container = document.getElementById('availabilityCalendar');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Show next 14 days
    const days = [];
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push(d);
    }

    // Get already-booked slots for this doctor
    const allApts = getAppointments();
    const bookedMap = {}; // date → [times]
    allApts.forEach(a => {
        if (a.doctorId === doctor.id || a.doctorName?.toLowerCase() === doctor.name?.toLowerCase()) {
            if (!bookedMap[a.date]) bookedMap[a.date] = [];
            bookedMap[a.date].push(a.time);
        }
    });

    const slots = doctor.availableSlots || [];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    container.innerHTML = `
        <div class="cal-header">
            <span class="cal-title">📅 Doctor's Availability</span>
            <span class="cal-subtitle">${slots.length} slot${slots.length !== 1 ? 's' : ''} per day</span>
        </div>
        <div class="cal-days">
            ${days.map(d => {
                const dateStr   = d.toISOString().split('T')[0];
                const booked    = bookedMap[dateStr] || [];
                const available = slots.filter(s => !booked.includes(s)).length;
                const total     = slots.length;
                const isToday   = dateStr === today.toISOString().split('T')[0];
                const pct       = total > 0 ? Math.round((available / total) * 100) : 0;
                const statusCls = available === 0 ? 'cal-day-full'
                                : available <= Math.ceil(total / 2) ? 'cal-day-partial'
                                : 'cal-day-open';

                return `<div class="cal-day ${statusCls} ${isToday ? 'cal-day-today' : ''}"
                             onclick="selectCalendarDay('${dateStr}', this)">
                    <div class="cal-day-name">${isToday ? 'Today' : dayNames[d.getDay()]}</div>
                    <div class="cal-day-num">${d.getDate()}</div>
                    <div class="cal-day-month">${monthNames[d.getMonth()]}</div>
                    <div class="cal-day-avail">${available === 0 ? 'Full' : available + ' open'}</div>
                </div>`;
            }).join('')}
        </div>
        <div class="cal-legend">
            <span class="cal-leg cal-day-open">Open</span>
            <span class="cal-leg cal-day-partial">Filling</span>
            <span class="cal-leg cal-day-full">Full</span>
        </div>`;
}

function selectCalendarDay(dateStr, el) {
    // Highlight selected day
    document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('cal-day-selected'));
    el.classList.add('cal-day-selected');

    // Set the date input
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.value = dateStr;
        dateInput.dispatchEvent(new Event('change'));
    }
}

function updateAvailableSlots(doctor, selectedDate) {
    const timeSelect = document.getElementById('appointmentTime');
    if (!timeSelect) return;

    const allApts  = getAppointments();
    const booked   = allApts
        .filter(a => a.date === selectedDate &&
            (a.doctorId === doctor.id || a.doctorName?.toLowerCase() === doctor.name?.toLowerCase()))
        .map(a => a.time);

    const slots = doctor.availableSlots || [];

    timeSelect.innerHTML = '<option value="" disabled selected>Select a slot</option>';
    slots.forEach(slot => {
        const opt = document.createElement('option');
        opt.value = slot;
        opt.textContent = booked.includes(slot) ? `${slot} (Booked)` : slot;
        opt.disabled = booked.includes(slot);
        timeSelect.appendChild(opt);
    });
}

/* ══════════════════════════════════════════════════════════
   PAYMENT SECTION
══════════════════════════════════════════════════════════ */

let _pendingDoctor = null;

function initPaymentSection() {
    // Wire payment method radio buttons
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updatePaymentUI(radio.value);
        });
    });

    // Format card number with spaces
    const cardNum = document.getElementById('cardNumber');
    if (cardNum) {
        cardNum.addEventListener('input', () => {
            let v = cardNum.value.replace(/\D/g, '').slice(0, 16);
            cardNum.value = v.replace(/(.{4})/g, '$1 ').trim();
        });
    }

    // Format expiry MM/YY
    const expiry = document.getElementById('cardExpiry');
    if (expiry) {
        expiry.addEventListener('input', () => {
            let v = expiry.value.replace(/\D/g, '').slice(0, 4);
            if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
            expiry.value = v;
        });
    }
}

function showPaymentSection(doctor) {
    _pendingDoctor = doctor;

    // Hide form, show payment
    document.getElementById('booking-form').classList.add('hidden');
    document.getElementById('selected-doctor-info').classList.add('hidden');
    document.getElementById('payment-section').classList.remove('hidden');

    // Fill doctor summary in payment section
    const summary = document.getElementById('payment-doctor-summary');
    if (summary) {
        summary.innerHTML = `
            <div class="sdi-avatar">${escapeHTML(doctor.avatar || '👨‍⚕️')}</div>
            <div>
                <h3>${escapeHTML(doctor.name)}</h3>
                <p>${escapeHTML(doctor.specialization)} • ${escapeHTML(doctor.experience)}</p>
                <p>📍 ${escapeHTML(doctor.location)} &nbsp;|&nbsp; 💰 Consultation Fee: <strong>₹${doctor.fee}</strong></p>
            </div>`;
    }

    // Set fee amounts
    document.getElementById('pay-fee-amount').textContent  = `₹${doctor.fee}`;
    document.getElementById('pay-total-amount').textContent = `₹${doctor.fee}`;

    // Update pay button label based on default method
    updatePaymentUI('upi');
    setStep(3);
}

function backToForm() {
    document.getElementById('payment-section').classList.add('hidden');
    document.getElementById('booking-form').classList.remove('hidden');
    document.getElementById('selected-doctor-info').classList.remove('hidden');
    setStep(2);
}

function updatePaymentUI(method) {
    // Toggle field panels
    document.getElementById('upi-fields').classList.toggle('hidden',  method !== 'upi');
    document.getElementById('card-fields').classList.toggle('hidden', method !== 'card');
    document.getElementById('cash-fields').classList.toggle('hidden', method !== 'cash');

    // Highlight selected option card
    ['upi', 'card', 'cash'].forEach(m => {
        document.getElementById(`opt-${m}`)?.classList.toggle('selected', m === method);
    });

    // Update button label
    const btnText = document.getElementById('payBtnText');
    if (btnText) {
        if (method === 'cash') btnText.textContent = '✅ Confirm Booking (Pay at Clinic)';
        else btnText.textContent = '💳 Pay Now';
    }
}

function validatePaymentForm(method) {
    // Clear previous errors
    ['err-upi','err-card','err-expiry','err-cvv','err-cardname'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });

    if (method === 'upi') {
        const upi = document.getElementById('upiId').value.trim();
        if (!upi || !/^[\w.\-]+@[\w]+$/.test(upi)) {
            document.getElementById('err-upi').textContent = 'Enter a valid UPI ID (e.g. name@upi).';
            return false;
        }
    }

    if (method === 'card') {
        const num  = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const exp  = document.getElementById('cardExpiry').value.trim();
        const cvv  = document.getElementById('cardCvv').value.trim();
        const name = document.getElementById('cardName').value.trim();
        let ok = true;

        if (num.length !== 16 || !/^\d+$/.test(num)) {
            document.getElementById('err-card').textContent = 'Enter a valid 16-digit card number.';
            ok = false;
        }
        if (!/^\d{2}\/\d{2}$/.test(exp)) {
            document.getElementById('err-expiry').textContent = 'Enter expiry as MM/YY.';
            ok = false;
        }
        if (!/^\d{3}$/.test(cvv)) {
            document.getElementById('err-cvv').textContent = 'Enter a valid 3-digit CVV.';
            ok = false;
        }
        if (name.length < 2) {
            document.getElementById('err-cardname').textContent = 'Enter the name on your card.';
            ok = false;
        }
        if (!ok) return false;
    }

    return true;
}

function processPayment() {
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
    if (!validatePaymentForm(method)) return;

    const btn     = document.getElementById('payNowBtn');
    const btnText = document.getElementById('payBtnText');
    const spinner = document.getElementById('payBtnSpinner');

    btn.disabled       = true;
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');

    // Simulate payment processing delay
    const delay = method === 'cash' ? 600 : 1800;
    setTimeout(() => {
        const paymentStatus = 'paid';
        saveAppointment(_pendingDoctor, method, paymentStatus);
    }, delay);
}

/* ══════════════════════════════════════════════════════════
   APPOINTMENTS PAGE
══════════════════════════════════════════════════════════ */

let currentFilter = 'all';

async function loadAppointments() {
    // Show loading state
    const list = document.getElementById('appointments-list');
    if (list) list.innerHTML = `<div class="loading" style="grid-column:1/-1"><div class="spinner"></div><span>Loading appointments…</span></div>`;

    // Fetch from API
    const { ok, data, message } = await _api('/appointments/my');

    if (!ok) {
        if (list) list.innerHTML = `<div class="alert error" style="grid-column:1/-1"><span>⚠️</span><div><strong>Could not load appointments.</strong><p>${escapeHTML(message)}</p></div></div>`;
        return;
    }

    // Normalise _id → id
    _appointmentsCache = (data || []).map(a => ({ ...a, id: a._id || a.id }));

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

    // Cancel confirm modal
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
    const list    = document.getElementById('appointments-list');
    const emptyEl = document.getElementById('no-appointments');
    if (!list) return;

    const today = new Date(); today.setHours(0,0,0,0);
    let visible = [...(_appointmentsCache || [])];

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
        const aptStatus = apt.status || (isPast ? 'completed' : 'pending');

        // Status badge config
        const statusConfig = {
            pending:   { cls: 'status-pending',   label: '⏳ Pending'   },
            confirmed: { cls: 'status-confirmed',  label: '✅ Confirmed' },
            completed: { cls: 'status-completed',  label: '🏁 Completed' },
            cancelled: { cls: 'status-cancelled',  label: '❌ Cancelled' },
        };
        const sc = statusConfig[aptStatus] || statusConfig.pending;

        // Rating display
        const hasRating = apt.rating && apt.rating > 0;
        const ratingHTML = hasRating
            ? `<div class="apt-rating-display">
                ${'★'.repeat(apt.rating)}${'☆'.repeat(5 - apt.rating)}
                <span>${apt.ratingNote ? escapeHTML(apt.ratingNote) : ''}</span>
               </div>`
            : '';

        // Action buttons
        const canCancel    = !isPast && aptStatus !== 'cancelled' && aptStatus !== 'completed';
        const canReschedule = !isPast && aptStatus !== 'cancelled' && aptStatus !== 'completed';
        const canRate      = isPast && aptStatus !== 'cancelled' && !hasRating;

        const card     = document.createElement('div');
        card.className = 'apt-card';
        card.style.animationDelay = `${i * 0.06}s`;

        // Check for prescription (features.js)
        const hasPrescription = (typeof getPrescription === 'function') && getPrescription(apt.id);

        card.innerHTML = `
            <div class="apt-card-top">
                <div class="apt-avatar">${apt.doctorAvatar || '👨‍⚕️'}</div>
                <div>
                    <div class="apt-doc-name">${escapeHTML(apt.doctorName)}</div>
                    <span class="badge">${escapeHTML(apt.specialization)}</span>
                    &nbsp;
                    <span class="status-badge ${sc.cls}">${sc.label}</span>
                    ${hasPrescription ? `&nbsp;<span class="presc-badge" onclick="openViewPrescriptionModal('${apt.id}')">💊 Prescription</span>` : ''}
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
            ${ratingHTML}
            <div class="apt-card-actions">
                ${canCancel ? `<button class="btn btn-danger" style="flex:1" onclick="confirmCancel('${apt.id}')">🗑️ Cancel</button>` : ''}
                ${canReschedule ? `<button class="btn btn-outline" style="flex:1" onclick="openRescheduleModal('${apt.id}')">🔄 Reschedule</button>` : ''}
                ${canRate ? `<button class="btn btn-success" style="flex:1" onclick="openRatingModal('${apt.id}')">⭐ Rate Visit</button>` : ''}
                <button class="btn btn-outline" style="flex:1" onclick="downloadReceipt('${apt.id}')">📄 Receipt</button>
            </div>`;

        list.appendChild(card);
    });
}

function confirmCancel(id) {
    pendingDeleteId = id;
    document.getElementById('confirmModal').classList.remove('hidden');
}

async function deleteAppointment(id) {
    const { ok, message } = await _api(`/appointments/${id}`, { method: 'DELETE' });
    if (!ok) {
        showToast(message || 'Could not cancel appointment.', 'error');
        return;
    }
    // Remove from cache and re-render
    _appointmentsCache = (_appointmentsCache || []).filter(a => a.id !== id);
    showToast('Appointment cancelled.', 'success');
    renderAppointments(currentFilter);
}

/* ══════════════════════════════════════════════════════════
   RESCHEDULE
══════════════════════════════════════════════════════════ */

let _rescheduleAptId = null;

function openRescheduleModal(aptId) {
    _rescheduleAptId = aptId;
    const apt = (_appointmentsCache || []).find(a => a.id === aptId);
    if (!apt) return;

    const dateInput = document.getElementById('rescheduleDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min   = today;
        dateInput.value = apt.date;
    }

    const timeSelect = document.getElementById('rescheduleTime');
    if (timeSelect) {
        timeSelect.innerHTML = '<option value="" disabled>Select a slot</option>';
        // Use doctor slots from doctorsData if available
        const doc = doctorsData.find(d => d.id === (apt.doctorId?._id || apt.doctorId));
        const slots = doc?.availableSlots?.length
            ? doc.availableSlots
            : ['09:00 AM','10:00 AM','11:00 AM','12:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM'];
        slots.forEach(s => {
            const o = document.createElement('option');
            o.value = s; o.textContent = s;
            if (s === apt.time) o.selected = true;
            timeSelect.appendChild(o);
        });
    }
    document.getElementById('rescheduleModal').classList.remove('hidden');
}

function closeRescheduleModal() {
    document.getElementById('rescheduleModal').classList.add('hidden');
    _rescheduleAptId = null;
}

async function confirmReschedule() {
    const newDate = document.getElementById('rescheduleDate').value;
    const newTime = document.getElementById('rescheduleTime').value;
    const errEl   = document.getElementById('reschedule-err');

    if (!newDate) { errEl.textContent = 'Please select a date.'; return; }
    if (!newTime) { errEl.textContent = 'Please select a time slot.'; return; }
    errEl.textContent = '';

    const today = new Date(); today.setHours(0,0,0,0);
    if (new Date(newDate) < today) { errEl.textContent = 'Please choose today or a future date.'; return; }

    // Update via API — delete old and re-book with new date/time
    const apt = (_appointmentsCache || []).find(a => a.id === _rescheduleAptId);
    if (!apt) return;

    const confirmBtn = document.querySelector('#rescheduleModal .btn-primary');
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Saving…'; }

    // Delete existing appointment
    const del = await _api(`/appointments/${_rescheduleAptId}`, { method: 'DELETE' });
    if (!del.ok) {
        errEl.textContent = del.message || 'Could not reschedule. Please try again.';
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = '✅ Confirm'; }
        return;
    }

    // Re-book with new date/time
    const { ok, data, message } = await _api('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            doctorId:      apt.doctorId?._id || apt.doctorId,
            patientName:   apt.patientName,
            patientPhone:  apt.patientPhone,
            patientEmail:  apt.patientEmail || '',
            date:          newDate,
            time:          newTime,
            reason:        apt.reason || '',
            paymentMethod: apt.paymentMethod || 'cash',
            paymentStatus: apt.paymentStatus || 'pending'
        })
    });

    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = '✅ Confirm'; }

    if (!ok) {
        errEl.textContent = message || 'This slot may be taken. Please choose another.';
        return;
    }

    // Update cache
    const newApt = { ...data, id: data._id || data.id };
    _appointmentsCache = (_appointmentsCache || [])
        .filter(a => a.id !== _rescheduleAptId)
        .concat(newApt);

    closeRescheduleModal();
    showToast('Appointment rescheduled! ✅', 'success');
    renderAppointments(currentFilter);
}

/* ══════════════════════════════════════════════════════════
   RATING
══════════════════════════════════════════════════════════ */

let _ratingAptId   = null;
let _selectedRating = 0;

function openRatingModal(aptId) {
    _ratingAptId    = aptId;
    _selectedRating = 0;
    document.getElementById('ratingNote').value = '';
    document.getElementById('rating-err').textContent = '';
    renderStarPicker(0);
    document.getElementById('ratingModal').classList.remove('hidden');
}

function closeRatingModal() {
    document.getElementById('ratingModal').classList.add('hidden');
    _ratingAptId = null;
}

function renderStarPicker(hovered) {
    const stars = document.querySelectorAll('.star-picker-btn');
    stars.forEach((btn, i) => {
        btn.textContent = (i < (hovered || _selectedRating)) ? '★' : '☆';
        btn.classList.toggle('star-active', i < (hovered || _selectedRating));
    });
}

async function submitRating() {
    if (_selectedRating === 0) {
        document.getElementById('rating-err').textContent = 'Please select a star rating.';
        return;
    }
    const note = document.getElementById('ratingNote').value.trim();

    const { ok, data, message } = await _api(`/appointments/${_ratingAptId}/rate`, {
        method: 'PATCH',
        body:   JSON.stringify({ rating: _selectedRating, ratingNote: note })
    });

    if (!ok) {
        document.getElementById('rating-err').textContent = message || 'Could not save rating.';
        return;
    }

    // Update cache
    const idx = (_appointmentsCache || []).findIndex(a => a.id === _ratingAptId);
    if (idx >= 0) {
        _appointmentsCache[idx].rating     = _selectedRating;
        _appointmentsCache[idx].ratingNote = note;
        _appointmentsCache[idx].status     = 'completed';
    }

    // Also save to the reviews system (features.js)
    if (typeof submitDoctorReview === 'function') {
        submitDoctorReview(_ratingAptId, _selectedRating, note);
    }

    closeRatingModal();
    showToast('Thank you for your feedback! ⭐', 'success');
    renderAppointments(currentFilter);
}


/* ══════════════════════════════════════════════════════════
   SHARED UTILITIES
══════════════════════════════════════════════════════════ */

/* Returns the in-memory cache (populated by loadAppointments).
   Falls back to empty array — no more localStorage reads. */
function getAppointments() {
    return _appointmentsCache || [];
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

function paymentMethodLabel(method) {
    const labels = { upi: '📱 Paid via UPI', card: '💳 Paid via Card', cash: '🏥 Pay at Clinic' };
    return labels[method] || method;
}

/* ══════════════════════════════════════════════════════════
   RECEIPT – Modal + Optional Download
══════════════════════════════════════════════════════════ */

// Called from book.html "View Receipt" button after booking
function openReceiptModal() {
    // Use the apt object stored during saveAppointment
    const apt = window._lastBookedApt;
    if (!apt) return;
    _showReceiptFromApt(apt);
}

// Called from appointments.html "Receipt" button
function showReceiptModal(aptId) {
    const apt = (_appointmentsCache || []).find(a => a.id === aptId);
    if (!apt) { showToast('Appointment not found.', 'error'); return; }
    _showReceiptFromApt(apt);
}

function _showReceiptFromApt(apt) {
    window._receiptAptId = apt.id;
    window._receiptApt   = apt;
    const bookedOn = new Date(apt.createdAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const aptDate = new Date(apt.date + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const content = document.getElementById('receiptModalContent');
    if (content) content.innerHTML = buildReceiptPreview(apt, aptDate, bookedOn);
    const modal = document.getElementById('receiptModal');
    if (modal) modal.classList.remove('hidden');
}

function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) modal.classList.add('hidden');
}

function downloadReceiptFromModal() {
    const apt = window._receiptApt;
    if (!apt) return;
    _triggerReceiptDownload(apt);
}

// Called from appointments page receipt button
function downloadReceipt(aptId) {
    const apt = (_appointmentsCache || []).find(a => a.id === aptId);
    if (apt) { window._receiptApt = apt; showReceiptModal(aptId); }
}

function triggerReceiptDownload(aptId) {
    const apt = (_appointmentsCache || []).find(a => a.id === aptId);
    if (apt) _triggerReceiptDownload(apt);
}

function _triggerReceiptDownload(apt) {
    const bookedOn = new Date(apt.createdAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const aptDate = new Date(apt.date + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const html = buildReceiptHTML(apt, aptDate, bookedOn, false);
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

function buildReceiptHTML(apt, aptDate, bookedOn, isModal) {
    const wrapStyle = isModal
        ? 'font-family:\'Outfit\',sans-serif;'
        : 'font-family:\'Outfit\',sans-serif;background:#f0f4ff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:40px 20px';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Appointment Receipt – ${apt.doctorName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{${wrapStyle}}
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
    @media print{body{background:#fff;padding:0}.receipt{box-shadow:none;border-radius:0;max-width:100%}.no-print{display:none}}
    .print-btn{display:block;width:100%;padding:16px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;text-align:center}
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
        <div class="doc-avatar">${apt.doctorAvatar || '👨‍⚕️'}</div>
        <div>
          <div class="doc-name">${apt.doctorName}</div>
          <span class="doc-spec">${apt.specialization}</span>
          <div class="doc-meta">📍 ${apt.location || 'N/A'}</div>
        </div>
      </div>
      <p class="section-title">Appointment Details</p>
      <div class="info-grid">
        <div class="info-item"><div class="label">📅 Date</div><div class="value">${aptDate}</div></div>
        <div class="info-item"><div class="label">🕐 Time Slot</div><div class="value">${apt.time}</div></div>
      </div>
      <p class="section-title">Patient Information</p>
      <div class="info-grid">
        <div class="info-item"><div class="label">👤 Patient Name</div><div class="value">${apt.patientName}</div></div>
        <div class="info-item"><div class="label">📞 Phone</div><div class="value">${apt.patientPhone || '—'}</div></div>
        ${apt.patientEmail ? `<div class="info-item full"><div class="label">📧 Email</div><div class="value">${apt.patientEmail}</div></div>` : ''}
        ${apt.reason ? `<div class="info-item full"><div class="label">📝 Reason for Visit</div><div class="value">${apt.reason}</div></div>` : ''}
      </div>
      <div class="fee-row">
        <span class="fee-label">💰 Consultation Fee</span>
        <span class="fee-amount">₹${apt.fee || '—'}</span>
      </div>
      <div class="badge-row">
        <span class="status-badge">✅ Confirmed &amp; Booked</span>
        ${apt.paymentMethod ? `<span class="status-badge" style="background:#ede9fe;color:#5b21b6;margin-left:8px;">${paymentMethodLabel(apt.paymentMethod)}</span>` : ''}
      </div>
      <div class="info-grid">
        <div class="info-item full"><div class="label">🗓️ Booked On</div><div class="value" style="font-weight:600;color:#64748b;font-size:0.9rem">${bookedOn}</div></div>
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

/* ══════════════════════════════════════════════════════════
   RECEIPT INLINE PREVIEW (shown inside modal)
══════════════════════════════════════════════════════════ */

function buildReceiptPreview(apt, aptDate, bookedOn) {
    return `
    <div class="receipt-preview">
        <div class="receipt-preview-header">
            <div class="rp-logo">⚕️ Wellness Forever</div>
            <h2>Appointment Receipt</h2>
            <p>Thank you for choosing Wellness Forever</p>
            <div class="receipt-ref">REF# WF-${apt.id.slice(-8).toUpperCase()}</div>
        </div>
        <div class="receipt-preview-body">
            <p class="rp-section-title">Doctor Information</p>
            <div class="rp-highlight">
                <div class="rp-doc-avatar">${escapeHTML(apt.doctorAvatar || '👨‍⚕️')}</div>
                <div>
                    <div class="rp-doc-name">${escapeHTML(apt.doctorName)}</div>
                    <span class="rp-doc-spec">${escapeHTML(apt.specialization)}</span>
                    <div class="rp-doc-meta">📍 ${escapeHTML(apt.location || 'N/A')}</div>
                </div>
            </div>

            <p class="rp-section-title">Appointment Details</p>
            <div class="rp-grid" style="margin-bottom:20px;">
                <div class="rp-item">
                    <div class="rp-label">📅 Date</div>
                    <div class="rp-value">${aptDate}</div>
                </div>
                <div class="rp-item">
                    <div class="rp-label">🕐 Time Slot</div>
                    <div class="rp-value">${escapeHTML(apt.time)}</div>
                </div>
            </div>

            <p class="rp-section-title">Patient Information</p>
            <div class="rp-grid" style="margin-bottom:20px;">
                <div class="rp-item">
                    <div class="rp-label">👤 Patient Name</div>
                    <div class="rp-value">${escapeHTML(apt.patientName)}</div>
                </div>
                <div class="rp-item">
                    <div class="rp-label">📞 Phone</div>
                    <div class="rp-value">${escapeHTML(apt.patientPhone || '—')}</div>
                </div>
                ${apt.patientEmail ? `
                <div class="rp-item full">
                    <div class="rp-label">📧 Email</div>
                    <div class="rp-value">${escapeHTML(apt.patientEmail)}</div>
                </div>` : ''}
                ${apt.reason ? `
                <div class="rp-item full">
                    <div class="rp-label">📝 Reason for Visit</div>
                    <div class="rp-value">${escapeHTML(apt.reason)}</div>
                </div>` : ''}
            </div>

            <div class="rp-fee-row">
                <span class="rp-fee-label">💰 Consultation Fee</span>
                <span class="rp-fee-amount">₹${apt.fee || '—'}</span>
            </div>

            <div>
                <span class="rp-status-badge">✅ Confirmed &amp; Booked</span>
                ${apt.paymentMethod ? `<span class="rp-status-badge" style="background:#ede9fe;color:#5b21b6;margin-left:8px;">${paymentMethodLabel(apt.paymentMethod)}</span>` : ''}
            </div>

            <div class="rp-grid" style="margin-top:16px;">
                <div class="rp-item full">
                    <div class="rp-label">🗓️ Booked On</div>
                    <div class="rp-value" style="font-weight:600;color:var(--text-muted);font-size:0.88rem;">${bookedOn}</div>
                </div>
            </div>
        </div>
    </div>`;
}
