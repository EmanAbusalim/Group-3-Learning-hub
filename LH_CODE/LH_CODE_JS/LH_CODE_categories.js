import { db } from "../LH_CODE_JS/LH_CODE_FirebaseConfig.js"; 
import { collection, getDocs, query, where, setDoc, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/** ✅ Ensure Follow Status Loads on Page Start */
document.addEventListener("DOMContentLoaded", async () => {
    const loggedInUserId = sessionStorage.getItem("loggedInUserId");
    if (!loggedInUserId) {
        window.location.replace("../LH_CODE_HTML/LH_CODE_LOGIN.html");
        return;
    }

    await loadCategories();

    if (categorySelect.options.length > 0) {
        categorySelect.selectedIndex = 0;
        updateFollowButtonText();
    }
});

const categorySelect = document.getElementById("categorySelect");
const postsContainer = document.getElementById("postsContainer");
const publishSelect = document.getElementById("publishSelect");
const followButton = document.querySelector(".follow-btn");
const usernameDisplay = document.querySelector(".username");

/** ✅ Fetch Username Dynamically */
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

/** ✅ Load Username on Page Load */
document.addEventListener("DOMContentLoaded", () => {
    const loggedInUserId = sessionStorage.getItem("loggedInUserId");
    if (!loggedInUserId) {
        window.location.replace("../LH_CODE_HTML/LH_CODE_LOGIN.html");
    } else {
        fetchUsername(loggedInUserId);
        loadCategories();
    }
});

/** ✅ Load Categories into Dropdown */
async function loadCategories() {
    try {
        const categoryQuery = query(collection(db, "Categories"));
        const categorySnapshot = await getDocs(categoryQuery);

        categorySelect.innerHTML = "";

        if (categorySnapshot.empty) {
            categorySelect.innerHTML = "<option disabled>No categories found</option>";
            return;
        }

        categorySnapshot.forEach((doc) => {
            const category = doc.data();
            const option = document.createElement("option");
            option.value = doc.id;
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

/** ✅ Fetch Posts Dynamically */
async function fetchPosts(categoryId) {
    console.log("Fetching posts for category:", categoryId);

    try {
        const postsQuery = query(collection(db, "Posts"), where("category_id", "==", categoryId));
        const postsSnapshot = await getDocs(postsQuery);

        postsContainer.innerHTML = "";

        if (postsSnapshot.empty) {
            postsContainer.innerHTML = "<p>No posts available.</p>";
            return;
        }

        postsSnapshot.forEach((doc) => {
            const post = doc.data();
            const postElement = document.createElement("div");
            postElement.classList.add("post");

            // ✅ Add bold header for title
            const titleElement = document.createElement("h3");
            titleElement.textContent = post.title;
            postElement.appendChild(titleElement);

            // ✅ Add content below
            const contentElement = document.createElement("p");
            contentElement.textContent = post.content;
            postElement.appendChild(contentElement);

            postsContainer.appendChild(postElement);
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        postsContainer.innerHTML = "<p>Error loading posts</p>";
    }
}

/** ✅ Handle Category Change */
categorySelect.addEventListener("change", () => {
    fetchPosts(categorySelect.value);
    updateFollowButtonText();
});

/** ✅ Handle Publish Selection */
publishSelect.addEventListener("change", () => {
    const selectedValue = publishSelect.value;
    if (selectedValue) {
        window.location.href = selectedValue;
    }
});

/** ✅ Handle Follow/Unfollow */
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
            // ✅ Unfollow if already following
            await deleteDoc(followDocRef);
            followButton.textContent = "Follow";
            alert(`You have unfollowed ${categorySelect.options[categorySelect.selectedIndex].text}.`);
        } else {
            // ✅ Follow if not already following
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

/** ✅ Check Follow Status */
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

        if (followDocSnap.exists()) {
            followButton.textContent = "Following";
        } else {
            followButton.textContent = "Follow";
        }
    } catch (error) {
        console.error("Error checking follow status:", error);
        followButton.textContent = "Follow"; 
    }
}

/** ✅ Ensure Follow Status Updates on Page Load */
document.addEventListener("DOMContentLoaded", () => {
    updateFollowButtonText();
});
