/* ============================================================
   api.js – Central API helper for backend communication
   All fetch() calls to the Node.js backend go through here.

   ── API BASE URL ────────────────────────────────────────────
   Change this ONE constant to switch between local and prod:
   Local dev:   'http://localhost:5000/api'
   Production:  'https://dr-appointment-omby.onrender.com/api'
============================================================ */

const API_BASE = 'https://dr-appointment-omby.onrender.com/api';

/* ── Token Helpers ──────────────────────────────────────── */

function getToken() {
    const session = localStorage.getItem('wf_session');
    return session ? JSON.parse(session).token : null;
}

function authHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

/* ── Generic Request Helper ─────────────────────────────── */

async function apiRequest(method, endpoint, body = null) {
    const options = {
        method,
        headers: authHeaders()
    };
    if (body) options.body = JSON.stringify(body);

    const res  = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
}

/* ══════════════════════════════════════════════════════════
   AUTH API
══════════════════════════════════════════════════════════ */

const AuthAPI = {
    register: (userData) => apiRequest('POST', '/auth/register', userData),
    login:    (credentials) => apiRequest('POST', '/auth/login', credentials),
    me:       () => apiRequest('GET', '/auth/me')
};

/* ══════════════════════════════════════════════════════════
   DOCTORS API
══════════════════════════════════════════════════════════ */

const DoctorsAPI = {
    getAll:    (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest('GET', `/doctors${query ? '?' + query : ''}`);
    },
    getOne:    (id)      => apiRequest('GET',    `/doctors/${id}`),
    create:    (data)    => apiRequest('POST',   '/doctors', data),
    update:    (id, data) => apiRequest('PUT',   `/doctors/${id}`, data),
    delete:    (id)      => apiRequest('DELETE', `/doctors/${id}`)
};

/* ══════════════════════════════════════════════════════════
   APPOINTMENTS API
══════════════════════════════════════════════════════════ */

const AppointmentsAPI = {
    book:        (data)          => apiRequest('POST',   '/appointments', data),
    myBookings:  ()              => apiRequest('GET',    '/appointments/my'),
    byDoctor:    (doctorId)      => apiRequest('GET',    `/appointments/doctor/${doctorId}`),
    updateStatus:(id, status)    => apiRequest('PATCH',  `/appointments/${id}/status`, { status }),
    rate:        (id, rating, note) => apiRequest('PATCH', `/appointments/${id}/rate`, { rating, ratingNote: note }),
    delete:      (id)            => apiRequest('DELETE', `/appointments/${id}`)
};

/* ══════════════════════════════════════════════════════════
   ADMIN API
══════════════════════════════════════════════════════════ */

const AdminAPI = {
    stats:           ()       => apiRequest('GET',    '/admin/stats'),
    appointments:    (params) => {
        const query = new URLSearchParams(params || {}).toString();
        return apiRequest('GET', `/admin/appointments${query ? '?' + query : ''}`);
    },
    clearAllApts:    ()       => apiRequest('DELETE', '/admin/appointments/all'),
    patients:        (params) => {
        const query = new URLSearchParams(params || {}).toString();
        return apiRequest('GET', `/admin/patients${query ? '?' + query : ''}`);
    }
};

/* ══════════════════════════════════════════════════════════
   REVIEWS API
══════════════════════════════════════════════════════════ */

const ReviewsAPI = {
    byDoctor: (doctorId)              => apiRequest('GET',  `/reviews/doctor/${doctorId}`),
    submit:   (appointmentId, rating, note) =>
        apiRequest('POST', '/reviews', { appointmentId, rating, note })
};

/* ══════════════════════════════════════════════════════════
   PRESCRIPTIONS API
══════════════════════════════════════════════════════════ */

const PrescriptionsAPI = {
    get:  (appointmentId)                        => apiRequest('GET',  `/prescriptions/${appointmentId}`),
    save: (appointmentId, notes, medicines, followUpDate) =>
        apiRequest('POST', '/prescriptions', { appointmentId, notes, medicines, followUpDate })
};

/* ══════════════════════════════════════════════════════════
   MEDICAL HISTORY API
══════════════════════════════════════════════════════════ */

const MedicalHistoryAPI = {
    getMine:        ()       => apiRequest('GET', '/medical-history/me'),
    saveMine:       (data)   => apiRequest('PUT', '/medical-history/me', data),
    getByPatient:   (userId) => apiRequest('GET', `/medical-history/patient/${userId}`)
};

/* ══════════════════════════════════════════════════════════
   AI CHATBOT API
══════════════════════════════════════════════════════════ */

const ChatAPI = {
    sendMessage: (messages) => apiRequest('POST', '/chat', { messages }),
    getStatus:   ()         => apiRequest('GET', '/chat/status')
};

