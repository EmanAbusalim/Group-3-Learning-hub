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
  increment,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { cloudinaryConfig, getUploadUrl, prepareUploadData } from './LH_CODE_CloudinaryConfig.js';

// DOM Elements
const videoInput = document.getElementById('videoInput');
const uploadButton = document.getElementById('uploadBtn');
const publishButton = document.getElementById('publishVideoBtn');
const videoSizeDisplay = document.getElementById('videoSize');
const videoTitleInput = document.getElementById('videoTitle');
const errorDisplay = document.getElementById('videoError');
const usernameDisplay = document.querySelector('.username');

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Verify User Authentication
    const userId = sessionStorage.getItem('loggedInUserId');
    if (!userId) {
      redirectToLogin();
      return;
    }

    // 2. Check if user exists in Firestore
    const userQuery = query(collection(db, "Users"), where("user_id", "==", userId));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      sessionStorage.clear();
      redirectToLogin();
      return;
    }

    // 3. Display username
    const username = userSnapshot.docs[0].data().username;
    usernameDisplay.textContent = `Welcome, ${username}`;

    // 4. Check if category is selected
    const selectedCategory = localStorage.getItem('selectedCategory');
    if (!selectedCategory) {
      showError('No category selected. Please select a category first.');
      setTimeout(() => window.location.href = 'LH_CODE_categories.html', 2000);
      return;
    }

    // 5. Setup event listeners
    setupEventListeners();

  } catch (error) {
    console.error("Initialization error:", error);
    showError('Failed to initialize. Please refresh the page.');
  }
});

function setupEventListeners() {
  uploadButton.addEventListener('click', () => videoInput.click());
  
  videoInput.addEventListener('change', () => {
    const file = videoInput.files[0];
    clearError();

    if (!file) {
      videoSizeDisplay.textContent = '0MB / 100MB';
      return;
    }

    // Validate file type and size
    if (!file.type.includes('mp4')) {
      showError('Only MP4 files are allowed');
      videoInput.value = '';
      videoSizeDisplay.textContent = '0MB / 100MB';
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showError('File size exceeds 100MB');
      return;
    }

    // Update file size display
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    videoSizeDisplay.textContent = `${sizeMB}MB / 100MB`;
  });

  publishButton.addEventListener('click', handlePublish);
}

async function handlePublish() {
  try {
    // Validate inputs
    if (!validatePublish()) return;

    publishButton.disabled = true;
    publishButton.textContent = 'Publishing...';

    // Get next post ID (WITH TRANSACTION)
    const postId = await getNextPostId();

    // Upload to Cloudinary
    const file = videoInput.files[0];
    const formData = prepareUploadData(file);
    const response = await fetch(getUploadUrl(), {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Cloudinary upload failed');
    const mediaData = await response.json();

    // Create post in Firestore
    await createVideoPost(
      postId,
      videoTitleInput.value.trim(),
      sessionStorage.getItem('loggedInUserId'),
      localStorage.getItem('selectedCategory'),
      mediaData,
      file.size
    );

    // Clean up and redirect
    cleanupAfterPublish();
    window.location.href = 'LH_CODE_categories.html';

  } catch (error) {
    console.error("Publish error:", error);
    showError(error.message || 'Publishing failed. Please try again.');
    publishButton.disabled = false;
    publishButton.textContent = 'Publish Video';
  }
}

// ==================== CORE FIX: PROPER COUNTER HANDLING ====================
async function getNextPostId() {
  const counterRef = doc(db, "counters", "postCounter");
  
  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    
    if (!counterDoc.exists()) {
      // Initialize counter if it doesn't exist
      const postsSnapshot = await getDocs(collection(db, "Posts"));
      let maxId = 0;
      
      postsSnapshot.forEach(doc => {
        const id = parseInt(doc.id);
        if (!isNaN(id) && id > maxId) maxId = id;
      });
      
      const newId = (maxId + 1).toString();
      transaction.set(counterRef, { count: maxId + 1 });
      return newId;
    } else {
      // Increment existing counter
      const newId = (counterDoc.data().count + 1).toString();
      transaction.update(counterRef, { count: increment(1) });
      return newId;
    }
  });
}

async function createVideoPost(postId, title, userId, categoryId, mediaData, fileSize) {
  const postRef = doc(db, "Posts", postId);
  await setDoc(postRef, {
    post_id: postId,
    title: title,
    content: "",
    user_id: userId,
    category_id: categoryId,
    created_at: serverTimestamp(),
    type: "video",
    media_url: mediaData.secure_url,
    cloudinary_public_id: mediaData.public_id,
    file_size: fileSize
  });
}

function validatePublish() {
  const file = videoInput.files[0];
  const title = videoTitleInput.value.trim();
  let isValid = true;

  if (!file) {
    showError('Please upload a video');
    isValid = false;
  }

  if (!title) {
    showError('Please add a title');
    isValid = false;
  }

  if (file && !file.type.includes('mp4')) {
    showError('Only MP4 files are allowed');
    isValid = false;
  }

  if (file && file.size > 100 * 1024 * 1024) {
    showError('File size exceeds 100MB');
    isValid = false;
  }

  return isValid;
}

function cleanupAfterPublish() {
  videoInput.value = '';
  videoTitleInput.value = '';
  videoSizeDisplay.textContent = '0MB / 100MB';
  localStorage.removeItem('selectedCategory');
}

function showError(message) {
  errorDisplay.textContent = message;
  errorDisplay.classList.remove('hidden');
}

function clearError() {
  errorDisplay.textContent = '';
  errorDisplay.classList.add('hidden');
}

function redirectToLogin() {
  window.location.href = 'LH_CODE_LOGIN.html';
}
