let mediaRecorder;
let chunks = [];
let startTime;
let recordingInterval;

const recordBtn = document.getElementById('recordBtn');
const pauseBtn = document.getElementById('pauseBtn');
const publishBtn = document.getElementById('publishBtn');
const recordingTime = document.getElementById('recordingTime');
const audioError = document.getElementById('audioError');

recordBtn.addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    startTimer();
    return;
  }

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
  startTimer();
});

pauseBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    clearInterval(recordingInterval);
  }
});

publishBtn.addEventListener('click', () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
  }
});

function startTimer() {
  recordingInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    recordingTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} / 5:00`;

    if (elapsed >= 300) {
      audioError.classList.remove('hidden');
      mediaRecorder.stop();
    }
  }, 1000);
}
