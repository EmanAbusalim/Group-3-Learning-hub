import { db } from "../LH_CODE_JS/LH_CODE_FirebaseConfig.js";
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// When the admin page loads, verify authentication, load the admin's username, and fetch all posts.
document.addEventListener("DOMContentLoaded", async () => {
  const loggedInUserId = sessionStorage.getItem("loggedInUserId");

  // Redirect to login if no user is found
  if (!loggedInUserId) {
    console.error("User not authenticated! Redirecting to login...");
    window.location.replace("../LH_CODE_HTML/LH_CODE_LOGIN.html");
    return;
  }

  // Load username
  await fetchAdminData(loggedInUserId);

  // Fetch and display all posts from the Posts collection
  await fetchAllPosts();
});

// Fetch admin's username from Firestore and display it on the page
async function fetchAdminData(loggedInUserId) {
  try {
    const userQuery = query(collection(db, "Users"), where("user_id", "==", loggedInUserId));
    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
      const username = userSnapshot.docs[0].data().username;
      document.querySelector(".username").textContent = username;
    } else {
      document.querySelector(".username").textContent = "Admin";
    }
  } catch (error) {
    console.error("Error fetching admin data:", error);
  }
}

// Fetch all posts (no filtering by category)
async function fetchAllPosts() {
  try {
    const postsContainer = document.querySelector(".posts");
    const postsQuery = query(collection(db, "Posts"));
    const postsSnapshot = await getDocs(postsQuery);

    postsContainer.innerHTML = "";
    if (postsSnapshot.empty) {
      postsContainer.innerHTML = "<p>No posts available.</p>";
      return;
    }

    postsSnapshot.forEach(postDoc => {
      const post = postDoc.data();
      const postElement = document.createElement("div");
      postElement.classList.add("post-button");

      const titleElement = document.createElement("h3");
      titleElement.textContent = post.title;
      postElement.appendChild(titleElement);

      if (!post.type || post.type === "text") {
        const contentElement = document.createElement("p");
        contentElement.textContent = post.content;
        postElement.appendChild(contentElement);
      } else if (post.type === "audio") {
        const audioElement = document.createElement("audio");
        audioElement.controls = true;
        audioElement.src = post.content;
        postElement.appendChild(audioElement);
      } else if (post.type === "video") {
        const videoElement = document.createElement("video");
        videoElement.controls = true;
        videoElement.width = "100%";
        videoElement.src = post.content;
        postElement.appendChild(videoElement);
      } else {
        const unsupported = document.createElement("p");
        unsupported.textContent = "Unsupported post format.";
        postElement.appendChild(unsupported);
      }

      postsContainer.appendChild(postElement);
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
  }
}

// Function to handle admin tools dropdown actions
window.handleAdminAction = function(url) {
  if (url) window.location.href = url;
}
