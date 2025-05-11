document.addEventListener('DOMContentLoaded', () => {
  const articleBody = document.getElementById('articleBody');
  const wordCounter = document.getElementById('wordCounter');
  const articleError = document.getElementById('articleError');

  articleBody.addEventListener('input', () => {
    const words = articleBody.value.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    wordCounter.textContent = `${wordCount}/1000 words`;

    if (wordCount > 1000) {
      articleError.classList.remove('hidden');
    } else {
      articleError.classList.add('hidden');
    }
  });
});
