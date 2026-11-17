
/* ==========================================
   NUESTRAS ROLITAS - CHAT FIREBASE
   Login + Registro + Chat
   Acceso global a toda la página.
   Cualquier usuario registrado puede entrar.
   Los correos no se muestran en los mensajes.
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


/* ==========================================
   1. CONFIGURACIÓN FIREBASE
========================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBkM7LOOsw-dTTwvPudeDmuIpQ-cs_AJEk",
  authDomain: "nuestras-rolitas.firebaseapp.com",
  projectId: "nuestras-rolitas",
  storageBucket: "nuestras-rolitas.firebasestorage.app",
  messagingSenderId: "995678016480",
  appId: "1:995678016480:web:482dae67c02be03b48d185"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


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

// Acceso global
const authScreen = document.getElementById("auth-screen");
const authLoading = document.getElementById("auth-loading");
const privateContent = document.getElementById("private-content");

// Pantallas de acceso
const chatGate = document.getElementById("chat-gate");
const loginForm = document.getElementById("chat-login");
const registerForm = document.getElementById("chat-register");

// Errores
const loginError = document.getElementById("chat-login-error");
const registerError = document.getElementById("register-error");

// Campos de acceso
const emailInput = document.getElementById("chat-email");
const passwordInput = document.getElementById("chat-password");

const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");

// Navegación de acceso
const showLoginButton = document.getElementById("show-login");
const showRegisterButton = document.getElementById("show-register");

const backLoginButton = document.getElementById("back-login");
const backRegisterButton = document.getElementById("back-register");

// Chat
const room = document.getElementById("chat-room");
const logoutButton = document.getElementById("chat-logout");

const statusLabel = document.getElementById("chat-status");
const messagesBox = document.getElementById("chat-messages");

const sendForm = document.getElementById("chat-send-form");
const messageInput = document.getElementById("chat-message-input");
const sendButton = document.getElementById("chat-send-button");

const sendError = document.getElementById("chat-send-error");


/* ==========================================
   4. ESTADO DEL CHAT
========================================== */

let currentUser = null;
let stopMessagesListener = null;


/* ==========================================
   5. ESTADOS Y PANTALLAS
========================================== */

function showStatus(message) {
  if (statusLabel) {
    statusLabel.textContent = message;
  }
}


// Ocultar las pantallas internas del acceso/chat.
function hideAllScreens() {
  if (chatGate) chatGate.hidden = true;
  if (loginForm) loginForm.hidden = true;
  if (registerForm) registerForm.hidden = true;
  if (room) room.hidden = true;
}


// Mostrar opciones de acceso.
// La página completa permanece oculta.
function showGate() {
  if (privateContent) {
    privateContent.hidden = true;
  }

  if (authScreen) {
    authScreen.hidden = false;
  }

  if (authLoading) {
    authLoading.hidden = true;
  }

  hideAllScreens();

  if (chatGate) {
    chatGate.hidden = false;
  }
}


// Mostrar formulario de inicio de sesión.
function showLogin() {
  if (privateContent) {
    privateContent.hidden = true;
  }

  if (authScreen) {
    authScreen.hidden = false;
  }

  if (authLoading) {
    authLoading.hidden = true;
  }

  hideAllScreens();

  if (loginForm) {
    loginForm.hidden = false;
  }

  if (loginError) {
    loginError.textContent = "";
  }
}


// Mostrar formulario de registro.
function showRegister() {
  if (privateContent) {
    privateContent.hidden = true;
  }

  if (authScreen) {
    authScreen.hidden = false;
  }

  if (authLoading) {
    authLoading.hidden = true;
  }

  hideAllScreens();

  if (registerForm) {
    registerForm.hidden = false;
  }

  if (registerError) {
    registerError.textContent = "";
  }
}


// Mostrar toda la página después de autenticar.
function showChat() {
  hideAllScreens();

  if (authScreen) {
    authScreen.hidden = true;
  }

  if (privateContent) {
    privateContent.hidden = false;
  }

  if (room) {
    room.hidden = false;
  }

  if (logoutButton) {
    logoutButton.hidden = false;
  }

  showStatus("Conectado · chat");
}


