const openLoginBtn = document.getElementById('openLogin');
const openSignupBtn = document.getElementById('openSignup');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginMessage = document.getElementById('loginMessage');
const signupMessage = document.getElementById('signupMessage');

const API_BASE = 'http://127.0.0.1:8000';

function formEncode(data) {
    return Object.keys(data)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k]))
        .join('&');
}

openLoginBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
});
openSignupBtn.addEventListener('click', () => {
    signupModal.style.display = 'flex';
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
        loginMessage.style.display = 'none';
    }
    if (e.target === signupModal) {
        signupModal.style.display = 'none';
        signupMessage.style.display = 'none';
    }
});

document.getElementById('submitLogin').addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    loginMessage.style.display = 'block';
    loginMessage.className = 'message';

    if (!username || !password) {
        loginMessage.textContent = 'Please enter username and password.';
        loginMessage.className = 'message error';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formEncode({ username, password })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            loginMessage.textContent = err.detail || 'Invalid username or password.';
            loginMessage.className = 'message error';
            return;
        }

        const data = await res.json();
        const token = data.access_token;
        if (token) {
            // store token for later API calls
            localStorage.setItem('clipvault_token', token);
            loginMessage.textContent = 'Login successful!';
            loginMessage.className = 'message success';
            setTimeout(() => {
                loginModal.style.display = 'none';
                loginMessage.style.display = 'none';
                // go to main page
                window.location.href = 'main.html';
            }, 1000);
        } else {
            loginMessage.textContent = 'Login succeeded but no token returned.';
            loginMessage.className = 'message error';
        }
    } catch (err) {
        console.error(err);
        loginMessage.textContent = 'Network error. Is the backend running?';
        loginMessage.className = 'message error';
    }
});

document.getElementById('submitSignup').addEventListener('click', async () => {
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value.trim();

    signupMessage.style.display = 'block';
    signupMessage.className = 'message';

    if (!username || !password) {
        signupMessage.textContent = 'Please fill out all fields.';
        signupMessage.className = 'message error';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formEncode({ username, password })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            signupMessage.textContent = err.detail || 'Sign up failed';
            signupMessage.className = 'message error';
            return;
        }

        signupMessage.textContent = 'Sign up successful!';
        signupMessage.className = 'message success';
        setTimeout(() => {
            signupModal.style.display = 'none';
            signupMessage.style.display = 'none';
        }, 1500);
    } catch (err) {
        console.error(err);
        signupMessage.textContent = 'Network error. Is the backend running?';
        signupMessage.className = 'message error';
    }
});