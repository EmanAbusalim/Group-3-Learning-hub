import { db, auth } from './LH_CODE_FirebaseConfig.js';
import { collection, serverTimestamp, doc, getDoc, setDoc, increment, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { cloudinaryConfig, getUploadUrl, prepareUploadData } from './LH_CODE_CloudinaryConfig.js';

// Author: Abuzaid
// Description: Added user authentication check and username display for audio publishing

let mediaRecorder;
let chunks = [];
let startTime;
let recordingInterval;
let totalSeconds = 0; // Track total recording time
let isPaused = false;

/**
 * Uploads audio to Cloudinary and returns the URL
 * @param {Blob} audioBlob - The audio blob to upload
 * @returns {Promise<{url: string, public_id: string}>} - The URL and public ID of the uploaded audio
 */
async function uploadToCloudinary(audioBlob) {
  try {
    // Prepare the upload data
    const formData = prepareUploadData(audioBlob);
    
    // Upload to Cloudinary
    const response = await fetch(getUploadUrl(), {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Failed to upload to Cloudinary: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Cloudinary upload successful:', data);
    return {
      url: data.secure_url,
      public_id: data.public_id
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Creates a post in Firebase with Cloudinary media reference
 * @param {string} postId - The post ID
 * @param {string} title - The post title
 * @param {string} userId - The user ID
 * @param {string} categoryId - The category ID
 * @param {Object} mediaData - The Cloudinary media data
 * @returns {Promise<void>}
 */
async function createPost(postId, title, userId, categoryId, mediaData) {
  const postRef = doc(db, "Posts", postId);
  await setDoc(postRef, {
    post_id: postId,
    title: title,
    content: "",  // No text content for audio posts
    user_id: userId,
    category_id: categoryId,
    created_at: serverTimestamp(),
    type: "audio",
    media_url: mediaData.url,
    cloudinary_public_id: mediaData.public_id  // Store Cloudinary public ID for future reference
  });
}

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
      const usernameElement = document.querySelector('.username');
      if (usernameElement) {
        usernameElement.textContent = `Welcome, ${username}`;
      }
    } else {
      const usernameElement = document.querySelector('.username');
      if (usernameElement) {
        usernameElement.textContent = "Welcome, User";
      }
    }
  } catch (error) {
    console.error("Error fetching username:", error);
    const usernameElement = document.querySelector('.username');
    if (usernameElement) {
      usernameElement.textContent = "Welcome, User";
    }
  }
}

// Run validation immediately when script loads
(async function validateUser() {
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
})();

document.addEventListener('DOMContentLoaded', async () => {
  // Double-check validation
  const loggedInUserId = sessionStorage.getItem('loggedInUserId');
  if (!loggedInUserId) {
    window.location.href = 'LH_CODE_LOGIN.html';
    return;
  }

  const recordBtn = document.getElementById('recordBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const publishBtn = document.getElementById('publishAudioBtn');
  const recordingTime = document.getElementById('recordingTime');
  const audioError = document.getElementById('audioError');
  const audioTitle = document.getElementById('audioTitle');

  // Get category from localStorage
  const selectedCategory = localStorage.getItem('selectedCategory');
  
  if (!selectedCategory) {
    showError('audioError', 'No category selected. Please select a category first.');
    publishBtn.disabled = true;
    setTimeout(() => {
      window.location.href = 'LH_CODE_categories.html';
    }, 2000);
    return;
  }

  recordBtn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      // Resume recording
      mediaRecorder.resume();
      isPaused = false;
      startTimer();
      recordBtn.textContent = 'Recording...';
      return;
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      // Already recording, do nothing
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        clearInterval(recordingInterval);
        const blob = new Blob(chunks, { type: 'audio/wav' });
        // Handle the blob as needed
      };

      mediaRecorder.start();
      startTime = Date.now();
      totalSeconds = 0;
      isPaused = false;
      startTimer();
      recordBtn.textContent = 'Recording...';
    } catch (error) {
      showError('audioError', 'Failed to access microphone. Please check permissions.');
    }
  });

  pauseBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      clearInterval(recordingInterval);
      isPaused = true;
      recordBtn.textContent = 'Continue Recording';
    }
  });

  publishBtn.addEventListener('click', async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      showError('audioError', 'Please record audio first');
      return;
    }

    if (!audioTitle.value.trim()) {
      showError('audioError', 'Please enter a title for your audio');
      return;
    }

    try {
      publishBtn.disabled = true;
      publishBtn.textContent = 'Publishing...';

      // Get all posts to find the highest post_id
      const postsRef = collection(db, "Posts");
      const postsSnapshot = await getDocs(postsRef);
      let maxPostId = 0;
      
      // Find highest existing post_id
      postsSnapshot.forEach((doc) => {
        const postData = doc.data();
        const currentPostId = parseInt(postData.post_id);
        if (!isNaN(currentPostId) && currentPostId > maxPostId) {
          maxPostId = currentPostId;
        }
      });
      
      // Generate new post_id
      const newPostId = (maxPostId + 1).toString();

      // Stop recording and get the audio blob
      return new Promise((resolve, reject) => {
        mediaRecorder.onstop = async () => {
          try {
            const audioBlob = new Blob(chunks, { type: 'audio/wav' });
            console.log('Audio blob created:', audioBlob.size, 'bytes');

            if (audioBlob.size === 0) {
              throw new Error('No audio data recorded');
            }

            // Upload to Cloudinary
            const mediaData = await uploadToCloudinary(audioBlob);

            // Create post in Firebase with Cloudinary reference
            await createPost(
              newPostId,
              audioTitle.value.trim(),
              loggedInUserId,
              selectedCategory,
              mediaData
            );

            // Clear form and localStorage
            audioTitle.value = '';
            chunks = [];
            totalSeconds = 0;
            localStorage.removeItem('selectedCategory');
            
            // Redirect to categories page
            window.location.href = 'LH_CODE_categories.html';
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        // Stop the recording
        mediaRecorder.stop();
        clearInterval(recordingInterval);
      });

    } catch (error) {
      showError('audioError', error.message || 'Failed to publish audio. Please try again.');
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish';
    }
  });

  function startTimer() {
    recordingInterval = setInterval(() => {
      totalSeconds++;
      if (totalSeconds > 300) { // 5 minutes limit
        mediaRecorder.stop();
        clearInterval(recordingInterval);
        showError('audioError', 'Audio exceeds 5 minutes');
        return;
      }
      const minutes = Math.floor(totalSeconds / 60);
      const remainingSeconds = totalSeconds % 60;
      recordingTime.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')} / 5:00`;
    }, 1000);
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
