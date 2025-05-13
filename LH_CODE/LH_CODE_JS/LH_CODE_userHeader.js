import { auth, db } from './LH_CODE_FirebaseConfig.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function updateUserHeader() {
  const header = document.querySelector('.user-section');
  if (!header) return;

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, "Users", user.uid));
      if (userDoc.exists()) {
        header.querySelector('.username').textContent = `Welcome, ${userDoc.data().username}`;
      }
    }
  });
}