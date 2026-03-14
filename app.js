import { db } from "./firebase.js";
import {
  ref, push, onValue, remove, update, set, get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ─── Константы ─────────────────────────────────────────────
const LOCATIONS = [
  { id: "home",      emoji: "🏠", label: "Дома" },
  { id: "room",      emoji: "🛋️", label: "В комнате" },
  { id: "uni",       emoji: "🎓", label: "В универе" },
  { id: "street",    emoji: "🚶", label: "На улице" },
  { id: "cafe",      emoji: "☕", label: "В кафе" },
  { id: "transport", emoji: "🚌", label: "В транспорте" },
  { id: "gym",       emoji: "🏋️", label: "В зале" },
  { id: "sleep",     emoji: "😴", label: "Сплю" },
];

const EMOJI_CATS = [
  { tab: "😊", list: ["😀","😂","🥰","😍","🤩","😎","🥺","😭","😤","😡","🤔","😏","🙄","😴","🤯","🥳","😇","🤗","😬","🫡","😵","🤫","🫢","😲","🥸","🤓","😈","👻","💩","🤡"] },
  { tab: "👋", list: ["👋","🤝","👍","👎","❤️","🔥","💯","✨","🎉","🙏","💪","🫶","👀","💀","🤌","🫠","💅","🫣","🤭","😮‍💨","🫰","🤙","✌️","🤞","🫵","👏","🙌","🤲","🫱","🫲"] },
  { tab: "🐶", list: ["🐶","🐱","🐻","🦊","🐼","🐨","🐯","🦁","🐸","🐧","🦋","🌸","🌈","⭐","🌙","☀️","🍕","🍔","🍦","🎮","🚀","🌍","🎵","🎶","🍜","🍣","🧋","🍩","🎂","🌺"] },
];

const STICKER_PACKS = [
  { tab: "😂", list: ["😂","😭","🥺","😍","🤩","😤","🥳","😎","🤯","🫡","💀","🫶","🤌","😮‍💨","🫠","🥹","😵‍💫","🤪","🧐","😤","🤬","🥶","🥵","🫨","🤑","😝","😜","🤣","😹","🙈"] },
  { tab: "❤️", list: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","🫀","❤️‍🔥","❤️‍🩹","💋","😘","🥰","😻","💑","👫","🌹","🫦"] },
  { tab: "🎉", list: ["🎉","🎊","🎈","🎁","🏆","🥇","⭐","🌟","💫","✨","🔥","💥","🌈","🎯","🎮","🎵","🎶","🍕","🍔","🎂","🥂","🍾","🎠","🎪","🎭","🎨","🎬","🎤","🎸","🥳"] },
];

const QUICK_REACTIONS = ["❤️","😂","👍","😮","😢","🔥","🥺","🤯"];

// ─── Состояние ─────────────────────────────────────────────
let username   = localStorage.getItem("chat_username") || "";
let myAvatar   = localStorage.getItem("chat_avatar")   || "";   // base64
let myStatus   = JSON.parse(localStorage.getItem("chat_status") || "null") || LOCATIONS[0];
let emojiTab   = 0;
let stickerTab = 0;

// Кэш аватаров собеседника (имя → base64)
const avatarCache = {};

// ─── DOM ───────────────────────────────────────────────────
const loginScreen       = document.getElementById("login-screen");
const chatScreen        = document.getElementById("chat-screen");
const nameInputEl       = document.getElementById("name-input");
const loginBtn          = document.getElementById("login-btn");
const loginAvatarPick   = document.getElementById("login-avatar-pick");
const loginAvatarInput  = document.getElementById("login-avatar-input");

const messagesEl        = document.getElementById("messages");
const emptyState        = document.getElementById("empty-state");
const msgInputEl        = document.getElementById("msg-input");
const sendBtn           = document.getElementById("send-btn");

const otherAvatarWrap   = document.getElementById("other-avatar-wrap");
const otherAvatarImg    = document.getElementById("other-avatar-img");
const otherAvatarLetter = document.getElementById("other-avatar-letter");
const otherNameEl       = document.getElementById("other-name");
const otherStatusEl     = document.getElementById("other-status");

const myProfileBtn      = document.getElementById("my-profile-btn");
const myAvatarWrap      = document.getElementById("my-avatar-wrap");
const myAvatarImg       = document.getElementById("my-avatar-img");
const myAvatarLetter    = document.getElementById("my-avatar-letter");
const displayUsername   = document.getElementById("display-username");

const profileModal      = document.getElementById("profile-modal");
const modalAvatarPreview= document.getElementById("modal-avatar-preview");
const modalAvatarImg    = document.getElementById("modal-avatar-img");
const modalAvatarLetter = document.getElementById("modal-avatar-letter");
const modalAvatarInput  = document.getElementById("modal-avatar-input");
const modalNameInput    = document.getElementById("modal-name-input");
const modalSaveBtn      = document.getElementById("modal-save-btn");
const modalCancelBtn    = document.getElementById("modal-cancel-btn");

const statusBtn         = document.getElementById("status-btn");
const statusDropdown    = document.getElementById("status-dropdown");
const myStatusEmoji     = document.getElementById("my-status-emoji");
const myStatusLabel     = document.getElementById("my-status-label");

const emojiBtnEl        = document.getElementById("emoji-btn");
const stickerBtnEl      = document.getElementById("sticker-btn");
const emojiPanel        = document.getElementById("emoji-panel");
const stickerPanel      = document.getElementById("sticker-panel");
const emojiTabsEl       = document.getElementById("emoji-tabs");
const stickerTabsEl     = document.getElementById("sticker-tabs");
const emojiGridEl       = document.getElementById("emoji-grid");
const stickerGridEl     = document.getElementById("sticker-grid");
const reactionPopup     = document.getElementById("reaction-popup");

// ─── Утилиты ───────────────────────────────────────────────
const formatTime = ts => new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const initial    = name => name ? name[0].toUpperCase() : "?";
const userSlot   = name => "slot_" + (name.charCodeAt(0) % 4);

// Сжать изображение до base64 (max 120×120, качество 0.7)
function compressImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const size = 120;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        // Crop to square
        const min = Math.min(img.width, img.height);
        const sx  = (img.width  - min) / 2;
        const sy  = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Применить аватар к элементу (img + letter)
function applyAvatar(imgEl, letterEl, avatarB64, name) {
  if (avatarB64) {
    imgEl.src = avatarB64;
    imgEl.hidden = false;
    letterEl.style.display = "none";
  } else {
    imgEl.hidden = true;
    letterEl.style.display = "";
    letterEl.textContent = initial(name);
  }
}

// ─── Инициализация ─────────────────────────────────────────
function init() {
  buildStatusDropdown();
  buildEmojiPicker();
  buildStickerPicker();
  applyAvatar(myAvatarImg, myAvatarLetter, myAvatar, username);
  displayUsername.textContent = username || "...";
  myStatusEmoji.textContent   = myStatus.emoji;
  myStatusLabel.textContent   = myStatus.label;

  // Превью аватара на экране входа
  loginAvatarPick.addEventListener("click", () => loginAvatarInput.click());
  loginAvatarInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await compressImage(file);
    myAvatar = b64;
    // Показываем превью
    let img = loginAvatarPick.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      loginAvatarPick.appendChild(img);
      loginAvatarPick.querySelector(".avatar-pick-icon").style.display = "none";
      loginAvatarPick.querySelector(".avatar-pick-hint").style.display = "none";
    }
    img.src = b64;
    Object.assign(img.style, { position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" });
  });

  if (username) showChat();
}

// ─── Вход ──────────────────────────────────────────────────
loginBtn.addEventListener("click", doLogin);
nameInputEl.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

function doLogin() {
  const name = nameInputEl.value.trim();
  if (!name) return;
  username = name;
  localStorage.setItem("chat_username", name);
  if (myAvatar) localStorage.setItem("chat_avatar", myAvatar);
  showChat();
}

function showChat() {
  loginScreen.classList.remove("active");
  chatScreen.classList.add("active");
  applyAvatar(myAvatarImg, myAvatarLetter, myAvatar, username);
  displayUsername.textContent = username;
  subscribeMessages();
  subscribeStatuses();
  publishProfile();
}

// ─── Профиль (аватар + имя) → Firebase ────────────────────
function publishProfile() {
  if (!username) return;
  set(ref(db, `profiles/${userSlot(username)}`), {
    name:   username,
    avatar: myAvatar || "",
    ...myStatus,
    ts: Date.now(),
  });
}

function subscribeStatuses() {
  onValue(ref(db, "profiles"), snap => {
    const data = snap.val() || {};
    const others = Object.values(data).filter(p => p.name !== username);
    if (others.length > 0) {
      const o = others[0];
      // Обновить шапку
      otherNameEl.textContent = o.name;
      otherStatusEl.textContent = `${o.emoji || ""} ${o.label || ""}`.trim() || "онлайн";
      applyAvatar(otherAvatarImg, otherAvatarLetter, o.avatar, o.name);
      // Кэш
      avatarCache[o.name] = o.avatar || "";
    } else {
      otherNameEl.textContent   = "Ожидание...";
      otherStatusEl.textContent = "нет собеседника";
      applyAvatar(otherAvatarImg, otherAvatarLetter, "", "?");
    }
  });
}

// ─── Модалка профиля ───────────────────────────────────────
myProfileBtn.addEventListener("click", openProfileModal);
modalCancelBtn.addEventListener("click", () => profileModal.classList.add("hidden"));
profileModal.addEventListener("click", e => { if (e.target === profileModal) profileModal.classList.add("hidden"); });

function openProfileModal() {
  modalNameInput.value = username;
  applyAvatar(modalAvatarImg, modalAvatarLetter, myAvatar, username);
  profileModal.classList.remove("hidden");
}

modalAvatarPreview.addEventListener("click", () => modalAvatarInput.click());
modalAvatarInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const b64 = await compressImage(file);
  myAvatar = b64;
  applyAvatar(modalAvatarImg, modalAvatarLetter, b64, username);
});

