const videoInput = document.getElementById('videoInput');
const uploadBtn = document.getElementById('uploadBtn');
const videoSize = document.getElementById('videoSize');
const videoError = document.getElementById('videoError');

uploadBtn.addEventListener('click', () => {
  videoInput.click();
});

videoInput.addEventListener('change', () => {
  const file = videoInput.files[0];
  if (file) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    videoSize.textContent = `${sizeMB}MB / 100MB`;

    if (file.size > 100 * 1024 * 1024) {
      videoError.classList.remove('hidden');
    } else {
      videoError.classList.add('hidden');
    }
  }
});
