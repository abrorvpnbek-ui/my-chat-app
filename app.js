import { db } from "./firebase.js";
import {
  ref, push, onValue, remove, set, get, onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const LOCATIONS = [
  { id:"home",      emoji:"🏠", label:"Дома" },
  { id:"room",      emoji:"🛋️", label:"В комнате" },
  { id:"uni",       emoji:"🎓", label:"В универе" },
  { id:"street",    emoji:"🚶", label:"На улице" },
  { id:"cafe",      emoji:"☕", label:"В кафе" },
  { id:"transport", emoji:"🚌", label:"В транспорте" },
  { id:"gym",       emoji:"🏋️", label:"В зале" },
  { id:"sleep",     emoji:"😴", label:"Сплю" },
];

const EMOJI_CATS = [
  { tab:"😊", list:["😀","😂","🥰","😍","🤩","😎","🥺","😭","😤","😡","🤔","😏","🙄","😴","🤯","🥳","😇","🤗","😬","🫡","😵","🤫","🫢","😲","🥸","🤓","😈","👻","💩","🤡"] },
  { tab:"👋", list:["👋","🤝","👍","👎","❤️","🔥","💯","✨","🎉","🙏","💪","🫶","👀","💀","🤌","🫠","💅","🫣","🤭","😮‍💨","🫰","🤙","✌️","🤞","🫵","👏","🙌","🤲","🫱","🫲"] },
  { tab:"🐶", list:["🐶","🐱","🐻","🦊","🐼","🐨","🐯","🦁","🐸","🐧","🦋","🌸","🌈","⭐","🌙","☀️","🍕","🍔","🍦","🎮","🚀","🌍","🎵","🎶","🍜","🍣","🧋","🍩","🎂","🌺"] },
];

const STICKER_PACKS = [
  { tab:"😂", list:["😂","😭","🥺","😍","🤩","😤","🥳","😎","🤯","🫡","💀","🫶","🤌","😮‍💨","🫠","🥹","😵‍💫","🤪","🧐","😤","🤬","🥶","🥵","🫨","🤑","😝","😜","🤣","😹","🙈"] },
  { tab:"❤️", list:["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","🫀","❤️‍🔥","❤️‍🩹","💋","😘","🥰","😻","💑","👫","🌹","🫦"] },
  { tab:"🎉", list:["🎉","🎊","🎈","🎁","🏆","🥇","⭐","🌟","💫","✨","🔥","💥","🌈","🎯","🎮","🎵","🎶","🍕","🍔","🎂","🥂","🍾","🎠","🎪","🎭","🎨","🎬","🎤","🎸","🥳"] },
];

const QUICK_REACTIONS = ["❤️","😂","👍","😮","😢","🔥","🥺","🤯"];

let username  = localStorage.getItem("chat_username") || "";
let myAvatar  = localStorage.getItem("chat_avatar")   || "";
let myStatus  = JSON.parse(localStorage.getItem("chat_status")||"null") || LOCATIONS[0];
let emojiTab  = 0;
let stickerTab= 0;
const avatarCache = {};

// DOM
const $ = id => document.getElementById(id);
const loginScreen   = $("login-screen");
const chatScreen    = $("chat-screen");
const nameInput     = $("name-input");
const loginBtn      = $("login-btn");
const loginError    = $("login-error");
const loginAvPick   = $("login-avatar-pick");
const loginAvInput  = $("login-avatar-input");
const messagesEl    = $("messages");
const emptyState    = $("empty-state");
const msgInput      = $("msg-input");
const sendBtn       = $("send-btn");
const otherAvImg    = $("other-av-img");
const otherAvLetter = $("other-av-letter");
const otherName     = $("other-name");
const otherStatus   = $("other-status");
const onlineDot     = $("online-dot");
const profileBtn    = $("my-profile-btn");
const myAvImg       = $("my-av-img");
const myAvLetter    = $("my-av-letter");
const displayUser   = $("display-username");
const profileModal  = $("profile-modal");
const modalAvPrev   = $("modal-av-preview");
const modalAvImg    = $("modal-av-img");
const modalAvLetter = $("modal-av-letter");
const modalAvInput  = $("modal-av-input");
const modalSave     = $("modal-save");
const modalCancel   = $("modal-cancel");
const statusBtn     = $("status-btn");
const statusDD      = $("status-dropdown");
const statusEmoji   = $("my-status-emoji");
const statusLabel   = $("my-status-label");
const emojiBtnEl    = $("emoji-btn");
const stickerBtnEl  = $("sticker-btn");
const emojiPanel    = $("emoji-panel");
const stickerPanel  = $("sticker-panel");
const emojiTabsEl   = $("emoji-tabs");
const stickerTabsEl = $("sticker-tabs");
const emojiGridEl   = $("emoji-grid");
const stickerGridEl = $("sticker-grid");
const reactionPopup = $("reaction-popup");

// Utils
const fmtTime = ts => new Date(ts).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
const initial = n => n ? n[0].toUpperCase() : "?";
const slot    = n => "s_" + (n.charCodeAt(0) % 4);

function compress(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = 120;
        const min = Math.min(img.width, img.height);
        c.getContext("2d").drawImage(img,(img.width-min)/2,(img.height-min)/2,min,min,0,0,120,120);
        res(c.toDataURL("image/jpeg",.7));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

function applyAv(imgEl, letEl, b64, name) {
  if (b64) {
    imgEl.src = b64; imgEl.style.display = "block";
    letEl.style.display = "none";
  } else {
    imgEl.style.display = "none";
    letEl.style.display = "";
    letEl.textContent = initial(name);
  }
}

// Init
function init() {
  buildStatus();
  buildEmoji();
  buildStickers();
  applyAv(myAvImg, myAvLetter, myAvatar, username);
  displayUser.textContent = username || "...";
  statusEmoji.textContent = myStatus.emoji;
  statusLabel.textContent = myStatus.label;

  loginAvPick.onclick = () => loginAvInput.click();
  loginAvInput.onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    myAvatar = await compress(f);
    loginAvPick.style.borderColor = "#c0192a";
    let img = loginAvPick.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      Object.assign(img.style,{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"});
      loginAvPick.appendChild(img);
      loginAvPick.querySelectorAll("span").forEach(s=>s.style.display="none");
    }
    img.src = myAvatar;
  };

  if (username) showChat();
}

// Login
loginBtn.onclick = doLogin;
nameInput.onkeydown = e => { if (e.key==="Enter") doLogin(); };

function doLogin() {
  const name = nameInput.value.trim();
  if (!name) { loginError.textContent="Введите имя"; loginError.style.display="block"; return; }
  loginError.style.display = "none";
  username = name;
  localStorage.setItem("chat_username", name);
  if (myAvatar) localStorage.setItem("chat_avatar", myAvatar);
  showChat();
}

function showChat() {
  loginScreen.classList.remove("active");
  chatScreen.classList.add("active");
  applyAv(myAvImg, myAvLetter, myAvatar, username);
  displayUser.textContent = username;
  subMessages();
  subProfiles();
  publishProfile();
  setupOnline();
}

// Online
function setupOnline() {
  const oRef = ref(db, `online/${username}`);
  set(oRef, true);
  onDisconnect(oRef).remove();
  onValue(ref(db,"online"), snap => {
    const d = snap.val() || {};
    const on = Object.keys(d).some(u => u !== username);
    onlineDot.style.background = on ? "#ef4444" : "#3a1828";
    onlineDot.style.boxShadow  = on ? "0 0 6px #ef444488" : "none";
  });
}

// Profile
function publishProfile() {
  if (!username) return;
  set(ref(db,`profiles/${slot(username)}`), { name:username, avatar:myAvatar||"", ...myStatus, ts:Date.now() });
}

function subProfiles() {
  onValue(ref(db,"profiles"), snap => {
    const others = Object.values(snap.val()||{}).filter(p=>p.name!==username);
    if (others.length) {
      const o = others[0];
      otherName.textContent   = o.name;
      otherStatus.textContent = `${o.emoji||""} ${o.label||""}`.trim() || "онлайн";
      applyAv(otherAvImg, otherAvLetter, o.avatar, o.name);
      avatarCache[o.name] = o.avatar||"";
    } else {
      otherName.textContent   = "Ожидание...";
      otherStatus.textContent = "нет собеседника";
      applyAv(otherAvImg, otherAvLetter, "", "?");
    }
  });
}

// Profile modal
profileBtn.onclick = () => { applyAv(modalAvImg,modalAvLetter,myAvatar,username); profileModal.classList.remove("hidden"); };
modalCancel.onclick = () => profileModal.classList.add("hidden");
profileModal.onclick = e => { if(e.target===profileModal) profileModal.classList.add("hidden"); };
modalAvPrev.onclick = () => modalAvInput.click();
modalAvInput.onchange = async e => {
  const f=e.target.files[0]; if(!f) return;
  myAvatar = await compress(f);
  applyAv(modalAvImg,modalAvLetter,myAvatar,username);
};
modalSave.onclick = () => {
  if (myAvatar) localStorage.setItem("chat_avatar",myAvatar);
  applyAv(myAvImg,myAvLetter,myAvatar,username);
  publishProfile();
  profileModal.classList.add("hidden");
};

// Status
function buildStatus() {
  LOCATIONS.forEach(loc => {
    const btn = document.createElement("button");
    btn.className = "status-opt" + (loc.id===myStatus.id?" active":"");
    btn.dataset.id = loc.id;
    btn.innerHTML = `<span style="font-size:16px">${loc.emoji}</span><span>${loc.label}</span>${loc.id===myStatus.id?'<span style="margin-left:auto;color:#ff8096">✓</span>':""}`;
    statusDD.appendChild(btn);
  });
  statusDD.addEventListener("click", e => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const loc = LOCATIONS.find(l=>l.id===btn.dataset.id);
    if (loc) setStatus(loc);
  });
}

statusBtn.onclick = e => { e.stopPropagation(); statusDD.classList.toggle("open"); };

function setStatus(loc) {
  myStatus = loc;
  localStorage.setItem("chat_status", JSON.stringify(loc));
  statusEmoji.textContent = loc.emoji;
  statusLabel.textContent = loc.label;
  statusDD.querySelectorAll("button[data-id]").forEach(btn => {
    const bl = LOCATIONS.find(l=>l.id===btn.dataset.id);
    if (!bl) return;
    const active = bl.id===loc.id;
    btn.className = "status-opt"+(active?" active":"");
    btn.innerHTML = `<span style="font-size:16px">${bl.emoji}</span><span>${bl.label}</span>${active?'<span style="margin-left:auto;color:#ff8096">✓</span>':""}`;
  });
  statusDD.classList.remove("open");
  publishProfile();
}

// Messages
function subMessages() {
  onValue(ref(db,"messages"), snap => {
    const msgs = Object.entries(snap.val()||{})
      .map(([id,v])=>({id,...v}))
      .sort((a,b)=>a.ts-b.ts);
    renderMsgs(msgs);
  });
}

function renderMsgs(msgs) {
  messagesEl.innerHTML = "";
  if (!msgs.length) { messagesEl.appendChild(emptyState); emptyState.style.display="flex"; return; }
  emptyState.style.display = "none";

  let i=0;
  while (i<msgs.length) {
    const author=msgs[i].author, isMine=author===username, group=[];
    while (i<msgs.length && msgs[i].author===author) group.push(msgs[i++]);

    const grp = document.createElement("div");
    grp.className = "msg-group msg-anim " + (isMine?"mine":"theirs");

    const nameEl = document.createElement("div");
    nameEl.className = "msg-author";
    nameEl.textContent = author;
    grp.appendChild(nameEl);

    const av = isMine ? myAvatar : (avatarCache[author]||"");

    group.forEach((msg, idx) => {
      const isSticker = msg.type==="sticker";
      const row = document.createElement("div");
      row.className = "msg-row";

      const avEl = document.createElement("div");
      avEl.className = "msg-av" + (idx<group.length-1?" invisible":"");
      if (av) {
        const img=document.createElement("img");
        img.src=av; img.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;";
        avEl.appendChild(img);
      } else {
        avEl.textContent = initial(author);
      }

      const bubble = document.createElement("div");
      bubble.className = "msg-bubble" + (isSticker?" sticker":(idx>0?" grouped":""));
      bubble.textContent = msg.text;
      bubble.dataset.msgId = msg.id;
      bubble.onclick = e => { e.stopPropagation(); openReaction(bubble.dataset.msgId, bubble); };
      bubble.oncontextmenu = e => { e.preventDefault(); openReaction(bubble.dataset.msgId, bubble); };

      const del = document.createElement("button");
      del.className = "del-btn"; del.textContent="✕"; del.title="Удалить";
      del.onclick = () => deleteMsg(msg.id);

      if (isMine) { row.appendChild(del); row.appendChild(bubble); row.appendChild(avEl); }
      else        { row.appendChild(avEl); row.appendChild(bubble); row.appendChild(del); }
      grp.appendChild(row);
    });

    group.forEach(msg => {
      const rr = document.createElement("div");
      rr.className="reactions-row"; rr.id=`r-${msg.id}`;
      grp.appendChild(rr);
    });

    const time = document.createElement("div");
    time.className="msg-time";
    time.textContent = fmtTime(group[group.length-1].ts);
    grp.appendChild(time);
    messagesEl.appendChild(grp);
  }

  subReactions(msgs);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Reactions
function subReactions(msgs) {
  onValue(ref(db,"reactions"), snap => {
    const data = snap.val()||{};
    msgs.forEach(msg => {
      const row = document.getElementById(`r-${msg.id}`);
      if (!row) return;
      row.innerHTML = "";
      const safeId = msg.id.toString().replace(/\./g,"_");
      Object.entries(data[safeId]||{}).forEach(([emoji,users]) => {
        if (!users||!Object.keys(users).length) return;
        const ul = Object.values(users);
        const chip = document.createElement("button");
        chip.className = "reaction-chip"+(ul.includes(username)?" mine-reaction":"");
        chip.innerHTML = `${emoji}<span class="cnt">${ul.length}</span>`;
        const mid = msg.id;
        chip.onclick = () => toggleReaction(mid,emoji);
        row.appendChild(chip);
      });
    });
  });
}

function openReaction(msgId, anchor) {
  reactionPopup.innerHTML="";
  QUICK_REACTIONS.forEach(emoji => {
    const btn=document.createElement("button");
    btn.textContent=emoji;
    const mid=msgId;
    btn.onclick=()=>{ toggleReaction(mid,emoji); closeReaction(); };
    reactionPopup.appendChild(btn);
  });
  const rect=anchor.getBoundingClientRect();
  reactionPopup.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-320))+"px";
  reactionPopup.style.top=(rect.top-52)+"px";
  reactionPopup.classList.remove("hidden");
}

