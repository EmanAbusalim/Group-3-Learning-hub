import { db, auth } from './LH_CODE_FirebaseConfig.js';
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const publishBtn = document.querySelector('.publish-btn');
  const titleField = document.getElementById('articleTitle');
  const bodyField = document.getElementById('articleBody');
  
  titleField.addEventListener('input', validateForm);
  bodyField.addEventListener('input', validateForm);

  publishBtn.addEventListener('click', async () => {
    if (!validateForm()) return;
    
    try {
      await addDoc(collection(db, "Posts"), {
        title: titleField.value,
        content: bodyField.value,
        user_id: auth.currentUser.uid,
        category_id: selectedCategory,
        created_at: new Date(),
        type: 'article'
      });
      window.location.href = 'LH_CODE_categories.html';
    } catch (error) {
      showError('publishError', error.message);
    }
  });

  function validateForm() {
    const validTitle = titleField.value.trim().length > 0;
    const validBody = bodyField.value.trim().split(/\s+/).length <= 1000;
    
    publishBtn.disabled = !(validTitle && validBody);
    return !publishBtn.disabled;
  }
});