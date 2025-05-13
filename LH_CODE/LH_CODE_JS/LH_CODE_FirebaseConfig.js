import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyADjqERARwtsHhv8UBiV8vmeGqE2w2E3wI",
  authDomain: "learning-hub-fbc39.firebaseapp.com",
  projectId: "learning-hub-fbc39",
  storageBucket: "learning-hub-fbc39.appspot.com",
  messagingSenderId: "924547313465",
  appId: "1:924547313465:web:6747181dae53c2c52942e8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };