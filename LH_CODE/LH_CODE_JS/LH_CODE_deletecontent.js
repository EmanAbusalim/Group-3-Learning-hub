import { db } from "../LH_CODE_JS/LH_CODE_FirebaseConfig.js";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM elements
const searchInput = document.querySelector('input[type="text"]');
const searchButton = document.querySelector('.btn.search');
const resultsContainer = document.getElementById("resultsContainer");
const deleteButton = document.querySelector('.btn.delete');
const welcomeDiv = document.querySelector('.welcome');

let selectedPostId = null;

/** 
 * On DOM load, ensure the user is logged in as admin and load the username.
 */
document.addEventListener("DOMContentLoaded", async () => {
  const loggedInUserId = sessionStorage.getItem("loggedInUserId");
  const userRole = sessionStorage.getItem("userRole");

  // Redirect if not logged in or not admin
  if (!loggedInUserId || userRole !== "admin") {
    window.location.replace("../LH_CODE_HTML/LH_CODE_LOGIN.html");
    return;
  }
  
  // Fetch and display the admin's username in the header.
  await fetchUsername(loggedInUserId);
});

/** 
 * Fetch the logged-in user's username from Firestore and update the header.
 */
async function fetchUsername(userId) {
  try {
    const userQuery = query(collection(db, "Users"), where("user_id", "==", userId));
    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
      const username = userSnapshot.docs[0].data().username;
      welcomeDiv.textContent = `Welcome, ${username}`;
    } else {
      welcomeDiv.textContent = "Welcome, User";
    }
  } catch (error) {
    console.error("Error fetching username:", error);
    welcomeDiv.textContent = "Welcome, User";
  }
}

/** 
 * Search event: look up the provided username in the Users collection.
 * Then, query the Posts collection to display posts belonging to that user.
 */
searchButton.addEventListener('click', async () => {
  // Clear any previous results and reset selection.
  resultsContainer.innerHTML = "";
  selectedPostId = null;
  
  const username = searchInput.value.trim();
  if (!username) {
    alert("Please enter a username");
    return;
  }
  
  try {
    // Lookup the username.
    const userQuery = query(collection(db, "Users"), where("username", "==", username));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      resultsContainer.innerHTML = `<p>Username not found</p>`;
      return;
    }
    
    // Assuming usernames are unique; take the first match.
    const userDoc = userSnapshot.docs[0].data();
    const userId = userDoc.user_id;
    
    // Query posts from the Posts collection for this user.
    const postsQuery = query(collection(db, "Posts"), where("user_id", "==", userId));
    const postsSnapshot = await getDocs(postsQuery);
    
    if (postsSnapshot.empty) {
      resultsContainer.innerHTML = `<p>No posts found for this user.</p>`;
      return;
    }
    
    // For each post found, create a styled box.
    postsSnapshot.forEach((docSnap) => {
      const postData = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("content-result");
      
      // Display information: "Content ID: <doc id> Title: <title> (Posted by <username>)"
      postDiv.textContent = `Content ID: ${docSnap.id} Title: ${postData.title} (Posted by ${username})`;
      
      // Allow selection of the post.
      postDiv.addEventListener("click", () => {
        // Remove any previous selection.
        const allPosts = document.querySelectorAll('.content-result');
        allPosts.forEach(post => post.classList.remove("selected"));
        postDiv.classList.add("selected");
        selectedPostId = docSnap.id;
      });
      
      resultsContainer.appendChild(postDiv);
    });
  } catch (error) {
    console.error("Error searching posts:", error);
    resultsContainer.innerHTML = `<p>Error occurred while searching.</p>`;
  }
});

/**
 * Delete button event: delete the selected post from Firestore.
 */
deleteButton.addEventListener('click', async () => {
  if (!selectedPostId) {
    alert("Please select a post to delete.");
    return;
  }
  
  if (!confirm("Are you sure you want to delete the selected post?")) {
    return;
  }
  
  try {
    // Delete the post document.
    await deleteDoc(doc(db, "Posts", selectedPostId));
    alert("Post deleted successfully.");
    
    // Remove the deleted post from the UI.
    const selectedElement = document.querySelector('.content-result.selected');
    if (selectedElement) {
      selectedElement.remove();
    }
    selectedPostId = null;
  } catch (error) {
    console.error("Error deleting post:", error);
    alert("Failed to delete the post.");
  }
});