modalSaveBtn.addEventListener("click", async () => {
  const newName = modalNameInput.value.trim();
  if (!newName) return;

  // Сохраняем аватар
  if (myAvatar) localStorage.setItem("chat_avatar", myAvatar);
  applyAvatar(myAvatarImg, myAvatarLetter, myAvatar, newName);

  // Меняем имя если изменилось
  if (newName !== username) {
    const snap = await new Promise(res => onValue(ref(db, "messages"), res, { onlyOnce: true }));
    const data = snap.val() || {};
    const upd  = {};
    Object.entries(data).forEach(([id, msg]) => {
      if (msg.author === username) upd[`messages/${id}/author`] = newName;
    });
    if (Object.keys(upd).length) await update(ref(db), upd);
    await remove(ref(db, `profiles/${userSlot(username)}`));
    username = newName;
    localStorage.setItem("chat_username", newName);
    displayUsername.textContent = newName;
  }

  publishProfile();
  profileModal.classList.add("hidden");
});

// ─── Статус ────────────────────────────────────────────────
function buildStatusDropdown() {
  LOCATIONS.forEach(loc => {
    const btn = document.createElement("button");
    btn.className = "status-option" + (loc.id === myStatus.id ? " active" : "");
    btn.dataset.id = loc.id;
    btn.innerHTML = `<span class="loc-emoji">${loc.emoji}</span><span>${loc.label}</span>${loc.id === myStatus.id ? '<span class="check">✓</span>' : ""}`;
    btn.addEventListener("click", () => setStatus(loc));
    statusDropdown.appendChild(btn);
  });
}

