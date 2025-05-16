document.addEventListener('DOMContentLoaded', () => {
  const articleBody = document.getElementById('articleBody');
  const articleTitle = document.getElementById('articleTitle');
  const wordCounter = document.getElementById('wordCounter');
  const articleError = document.getElementById('articleError');
  const publishBtn = document.querySelector('.publish-btn');

  // Word count update as user types
  articleBody.addEventListener('input', () => {
    const words = articleBody.value.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    wordCounter.textContent = `${wordCount}/1000 words`;

    if (wordCount > 1000) {
      articleError.textContent = 'Article body exceeds 1000 words';
      articleError.classList.remove('hidden');
    } else {
      articleError.classList.add('hidden');
    }
  });

  // Validation on publish click
  publishBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent form submission if validation fails
    
    const titleValid = articleTitle.value.trim() !== '';
    const bodyValid = articleBody.value.trim() !== '';
    const wordCount = articleBody.value.trim().split(/\s+/).filter(Boolean).length;
    const wordLimitValid = wordCount <= 1000;

    if (!titleValid && !bodyValid) {
      articleError.textContent = 'Title and article body are required';
      articleError.classList.remove('hidden');
    } else if (!titleValid) {
      articleError.textContent = 'Title is required';
      articleError.classList.remove('hidden');
    } else if (!bodyValid) {
      articleError.textContent = 'Article body is required';
      articleError.classList.remove('hidden');
    } else if (!wordLimitValid) {
      articleError.textContent = 'Article body exceeds 1000 words';
      articleError.classList.remove('hidden');
    } else {
      articleError.classList.add('hidden');
      // Proceed with publishing the article
      alert('Article published successfully!');
      // window.location.href = 'categories.html'; // Uncomment to redirect after publish
    }
  });
});