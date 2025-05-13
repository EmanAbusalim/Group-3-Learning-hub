const videoInput = document.getElementById('videoInput');
const uploadBtn = document.getElementById('uploadBtn');
const publishBtn = document.getElementById('publishBtn');
const videoSize = document.getElementById('videoSize');
const videoError = document.getElementById('videoError');
const videoTitle = document.getElementById('videoTitle');

// Initialize with publish button disabled
publishBtn.disabled = true;

// Click handler for upload button
uploadBtn.addEventListener('click', () => {
  videoInput.click();
});

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

// Publish button handler (you can add your upload logic here)
publishBtn.addEventListener('click', () => {
  if (!publishBtn.disabled) {
    // Here you would typically:
    // 1. Get the file and title
    // 2. Upload to your server
    // 3. Handle the response
    const file = videoInput.files[0];
    const title = videoTitle.value.trim();
    
    console.log('Publishing video:', {
      title: title,
      filename: file.name,
      size: file.size
    });
    
    // Example upload logic (you'll need to implement this properly)
    // uploadVideo(file, title).then(() => {
    //   window.location.href = 'success.html';
    // }).catch(error => {
    //   videoError.textContent = 'Upload failed: ' + error.message;
    //   videoError.classList.remove('hidden');
    // });
    
    alert(`Video "${title}" ready for upload! (Implement actual upload logic)`);
  }
});