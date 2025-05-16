import { db } from './LH_CODE_FirebaseConfig.js';
import { collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function deleteUserPosts(userId) {
  const q = query(collection(db, "Posts"), where("user_id", "==", userId));
  const snapshot = await getDocs(q);
  
  snapshot.forEach(async (doc) => {
    await deleteDoc(doc.ref);
  });
}

// Similar deletePost function