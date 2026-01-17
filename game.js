(() => {

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const modeLabel = document.getElementById("modeLabel");

  const startScreen = document.getElementById("startScreen");
  const playBtn = document.getElementById("playBtn");
  const restartBtn = document.getElementById("restartBtn");
  const modeBtns = Array.from(document.querySelectorAll(".mode-btn"));

  const W = canvas.width;
  const H = canvas.height;

  // ===== SIZE =====
  const BALL_SCALE = 0.25;
  const BASE_SCALE = 0.35;

  // ===== MODES =====
  const MODES = {
    easy:   { lives: 5, spawn: 0.45, speed: 650 },
    normal: { lives: 3, spawn: 0.28, speed: 900 },
    hard:   { lives: 2, spawn: 0.18, speed: 1200 }
  };

  let currentMode = "normal";
  let CFG = MODES[currentMode];

  // ===== IMAGES =====
  const imgBall = new Image();
  const imgBase = new Image();
  const imgBaseLose = new Image();

  imgBall.src = "ball.png";
  imgBase.src = "Base.png";
  imgBaseLose.src = "Base2.png";

  imgBall.onerror = () => console.error("Missing:", imgBall.src);
  imgBase.onerror = () => console.error("Missing:", imgBase.src);
  imgBaseLose.onerror = () => console.error("Missing:", imgBaseLose.src);

  let BALL_W = 40, BALL_H = 40;
  let BASE_W = 120, BASE_H = 40;

  imgBall.onload = () => {
    BALL_W = imgBall.naturalWidth * BALL_SCALE;
    BALL_H = imgBall.naturalHeight * BALL_SCALE;
  };

  imgBase.onload = () => {
    BASE_W = imgBase.naturalWidth * BASE_SCALE;
    BASE_H = imgBase.naturalHeight * BASE_SCALE;
    catcher.w = BASE_W;
    catcher.h = BASE_H * 0.55;
  };

  // ===== GAME STATE =====
  let score = 0;
  let lives = CFG.lives;
  let gameOver = false;
  let playing = false;

  const catcher = {
    x: W / 2,
    y: H - 80,
    w: BASE_W,
    h: BASE_H * 0.35,
    targetX: W / 2
  };

  const balls = [];

  // ===== UI =====
  function setMode(m) {
    if (!MODES[m]) return;
    currentMode = m;
    CFG = MODES[m];
    modeLabel.textContent = m.toUpperCase();
    modeBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === m));
  }

  modeBtns.forEach(b => {
    b.addEventListener("click", () => setMode(b.dataset.mode));
  });

  playBtn.onclick = () => {
    startScreen.style.display = "none";
    startGame();
  };

  // Restart button now also returns to main screen (so you can choose mode)
  restartBtn.onclick = () => {
    goToMainScreen();
  };

  // ===== MAIN SCREEN / START =====
  function goToMainScreen() {
    playing = false;
    gameOver = false;
    balls.length = 0;

    // reset HUD
    score = 0;
    lives = CFG.lives;
    scoreEl.textContent = score;
    livesEl.textContent = lives;

    // show mode screen again
    startScreen.style.display = "flex";
  }

  function startGame() {
    score = 0;
    lives = CFG.lives;
    balls.length = 0;
    gameOver = false;
    playing = true;

    // reset spawn timing & catcher
    spawnTimer = 0;
    catcher.x = W / 2;
    catcher.targetX = W / 2;

    scoreEl.textContent = score;
    livesEl.textContent = lives;
  }

  // ===== INPUT =====
  canvas.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    catcher.targetX = (e.clientX - r.left) * (W / r.width);
  });

  // ===== LOOP =====
  let last = performance.now();
  let spawnTimer = 0;
  let gameOverTimer = 0;

  function loop(t) {
    const dt = (t - last) / 1000;
    last = t;

    if (playing && !gameOver) update(dt);
    draw(dt);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function update(dt) {
    catcher.x += (catcher.targetX - catcher.x) * 0.25;
    catcher.x = Math.max(catcher.w/2, Math.min(W - catcher.w/2, catcher.x));

    spawnTimer += dt;
    if (spawnTimer > CFG.spawn) {
      spawnTimer = 0;
      balls.push({
        x: Math.random() * (W - BALL_W) + BALL_W/2,
        y: -BALL_H,
        vy: CFG.speed,
        w: BALL_W,
        h: BALL_H
      });
    }

    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      b.y += b.vy * dt;

      if (
        b.x > catcher.x - catcher.w/2 &&
        b.x < catcher.x + catcher.w/2 &&
        b.y > catcher.y - catcher.h &&
        b.y < catcher.y
      ) {
        balls.splice(i,1);
        score += 10;
        scoreEl.textContent = score;
      } else if (b.y > H) {
        balls.splice(i,1);
        lives--;
        livesEl.textContent = lives;

        if (lives <= 0) {
          gameOver = true;
          gameOverTimer = 0; // start countdown to return main screen
        }
      }
    }
  }

  function draw(dt) {
    ctx.clearRect(0,0,W,H);

    // balls
    for (const b of balls) {
      if (imgBall.complete && imgBall.naturalWidth > 0) {
        ctx.drawImage(imgBall, b.x-b.w/2, b.y-b.h/2, b.w, b.h);
      }
    }

    // base (show Base2 only during gameOver moment)
    const img = gameOver ? imgBaseLose : imgBase;
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, catcher.x-BASE_W/2, catcher.y-BASE_H, BASE_W, BASE_H);
    }

    // game over overlay + auto return to main screen
    if (gameOver) {
      ctx.fillStyle="#fff";
      ctx.font="bold 36px sans-serif";
      ctx.textAlign="center";
      ctx.fillText("GAME OVER", W/2, H/2);

      ctx.font="14px sans-serif";
      ctx.fillText("Returning to menu...", W/2, H/2 + 28);

      // wait a bit so player can see Base2.png + message
      gameOverTimer += dt;
      if (gameOverTimer >= 1.2) {
        goToMainScreen();
      }
    }
  }

  // show main screen at start
  modeLabel.textContent = currentMode.toUpperCase();
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  startScreen.style.display = "flex";

})();