import { db, auth } from './LH_CODE_FirebaseConfig.js';
import { collection, serverTimestamp, doc, getDoc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Author: Abuzaid
// Description: Fixed counter increment logic to properly generate sequential post IDs

document.addEventListener('DOMContentLoaded', () => {
  const publishBtn = document.querySelector('.publish-btn');
  const titleField = document.getElementById('articleTitle');
  const bodyField = document.getElementById('articleBody');
  const wordCounter = document.getElementById('wordCounter');
  const articleError = document.getElementById('articleError');
  
  // Get category from localStorage
  const selectedCategory = localStorage.getItem('selectedCategory');
  
  if (!selectedCategory) {
    showError('publishError', 'No category selected. Please select a category first.');
    publishBtn.disabled = true;
    setTimeout(() => {
      window.location.href = 'LH_CODE_categories.html';
    }, 2000);
    return;
  }

  // Initialize word counter
  updateWordCounter();

  titleField.addEventListener('input', validateForm);
  bodyField.addEventListener('input', () => {
    updateWordCounter();
    validateForm();
  });

  publishBtn.addEventListener('click', async () => {
    if (!validateForm()) return;
    
    try {
      publishBtn.disabled = true;
      publishBtn.textContent = 'Publishing...';
      
      // Get user ID from sessionStorage
      const userId = sessionStorage.getItem('loggedInUserId');
      if (!userId) {
        throw new Error('You must be logged in to publish an article');
      }

      // Get the current counter value
      const counterRef = doc(db, "counters", "postCounter");
      const counterDoc = await getDoc(counterRef);
      
      let postId;
      if (!counterDoc.exists()) {
        // If no counter exists, check the highest existing post ID
        const postsRef = collection(db, "Posts");
        const postsSnapshot = await getDocs(postsRef);
        let maxId = 0;
        
        postsSnapshot.forEach((doc) => {
          const id = parseInt(doc.id);
          if (!isNaN(id) && id > maxId) {
            maxId = id;
          }
        });
        
        postId = (maxId + 1).toString();
        // Initialize the counter with the next ID
        await setDoc(counterRef, { count: maxId + 1 });
      } else {
        // Get the current count and increment it
        const currentCount = counterDoc.data().count;
        postId = (currentCount + 1).toString();
        // Update the counter
        await setDoc(counterRef, { count: currentCount + 1 });
      }

      // Create a new document with the post_id as the document ID
      const postRef = doc(db, "Posts", postId);
      await setDoc(postRef, {
        post_id: postId,
        title: titleField.value.trim(),
        content: bodyField.value.trim(),
        user_id: userId,
        category_id: selectedCategory,
        created_at: serverTimestamp()
      });

      // Clear form and localStorage
      titleField.value = '';
      bodyField.value = '';
      localStorage.removeItem('selectedCategory');
      
      // Redirect to categories page
      window.location.href = 'LH_CODE_categories.html';

    } catch (error) {
      showError('publishError', error.message || 'Failed to publish article. Please try again.');
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish';
    }
  });

  function validateForm() {
    const validTitle = titleField.value.trim().length > 0;
    const wordCount = countWords(bodyField.value);
    const validBody = wordCount <= 1000;
    
    if (wordCount > 1000) {
      articleError.classList.remove('hidden');
    } else {
      articleError.classList.add('hidden');
    }
    
    publishBtn.disabled = !(validTitle && validBody);
    return !publishBtn.disabled;
  }

  function countWords(text) {
    const words = text.trim().split(/\s+/);
    return words.filter(word => word.length > 0).length;
  }

  function updateWordCounter() {
    const wordCount = countWords(bodyField.value);
    wordCounter.textContent = `${wordCount}/1000 words`;
    
    if (wordCount > 1000) {
      wordCounter.style.color = 'red';
      articleError.classList.remove('hidden');
    } else {
      wordCounter.style.color = '#555';
      articleError.classList.add('hidden');
    }
  }

  function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    } else {
      const newErrorElement = document.createElement('p');
      newErrorElement.id = elementId;
      newErrorElement.className = 'error';
      newErrorElement.textContent = message;
      document.querySelector('main').insertBefore(newErrorElement, document.querySelector('.button-row'));
    }
  }
});