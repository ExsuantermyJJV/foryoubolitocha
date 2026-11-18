/* ==========================================
   NUESTRAS ROLITAS - JUEGOS
   Ahorcado + Dibuja y adivina
   Firebase Firestore, partidas persistentes
========================================== */

import { getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, query, where,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const gamesRef = collection(db, "games");

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
#rolitas-games-screen .rg-input:focus { border-color: #e879bd !important; box-shadow: 0 0 0 3px rgba(232,121,189,.13) !important; }
#rolitas-games-screen .rg-input option,
#rolitas-games-screen .rg-select option { color: #24152d !important; }

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
      <div><div class="rg-kicker">NUESTRAS ROLITAS</div><h2>Juegos ♡</h2></div>
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
        <button class="rg-btn" id="rg-new-hangman">Crear desafío</button>
      </div>
      <div class="rg-card">
        <div class="rg-row"><h4>🎨 Dibuja y adivina</h4><span class="rg-tag">POR TURNOS</span></div>
        <p class="rg-muted">Dibuja una palabra secreta y envía el reto. La otra persona tendrá que adivinar.</p>
        <button class="rg-btn" id="rg-new-draw">Crear dibujo</button>
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
  return game.type === "hangman" ? "🎯 Ahorcado" : "🎨 Dibuja y adivina";
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
    showMessage("¡Desafío de ahorcado creado! La otra persona ya puede aceptarlo.");
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
      await addDoc(gamesRef,{
        type:"draw",creatorUid:currentUser.uid,players:[currentUser.uid],
        opponentUid:null,status:"open",word:word.toLocaleUpperCase("es-CO"),
        hint:$("rg-draw-hint").value.trim().slice(0,100),
        strokes:currentCanvasStrokes,guesses:[],winnerUid:null,
        createdAt:serverTimestamp(),updatedAt:serverTimestamp()
      });
      showMessage("¡Dibujo enviado! La otra persona ya puede adivinar.");
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
