import { db } from "../LH_CODE_JS/LH_CODE_FirebaseConfig.js"; 
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/*─────────────────────────────────────*/
/* 1. Initialization on Page Load      */
/*─────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", async () => {
  const loggedInUserId = sessionStorage.getItem("loggedInUserId");

  if (!loggedInUserId) {
    console.error("User not authenticated! Redirecting to login...");
    window.location.replace("../LH_CODE_HTML/LH_CODE_LOGIN.html");
    return;
  }

  const isValidUser = await checkUserValidity(loggedInUserId);
  if (!isValidUser) {
    alert("Your account record is not found. Please sign in again.");
    sessionStorage.clear();
    window.location.href = '../LH_CODE_HTML/LH_CODE_LOGIN.html';
    return;
  }
  
  await fetchUserData(loggedInUserId);
  await fetchNotifications(loggedInUserId);
  await fetchFollowedPosts(loggedInUserId);
});

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

/*─────────────────────────────────────*/
/* 2. Fetch & Display Logged-in Username */
async function fetchUserData(loggedInUserId) {
  try {
    const userQuery = query(collection(db, "Users"), where("user_id", "==", loggedInUserId));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      document.querySelector(".username").textContent = `Welcome, ${userSnapshot.docs[0].data().username}`;
    } else {
      document.querySelector(".username").textContent = "Welcome, Unknown User";
    }
  } catch (error) {
    console.error("Error fetching user:", error);
  }
}

/*─────────────────────────────────────*/
/* 3. Fetch Notifications for Followed Categories */
async function fetchNotifications(loggedInUserId) {
  try {
    const userCategoryQuery = query(collection(db, "UserCategory"), where("user_id", "==", loggedInUserId));
    const followedCategoriesSnapshot = await getDocs(userCategoryQuery);
    
    if (followedCategoriesSnapshot.empty) {
      document.querySelector(".notifications").innerHTML = "<p>No new posts.</p>";
      updateNotificationCounter(0);
      return;
    }
    
    const followedCategoryIds = followedCategoriesSnapshot.docs.map(doc => doc.data().category_id);
    const seenPostsQuery = query(collection(db, "SeenPosts"), where("user_id", "==", loggedInUserId));
    const seenPostsSnapshot = await getDocs(seenPostsQuery);
    const seenPostIds = seenPostsSnapshot.docs.map(doc => doc.data().post_id);
    const postsQuery = query(collection(db, "Posts"), where("category_id", "in", followedCategoryIds));
    const postsSnapshot = await getDocs(postsQuery);
    
    const notificationsContainer = document.querySelector(".notifications");
    notificationsContainer.innerHTML = "";

    const categoryNames = {};
    const categoryQuery = query(collection(db, "Categories"));
    const categorySnapshot = await getDocs(categoryQuery);
    categorySnapshot.forEach(doc => {
      categoryNames[doc.id] = doc.data().category_name;
    });

    let unseenPostCount = 0;
    postsSnapshot.forEach(postDoc => {
      if (!seenPostIds.includes(postDoc.id)) {
        unseenPostCount++;
        const postData = postDoc.data();
        const categoryName = categoryNames[postData.category_id] || "Unknown Category";
        const notification = document.createElement("div");
        notification.classList.add("post-button");
        notification.textContent = `${categoryName}: ${postData.title}`;
        notification.addEventListener("click", async () => {
          await addSeenPost(loggedInUserId, postDoc.id);
          notification.remove();
          fetchNotifications(loggedInUserId);
        });
        notificationsContainer.appendChild(notification);
      }
    });

    updateNotificationCounter(unseenPostCount);
  } catch (error) {
    console.error("Error fetching notifications:", error);
  }
}

/*─────────────────────────────────────*/
/* 4. Mark a Post as Seen in Firestore */
async function addSeenPost(userId, postId) {
  try {
    await setDoc(doc(db, "SeenPosts", `${userId}_${postId}`), {
      user_id: userId,
      post_id: postId,
      seen_at: new Date()
    });
  } catch (error) {
    console.error("Error marking post as seen:", error);
  }
}

/*─────────────────────────────────────*/
/* 5. Update the Notification Counter UI */
function updateNotificationCounter(count) {
  const bellIcon = document.querySelector(".bell");
  const existingCounter = document.querySelector(".notification-counter");
  if (existingCounter) existingCounter.remove();
  
  if (count > 0) {
    const counter = document.createElement("span");
    counter.classList.add("notification-counter");
    counter.textContent = count;
    counter.style.position = "absolute";
    counter.style.top = "0px";
    counter.style.right = "-10px";
    counter.style.background = "red";
    counter.style.color = "white";
    counter.style.padding = "5px";
    counter.style.borderRadius = "50%";
    counter.style.fontSize = "12px";
    counter.style.width = "20px";
    counter.style.height = "20px";
    counter.style.textAlign = "center";
    bellIcon.style.position = "relative";
    bellIcon.appendChild(counter);
  }
}

/*─────────────────────────────────────*/
/* 6. Fetch Posts from Followed Categories (Updated to Use `media_url` & Resize Videos) */
async function fetchFollowedPosts(loggedInUserId) {
  try {
    const postsContainer = document.querySelector(".posts") || document.getElementById("postsContainer");
    const userCategoryQuery = query(collection(db, "UserCategory"), where("user_id", "==", loggedInUserId));
    const followedCategoriesSnapshot = await getDocs(userCategoryQuery);

    if (followedCategoriesSnapshot.empty) {
      postsContainer.innerHTML = "<p>You are not following any categories.</p>";
      return;
    }

    const followedCategoryIds = followedCategoriesSnapshot.docs.map(doc => doc.data().category_id);
    const postsQuery = query(collection(db, "Posts"), where("category_id", "in", followedCategoryIds));
    const postsSnapshot = await getDocs(postsQuery);

    postsContainer.innerHTML = "";

    postsSnapshot.forEach(postDoc => {
      const post = postDoc.data();
      const postElement = document.createElement("div");
      postElement.classList.add("post-button");

      postElement.innerHTML = `<h3>${post.title}</h3>`;

      if (post.type === "audio") {
        postElement.innerHTML += `<audio controls src="${post.media_url}" crossorigin="anonymous"></audio>`;
      } else if (post.type === "video") {
        postElement.innerHTML += `<video controls width="400px" height="250px" src="${post.media_url}"></video>`;
      } else {
        postElement.innerHTML += `<p>${post.content}</p>`;
      }

      postsContainer.appendChild(postElement);
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
  }
}
