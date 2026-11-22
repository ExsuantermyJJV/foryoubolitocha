/* ==========================================
   NUESTRAS ROLITAS - JUEGOS
   Ahorcado + Dibuja y adivina
   Firebase Firestore, partidas persistentes
========================================== */

import { getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, getDoc, query, where,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const gamesRef = collection(db, "games");
const chatMessagesRef = collection(db, "chats", "rolitas-privado", "messages");

async function sendGameInviteMessage(gameId, type, hint = "") {
  if (!currentUser) throw new Error("Debes iniciar sesión para enviar una invitación.");
  const isHangman = type === "hangman";
  await addDoc(chatMessagesRef, {
    text: isHangman
      ? "🎯 Te ha enviado un desafío de ahorcado."
      : "🎨 Te ha enviado un desafío de dibujo.",
    senderUid: currentUser.uid,
    senderName: "Usuario",
    createdAt: serverTimestamp(),
    gameInvite: {
      gameId,
      type,
      title: isHangman ? "Desafío de ahorcado" : "Dibuja y adivina",
      hint: String(hint || "").slice(0, 100)
    }
  });
}

let currentUser = null;
let activeGamesTab = "all";
let stopOpenGames = null;
let stopMyGames = null;
let openGames = [];
let myGames = [];
let activeGame = null;
let activeGameStop = null;
let currentCanvasStrokes = [];
let drawing = false;
let currentStroke = null;

const styles = `
/* =========================================
   NUESTRAS ROLITAS · JUEGOS
   Integración real dentro del display
========================================= */

#rolitas-games-screen {
  position: absolute !important;
  top: 64px !important;       /* deja libre toda la barra superior del teléfono */
  right: 0 !important;
  bottom: 28px !important;    /* encima del indicador inferior */
  left: 0 !important;
  z-index: 5 !important;

  display: block !important;
  width: auto !important;
  height: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: 100% !important;
  max-height: none !important;

  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  padding: 0 16px 26px !important;
  border-radius: 0 0 30px 30px;
  color: #fff7fc !important;
  /* Transparente para reutilizar el fondo global del teléfono */
  background: transparent !important;

  font-family: "DM Sans",system-ui,sans-serif !important;
  isolation: isolate;
  box-sizing: border-box !important;
}

#rolitas-games-screen[hidden] { display: none !important; }
#rolitas-games-screen::-webkit-scrollbar { display: none !important; width: 0; }
#rolitas-games-screen *,
#rolitas-games-screen *::before,
#rolitas-games-screen *::after { box-sizing: border-box; }

/* Encabezado en el flujo normal: permanece arriba al abrir,
   pero se desplaza junto con el contenido, sin quedarse fijo. */
#rolitas-games-screen .rg-header {
  position: relative !important;
  top: auto !important;
  z-index: 1 !important;
  transform: none !important;

  display: flex !important;
  align-items: center !important;
  gap: 12px !important;

  margin: 0 -16px 0 !important;
  padding: 14px 16px 18px !important;

  /* El encabezado comparte el mismo fondo que el resto de las apps */
  background: transparent !important;
  border-bottom: 1px solid rgba(255,255,255,.045) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

#rolitas-games-screen .rg-back {
  display: grid !important;
  place-items: center !important;
  flex: 0 0 40px !important;
  width: 40px !important;
  height: 40px !important;
  padding: 0 !important;
  border: 1px solid rgba(255,255,255,.15) !important;
  border-radius: 14px !important;
  background: linear-gradient(145deg,rgba(255,255,255,.15),rgba(255,255,255,.05)) !important;
  color: #fff !important;
  font-size: 15px !important;
}

#rolitas-games-screen .rg-kicker {
  margin-bottom: 2px !important;
  color: #ee9acb !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: 2px !important;
  line-height: 1.4 !important;
}

#rolitas-games-screen .rg-header h2 {
  margin: 0 !important;
  color: #fff8ff !important;
  font-family: "Playfair Display",Georgia,serif !important;
  font-size: 24px !important;
  font-weight: 700 !important;
  line-height: 1.15 !important;
}

#rolitas-games-screen #rg-home {
  display: block;
  padding-top: 18px;
  padding-bottom: 8px;
}

#rolitas-games-screen .rg-intro {
  padding: 0 0 13px !important;
}

#rolitas-games-screen .rg-intro h3 {
  margin: 0 0 7px !important;
  color: #fff7fc !important;
  font-family: "Playfair Display",Georgia,serif !important;
  font-size: 22px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
}

#rolitas-games-screen .rg-muted {
  margin: 5px 0 !important;
  color: #c9b9ce !important;
  font-size: 11.5px !important;
  font-weight: 450 !important;
  line-height: 1.55 !important;
}

#rolitas-games-screen .rg-small {
  color: #a997b0 !important;
  font-size: 10px !important;
  line-height: 1.5 !important;
}

#rolitas-games-screen .rg-status:empty {
  display: none !important;
}

#rolitas-games-screen .rg-status {
  margin: 10px 0 !important;
  padding: 10px 12px !important;
  border: 1px solid rgba(235,119,190,.2) !important;
  border-radius: 12px !important;
  background: rgba(211,91,166,.09) !important;
  color: #f2b7d9 !important;
  font-size: 11px !important;
  line-height: 1.5 !important;
}

/* Pestañas */
#rolitas-games-screen .rg-tabs {
  display: flex !important;
  gap: 5px !important;
  margin: 12px 0 16px !important;
  padding: 4px !important;
  border: 1px solid rgba(255,255,255,.08) !important;
  border-radius: 15px !important;
  background: rgba(255,255,255,.055) !important;
}

#rolitas-games-screen .rg-tab {
  flex: 1 1 0 !important;
  min-width: 0 !important;
  min-height: 40px !important;
  padding: 8px 5px !important;
  border: 1px solid transparent !important;
  border-radius: 11px !important;
  background: transparent !important;
  color: #d8c9df !important;
  font-family: "DM Sans",system-ui,sans-serif !important;
  font-size: 11px !important;
  font-weight: 700 !important;
}

#rolitas-games-screen .rg-tab.active {
  border-color: rgba(255,255,255,.15) !important;
  background: linear-gradient(135deg,#e36ab3,#a74db7) !important;
  color: white !important;
  box-shadow: 0 5px 16px rgba(190,73,157,.25) !important;
}

/* Tarjetas */
#rolitas-games-screen .rg-card {
  position: relative !important;
  margin: 9px 0 !important;
  padding: 15px !important;
  overflow: hidden !important;
  border: 1px solid rgba(255,255,255,.12) !important;
  border-radius: 19px !important;
  background: linear-gradient(145deg,rgba(255,255,255,.105),rgba(255,255,255,.035)) !important;
  box-shadow: 0 10px 25px rgba(0,0,0,.18), inset 0 1px rgba(255,255,255,.045) !important;
}

#rolitas-games-screen .rg-card h4 {
  margin: 0 0 5px !important;
  color: #fff !important;
  font-size: 13px !important;
  font-weight: 800 !important;
}

#rolitas-games-screen .rg-card p { margin: 7px 0 10px !important; }

#rolitas-games-screen .rg-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
}

#rolitas-games-screen .rg-tag {
  flex: 0 0 auto !important;
  padding: 5px 9px !important;
  border: 1px solid rgba(238,119,190,.19) !important;
  border-radius: 30px !important;
  background: rgba(219,91,170,.15) !important;
  color: #f4b3d9 !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: .4px !important;
}

#rolitas-games-screen .rg-btn {
  min-height: 41px !important;
  padding: 10px 14px !important;
  border: 1px solid rgba(255,255,255,.12) !important;
  border-radius: 13px !important;
  background: linear-gradient(135deg,#e36bb5,#a54eb7) !important;
  color: white !important;
  box-shadow: 0 6px 17px rgba(183,72,157,.22) !important;
  font-family: "DM Sans",system-ui,sans-serif !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  cursor: pointer !important;
}

#rolitas-games-screen .rg-btn.secondary {
  border: 1px solid rgba(255,255,255,.14) !important;
  background: rgba(255,255,255,.075) !important;
  color: #f3e8f4 !important;
  box-shadow: none !important;
}

#rolitas-games-screen .rg-btn:disabled {
  opacity: .45 !important;
  cursor: not-allowed !important;
}

#rolitas-games-screen #rg-home > h4 {
  margin: 19px 0 8px !important;
  color: #f8eaf5 !important;
  font-size: 12px !important;
  font-weight: 800 !important;
}

#rolitas-games-screen .rg-list {
  display: grid !important;
  gap: 8px !important;
}

#rolitas-games-screen .rg-empty {
  padding: 19px 12px !important;
  border: 1px dashed rgba(231,190,232,.2) !important;
  border-radius: 16px !important;
  background: rgba(255,255,255,.018) !important;
  color: #c8b8ce !important;
  font-size: 11px !important;
  line-height: 1.55 !important;
  text-align: center !important;
}

#rolitas-games-screen .rg-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-top: 11px !important;
}

/* Formularios y dibujo */
#rolitas-games-screen .rg-game-panel {
  padding: 18px 0 24px !important;
}

#rolitas-games-screen .rg-form {
  display: grid !important;
  gap: 9px !important;
}

#rolitas-games-screen .rg-form label {
  margin: 2px 0 -3px !important;
  color: #e7d8eb !important;
  font-size: 10px !important;
  font-weight: 700 !important;
}

#rolitas-games-screen .rg-input,
#rolitas-games-screen .rg-select {
  display: block !important;
  width: 100% !important;
  min-height: 47px !important;
  padding: 12px 13px !important;
  border: 1px solid rgba(255,255,255,.16) !important;
  border-radius: 13px !important;
  outline: none !important;
  background: rgba(255,255,255,.075) !important;
  color: #fff7ff !important;
  font-family: "DM Sans",system-ui,sans-serif !important;
  font-size: 12px !important;
}

#rolitas-games-screen .rg-input::placeholder { color: #aa98b2 !important; }

#rolitas-games-screen .rg-category-box {
  display: grid !important;
  gap: 8px !important;
  padding: 13px !important;
  border: 1px solid rgba(236,133,198,.24) !important;
  border-radius: 16px !important;
  background: linear-gradient(135deg,rgba(220,91,171,.13),rgba(255,255,255,.035)) !important;
  box-shadow: inset 0 1px rgba(255,255,255,.04) !important;
}
#rolitas-games-screen .rg-category-title {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;
  color: #ffd4eb !important;
  font-size: 11px !important;
  font-weight: 900 !important;
}
#rolitas-games-screen .rg-select {
  appearance: none !important;
  -webkit-appearance: none !important;
  padding-right: 38px !important;
  border-color: rgba(235,137,197,.34) !important;
  background-color: rgba(25,15,30,.94) !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23f3a9d2' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 13px center !important;
  box-shadow: 0 5px 16px rgba(0,0,0,.16) !important;
}
#rolitas-games-screen .rg-hint {
  margin: 10px 0 !important;
  padding: 11px 13px !important;
  border: 1px solid rgba(245,190,102,.27) !important;
  border-radius: 13px !important;
  background: linear-gradient(135deg,rgba(245,190,102,.12),rgba(245,190,102,.045)) !important;
  color: #ffe0a7 !important;
  font-size: 11px !important;
  line-height: 1.55 !important;
}
#rolitas-games-screen .rg-hint strong { color: #fff0c9 !important; }
#rolitas-games-screen .rg-hint-btn {
  min-height: 36px !important;
  padding: 8px 11px !important;
  border: 1px solid rgba(245,190,102,.3) !important;
  border-radius: 11px !important;
  background: rgba(245,190,102,.11) !important;
  color: #ffe0a7 !important;
  font-size: 10px !important;
  font-weight: 800 !important;
}

#rolitas-games-screen .rg-input:focus { border-color: #e879bd !important; box-shadow: 0 0 0 3px rgba(232,121,189,.13) !important; }
/* Opciones de categoría legibles antes y después de seleccionarlas.
   Algunos navegadores heredaban texto oscuro sobre el menú oscuro. */
#rolitas-games-screen .rg-input option,
#rolitas-games-screen .rg-select option {
  color: #fff7fc !important;
  background: #281b2d !important;
}
#rolitas-games-screen .rg-select {
  color: #fff7fc !important;
  -webkit-text-fill-color: #fff7fc !important;
  background-color: #211626 !important;
}
#rolitas-games-screen .rg-select:focus {
  border-color: #e879bd !important;
  box-shadow: 0 0 0 3px rgba(232,121,189,.15) !important;
}
#rolitas-games-screen .rg-select option:checked {
  color: #fff !important;
  background: #a94f91 !important;
}

#rolitas-games-screen .rg-canvas-wrap {
  width: 100% !important;
  overflow: hidden !important;
  border: 1px solid rgba(255,255,255,.18) !important;
  border-radius: 16px !important;
  background: #fff !important;
  touch-action: none !important;
}

#rolitas-games-screen #rg-draw-canvas,
#rolitas-games-screen #rg-view-canvas {
  display: block !important;
  width: 100% !important;
  height: auto !important;
  aspect-ratio: 720 / 460 !important;
  background: #fff !important;
  touch-action: none !important;
}

#rolitas-games-screen .rg-colors {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 10px !important;
  margin: 8px 0 12px !important;
}

#rolitas-games-screen .rg-color {
  width: 23px !important;
  height: 23px !important;
  padding: 0 !important;
  border: 2px solid rgba(255,255,255,.7) !important;
  border-radius: 50% !important;
}

#rolitas-games-screen .rg-color.selected {
  outline: 2px solid #f2a5d3 !important;
  outline-offset: 3px !important;
}

#rolitas-games-screen .rg-hangman {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 130px !important;
  margin: 10px 0 !important;
  border: 1px solid rgba(255,255,255,.08) !important;
  border-radius: 16px !important;
  background: rgba(255,255,255,.035) !important;
}

#rolitas-games-screen .rg-hangman svg {
  width: 180px !important;
  max-width: 100% !important;
  height: 120px !important;
}

#rolitas-games-screen .rg-word {
  margin: 17px 0 !important;
  color: #ffd1eb !important;
  font-size: 24px !important;
  font-weight: 900 !important;
  letter-spacing: 5px !important;
  line-height: 1.6 !important;
  text-align: center !important;
  overflow-wrap: anywhere !important;
}

#rolitas-games-screen .rg-keyboard {
  display: grid !important;
  grid-template-columns: repeat(7,minmax(0,1fr)) !important;
  gap: 5px !important;
  margin: 14px 0 !important;
}

#rolitas-games-screen .rg-key {
  min-width: 0 !important;
  min-height: 37px !important;
  padding: 5px 0 !important;
  border: 1px solid rgba(255,255,255,.13) !important;
  border-radius: 9px !important;
  background: rgba(255,255,255,.09) !important;
  color: white !important;
  font-size: 11px !important;
  font-weight: 800 !important;
}

#rolitas-games-screen .rg-key:disabled { opacity: .28 !important; }
#rolitas-games-screen .rg-hangman-result {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: center !important;
  gap: 12px !important;
  text-align: center !important;
}
#rolitas-games-screen .rg-hangman-result strong {
  display: block !important;
  min-width: 0 !important;
  overflow-wrap: anywhere !important;
  line-height: 1.45 !important;
}
#rolitas-games-screen .rg-hangman-result .rg-btn {
  align-self: center !important;
  min-width: 125px !important;
}
#rolitas-games-screen .rg-guess.rg-word-found {
  border: 1px solid rgba(65,205,139,.55) !important;
  background: rgba(35,155,100,.2) !important;
  color: #a9f2cb !important;
}


#rolitas-games-screen .rg-guess-list {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
  margin: 10px 0 !important;
}

#rolitas-games-screen .rg-guess {
  padding: 6px 9px !important;
  border: 1px solid rgba(255,255,255,.08) !important;
  border-radius: 9px !important;
  background: rgba(255,255,255,.08) !important;
  color: #f7e8f5 !important;
  font-size: 10px !important;
}

#rolitas-games-screen button:focus-visible,
#rolitas-games-screen input:focus-visible {
  outline: 2px solid #f4a6d4 !important;
  outline-offset: 3px !important;
}

@media (max-width: 360px) {
  #rolitas-games-screen { padding-right: 12px !important; padding-left: 12px !important; }
  #rolitas-games-screen .rg-header { margin-right: -12px !important; margin-left: -12px !important; padding-right: 12px !important; padding-left: 12px !important; }
  #rolitas-games-screen .rg-card { padding: 13px !important; }
  #rolitas-games-screen .rg-tab { font-size: 10px !important; }
}

/* Espaciado más cómodo entre encabezado, introducción, pestañas y tarjetas */
#rolitas-games-screen #rg-home {
  padding-top: 12px !important;
  padding-bottom: 18px !important;
}

#rolitas-games-screen .rg-intro {
  padding: 0 0 19px !important;
}

#rolitas-games-screen .rg-intro h3 {
  margin: 0 0 10px !important;
  line-height: 1.25 !important;
}

#rolitas-games-screen .rg-intro .rg-muted {
  margin: 0 !important;
  line-height: 1.65 !important;
}

#rolitas-games-screen .rg-tabs {
  margin: 17px 0 21px !important;
}

#rolitas-games-screen .rg-card {
  margin: 12px 0 !important;
  padding: 17px !important;
}

#rolitas-games-screen .rg-card h4 {
  margin: 0 0 8px !important;
  line-height: 1.4 !important;
}

#rolitas-games-screen .rg-card p {
  margin: 9px 0 13px !important;
  line-height: 1.6 !important;
}

#rolitas-games-screen #rg-home > h4 {
  margin: 25px 0 11px !important;
  line-height: 1.4 !important;
}

#rolitas-games-screen .rg-empty {
  padding: 21px 14px !important;
  line-height: 1.65 !important;
}
`;
const styleEl = document.createElement("style");
styleEl.id = "rolitas-games-styles";
styleEl.textContent = styles;
document.head.appendChild(styleEl);

const appGrid = document.querySelector(".app-grid");
let appButton = null;
const phoneScreen = document.getElementById("phone-screen");
if (!appGrid || !phoneScreen) {
  console.warn("Juegos: no se encontró el teléfono de Nuestras Rolitas.");
} else {
  appButton = document.createElement("button");
  appButton.className = "app-icon";
  appButton.type = "button";
  appButton.dataset.openApp = "games";
  appButton.innerHTML = '<span class="app-icon-image" style="background:linear-gradient(145deg,#b978d5,#7e55a8);color:white"><i class="fa-solid fa-gamepad"></i></span><span>Juegos</span>';
  appGrid.appendChild(appButton);

  const screen = document.createElement("section");
  screen.id = "rolitas-games-screen";
  screen.className = "app-screen";
  screen.dataset.appScreen = "games";
  screen.hidden = true;
  screen.innerHTML = `
    <div class="rg-header">
      <button class="rg-back" id="rg-back" type="button" aria-label="Volver"><i class="fa-solid fa-chevron-left"></i></button>
      <div><div class="rg-kicker">NUESTRAS ROLITAS</div><h2>Juegos</h2></div>
    </div>
    <div id="rg-home">
      <div class="rg-intro"><h3>Un ratito para jugar</h3><div class="rg-muted">Desafíos para dos. Puedes responder ahora o volver dentro de unos días.</div></div>
      <div class="rg-tabs">
        <button class="rg-tab active" data-rg-tab="all">Todos</button>
        <button class="rg-tab" data-rg-tab="pending">Pendientes</button>
        <button class="rg-tab" data-rg-tab="mine">Mis partidas</button>
      </div>
      <div class="rg-card">
        <div class="rg-row"><h4>🎯 Ahorcado</h4><span class="rg-tag">POR TURNOS</span></div>
        <p class="rg-muted">Elige una palabra y una pista. La otra persona intenta descubrirla letra por letra.</p>
        <div class="rg-actions">
          <button class="rg-btn" id="rg-new-hangman">Crear desafío online</button>
          <button class="rg-btn secondary" id="rg-solo-hangman">Jugar individual</button>
        </div>
      </div>
      <div class="rg-card">
        <div class="rg-row"><h4>🎨 Dibuja y adivina</h4><span class="rg-tag">POR TURNOS</span></div>
        <p class="rg-muted">Dibuja una palabra secreta y envía el reto. La otra persona tendrá que adivinar.</p>
        <div class="rg-actions">
          <button class="rg-btn" id="rg-new-draw">Crear desafío online</button>
        </div>
      </div>
      <div class="rg-card">
        <div class="rg-row"><h4>🔎 Sopa de letras</h4><span class="rg-tag">8 DIRECCIONES</span></div>
        <p class="rg-muted">Encuentra palabras horizontales, verticales y diagonales, incluso al revés.</p>
        <button class="rg-btn" id="rg-solo-wordsearch">Jugar individual</button>
      </div>
      <h4 style="font-size:13px;margin:18px 0 8px">Desafíos disponibles</h4>
      <div id="rg-open-list" class="rg-list"><div class="rg-empty">Cargando desafíos...</div></div>
      <h4 style="font-size:13px;margin:18px 0 8px">Tus partidas</h4>
      <div id="rg-my-list" class="rg-list"><div class="rg-empty">Todavía no tienes partidas.</div></div>
    </div>
    <div id="rg-create-panel" class="rg-game-panel" hidden></div>
    <div id="rg-detail-panel" class="rg-game-panel" hidden></div>
    <p id="rg-message" class="rg-status" role="status" aria-live="polite"></p>
  `;
  phoneScreen.appendChild(screen);
}

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function openGamesScreen() {
  document.querySelectorAll("[data-app-screen]").forEach(el => {
    el.hidden = el !== $("rolitas-games-screen");
  });

  document.body.dataset.currentApp = "games";
  showHomePanel();

  // Reset the previous scroll position so the intro and first card
  // never remain hidden underneath the sticky header.
  const gamesScreen = $("rolitas-games-screen");
  const phone = document.getElementById("phone-screen");

  if (gamesScreen) gamesScreen.scrollTop = 0;
  if (phone) phone.scrollTop = 0;

  requestAnimationFrame(() => {
    if (gamesScreen) gamesScreen.scrollTop = 0;
  });
}
function closeGamesScreen() {
  if ($("rolitas-games-screen")) $("rolitas-games-screen").hidden = true;
  document.querySelectorAll('[data-app-screen="home"]').forEach(el => el.hidden = false);
  document.body.dataset.currentApp = "home";
}
function showHomePanel() {
  $("rg-home").hidden = false;
  $("rg-create-panel").hidden = true;
  $("rg-detail-panel").hidden = true;
  if (activeGameStop) { activeGameStop(); activeGameStop = null; }
  activeGame = null;
}
function showMessage(message) {
  if ($("rg-message")) $("rg-message").textContent = message || "";
}
function showPanel(panelId) {
  $("rg-home").hidden = true;
  $("rg-create-panel").hidden = panelId !== "rg-create-panel";
  $("rg-detail-panel").hidden = panelId !== "rg-detail-panel";
}
function gameDate(timestamp) {
  if (!timestamp) return "Hace un momento";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat("es-CO",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(date);
}
function gameTitle(game) {
  if (game.type === "hangman") return "🎯 Ahorcado";
  if (game.type === "wordsearch") return "🔎 Sopa de letras";
  return "🎨 Dibuja y adivina";
}
function renderGameLists() {
  const openList = $("rg-open-list");
  const myList = $("rg-my-list");
  const home = $("rg-home");

  if (!openList || !myList || !home) return;

  const tab = activeGamesTab;
  const headings = home.querySelectorAll(":scope > h4");
  const createCards = home.querySelectorAll(":scope > .rg-card");

  const openHeading = headings[0];
  const myHeading = headings[1];

  // Las tarjetas de creación solo pertenecen a la pestaña "Todos".
  createCards.forEach(card => {
    card.hidden = tab !== "all";
  });

  const available = currentUser
    ? openGames.filter(game =>
        game.creatorUid !== currentUser.uid && game.status === "open"
      )
    : [];

  // En esta versión, el turno de adivinar corresponde al usuario que aceptó.
  const pendingTurns = currentUser
    ? myGames.filter(game =>
        game.status === "active" &&
        game.opponentUid === currentUser.uid
      )
    : [];

  if (tab === "all") {
    if (openHeading) {
      openHeading.hidden = false;
      openHeading.textContent = "Desafíos disponibles";
    }
    if (myHeading) {
      myHeading.hidden = false;
      myHeading.textContent = "Tus partidas";
    }

    openList.hidden = false;
    myList.hidden = false;

    renderAvailableGames(available, openList);
    renderMyGames(myGames, myList);
    return;
  }

  if (tab === "pending") {
    if (openHeading) {
      openHeading.hidden = false;
      openHeading.textContent = "Desafíos para aceptar";
    }
    if (myHeading) {
      myHeading.hidden = false;
      myHeading.textContent = "Partidas que debes responder";
    }

    openList.hidden = false;
    myList.hidden = false;

    renderAvailableGames(
      available,
      openList,
      "No tienes desafíos nuevos para aceptar."
    );
    renderMyGames(
      pendingTurns,
      myList,
      "No tienes partidas esperando tu respuesta."
    );
    return;
  }

  // Pestaña "Mis partidas": todas las partidas donde participa este usuario.
  if (tab === "mine") {
    if (openHeading) openHeading.hidden = true;
    if (myHeading) {
      myHeading.hidden = false;
      myHeading.textContent = "Todas tus partidas";
    }

    openList.hidden = true;
    myList.hidden = false;

    renderMyGames(
      myGames,
      myList,
      "Todavía no has creado ni aceptado ninguna partida."
    );
  }
}

function renderAvailableGames(games, container, emptyText) {
  container.innerHTML = "";

  if (!games.length) {
    container.innerHTML = `<div class="rg-empty">${emptyText || "No hay desafíos nuevos por ahora. ¡Crea uno! 💗"}</div>`;
    return;
  }

  games.forEach(game => {
    const card = document.createElement("div");
    card.className = "rg-card";
    card.innerHTML = `
      <div class="rg-row">
        <h4>${gameTitle(game)}</h4>
        <span class="rg-tag">NUEVO</span>
      </div>
      <p class="rg-muted">${escapeHtml(game.hint || "Un desafío te está esperando")}</p>
      <div class="rg-small">${gameDate(game.createdAt)}</div>
      <div class="rg-actions">
        <button class="rg-btn" type="button">Aceptar desafío</button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => {
      joinGame(game.id, game);
    });

    container.appendChild(card);
  });
}

function renderMyGames(games, container, emptyText) {
  container.innerHTML = "";

  if (!games.length) {
    container.innerHTML = `<div class="rg-empty">${emptyText || "Tus partidas aparecerán aquí. 💗"}</div>`;
    return;
  }

  const sortedGames = [...games].sort((a, b) => {
    const timeOf = value =>
      value?.toMillis?.() ||
      (value instanceof Date ? value.getTime() : 0);

    return timeOf(b.updatedAt || b.createdAt) -
           timeOf(a.updatedAt || a.createdAt);
  });

  sortedGames.forEach(game => {
    const card = document.createElement("div");
    card.className = "rg-card";

    let status = "EN CURSO";
    let subtitle = game.type === "hangman"
      ? "Desafío de ahorcado"
      : "Desafío de dibujo";

    if (game.status === "open") {
      status = "ESPERANDO JUGADOR";
      subtitle = "Esperando que la otra persona acepte";
    } else if (game.status === "finished") {
      status = "TERMINADA";
      subtitle = game.winnerUid === currentUser?.uid
        ? "¡Ganaste esta partida! 🎉"
        : game.winnerUid
          ? "La otra persona ganó esta partida."
          : "La partida terminó.";
    } else if (game.status === "active" && game.opponentUid === currentUser?.uid) {
      status = "TU TURNO";
      subtitle = game.type === "hangman"
        ? "Te toca adivinar la palabra."
        : "Te toca adivinar el dibujo.";
    } else if (game.status === "active") {
      status = "ESPERANDO RESPUESTA";
      subtitle = "La otra persona tiene el turno.";
    }

    card.innerHTML = `
      <div class="rg-row">
        <h4>${gameTitle(game)}</h4>
        <span class="rg-tag">${status}</span>
      </div>
      <p class="rg-muted">${subtitle}</p>
      <div class="rg-small">${gameDate(game.updatedAt || game.createdAt)}</div>
      <div class="rg-actions">
        <button class="rg-btn secondary" type="button">Abrir partida</button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => {
      watchGame(game.id);
    });

    container.appendChild(card);
  });
}

function subscribeLists(user) {
  if (stopOpenGames) stopOpenGames();
  if (stopMyGames) stopMyGames();

  stopOpenGames = onSnapshot(query(gamesRef, where("status","==","open")), snap => {
    openGames = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderGameLists();
  }, err => { console.error(err); showMessage("No se pudieron cargar los desafíos. Revisa las reglas de Firestore."); });

  stopMyGames = onSnapshot(query(gamesRef, where("players","array-contains",user.uid)), snap => {
    myGames = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderGameLists();
  }, err => { console.error(err); showMessage("No se pudieron cargar tus partidas. Revisa las reglas de Firestore."); });
}

async function createHangman() {
  const word = $("rg-word-input")?.value.trim();
  const hint = $("rg-hint-input")?.value.trim();
  if (!word || word.replace(/\s/g,"").length < 2) return showMessage("Escribe una palabra de al menos 2 letras.");
  if (word.length > 32) return showMessage("La palabra o frase puede tener máximo 32 caracteres.");
  const cleanWord = word.toLocaleUpperCase("es-CO");
  try {
    const ref = await addDoc(gamesRef, {
      type:"hangman", creatorUid:currentUser.uid, players:[currentUser.uid],
      opponentUid:null, status:"open", word:cleanWord, hint:hint.slice(0,100),
      guessedLetters:[], mistakes:0, maxMistakes:6, winnerUid:null,
      createdAt:serverTimestamp(), updatedAt:serverTimestamp()
    });
    await sendGameInviteMessage(ref.id, "hangman", hint);
    showMessage("¡Desafío enviado al chat! La otra persona puede tocar «Jugar ahora».");
    showHomePanel();
  } catch (err) {
    console.error(err); showMessage("No se pudo crear el desafío. Revisa las reglas de Firestore.");
  }
}

function renderCreateHangman() {
  showPanel("rg-create-panel");
  $("rg-create-panel").innerHTML = `
    <div class="rg-intro"><h3>🎯 Crear ahorcado</h3><p class="rg-muted">Piensa en una palabra o frase. La otra persona tendrá que descubrirla.</p></div>
    <form id="rg-hangman-form" class="rg-form">
      <label class="rg-small">Palabra o frase secreta</label>
      <input class="rg-input" id="rg-word-input" maxlength="32" placeholder="Ej. NUESTRAS ROLITAS" required autocomplete="off">
      <label class="rg-small">Pista (opcional)</label>
      <input class="rg-input" id="rg-hint-input" maxlength="100" placeholder="Ej. Una canción que nos gusta">
      <div class="rg-actions"><button class="rg-btn" type="submit">Enviar desafío</button><button class="rg-btn secondary" id="rg-cancel-create" type="button">Cancelar</button></div>
    </form>`;
  $("rg-hangman-form").addEventListener("submit", e => {e.preventDefault(); createHangman();});
  $("rg-cancel-create").addEventListener("click", showHomePanel);
}

function drawCanvasBase(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
}
function paintStrokes(canvas, strokes) {
  drawCanvasBase(canvas);
  const ctx = canvas.getContext("2d");
  (strokes || []).forEach(stroke => {
    if (!stroke.points?.length) return;
    ctx.beginPath(); ctx.strokeStyle = stroke.color || "#222"; ctx.lineWidth = stroke.width || 5;
    stroke.points.forEach((p,i) => i ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]));
    if (stroke.points.length === 1) { const p=stroke.points[0]; ctx.lineTo(p[0]+.1,p[1]+.1); }
    ctx.stroke();
  });
}
function renderCreateDraw() {
  showPanel("rg-create-panel");
  currentCanvasStrokes = [];
  $("rg-create-panel").innerHTML = `
    <div class="rg-intro"><h3>🎨 Dibuja y adivina</h3><p class="rg-muted">Dibuja la palabra secreta sin escribirla en el dibujo. Luego envía el desafío.</p></div>
    <form id="rg-draw-form" class="rg-form">
      <label class="rg-small">Palabra que deberán adivinar</label>
      <input class="rg-input" id="rg-draw-word" maxlength="32" placeholder="Ej. GATO" required autocomplete="off">
      <label class="rg-small">Pista opcional</label>
      <input class="rg-input" id="rg-draw-hint" maxlength="100" placeholder="Ej. Animal doméstico">
      <div class="rg-canvas-wrap"><canvas id="rg-draw-canvas" width="720" height="460"></canvas></div>
      <div class="rg-colors">
        <button class="rg-color selected" data-color="#29202d" style="background:#29202d" type="button"></button>
        <button class="rg-color" data-color="#d84b91" style="background:#d84b91" type="button"></button>
        <button class="rg-color" data-color="#4777c8" style="background:#4777c8" type="button"></button>
        <button class="rg-color" data-color="#35a77b" style="background:#35a77b" type="button"></button>
        <button class="rg-color" data-color="#f0a13d" style="background:#f0a13d" type="button"></button>
        <button class="rg-color" data-color="#fff" style="background:#fff;border:1px solid #aaa" type="button" title="Borrador"></button>
        <button id="rg-clear-canvas" class="rg-btn secondary" type="button">Borrar</button>
      </div>
      <div class="rg-actions"><button class="rg-btn" type="submit">Enviar dibujo</button><button class="rg-btn secondary" id="rg-cancel-draw" type="button">Cancelar</button></div>
    </form>`;
  const canvas = $("rg-draw-canvas");
  drawCanvasBase(canvas);
  let color = "#29202d";
  $("rg-create-panel").querySelectorAll(".rg-color").forEach(btn => btn.addEventListener("click", () => {
    color = btn.dataset.color;
    $("rg-create-panel").querySelectorAll(".rg-color").forEach(b => b.classList.toggle("selected", b===btn));
  }));
  const point = e => {
    const r = canvas.getBoundingClientRect();
    return [Math.round((e.clientX-r.left)*canvas.width/r.width),Math.round((e.clientY-r.top)*canvas.height/r.height)];
  };
  canvas.addEventListener("pointerdown", e => {
    drawing = true; canvas.setPointerCapture(e.pointerId);
    currentStroke = {color,width:10,points:[point(e)]}; currentCanvasStrokes.push(currentStroke);
    paintStrokes(canvas,currentCanvasStrokes);
  });
  canvas.addEventListener("pointermove", e => {
    if (!drawing || !currentStroke) return;
    const p=point(e), last=currentStroke.points[currentStroke.points.length-1];
    if (Math.abs(p[0]-last[0])+Math.abs(p[1]-last[1])>3) currentStroke.points.push(p);
    paintStrokes(canvas,currentCanvasStrokes);
  });
  const stop = () => {drawing=false;currentStroke=null;};
  canvas.addEventListener("pointerup",stop); canvas.addEventListener("pointercancel",stop);
  $("rg-clear-canvas").addEventListener("click",()=>{currentCanvasStrokes=[];drawCanvasBase(canvas);});
  $("rg-cancel-draw").addEventListener("click",showHomePanel);
  $("rg-draw-form").addEventListener("submit", async e => {
    e.preventDefault();
    const word=$("rg-draw-word").value.trim();
    if (!word) return;
    const pointCount=currentCanvasStrokes.reduce((n,s)=>n+s.points.length,0);
    if (pointCount<5) return showMessage("Haz un dibujo antes de enviarlo.");
    if (pointCount>3500) return showMessage("El dibujo tiene demasiados trazos. Simplifícalo un poco.");
    try {
      const ref = await addDoc(gamesRef,{
        type:"draw",creatorUid:currentUser.uid,players:[currentUser.uid],
        opponentUid:null,status:"open",word:word.toLocaleUpperCase("es-CO"),
        hint:$("rg-draw-hint").value.trim().slice(0,100),
        strokes:currentCanvasStrokes,guesses:[],winnerUid:null,
        createdAt:serverTimestamp(),updatedAt:serverTimestamp()
      });
      await sendGameInviteMessage(ref.id, "draw", $("rg-draw-hint").value.trim());
      showMessage("¡Desafío enviado al chat! La otra persona puede tocar «Jugar ahora».");
      showHomePanel();
    } catch(err) {console.error(err);showMessage("No se pudo guardar el dibujo. Prueba con un dibujo más sencillo.");}
  });
}