function closeReaction(){ reactionPopup.classList.add("hidden"); }

async function toggleReaction(msgId,emoji) {
  const safeId=msgId.toString().replace(/\./g,"_");
  const path=`reactions/${safeId}/${emoji}/${username}`;
  const snap=await get(ref(db,path));
  if (snap.exists()) await remove(ref(db,path));
  else               await set(ref(db,path),true);
}

async function deleteMsg(id) {
  await remove(ref(db,`messages/${id}`));
  await remove(ref(db,`reactions/${id.toString().replace(/\./g,"_")}`));
}

// Send
msgInput.oninput = () => {
  sendBtn.classList.toggle("ready", msgInput.value.trim().length>0);
  msgInput.style.height="auto";
  msgInput.style.height=Math.min(msgInput.scrollHeight,100)+"px";
};
msgInput.onkeydown = e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();} };
sendBtn.onclick = ()=>sendMsg();

async function sendMsg(text,type="text") {
  const content = (typeof text==="string") ? text : msgInput.value.trim();
  if (!content||!username) return;
  await push(ref(db,"messages"),{author:username,text:content,type:type||"text",ts:Date.now()});
  if (typeof text!=="string") {
    msgInput.value=""; msgInput.style.height="auto";
    sendBtn.classList.remove("ready"); msgInput.focus();
  }
}

