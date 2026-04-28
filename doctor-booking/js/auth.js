/* ============================================================
   auth.js – LocalStorage-based Authentication
   ============================================================ */

const USERS_KEY       = 'wf_users';
const SESSION_KEY     = 'wf_session';

/* ── Helpers ── */

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getLoggedInUser() {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
}

function setSession(user) {
    // Don't store password in session
    const { password: _pw, ...safeUser } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

/* ── Toast Utility (shared across pages) ── */

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
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

/* ── Nav Update ── */

function updateNavForAuth() {
    const user       = getLoggedInUser();
    const authItem   = document.getElementById('nav-auth-item');
    const authBtn    = document.getElementById('nav-auth-btn');
    if (!authItem || !authBtn) return;

    if (user) {
        authBtn.textContent  = `👤 ${user.name.split(' ')[0]}`;
        authBtn.href         = '#';
        authBtn.classList.add('btn', 'btn-outline', 'btn-sm');
        authBtn.classList.remove('btn-primary');

        // Add logout button
        const existing = document.getElementById('logoutBtn');
        if (!existing) {
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
        const existing = document.getElementById('logoutBtn');
        if (existing) existing.parentElement.remove();
    }

    // Hamburger toggle
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }
}

function handleLogout() {
    clearSession();
    showToast('Logged out successfully!', 'success');
    setTimeout(() => window.location.href = 'index.html', 900);
}

/* ── Validation Helpers ── */

function clearErrors(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
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

/* ── Login Handler ── */

function handleLogin(e) {
    e.preventDefault();
    clearErrors(['login-err-email', 'login-err-pw']);

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    let valid      = true;

    if (!email || !isValidEmail(email)) {
        showError('login-err-email', 'Please enter a valid email address.');
        valid = false;
    }
    if (!password) {
        showError('login-err-pw', 'Password is required.');
        valid = false;
    }
    if (!valid) return;

    const users    = getUsers();
    const found    = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (!found) {
        showError('login-err-pw', 'Incorrect email or password. Please try again.');
        return;
    }

    setSession(found);
    showToast(`Welcome back, ${found.name.split(' ')[0]}! 🎉`, 'success');
    setTimeout(() => {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
        window.location.href = redirect;
    }, 900);
}

/* ── Signup Handler ── */

function handleSignup(e) {
    e.preventDefault();
    clearErrors(['signup-err-name', 'signup-err-email', 'signup-err-pw', 'signup-err-phone']);

    const name     = document.getElementById('signupName').value.trim();
    const email    = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const phone    = document.getElementById('signupPhone').value.trim();
    let valid      = true;

    if (!name || name.length < 2) {
        showError('signup-err-name', 'Please enter your full name (min 2 chars).');
        valid = false;
    }
    if (!email || !isValidEmail(email)) {
        showError('signup-err-email', 'Please enter a valid email address.');
        valid = false;
    }
    if (!password || password.length < 6) {
        showError('signup-err-pw', 'Password must be at least 6 characters.');
        valid = false;
    }
    if (!phone || !isValidPhone(phone)) {
        showError('signup-err-phone', 'Enter a valid 10-digit phone number.');
        valid = false;
    }
    if (!valid) return;

    const users    = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        showError('signup-err-email', 'An account with this email already exists.');
        return;
    }

    const newUser = {
        id:        Date.now().toString(),
        name,
        email,
        password,   // In a real app, NEVER store plain passwords
        phone,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    setSession(newUser);
    showToast(`Account created! Welcome, ${name.split(' ')[0]}! 🚀`, 'success');
    setTimeout(() => {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
        window.location.href = redirect;
    }, 900);
}