async function joinGame(id, game) {
  if (!currentUser || game.creatorUid === currentUser.uid) return;
  try {
    await updateDoc(doc(db,"games",id),{
      players:[game.creatorUid,currentUser.uid],
      opponentUid:currentUser.uid,status:"active",updatedAt:serverTimestamp()
    });
    watchGame(id);
  } catch(err) {console.error(err);showMessage("No se pudo aceptar el desafío. Puede que otra persona ya lo haya aceptado.");}
}

// El botón «Jugar ahora» de una invitación del chat abre la partida real.
window.addEventListener("rolitas:open-game", async (event) => {
  const gameId = event.detail?.gameId;
  if (!gameId || !currentUser) return;
  try {
    const snapshot = await getDoc(doc(db, "games", gameId));
    if (!snapshot.exists()) {
      showMessage("Esta partida ya no existe.");
      openGamesScreen();
      return;
    }
    const game = { id: snapshot.id, ...snapshot.data() };
    openGamesScreen();
    if (game.creatorUid !== currentUser.uid && game.status === "open") {
      await joinGame(gameId, game);
    } else {
      watchGame(gameId);
    }
  } catch (error) {
    console.error("No se pudo abrir la invitación:", error);
    showMessage("No se pudo abrir la partida. Revisa tu conexión y los permisos de Firestore.");
  }
});

