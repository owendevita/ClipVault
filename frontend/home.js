const openLoginBtn = document.getElementById('openLogin');
const openSignupBtn = document.getElementById('openSignup');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginMessage = document.getElementById('loginMessage');
const signupMessage = document.getElementById('signupMessage');

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

document.getElementById('submitLogin').addEventListener('click', () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    loginMessage.style.display = 'block';

    if (username === "test" && password === "1234") {
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "message success";

        setTimeout(() => {
            loginModal.style.display = 'none';
            loginMessage.style.display = 'none';
            window.location.href = "index.html";
        }, 1500);

    } else {
        loginMessage.textContent = "Invalid username or password.";
        loginMessage.className = "message error";
    }
});

document.getElementById('submitSignup').addEventListener('click', () => {
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value.trim();

    signupMessage.style.display = 'block';

    if (username && password) {
        signupMessage.textContent = "Sign up successful!";
        signupMessage.className = "message success";

        setTimeout(() => {
            signupModal.style.display = 'none';
            signupMessage.style.display = 'none';
        }, 1500);

    } else {
        signupMessage.textContent = "Please fill out all fields.";
        signupMessage.className = "message error";
    }
});