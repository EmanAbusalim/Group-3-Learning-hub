import { db, auth } from './LH_CODE_FirebaseConfig.js';
import { collection, serverTimestamp, doc, getDoc, setDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { cloudinaryConfig, getUploadUrl, prepareUploadData } from './LH_CODE_CloudinaryConfig.js';

// Helper function to show errors
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  
  if (!errorElement) {
    console.error(`Error element ${elementId} not found!`);
    return;
  }

  errorElement.textContent = message;
  errorElement.style.display = 'block'; // Ensure visibility
  errorElement.classList.remove('hidden'); // Remove hidden class


  errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Checks whether the Firestore record for the given user exists.
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
 * Fetches the logged-in user's username from Firestore
 */
async function fetchUsername(userId) {
  try {
    const userQuery = query(collection(db, "Users"), where("user_id", "==", userId));
    const userSnapshot = await getDocs(userQuery);
    const usernameElement = document.querySelector('.username');
    if (!userSnapshot.empty && usernameElement) {
      usernameElement.textContent = `Welcome, ${userSnapshot.docs[0].data().username}`;
    } else if (usernameElement) {
      usernameElement.textContent = "Welcome, User";
    }
  } catch (error) {
    console.error("Error fetching username:", error);
    const usernameElement = document.querySelector('.username');
    if (usernameElement) {
      usernameElement.textContent = "Welcome, User";
    }
  }
}

/**
 * Uploads video to Cloudinary
 */
async function uploadToCloudinary(videoFile) {
  try {
    const formData = prepareUploadData(videoFile);
    const response = await fetch(getUploadUrl(), {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to upload: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      public_id: data.public_id
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Creates a post in Firebase
 */
async function createPost(postId, title, userId, categoryId, mediaData) {
  const postRef = doc(db, "Posts", postId);
  await setDoc(postRef, {
    post_id: postId,
    title: title,
    content: "",
    user_id: userId,
    category_id: categoryId,
    created_at: serverTimestamp(),
    type: "video",
    media_url: mediaData.url,
    cloudinary_public_id: mediaData.public_id
  });
}

// Main initialization
async function initializeVideoUpload() {
  // User validation
  const loggedInUserId = sessionStorage.getItem('loggedInUserId');
  if (!loggedInUserId) {
    window.location.href = 'LH_CODE_LOGIN.html';
    return;
  }

  if (!(await checkUserValidity(loggedInUserId))) {
    alert("Account not found. Please sign in again.");
    sessionStorage.clear();
    window.location.href = 'LH_CODE_LOGIN.html';
    return;
  }

  await fetchUsername(loggedInUserId);

  // Category check
  const selectedCategory = localStorage.getItem('selectedCategory');
  if (!selectedCategory) {
    setTimeout(() => window.location.href = 'LH_CODE_categories.html', 2000);
    return;
  }

  // Initialize elements
  const videoInput = document.getElementById('videoInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const publishBtn = document.getElementById('publishVideoBtn');
  const videoSize = document.getElementById('videoSize');
  const videoError = document.getElementById('videoError');
  const videoTitle = document.getElementById('videoTitle');

  // Validate elements exist
  if (!videoInput || !uploadBtn || !publishBtn || !videoSize || !videoError || !videoTitle) {
    console.error('Missing required elements');
    return;
  }

  // The Publish button remains clickable.
  // Upload button handler: triggers the file input dialog.
  uploadBtn.addEventListener('click', () => videoInput.click());

  // File selection handler
  videoInput.addEventListener('change', () => {
    const file = videoInput.files[0];
    // Clear previous error messages
    videoError.textContent = '';
    videoError.classList.add('hidden');

    if (file) {
      // Validate file type
      if (!file.type.includes('mp4')) {
        showError('videoError', 'Only MP4 files are allowed');
        videoInput.value = '';
        videoSize.textContent = '0MB / 100MB';
        return;
      }

      // Validate file size
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      videoSize.textContent = `${sizeMB}MB / 100MB`;

      if (file.size > 100 * 1024 * 1024) {
        showError('videoError', 'File size exceeds 100MB');
        return;
      }
      
      // If file is valid, clear any previous error message so it disappears.
      videoError.textContent = '';
      videoError.style.display = 'none';
    } else {
      videoSize.textContent = '0MB / 100MB';
    }
  });

  // Title input handler: show error message on input if needed
  videoTitle.addEventListener('input', () => {
    if (!videoTitle.value.trim()) {
      showError('videoError', 'Please add a title');
    } else {
      videoError.textContent = '';
      videoError.style.display = 'none';
    }
  });

  // Publish button handler
  publishBtn.addEventListener('click', async () => {
    const file = videoInput.files[0];
    const title = videoTitle.value.trim();

    // Clear previous errors
    videoError.textContent = '';
    videoError.classList.add('hidden');

    let invalid = false;

    if (!file) {
      showError('videoError', 'Please upload a valid video');
      invalid = true;
    }
    if (!title) {
      showError('videoError', 'Please add a title');
      invalid = true;
    }
    if (file) {
      if (!file.type.includes('mp4')) {
        showError('videoError', 'Only MP4 files are allowed');
        invalid = true;
      }
      if (file.size > 100 * 1024 * 1024) {
        showError('videoError', 'File size exceeds 100MB');
        invalid = true;
      }
    }

    if (invalid) {
      // Do nothing further if any validation fails.
      return;
    }

    try {
      publishBtn.textContent = 'Publishing...';

      // Get new post ID by checking the highest post_id from existing posts.
      const postsSnapshot = await getDocs(collection(db, "Posts"));
      let maxPostId = 0;
      postsSnapshot.forEach((doc) => {
        const postId = parseInt(doc.data().post_id);
        if (!isNaN(postId) && postId > maxPostId) {
          maxPostId = postId;
        }
      });
      const newPostId = (maxPostId + 1).toString();

      // Upload video to Cloudinary and create the post in Firebase.
      const mediaData = await uploadToCloudinary(file);
      await createPost(newPostId, title, loggedInUserId, selectedCategory, mediaData);

      alert('Published successfully!');
      window.location.href = 'LH_CODE_categories.html';
    } catch (error) {
      console.error('Publishing error:', error);
      showError('videoError', error.message || 'Publishing failed. Please try again.');
      publishBtn.textContent = 'Publish Video';
    }
  });
}

// Start when DOM loads
document.addEventListener('DOMContentLoaded', initializeVideoUpload);