function watchGame(id) {
  if (activeGameStop) activeGameStop();
  activeGameStop = onSnapshot(doc(db,"games",id), snap => {
    if (!snap.exists()) {showMessage("Esta partida ya no existe.");showHomePanel();return;}
    activeGame = {id:snap.id,...snap.data()};
    renderGameDetail(activeGame);
  }, err => {console.error(err);showMessage("No se pudo abrir esta partida.");});
}
function hangmanSvg(mistakes) {
  const parts = [
    '<circle cx="128" cy="30" r="13" />',
    '<path d="M128 43 V82" />',
    '<path d="M128 54 L108 70" />',
    '<path d="M128 54 L148 70" />',
    '<path d="M128 82 L110 105" />',
    '<path d="M128 82 L146 105" />'
  ];
  return `<svg viewBox="0 0 190 125" fill="none" stroke="#f2b2d8" stroke-width="4" stroke-linecap="round"><path d="M45 112 H155 M65 112 V10 H128 V17"/>${parts.slice(0,mistakes).join("")}</svg>`;
}
async function guessLetter(letter) {
  if (!activeGame || activeGame.status !== "active" || currentUser.uid !== activeGame.opponentUid) return;
  const guessed = activeGame.guessedLetters || [];
  if (guessed.includes(letter)) return;
  const next = [...guessed,letter];
  const hit = normalize(activeGame.word).includes(normalize(letter));
  const mistakes = activeGame.mistakes + (hit ? 0 : 1);
  const won = [...activeGame.word.toLocaleUpperCase("es-CO")].every(ch => !/[A-ZÁÉÍÓÚÜÑ]/.test(ch) || normalize(next).includes(normalize(ch)));
  const lost = mistakes >= activeGame.maxMistakes;
  try {
    await updateDoc(doc(db,"games",activeGame.id),{
      guessedLetters:next,mistakes,
      status:(won||lost)?"finished":"active",
      winnerUid:won?currentUser.uid:null,
      updatedAt:serverTimestamp()
    });
  } catch(err) {console.error(err);showMessage("No se pudo guardar tu intento.");}
}
function renderHangman(game) {
  const isGuesser = currentUser.uid === game.opponentUid;
  const done = game.status === "finished";
  const guessed = game.guessedLetters || [];
  const display = [...game.word].map(ch => !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(ch) ? ch : (normalize(guessed).includes(normalize(ch)) || done ? ch : "_")).join(" ");
  const won = game.winnerUid === currentUser.uid;
  const keys = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
  return `
    <div class="rg-intro"><h3>🎯 Ahorcado</h3><p class="rg-muted">${escapeHtml(game.hint || "Sin pista")}</p></div>
    <div class="rg-hangman">${hangmanSvg(game.mistakes || 0)}</div>
    <div class="rg-word">${display}</div>
    <div class="rg-row"><span class="rg-small">Errores: ${game.mistakes}/6</span><span class="rg-small">Aciertos: ${guessed.length-(game.mistakes||0)}</span></div>
    <div class="rg-keyboard">${keys.map(k=>`<button class="rg-key" data-letter="${k}" ${!isGuesser||done||guessed.includes(k)?"disabled":""}>${k}</button>`).join("")}</div>
    <div class="rg-status">${done?(won?"¡Lo lograste! 🎉":game.winnerUid?"La otra persona ganó. 💗":"Se acabaron los intentos."):isGuesser?"Es tu turno: toca una letra cuando quieras.":"La otra persona está adivinando. Puedes volver más tarde."}</div>
    ${done?`<div class="rg-card"><strong>La palabra era: ${escapeHtml(game.word)}</strong></div>`:""}
    <div class="rg-small">Creado ${gameDate(game.createdAt)} · Partida guardada</div>`;
}
function renderDraw(game) {
  const isGuesser = currentUser.uid === game.opponentUid;
  const done = game.status === "finished";
  const won = game.winnerUid === currentUser.uid;
  return `
    <div class="rg-intro"><h3>🎨 Dibuja y adivina</h3><p class="rg-muted">${escapeHtml(game.hint || "Mira el dibujo y descubre qué es.")}</p></div>
    <div class="rg-canvas-wrap"><canvas id="rg-view-canvas" width="720" height="460"></canvas></div>
    <div class="rg-status">${done?(won?"¡Adivinaste! 🎉":"Desafío terminado."):isGuesser?"Escribe tu respuesta cuando creas saberla.":"Esperando que la otra persona adivine tu dibujo."}</div>
    ${isGuesser&&!done?`<form id="rg-guess-form" class="rg-form"><input id="rg-guess-input" class="rg-input" maxlength="32" placeholder="¿Qué dibujaron?" autocomplete="off" required><button class="rg-btn" type="submit">Enviar respuesta</button></form>`:""}
    <div class="rg-guess-list">${(game.guesses||[]).map(g=>`<span class="rg-guess">${escapeHtml(g.value)} · ${g.correct?"✓":"✕"}</span>`).join("")}</div>
    ${done?`<div class="rg-card"><strong>La respuesta era: ${escapeHtml(game.word)}</strong></div>`:""}
    <div class="rg-small">Puedes cerrar la aplicación y volver después; el desafío seguirá guardado.</div>`;
}
async function submitDrawGuess(value) {
  if (!activeGame || activeGame.status!=="active" || currentUser.uid!==activeGame.opponentUid) return;
  const correct = normalize(value) === normalize(activeGame.word);
  const guesses = [...(activeGame.guesses||[]),{value:value.slice(0,32),correct,by:currentUser.uid,at:Date.now()}];
  try {
    await updateDoc(doc(db,"games",activeGame.id),{
      guesses,status:correct?"finished":"active",
      winnerUid:correct?currentUser.uid:null,updatedAt:serverTimestamp()
    });
  } catch(err) {console.error(err);showMessage("No se pudo guardar tu respuesta.");}
}
function renderGameDetail(game) {
  showPanel("rg-detail-panel");
  const panel = $("rg-detail-panel");
  panel.innerHTML = `<div class="rg-row" style="margin:8px 0 16px;justify-content:flex-end"><span class="rg-tag">${game.status==="finished"?"FINALIZADA":game.status==="open"?"ESPERANDO":"EN CURSO"}</span></div><div id="rg-detail-content"></div>`;
  const content = $("rg-detail-content");
  content.innerHTML = game.type==="hangman" ? renderHangman(game) : renderDraw(game);
  if (game.type==="hangman") {
    content.querySelectorAll("[data-letter]").forEach(btn=>btn.addEventListener("click",()=>guessLetter(btn.dataset.letter)));
  } else {
    const canvas=$("rg-view-canvas");
    if (canvas) paintStrokes(canvas,game.strokes||[]);
    $("rg-guess-form")?.addEventListener("submit",e=>{
      e.preventDefault(); const value=$("rg-guess-input").value.trim();
      if(value) submitDrawGuess(value);
    });
  }
}


