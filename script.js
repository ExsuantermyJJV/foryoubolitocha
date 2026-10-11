/* Nuestras rolitas — reproductor musical */







"use strict";















const nowPlaying = document.querySelector(".now-playing");







const trackArt = document.querySelector(".track-art");







const trackName = document.querySelector(".track-name");







const trackArtist = document.querySelector(".track-artist");







const playPauseButton = document.querySelector(".playpause-track");







const nextButton = document.querySelector(".next-track");







const previousButton = document.querySelector(".prev-track");







const randomButton = document.querySelector(".random-track");







const repeatButton = document.querySelector(".repeat-track");







const seekSlider = document.querySelector(".seek_slider");







const volumeSlider = document.querySelector(".volume_slider");







const currentTimeLabel = document.querySelector(".current-time");







const totalDurationLabel = document.querySelector(".total-duration");







const wave = document.getElementById("wave");















/* Hora real del dispositivo */







const deviceClock = document.querySelector(".phone-status > span");















function updateDeviceClock() {







  if (!deviceClock) return;







  const now = new Date();







  deviceClock.textContent = new Intl.DateTimeFormat("es-CO", {







    hour: "numeric",







    minute: "2-digit",







    hour12: true







  }).format(now).replace(/\s/g, "").toLowerCase();







}















updateDeviceClock();







setInterval(updateDeviceClock, 15000);







document.addEventListener("visibilitychange", () => {







  if (!document.hidden) updateDeviceClock();







});















const currentTrack = new Audio();







currentTrack.preload = "metadata";







currentTrack.volume = 1;















let audioContext = null;







let trackSource = null;







let gainNode = null;















function prepareAudioBoost() {







  if (gainNode) return;







  const AudioContextClass = window.AudioContext || window.webkitAudioContext;







  if (!AudioContextClass) return;















  try {







    audioContext = new AudioContextClass();







    trackSource = audioContext.createMediaElementSource(currentTrack);







    gainNode = audioContext.createGain();







    trackSource.connect(gainNode);







    gainNode.connect(audioContext.destination);







    setVolume();







  } catch (error) {







    console.warn("La amplificación adicional no está disponible en este navegador.", error);







    audioContext = null;







    trackSource = null;







    gainNode = null;







  }







}















let trackIndex = 0;







let isPlaying = false;







let isRandom = false;







let isRepeat = false;















const musicList = [







  { img: "img/cafune.jpg", name: "Tek It (I Watch The Moon)", artist: "Cafuné", music: "music/Cafuné - Tek It (I Watch The Moon) [Official Video] - CAFUNÉ (128k).mp3", theme: ["#38556d", "#111c2c", "#9ab8d2"] },







  { img: "img/gg.jpg", name: "Espero no lo olvides", artist: "🍄", music: "music/Julieta Venegas - Eres para Mí (Video).mp3", theme: ["#b45491", "#251124", "#f3a3d1"] },







  { img: "img/ev.jpg", name: "Coyote Theory", artist: "🍄", music: "music/Coyote Theory - This Side of Paradise (Lyric Video).mp3", theme: ["#5a6a92", "#111522", "#a7b8e5"] },







  { img: "img/2.jpg", name: "Mi niña bonita", artist: "🍄", music: "music/Bonita- Andrés Cabas [Letra].mp3", theme: ["#c17c44", "#2a1711", "#f0bd82"] },







  { img: "img/3.jpg", name: "Enamorado", artist: "🍄", music: "music/Enamorado - Los Aptos,Letra 🌹❤.mp3", theme: ["#a84955", "#271014", "#ee9da5"] },







  { img: "img/e.jpg", name: "Dandelions", artist: "🍄", music: "music/Ruth B. - Dandelions (Lyrics).mp3", theme: ["#b99a43", "#211d10", "#f0d783"] },







  { img: "img/msg-765387767-131546.jpg", name: "Something About You", artist: "🍄", music: "music/Eyedress & Dent May - Something About You.mp3", theme: ["#4d927d", "#10231f", "#9ed9c6"] }







];















/* Navegación de mensajes anteriores y nuevos dentro del teléfono */







function animateChatMessages() {



  const chat = document.querySelector(".texts");



  const chatContent = document.querySelector(".chat-content");



  if (!chat || !chatContent || chat.dataset.navigatorReady === "true") return;







  chat.dataset.navigatorReady = "true";







  /* Mensajes ANTIGUOS: los 17 textos que estaban originalmente en tu HTML. */



  const previousMessages = [



    "Holaaaaaaaa",



    "supongo que volviste a entrar",



    "xd",



    "como lo dije antes, tengo mil cosas por decir...",



    "pero no sé, creo que estás decidida con tu pensamiento",



    "y no quiero molestarte",



    'llegará el momento en el que ambos ya perdamos el "camino"',



    "parece que ambos esperamos lo mismo del otro, pero ninguno da el paso",



    "o eso creo jajaja",



    "y puejj",



    "🤔",



    "supongo que somos víctimas de nuestra mente",



    "y por último puessss acá quedarán algunos de nuestros cortos momentos",



    "quizás en un futuro hasta hablemos de esto",



    "Depende de nosotros...",



    "espero entres aquí y escuches algunas de nuestras rolitas, posiblemente también lo esté haciendo",



    "y por sí acaso sigue bajando panzona 👇"



  ];







  /* Mensajes NUEVOS: aparecen al pulsar "Ver mensajes nuevos". */



  const latestMessages = [



    "Holap",



    "Una pequeña actualizacion",



    "Te odio estafadora"



  ];







  let currentView = "new";



  let animationTimer = null;







  /* Barra discreta integrada al chat, sin depender del estilo global de los botones. */



  const navigation = document.createElement("div");



  navigation.className = "chat-message-navigation";







  const previousButton = document.createElement("button");



  previousButton.type = "button";



  previousButton.className = "chat-message-toggle";



  previousButton.innerHTML = '<i class="fa-solid fa-chevron-up" aria-hidden="true"></i><span>Ver mensajes anteriores</span>';



  previousButton.setAttribute("aria-label", "Ver mensajes anteriores");







  const newButton = document.createElement("button");



  newButton.type = "button";



  newButton.className = "chat-message-toggle";



  newButton.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i><span>Ver mensajes nuevos</span>';



  newButton.setAttribute("aria-label", "Ver mensajes nuevos");



  newButton.hidden = true;







  navigation.append(previousButton, newButton);



  chatContent.insertBefore(navigation, chat);







  if (!document.getElementById("chat-message-navigation-styles")) {



    const style = document.createElement("style");



    style.id = "chat-message-navigation-styles";



    style.textContent = `



      .chat-message-navigation {



        box-sizing: border-box !important;



        display: flex !important;



        justify-content: center !important;



        align-items: center !important;



        flex: 0 0 auto !important;



        width: 100% !important;



        padding: 7px 10px !important;



        background: #f8f3f7 !important;



        border-top: 1px solid #eee2eb !important;



        border-bottom: 1px solid #eee2eb !important;



      }



      .chat-message-navigation .chat-message-toggle {



        box-sizing: border-box !important;



        display: inline-flex !important;



        align-items: center !important;



        justify-content: center !important;



        gap: 8px !important;



        max-width: 100% !important;



        min-height: 30px !important;



        margin: 0 auto !important;



        padding: 7px 14px !important;



        border: 1px solid #e7c4d9 !important;



        border-radius: 999px !important;



        background: linear-gradient(135deg, #fff 0%, #fff7fb 100%) !important;



        color: #a44d80 !important;



        box-shadow: 0 2px 8px rgba(133, 66, 105, .10) !important;



        font-family: "DM Sans", sans-serif !important;



        font-size: 10px !important;



        font-weight: 700 !important;



        line-height: 1.2 !important;



        letter-spacing: .01em !important;



        text-align: center !important;



        white-space: nowrap !important;



        cursor: pointer !important;



        appearance: none !important;



        -webkit-appearance: none !important;



        transition: background .18s ease, transform .18s ease, box-shadow .18s ease !important;



      }



      .chat-message-navigation .chat-message-toggle:hover {



        background: #ffedf6 !important;



        box-shadow: 0 3px 10px rgba(133, 66, 105, .15) !important;



      }



      .chat-message-navigation .chat-message-toggle:active {



        transform: scale(.98) !important;



      }



      .chat-message-navigation .chat-message-toggle[hidden] {



        display: none !important;



      }



      .texts .text {



        box-sizing: border-box;



        flex: 0 0 auto;



        max-width: 90%;



        white-space: normal;



        overflow-wrap: anywhere;



      }



      @media (max-width: 480px) {



        .chat-message-navigation { padding: 6px 7px !important; }



        .chat-message-navigation .chat-message-toggle {



          min-height: 28px !important;



          padding: 6px 11px !important;



          font-size: 9px !important;



        }



      }



    `;



    document.head.appendChild(style);



  }







  function clearAnimation() {



    if (animationTimer !== null) {



      window.clearTimeout(animationTimer);



      animationTimer = null;



    }



  }







  function renderMessages(messages, view) {



    clearAnimation();



    currentView = view;



    chat.replaceChildren();







    const spacer = document.createElement("div");



    spacer.className = "blocker";



    spacer.setAttribute("aria-hidden", "true");



    spacer.style.setProperty("flex", "0 0 4px");



    spacer.style.setProperty("height", "4px");



    chat.appendChild(spacer);







    const bubbles = messages.map(text => {



      const bubble = document.createElement("div");



      bubble.className = "text";



      bubble.textContent = text;



      bubble.style.setProperty("display", "none", "important");



      bubble.style.opacity = "0";



      chat.appendChild(bubble);



      return bubble;



    });







    previousButton.hidden = view === "previous";



    newButton.hidden = view === "new";







    let index = 0;







    function revealNext() {



      if (index >= bubbles.length) {



        animationTimer = null;



        return;



      }







      const bubble = bubbles[index++];



      /* !important evita que reglas antiguas del CSS oculten las burbujas. */



      bubble.style.setProperty("display", "block", "important");



      bubble.style.opacity = "0";



      bubble.style.transition = "opacity 240ms ease";







      requestAnimationFrame(() => {



        bubble.style.opacity = "1";



        chat.scrollTop = chat.scrollHeight;



      });







      if (index < bubbles.length) {



        animationTimer = window.setTimeout(revealNext, 1200);



      } else {



        animationTimer = window.setTimeout(() => {



          chat.scrollTop = chat.scrollHeight;



          animationTimer = null;



        }, 260);



      }



    }







    animationTimer = window.setTimeout(revealNext, 180);



  }







  previousButton.addEventListener("click", () => {



    if (currentView !== "previous") renderMessages(previousMessages, "previous");



  });







  newButton.addEventListener("click", () => {



    if (currentView !== "new") renderMessages(latestMessages, "new");



  });







  renderMessages(latestMessages, "new");



}











function formatTime(seconds) {







  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";







  const minutes = Math.floor(seconds / 60);







  const remainingSeconds = Math.floor(seconds % 60);







  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;







}















function updatePlayButton() {







  if (!playPauseButton) return;







  playPauseButton.innerHTML = isPlaying







    ? '<i class="fa-solid fa-pause"></i>'







    : '<i class="fa-solid fa-play"></i>';







  playPauseButton.setAttribute("aria-label", isPlaying ? "Pausar" : "Reproducir");







  playPauseButton.setAttribute("title", isPlaying ? "Pausar" : "Reproducir");







  trackArt?.classList.toggle("rotate", isPlaying);







  wave?.classList.toggle("loader", isPlaying);







}















function updateModeButtons() {







  randomButton?.classList.toggle("active", isRandom);







  randomButton?.setAttribute("aria-pressed", String(isRandom));







  repeatButton?.classList.toggle("active", isRepeat);







  repeatButton?.setAttribute("aria-pressed", String(isRepeat));







}















/* Tema dinámico: fondo general + reproductor, sin modificar el teléfono/chat. */
function applyTrackTheme(track) {
  if (!track) return;

  const playerCard = document.querySelector(".player-card");
  const [glow, deep, accent] = track.theme || ["#b45491", "#17101f", "#f3a3d1"];
  const root = document.documentElement;

  root.style.setProperty("--song-glow", glow);
  root.style.setProperty("--song-deep", deep);
  root.style.setProperty("--song-accent", accent);

  if (playerCard) {
    playerCard.style.setProperty("--song-glow", glow);
    playerCard.style.setProperty("--song-deep", deep);
    playerCard.style.setProperty("--song-accent", accent);
    playerCard.setAttribute("data-song-theme", track.name);
  }
}


