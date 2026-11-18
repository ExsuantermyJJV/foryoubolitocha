/* ==========================================
   NUESTRAS ROLITAS - CHAT FIREBASE
   Login + Registro + Chat + PRESENCIA
========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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
const db = getFirestore(app);

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
let firstMessagesSnapshot = true;
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
  return `nuestrasRolitas:lastRead:${user.uid}`;
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

  localStorage.setItem(
    getReadStorageKey(currentUser),
    String(millis)
  );
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
      timestamp > lastReadMillis
    );
  }) || null;
}

function initializeReadMarkerIfNeeded(docs) {
  if (!currentUser || !docs.length) return;

  const key = getReadStorageKey(currentUser);

  if (localStorage.getItem(key) !== null) return;

  // No considerar todo el historial como nuevo.
  // Tomar como punto de partida el último mensaje propio.
  let baseline = 0;

  for (let i = docs.length - 1; i >= 0; i--) {
    const data = docs[i].data();

    if (data.senderUid === currentUser.uid) {
      baseline = getTimestampMillis(data.createdAt);
      break;
    }
  }

  // Si nunca se ha enviado un mensaje propio,
  // iniciar al final para no marcar todo el historial antiguo.
  if (!baseline) {
    for (let i = docs.length - 1; i >= 0; i--) {
      const data = docs[i].data();

      if (data.senderUid !== currentUser.uid) {
        baseline = getTimestampMillis(data.createdAt);
        break;
      }
    }
  }

  localStorage.setItem(key, String(baseline));
}

function markConversationReadIfAtBottom() {
  if (
    !currentUser ||
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

    const body = document.createElement("p");
    body.className = "chat-bubble-text";
    body.textContent = data.text || "";

    const meta = document.createElement("div");
    meta.className = "chat-bubble-meta";

    const time = document.createElement("time");
    time.textContent = formatMessageDate(data.createdAt);

    meta.appendChild(time);
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

    if (!mine && timestamp > lastReadMillis && !firstUnreadElement) {
      firstUnreadElement = bubble;
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
}

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
  });

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
  pendingInitialScroll = true;
  lastRenderedDocs = [];

  // Traer los últimos 100 mensajes y ordenarlos
  // del más antiguo al más reciente.
  const recentMessages = query(
    messagesRef,
    orderBy("createdAt", "desc"),
    limit(100)
  );

  stopMessagesListener = onSnapshot(
    recentMessages,

    (snapshot) => {
      if (currentUser?.uid !== user.uid) return;

      const isInitialSnapshot = firstMessagesSnapshot;

      firstMessagesSnapshot = false;

      const orderedDocs = [...snapshot.docs].reverse();

      // Inicializar la marca una sola vez en el primer acceso.
      if (isInitialSnapshot) {
        initializeReadMarkerIfNeeded(orderedDocs);
      }

      // Avisar únicamente por mensajes nuevos de la otra persona.
      // Nunca notificar mensajes históricos de la primera carga.
      if (!isInitialSnapshot) {
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

      lastRenderedDocs = orderedDocs;

      renderMessages(
        orderedDocs,
        { initial: isInitialSnapshot }
      );
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
    registerError.textContent = "";
  }

  const email = registerEmail?.value.trim() || "";
  const password = registerPassword?.value || "";

  try {
    if (registerError) {
      registerError.textContent = "Creando cuenta...";
    }

    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    registerForm.reset();

    showStatus("Cuenta creada correctamente");

  } catch (error) {
    console.error("Error en el registro:", error);

    const errors = {
      "auth/email-already-in-use":
        "Este correo ya está registrado.",

      "auth/invalid-email":
        "El correo electrónico no es válido.",

      "auth/weak-password":
        "La contraseña debe tener al menos 6 caracteres.",

      "auth/network-request-failed":
        "Comprueba tu conexión a internet."
    };

    if (registerError) {
      registerError.textContent =
        errors[error.code] ||
        "No se pudo crear la cuenta. Inténtalo nuevamente.";
    }
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

  try {
    if (loginError) {
      loginError.textContent = "Verificando acceso...";
    }

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

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

  if (!currentUser) return;

  const text = messageInput?.value.trim() || "";

  if (!text) return;

  if (sendButton) {
    sendButton.disabled = true;
  }

  if (sendError) {
    sendError.textContent = "";
  }

  try {
    await addDoc(messagesRef, {
      text: text,
      senderUid: currentUser.uid,
      senderName: "Usuario",
      createdAt: serverTimestamp(),
      ...(replyingTo ? { replyTo: { ...replyingTo } } : {})
    });

    messageInput.value = "";
    clearReplyTarget();
    messageInput.focus();

  } catch (error) {
    console.error("Error enviando mensajes:", error);

    if (sendError) {
      sendError.textContent =
        "No se pudo enviar. Comprueba los permisos de Firestore.";
    }

  } finally {
    if (sendButton) {
      sendButton.disabled = false;
    }
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

onAuthStateChanged(auth, (user) => {
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