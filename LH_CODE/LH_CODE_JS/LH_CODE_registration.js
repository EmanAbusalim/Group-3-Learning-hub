import { auth, db } from './LH_CODE_FirebaseConfig.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDocs, collection, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM Elements
const form = document.getElementById('registrationForm');
const passwordField = document.getElementById('password');
const infoBubble = document.getElementById('infoBubble');
const usernameField = document.getElementById('username');
const emailField = document.getElementById('email');
const registerBtn = document.getElementById('registerBtn');

// Show/hide password info bubble
passwordField.addEventListener('focus', () => infoBubble.style.display = 'block');
passwordField.addEventListener('blur', () => infoBubble.style.display = 'none');

// Error display
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.add('visible');
    const container = document.getElementById(elementId.replace('Error', 'Container'));
    if (container) container.classList.add('invalid');
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.classList.remove('visible');
    }
    const container = document.getElementById(elementId.replace('Error', 'Container'));
    if (container) container.classList.remove('invalid');
}

// Username validation
async function validateUsername() {
    const username = usernameField.value.trim();
    const regex = /^[a-zA-Z0-9]{4,20}$/;
    if (!username || !regex.test(username)) {
        showError('usernameError', 'Invalid data');
        return false;
    }
    try {
        const snapshot = await getDocs(query(collection(db, "Users"), where("username", "==", username)));
        if (!snapshot.empty) {
            showError('usernameError', 'Invalid data');
            return false;
        }
    } catch {
        showError('usernameError', 'Invalid data');
        return false;
    }
    clearError('usernameError');
    return true;
}

// Email validation
async function validateEmail() {
    const email = emailField.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        showError('emailError', 'Invalid data');
        return false;
    }
    try {
        const snapshot = await getDocs(query(collection(db, "Users"), where("email", "==", email)));
        if (!snapshot.empty) {
            showError('emailError', 'Invalid data');
            return false;
        }
    } catch {
        showError('emailError', 'Invalid data');
        return false;
    }
    clearError('emailError');
    return true;
}

// Password validation
function validatePassword() {
    const password = passwordField.value;
    const requirements = [
        /.{8,}/, /[0-9]/, /[A-Z]/, /[^A-Za-z0-9]/
    ];
    const isValid = requirements.every(r => r.test(password));
    if (!isValid) {
        showError('passwordError', 'Invalid data');
        return false;
    }
    clearError('passwordError');
    return true;
}

// Validate all
async function validateAll() {
    clearError('usernameError');
    clearError('emailError');
    clearError('passwordError');
    clearError('formError');
    const validations = [
        await validateUsername(),
        await validateEmail(),
        validatePassword()
    ];
    return validations.every(v => v);
}

// Generate next user_id (u001 → u002 etc.)
async function generateNextUserId() {
    const snapshot = await getDocs(collection(db, "Users"));
    let maxId = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        const id = data.user_id;
        if (id && id.startsWith('u')) {
            const num = parseInt(id.substring(1));
            if (!isNaN(num) && num > maxId) {
                maxId = num;
            }
        }
    });
    const nextId = maxId + 1;
    return `u${nextId.toString().padStart(3, '0')}`;
}

// Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="spinner"></span> Registering...';

    if (!(await validateAll())) {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register';
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            emailField.value.trim(), 
            passwordField.value
        );

        const userId = await generateNextUserId();

        await setDoc(doc(db, "Users", userId), {
            user_id: userId,
            username: usernameField.value.trim(),
            email: emailField.value.trim(),
            password: passwordField.value, // plain text (dummy only)
            role: 'user',
            created_at: serverTimestamp()
        });

        showError('formError', 'Registration successful! Redirecting...');
        document.getElementById('formError').style.color = 'green';
        setTimeout(() => {
            window.location.href = '../LH_CODE_HTML/LH_CODE_login.html';
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        showError('formError', 'Registration failed. Try again.');
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register';
    }
});

// Real-time validation
usernameField.addEventListener('input', () => validateUsername());
emailField.addEventListener('input', () => validateEmail());
passwordField.addEventListener('input', () => validatePassword());