function loadTrack(index) {







  if (!musicList.length) return;







  trackIndex = (index + musicList.length) % musicList.length;







  const track = musicList[trackIndex];







  applyTrackTheme(track);















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







    trackName.removeAttribute("title");







  }







  if (trackArtist) trackArtist.textContent = track.artist;







  if (nowPlaying) {







    nowPlaying.textContent = `CANCIÓN ${String(trackIndex + 1).padStart(2, "0")} DE ${String(musicList.length).padStart(2, "0")}`;







  }















  if (seekSlider) seekSlider.value = "0";







  if (currentTimeLabel) currentTimeLabel.textContent = "00:00";







  if (totalDurationLabel) totalDurationLabel.textContent = "00:00";







  isPlaying = false;







  updatePlayButton();







}















async function playTrack() {







  try {







    prepareAudioBoost();







    if (audioContext?.state === "suspended") await audioContext.resume();







    await currentTrack.play();







    isPlaying = true;







    updatePlayButton();







  } catch (error) {







    isPlaying = false;







    updatePlayButton();







    console.warn("No se pudo reproducir la canción. Revisa que la ruta del archivo sea correcta.", error);







  }







}















function pauseTrack() {







  currentTrack.pause();







  isPlaying = false;







  updatePlayButton();







}















function playPauseTrack() {







  if (isPlaying) pauseTrack();







  else playTrack();







}















function getNextRandomIndex() {







  if (musicList.length < 2) return trackIndex;







  let nextIndex = trackIndex;







  while (nextIndex === trackIndex) nextIndex = Math.floor(Math.random() * musicList.length);







  return nextIndex;







}















function nextTrack() {







  const nextIndex = isRandom ? getNextRandomIndex() : (trackIndex + 1) % musicList.length;







  loadTrack(nextIndex);







  playTrack();







}















function previousTrack() {







  if (currentTrack.currentTime > 3) {







    currentTrack.currentTime = 0;







    return;







  }







  const previousIndex = (trackIndex - 1 + musicList.length) % musicList.length;







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















function seekTo() {







  if (!Number.isFinite(currentTrack.duration) || currentTrack.duration <= 0 || !seekSlider) return;







  currentTrack.currentTime = currentTrack.duration * (Number(seekSlider.value) / 100);







}















function setVolume() {







  if (!volumeSlider) return;







  const sliderValue = Math.max(0, Math.min(100, Number(volumeSlider.value))) / 100;







  if (gainNode) {







    gainNode.gain.value = sliderValue * 1.35;







    currentTrack.volume = 1;







  } else {







    currentTrack.volume = sliderValue;







  }







}















function updateProgress() {







  if (!Number.isFinite(currentTrack.duration) || currentTrack.duration <= 0) return;







  if (seekSlider) seekSlider.value = String((currentTrack.currentTime / currentTrack.duration) * 100);







  if (currentTimeLabel) currentTimeLabel.textContent = formatTime(currentTrack.currentTime);







  if (totalDurationLabel) totalDurationLabel.textContent = formatTime(currentTrack.duration);







}















playPauseButton?.addEventListener("click", playPauseTrack);







nextButton?.addEventListener("click", nextTrack);







previousButton?.addEventListener("click", previousTrack);







randomButton?.addEventListener("click", toggleRandom);







repeatButton?.addEventListener("click", toggleRepeat);







seekSlider?.addEventListener("input", seekTo);







volumeSlider?.addEventListener("input", setVolume);















currentTrack.addEventListener("timeupdate", updateProgress);







currentTrack.addEventListener("loadedmetadata", updateProgress);







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







currentTrack.addEventListener("play", () => {







  isPlaying = true;







  updatePlayButton();







});







currentTrack.addEventListener("pause", () => {







  isPlaying = false;







  updatePlayButton();







});







currentTrack.addEventListener("error", () => {







  console.warn(`No se pudo cargar el audio: ${musicList[trackIndex].music}. Comprueba el nombre y la ubicación del archivo.`);







  if (trackName) trackName.title = "No se pudo cargar el audio. Revisa el nombre del archivo y su ruta.";







});















loadTrack(trackIndex);







updateModeButtons();







setVolume();















/* Espera a que el HTML esté disponible; funciona tanto si el script lleva defer como si está al final del body. */







if (document.readyState === "loading") {







  document.addEventListener("DOMContentLoaded", animateChatMessages, { once: true });







} else {







  animateChatMessages();







}
