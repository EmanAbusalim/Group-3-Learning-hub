import { db, auth } from './LH_CODE_FirebaseConfig.js';
import { collection, serverTimestamp, doc, getDoc, setDoc, increment, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { cloudinaryConfig, getUploadUrl, prepareUploadData } from './LH_CODE_CloudinaryConfig.js';

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
    const usernameElement = document.querySelector('.username');
    if (!userSnapshot.empty) {
      const username = userSnapshot.docs[0].data().username;
      if (usernameElement) {
        usernameElement.textContent = `Welcome, ${username}`;
      }
    } else {
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

// Initialize elements
const videoInput = document.getElementById('videoInput');
const uploadBtn = document.getElementById('uploadBtn');
const publishBtn = document.getElementById('publishVideoBtn');
const videoSize = document.getElementById('videoSize');
const videoError = document.getElementById('videoError');
const videoTitle = document.getElementById('videoTitle');

// Check if all required elements are found
if (!videoInput || !uploadBtn || !publishBtn || !videoSize || !videoError || !videoTitle) {
  console.error('Required elements not found:', {
    videoInput: !!videoInput,
    uploadBtn: !!uploadBtn,
    publishBtn: !!publishBtn,
    videoSize: !!videoSize,
    videoError: !!videoError,
    videoTitle: !!videoTitle
  });
}

// Initialize with publish button disabled
if (publishBtn) {
  publishBtn.disabled = true;
  console.log('Publish button initialized and disabled');
} else {
  console.error('Publish button not found in DOM');
}

// Click handler for upload button
if (uploadBtn) {
  uploadBtn.addEventListener('click', () => {
    console.log('Upload button clicked');
    if (videoInput) {
      videoInput.click();
    } else {
      console.error('Video input not found');
    }
  });
} else {
  console.error('Upload button not found in DOM');
}

// File selection handler
videoInput.addEventListener('change', () => {
  const file = videoInput.files[0];
  publishBtn.disabled = true; // Reset state on new file selection
  
  if (file) {
    // Check file type
    if (!file.type.includes('mp4')) {
      videoError.textContent = 'Only MP4 files are allowed';
      videoError.classList.remove('hidden');
      videoInput.value = ''; // Clear the invalid file
      videoSize.textContent = '0MB / 100MB';
      return;
    }

    // Check file size
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    videoSize.textContent = `${sizeMB}MB / 100MB`;

    if (file.size > 100 * 1024 * 1024) {
      videoError.textContent = 'File size exceeds 100MB';
      videoError.classList.remove('hidden');
    } else {
      videoError.classList.add('hidden');
      // Enable publish button if title is not empty
      publishBtn.disabled = videoTitle.value.trim() === '';
    }
  } else {
    // No file selected
    videoSize.textContent = '0MB / 100MB';
    videoError.classList.add('hidden');
  }
});

// Title input handler
videoTitle.addEventListener('input', () => {
  // Only enable publish if:
  // 1. A valid file is selected
  // 2. File size is within limits
  // 3. Title is not empty
  if (videoInput.files[0] && 
      videoInput.files[0].size <= 100 * 1024 * 1024) {
    publishBtn.disabled = videoTitle.value.trim() === '';
  }
});

/**
 * Uploads video to Cloudinary and returns the URL
 * @param {File} videoFile - The video file to upload
 * @returns {Promise<{url: string, public_id: string}>} - The URL and public ID of the uploaded video
 */
async function uploadToCloudinary(videoFile) {
  try {
    // Prepare the upload data
    const formData = prepareUploadData(videoFile);
    
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
    content: "",  // No text content for video posts
    user_id: userId,
    category_id: categoryId,
    created_at: serverTimestamp(),
    type: "video",
    media_url: mediaData.url,
    cloudinary_public_id: mediaData.public_id  // Store Cloudinary public ID for future reference
  });
}

// Publish button handler
publishBtn.addEventListener('click', async () => {
  console.log('Publish button clicked');
  console.log('Button disabled state:', publishBtn.disabled);
  
  if (!publishBtn.disabled) {
    const file = videoInput.files[0];
    const title = videoTitle.value.trim();
    
    console.log('File selected:', file);
    console.log('Title:', title);
    
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
      
      console.log('Max post ID found:', maxPostId);
      
      // Generate new post_id
      const newPostId = (maxPostId + 1).toString();
      console.log('New post ID:', newPostId);

      // Upload to Cloudinary
      console.log('Starting Cloudinary upload...');
      const mediaData = await uploadToCloudinary(file);
      console.log('Cloudinary upload complete:', mediaData);

      // Create post in Firebase
      const loggedInUserId = sessionStorage.getItem('loggedInUserId');
      const selectedCategory = localStorage.getItem('selectedCategory');
      console.log('Creating post with:', { loggedInUserId, selectedCategory });
      
      await createPost(newPostId, title, loggedInUserId, selectedCategory, mediaData);
      console.log('Post created successfully');

      alert('Video published successfully!');
      window.location.href = 'LH_CODE_categories.html';
    } catch (error) {
      console.error('Error publishing video:', error);
      videoError.textContent = error.message || 'Failed to publish video. Please try again.';
      videoError.classList.remove('hidden');
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish Video';
    }
  } else {
    console.log('Button is disabled, not proceeding with upload');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  // Double-check validation
  const loggedInUserId = sessionStorage.getItem('loggedInUserId');
  if (!loggedInUserId) {
    window.location.href = 'LH_CODE_LOGIN.html';
    return;
  }

  // No need to re-select publishBtn here, it's already selected above

  // Get category from localStorage
  const selectedCategory = localStorage.getItem('selectedCategory');
  
  if (!selectedCategory) {
    if (publishBtn) publishBtn.disabled = true;
    setTimeout(() => {
      window.location.href = 'LH_CODE_categories.html';
    }, 2000);
    return;
  }

  // ...rest of your video logic...
});