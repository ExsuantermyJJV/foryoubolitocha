"use strict";

/* =====================================================
   NUESTRAS ROLITAS
   Sistema central del iPhone virtual
===================================================== */

/* 1. UTILIDADES */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const isTyping = element =>
  element instanceof Element &&
  Boolean(element.closest(
    "input, textarea, select, [contenteditable='true']"
  ));

const formatTime = seconds => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(
    remaining
  ).padStart(2, "0")}`;
};


/* 2. ELEMENTOS PRINCIPALES */

const phone = $("#phone-device");
const phoneScreen = $("#phone-screen");
const homeIndicator = $("#phone-home-indicator");

const phoneClock = $("#phone-clock");
const homeDate = $("#home-date");

const appScreens = $$("[data-app-screen]");
const openAppButtons = $$("[data-open-app]");
const homeButtons = $$("[data-go-home]");

const notificationCenter = $("#notification-center");
const notificationPanel = $(".notification-panel");

const notificationClock = $("#notification-clock");
const notificationDate = $("#notification-date");

const notificationCover = $("#notification-cover");
const notificationSong = $("#notification-song");
const notificationArtist = $("#notification-artist");

const notificationPlay = $("#notification-play");
const notificationPrev = $("#notification-prev");
const notificationNext = $("#notification-next");

const notificationList = $("#notification-list");
const notificationEmpty = $("#notification-empty");

const notificationClose = $("#close-notifications");
const notificationClear = $("#clear-notifications");

let currentApp = "home";
let appHistory = [];
let notificationOpen = false;


/* 3. RELOJ DEL TELÉFONO */

const clockFormatter = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long"
});

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function updatePhoneClock() {
  const now = new Date();

  if (phoneClock) {
    phoneClock.textContent = clockFormatter
      .format(now)
      .replace(/\s/g, "")
      .toLowerCase();
  }

  if (homeDate) {
    homeDate.textContent = capitalize(dateFormatter.format(now));
  }

  if (notificationClock) {
    notificationClock.textContent = timeFormatter.format(now);
  }

  if (notificationDate) {
    notificationDate.textContent = dateFormatter
      .format(now)
      .toUpperCase();
  }
}

updatePhoneClock();

setInterval(updatePhoneClock, 15000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updatePhoneClock();
});


/* 4. NAVEGACIÓN ENTRE APLICACIONES */

function getScreen(appName) {
  return $(`[data-app-screen="${appName}"]`);
}

// Guarda la posición de desplazamiento de cada aplicación.
// Así, al salir y volver a entrar, conserva dónde estaba el usuario.
const appScrollPositions = new Map();

function showScreen(appName) {
  const target = getScreen(appName);

  if (!target) return false;

  // Guardar la posición de la aplicación que se está cerrando.
  const currentScreen = getScreen(currentApp);

  if (currentScreen && currentScreen !== target) {
    appScrollPositions.set(currentApp, currentScreen.scrollTop);
  }

  // Mostrar únicamente la aplicación solicitada.
  appScreens.forEach(screen => {
    screen.hidden = screen !== target;
  });

  currentApp = appName;
  document.body.dataset.currentApp = appName;

  // Restaurar la posición anterior. Si nunca se abrió, empieza arriba.
  const savedScrollTop = appScrollPositions.get(appName) ?? 0;

  requestAnimationFrame(() => {
    // Evitar modificar una pantalla si el usuario ya cambió de aplicación.
    if (currentApp === appName && !target.hidden) {
      target.scrollTop = savedScrollTop;
    }
  });

  // Al entrar en Mensajes se marca como leído, conservando el contador
  // y la lógica que gestiona el resto del sistema.
  if (appName === "messages") {
    window.markMessagesAsRead?.();
  }

  return true;
}

function openApp(appName) {
  if (!appName || appName === currentApp) return;

  if (!getScreen(appName)) {
    console.warn("Aplicación no encontrada:", appName);
    return;
  }

  if (notificationOpen) {
    closeNotifications();
  }

  if (currentApp !== "home") {
    appHistory.push(currentApp);
  }

  showScreen(appName);
}

function goBack() {
  if (notificationOpen) {
    closeNotifications();
    return;
  }

  if (currentApp === "home") return;

  const previous = appHistory.pop();

  if (previous && getScreen(previous)) {
    showScreen(previous);
  } else {
    goHome();
  }
}

function goHome() {
  if (notificationOpen) {
    closeNotifications();
  }

  appHistory = [];
  showScreen("home");
}

openAppButtons.forEach(button => {
  button.addEventListener("click", () => {
    openApp(button.dataset.openApp);
  });
});

homeButtons.forEach(button => {
  button.addEventListener("click", goHome);
});

homeIndicator?.addEventListener("click", goHome);

homeIndicator?.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    goHome();
  }
});


/* 5. CENTRO DE NOTIFICACIONES */

function updateNotificationMusic() {
  const track = musicList[trackIndex];

  if (!track) return;

  if (notificationCover) {
    notificationCover.src = track.img;
    notificationCover.alt = `Portada de ${track.name}`;
  }

  if (notificationSong) {
    notificationSong.textContent = track.name;
  }

  if (notificationArtist) {
    notificationArtist.textContent = track.artist;
  }

  if (notificationPlay) {
    notificationPlay.innerHTML = currentTrack.paused
      ? '<i class="fa-solid fa-play"></i>'
      : '<i class="fa-solid fa-pause"></i>';

    notificationPlay.setAttribute(
      "aria-label",
      currentTrack.paused ? "Reproducir" : "Pausar"
    );
  }
}

function openNotifications() {
  if (!notificationCenter || notificationOpen) return;

  notificationOpen = true;

  updatePhoneClock();
  updateNotificationMusic();

  notificationCenter.hidden = false;
  notificationCenter.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    notificationCenter.classList.add("is-open");
  });
}

function closeNotifications() {
  if (!notificationCenter || !notificationOpen) return;

  notificationOpen = false;
  notificationCenter.classList.remove("is-open");
  notificationCenter.setAttribute("aria-hidden", "true");

  setTimeout(() => {
    if (!notificationOpen) {
      notificationCenter.hidden = true;
    }
  }, 450);
}

window.openRolitasNotifications = openNotifications;
window.closeRolitasNotifications = closeNotifications;

notificationClose?.addEventListener("click", closeNotifications);

notificationClear?.addEventListener("click", () => {
  if (!notificationList) return;

  $$(".notification-message", notificationList).forEach(item => {
    item.remove();
  });

  if (notificationEmpty) {
    notificationEmpty.hidden = false;
  }
});


/* 6. GESTOS UNIFICADOS: MÓVIL Y PC */

const gesture = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  startTime: 0,
  zone: "none",
  moved: false
};

const GESTURE_CONFIG = {
  topZone: 95,
  bottomZone: 75,
  leftZone: 35,
  openDistance: 55,
  closeDistance: 65,
  backDistance: 85,
  homeDistance: 75
};

function getGestureZone(x, y, bounds) {
  const localY = y - bounds.top;
  const localX = x - bounds.left;

  if (notificationOpen) return "notification";
  if (localY <= GESTURE_CONFIG.topZone) return "top";

  if (localY >= bounds.height - GESTURE_CONFIG.bottomZone) {
    return "bottom";
  }

  if (localX <= GESTURE_CONFIG.leftZone) return "left";

  return "none";
}

function startGesture(event) {
  if (!phoneScreen || gesture.active) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (isTyping(event.target)) return;

  const targetElement = event.target instanceof Element
    ? event.target
    : null;

  if (!targetElement) return;

  if (
    targetElement.closest(
      ".notification-music-controls, .notification-section-heading, .app-grid, .player-card, .chat-send-form"
    )
  ) {
    return;
  }

  const bounds = phoneScreen.getBoundingClientRect();

  gesture.active = true;
  gesture.pointerId = event.pointerId;
  gesture.startX = event.clientX;
  gesture.startY = event.clientY;
  gesture.lastX = event.clientX;
  gesture.lastY = event.clientY;
  gesture.startTime = Date.now();

  gesture.zone = getGestureZone(
    event.clientX,
    event.clientY,
    bounds
  );

  gesture.moved = false;
}

function moveGesture(event) {
  if (!gesture.active) return;
  if (event.pointerId !== gesture.pointerId) return;

  const deltaX = event.clientX - gesture.startX;
  const deltaY = event.clientY - gesture.startY;

  gesture.lastX = event.clientX;
  gesture.lastY = event.clientY;

  if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
    gesture.moved = true;
  }

  if (gesture.zone === "none") return;

  if (gesture.zone === "top") {
    if (deltaY > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
      event.preventDefault();
    }
  }

  if (gesture.zone === "notification") {
    if (deltaY < -12 && Math.abs(deltaY) > Math.abs(deltaX)) {
      event.preventDefault();
    }
  }
}

function endGesture(event) {
  if (!gesture.active) return;
  if (event.pointerId !== gesture.pointerId) return;

  const deltaX = event.clientX - gesture.startX;
  const deltaY = event.clientY - gesture.startY;
  const zone = gesture.zone;
  const elapsed = Date.now() - gesture.startTime;

  gesture.active = false;
  gesture.pointerId = null;

  if (Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
    if (
      zone === "left" &&
      deltaX > GESTURE_CONFIG.backDistance
    ) {
      goBack();
    }

    return;
  }

  if (
    zone === "top" &&
    deltaY > GESTURE_CONFIG.openDistance
  ) {
    openNotifications();
    return;
  }

  if (
    zone === "notification" &&
    deltaY < -GESTURE_CONFIG.closeDistance
  ) {
    closeNotifications();
    return;
  }

  if (
    zone === "bottom" &&
    deltaY < -GESTURE_CONFIG.homeDistance
  ) {
    goHome();
    return;
  }

  if (
    zone === "left" &&
    deltaX > GESTURE_CONFIG.backDistance &&
    elapsed < 900
  ) {
    goBack();
  }
}

function cancelGesture() {
  gesture.active = false;
  gesture.pointerId = null;
}

if (phoneScreen) {
  phoneScreen.addEventListener("pointerdown", startGesture, {
    passive: true
  });

  window.addEventListener("pointermove", moveGesture, {
    passive: false
  });

  window.addEventListener("pointerup", endGesture, {
    passive: true
  });

  window.addEventListener("pointercancel", cancelGesture);
}


/* 7. APERTURA CON CLIC EN PC */

phoneScreen?.addEventListener("click", event => {
  if (notificationOpen) return;
  if (isTyping(event.target)) return;

  const targetElement = event.target instanceof Element
    ? event.target
    : null;

  if (!targetElement) return;

  if (
    targetElement.closest(
      "button, input, select, textarea, label, a, .app-grid, .player-card, .firebase-chat"
    )
  ) {
    return;
  }

  const bounds = phoneScreen.getBoundingClientRect();
  const localY = event.clientY - bounds.top;

  if (localY <= GESTURE_CONFIG.topZone) {
    openNotifications();
  }
});

$("#dynamic-island")?.addEventListener("click", () => {
  if (notificationOpen) {
    closeNotifications();
  } else {
    openNotifications();
  }
});


/* 8. TECLADO Y NAVEGACIÓN EN PC */

document.addEventListener("keydown", event => {
  if (isTyping(event.target)) return;

  if (event.key === "Escape") {
    if (notificationOpen) {
      closeNotifications();
    } else {
      goBack();
    }

    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    goBack();
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    goHome();
  }
});

/* 9. MENSAJES NO LEÍDOS */

const unreadBadge = $("#chat-unread-badge");

// Estilo de la insignia: se coloca encima del icono.
(function installUnreadBadgeStyles() {
  if (document.getElementById("rolitas-unread-badge-styles")) return;

  const style = document.createElement("style");
  style.id = "rolitas-unread-badge-styles";

  style.textContent = `
    .app-icon {
      overflow: visible !important;
    }

    .app-icon-image {
      position: relative !important;
      overflow: visible !important;
      isolation: isolate;
    }

    #chat-unread-badge.app-notification-badge {
      position: absolute !important;
      top: -7px !important;
      right: -8px !important;
      bottom: auto !important;
      left: auto !important;
      z-index: 20 !important;

      display: grid;
      place-items: center;
      min-width: 22px;
      width: max-content;
      height: 22px;
      padding: 0 6px;
      box-sizing: border-box;

      border: 2px solid rgba(255, 255, 255, .96);
      border-radius: 999px;
      background: linear-gradient(145deg, #ff526b, #ed1745);
      color: #fff;
      font-family: inherit;
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -.2px;
      text-align: center;
      white-space: nowrap;

      box-shadow:
        0 2px 5px rgba(0, 0, 0, .28),
        0 0 0 1px rgba(237, 23, 69, .12);

      pointer-events: none;
      transform: translateZ(0);
      animation: rolitasBadgePop .22s cubic-bezier(.2, .8, .2, 1);
    }

    #chat-unread-badge[hidden] {
      display: none !important;
    }

    @keyframes rolitasBadgePop {
      0% {
        opacity: 0;
        scale: .55;
      }

      75% {
        opacity: 1;
        scale: 1.12;
      }

      100% {
        opacity: 1;
        scale: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #chat-unread-badge.app-notification-badge {
        animation: none;
      }
    }
  `;

  document.head.appendChild(style);
})();

const UNREAD_STORAGE_KEY = "rolitas_unread_messages";

let unreadCount = Number(
  localStorage.getItem(UNREAD_STORAGE_KEY) || 0
);

function updateUnreadBadge(count) {
  unreadCount = Math.max(0, Math.floor(Number(count) || 0));

  if (unreadBadge) {
    unreadBadge.textContent = unreadCount > 99
      ? "99+"
      : String(unreadCount);

    unreadBadge.hidden = unreadCount === 0;

    unreadBadge.setAttribute(
      "aria-label",
      unreadCount === 1
        ? "1 mensaje sin leer"
        : `${unreadCount} mensajes sin leer`
    );
  }

  try {
    localStorage.setItem(
      UNREAD_STORAGE_KEY,
      String(unreadCount)
    );
  } catch (error) {
    console.warn("No se pudo guardar el contador de mensajes.", error);
  }

  window.dispatchEvent(
    new CustomEvent("rolitas:unread-count", {
      detail: { count: unreadCount }
    })
  );
}

window.setUnreadMessagesCount = updateUnreadBadge;

window.markMessagesAsRead = () => {
  updateUnreadBadge(0);
};

window.addEventListener("storage", event => {
  if (event.key === UNREAD_STORAGE_KEY) {
    updateUnreadBadge(Number(event.newValue || 0));
  }
});

updateUnreadBadge(unreadCount);


/* 10. NOTIFICACIONES DE MENSAJES */

function addMessageNotification(message, sender = "Mensajes") {
  if (!notificationList) return;

  const item = document.createElement("article");
  item.className = "notification-message";
  item.tabIndex = 0;
  item.setAttribute("role", "button");
  item.setAttribute("aria-label", "Abrir mensajes");

  const icon = document.createElement("div");
  icon.className = "notification-message-icon";
  icon.innerHTML = '<i class="fa-solid fa-message"></i>';

  const content = document.createElement("div");
  content.className = "notification-message-content";

  const header = document.createElement("div");
  header.className = "notification-message-header";

  const title = document.createElement("strong");
  title.textContent = sender;

  const time = document.createElement("time");
  time.textContent = timeFormatter.format(new Date());

  const text = document.createElement("p");
  text.textContent = String(message || "Te ha llegado un mensaje.");

  header.append(title, time);
  content.append(header, text);
  item.append(icon, content);

  notificationList.prepend(item);

  if (notificationEmpty) {
    notificationEmpty.hidden = true;
  }

  const items = $$(".notification-message", notificationList);

  if (items.length > 15) {
    items[items.length - 1].remove();
  }

  item.addEventListener("click", () => {
    closeNotifications();

    if (currentApp !== "messages") {
      openApp("messages");
    }
  });

  item.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      item.click();
    }
  });
}

window.addEventListener("rolitas:incoming-message", event => {
  const detail = event.detail || {};

  addMessageNotification(
    detail.text || "Te ha llegado un mensaje.",
    detail.sender || "Mensajes"
  );

  // No mostrar contador si el usuario ya está dentro del chat.
  if (currentApp !== "messages") {
    updateUnreadBadge(unreadCount + 1);
  }
});


/* 11. PERSONALIZACIÓN DEL TELÉFONO */

const wallpaperUpload = $("#wallpaper-upload");
const wallpaperElement = $("#phone-wallpaper");

const accentColorInput = $("#accent-color");
const themeModeSelect = $("#theme-mode");

const resetCustomizationButton = $("#reset-customization");

const CUSTOMIZATION_KEY = "rolitas_phone_customization";

const defaultCustomization = {
  wallpaper: "",
  accent: "#d96ba9",
  theme: "dark"
};

let customization = { ...defaultCustomization };

function saveCustomization() {
  try {
    localStorage.setItem(
      CUSTOMIZATION_KEY,
      JSON.stringify(customization)
    );
  } catch (error) {
    console.warn(
      "No se pudo guardar la personalización. La imagen podría ser demasiado grande.",
      error
    );
  }
}

function applyCustomization() {
  const root = document.documentElement;

  root.style.setProperty(
    "--phone-accent",
    customization.accent
  );

  root.style.setProperty(
    "--accent-color",
    customization.accent
  );

  document.body.dataset.theme = customization.theme;

  if (wallpaperElement) {
    if (customization.wallpaper) {
      wallpaperElement.style.backgroundImage =
        `url("${customization.wallpaper}")`;

      wallpaperElement.classList.add("has-wallpaper");
    } else {
      wallpaperElement.style.backgroundImage = "";
      wallpaperElement.classList.remove("has-wallpaper");
    }
  }

  if (accentColorInput) {
    accentColorInput.value = customization.accent;
  }

  if (themeModeSelect) {
    themeModeSelect.value = customization.theme;
  }
}

function loadCustomization() {
  try {
    const saved = localStorage.getItem(CUSTOMIZATION_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      customization = {
        ...defaultCustomization,
        ...parsed
      };
    }
  } catch (error) {
    console.warn("No se pudo cargar la personalización.", error);
  }

  applyCustomization();
}

wallpaperUpload?.addEventListener("change", event => {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Selecciona una imagen válida.");
    wallpaperUpload.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDimension = 1400;

      const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height)
      );

      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const context = canvas.getContext("2d");

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      customization.wallpaper = canvas.toDataURL(
        "image/jpeg",
        0.78
      );

      applyCustomization();
      saveCustomization();
    };

    image.onerror = () => {
      alert("No se pudo cargar esa imagen.");
    };

    image.src = reader.result;
  };

  reader.onerror = () => {
    alert("No se pudo leer el archivo.");
  };

  reader.readAsDataURL(file);
});

accentColorInput?.addEventListener("input", event => {
  customization.accent = event.target.value;
  applyCustomization();
  saveCustomization();
});

themeModeSelect?.addEventListener("change", event => {
  customization.theme = event.target.value;
  applyCustomization();
  saveCustomization();
});

resetCustomizationButton?.addEventListener("click", () => {
  const confirmed = confirm(
    "¿Quieres restaurar el fondo, color y tema originales?"
  );

  if (!confirmed) return;

  customization = { ...defaultCustomization };

  applyCustomization();
  saveCustomization();

  if (wallpaperUpload) {
    wallpaperUpload.value = "";
  }
});

loadCustomization();

/* 12. REPRODUCTOR DE MÚSICA */

const nowPlaying = $(".now-playing");
const trackArt = $(".track-art");
const trackName = $(".track-name");
const trackArtist = $(".track-artist");

const playPauseButton = $(".playpause-track");
const nextButton = $(".next-track");
const previousButton = $(".prev-track");
const randomButton = $(".random-track");
const repeatButton = $(".repeat-track");

const seekSlider = $(".seek_slider");
const volumeSlider = $(".volume_slider");

const currentTimeLabel = $(".current-time");
const totalDurationLabel = $(".total-duration");

const wave = $("#wave");

const currentTrack = new Audio();

currentTrack.preload = "metadata";
currentTrack.volume = 1;

let audioContext = null;
let trackSource = null;
let gainNode = null;

let trackIndex = 0;

let isPlaying = false;
let isRandom = false;
let isRepeat = false;

const musicList = [
  {
    img: "img/cafune.jpg",
    name: "Tek It (I Watch The Moon)",
    artist: "Cafuné",
    music: "music/Cafuné - Tek It (I Watch The Moon) [Official Video] - CAFUNÉ (128k).mp3",
    theme: ["#38556d", "#111c2c", "#9ab8d2"]
  },
  {
    img: "img/gg.jpg",
    name: "Espero no lo olvides",
    artist: "🍄",
    music: "music/Julieta Venegas - Eres para Mí (Video).mp3",
    theme: ["#b45491", "#251124", "#f3a3d1"]
  },
  {
    img: "img/ev.jpg",
    name: "Coyote Theory",
    artist: "🍄",
    music: "music/Coyote Theory - This Side of Paradise (Lyric Video).mp3",
    theme: ["#5a6a92", "#111522", "#a7b8e5"]
  },
  {
    img: "img/2.jpg",
    name: "Mi niña bonita",
    artist: "🍄",
    music: "music/Bonita- Andrés Cabas [Letra].mp3",
    theme: ["#c17c44", "#2a1711", "#f0bd82"]
  },
  {
    img: "img/3.jpg",
    name: "Enamorado",
    artist: "🍄",
    music: "music/Enamorado - Los Aptos,Letra 🌹❤.mp3",
    theme: ["#a84955", "#271014", "#ee9da5"]
  },
  {
    img: "img/e.jpg",
    name: "Dandelions",
    artist: "🍄",
    music: "music/Ruth B. - Dandelions (Lyrics).mp3",
    theme: ["#b99a43", "#211d10", "#f0d783"]
  },
  {
    img: "img/msg-765387767-131546.jpg",
    name: "Something About You",
    artist: "🍄",
    music: "music/Eyedress & Dent May - Something About You.mp3",
    theme: ["#4d927d", "#10231f", "#9ed9c6"]
  }
];


/* 13. AUDIO Y VOLUMEN */

function prepareAudioBoost() {
  if (gainNode) return;

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  try {
    audioContext = new AudioContextClass();

    trackSource = audioContext.createMediaElementSource(currentTrack);

    gainNode = audioContext.createGain();

    trackSource.connect(gainNode);
    gainNode.connect(audioContext.destination);

    setVolume();

  } catch (error) {
    console.warn("Audio Boost no disponible:", error);

    audioContext = null;
    trackSource = null;
    gainNode = null;
  }
}

function setVolume() {
  const value = volumeSlider
    ? clamp(Number(volumeSlider.value), 0, 100) / 100
    : 0.75;

  if (gainNode) {
    gainNode.gain.value = value * 1.15;
    currentTrack.volume = 1;
  } else {
    currentTrack.volume = value;
  }
}

volumeSlider?.addEventListener("input", setVolume);


/* 14. TEMAS DINÁMICOS */

function applyTrackTheme(track) {
  if (!track) return;

  const [glow, deep, accent] = track.theme || [
    "#b45491",
    "#17101f",
    "#f3a3d1"
  ];

  const root = document.documentElement;

  root.style.setProperty("--song-glow", glow);
  root.style.setProperty("--song-deep", deep);
  root.style.setProperty("--song-accent", accent);

  document.body.dataset.songTheme = track.name;

  const playerCard = $(".player-card");

  if (playerCard) {
    playerCard.style.setProperty("--song-glow", glow);
    playerCard.style.setProperty("--song-deep", deep);
    playerCard.style.setProperty("--song-accent", accent);
  }

  if (notificationPanel) {
    notificationPanel.style.setProperty("--song-glow", glow);
    notificationPanel.style.setProperty("--song-deep", deep);
    notificationPanel.style.setProperty("--song-accent", accent);
  }
}


/* 15. INTERFAZ DEL REPRODUCTOR */

function updatePlayButton() {
  if (playPauseButton) {
    playPauseButton.innerHTML = isPlaying
      ? '<i class="fa-solid fa-pause"></i>'
      : '<i class="fa-solid fa-play"></i>';

    playPauseButton.setAttribute(
      "aria-label",
      isPlaying ? "Pausar" : "Reproducir"
    );
  }

  trackArt?.classList.toggle("rotate", isPlaying);
  wave?.classList.toggle("loader", isPlaying);

  updateNotificationMusic();
}

function updateModeButtons() {
  randomButton?.classList.toggle("active", isRandom);
  randomButton?.setAttribute("aria-pressed", String(isRandom));

  repeatButton?.classList.toggle("active", isRepeat);
  repeatButton?.setAttribute("aria-pressed", String(isRepeat));
}

function updateProgress() {
  if (
    !Number.isFinite(currentTrack.duration) ||
    currentTrack.duration <= 0
  ) {
    return;
  }

  if (seekSlider) {
    seekSlider.value = String(
      (currentTrack.currentTime / currentTrack.duration) * 100
    );
  }

  if (currentTimeLabel) {
    currentTimeLabel.textContent = formatTime(currentTrack.currentTime);
  }

  if (totalDurationLabel) {
    totalDurationLabel.textContent = formatTime(currentTrack.duration);
  }
}

function seekTo() {
  if (
    !Number.isFinite(currentTrack.duration) ||
    currentTrack.duration <= 0 ||
    !seekSlider
  ) {
    return;
  }

  currentTrack.currentTime =
    currentTrack.duration * (Number(seekSlider.value) / 100);
}


/* 16. CARGAR CANCIONES */

function loadTrack(index) {
  if (!musicList.length) return;

  trackIndex = (index + musicList.length) % musicList.length;

  const track = musicList[trackIndex];

  currentTrack.pause();

  currentTrack.loop = isRepeat;
  currentTrack.src = track.music;
  currentTrack.load();

  if (trackArt) {
    trackArt.style.backgroundImage = `url("${track.img}")`;
    trackArt.setAttribute("aria-label", `Portada de ${track.name}`);
  }

  if (trackName) {
    trackName.textContent = track.name;
  }

  if (trackArtist) {
    trackArtist.textContent = track.artist;
  }

  if (nowPlaying) {
    nowPlaying.textContent =
      `CANCIÓN ${String(trackIndex + 1).padStart(2, "0")} DE ${String(
        musicList.length
      ).padStart(2, "0")}`;
  }

  if (seekSlider) seekSlider.value = "0";

  if (currentTimeLabel) currentTimeLabel.textContent = "00:00";
  if (totalDurationLabel) totalDurationLabel.textContent = "00:00";

  isPlaying = false;

  applyTrackTheme(track);
  updatePlayButton();
}


/* 17. REPRODUCIR / PAUSAR */

async function playTrack() {
  try {
    prepareAudioBoost();

    if (audioContext?.state === "suspended") {
      await audioContext.resume();
    }

    await currentTrack.play();

    isPlaying = true;

    applyTrackTheme(musicList[trackIndex]);
    updatePlayButton();

  } catch (error) {
    isPlaying = false;
    updatePlayButton();

    console.warn(
      "No se pudo reproducir. Revisa la ruta del archivo:",
      musicList[trackIndex]?.music,
      error
    );
  }
}

function pauseTrack() {
  currentTrack.pause();

  isPlaying = false;
  updatePlayButton();
}

function playPauseTrack() {
  if (currentTrack.paused) {
    playTrack();
  } else {
    pauseTrack();
  }
}


/* 18. SIGUIENTE / ANTERIOR / ALEATORIO */

function getNextRandomIndex() {
  if (musicList.length < 2) return trackIndex;

  let nextIndex = trackIndex;

  while (nextIndex === trackIndex) {
    nextIndex = Math.floor(Math.random() * musicList.length);
  }

  return nextIndex;
}

function nextTrack() {
  const nextIndex = isRandom
    ? getNextRandomIndex()
    : (trackIndex + 1) % musicList.length;

  loadTrack(nextIndex);
  playTrack();
}

function previousTrack() {
  if (currentTrack.currentTime > 3) {
    currentTrack.currentTime = 0;
    return;
  }

  const previousIndex =
    (trackIndex - 1 + musicList.length) % musicList.length;

  loadTrack(previousIndex);
  playTrack();
}

function toggleRandom() {
  isRandom = !isRandom;
  updateModeButtons();
}

function toggleRepeat() {
  isRepeat = !isRepeat;
  currentTrack.loop = isRepeat;
  updateModeButtons();
}

/* 19. EVENTOS DEL REPRODUCTOR */

playPauseButton?.addEventListener("click", playPauseTrack);

nextButton?.addEventListener("click", nextTrack);

previousButton?.addEventListener("click", previousTrack);

randomButton?.addEventListener("click", toggleRandom);

repeatButton?.addEventListener("click", toggleRepeat);

seekSlider?.addEventListener("input", seekTo);

currentTrack.addEventListener("timeupdate", updateProgress);

currentTrack.addEventListener("loadedmetadata", updateProgress);

currentTrack.addEventListener("play", () => {
  isPlaying = true;
  updatePlayButton();
});

currentTrack.addEventListener("pause", () => {
  isPlaying = false;
  updatePlayButton();
});

currentTrack.addEventListener("ended", () => {
  if (isRepeat) return;

  if (isRandom) {
    loadTrack(getNextRandomIndex());
    playTrack();
  } else if (trackIndex < musicList.length - 1) {
    nextTrack();
  } else {
    pauseTrack();

    currentTrack.currentTime = 0;

    if (seekSlider) seekSlider.value = "0";
    if (currentTimeLabel) currentTimeLabel.textContent = "00:00";
  }
});

currentTrack.addEventListener("error", () => {
  console.warn(
    "Error de audio:",
    musicList[trackIndex]?.music
  );
});

["play", "pause", "ended", "loadedmetadata"].forEach(eventName => {
  currentTrack.addEventListener(eventName, updateNotificationMusic);
});


/* 20. CONTROLES DE MÚSICA EN NOTIFICACIONES */

notificationPlay?.addEventListener("click", playPauseTrack);

notificationNext?.addEventListener("click", nextTrack);

notificationPrev?.addEventListener("click", previousTrack);


/* 21. CARTA SORPRESA */

function initLetter() {
  const toggle = $(".letter-toggle");
  const card = $(".letter-card");

  if (!toggle || !card) return;

  toggle.addEventListener("click", () => {
    const willOpen = card.hidden;

    card.hidden = !willOpen;

    toggle.setAttribute("aria-expanded", String(willOpen));

    toggle.innerHTML = willOpen
      ? '<i class="fa-solid fa-envelope-open" aria-hidden="true"></i> Cerrar cartita'
      : '<i class="fa-regular fa-envelope" aria-hidden="true"></i> Abrir cartita 💌';
  });
}


/* 22. SINCRONIZACIÓN ENTRE PESTAÑAS */

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    updatePhoneClock();
    updateNotificationMusic();
    updateProgress();
  }
});


/* 23. INICIALIZACIÓN */

function initializePhone() {
  showScreen("home");

  loadTrack(0);

  updateModeButtons();

  setVolume();

  initLetter();

  updatePhoneClock();

  updateNotificationMusic();

  if (notificationCenter) {
    notificationCenter.hidden = true;
    notificationCenter.classList.remove("is-open");
    notificationCenter.setAttribute("aria-hidden", "true");
  }

  console.log(
    "Nuestras rolitas: sistema del teléfono inicializado correctamente."
  );
}

initializePhone();