/* ==========================================

   NUESTRAS ROLITAS - CHAT FIREBASE

   Login + Registro + Chat + PRESENCIA

========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {

  getAuth,

  setPersistence,

  browserLocalPersistence,

  onAuthStateChanged,

  signInWithEmailAndPassword,

  createUserWithEmailAndPassword,

  signOut,

  sendPasswordResetEmail

} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {

  getFirestore,

  collection,

  doc,

  addDoc,

  updateDoc,

  query,

  orderBy,

  startAfter,

  getDocs,

  limit,

  onSnapshot,

  serverTimestamp

} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {

  getStorage,

  ref as storageRef,

  uploadBytes,

  getDownloadURL

} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

import {

  getDatabase,

  ref as rtdbRef,

  onValue,

  set,

  onDisconnect,

  serverTimestamp as rtdbServerTimestamp

} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

/* ==========================================

   1. CONFIGURACIÓN FIREBASE

========================================== */

const firebaseConfig = {

  apiKey: "AIzaSyBkM7LOOsw-dTTwvPudeDmuIpQ-cs_AJEk",

  authDomain: "nuestras-rolitas.firebaseapp.com",

  databaseURL: "https://nuestras-rolitas-default-rtdb.firebaseio.com",

  projectId: "nuestras-rolitas",

  storageBucket: "nuestras-rolitas.firebasestorage.app",

  messagingSenderId: "995678016480",

  appId: "1:995678016480:web:482dae67c02be03b48d185"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

// Lista permitida: se validan UID Y correo para evitar cuentas con el mismo email

// pero una identidad de Firebase diferente.

const CHAT_ALLOWED_USERS = Object.freeze({

  "ZdFf6SgJ41gaEpt7Yl9qMBVQrsm1": "montserratdelgado555@gmail.com",

  "8pYAVJvtRXhExidqcs9RjxuLAUk2": "theexsuanter@gmail.com"

});

function isAllowedChatUser(user) {

  if (!user?.uid || !user?.email) return false;

  const expectedEmail = CHAT_ALLOWED_USERS[user.uid];

  return Boolean(expectedEmail) &&

    user.email.trim().toLowerCase() === expectedEmail;

}

function isAllowedChatEmail(email) {

  const normalized = String(email || "").trim().toLowerCase();

  return Object.values(CHAT_ALLOWED_USERS).includes(normalized);

}

const db = getFirestore(app);

const storage = getStorage(app);

const realtimeDb = getDatabase(

  app,

  "https://nuestras-rolitas-default-rtdb.firebaseio.com"

);

/* ==========================================

   2. REFERENCIA DE MENSAJES

========================================== */

const messagesRef = collection(

  db,

  "chats",

  "rolitas-privado",

  "messages"

);

/* ==========================================

   3. ELEMENTOS HTML

========================================== */

const authScreen = document.getElementById("auth-screen");

const authLoading = document.getElementById("auth-loading");

const privateContent = document.getElementById("private-content");

const chatGate = document.getElementById("chat-gate");

const loginForm = document.getElementById("chat-login");

const registerForm = document.getElementById("chat-register");

const loginError = document.getElementById("chat-login-error");

const registerError = document.getElementById("register-error");

const emailInput = document.getElementById("chat-email");

const passwordInput = document.getElementById("chat-password");

const registerEmail = document.getElementById("register-email");

const registerPassword = document.getElementById("register-password");

const showLoginButton = document.getElementById("show-login");

const showRegisterButton = document.getElementById("show-register");

const backLoginButton = document.getElementById("back-login");

const backRegisterButton = document.getElementById("back-register");

const room = document.getElementById("chat-room");

const logoutButton = document.getElementById("chat-logout");

const statusLabel = document.getElementById("chat-status");

const messagesBox = document.getElementById("chat-messages");

const sendForm = document.getElementById("chat-send-form");

const messageInput = document.getElementById("chat-message-input");

const sendButton = document.getElementById("chat-send-button");

const sendError = document.getElementById("chat-send-error");

// Respuesta a un mensaje (se guarda junto al nuevo mensaje en Firestore).

let replyingTo = null;

let replyPreview = null;

let replyPreviewText = null;

let replyPreviewAuthor = null;

let replyCancelButton = null;

function ensureReplyComposer() {

  if (!sendForm || replyPreview) return;

  replyPreview = document.createElement("div");

  replyPreview.className = "chat-reply-composer";

  replyPreview.hidden = true;

  const accent = document.createElement("span");

  accent.className = "chat-reply-composer-accent";

  const content = document.createElement("div");

  content.className = "chat-reply-composer-content";

  replyPreviewAuthor = document.createElement("strong");

  replyPreviewAuthor.className = "chat-reply-composer-author";

  replyPreviewText = document.createElement("span");

  replyPreviewText.className = "chat-reply-composer-text";

  content.append(replyPreviewAuthor, replyPreviewText);

  replyCancelButton = document.createElement("button");

  replyCancelButton.type = "button";

  replyCancelButton.className = "chat-reply-cancel";

  replyCancelButton.setAttribute("aria-label", "Cancelar respuesta");

  replyCancelButton.textContent = "×";

  replyCancelButton.addEventListener("click", clearReplyTarget);

  replyPreview.append(accent, content, replyCancelButton);

  sendForm.parentNode.insertBefore(replyPreview, sendForm);

  const style = document.createElement("style");

  style.textContent = `

    .chat-reply-composer{display:flex;align-items:center;gap:9px;margin:8px 0 0;padding:9px 11px;border:1px solid #efd9e8;border-radius:12px;background:#fff7fb;color:#382b39}

    .chat-reply-composer[hidden]{display:none!important}

    .chat-reply-composer-accent{width:3px;align-self:stretch;border-radius:5px;background:#ad5689;flex:none}

    .chat-reply-composer-content{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px}

    .chat-reply-composer-author{font-size:10px;color:#91416f}

    .chat-reply-composer-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#806a7b}

    .chat-reply-cancel{border:0;background:transparent;color:#987b91;font-size:21px;line-height:1;cursor:pointer}

    .chat-reply-quote{display:flex;flex-direction:column;gap:2px;width:100%;margin:0 0 7px;padding:6px 8px;border:0;border-left:3px solid #ad5689;border-radius:5px;background:rgba(173,86,137,.09);text-align:left;cursor:pointer;color:inherit}

    .chat-reply-quote strong{font-size:9px;color:#91416f}

    .chat-reply-quote span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;opacity:.8}

    .chat-bubble{cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:pan-y}

    .chat-bubble:active{filter:brightness(.985)}

    .chat-bubble--mine .chat-reply-quote{background:rgba(255,255,255,.55)}

    .chat-reply-target-highlight{outline:2px solid #c47ba6;outline-offset:3px;transition:outline .2s}

  `;

  document.head.appendChild(style);

}

function clearReplyTarget() {

  replyingTo = null;

  if (replyPreview) replyPreview.hidden = true;

  if (messageInput) messageInput.focus();

}

function installGameInviteCardStyles() {

  if (document.getElementById("rolitas-game-invite-card-styles")) return;

  const gameInviteStyle = document.createElement("style");

  gameInviteStyle.id = "rolitas-game-invite-card-styles";

  gameInviteStyle.textContent = `

    #chat-messages .chat-game-invite {

      display: flex;

      flex-direction: column;

      gap: 9px;

      width: min(100%, 280px);

      margin: 8px 0 2px;

      padding: 12px;

      box-sizing: border-box;

      border: 1px solid rgba(205, 105, 169, .32);

      border-radius: 15px;

      background: linear-gradient(145deg, rgba(198, 91, 160, .13), rgba(255, 255, 255, .045));

    }

    #chat-messages .chat-game-invite-title {

      color: #d66bb3;

      font-size: 13px;

      font-weight: 800;

    }

    #chat-messages .chat-game-invite-description {

      margin: 0;

      font-size: 11px;

      line-height: 1.45;

      opacity: .84;

    }

    #chat-messages .chat-game-invite-hint {

      display: flex;

      flex-direction: column;

      gap: 3px;

      padding: 8px 9px;

      border-radius: 9px;

      background: rgba(255, 255, 255, .07);

    }

    #chat-messages .chat-game-invite-hint-label {

      color: #bd6b9d;

      font-size: 9px;

      font-weight: 800;

      letter-spacing: .08em;

    }

    #chat-messages .chat-game-invite-hint-text {

      font-size: 11px;

      overflow-wrap: anywhere;

    }

    #chat-messages .chat-game-invite-play {

      min-height: 38px;

      border: 0;

      border-radius: 10px;

      padding: 8px 12px;

      background: linear-gradient(135deg, #df75bd, #a94f9b);

      color: #fff;

      font-size: 11px;

      font-weight: 800;

      cursor: pointer;

    }

    #chat-messages .chat-game-invite-play:active {

      transform: scale(.98);

    }

    #chat-messages .chat-unread-divider {

      display: flex;

      align-items: center;

      justify-content: center;

      gap: 10px;

      margin: 12px 4px;

      color: #b66a98;

      font-size: 9px;

      font-weight: 800;

      letter-spacing: .09em;

      text-align: center;

    }

    #chat-messages .chat-unread-divider::before,

    #chat-messages .chat-unread-divider::after {

      content: "";

      height: 1px;

      flex: 1;

      background: rgba(182, 106, 152, .35);

    }

  `;

  document.head.appendChild(gameInviteStyle);

}

installGameInviteCardStyles();

function installMessageStatusStyles() {

  if (document.getElementById("rolitas-message-status-styles")) return;

  const style = document.createElement("style");

  style.id = "rolitas-message-status-styles";

  style.textContent = `

    #chat-messages .chat-bubble--mine .chat-bubble-meta .chat-message-status {

      display: inline-flex !important;

      visibility: visible !important;

      opacity: 1 !important;

      margin-left: 5px;

      font-size: 11px;

      line-height: 1;

      color: #9299a2;

      letter-spacing: -2px;

      vertical-align: middle;

      white-space: nowrap;

    }

    #chat-messages .chat-bubble--mine .chat-bubble-meta .chat-message-status.is-read {

      color: #2998f0 !important;

    }

  `;

  document.head.appendChild(style);

}

installMessageStatusStyles();

function setReplyTarget(message) {

  replyingTo = {

    messageId: message.messageId || message.id,

    text: String(message.text || "").slice(0, 1000),

    senderUid: message.senderUid || "",

    senderName: message.senderUid === currentUser?.uid ? "Tú" : "La otra persona"

  };

  ensureReplyComposer();

  replyPreviewAuthor.textContent = `Respondiendo a ${replyingTo.senderName}`;

  replyPreviewText.textContent = replyingTo.text || "Mensaje";

  replyPreview.hidden = false;

  messageInput?.focus();

}

ensureReplyComposer();

/* ==========================================

   ADJUNTAR ARCHIVOS

========================================== */

let attachmentInput = null;

let attachmentButton = null;

function ensureAttachmentPicker() {

  if (!sendForm || attachmentInput) return;

  attachmentInput = document.createElement("input");

  attachmentInput.type = "file";

  attachmentInput.multiple = true;

  attachmentInput.id = "chat-attachment-input";

  attachmentInput.hidden = true;

  // Sin atributo accept: permite seleccionar cualquier formato.

  attachmentButton = document.createElement("button");

  attachmentButton.type = "button";

  attachmentButton.className = "chat-attach-button";

  attachmentButton.textContent = "＋";

  attachmentButton.title = "Adjuntar fotos, videos o archivos";

  attachmentButton.setAttribute("aria-label", "Adjuntar archivos");

  attachmentButton.addEventListener("click", () => attachmentInput.click());

  attachmentInput.addEventListener("change", () => {

    const count = attachmentInput.files?.length || 0;

    if (sendError) {

      sendError.textContent = count

        ? `${count} archivo(s) seleccionado(s). Pulsa enviar para compartirlos.`

        : "";

    }

  });

  const style = document.createElement("style");

  style.textContent = `

    .chat-attach-button{width:40px;height:40px;flex:0 0 40px;border:0;border-radius:50%;background:#f6e5ef;color:#a94f85;font-size:27px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}

    .chat-attach-button:disabled{opacity:.5;cursor:wait}

    .chat-attachment{display:flex;flex-direction:column;gap:6px;margin:2px 0 8px;max-width:min(100%,280px)}

    .chat-attachment img,.chat-attachment video{display:block;max-width:100%;max-height:300px;border-radius:10px;object-fit:contain;background:#f3edf1}

    .chat-attachment-file{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid rgba(150,100,130,.2);border-radius:10px;background:rgba(255,255,255,.55);overflow-wrap:anywhere}

    .chat-attachment-file a{color:#9d477b;font-size:12px;text-decoration:underline}

    .chat-attachment-name{font-size:11px;opacity:.8}

  `;

  document.head.appendChild(style);

  const inputAnchor = messageInput || sendButton;

  if (inputAnchor && inputAnchor.parentNode === sendForm) {

    sendForm.insertBefore(attachmentButton, inputAnchor);

    sendForm.insertBefore(attachmentInput, attachmentButton.nextSibling);

  } else {

    sendForm.append(attachmentButton, attachmentInput);

  }

}

ensureAttachmentPicker();

function formatFileSize(bytes) {

  if (!Number.isFinite(bytes) || bytes < 0) return "";

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

}

let imageViewerOverlay = null;

function ensureImageViewer() {

  if (imageViewerOverlay) return imageViewerOverlay;

  const style = document.createElement("style");

  style.id = "rolitas-image-viewer-styles";

  style.textContent = `

    .rolitas-image-viewer {

      position: fixed;

      inset: 0;

      z-index: 99999;

      display: flex;

      align-items: center;

      justify-content: center;

      padding: 24px;

      box-sizing: border-box;

      background: rgba(12, 8, 14, .92);

      cursor: zoom-out;

    }

    .rolitas-image-viewer[hidden] { display: none !important; }

    .rolitas-image-viewer img {

      display: block;

      max-width: min(96vw, 1500px);

      max-height: 92vh;

      width: auto;

      height: auto;

      object-fit: contain;

      border-radius: 10px;

      box-shadow: 0 12px 50px rgba(0,0,0,.45);

      cursor: default;

    }

    .rolitas-image-viewer-close {

      position: absolute;

      top: 14px;

      right: 18px;

      width: 44px;

      height: 44px;

      border: 0;

      border-radius: 50%;

      background: rgba(255,255,255,.16);

      color: #fff;

      font-size: 30px;

      line-height: 1;

      cursor: pointer;

    }

    .chat-attachment img { cursor: zoom-in; }

  `;

  document.head.appendChild(style);

  imageViewerOverlay = document.createElement("div");

  imageViewerOverlay.className = "rolitas-image-viewer";

  imageViewerOverlay.hidden = true;

  imageViewerOverlay.setAttribute("role", "dialog");

  imageViewerOverlay.setAttribute("aria-modal", "true");

  imageViewerOverlay.setAttribute("aria-label", "Vista ampliada de imagen");

  const closeButton = document.createElement("button");

  closeButton.type = "button";

  closeButton.className = "rolitas-image-viewer-close";

  closeButton.textContent = "×";

  closeButton.setAttribute("aria-label", "Cerrar imagen");

  const fullImage = document.createElement("img");

  fullImage.alt = "";

  const closeViewer = () => {

    imageViewerOverlay.hidden = true;

    fullImage.removeAttribute("src");

  };

  closeButton.addEventListener("click", closeViewer);

  imageViewerOverlay.addEventListener("click", (event) => {

    if (event.target === imageViewerOverlay) closeViewer();

  });

  fullImage.addEventListener("click", (event) => event.stopPropagation());

  document.addEventListener("keydown", (event) => {

    if (event.key === "Escape" && imageViewerOverlay && !imageViewerOverlay.hidden) {

      closeViewer();

    }

  });

  imageViewerOverlay.append(closeButton, fullImage);

  document.body.appendChild(imageViewerOverlay);

  imageViewerOverlay._showImage = (url, alt) => {

    fullImage.src = url;

    fullImage.alt = alt || "Imagen adjunta";

    imageViewerOverlay.hidden = false;

    closeButton.focus();

  };

  return imageViewerOverlay;

}

function createAttachmentElement(attachment) {

  const wrapper = document.createElement("div");

  wrapper.className = "chat-attachment";

  const url = attachment?.url || "";

  const type = attachment?.contentType || "";

  const name = attachment?.name || "Archivo adjunto";

  if (url && type.startsWith("image/")) {

    const image = document.createElement("img");

    image.src = url;

    image.alt = name;

    image.loading = "lazy";

    image.tabIndex = 0;

    image.setAttribute("role", "button");

    image.setAttribute("aria-label", `Ampliar imagen: ${name}`);

    const openImage = () => ensureImageViewer()._showImage(url, name);

    image.addEventListener("click", openImage);

    image.addEventListener("keydown", (event) => {

      if (event.key === "Enter" || event.key === " ") {

        event.preventDefault();

        openImage();

      }

    });

    wrapper.appendChild(image);

  } else if (url && type.startsWith("video/")) {

    const video = document.createElement("video");

    video.src = url;

    video.controls = true;

    video.preload = "metadata";

    video.playsInline = true;

    wrapper.appendChild(video);

  } else {

    const fileRow = document.createElement("div");

    fileRow.className = "chat-attachment-file";

    const link = document.createElement("a");

    link.href = url || "#";

    link.target = "_blank";

    link.rel = "noopener noreferrer";

    link.textContent = `📎 ${name}`;

    if (!url) link.removeAttribute("href");

    const details = document.createElement("span");

    details.className = "chat-attachment-name";

    details.textContent = formatFileSize(Number(attachment?.size || 0));

    fileRow.append(link, details);

    wrapper.appendChild(fileRow);

  }

  return wrapper;

}

/* ==========================================

   4. ESTADO DEL CHAT

========================================== */

let currentUser = null;

let stopMessagesListener = null;

let stopPresenceListener = null;

let stopConnectionListener = null;

let presenceRefreshInterval = null;

let peerPresence = null;

// Estado local de lectura y control del scroll.

let lastRenderedDocs = [];

// Historial anterior al bloque que permanece escuchándose en tiempo real.

let olderMessagesDocs = [];

let oldestLoadedMessageDoc = null;

let loadingOlderMessages = false;

let hasMoreOlderMessages = true;

let latestLiveMessagesDocs = [];

let firstMessagesSnapshot = true;

let hasReceivedServerSnapshot = false;

let readBaselineReady = false;

let pendingInitialScroll = true;

let scrollUpdateFrame = null;

// Conserva la posición del chat aunque la aplicación esté oculta.

let savedChatScrollTop = null;

let hasUserScrolledChat = false;

let chatRestoreFrame = null;

/* ==========================================

   5. ESTADOS Y PANTALLAS

========================================== */

function showStatus(message) {

  if (statusLabel) {

    statusLabel.textContent = message;

  }

}

function hideAllScreens() {

  if (chatGate) chatGate.hidden = true;

  if (loginForm) loginForm.hidden = true;

  if (registerForm) registerForm.hidden = true;

  if (room) room.hidden = true;

}

function showGate() {

  if (privateContent) privateContent.hidden = true;

  if (authScreen) authScreen.hidden = false;

  if (authLoading) authLoading.hidden = true;

  hideAllScreens();

  if (chatGate) chatGate.hidden = false;

}

function showLogin() {

  if (privateContent) privateContent.hidden = true;

  if (authScreen) authScreen.hidden = false;

  if (authLoading) authLoading.hidden = true;

  hideAllScreens();

  if (loginForm) loginForm.hidden = false;

  if (loginError) loginError.textContent = "";

}

function showRegister() {

  if (privateContent) privateContent.hidden = true;

  if (authScreen) authScreen.hidden = false;

  if (authLoading) authLoading.hidden = true;

  hideAllScreens();

  if (registerForm) registerForm.hidden = false;

  if (registerError) registerError.textContent = "";

}

function showChat() {

  hideAllScreens();

  if (authScreen) authScreen.hidden = true;

  if (privateContent) privateContent.hidden = false;

  if (room) room.hidden = false;

  if (logoutButton) logoutButton.hidden = false;

  showStatus("Conectado · chat");

}

/* ==========================================

   6. PRESENCIA: EN LÍNEA / ÚLTIMA CONEXIÓN

========================================== */

const PRESENCE_PATH = "status";

const connectedRef = rtdbRef(realtimeDb, ".info/connected");

function installPresenceStyles() {

  if (document.getElementById("rolitas-presence-styles")) return;

  const style = document.createElement("style");

  style.id = "rolitas-presence-styles";

  style.textContent = `

    #chat-status.rolitas-presence {

      display: inline-flex;

      align-items: center;

      gap: 7px;

      min-height: 18px;

      color: #9b8798;

      font-size: 0.88rem;

      line-height: 1.35;

    }

    .rolitas-presence-dot {

      width: 8px;

      height: 8px;

      flex: 0 0 8px;

      display: inline-block;

      border-radius: 50%;

      background: #aaa;

      box-shadow: 0 0 0 3px rgba(160,160,160,.12);

    }

    #chat-status.is-online {

      color: #269b68;

    }

    #chat-status.is-online .rolitas-presence-dot {

      background: #2bbd7e;

      box-shadow: 0 0 0 3px rgba(43,189,126,.14);

    }

    #chat-status.is-offline .rolitas-presence-dot {

      background: #a99aa6;

      box-shadow: 0 0 0 3px rgba(169,154,166,.12);

    }

  `;

  document.head.appendChild(style);

}

function formatLastSeen(timestamp) {

  if (!timestamp || !Number.isFinite(Number(timestamp))) {

    return "Última conexión no disponible";

  }

  const elapsed = Math.max(0, Date.now() - Number(timestamp));

  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return "Última vez hace un momento";

  if (minutes === 1) return "Última vez hace 1 minuto";

  if (minutes < 60) {

    return `Última vez hace ${minutes} minutos`;

  }

  const hours = Math.floor(minutes / 60);

  if (hours === 1) return "Última vez hace 1 hora";

  if (hours < 24) return `Última vez hace ${hours} horas`;

  const days = Math.floor(hours / 24);

  if (days === 1) return "Última vez hace 1 día";

  return `Última vez hace ${days} días`;

}

function renderPeerPresence() {

  if (!statusLabel) return;

  installPresenceStyles();

  statusLabel.classList.add("rolitas-presence");

  statusLabel.replaceChildren();

  const dot = document.createElement("span");

  dot.className = "rolitas-presence-dot";

  dot.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");

  if (!peerPresence) {

    statusLabel.classList.remove("is-online", "is-offline");

    text.textContent = "Esperando conexión de la otra persona";

  } else if (peerPresence.state === "online") {

    statusLabel.classList.remove("is-offline");

    statusLabel.classList.add("is-online");

    text.textContent = "En línea";

  } else {

    statusLabel.classList.remove("is-online");

    statusLabel.classList.add("is-offline");

    text.textContent = formatLastSeen(peerPresence.last_changed);

  }

  statusLabel.append(dot, text);

}

function stopPresenceTracking() {

  if (stopPresenceListener) {

    stopPresenceListener();

    stopPresenceListener = null;

  }

  if (stopConnectionListener) {

    stopConnectionListener();

    stopConnectionListener = null;

  }

  if (presenceRefreshInterval) {

    clearInterval(presenceRefreshInterval);

    presenceRefreshInterval = null;

  }

  peerPresence = null;

  if (statusLabel) {

    statusLabel.classList.remove("is-online", "is-offline");

  }

}

function startPresenceTracking(user) {

  stopPresenceTracking();

  const myStatusRef = rtdbRef(

    realtimeDb,

    `${PRESENCE_PATH}/${user.uid}`

  );

  const allPresenceRef = rtdbRef(

    realtimeDb,

    PRESENCE_PATH

  );

  // Escuchar el estado de la otra cuenta.

  stopPresenceListener = onValue(

    allPresenceRef,

    (snapshot) => {

      const allUsers = snapshot.val() || {};

      const otherEntry = Object.entries(allUsers).find(

        ([uid]) => uid !== user.uid

      );

      peerPresence = otherEntry ? otherEntry[1] : null;

      renderPeerPresence();

    },

    (error) => {

      console.error("Error leyendo presencia:", error);

      showStatus("No se pudo consultar la conexión");

    }

  );

  // Detectar conexión y desconexión del dispositivo.

  stopConnectionListener = onValue(

    connectedRef,

    async (snapshot) => {

      if (currentUser?.uid !== user.uid) return;

      if (snapshot.val() === true) {

        try {

          await onDisconnect(myStatusRef).set({

            state: "offline",

            last_changed: rtdbServerTimestamp()

          });

          await set(myStatusRef, {

            state: "online",

            last_changed: rtdbServerTimestamp()

          });

        } catch (error) {

          console.error(

            "No se pudo actualizar la presencia:",

            error

          );

          showStatus("No se pudo actualizar el estado");

        }

      }

    }

  );

  presenceRefreshInterval = setInterval(() => {

    if (peerPresence?.state !== "online") {

      renderPeerPresence();

    }

  }, 60000);

}

async function markCurrentUserOffline(user) {

  if (!user) return;

  try {

    await set(

      rtdbRef(realtimeDb, `${PRESENCE_PATH}/${user.uid}`),

      {

        state: "offline",

        last_changed: rtdbServerTimestamp()

      }

    );

  } catch (error) {

    console.warn(

      "No se pudo guardar la última conexión:",

      error

    );

  }

}

/* ==========================================

   7. NAVEGACIÓN

========================================== */

showLoginButton?.addEventListener("click", () => {

  showLogin();

});

showRegisterButton?.addEventListener("click", () => {

  showRegister();

});

backLoginButton?.addEventListener("click", () => {

  loginForm?.reset();

  showGate();

});

backRegisterButton?.addEventListener("click", () => {

  registerForm?.reset();

  showGate();

});

/* ==========================================

   8. FECHA Y HORA DE LOS MENSAJES

========================================== */

function formatMessageDate(timestamp) {

  if (!timestamp?.toDate) {

    return "Enviando...";

  }

  return new Intl.DateTimeFormat("es-CO", {

    hour: "2-digit",

    minute: "2-digit",

    hour12: true

  }).format(timestamp.toDate());

}

/* ==========================================

   9. LECTURA Y DESPLAZAMIENTO DEL CHAT

========================================== */

function getReadStorageKey(user) {

  return `nuestrasRolitas:lastRead:v7:${user.uid}`;

}

function getTimestampMillis(value) {

  if (!value) return 0;

  if (typeof value.toMillis === "function") {

    return value.toMillis();

  }

  if (typeof value.seconds === "number") {

    return value.seconds * 1000;

  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;

}

function getLastReadMillis() {

  if (!currentUser) return 0;

  const value = Number(

    localStorage.getItem(getReadStorageKey(currentUser)) || 0

  );

  return Number.isFinite(value) ? value : 0;

}

function saveLastReadMillis(value) {

  if (!currentUser || !value) return;

  const millis = getTimestampMillis(value);

  if (!millis) return;

  const key = getReadStorageKey(currentUser);

  const currentMarker = Number(localStorage.getItem(key) || 0);

  // La marca de lectura solo puede avanzar, nunca retroceder.

  // Así, mensajes antiguos no vuelven a aparecer como pendientes.

  const nextMarker = Math.max(

    Number.isFinite(currentMarker) ? currentMarker : 0,

    millis

  );

  localStorage.setItem(key, String(nextMarker));

}

function isNearChatBottom() {

  if (!messagesBox) return true;

  return (

    messagesBox.scrollHeight -

    messagesBox.scrollTop -

    messagesBox.clientHeight

  ) < 45;

}

function scrollChatTo(top) {

  if (!messagesBox) return;

  const previousBehavior = messagesBox.style.scrollBehavior;

  messagesBox.style.scrollBehavior = "auto";

  messagesBox.scrollTop = Math.max(0, top);

  requestAnimationFrame(() => {

    messagesBox.style.scrollBehavior = previousBehavior;

  });

}

function scrollChatToBottom() {

  if (!messagesBox) return;

  scrollChatTo(messagesBox.scrollHeight);

}

function isChatScreenVisible() {

  const screen = messagesBox?.closest('[data-app-screen="messages"]');

  return Boolean(

    messagesBox &&

    screen &&

    !screen.hidden &&

    messagesBox.getClientRects().length

  );

}

function restoreChatScrollPosition() {

  if (!messagesBox || !isChatScreenVisible()) return;

  if (chatRestoreFrame) cancelAnimationFrame(chatRestoreFrame);

  chatRestoreFrame = requestAnimationFrame(() => {

    chatRestoreFrame = requestAnimationFrame(() => {

      chatRestoreFrame = null;

      if (!messagesBox || !isChatScreenVisible()) return;

      // Si todavía no existe una posición elegida por el usuario,

      // siempre iniciar al final de la conversación. No usar scrollTop=0

      // como posición guardada: al ocultar una pantalla el navegador puede

      // reportar cero aunque el usuario nunca haya elegido esa posición.

      if (pendingInitialScroll || !hasUserScrolledChat || savedChatScrollTop === null) {

        scrollChatToBottom();

        pendingInitialScroll = false;

        savedChatScrollTop = messagesBox.scrollTop;

        markConversationReadIfAtBottom();

        return;

      }

      scrollChatTo(savedChatScrollTop);

    });

  });

}

const messagesScreen = messagesBox?.closest('[data-app-screen="messages"]');

if (messagesScreen && typeof MutationObserver !== "undefined") {

  const chatScreenObserver = new MutationObserver(() => {

    if (!messagesScreen.hidden) {

      restoreChatScrollPosition();

    } else if (messagesBox) {

      savedChatScrollTop = messagesBox.scrollTop;

    }

  });

  chatScreenObserver.observe(messagesScreen, {

    attributes: true,

    attributeFilter: ["hidden"]

  });

}

function findFirstUnreadIncoming(docs, lastReadMillis) {

  return docs.find(doc => {

    const data = doc.data();

    const timestamp = getTimestampMillis(data.createdAt);

    return (

      data.senderUid !== currentUser.uid &&

      !data.readAt &&

      timestamp > lastReadMillis

    );

  }) || null;

}

function initializeReadMarkerIfNeeded(docs) {

  if (!currentUser) return;

  const key = getReadStorageKey(currentUser);

  // Guardar una sola vez el instante real de instalación/primer acceso

  // con conexión al servidor. Todo lo anterior queda como historial.

  // La marca persiste y no se reinicia al cerrar o volver a abrir el chat.

  if (localStorage.getItem(key) === null) {

    localStorage.setItem(key, String(Date.now()));

  }

}

// Controla escrituras repetidas mientras Firestore confirma los estados.

const receiptWritesInFlight = new Set();

async function updateMessageReceipt(messageId, fields) {

  if (!currentUser || !messageId) return;

  const key = `${currentUser.uid}:${messageId}:${Object.keys(fields).sort().join(",")}`;

  if (receiptWritesInFlight.has(key)) return;

  receiptWritesInFlight.add(key);

  try {

    await updateDoc(doc(db, "chats", "rolitas-privado", "messages", messageId), fields);

  } catch (error) {

    console.warn("No se pudo actualizar el estado del mensaje:", error);

  } finally {

    receiptWritesInFlight.delete(key);

  }

}

function markIncomingMessagesDelivered(docs) {

  if (!currentUser) return;

  for (const item of docs) {

    const data = item.data();

    if (data.senderUid !== currentUser.uid && !data.deliveredAt) {

      updateMessageReceipt(item.id, { deliveredAt: serverTimestamp() });

    }

  }

}

function markIncomingMessagesRead(docs) {

  if (!currentUser || !isChatScreenVisible() || !isNearChatBottom()) return;

  for (const item of docs) {

    const data = item.data();

    if (data.senderUid !== currentUser.uid && !data.readAt) {

      const receipt = { readAt: serverTimestamp() };

      // Si aún no se registró la entrega, guardar ambos estados juntos.

      if (!data.deliveredAt) receipt.deliveredAt = serverTimestamp();

      updateMessageReceipt(item.id, receipt);

    }

  }

}

function markConversationReadIfAtBottom() {

  if (

    !currentUser ||

    !isChatScreenVisible() ||

    !lastRenderedDocs.length ||

    !isNearChatBottom()

  ) {

    return;

  }

  for (let i = lastRenderedDocs.length - 1; i >= 0; i--) {

    const data = lastRenderedDocs[i].data();

    if (

      data.senderUid !== currentUser.uid &&

      data.createdAt

    ) {

      saveLastReadMillis(data.createdAt);

      break;

    }

  }

  markIncomingMessagesRead(lastRenderedDocs);

}

function getVisibleMessageAnchor() {

  if (!messagesBox) return null;

  const boxTop = messagesBox.getBoundingClientRect().top;

  const bubbles = messagesBox.querySelectorAll(

    ".chat-bubble[data-message-id]"

  );

  for (const bubble of bubbles) {

    const rect = bubble.getBoundingClientRect();

    if (rect.bottom > boxTop + 2) {

      return {

        id: bubble.dataset.messageId,

        offset: rect.top - boxTop

      };

    }

  }

  return null;

}

function renderMessages(docs, { initial = false } = {}) {

  if (!messagesBox || !currentUser) return;

  const screenVisible = isChatScreenVisible();

  const wasNearBottom = screenVisible ? isNearChatBottom() : false;

  const anchor = (!initial && screenVisible) ? getVisibleMessageAnchor() : null;

  const previousScrollTop = screenVisible

    ? messagesBox.scrollTop

    : (savedChatScrollTop ?? messagesBox.scrollTop);

  if (screenVisible && hasUserScrolledChat) {

    savedChatScrollTop = previousScrollTop;

  }

  messagesBox.replaceChildren();

  if (!docs.length) {

    const empty = document.createElement("p");

    empty.className = "chat-empty";

    empty.textContent =

      "Todavía no hay mensajes. Puedes iniciar la conversación. 💗";

    messagesBox.appendChild(empty);

    if (screenVisible) scrollChatTo(0);

    savedChatScrollTop = 0;

    return;

  }

  let firstUnreadElement = null;

  const lastReadMillis = getLastReadMillis();

  for (const item of docs) {

    const data = item.data();

    const mine = data.senderUid === currentUser.uid;

    const bubble = document.createElement("article");

    bubble.className = `chat-bubble ${

      mine ? "chat-bubble--mine" : "chat-bubble--theirs"

    }`;

    bubble.dataset.messageId = item.id;

    if (data.replyTo && typeof data.replyTo === "object") {

      const quote = document.createElement("button");

      quote.type = "button";

      quote.className = "chat-reply-quote";

      quote.dataset.replyTargetId = data.replyTo.messageId || "";

      const quoteAuthor = document.createElement("strong");

      quoteAuthor.textContent = data.replyTo.senderName || "Mensaje";

      const quoteText = document.createElement("span");

      quoteText.textContent = data.replyTo.text || "Mensaje";

      quote.append(quoteAuthor, quoteText);

      quote.addEventListener("click", () => {

        const target = messagesBox.querySelector(

          `[data-message-id="${CSS.escape(data.replyTo.messageId || "")}"]`

        );

        if (target) {

          const boxRect = messagesBox.getBoundingClientRect();

          const targetRect = target.getBoundingClientRect();

          const centeredTop = messagesBox.scrollTop + targetRect.top - boxRect.top -

            (messagesBox.clientHeight - targetRect.height) / 2;

          scrollChatTo(centeredTop);

          target.classList.add("chat-reply-target-highlight");

          setTimeout(() => target.classList.remove("chat-reply-target-highlight"), 1200);

        }

      });

      bubble.appendChild(quote);

    }

    if (data.gameInvite && typeof data.gameInvite === "object" && data.gameInvite.gameId) {

      const gameInviteData = data.gameInvite;

      const isHangmanInvite = gameInviteData.type === "hangman";

      const gameInviteCard = document.createElement("section");

      gameInviteCard.className = "chat-game-invite";

      const gameInviteTitle = document.createElement("strong");

      gameInviteTitle.className = "chat-game-invite-title";

      gameInviteTitle.textContent = isHangmanInvite

        ? "🎯 Desafío de ahorcado"

        : "🎨 Dibuja y adivina";

      const gameInviteDescription = document.createElement("p");

      gameInviteDescription.className = "chat-game-invite-description";

      gameInviteDescription.textContent = isHangmanInvite

        ? "Hay una palabra secreta esperándote. ¡Descúbrela!"

        : "Te han enviado un dibujo. ¡Entra y trata de adivinarlo!";

      gameInviteCard.append(gameInviteTitle, gameInviteDescription);

      if (gameInviteData.hint) {

        const gameInviteHint = document.createElement("div");

        gameInviteHint.className = "chat-game-invite-hint";

        const gameInviteHintLabel = document.createElement("small");

        gameInviteHintLabel.className = "chat-game-invite-hint-label";

        gameInviteHintLabel.textContent = "PISTA";

        const gameInviteHintText = document.createElement("span");

        gameInviteHintText.className = "chat-game-invite-hint-text";

        gameInviteHintText.textContent = String(gameInviteData.hint);

        gameInviteHint.append(gameInviteHintLabel, gameInviteHintText);

        gameInviteCard.appendChild(gameInviteHint);

      }

      const gameInvitePlayButton = document.createElement("button");

      gameInvitePlayButton.type = "button";

      gameInvitePlayButton.className = "chat-game-invite-play";

      gameInvitePlayButton.textContent = "🎮 Jugar ahora";

      gameInvitePlayButton.addEventListener("click", (event) => {

        event.stopPropagation();

        window.dispatchEvent(new CustomEvent("rolitas:open-game", {

          detail: { gameId: gameInviteData.gameId }

        }));

      });

      gameInviteCard.appendChild(gameInvitePlayButton);

      bubble.appendChild(gameInviteCard);

    }

    if (data.attachment && typeof data.attachment === "object") {

      bubble.appendChild(createAttachmentElement(data.attachment));

    }

    const body = document.createElement("p");

    body.className = "chat-bubble-text";

    body.textContent = data.text || "";

    if (!data.text) body.hidden = true;

    const meta = document.createElement("div");

    meta.className = "chat-bubble-meta";

    const time = document.createElement("time");

    time.textContent = formatMessageDate(data.createdAt);

    meta.appendChild(time);

    if (mine) {

      const checks = document.createElement("span");

      checks.className = "chat-message-status";

      checks.style.cssText = "display:inline-flex;visibility:visible;opacity:1;margin-left:5px;font-size:11px;line-height:1;color:#9299a2;letter-spacing:-2px;vertical-align:middle;white-space:nowrap";

      checks.setAttribute("aria-live", "polite");

      if (data.readAt) {

        checks.textContent = "✓✓";

        checks.classList.add("is-read");

        checks.style.color = "#2998f0";

        checks.setAttribute("aria-label", "Leído");

        checks.title = "Leído";

      } else if (data.deliveredAt) {

        checks.textContent = "✓✓";

        checks.setAttribute("aria-label", "Entregado");

        checks.title = "Entregado";

      } else {

        checks.textContent = "✓";

        checks.setAttribute("aria-label", "Enviado");

        checks.title = "Enviado";

      }

      meta.appendChild(checks);

    }

    bubble.append(body, meta);

    // Responder al tocar/clicar el mensaje o mantenerlo presionado.

    // Los botones internos, como la cita de otra respuesta, mantienen su acción.

    const replyMessage = () => {

      setReplyTarget({

        messageId: item.id,

        text: data.text || "",

        senderUid: data.senderUid || ""

      });

    };

    let longPressTimer = null;

    let longPressTriggered = false;

    bubble.addEventListener("pointerdown", (event) => {

      if (event.target.closest("button")) return;

      longPressTriggered = false;

      clearTimeout(longPressTimer);

      longPressTimer = setTimeout(() => {

        longPressTriggered = true;

        replyMessage();

      }, 550);

    });

    const cancelLongPress = () => {

      clearTimeout(longPressTimer);

      longPressTimer = null;

    };

    bubble.addEventListener("pointerup", cancelLongPress);

    bubble.addEventListener("pointerleave", cancelLongPress);

    bubble.addEventListener("pointercancel", cancelLongPress);

    bubble.addEventListener("click", (event) => {

      if (event.target.closest("button")) return;

      if (longPressTriggered) {

        longPressTriggered = false;

        event.preventDefault();

        return;

      }

      replyMessage();

    });

    const timestamp = getTimestampMillis(data.createdAt);

    if (

      readBaselineReady &&

      !mine &&

      !data.readAt &&

      timestamp > lastReadMillis &&

      !firstUnreadElement

    ) {

      firstUnreadElement = bubble;

      const unreadDivider = document.createElement("div");

      unreadDivider.className = "chat-unread-divider";

      unreadDivider.textContent = "MENSAJES SIN LEER";

      messagesBox.appendChild(unreadDivider);

      bubble.classList.add("chat-first-unread");

    }

    messagesBox.appendChild(bubble);

  }

  // No medir ni desplazar elementos mientras la pantalla está oculta.

  if (!screenVisible) {

    if (initial) pendingInitialScroll = true;

    // No convertir el cero temporal de una pantalla oculta en una

    // posición válida de lectura.

    if (hasUserScrolledChat && savedChatScrollTop === null) {

      savedChatScrollTop = previousScrollTop;

    }

    return;

  }

  requestAnimationFrame(() => {

    if (!messagesBox.isConnected || !isChatScreenVisible()) {

      savedChatScrollTop = previousScrollTop;

      return;

    }

    if (initial) {

      // Al cargar el historial por primera vez, mostrar el final de la

      // conversación. La posición se guarda para las siguientes entradas.

      pendingInitialScroll = false;

      scrollChatToBottom();

      markConversationReadIfAtBottom();

      savedChatScrollTop = messagesBox.scrollTop;

      return;

    }

    if (wasNearBottom) {

      scrollChatToBottom();

      markConversationReadIfAtBottom();

      savedChatScrollTop = messagesBox.scrollTop;

      return;

    }

    // Si se leían mensajes antiguos, conservar el mismo mensaje visible.

    if (anchor) {

      const anchored = messagesBox.querySelector(

        `[data-message-id="${CSS.escape(anchor.id)}"]`

      );

      if (anchored) {

        const boxRect = messagesBox.getBoundingClientRect();

        const itemRect = anchored.getBoundingClientRect();

        scrollChatTo(

          messagesBox.scrollTop +

          itemRect.top -

          boxRect.top -

          anchor.offset

        );

        savedChatScrollTop = messagesBox.scrollTop;

        return;

      }

    }

    scrollChatTo(previousScrollTop);

    savedChatScrollTop = messagesBox.scrollTop;

  });

  requestAnimationFrame(updateJumpToLatestButton);

}

// Combina el historial paginado con los últimos mensajes en tiempo real.

function combineLoadedMessages(liveDocs = latestLiveMessagesDocs) {

  const unique = new Map();

  [...olderMessagesDocs, ...liveDocs].forEach(item => unique.set(item.id, item));

  return [...unique.values()].sort((a, b) =>

    getTimestampMillis(a.data().createdAt) - getTimestampMillis(b.data().createdAt)

  );

}

// Botón flotante para volver al final sin interrumpir la lectura.

let jumpToLatestButton = null;

function ensureJumpToLatestButton() {

  if (!room || jumpToLatestButton) return;

  jumpToLatestButton = document.createElement("button");

  jumpToLatestButton.type = "button";

  jumpToLatestButton.className = "chat-jump-latest";

  jumpToLatestButton.textContent = "↓ Ir al mensaje más reciente";

  jumpToLatestButton.setAttribute("aria-label", "Ir al mensaje más reciente");

  jumpToLatestButton.hidden = true;

  jumpToLatestButton.addEventListener("click", () => {

    scrollChatToBottom();

    savedChatScrollTop = messagesBox?.scrollTop ?? 0;

    markConversationReadIfAtBottom();

    updateJumpToLatestButton();

  });

  room.appendChild(jumpToLatestButton);

}

function updateJumpToLatestButton() {

  if (!jumpToLatestButton || !messagesBox) return;

  jumpToLatestButton.hidden = !isChatScreenVisible() || isNearChatBottom();

}

async function loadOlderMessages() {

  if (!currentUser || !messagesBox || loadingOlderMessages || !hasMoreOlderMessages || !oldestLoadedMessageDoc) return;

  loadingOlderMessages = true;

  const requestedUid = currentUser.uid;

  try {

    const olderQuery = query(

      messagesRef,

      orderBy("createdAt", "desc"),

      startAfter(oldestLoadedMessageDoc),

      limit(30)

    );

    const snapshot = await getDocs(olderQuery);

    if (currentUser?.uid !== requestedUid) return;

    const pageDocs = snapshot.docs;

    if (pageDocs.length) {

      olderMessagesDocs = [...pageDocs.reverse(), ...olderMessagesDocs];

      oldestLoadedMessageDoc = pageDocs[0];

    }

    hasMoreOlderMessages = pageDocs.length === 50;

    const combined = combineLoadedMessages();

    lastRenderedDocs = combined;

    // renderMessages conserva el mensaje que estaba visible antes de insertar

    // los anteriores, evitando saltos en la lectura.

    renderMessages(combined, { initial: false });

  } catch (error) {

    console.error("No se pudo cargar el historial anterior:", error);

    if (sendError) sendError.textContent = "No se pudieron cargar mensajes anteriores. Inténtalo de nuevo.";

  } finally {

    loadingOlderMessages = false;

  }

}

ensureJumpToLatestButton();

function registerUserChatScrollIntent() {

  if (!isChatScreenVisible()) return;

  hasUserScrolledChat = true;

  savedChatScrollTop = messagesBox.scrollTop;

}

messagesBox?.addEventListener("wheel", registerUserChatScrollIntent, { passive: true });

messagesBox?.addEventListener("touchmove", registerUserChatScrollIntent, { passive: true });

messagesBox?.addEventListener("keydown", (event) => {

  if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {

    registerUserChatScrollIntent();

  }

});

messagesBox?.addEventListener("scroll", () => {

  if (hasUserScrolledChat && isChatScreenVisible()) {

    savedChatScrollTop = messagesBox.scrollTop;

  }

  if (scrollUpdateFrame) {

    cancelAnimationFrame(scrollUpdateFrame);

  }

  scrollUpdateFrame = requestAnimationFrame(() => {

    scrollUpdateFrame = null;

    markConversationReadIfAtBottom();

    updateJumpToLatestButton();

  });

  if (messagesBox.scrollTop < 70) loadOlderMessages();

}, { passive: true });

/* ==========================================

   10. ESCUCHAR MENSAJES EN TIEMPO REAL

========================================== */

function startMessagesListener(user) {

  if (stopMessagesListener) {

    stopMessagesListener();

    stopMessagesListener = null;

  }

  currentUser = user;

  firstMessagesSnapshot = true;

  hasReceivedServerSnapshot = false;

  readBaselineReady = false;

  pendingInitialScroll = true;

  lastRenderedDocs = [];

  olderMessagesDocs = [];

  oldestLoadedMessageDoc = null;

  loadingOlderMessages = false;

  hasMoreOlderMessages = true;

  latestLiveMessagesDocs = [];

  // Traer los últimos 30 mensajes y ordenarlos

  // del más antiguo al más reciente.

  const recentMessages = query(

    messagesRef,

    orderBy("createdAt", "desc"),

    limit(30)

  );

  stopMessagesListener = onSnapshot(

    recentMessages,

    (snapshot) => {

      if (currentUser?.uid !== user.uid) return;

      const isInitialSnapshot = firstMessagesSnapshot;

      firstMessagesSnapshot = false;

      // Firestore puede entregar primero una copia local incompleta y luego

      // la confirmación del servidor. No usar la copia local para establecer

      // el punto de lectura ni interpretar sus documentos históricos como nuevos.

      const isFromCache = snapshot.metadata?.fromCache === true;

      const isFirstServerSnapshot = !isFromCache && !hasReceivedServerSnapshot;

      const serverBaselineWasReady = hasReceivedServerSnapshot;

      if (isFirstServerSnapshot) {

        hasReceivedServerSnapshot = true;

      }

      const orderedDocs = [...snapshot.docs].reverse();

      if (!isInitialSnapshot && latestLiveMessagesDocs.length) {

        const currentIds = new Set(orderedDocs.map(item => item.id));

        const pushedOutOfLiveWindow = latestLiveMessagesDocs.filter(item => !currentIds.has(item.id));

        if (pushedOutOfLiveWindow.length) {

          const olderById = new Map(olderMessagesDocs.map(item => [item.id, item]));

          pushedOutOfLiveWindow.forEach(item => olderById.set(item.id, item));

          olderMessagesDocs = [...olderById.values()].sort((a, b) =>

            getTimestampMillis(a.data().createdAt) - getTimestampMillis(b.data().createdAt)

          );

        }

      }

      latestLiveMessagesDocs = orderedDocs;

      if (isInitialSnapshot) {

        oldestLoadedMessageDoc = snapshot.docs[snapshot.docs.length - 1] || null;

        hasMoreOlderMessages = snapshot.docs.length === 100;

      }

      const allLoadedDocs = combineLoadedMessages(orderedDocs);

      // La referencia inicial se establece solo con datos confirmados

      // por el servidor, nunca con una copia local posiblemente incompleta.

      if (isFirstServerSnapshot) {

        initializeReadMarkerIfNeeded(allLoadedDocs);

        readBaselineReady = true;

      }

      // Solo después de recibir la primera foto completa del servidor,

      // los documentos agregados se consideran mensajes realmente nuevos.

      if (serverBaselineWasReady && !isFromCache) {

        snapshot.docChanges().forEach(change => {

          if (change.type !== "added") return;

          const data = change.doc.data();

          if (data.senderUid === user.uid) return;

          window.dispatchEvent(

            new CustomEvent("rolitas:incoming-message", {

              detail: {

                text: data.text || "Te ha llegado un mensaje."

              }

            })

          );

        });

      }

      lastRenderedDocs = allLoadedDocs;

      // La recepción del snapshot en este dispositivo confirma la entrega.

      markIncomingMessagesDelivered(allLoadedDocs);

      renderMessages(

        allLoadedDocs,

        { initial: isInitialSnapshot }

      );

      // Si la conversación ya está abierta y al final, marcar como leído.

      if (readBaselineReady && isChatScreenVisible() && isNearChatBottom()) {

        markIncomingMessagesRead(allLoadedDocs);

      }

    },

    (error) => {

      console.error("Error escuchando mensajes:", error);

      showStatus("Error al cargar mensajes");

      if (sendError) {

        sendError.textContent =

          "No se pudieron cargar los mensajes. Revisa las reglas de Firestore.";

      }

    }

  );

}

/* ==========================================

   11. REGISTRO DE CUENTAS

========================================== */

registerForm?.addEventListener("submit", async (event) => {

  event.preventDefault();

  if (registerError) {

    registerError.textContent =

      "El registro está deshabilitado. Solo pueden entrar las dos cuentas autorizadas.";

  }

});

/* ==========================================

   12. INICIO DE SESIÓN

========================================== */

loginForm?.addEventListener("submit", async (event) => {

  event.preventDefault();

  if (loginError) {

    loginError.textContent = "";

  }

  const email = emailInput?.value.trim() || "";

  const password = passwordInput?.value || "";

  if (!isAllowedChatEmail(email)) {

    if (loginError) loginError.textContent =

      "Este chat es privado y ese correo no está autorizado.";

    return;

  }

  try {

    if (loginError) {

      loginError.textContent = "Verificando acceso...";

    }

    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!isAllowedChatUser(credential.user)) {

      await signOut(auth);

      if (loginError) loginError.textContent =

        "La cuenta no coincide con las identidades autorizadas para este chat.";

      return;

    }

    if (passwordInput) {

      passwordInput.value = "";

    }

  } catch (error) {

    console.error("Error iniciando sesión:", error);

    const errors = {

      "auth/invalid-credential":

        "Correo o contraseña incorrectos.",

      "auth/user-not-found":

        "No existe una cuenta con ese correo.",

      "auth/wrong-password":

        "La contraseña es incorrecta.",

      "auth/invalid-email":

        "El correo electrónico no es válido.",

      "auth/too-many-requests":

        "Demasiados intentos. Inténtalo más tarde.",

      "auth/network-request-failed":

        "Comprueba tu conexión a internet."

    };

    if (loginError) {

      loginError.textContent =

        errors[error.code] ||

        "No se pudo iniciar sesión.";

    }

  }

});

/* ==========================================

   13. CERRAR SESIÓN

========================================== */

// Recuperación de contraseña con Firebase Authentication.

function installPasswordRecovery() {

  if (!loginForm || document.getElementById("chat-forgot-password")) return;

  const button = document.createElement("button");

  button.type = "button";

  button.id = "chat-forgot-password";

  button.textContent = "¿Olvidaste tu contraseña?";

  button.style.cssText =

    "display:block;margin:10px auto 0;padding:6px 10px;border:0;background:transparent;color:#ad5689;font:inherit;font-size:12px;text-decoration:underline;cursor:pointer";

  button.addEventListener("click", async () => {

    const email = emailInput?.value.trim() || "";

    if (!isAllowedChatEmail(email)) {

      if (loginError) loginError.textContent =

        "Escribe uno de los correos autorizados para recuperar la clave.";

      emailInput?.focus();

      return;

    }

    button.disabled = true;

    if (loginError) loginError.textContent = "Enviando enlace de recuperación...";

    try {

      await sendPasswordResetEmail(auth, email);

      if (loginError) loginError.textContent =

        "Solicitud enviada. Revisa la bandeja de entrada y spam del correo autorizado.";

    } catch (error) {

      console.error("Error enviando recuperación:", error);

      const errors = {

        "auth/invalid-email": "El correo no es válido.",

        "auth/user-not-found": "No existe una cuenta con ese correo.",

        "auth/too-many-requests": "Demasiados intentos. Inténtalo más tarde.",

        "auth/network-request-failed": "Comprueba tu conexión a internet."

      };

      if (loginError) loginError.textContent =

        errors[error.code] || "No se pudo enviar el enlace de recuperación.";

    } finally {

      button.disabled = false;

    }

  });

  (loginError || loginForm).insertAdjacentElement("afterend", button);

}

installPasswordRecovery();

logoutButton?.addEventListener("click", async () => {

  try {

    await markCurrentUserOffline(currentUser);

    await signOut(auth);

  } catch (error) {

    console.error("Error cerrando sesión:", error);

    showStatus("No se pudo cerrar la sesión");

  }

});

/* ==========================================

   14. ENVIAR MENSAJES

========================================== */

sendForm?.addEventListener("submit", async (event) => {

  event.preventDefault();

  if (!isAllowedChatUser(currentUser)) {

    if (sendError) sendError.textContent = "Esta cuenta no está autorizada para enviar mensajes.";

    return;

  }

  const text = messageInput?.value.trim() || "";

  const selectedFiles = Array.from(attachmentInput?.files || []);

  if (!text && selectedFiles.length === 0) return;

  if (sendButton) sendButton.disabled = true;

  if (attachmentButton) attachmentButton.disabled = true;

  if (sendError) sendError.textContent = "";

  try {

    if (selectedFiles.length === 0) {

      await addDoc(messagesRef, {

        text,

        senderUid: currentUser.uid,

        senderName: "Usuario",

        createdAt: serverTimestamp(),

        ...(replyingTo ? { replyTo: { ...replyingTo } } : {})

      });

    } else {

      for (let index = 0; index < selectedFiles.length; index++) {

        const file = selectedFiles[index];

        const safeName = file.name.replace(/[************\\\\\\\\\\\\\\\\\\\\\************/:*?"<>|]/g, "_");

        const uniqueName = `${Date.now()}_${crypto.randomUUID()}_${safeName}`;

        const path = `chat-media/${currentUser.uid}/${uniqueName}`;

        const fileRef = storageRef(storage, path);

        if (sendError) {

          sendError.textContent = `Subiendo ${index + 1} de ${selectedFiles.length}: ${file.name}`;

        }

        const metadata = {

          contentType: file.type || "application/octet-stream",

          customMetadata: {

            originalName: file.name,

            ownerUid: currentUser.uid

          }

        };

        await uploadBytes(fileRef, file, metadata);

        const downloadURL = await getDownloadURL(fileRef);

        await addDoc(messagesRef, {

          text: index === 0 ? text : "",

          senderUid: currentUser.uid,

          senderName: "Usuario",

          createdAt: serverTimestamp(),

          attachment: {

            name: file.name,

            contentType: file.type || "application/octet-stream",

            size: file.size,

            url: downloadURL,

            storagePath: path

          },

          ...(index === 0 && replyingTo ? { replyTo: { ...replyingTo } } : {})

        });

      }

    }

    if (messageInput) messageInput.value = "";

    if (attachmentInput) attachmentInput.value = "";

    clearReplyTarget();

    if (sendError) sendError.textContent = "";

    messageInput?.focus();

  } catch (error) {

    console.error("Error enviando mensaje o archivo:", error);

    if (sendError) {

      const messages = {

        "storage/unauthorized": "Storage rechazó la subida. Revisa sus reglas.",

        "storage/canceled": "La subida fue cancelada.",

        "storage/unknown": "Storage tuvo un error al subir el archivo."

      };

      sendError.textContent =

        messages[error.code] ||

        `No se pudo enviar. ${error.message || "Revisa las reglas de Firebase."}`;

    }

  } finally {

    if (sendButton) sendButton.disabled = false;

    if (attachmentButton) attachmentButton.disabled = false;

  }

});

/* ==========================================

   15. CONTROL GLOBAL DE ACCESO FIREBASE

========================================== */

if (authScreen) {

  authScreen.hidden = false;

}

if (privateContent) {

  privateContent.hidden = true;

}

if (authLoading) {

  authLoading.hidden = false;

}

hideAllScreens();

// Mantiene la sesión en este navegador aunque se cierre la pestaña o el navegador.

// Firebase la conserva en almacenamiento local hasta cerrar sesión o borrar los datos del sitio.

async function startAuthSession() {

  try {

    await setPersistence(auth, browserLocalPersistence);

  } catch (error) {

    console.error("No se pudo establecer la sesión persistente:", error);

    if (authLoading) authLoading.hidden = true;

    if (authScreen) authScreen.hidden = false;

    showGate();

    showStatus("No se pudo restaurar la sesión. Inicia sesión nuevamente.");

    return;

  }

  onAuthStateChanged(auth, async (user) => {

  stopPresenceTracking();

  currentUser = user;

  if (stopMessagesListener) {

    stopMessagesListener();

    stopMessagesListener = null;

  }

  if (messagesBox) {

    messagesBox.replaceChildren();

  }

  lastRenderedDocs = [];

  olderMessagesDocs = [];

  oldestLoadedMessageDoc = null;

  loadingOlderMessages = false;

  hasMoreOlderMessages = true;

  latestLiveMessagesDocs = [];

  savedChatScrollTop = null;

  pendingInitialScroll = true;

  if (chatRestoreFrame) {

    cancelAnimationFrame(chatRestoreFrame);

    chatRestoreFrame = null;

  }

  if (scrollUpdateFrame) {

    cancelAnimationFrame(scrollUpdateFrame);

    scrollUpdateFrame = null;

  }

  if (sendError) {

    sendError.textContent = "";

  }

  if (user && !isAllowedChatUser(user)) {

    await signOut(auth);

    currentUser = null;

    showGate();

    showStatus("Cuenta no autorizada para este chat");

    return;

  }

  if (user) {

    showChat();

    startMessagesListener(user);

    startPresenceTracking(user);

  } else {

    currentUser = null;

    peerPresence = null;

    if (statusLabel) {

      statusLabel.classList.remove(

        "is-online",

        "is-offline",

        "rolitas-presence"

      );

      statusLabel.textContent = "Conversación privada";

    }

    if (logoutButton) {

      logoutButton.hidden = true;

    }

    showGate();

    showStatus("Inicia sesión para continuar");

  }

  });

}

startAuthSession();