/* ==========================================================
   MODOS INDIVIDUALES + BANCO DE PALABRAS + SOPA DE LETRAS
   Los modos individuales se guardan localmente y no requieren
   crear documentos en Firestore.
========================================================== */

const SOLO_WORD_BANK = {"Comida": "MANZANA,PERA,FRESA,UVA,MANGO,PIÑA,BANANO,NARANJA,LIMON,SANDIA,MELON,CEREZA,PAPAYA,COCO,DURAZNO,KIWI,AGUACATE,TOMATE,ZANAHORIA,CEBOLLA", "Animales": "PERRO,GATO,CABALLO,VACA,CONEJO,TORTUGA,DELFIN,AGUILA,LEON,TIGRE,JIRAFA,ELEFANTE,MONO,PINGUINO,KOALA,ZORRO,LOBO,ARDILLA,MARIPOSA,ABEJA", "Ropa": "CAMISA,PANTALON,FALDA,VESTIDO,CHAQUETA,ABRIGO,ZAPATOS,BOTAS,SOMBRERO,GORRA,BUFANDA,GUANTES,CINTURON,CALCETINES,PIJAMA,BLUSA,SHORT,SUETER,MEDIAS,UNIFORME", "Ciudades": "MEDELLIN,BOGOTA,CALI,CARTAGENA,PASTO,MANIZALES,ARMENIA,IBAGUE,CUCUTA,MONTERIA,QUIBDO,POPAYAN,NEIVA,VALLEDUPAR,SANTA MARTA,BUCARAMANGA,PEREIRA,ENVIGADO,BELLO,RIONEGRO", "Nombres": "SOFIA,VALENTINA,CAMILA,LAURA,ISABELA,MARIANA,JUAN,MATEO,SANTIAGO,SEBASTIAN,DANIEL,ANDRES,EMILIA,ANTONIA,SAMUEL,NICOLAS,LUCIANA,GABRIEL,MANUELA,ANGEL", "Deportes": "FUTBOL,BALONCESTO,VOLEIBOL,NATACION,CICLISMO,TENIS,BOXEO,ATLETISMO,GIMNASIA,BEISBOL,RUGBY,GOLF,ESGRIMA,SURF,AJEDREZ,PATINAJE,ESCALADA,BADMINTON,SKATE,SOFTBOL", "Objetos": "TELEFONO,COMPUTADOR,TECLADO,MOUSE,VENTANA,ESPEJO,CUCHARA,TENEDOR,PLATO,TAZA,MOCHILA,RELOJ,LAMPARA,LLAVE,TIJERAS,CUADERNO,LAPIZ,BOTELLA,PARAGUAS,MALETA", "Naturaleza": "MONTAÑA,RIO,LAGO,BOSQUE,PLAYA,VOLCAN,DESIERTO,SELVA,CASCADA,ARCOIRIS,ESTRELLA,PLANETA,COMETA,NUBE,TORMENTA,TRUENO,FLOR,ARBOL,ROSA,GIRASOL", "Profesiones": "MEDICO,ENFERMERO,PROFESOR,INGENIERO,ABOGADO,COCINERO,PANADERO,BOMBERO,PILOTO,ARQUITECTO,PERIODISTA,VETERINARIO,ARTISTA,MUSICO,ACTOR,DISEÑADOR,AGRICULTOR,POLICIA,DENTISTA,CIENTIFICO", "Transporte": "AUTOBUS,AVION,TREN,BICICLETA,MOTOCICLETA,CARRO,TAXI,HELICOPTERO,BARCO,CAMION,TRACTOR,METRO,LANCHA,SUBMARINO,COHETE,TRICICLO,TELEFERICO,AMBULANCIA,PATINETA,VELERO", "Videojuegos": "MINECRAFT,MARIO,SONIC,ROBLOX,FORTNITE,TETRIS,POKEMON,ZELDA,MORTAL KOMBAT,FREE FIRE,VALORANT,OVERWATCH,HALO,DOOM,PORTAL,TERRARIA,STARDEW,CRASH,SPYRO,CELESTE", "Casa": "COCINA,SALA,COMEDOR,ALCOBA,BAÑO,TECHO,PARED,PUERTA,VENTILADOR,NEVERA,ESTUFA,SOFA,CAMA,ALMOHADA,CORTINA,ALFOMBRA,DUCHA,ARMARIO,ESCALERA,BALCON", "Musica": "GUITARRA,PIANO,TAMBOR,FLAUTA,VIOLIN,BAJO,TROMPETA,ARPA,ACORDEON,MARACAS,CANCION,MELODIA,RITMO,CONCIERTO,DISCO,BAILE,ROCK,SALSA,MERENGUE,JAZZ"};