statusBtn.addEventListener("click", e => { e.stopPropagation(); statusDropdown.classList.toggle("open"); });

function setStatus(loc) {
  myStatus = loc;
  localStorage.setItem("chat_status", JSON.stringify(loc));
  myStatusEmoji.textContent = loc.emoji;
  myStatusLabel.textContent = loc.label;
  document.querySelectorAll(".status-option").forEach(btn => {
    const active = btn.dataset.id === loc.id;
    btn.classList.toggle("active", active);
    const btnLoc = LOCATIONS.find(l => l.id === btn.dataset.id);
    if (btnLoc) {
      btn.innerHTML = `<span class="loc-emoji">${btnLoc.emoji}</span><span>${btnLoc.label}</span>${active ? '<span class="check">\u2713</span>' : ""}`;
    }
  });
  statusDropdown.classList.remove("open");
  publishProfile();
}

// ─── Сообщения ─────────────────────────────────────────────
function subscribeMessages() {
  onValue(ref(db, "messages"), snap => {
    const data = snap.val() || {};
    const msgs = Object.entries(data)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.ts - b.ts);
    renderMessages(msgs);
  });
}

function renderMessages(msgs) {
  messagesEl.innerHTML = "";
  if (!msgs.length) { messagesEl.appendChild(emptyState); emptyState.style.display = "block"; return; }
  emptyState.style.display = "none";

  let i = 0;
  while (i < msgs.length) {
    const author  = msgs[i].author;
    const isMine  = author === username;
    const group   = [];
    while (i < msgs.length && msgs[i].author === author) { group.push(msgs[i]); i++; }

    const groupEl = document.createElement("div");
    groupEl.className = `msg-group ${isMine ? "mine" : "theirs"}`;

    // Имя над первым сообщением
    const authorEl = document.createElement("div");
    authorEl.className = "msg-author";
    authorEl.textContent = author;
    groupEl.appendChild(authorEl);

    // Аватар для группы
    const av     = isMine ? myAvatar : (avatarCache[author] || "");
    const avName = author;

    group.forEach((msg, idx) => {
      const isSticker = msg.type === "sticker";
      const rowEl = document.createElement("div");
      rowEl.className = "msg-row";

      // Аватар (только рядом с последним в группе, остальные — невидимые)
      const avatarEl = document.createElement("div");
      avatarEl.className = "msg-avatar" + (idx < group.length - 1 ? " invisible" : "");
      if (av) {
        const img = document.createElement("img");
        img.src = av; img.alt = avName;
        avatarEl.appendChild(img);
      } else {
        avatarEl.textContent = initial(avName);
      }

      // Пузырь
      const bubble = document.createElement("div");
      bubble.className = "msg-bubble" + (isSticker ? " sticker" : (idx > 0 ? " grouped" : ""));
      bubble.textContent = msg.text;
      bubble.addEventListener("click",       e => { e.stopPropagation(); openReactionPopup(msg.id, bubble); });
      bubble.addEventListener("contextmenu", e => { e.preventDefault();  openReactionPopup(msg.id, bubble); });

      // Удалить
      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "✕";
      delBtn.title = "Удалить";
      delBtn.addEventListener("click", () => deleteMsg(msg.id));

      if (isMine) {
        rowEl.appendChild(delBtn);
        rowEl.appendChild(bubble);
        rowEl.appendChild(avatarEl);
      } else {
        rowEl.appendChild(avatarEl);
        rowEl.appendChild(bubble);
        rowEl.appendChild(delBtn);
      }
      groupEl.appendChild(rowEl);
    });

    // Блок реакций для каждого сообщения
    group.forEach(msg => {
      const rRow = document.createElement("div");
      rRow.className = "reactions-row";
      rRow.id = `reactions-${msg.id}`;
      groupEl.appendChild(rRow);
    });

    // Время
    const timeEl = document.createElement("div");
    timeEl.className = "msg-time";
    timeEl.textContent = formatTime(group[group.length - 1].ts);
    groupEl.appendChild(timeEl);

    messagesEl.appendChild(groupEl);
  }

  subscribeReactions(msgs);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ─── Реакции ───────────────────────────────────────────────
function subscribeReactions(msgs) {
  onValue(ref(db, "reactions"), snap => {
    const data = snap.val() || {};
    msgs.forEach(msg => {
      const rowEl = document.getElementById(`reactions-${msg.id}`);
      if (!rowEl) return;
      rowEl.innerHTML = "";
      const msgReactions = data[msg.id.toString().replace(/\./g,"_")] || {};
      Object.entries(msgReactions).forEach(([emoji, users]) => {
        if (!users || !Object.keys(users).length) return;
        const userList = Object.values(users);
        const iMine    = userList.includes(username);
        const chip = document.createElement("button");
        chip.className = "reaction-chip" + (iMine ? " mine-reaction" : "");
        chip.innerHTML = `${emoji} <span class="count">${userList.length}</span>`;
        chip.addEventListener("click", () => toggleReaction(msg.id, emoji));
        rowEl.appendChild(chip);
      });
    });
  });
}

function openReactionPopup(msgId, anchor) {
  reactionPopup.innerHTML = "";
  QUICK_REACTIONS.forEach(emoji => {
    const btn = document.createElement("button");
    btn.textContent = emoji;
    btn.addEventListener("click", () => { toggleReaction(msgId, emoji); closeReactionPopup(); });
    reactionPopup.appendChild(btn);
  });
  const rect = anchor.getBoundingClientRect();
  reactionPopup.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 320)) + "px";
  reactionPopup.style.top  = (rect.top - 56) + "px";
  reactionPopup.classList.remove("hidden");
}

