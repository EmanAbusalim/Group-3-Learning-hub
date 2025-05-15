import { auth, db } from '../LH_CODE_JS/LH_CODE_FirebaseConfig.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM elements
const form = document.querySelector('form');
const emailInput = document.querySelector('input[type="email"]');
const passwordInput = document.querySelector('input[type="password"]');
const errorSpans = document.querySelectorAll('.text-danger');
const signInButton = document.querySelector('.btn-login');

// Helper functions
function showError(index, message) {
  errorSpans[index].textContent = message;
  errorSpans[index].style.color = 'red';
}

function clearErrors() {
  errorSpans.forEach(span => span.textContent = '');
}

// Login form submit logic
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  signInButton.disabled = true;
  signInButton.innerHTML = '<span class="spinner"></span> Signing in...';

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    // Sign in using Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Retrieve user details from Firestore
    const q = query(collection(db, "Users"), where("email", "==", email));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      sessionStorage.setItem("loggedInUserId", userData.user_id);
      sessionStorage.setItem("userRole", userData.role); // Save the user's role
      console.log("Session stored user:", sessionStorage.getItem("loggedInUserId"));

      // Redirect based on role
      if (userData.role === "admin") { 
        window.location.href = window.location.origin + "/LH_CODE_HTML/LH_CODE_AdminHome.html";
      } else {
        window.location.href = window.location.origin + "/LH_CODE_HTML/LH_CODE_Index.html";
      }
    } else {
      console.error("User not found in Firestore.");
      showError(1, "Error fetching user data.");
      signInButton.disabled = false;
      signInButton.textContent = 'Sign In';
      return;
    }
  } catch (err) {
    showError(1, "Invalid credentials");
    console.error('Login failed:', err);
  } finally {
    signInButton.disabled = false;
    signInButton.textContent = 'Sign In';
  }
});