const soloState = { mode: null, category: "Todas", word: "", guessed: [], mistakes: 0, strokes: [], selectedColor: "#29202d", grid: [], found: [], foundPaths: [], selecting: false, startCell: null, currentCell: null };
const soloCategories = ["Todas", ...Object.keys(SOLO_WORD_BANK)];
const soloNormalize = value => normalize(value).replace(/[^a-zñ]/g, "").toUpperCase();
const soloRandom = list => list[Math.floor(Math.random() * list.length)];
// Cada categoría está almacenada como una cadena separada por comas.
// Convertimos esa cadena en palabras individuales antes de elegir una.
const soloWords = category => {
  const raw = category === "Todas"
    ? Object.values(SOLO_WORD_BANK)
    : [SOLO_WORD_BANK[category] || ""];
  return raw
    .flatMap(value => String(value).split(","))
    .map(word => word.trim())
    .filter(Boolean);
};

function soloPickWord(category) {
  const words = soloWords(category).filter(w => !String(w).includes(" "));
  return soloRandom(words);
}
function soloCategoryPicker() {
  return `<div class="rg-category-box"><div class="rg-category-title">✦ Elige una categoría</div><select class="rg-select" id="rg-solo-category">${soloCategories.map(c => `<option>${escapeHtml(c)}</option>`).join("")}</select><div class="rg-small">La categoría te dará una pista sobre las palabras que pueden aparecer.</div></div>`;
}