function closeReactionPopup() { reactionPopup.classList.add("hidden"); }

async function toggleReaction(msgId, emoji) {
  const safeId = msgId.toString().replace(/\./g,"_");
  const path   = `reactions/${safeId}/${emoji}/${username}`;
  const snap   = await get(ref(db, path));
  if (snap.exists()) { await remove(ref(db, path)); }
  else               { await set(ref(db, path), true); }
}

async function deleteMsg(id) {
  await remove(ref(db, `messages/${id}`));
  await remove(ref(db, `reactions/${id.toString().replace(/\./g,"_")}`));
}

// ─── Отправка ──────────────────────────────────────────────
msgInputEl.addEventListener("input", () => {
  sendBtn.classList.toggle("ready", msgInputEl.value.trim().length > 0);
  msgInputEl.style.height = "auto";
  msgInputEl.style.height = Math.min(msgInputEl.scrollHeight, 120) + "px";
});
msgInputEl.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
sendBtn.addEventListener("click", () => sendMessage());

async function sendMessage(text, type = "text") {
  const content = (typeof text === "string") ? text : msgInputEl.value.trim();
  if (!content || !username) return;
  await push(ref(db, "messages"), { author: username, text: content, type: type || "text", ts: Date.now() });
  if (!text) {
    msgInputEl.value = ""; msgInputEl.style.height = "auto";
    sendBtn.classList.remove("ready"); msgInputEl.focus();
  }
}

