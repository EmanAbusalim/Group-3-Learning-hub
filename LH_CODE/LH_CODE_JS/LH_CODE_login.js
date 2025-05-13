import { auth, db } from './LH_CODE_FirebaseConfig.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM elements
const form = document.querySelector('form');
const emailInput = document.querySelector('input[type="email"]');
const passwordInput = document.querySelector('input[type="password"]');
const errorSpans = document.querySelectorAll('.text-danger');
const signInButton = document.querySelector('.btn-login');

// Helper
function showError(index, message) {
    errorSpans[index].textContent = message;
    errorSpans[index].style.color = 'red';
}
function clearErrors() {
    errorSpans.forEach(span => span.textContent = '');
}

// Login form submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    signInButton.disabled = true;
    signInButton.innerHTML = '<span class="spinner"></span> Signing in...';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        // Sign in via Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // OPTIONAL: Verify against Firestore "Users" collection
        const q = query(collection(db, "Users"), where("email", "==", email));
        const snapshot = await getDocs(q);
        let matched = false;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.password === password) {
                matched = true;
            }
        });

        if (!matched) {
            showError(1, "Invalid email or password");
            signInButton.disabled = false;
            signInButton.textContent = 'Sign In';
            return;
        }

        // Redirect
        window.location.href = 'LH_CODE_Index.html'; 


    } catch (err) {
        showError(1, "Invalid email or password");
        console.error('Login failed:', err);
    } finally {
        signInButton.disabled = false;
        signInButton.textContent = 'Sign In';
    }
});
