import { db } from "../LH_CODE_JS/LH_CODE_FirebaseConfig.js"; 
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  doc, 
  getDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Get DOM elements.
const categorySelect = document.getElementById("categorySelect");
const postsContainer = document.getElementById("postsContainer");
const publishSelect = document.getElementById("publishSelect");
const followButton = document.querySelector(".follow-btn");
const usernameDisplay = document.querySelector(".username");

/** 
 * INITIALIZE ON PAGE LOAD 
 * Check for a logged-in user, validate their Firestore record, then
 * load the username and categories.
 */
document.addEventListener("DOMContentLoaded", async () => {
  const loggedInUserId = sessionStorage.getItem("loggedInUserId");
  
  if (!loggedInUserId) {
    window.location.replace("../LH_CODE_HTML/LH_CODE_LOGIN.html");
    return;
  }
  
  // Check that the Firestore record exists.
  const isValidUser = await checkUserValidity(loggedInUserId);
  if (!isValidUser) {
    alert("Your account record is not found. Please sign in again.");
    sessionStorage.clear();
    window.location.href = '../LH_CODE_HTML/LH_CODE_LOGIN.html';
    return;
  }
  
  await fetchUsername(loggedInUserId);
  await loadCategories();
});

/** FETCH THE LOGGED-IN USERNAME */
async function fetchUsername(userId) {
  try {
    const userQuery = query(collection(db, "Users"), where("user_id", "==", userId));
    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
      usernameDisplay.textContent = `Welcome, ${userSnapshot.docs[0].data().username}`;
    } else {
      usernameDisplay.textContent = "Welcome, User";
    }
  } catch (error) {
    console.error("Error fetching username:", error);
    usernameDisplay.textContent = "Welcome, User";
  }
}

/** LOAD CATEGORIES INTO THE DROPDOWN */
async function loadCategories() {
  try {
    const categoryQuery = query(collection(db, "Categories"));
    const categorySnapshot = await getDocs(categoryQuery);
    categorySelect.innerHTML = "";

    if (categorySnapshot.empty) {
      categorySelect.innerHTML = "<option disabled>No categories found</option>";
      return;
    }

    categorySnapshot.forEach((docSnap) => {
      const category = docSnap.data();
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = category.category_name;
      categorySelect.appendChild(option);
    });

    if (categorySelect.options.length > 0) {
      categorySelect.selectedIndex = 0;
      fetchPosts(categorySelect.value);
      updateFollowButtonText();
    }
  } catch (error) {
    console.error("Error loading categories:", error);
    categorySelect.innerHTML = "<option disabled>Error loading categories</option>";
  }
}

/** FETCH POSTS FOR THE SELECTED CATEGORY */
async function fetchPosts(categoryId) {
  try {
    const postsQuery = query(collection(db, "Posts"), where("category_id", "==", categoryId));
    const postsSnapshot = await getDocs(postsQuery);
    postsContainer.innerHTML = "";

    // If the snapshot is empty, show no posts available text.
    if (postsSnapshot.empty) {
      postsContainer.innerHTML = "<p>No posts available.</p>";
      return;
    }

    let postsRendered = 0;
    postsSnapshot.forEach((docSnap) => {
      const post = docSnap.data();

      // Consider posts with empty title and content as non-existent.
      if (
        (!post.title || post.title.trim() === "") &&
        (!post.content || post.content.trim() === "")
      ) {
        return; // Skip non-valid post.
      }

      const postElement = document.createElement("div");
      postElement.classList.add("post-button");

      // Only add title element if it exists and is not empty.
      if (post.title && post.title.trim() !== "") {
        const titleElement = document.createElement("h3");
        titleElement.textContent = post.title;
        postElement.appendChild(titleElement);
      }

      // Only add content element if it exists and is not empty.
      if (post.content && post.content.trim() !== "") {
        const contentElement = document.createElement("p");
        contentElement.textContent = post.content;
        postElement.appendChild(contentElement);
      }

      postsContainer.appendChild(postElement);
      postsRendered++;
    });

    // If no valid posts were rendered, show a "no posts available" message.
    if (postsRendered === 0) {
      postsContainer.innerHTML = "<p>No posts available.</p>";
    }
  } catch (error) {
    console.error("Error fetching posts:", error);
    postsContainer.innerHTML = "<p>Error loading posts</p>";
  }
}

/** HANDLE CATEGORY CHANGE */
categorySelect.addEventListener("change", () => {
  fetchPosts(categorySelect.value);
  updateFollowButtonText();
});

/** HANDLE PUBLISH SELECTION */
publishSelect.addEventListener("change", () => {
  const selectedValue = publishSelect.value;
  if (selectedValue) {
    // Save the current selected category for later use.
    const selectedCategory = categorySelect.value;
    if (selectedCategory) {
      localStorage.setItem("selectedCategory", selectedCategory);
    }
    window.location.href = selectedValue;
  }
});

/** HANDLE FOLLOW/UNFOLLOW ACTION */
followButton.addEventListener("click", async () => {
  const categoryId = categorySelect.value;
  const userId = sessionStorage.getItem("loggedInUserId");
  if (!userId) {
    alert("You need to be logged in to follow categories.");
    return;
  }

  try {
    const followDocRef = doc(db, "UserCategory", `${userId}_${categoryId}`);
    const followDocSnap = await getDoc(followDocRef);

    if (followDocSnap.exists()) {
      // Unfollow if already following.
      await deleteDoc(followDocRef);
      followButton.textContent = "Follow";
      alert(`You have unfollowed ${categorySelect.options[categorySelect.selectedIndex].text}.`);
    } else {
      // Follow if not already following.
      await setDoc(followDocRef, {
        user_id: userId,
        category_id: categoryId,
        followed_at: new Date()
      });
      followButton.textContent = "Following";
      alert(`You are now following ${categorySelect.options[categorySelect.selectedIndex].text}!`);
    }
  } catch (error) {
    console.error("Error updating follow status:", error);
  }
});

/** UPDATE FOLLOW BUTTON TEXT */
async function updateFollowButtonText() {
  const categoryId = categorySelect.value;
  const userId = sessionStorage.getItem("loggedInUserId");
  if (!userId) {
    followButton.textContent = "Follow";
    followButton.disabled = false;
    return;
  }

  try {
    const followDocRef = doc(db, "UserCategory", `${userId}_${categoryId}`);
    const followDocSnap = await getDoc(followDocRef);
    followButton.textContent = followDocSnap.exists() ? "Following" : "Follow";
  } catch (error) {
    console.error("Error checking follow status:", error);
    followButton.textContent = "Follow";
  }
  
}