// Pistas cortas: orientan sin revelar directamente la respuesta.
const SOLO_HINTS = {
  MANZANA:"Fruta crujiente que puede ser roja o verde", PERRO:"Animal doméstico que ladra", GATO:"Animal doméstico que maúlla",
  CABALLO:"Animal que se puede montar", VACA:"Animal que produce leche", DELFIN:"Mamífero marino muy inteligente",
  MARIPOSA:"Insecto con alas de muchos colores", ABEJA:"Insecto que produce miel", MEDELLIN:"Ciudad colombiana conocida como la ciudad de la eterna primavera",
  BOGOTA:"Capital de Colombia", CALI:"Ciudad colombiana famosa por la salsa", CARTAGENA:"Ciudad caribeña con una ciudad amurallada",
  SOFIA:"Nombre propio femenino", JUAN:"Nombre propio masculino de cuatro letras", MATEO:"Nombre propio masculino",
  FUTBOL:"Deporte que se juega con un balón y dos arcos", TENIS:"Deporte de raqueta", NATACION:"Deporte que se practica en el agua",
  TELEFONO:"Objeto que usamos para llamar y enviar mensajes", COMPUTADOR:"Equipo para trabajar, estudiar y jugar", RELOJ:"Objeto que indica la hora",
  MONTAÑA:"Elevación natural grande del terreno", RIO:"Corriente natural de agua", PLAYA:"Lugar de arena junto al mar",
  MEDICO:"Profesional que atiende la salud", PROFESOR:"Persona que enseña", COCINERO:"Persona que prepara alimentos",
  AVION:"Medio de transporte que vuela", BICICLETA:"Transporte de dos ruedas que se mueve pedaleando", MOTOCICLETA:"Vehículo de dos ruedas con motor",
  MINECRAFT:"Videojuego de bloques y construcción", MARIO:"Personaje de videojuegos que suele llevar gorra roja",
  COCINA:"Lugar de la casa donde se preparan alimentos", NEVERA:"Electrodoméstico que mantiene fríos los alimentos",
  GUITARRA:"Instrumento musical de cuerdas", PIANO:"Instrumento musical con teclas"
};
function soloCategoryOfWord(word) {
  const target = soloNormalize(word);
  for (const [name, raw] of Object.entries(SOLO_WORD_BANK)) {
    const match = String(raw).split(",").some(item => soloNormalize(item.trim()) === target);
    if (match) return name;
  }
  return "General";
}
const SOLO_CATEGORY_CLUES = {
  Comida: "Es algo que se puede comer o beber",
  Animales: "Es un ser vivo del reino animal",
  Ropa: "Es una prenda o accesorio que usamos para vestirnos",
  Ciudades: "Es una ciudad o municipio",
  Nombres: "Es un nombre de persona",
  Deportes: "Es una actividad deportiva",
  Objetos: "Es un objeto que usamos en la vida diaria",
  Naturaleza: "Es algo que encontramos en la naturaleza",
  Profesiones: "Es un oficio o profesión",
  Transporte: "Es un medio de transporte",
  Videojuegos: "Es un videojuego o personaje de videojuegos",
  Casa: "Es un espacio u objeto del hogar",
  Musica: "Está relacionado con la música"
};
function soloHint(word, category) {
  const clean = soloNormalize(word);
  if (SOLO_HINTS[clean]) return SOLO_HINTS[clean];
  const realCategory = soloCategoryOfWord(word);
  return SOLO_CATEGORY_CLUES[realCategory] || `Pertenece a la categoría «${realCategory}»`;
}
function soloHome(mode) {
  soloState.mode = mode;
  soloState.category = "Todas";
  showPanel("rg-create-panel");
  const title = mode === "hangman" ? "🎯 Ahorcado individual" : mode === "draw" ? "🎨 Reto de dibujo individual" : "🔎 Sopa de letras individual";
  $("rg-create-panel").innerHTML = `<div class="rg-intro"><h3>${title}</h3><p class="rg-muted">Juega a tu ritmo. Hay más de 200 palabras repartidas en 12 categorías.</p></div><div class="rg-form">${soloCategoryPicker()}<div class="rg-actions"><button class="rg-btn" id="rg-solo-start">Comenzar</button><button class="rg-btn secondary" id="rg-solo-cancel">Volver</button></div></div>`;
  $("rg-solo-start").addEventListener("click", () => {
    soloState.category = $("rg-solo-category").value;
    if (mode === "hangman") soloStartHangman();
    if (mode === "draw") soloStartDraw();
    if (mode === "wordsearch") soloStartWordsearch();
  });
  $("rg-solo-cancel").addEventListener("click", showHomePanel);
}

