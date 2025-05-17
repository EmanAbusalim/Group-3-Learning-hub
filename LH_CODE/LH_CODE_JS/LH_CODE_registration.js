import { auth, db } from './LH_CODE_FirebaseConfig.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  serverTimestamp, 
  runTransaction 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Error display functions
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
        /.{8,}/,      // at least 8 characters
        /[0-9]/,      // at least one number
        /[A-Z]/,      // at least one uppercase letter
        /[^A-Za-z0-9]/ // at least one special character
    ];
    const isValid = requirements.every(r => r.test(password));
    if (!isValid) {
        showError('passwordError', 'Invalid data');
        return false;
    }
    clearError('passwordError');
    return true;
}

// Validate all fields
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

// Generate a unique user_id using a Firestore transaction on the "userCounter"
async function generateNextUserId() {
    const counterDocRef = doc(db, "counters", "userCounter");
    try {
        const newCount = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterDocRef);
            let newCount;
            if (!counterDoc.exists()) {
                // If the counter doesn't exist, initialize it.
                // If you already have 3 users, manually set the count to 3 in Firestore.
                newCount = 1;
                transaction.set(counterDocRef, { count: newCount });
            } else {
                // Increment the existing counter.
                newCount = counterDoc.data().count + 1;
                transaction.update(counterDocRef, { count: newCount });
            }
            return newCount;
        });
        // Format the user_id as "u" followed by a zero-padded number (e.g., u001, u002, ...)
        return `u${newCount.toString().padStart(3, '0')}`;
    } catch (error) {
        console.error("Transaction failed:", error);
        throw error;
    }
}

// Form submission event for registration
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
        
        // Generate a unique user_id for this user
        const userId = await generateNextUserId();
        
        // Save user details in the "Users" collection using the generated ID
        await setDoc(doc(db, "Users", userId), {
            user_id: userId,
            username: usernameField.value.trim(),
            email: emailField.value.trim(),
            password: passwordField.value, // For demo purposes only; use hashing in real-world apps!
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

// Real-time validation event listeners
usernameField.addEventListener('input', () => validateUsername());
emailField.addEventListener('input', () => validateEmail());
passwordField.addEventListener('input', () => validatePassword());