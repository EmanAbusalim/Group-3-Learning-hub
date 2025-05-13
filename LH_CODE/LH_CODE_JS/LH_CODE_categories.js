import { db, auth } from './LH_CODE_FirebaseConfig.js';
import { collection, query, where, getDocs, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const followBtn = document.querySelector('.follow-btn');
  const categorySelect = document.getElementById('categorySelect');
  
  // Load followed categories
  loadFollowedCategories();

  followBtn.addEventListener('click', async () => {
    const categoryId = categorySelect.value;
    const docId = `${auth.currentUser.uid}_${categoryId}`;
    
    if (followBtn.textContent === 'Follow') {
      await addDoc(collection(db, "UserCategory"), {
        user_id: auth.currentUser.uid,
        category_id: categoryId,
        created_at: new Date()
      });
    } else {
      await deleteDoc(doc(db, "UserCategory", docId));
    }
    toggleFollowButton();
  });

  async function loadFollowedCategories() {
    const q = query(collection(db, "UserCategory"), 
      where("user_id", "==", auth.currentUser.uid));
    
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      const option = categorySelect.querySelector(`option[value="${doc.data().category_id}"]`);
      if (option) option.selected = true;
    });
  }
});