function soloStartHangman() {
  soloState.word = soloPickWord(soloState.category);
  soloState.guessed = [];
  soloState.mistakes = 0;
  soloRenderHangman();
}
function soloRenderHangman() {
  showPanel("rg-detail-panel");
  const done = soloState.mistakes >= 6 || [...soloState.word].every(ch => !/[A-Z]/.test(ch) || soloState.guessed.includes(ch));
  const won = [...soloState.word].every(ch => !/[A-Z]/.test(ch) || soloState.guessed.includes(ch));
  const keys = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
  const display = [...soloState.word].map(ch => !/[A-ZÑ]/.test(ch) ? ch : soloState.guessed.includes(ch) || done ? ch : "_").join(" ");
  $("rg-detail-panel").innerHTML = `<div class="rg-intro"><h3>🎯 Ahorcado</h3><p class="rg-muted">Categoría: ${escapeHtml(soloState.category)}</p></div><div class="rg-hangman">${hangmanSvg(soloState.mistakes)}</div><div class="rg-word">${display}</div><div class="rg-hint">💡 <strong>Pista:</strong> ${escapeHtml(soloHint(soloState.word, soloState.category))}</div><div class="rg-small" style="text-align:center">Errores: ${soloState.mistakes}/6</div><div class="rg-keyboard">${keys.map(k=>`<button class="rg-key" data-solo-letter="${k}" ${done||soloState.guessed.includes(k)?"disabled":""}>${k}</button>`).join("")}</div><div class="rg-status">${done ? (won ? "¡Correcto! 🎉" : "Se acabaron los intentos.") : "Encuentra la palabra antes de completar el ahorcado."}</div>${done?`<div class="rg-card rg-hangman-result"><strong>La palabra era: ${escapeHtml(soloState.word)}</strong><button class="rg-btn" id="rg-solo-again">Otra palabra</button></div>`:""}<button class="rg-btn secondary" id="rg-solo-exit">Volver a juegos</button>`;
  $("rg-detail-panel").querySelectorAll("[data-solo-letter]").forEach(btn => btn.addEventListener("click", () => {
    const letter = btn.dataset.soloLetter;
    if (soloState.guessed.includes(letter)) return;
    soloState.guessed.push(letter);
    if (!soloState.word.includes(letter)) soloState.mistakes++;
    soloRenderHangman();
  }));
  $("rg-solo-again")?.addEventListener("click", soloStartHangman);
  $("rg-solo-exit").addEventListener("click", showHomePanel);
}

function soloStartDraw() {
  soloState.word = soloPickWord(soloState.category);
  soloState.strokes = [];
  soloRenderDraw();
}
function soloRenderDraw() {
  showPanel("rg-detail-panel");
  $("rg-detail-panel").innerHTML = `<div class="rg-intro"><h3>🎨 Dibuja y adivina</h3><p class="rg-muted">Dibuja la palabra que te toque. Intenta representarla sin escribir letras.</p></div><div class="rg-card"><div class="rg-small">TU PALABRA SECRETA</div><h4>${escapeHtml(soloState.word)}</h4><p class="rg-muted">Categoría: ${escapeHtml(soloState.category)}</p><div class="rg-hint">💡 <strong>Idea para dibujar:</strong> ${escapeHtml(soloHint(soloState.word, soloState.category))}</div></div><div class="rg-canvas-wrap"><canvas id="rg-solo-canvas" width="720" height="460"></canvas></div><div class="rg-colors"><button class="rg-color selected" data-solo-color="#29202d" style="background:#29202d" type="button"></button><button class="rg-color" data-solo-color="#d84b91" style="background:#d84b91" type="button"></button><button class="rg-color" data-solo-color="#4777c8" style="background:#4777c8" type="button"></button><button class="rg-color" data-solo-color="#35a77b" style="background:#35a77b" type="button"></button><button class="rg-color" data-solo-color="#ffffff" style="background:#fff" type="button"></button><button class="rg-btn secondary" id="rg-solo-clear">Borrar</button></div><div class="rg-actions"><button class="rg-btn" id="rg-solo-finish-draw">Terminar reto</button><button class="rg-btn secondary" id="rg-solo-next-draw">Otra palabra</button></div><p class="rg-muted" id="rg-solo-draw-result"></p><button class="rg-btn secondary" id="rg-solo-exit">Volver a juegos</button>`;
  const canvas = $("rg-solo-canvas");
  drawCanvasBase(canvas);
  let color = "#29202d", drawingNow = false, stroke = null;
  const point = e => { const r=canvas.getBoundingClientRect(); return [Math.round((e.clientX-r.left)*canvas.width/r.width),Math.round((e.clientY-r.top)*canvas.height/r.height)]; };
  const redraw = () => paintStrokes(canvas, soloState.strokes);
  canvas.addEventListener("pointerdown", e => { drawingNow=true; canvas.setPointerCapture(e.pointerId); stroke={color,width:10,points:[point(e)]}; soloState.strokes.push(stroke); redraw(); });
  canvas.addEventListener("pointermove", e => { if(!drawingNow||!stroke)return; const p=point(e), last=stroke.points.at(-1); if(Math.abs(p[0]-last[0])+Math.abs(p[1]-last[1])>3) stroke.points.push(p); redraw(); });
  const stop=()=>{drawingNow=false;stroke=null;};
  canvas.addEventListener("pointerup",stop); canvas.addEventListener("pointercancel",stop);
  $("rg-detail-panel").querySelectorAll("[data-solo-color]").forEach(b=>b.addEventListener("click",()=>{color=b.dataset.soloColor; if(stroke)stroke.color=color; $("rg-detail-panel").querySelectorAll("[data-solo-color]").forEach(x=>x.classList.toggle("selected",x===b));}));
  // Use the selected color for the next stroke.
  canvas.addEventListener("pointerdown",()=>{ if(stroke) stroke.color=color; });
  $("rg-solo-clear").addEventListener("click",()=>{soloState.strokes=[];drawCanvasBase(canvas);});
  $("rg-solo-finish-draw").addEventListener("click",()=>{ $("rg-solo-draw-result").textContent = soloState.strokes.length ? `¡Reto terminado! Tu dibujo representaba: ${soloState.word}.` : "Primero haz un dibujo."; });
  $("rg-solo-next-draw").addEventListener("click",soloStartDraw);
  $("rg-solo-exit").addEventListener("click",showHomePanel);
}

