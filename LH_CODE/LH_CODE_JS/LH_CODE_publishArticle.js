import { db, auth } from './LH_CODE_FirebaseConfig.js';
import { 
  collection, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  getDocs, 
  increment 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Checks whether the Firestore record for the given user exists.
 * Returns true if the document is found, false otherwise.
 */
async function checkUserValidity(userId) {
  try {
    const userQuery = query(collection(db, "Users"), where("user_id", "==", userId));
    const querySnapshot = await getDocs(userQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error validating user:", error);
    return false;
  }
}

/**
 * Fetches the logged-in user's username from Firestore and updates the header.
 */
async function fetchUsername(userId) {
  try {
    const userQuery = query(collection(db, "Users"), where("user_id", "==", userId));
    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
      const username = userSnapshot.docs[0].data().username;
      document.querySelector('.username').textContent = `Welcome, ${username}`;
    } else {
      document.querySelector('.username').textContent = "Welcome, User";
    }
  } catch (error) {
    console.error("Error fetching username:", error);
    document.querySelector('.username').textContent = "Welcome, User";
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Prevent access unless the user is logged in.
  const loggedInUserId = sessionStorage.getItem('loggedInUserId');
  if (!loggedInUserId) {
    window.location.href = 'LH_CODE_LOGIN.html';
    return;
  }
  
  // Check if the user's Firestore record exists.
  const validUser = await checkUserValidity(loggedInUserId);
  if (!validUser) {
    alert("Your account record is not found. Please sign in again.");
    sessionStorage.clear();
    window.location.href = 'LH_CODE_LOGIN.html';
    return;
  }
  
  // Fetch and update the username dynamically from Firestore.
  await fetchUsername(loggedInUserId);
  
  const publishBtn = document.querySelector('.publish-btn');
  const titleField = document.getElementById('articleTitle');
  const bodyField = document.getElementById('articleBody');
  const wordCounter = document.getElementById('wordCounter');
  const articleError = document.getElementById('articleError');
  
  // Get category from localStorage.
  const selectedCategory = localStorage.getItem('selectedCategory');
  
  if (!selectedCategory) {
    showError('publishError', 'No category selected. Please select a category first.');
    publishBtn.disabled = true;
    setTimeout(() => {
      window.location.href = 'LH_CODE_categories.html';
    }, 2000);
    return;
  }

  // Initialize the word counter.
  updateWordCounter();

  // Add event listeners for form updates.
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
      
      // Already validated: get user ID from sessionStorage.
      const userId = loggedInUserId;
      if (!userId) {
        throw new Error('You must be logged in to publish an article');
      }

      // Get the current counter value.
      const counterRef = doc(db, "counters", "postCounter");
      const counterDoc = await getDoc(counterRef);
      
      let postId;
      if (!counterDoc.exists()) {
        // If no counter exists, determine the highest existing post ID.
        const postsRef = collection(db, "Posts");
        const postsSnapshot = await getDocs(postsRef);
        let maxId = 0;
        
        postsSnapshot.forEach((docSnap) => {
          const id = parseInt(docSnap.id);
          if (!isNaN(id) && id > maxId) {
            maxId = id;
          }
        });
        
        postId = (maxId + 1).toString();
        // Initialize the counter with the next ID.
        await setDoc(counterRef, { count: maxId + 1 });
      } else {
        // Increment the counter.
        const currentCount = counterDoc.data().count;
        postId = (currentCount + 1).toString();
        await setDoc(counterRef, { count: currentCount + 1 });
      }

      // Create a new document with the post_id as the document ID.
      const postRef = doc(db, "Posts", postId);
      await setDoc(postRef, {
        post_id: postId,
        title: titleField.value.trim(),
        content: bodyField.value.trim(),
        user_id: userId,
        category_id: selectedCategory,
        created_at: serverTimestamp()
      });

      // Clear form and localStorage.
      titleField.value = '';
      bodyField.value = '';
      localStorage.removeItem('selectedCategory');
      
      // Redirect to the categories page.
      window.location.href = 'LH_CODE_categories.html';

    } catch (error) {
      showError('publishError', error.message || 'Failed to publish article. Please try again.');
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish';
    }
  });

function validateForm() {
    const titleValue = titleField.value.trim();
    const bodyValue = bodyField.value.trim();
    const wordCount = countWords(bodyValue);
    
    // Clear previous errors
    articleError.classList.add('hidden');
    
    if (!titleValue) {
        showError('articleError', 'Title is required');
        return false;
    }

    if (!bodyValue) {
        showError('articleError', 'Body is required');
        return false;
    }

    if (wordCount > 1000) {
        showError('articleError', 'Word limit has been exceeded');
        return false;
    }

    publishBtn.disabled = false;
    return true;
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
