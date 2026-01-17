(() => {
  const btnToggle = document.getElementById("musicToggle");
  const btnUpload = document.getElementById("musicUploadBtn");
  const fileInput = document.getElementById("musicFile");
  const volSlider = document.getElementById("musicVol");

  if (!btnToggle || !btnUpload || !fileInput || !volSlider) {
    console.warn("music.js: missing UI elements in HTML");
    return;
  }

  // ===== Audio object =====
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";

  // ===== storage keys =====
  const KEY_ON = "music_on";
  const KEY_VOL = "music_vol";
  const KEY_URL = "music_blob_url"; // blob URL (valid for this session only)

  // ===== restore volume =====
  const savedVol = localStorage.getItem(KEY_VOL);
  if (savedVol !== null) volSlider.value = savedVol;
  audio.volume = parseFloat(volSlider.value || "0.6");

  // ===== state =====
  let musicOn = localStorage.getItem(KEY_ON) === "1";
  let userPickedThisSession = false;

  // default fallback song (optional)
  // Put a file named "music.mp3" in same folder if you want auto default music
  const DEFAULT_SONG = "music.mp3";

  // If user had music on before, try default song first
  if (musicOn) {
    audio.src = DEFAULT_SONG;
    setButton();
    // autoplay usually blocked until user interacts, so we "arm" it:
    armStartOnNextUserGesture();
  } else {
    setButton();
  }

  // ===== UI events =====
  volSlider.addEventListener("input", () => {
    audio.volume = parseFloat(volSlider.value);
    localStorage.setItem(KEY_VOL, volSlider.value);
  });

  btnUpload.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    // create blob URL for selected music
    const url = URL.createObjectURL(file);
    audio.src = url;
    userPickedThisSession = true;

    // remember ON and start music
    musicOn = true;
    localStorage.setItem(KEY_ON, "1");

    setButton();
    safePlay(); // user just interacted so play should be allowed
  });

  btnToggle.addEventListener("click", () => {
    musicOn = !musicOn;
    localStorage.setItem(KEY_ON, musicOn ? "1" : "0");
    setButton();

    if (musicOn) {
      // If no uploaded song yet, use default fallback
      if (!audio.src) audio.src = DEFAULT_SONG;
      safePlay();
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  });

  // ===== helpers =====
  function setButton() {
    btnToggle.textContent = musicOn ? "Music: ON" : "Music: OFF";
  }

  function safePlay() {
    // Browsers may block play unless triggered by a user gesture
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // if blocked, arm it so next tap/click starts it
        armStartOnNextUserGesture();
      });
    }
  }

  function armStartOnNextUserGesture() {
    const startOnce = () => {
      if (!musicOn) return;
      // if user didn't upload, ensure default exists
      if (!audio.src) audio.src = DEFAULT_SONG;
      safePlay();
      window.removeEventListener("pointerdown", startOnce);
      window.removeEventListener("keydown", startOnce);
    };
    window.addEventListener("pointerdown", startOnce, { once: true });
    window.addEventListener("keydown", startOnce, { once: true });
  }

})();