function soloBuildGrid() {
  const words = soloWords(soloState.category).filter(w => /^[A-ZÑ]+$/.test(soloNormalize(w))).map(soloNormalize).filter(w=>w.length>=3&&w.length<=12);
  const chosen = [...new Set(words)].sort(()=>Math.random()-.5).slice(0,10);
  const n=12, grid=Array.from({length:n},()=>Array(n).fill(""));
  const dirs=[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  const placed=[];
  for(const word of chosen.sort((a,b)=>b.length-a.length)){
    let ok=false;
    for(let tries=0;tries<180&&!ok;tries++){
      const [dr,dc]=soloRandom(dirs), r=Math.floor(Math.random()*n), c=Math.floor(Math.random()*n);
      const er=r+dr*(word.length-1), ec=c+dc*(word.length-1);
      if(er<0||er>=n||ec<0||ec>=n)continue;
      let fits=true;
      for(let i=0;i<word.length;i++){const v=grid[r+dr*i][c+dc*i];if(v&&v!==word[i]){fits=false;break;}}
      if(!fits)continue;
      for(let i=0;i<word.length;i++)grid[r+dr*i][c+dc*i]=word[i];
      placed.push(word);ok=true;
    }
  }
  const alphabet="ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c])grid[r][c]=soloRandom(alphabet);
  return {grid,words:placed};
}
function soloStartWordsearch() {
  const puzzle=soloBuildGrid();
  if (!puzzle.words.length) {
    $("rg-create-panel").innerHTML = `<div class="rg-intro"><h3>🔎 Sopa de letras</h3><p class="rg-muted">No se pudieron preparar palabras para esta categoría. Intenta con «Todas» o elige otra categoría.</p></div><div class="rg-actions"><button class="rg-btn" id="rg-solo-retry">Intentar de nuevo</button><button class="rg-btn secondary" id="rg-solo-cancel">Volver</button></div>`;
    $("rg-solo-retry").addEventListener("click", soloStartWordsearch);
    $("rg-solo-cancel").addEventListener("click", showHomePanel);
    return;
  }
  soloState.grid=puzzle.grid; soloState.wordList=puzzle.words; soloState.found=[]; soloState.foundPaths=[]; soloState.selecting=false; soloState.startCell=null; soloState.currentCell=null;
  soloRenderWordsearch();
}
function soloRenderWordsearch() {
  showPanel("rg-detail-panel");
  const n=soloState.grid.length;
  $("rg-detail-panel").innerHTML=`<div class="rg-intro"><h3>🔎 Sopa de letras</h3><p class="rg-muted">${escapeHtml(soloState.category)} · Encuentra las palabras en cualquier dirección.</p></div><div class="rg-row"><span class="rg-tag">${soloState.found.length}/${soloState.wordList.length} encontradas</span><span class="rg-small">12 × 12</span></div><div id="rg-word-grid" style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:3px;touch-action:none;user-select:none;margin:12px 0"></div><div class="rg-small">Palabras por encontrar</div><div class="rg-guess-list">${soloState.wordList.map(w=>{const found=soloState.found.includes(w);return `<span class="rg-guess ${found?"rg-word-found":""}" data-word="${escapeHtml(w)}" style="${found?"border-color:rgba(65,205,139,.7);background:rgba(35,155,100,.24);color:#a9f2cb;":""}">${found?"✓ ":""}${w.toUpperCase()} <small style="display:block;font-size:9px;opacity:.82">${escapeHtml(soloCategoryOfWord(w))}</small></span>`;}).join("")}</div><div class="rg-hint">💡 <strong>Pista:</strong> Todas las palabras pertenecen a «${escapeHtml(soloState.category)}». Busca en horizontal, vertical y diagonal; también pueden estar al revés.</div><p class="rg-status" id="rg-word-feedback">${soloState.wordList.length > 0 && soloState.found.length===soloState.wordList.length?"¡Completaste la sopa! 🎉":"Toca una letra y arrastra en línea recta hasta la última."}</p><div class="rg-actions"><button class="rg-btn" id="rg-word-new">Nueva sopa</button><button class="rg-btn secondary" id="rg-solo-exit">Volver a juegos</button></div>`;
  const gridEl=$("rg-word-grid");
  soloState.grid.forEach((row,r)=>row.forEach((letter,c)=>{
    const cell=document.createElement("button");cell.type="button";cell.textContent=letter;cell.dataset.r=r;cell.dataset.c=c;cell.style.cssText="aspect-ratio:1;min-width:0;padding:0;border:1px solid rgba(255,255,255,.13);border-radius:5px;background:rgba(255,255,255,.10);color:#fff;font-weight:800;font-size:clamp(10px,3vw,15px);";
    gridEl.appendChild(cell);
  }));
  const cellAt=e=>{const el=document.elementFromPoint(e.clientX,e.clientY)?.closest("#rg-word-grid button");return el?{r:+el.dataset.r,c:+el.dataset.c}:null;};
  const lineCells=(a,b)=>{const dr=b.r-a.r,dc=b.c-a.c,steps=Math.max(Math.abs(dr),Math.abs(dc));if(!steps)return[a];if(!(dr===0||dc===0||Math.abs(dr)===Math.abs(dc)))return[];const sr=Math.sign(dr),sc=Math.sign(dc);return Array.from({length:steps+1},(_,i)=>({r:a.r+sr*i,c:a.c+sc*i}));};
  const paintFoundPaths=()=>{soloState.foundPaths.forEach(path=>path.forEach(p=>{const x=gridEl.querySelector(`[data-r="${p.r}"][data-c="${p.c}"]`);if(x){x.style.background="rgba(35,165,105,.78)";x.style.borderColor="rgba(130,245,185,.8)";x.style.color="#fff";}}));};
  const highlight=(cells)=>{gridEl.querySelectorAll("button").forEach(x=>{x.style.background="rgba(255,255,255,.10)";x.style.borderColor="rgba(255,255,255,.13)";x.style.color="#fff";});paintFoundPaths();cells.forEach(p=>{const x=gridEl.querySelector(`[data-r="${p.r}"][data-c="${p.c}"]`);if(x&&!x.dataset.found){x.style.background="rgba(224,92,174,.75)";}});};
  paintFoundPaths();
  const finish=()=>{
    if(!soloState.startCell||!soloState.currentCell)return;
    const cells=lineCells(soloState.startCell,soloState.currentCell), value=cells.map(p=>soloState.grid[p.r][p.c]).join("");
    const reverse=value.split("").reverse().join("");
    const match=soloState.wordList.find(w=>(w===value||w===reverse)&&!soloState.found.includes(w));
    if(match){
      soloState.found.push(match);
      soloState.foundPaths.push(cells.map(p=>({...p})));
      cells.forEach(p=>{
        const x=gridEl.querySelector(`[data-r="${p.r}"][data-c="${p.c}"]`);
        if(x){x.dataset.found="1";x.style.background="rgba(35,165,105,.78)";x.style.borderColor="rgba(130,245,185,.8)";x.style.color="#fff";}
      });
      // Actualiza también la ficha de la palabra, sin tener que reconstruir la sopa.
      const wordChip=[...$("rg-detail-panel").querySelectorAll(".rg-guess[data-word]")].find(chip=>chip.dataset.word===match);
      if(wordChip){
        wordChip.classList.add("rg-word-found");
        wordChip.style.borderColor="rgba(65,205,139,.7)";
        wordChip.style.background="rgba(35,155,100,.24)";
        wordChip.style.color="#a9f2cb";
        wordChip.innerHTML=`✓ ${escapeHtml(match.toUpperCase())} <small style="display:block;font-size:9px;opacity:.9">${escapeHtml(soloCategoryOfWord(match))} · Encontrada</small>`;
      }
      const counter=document.querySelector("#rg-detail-panel .rg-tag");
      if(counter)counter.textContent=`${soloState.found.length}/${soloState.wordList.length} encontradas`;
      $("rg-word-feedback").textContent=soloState.found.length===soloState.wordList.length?"¡Completaste la sopa! 🎉":`¡Encontraste ${match}! Sigue buscando las demás.`;
    }
    else highlight([]);
    soloState.startCell=null;soloState.currentCell=null;soloState.selecting=false;
    if(soloState.wordList.length > 0 && soloState.found.length===soloState.wordList.length){$("rg-word-feedback").textContent="¡Completaste la sopa! 🎉";gridEl.querySelectorAll("button").forEach(b=>b.disabled=true);}
  };
  gridEl.addEventListener("pointerdown",e=>{const p=cellAt(e);if(!p)return;e.preventDefault();soloState.selecting=true;soloState.startCell=p;soloState.currentCell=p;gridEl.setPointerCapture?.(e.pointerId);highlight([p]);});
  gridEl.addEventListener("pointermove",e=>{if(!soloState.selecting)return;const p=cellAt(e);if(!p)return;soloState.currentCell=p;highlight(lineCells(soloState.startCell,p));});
  gridEl.addEventListener("pointerup",e=>{if(!soloState.selecting)return;const p=cellAt(e);if(p)soloState.currentCell=p;finish();});
  gridEl.addEventListener("pointercancel",()=>{soloState.selecting=false;highlight([]);});
  $("rg-word-new").addEventListener("click",soloStartWordsearch);
  $("rg-solo-exit").addEventListener("click",showHomePanel);
}

$("rg-solo-hangman")?.addEventListener("click",()=>soloHome("hangman"));
$("rg-solo-wordsearch")?.addEventListener("click",()=>soloHome("wordsearch"));


$("rg-back")?.addEventListener("click", () => {
  const detailVisible = !$("rg-detail-panel").hidden;
  const createVisible = !$("rg-create-panel").hidden;

  if (detailVisible || createVisible) {
    showHomePanel();
    return;
  }

  closeGamesScreen();
});
appButton?.addEventListener("click",openGamesScreen);
$("rg-new-hangman")?.addEventListener("click",renderCreateHangman);
$("rg-new-draw")?.addEventListener("click",renderCreateDraw);
document.querySelectorAll("[data-rg-tab]").forEach(tab => {
  tab.addEventListener("click", () => {
    activeGamesTab = tab.dataset.rgTab;

    document.querySelectorAll("[data-rg-tab]").forEach(button => {
      button.classList.toggle("active", button === tab);
    });

    renderGameLists();
  });
});

onAuthStateChanged(auth,user=>{
  currentUser=user;
  if(stopOpenGames){stopOpenGames();stopOpenGames=null;}
  if(stopMyGames){stopMyGames();stopMyGames=null;}
  if(activeGameStop){activeGameStop();activeGameStop=null;}
  openGames=[];myGames=[];activeGame=null;
  if(user) subscribeLists(user);
  else {
    if($("rg-open-list")) $("rg-open-list").innerHTML='<div class="rg-empty">Inicia sesión para jugar.</div>';
    if($("rg-my-list")) $("rg-my-list").innerHTML="";
  }
});
