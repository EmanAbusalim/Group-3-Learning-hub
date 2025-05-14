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
const searchInput = document.getElementById("searchUsername");
const searchButton = document.querySelector(".btn.search");
const userResultDiv = document.getElementById("userResult");
const deleteButton = document.querySelector(".btn.delete");
const welcomeDiv = document.querySelector(".welcome");

// Global variables for the selected user's details.
let selectedUserId = null;
let selectedUserDocId = null;
let selectedUserAuthUID = null;  // Optional: this field may not be set in some documents

/**
 * On DOM load: Check access (only admin allowed) and update header.
 */
document.addEventListener("DOMContentLoaded", async () => {
  const loggedInUserId = sessionStorage.getItem("loggedInUserId");
  const userRole = sessionStorage.getItem("userRole");

  if (!loggedInUserId || userRole !== "admin") {
    window.location.replace("../LH_CODE_HTML/LH_CODE_LOGIN.html");
    return;
  }
  
  await fetchUsername(loggedInUserId);
});

/**
 * Fetch the logged-in admin’s username from Firestore.
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
 * Search for users whose username includes the entered search term (case‑insensitive).
 * Displays matching users as clickable items.
 */
searchButton.addEventListener("click", async () => {
  userResultDiv.innerHTML = "";
  selectedUserId = null;
  selectedUserDocId = null;
  selectedUserAuthUID = null;
  
  const searchValue = searchInput.value.trim();
  if (!searchValue) {
    alert("Please enter a username");
    return;
  }
  
  try {
    // Fetch all users (assuming a manageable number of documents appears in the admin panel).
    const allUsersSnapshot = await getDocs(collection(db, "Users"));
    let matchingUsers = [];
    
    allUsersSnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      if (userData.username.toLowerCase().includes(searchValue.toLowerCase())) {
        matchingUsers.push(docSnap);
      }
    });
    
    if (matchingUsers.length === 0) {
      userResultDiv.innerHTML = `<p>No matching users found.</p>`;
      return;
    }
    
    // Create clickable user result items.
    matchingUsers.forEach((docSnap) => {
      const userData = docSnap.data();
      const userDiv = document.createElement("div");
      userDiv.classList.add("user-result-item");
      userDiv.textContent = `User ID: ${userData.user_id} | Username: ${userData.username}`;
      
      // When clicked, mark as selected and store the user details.
      userDiv.addEventListener("click", () => {
        console.log("User item clicked:", userData);
        // Remove previously selected class from all items.
        document.querySelectorAll(".user-result-item").forEach(item => item.classList.remove("selected"));
        userDiv.classList.add("selected");
        
        selectedUserId = userData.user_id;
        selectedUserDocId = docSnap.id;
        selectedUserAuthUID = userData.auth_uid; // Might be undefined if not stored.
      });
      
      userResultDiv.appendChild(userDiv);
    });
    
  } catch (error) {
    console.error("Error searching for user:", error);
    userResultDiv.innerHTML = `<p>Error occurred while searching.</p>`;
  }
});

/**
 * Delete the selected user and their related posts.
 * Also calls a backend API to delete the user's Firebase Auth record (if available).
 */
deleteButton.addEventListener("click", async () => {
  // Check only that user_id and document id have been set.
  if (!selectedUserId || !selectedUserDocId) {
    alert("Please search for a user and select one before deleting.");
    return;
  }
  
  if (!confirm("Are you sure you want to delete this user and all related posts?")) {
    return;
  }
  
  try {
    // Delete all posts with matching user_id.
    const postsQuery = query(collection(db, "Posts"), where("user_id", "==", selectedUserId));
    const postsSnapshot = await getDocs(postsQuery);
    const deletePostPromises = [];
    postsSnapshot.forEach((postDoc) => {
      deletePostPromises.push(deleteDoc(doc(db, "Posts", postDoc.id)));
    });
    await Promise.all(deletePostPromises);
    
    // Delete the user document from the Users collection.
    await deleteDoc(doc(db, "Users", selectedUserDocId));
    
    // If an auth UID is available, call backend API to delete the user's Firebase Auth record.
    if (selectedUserAuthUID) {
      await deleteAuthRecord(selectedUserAuthUID);
    } else {
      console.warn("No auth UID set for this user, skipping auth record deletion.");
    }
    
    alert("User and all related posts have been deleted successfully.");
    
    // Clear search results and reset selection.
    userResultDiv.innerHTML = "";
    searchInput.value = "";
    selectedUserId = null;
    selectedUserDocId = null;
    selectedUserAuthUID = null;
    
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("Failed to delete the user. Please try again.");
  }
});

/**
 * Call a backend API (e.g., a Firebase Cloud Function) to delete the user's Firebase Auth record.
 * Replace the URL with your deployed endpoint if available.
 */
async function deleteAuthRecord(authUID) {
  try {
    const response = await fetch('https://<YOUR_REGION>-<YOUR_PROJECT_ID>.cloudfunctions.net/deleteUserAuth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: authUID })
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete auth record.');
    }
    
    console.log("Auth record deleted successfully.");
  } catch (error) {
    console.error("Error deleting auth record:", error);
    throw error;
  }
}