// ─── Эмодзи пикер ──────────────────────────────────────────
function buildEmojiPicker() {
  EMOJI_CATS.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "panel-tab" + (i === 0 ? " active" : "");
    btn.textContent = cat.tab;
    btn.addEventListener("click", () => { emojiTab = i; renderEmojiGrid(); updateTabUI(emojiTabsEl, i); });
    emojiTabsEl.appendChild(btn);
  });
  renderEmojiGrid();
}
function renderEmojiGrid() {
  emojiGridEl.innerHTML = "";
  EMOJI_CATS[emojiTab].list.forEach(e => {
    const btn = document.createElement("button");
    btn.className = "emoji-btn"; btn.textContent = e;
    btn.addEventListener("click", () => { msgInputEl.value += e; msgInputEl.focus(); sendBtn.classList.toggle("ready", msgInputEl.value.trim().length > 0); });
    emojiGridEl.appendChild(btn);
  });
}
emojiBtnEl.addEventListener("click", e => { e.stopPropagation(); const open = !emojiPanel.classList.contains("hidden"); closeAllPickers(); if (!open) { emojiPanel.classList.remove("hidden"); emojiBtnEl.classList.add("active"); } });

// ─── Стикер пикер ──────────────────────────────────────────
function buildStickerPicker() {
  STICKER_PACKS.forEach((pack, i) => {
    const btn = document.createElement("button");
    btn.className = "panel-tab" + (i === 0 ? " active" : "");
    btn.textContent = pack.tab;
    btn.addEventListener("click", () => { stickerTab = i; renderStickerGrid(); updateTabUI(stickerTabsEl, i); });
    stickerTabsEl.appendChild(btn);
  });
  renderStickerGrid();
}
function renderStickerGrid() {
  stickerGridEl.innerHTML = "";
  STICKER_PACKS[stickerTab].list.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "sticker-btn"; btn.textContent = s;
    btn.addEventListener("click", () => { sendMessage(s, "sticker"); closeAllPickers(); });
    stickerGridEl.appendChild(btn);
  });
}
stickerBtnEl.addEventListener("click", e => { e.stopPropagation(); const open = !stickerPanel.classList.contains("hidden"); closeAllPickers(); if (!open) { stickerPanel.classList.remove("hidden"); stickerBtnEl.classList.add("active"); } });

// ─── Хелперы ───────────────────────────────────────────────
function updateTabUI(container, activeIdx) {
  container.querySelectorAll(".panel-tab").forEach((btn, i) => btn.classList.toggle("active", i === activeIdx));
}
function closeAllPickers() {
  emojiPanel.classList.add("hidden"); stickerPanel.classList.add("hidden");
  emojiBtnEl.classList.remove("active"); stickerBtnEl.classList.remove("active");
  closeReactionPopup();
}
document.addEventListener("click", () => { statusDropdown.classList.remove("open"); closeAllPickers(); });
[emojiPanel, stickerPanel, statusDropdown, reactionPopup].forEach(el => el.addEventListener("click", e => e.stopPropagation()));

// ─── Старт ─────────────────────────────────────────────────
init();