// Emoji
function buildEmoji() {
  EMOJI_CATS.forEach((cat,i)=>{
    const btn=document.createElement("button");
    btn.className="panel-tab"+(i===0?" active":"");
    btn.textContent=cat.tab;
    btn.onclick=()=>{ emojiTab=i; renderEmoji(); updateTabs(emojiTabsEl,i); };
    emojiTabsEl.appendChild(btn);
  });
  renderEmoji();
}
function renderEmoji() {
  emojiGridEl.innerHTML="";
  EMOJI_CATS[emojiTab].list.forEach(e=>{
    const btn=document.createElement("button");
    btn.className="emoji-btn"; btn.textContent=e;
    btn.onclick=()=>{ msgInput.value+=e; msgInput.focus(); sendBtn.classList.toggle("ready",msgInput.value.trim().length>0); };
    emojiGridEl.appendChild(btn);
  });
}
emojiBtnEl.onclick = e=>{ e.stopPropagation(); const o=!emojiPanel.classList.contains("open"); closeAll(); if(o){emojiPanel.classList.add("open");emojiBtnEl.classList.add("active");} };

// Stickers
function buildStickers() {
  STICKER_PACKS.forEach((pack,i)=>{
    const btn=document.createElement("button");
    btn.className="panel-tab"+(i===0?" active":"");
    btn.textContent=pack.tab;
    btn.onclick=()=>{ stickerTab=i; renderStickers(); updateTabs(stickerTabsEl,i); };
    stickerTabsEl.appendChild(btn);
  });
  renderStickers();
}
function renderStickers() {
  stickerGridEl.innerHTML="";
  STICKER_PACKS[stickerTab].list.forEach(s=>{
    const btn=document.createElement("button");
    btn.className="sticker-btn"; btn.textContent=s;
    btn.onclick=()=>{ sendMsg(s,"sticker"); closeAll(); };
    stickerGridEl.appendChild(btn);
  });
}
stickerBtnEl.onclick = e=>{ e.stopPropagation(); const o=!stickerPanel.classList.contains("open"); closeAll(); if(o){stickerPanel.classList.add("open");stickerBtnEl.classList.add("active");} };

function updateTabs(cont,idx){ cont.querySelectorAll(".panel-tab").forEach((b,i)=>b.classList.toggle("active",i===idx)); }
function closeAll() {
  emojiPanel.classList.remove("open"); stickerPanel.classList.remove("open");
  emojiBtnEl.classList.remove("active"); stickerBtnEl.classList.remove("active");
  closeReaction();
}

document.addEventListener("click",()=>{ statusDD.classList.remove("open"); closeAll(); });
[emojiPanel,stickerPanel,statusDD,reactionPopup].forEach(el=>el.addEventListener("click",e=>e.stopPropagation()));

init();