/* ==========================================
   6. NAVEGACIÓN
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
   7. FECHA Y HORA DE LOS MENSAJES
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
   8. MOSTRAR MENSAJES
   Sin correos ni nombres de usuario.
========================================== */

function renderMessages(snapshot) {
  if (!messagesBox || !currentUser) return;

  messagesBox.replaceChildren();

  const docs = snapshot.docs;

  if (!docs.length) {
    const empty = document.createElement("p");

    empty.className = "chat-empty";

    empty.textContent =
      "Todavía no hay mensajes. Puedes iniciar la conversación. 💗";

    messagesBox.appendChild(empty);

    return;
  }

  for (const item of docs) {
    const data = item.data();

    const mine = data.senderUid === currentUser.uid;

    const bubble = document.createElement("article");

    bubble.className = `chat-bubble ${
      mine ? "chat-bubble--mine" : "chat-bubble--theirs"
    }`;

    // Texto del mensaje.
    const body = document.createElement("p");

    body.className = "chat-bubble-text";

    body.textContent = data.text || "";

    // Metadatos: únicamente la hora.
    const meta = document.createElement("div");

    meta.className = "chat-bubble-meta";

    const time = document.createElement("time");

    time.textContent = formatMessageDate(data.createdAt);

    meta.appendChild(time);

    bubble.append(body, meta);

    messagesBox.appendChild(bubble);
  }

  // Mantener la conversación en el mensaje más reciente.
  messagesBox.scrollTop = messagesBox.scrollHeight;
}


/* ==========================================
   9. ESCUCHAR MENSAJES EN TIEMPO REAL
========================================== */

function startMessagesListener(user) {
  if (stopMessagesListener) {
    stopMessagesListener();
    stopMessagesListener = null;
  }

  currentUser = user;

  let firstSnapshot = true;

  const recentMessages = query(
    messagesRef,
    orderBy("createdAt", "desc"),
    limit(100)
  );

  stopMessagesListener = onSnapshot(
    recentMessages,

    (snapshot) => {
      if (currentUser?.uid !== user.uid) return;

      // Evitar notificaciones por mensajes antiguos al iniciar sesión.
      if (firstSnapshot) {
        firstSnapshot = false;
      } else {
        snapshot.docChanges().forEach(change => {
          if (change.type !== "added") return;

          const data = change.doc.data();

          // Notificar solamente mensajes de otra persona.
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

      const orderedSnapshot = {
        docs: [...snapshot.docs].reverse()
      };

      renderMessages(orderedSnapshot);
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
   10. REGISTRO DE CUENTAS
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

    // Firebase crea la cuenta e inicia sesión automáticamente.
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    registerForm.reset();

    showStatus("Cuenta creada correctamente");

    // onAuthStateChanged mostrará la página automáticamente.

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
   11. INICIO DE SESIÓN
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

    // onAuthStateChanged mostrará la página automáticamente.

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
   12. CERRAR SESIÓN
========================================== */

logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);

    // onAuthStateChanged ocultará la página automáticamente.

  } catch (error) {
    console.error("Error cerrando sesión:", error);

    showStatus("No se pudo cerrar la sesión");
  }
});


/* ==========================================
   13. ENVIAR MENSAJES
   Nunca guardar el correo como nombre.
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
      createdAt: serverTimestamp()
    });

    messageInput.value = "";
    messageInput.focus();

  } catch (error) {
    console.error("Error enviando mensaje:", error);

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
   14. CONTROL GLOBAL DE ACCESO FIREBASE
========================================== */

// Mientras Firebase comprueba la sesión,
// no se muestra el contenido privado.
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
  currentUser = user;

  // Detener la escucha anterior.
  if (stopMessagesListener) {
    stopMessagesListener();
    stopMessagesListener = null;
  }

  if (messagesBox) {
    messagesBox.replaceChildren();
  }

  if (sendError) {
    sendError.textContent = "";
  }

  if (user) {
    // Cualquier usuario autenticado puede entrar.
    showChat();

    startMessagesListener(user);

  } else {
    // No hay sesión: bloquear toda la página.
    currentUser = null;

    if (logoutButton) {
      logoutButton.hidden = true;
    }

    showGate();

    showStatus("Inicia sesión para continuar");
  }
});
