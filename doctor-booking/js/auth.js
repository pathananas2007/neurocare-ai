/* ============================================================
   auth.js – API-backed Authentication
   All data goes to MongoDB via the Express backend.
   LocalStorage is only used for session (JWT token + user info).
   ============================================================ */

// ── API base URL ────────────────────────────────────────────
// Change this ONE line to switch between local dev and production.
// Local:      'http://localhost:5000/api'
// Production: 'https://dr-appointment-omby.onrender.com/api'
const API_BASE    = 'https://dr-appointment-omby.onrender.com/api';
const SESSION_KEY = 'wf_session';

/* ══════════════════════════════════════════════════════════
   API HELPER
══════════════════════════════════════════════════════════ */

/**
 * Central fetch wrapper.
 * Automatically attaches JWT token and parses JSON.
 * Returns { ok, data, message } — never throws.
 */
async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res  = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        const json = await res.json();
        return { ok: res.ok, status: res.status, data: json.data, message: json.message || '' };
    } catch (err) {
        return { ok: false, status: 0, data: null, message: 'Cannot connect to server. Make sure the backend is running on http://localhost:5000' };
    }
}

/* ══════════════════════════════════════════════════════════
   SESSION HELPERS
══════════════════════════════════════════════════════════ */

function getToken() {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session).token : null;
}

function getLoggedInUser() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    const data = JSON.parse(session);
    // Return user without token field for safety
    const { token: _t, ...user } = data;
    return user;
}

function setSession(userData) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

/* ══════════════════════════════════════════════════════════
   TOAST UTILITY (shared across pages)
══════════════════════════════════════════════════════════ */

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = '';
    const icon = document.createElement('span');
    icon.textContent = type === 'success' ? '✅' : '❌';
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(icon);
    toast.appendChild(text);
    toast.className = `toast show ${type === 'success' ? 'success-toast' : 'error-toast'}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ══════════════════════════════════════════════════════════
   NAV UPDATE
══════════════════════════════════════════════════════════ */

function updateNavForAuth() {
    const user    = getLoggedInUser();
    const authItem = document.getElementById('nav-auth-item');
    const authBtn  = document.getElementById('nav-auth-btn');
    if (!authItem || !authBtn) return;

    // Hide Admin nav link for non-admins
    const adminNavItem = document.getElementById('nav-admin-item');
    if (adminNavItem) {
        adminNavItem.style.display = (user && user.role === 'admin') ? '' : 'none';
    }

    if (user) {
        authBtn.textContent = `👤 ${user.name.split(' ')[0]}`;
        authBtn.href        = '#';
        authBtn.classList.add('btn', 'btn-outline', 'btn-sm');
        authBtn.classList.remove('btn-primary');

        // Role-based dashboard link
        if (!document.getElementById('dashboardNavItem')) {
            const dashLi   = document.createElement('li');
            dashLi.id      = 'dashboardNavItem';
            const dashLink = document.createElement('a');
            if (user.role === 'doctor') {
                dashLink.href        = 'doctor-dashboard.html';
                dashLink.textContent = '🩺 My Dashboard';
            } else if (user.role === 'admin') {
                dashLink.href        = 'admin.html';
                dashLink.textContent = '🛡️ Admin';
            }
            if (dashLink.href) {
                dashLi.appendChild(dashLink);
                authItem.insertAdjacentElement('beforebegin', dashLi);
            }
        }

        // Logout button
        if (!document.getElementById('logoutBtn')) {
            const logoutLi  = document.createElement('li');
            const logoutBtn = document.createElement('button');
            logoutBtn.id            = 'logoutBtn';
            logoutBtn.textContent   = 'Logout';
            logoutBtn.className     = 'btn btn-sm';
            logoutBtn.style.cssText = 'background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid #fecaca;';
            logoutBtn.onclick       = handleLogout;
            logoutLi.appendChild(logoutBtn);
            authItem.insertAdjacentElement('afterend', logoutLi);
        }
    } else {
        authBtn.textContent = 'Login';
        authBtn.href        = 'login.html';
        authBtn.className   = 'btn btn-primary btn-sm';
        document.getElementById('logoutBtn')?.parentElement?.remove();
        document.getElementById('dashboardNavItem')?.remove();
    }

    // Hamburger toggle
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
    }
}

function handleLogout() {
    clearSession();
    showToast('Logged out successfully!', 'success');
    setTimeout(() => window.location.href = 'index.html', 900);
}

/* ══════════════════════════════════════════════════════════
   VALIDATION HELPERS
══════════════════════════════════════════════════════════ */

function clearErrors(ids) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
}

function showError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^\d{10}$/.test(phone.trim());
}

/* ══════════════════════════════════════════════════════════
   LOGIN HANDLER  (called from login pages)
══════════════════════════════════════════════════════════ */

async function handleLogin(e) {
    e.preventDefault();
    clearErrors(['login-err-email', 'login-err-pw']);

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    let valid      = true;

    if (!email || !isValidEmail(email)) { showError('login-err-email', 'Please enter a valid email address.'); valid = false; }
    if (!password)                       { showError('login-err-pw',    'Password is required.');               valid = false; }
    if (!valid) return;

    const btn = document.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Logging in…'; }

    const { ok, data, message } = await apiCall('/auth/login', {
        method: 'POST',
        body:   JSON.stringify({ email, password })
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Login →'; }

    if (!ok) {
        showError('login-err-pw', message || 'Incorrect email or password.');
        return;
    }

    setSession(data);
    showToast(`Welcome back, ${data.name.split(' ')[0]}! 🎉`, 'success');
    setTimeout(() => {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
        window.location.href = redirect;
    }, 900);
}

/* ══════════════════════════════════════════════════════════
   SIGNUP HANDLER  (called from login pages)
══════════════════════════════════════════════════════════ */

async function handleSignup(e) {
    e.preventDefault();
    clearErrors(['signup-err-name', 'signup-err-email', 'signup-err-pw', 'signup-err-phone']);

    const name     = document.getElementById('signupName').value.trim();
    const email    = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const phone    = document.getElementById('signupPhone').value.trim();
    let valid      = true;

    if (!name || name.length < 2)       { showError('signup-err-name',  'Enter your full name (min 2 chars).'); valid = false; }
    if (!email || !isValidEmail(email)) { showError('signup-err-email', 'Enter a valid email address.');         valid = false; }
    if (!password || password.length<6) { showError('signup-err-pw',    'Password must be at least 6 chars.');  valid = false; }
    if (!phone || !isValidPhone(phone)) { showError('signup-err-phone', 'Enter a valid 10-digit phone number.'); valid = false; }
    if (!valid) return;

    const btn = document.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

    const { ok, data, message } = await apiCall('/auth/register', {
        method: 'POST',
        body:   JSON.stringify({ name, email, password, phone })
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }

    if (!ok) {
        showError('signup-err-email', message || 'Registration failed. Please try again.');
        return;
    }

    setSession(data);
    showToast(`Account created! Welcome, ${data.name.split(' ')[0]}! 🚀`, 'success');
    setTimeout(() => {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
        window.location.href = redirect;
    }, 900);
}
