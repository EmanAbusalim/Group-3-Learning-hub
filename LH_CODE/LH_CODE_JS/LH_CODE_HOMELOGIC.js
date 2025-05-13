// LH_CODE_HomeLogic.js
import { db } from "./firebaseConfig.js"; // Import db from your config file

// DOM Elements
const userId = sessionStorage.getItem("user_id");
const usernameSpan = document.querySelector('.username');
const notificationsDiv = document.querySelector('.notifications');
const postsDiv = document.querySelector('.posts');

// Helper functions
async function getUsername(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    return userDoc.exists() ? userDoc.data().username : "Unknown User";
  } catch (error) {
    console.error("Error getting username:", error);
    return "Unknown User";
  }
}

async function getFollowedCategories(userId) {
  try {
    const snapshot = await getDocs(collection(db, "usercategory"));
    const followed = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.user_id === userId) {
        followed.push(data.Category_id);
      }
    });
    return followed;
  } catch (error) {
    console.error("Error getting followed categories:", error);
    return [];
  }
}

async function getCategoriesMap() {
  try {
    const snapshot = await getDocs(collection(db, "categories"));
    const map = {};
    snapshot.forEach(doc => {
      map[doc.id] = doc.data().category_name;
    });
    return map;
  } catch (error) {
    console.error("Error getting categories map:", error);
    return {};
  }
}

async function getPosts() {
  try {
    const snapshot = await getDocs(collection(db, "posts"));
    const allPosts = [];
    snapshot.forEach(doc => {
      allPosts.push({ id: doc.id, ...doc.data() });
    });
    return allPosts;
  } catch (error) {
    console.error("Error getting posts:", error);
    return [];
  }
}

function truncate(content, length = 100) {
  return content.length > length ? content.substring(0, length) + "..." : content;
}

function createPostElement(post, categoriesMap) {
  const div = document.createElement("div");
  div.className = "post-button";
  div.innerHTML = `
    <h3>${post.title}</h3>
    <small>${categoriesMap[post.category_id] || 'Uncategorized'}</small>
    <p>${truncate(post.content, 150)}</p>
  `;
  div.addEventListener('click', () => {
    window.location.href = `post.html?id=${post.id}`;
  });
  return div;
}

async function populatePage() {
  if (!userId) {
    window.location.href = "login.html";
    return;
  }

  try {
    const username = await getUsername(userId);
    usernameSpan.textContent = `Welcome, ${username}`;

    const [followed, categoriesMap, allPosts] = await Promise.all([
      getFollowedCategories(userId),
      getCategoriesMap(),
      getPosts()
    ]);

    const seenPosts = JSON.parse(sessionStorage.getItem("seenPosts") || "[]");
    const newPosts = [];
    const followedPosts = [];

    for (const post of allPosts) {
      if (followed.includes(post.category_id)) {
        followedPosts.push(post);
        if (!seenPosts.includes(post.id)) {
          newPosts.push(post);
          seenPosts.push(post.id);
        }
      }
    }

    sessionStorage.setItem("seenPosts", JSON.stringify(seenPosts));

    // Populate notifications
    if (newPosts.length > 0) {
      const notificationHeader = document.createElement('h3');
      notificationHeader.textContent = 'New in your categories:';
      notificationsDiv.appendChild(notificationHeader);

      newPosts.forEach(post => {
        notificationsDiv.appendChild(createPostElement(post, categoriesMap));
      });
    } else {
      notificationsDiv.innerHTML = '<p>No new posts in your followed categories.</p>';
    }

    // Populate followed posts
    if (followedPosts.length > 0) {
      const postsHeader = document.createElement('h3');
      postsHeader.textContent = 'Posts from your categories:';
      postsDiv.appendChild(postsHeader);

      followedPosts.forEach(post => {
        postsDiv.appendChild(createPostElement(post, categoriesMap));
      });
    } else {
      postsDiv.innerHTML = '<p>No posts found in your followed categories.</p>';
    }

  } catch (error) {
    console.error("Error populating page:", error);
    notificationsDiv.innerHTML = '<p>Error loading content. Please try again later.</p>';
    postsDiv.innerHTML = '';
  }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', populatePage);