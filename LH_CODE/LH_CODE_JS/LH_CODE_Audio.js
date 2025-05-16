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

// Audio Recording Variables
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;
let totalRecordingSeconds = 0;
let isRecordingPaused = false;
const MAX_RECORDING_SECONDS = 300; // 5 minutes

// DOM Elements
const recordButton = document.getElementById('recordBtn');
const pauseButton = document.getElementById('pauseBtn');
const publishButton = document.getElementById('publishAudioBtn');
const audioTitleInput = document.getElementById('audioTitle');
const recordingTimeDisplay = document.getElementById('recordingTime');
const errorDisplay = document.getElementById('audioError');
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
  recordButton.addEventListener('click', handleRecord);
  pauseButton.addEventListener('click', handlePause);
  publishButton.addEventListener('click', handlePublish);
}

async function handleRecord() {
  try {
    if (mediaRecorder?.state === 'paused') {
      resumeRecording();
      return;
    }

    if (mediaRecorder?.state === 'recording') return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    initializeMediaRecorder(stream);
  } catch (error) {
    showError('Microphone access denied. Please check permissions.');
  }
}

function handlePause() {
  if (mediaRecorder?.state === 'recording') {
    pauseRecording();
  }
}

async function handlePublish() {
  try {
    if (!validateBeforePublish()) return;

    publishButton.disabled = true;
    publishButton.textContent = 'Publishing...';

    // Get next post ID (WITH TRANSACTION)
    const postId = await getNextPostId();

    // Process audio
    const audioBlob = await stopRecordingAndGetBlob();
    const mediaData = await uploadToCloudinary(audioBlob);

    // Create post
    await createAudioPost(
      postId,
      audioTitleInput.value.trim(),
      sessionStorage.getItem('loggedInUserId'),
      localStorage.getItem('selectedCategory'),
      mediaData
    );

    // Clean up and redirect
    cleanupAfterPublish();
    window.location.href = 'LH_CODE_categories.html';

  } catch (error) {
    console.error("Publish error:", error);
    showError(error.message || 'Failed to publish audio. Please try again.');
    publishButton.disabled = false;
    publishButton.textContent = 'Publish';
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

function initializeMediaRecorder(stream) {
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  mediaRecorder.start();
  
  recordingStartTime = Date.now();
  totalRecordingSeconds = 0;
  startRecordingTimer();
  recordButton.textContent = 'Recording...';
}

async function stopRecordingAndGetBlob() {
  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/wav' });
      resolve(blob);
    };
    mediaRecorder.stop();
    clearInterval(recordingTimer);
  });
}

async function uploadToCloudinary(audioBlob) {
  const formData = prepareUploadData(audioBlob);
  const response = await fetch(getUploadUrl(), {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error('Cloudinary upload failed');
  return await response.json();
}

async function createAudioPost(postId, title, userId, categoryId, mediaData) {
  const postRef = doc(db, "Posts", postId);
  await setDoc(postRef, {
    post_id: postId,
    title: title,
    content: "",
    user_id: userId,
    category_id: categoryId,
    created_at: serverTimestamp(),
    type: "audio",
    media_url: mediaData.secure_url,
    cloudinary_public_id: mediaData.public_id,
    duration_seconds: totalRecordingSeconds
  });
}

function startRecordingTimer() {
  recordingTimer = setInterval(() => {
    totalRecordingSeconds++;
    updateTimerDisplay();
    
    if (totalRecordingSeconds > MAX_RECORDING_SECONDS) {
      recordingTimeDisplay.style.color = 'red';
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(totalRecordingSeconds / 60);
  const seconds = totalRecordingSeconds % 60;
  recordingTimeDisplay.textContent = 
    `${minutes}:${seconds.toString().padStart(2, '0')} / 5:00`;
}

function pauseRecording() {
  mediaRecorder.pause();
  clearInterval(recordingTimer);
  isRecordingPaused = true;
  recordButton.textContent = 'Continue Recording';
}

function resumeRecording() {
  mediaRecorder.resume();
  startRecordingTimer();
  isRecordingPaused = false;
  recordButton.textContent = 'Recording...';
}

function validateBeforePublish() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    showError('Please record audio first');
    return false;
  }

  if (!audioTitleInput.value.trim()) {
    showError('Title is required');
    return false;
  }

  if (totalRecordingSeconds > MAX_RECORDING_SECONDS) {
    showError('Recording exceeds 5 minutes');
    return false;
  }

  return true;
}

function cleanupAfterPublish() {
  audioChunks = [];
  totalRecordingSeconds = 0;
  audioTitleInput.value = '';
  localStorage.removeItem('selectedCategory');
}

function showError(message) {
  errorDisplay.textContent = message;
  errorDisplay.classList.remove('hidden');
}

function redirectToLogin() {
  window.location.href = 'LH_CODE_LOGIN.html';
}
