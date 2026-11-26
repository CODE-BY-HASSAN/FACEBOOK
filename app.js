const STORAGE_KEYS = {
  USERS: "fb_users",
  SESSION: "fb_session",
  POSTS: "fb_posts",
};

let currentUser = null;
let users = [];
let posts = [];
let pendingImage = null; 

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const Storage = {
  get(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Storage error:", e);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function escapeHTML(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

let toastTimer = null;
function showToast(message, type = "") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}



function initAuth() {
  users = Storage.get(STORAGE_KEYS.USERS, []);
  currentUser = Storage.get(STORAGE_KEYS.SESSION, null);


  $("#loginForm").addEventListener("submit", handleLogin);


  $("#showRegisterBtn").addEventListener("click", () => {
    $("#loginForm").classList.add("hidden");
    $("#registerForm").classList.remove("hidden");
    $("#regName").focus();
  });


  $("#backToLoginBtn").addEventListener("click", () => {
    $("#registerForm").classList.add("hidden");
    $("#loginForm").classList.remove("hidden");
    clearRegisterForm();
  });


  $("#registerForm").addEventListener("submit", handleRegister);


  $("#logoutBtn").addEventListener("click", handleLogout);


  if (currentUser) {
    showApp();
  } else {
    showAuth();
  }
}

function handleLogin(e) {
  e.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;

  if (!email || !password) {
    showToast("Please fill in all fields", "error");
    return;
  }
  if (!isValidEmail(email)) {
    showToast("Please enter a valid email", "error");
    return;
  }

  const user = users.find((u) => u.email === email);
  if (!user) {
    showToast("No account found with this email", "error");
    return;
  }
  if (user.password !== password) {
    showToast("Incorrect password", "error");
    return;
  }

  currentUser = { id: user.id, name: user.name, email: user.email };
  Storage.set(STORAGE_KEYS.SESSION, currentUser);
  showToast(`Welcome back, ${user.name.split(" ")[0]}!`, "success");

  $("#loginEmail").value = "";
  $("#loginPassword").value = "";
  showApp();
}

function handleRegister(e) {
  e.preventDefault();
  const name = $("#regName").value.trim();
  const email = $("#regEmail").value.trim().toLowerCase();
  const password = $("#regPassword").value;
  const confirm = $("#regConfirm").value;

  if (!name || !email || !password || !confirm) {
    showToast("Please fill in all fields", "error");
    return;
  }
  if (name.length < 3) {
    showToast("Name must be at least 3 characters", "error");
    return;
  }
  if (!isValidEmail(email)) {
    showToast("Please enter a valid email address", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "error");
    return;
  }
  if (password !== confirm) {
    showToast("Passwords do not match", "error");
    return;
  }
  if (users.some((u) => u.email === email)) {
    showToast("An account with this email already exists", "error");
    return;
  }

 
  const newUser = {
    id: generateId(),
    name,
    email,
    password,
    createdAt: Date.now(),
  };
  users.push(newUser);
  Storage.set(STORAGE_KEYS.USERS, users);

  currentUser = { id: newUser.id, name: newUser.name, email: newUser.email };
  Storage.set(STORAGE_KEYS.SESSION, currentUser);

  showToast("Account created successfully!", "success");
  clearRegisterForm();
  showApp();
}

function handleLogout() {
  if (!confirm("Are you sure you want to log out?")) return;
  currentUser = null;
  Storage.remove(STORAGE_KEYS.SESSION);
  showAuth();
  showToast("Logged out successfully", "success");
}

function clearRegisterForm() {
  $("#regName").value = "";
  $("#regEmail").value = "";
  $("#regPassword").value = "";
  $("#regConfirm").value = "";
}



function showAuth() {
  $("#authScreen").classList.remove("hidden");
  $("#mainApp").classList.add("hidden");
  $("#loginForm").classList.remove("hidden");
  $("#registerForm").classList.add("hidden");
}

function showApp() {
  $("#authScreen").classList.add("hidden");
  $("#mainApp").classList.remove("hidden");
  renderUserUI();
  loadPosts();
  renderFeed();
  initComposer();
}

function renderUserUI() {
  if (!currentUser) return;
  const initials = getInitials(currentUser.name);
  $("#navAvatar").textContent = initials;
  $("#sidebarAvatar").textContent = initials;
  $("#composerAvatar").textContent = initials;
  $("#modalAvatar").textContent = initials;
  $("#sidebarName").textContent = currentUser.name;
  $("#modalUserName").textContent = currentUser.name;
}



function loadPosts() {
  posts = Storage.get(STORAGE_KEYS.POSTS, []);
}

function savePosts() {
  Storage.set(STORAGE_KEYS.POSTS, posts);
}

function renderFeed() {
  const container = $("#feedContainer");
  const empty = $("#emptyFeed");
  container.innerHTML = "";

  if (posts.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  posts.forEach((post) => {
    container.appendChild(createPostElement(post));
  });
}

function createPostElement(post) {
  const liked = post.likes.includes(currentUser.id);
  const likeCount = post.likes.length;

  const card = document.createElement("article");
  card.className = "post-card";
  card.dataset.id = post.id;

  card.innerHTML = `
    <div class="post-header">
      <div class="avatar-md">${escapeHTML(getInitials(post.authorName))}</div>
      <div class="post-author-info">
        <div class="post-author">${escapeHTML(post.authorName)}</div>
        <div class="post-time">${timeAgo(post.createdAt)} · 🌍</div>
      </div>
      <button class="post-more" title="More">⋯</button>
    </div>
    ${post.text ? `<div class="post-content">${escapeHTML(post.text)}</div>` : ""}
    ${post.image ? `<img class="post-image" src="${post.image}" alt="Post image" />` : ""}
    <div class="post-stats">
      <span>👍 ${likeCount} ${likeCount === 1 ? "Like" : "Likes"}</span>
      <span>${post.comments || 0} comments</span>
    </div>
    <div class="post-actions">
      <button class="post-action-btn like-btn ${liked ? "liked" : ""}">
        ${liked ? "💙" : "👍"} Like
      </button>
      <button class="post-action-btn comment-btn">💬 Comment</button>
      <button class="post-action-btn share-btn">↗️ Share</button>
    </div>
  `;

  card.querySelector(".like-btn").addEventListener("click", () => toggleLike(post.id));

  card.querySelector(".comment-btn").addEventListener("click", () => {
    showToast("Comments coming soon!", "");
  });

  card.querySelector(".share-btn").addEventListener("click", () => {
    showToast("Link copied to clipboard!", "success");
    navigator.clipboard?.writeText(location.href).catch(() => {});
  });

  return card;
}

function toggleLike(postId) {
  const post = posts.find((p) => p.id === postId);
  if (!post) return;

  const idx = post.likes.indexOf(currentUser.id);
  if (idx >= 0) {
    post.likes.splice(idx, 1);
  } else {
    post.likes.push(currentUser.id);
  }
  savePosts();
  renderFeed();
}



function initComposer() {
  $("#openComposerBtn").addEventListener("click", openComposer);
  $("#closeComposerBtn").addEventListener("click", closeComposer);
  $("#publishPostBtn").addEventListener("click", publishPost);
  $("#imageInput").addEventListener("change", handleImageSelect);
  $("#removeImageBtn").addEventListener("click", removeImage);

  $("#composerModal").addEventListener("click", (e) => {
    if (e.target.id === "composerModal") closeComposer();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#composerModal").classList.contains("hidden")) {
      closeComposer();
    }
  });

  $("#photoAction").addEventListener("click", () => {
    openComposer();
    setTimeout(() => $("#imageInput").click(), 100);
  });
  $("#videoAction").addEventListener("click", () => showToast("Video upload coming soon", ""));
  $("#feelingAction").addEventListener("click", () => showToast("Feelings coming soon", ""));
}

function openComposer() {
  $("#composerModal").classList.remove("hidden");
  $("#postText").value = "";
  removeImage();
  setTimeout(() => $("#postText").focus(), 100);
}

function closeComposer() {
  $("#composerModal").classList.add("hidden");
  $("#postText").value = "";
  removeImage();
}

function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast("Image must be under 5MB", "error");
    e.target.value = "";
    return;
  }
  if (!file.type.startsWith("image/")) {
    showToast("Please select an image file", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingImage = ev.target.result;
    $("#previewImg").src = pendingImage;
    $("#imagePreview").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
  e.target.value = ""; 
}

function removeImage() {
  pendingImage = null;
  $("#imagePreview").classList.add("hidden");
  $("#previewImg").src = "";
}

function publishPost() {
  const text = $("#postText").value.trim();
  if (!text && !pendingImage) {
    showToast("Write something or add a photo", "error");
    return;
  }

  const post = {
    id: generateId(),
    authorId: currentUser.id,
    authorName: currentUser.name,
    text,
    image: pendingImage,
    likes: [],
    comments: 0,
    createdAt: Date.now(),
  };

  posts.unshift(post);
  savePosts();
  closeComposer();
  renderFeed();
  showToast("Post published!", "success");
}


function initSearch() {
  $("#searchInput").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      renderFeed();
      return;
    }
    const filtered = posts.filter(
      (p) =>
        p.text.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q)
    );
    const container = $("#feedContainer");
    container.innerHTML = "";
    if (filtered.length === 0) {
      $("#emptyFeed").classList.remove("hidden");
      $("#emptyFeed").querySelector("p").textContent = "No posts match your search.";
    } else {
      $("#emptyFeed").classList.add("hidden");
      filtered.forEach((p) => container.appendChild(createPostElement(p)));
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initSearch();
  initComposer();
});