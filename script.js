const viewport = document.getElementById("viewport");
const world = document.getElementById("world");
const backdrop = document.getElementById("backdrop");
const loaderScreen = document.getElementById("loader-screen");

/* -------------------------------------------------- */
/* CONFIG (needed early for image loading) */
/* -------------------------------------------------- */

const covers = [
  "covers/2022_06_JUN.webp", "covers/2022_07_JLY.webp", "covers/2022_08_AUG.webp",
  "covers/2022_09_SEP.webp", "covers/2022_10_OCT.webp", "covers/2022_11_NOV.webp",
  "covers/2022_12_DEC.webp", "covers/2023_01_JAN.webp", "covers/2023_02_FEB.webp",
  "covers/2023_03_MAR.webp", "covers/2023_04_APL.webp", "covers/2023_05_MAY.webp",
  "covers/2023_06_JUN.webp", "covers/2023_07_JUL.webp", "covers/2023_08_AUG.webp",
  "covers/2023_09_SEP.webp", "covers/2023_10_OCT.webp", "covers/2023_11_NOV.webp",
  "covers/2023_12_DEC.webp", "covers/2024_01_JAN.webp", "covers/2024_02_FEB.webp",
  "covers/2024_03_MAR.webp", "covers/2024_04_APL.webp", "covers/2024_05_MAY.webp",
  "covers/2024_06_JUN.webp", "covers/2024_07_JLY.webp", "covers/2024_08_AUG.webp",
  "covers/2024_09_SEP.webp", "covers/2024_10_OCT.webp", "covers/2024_11_NOV.webp",
  "covers/2024_12_DEC.webp", "covers/2025_01_JAN.webp", "covers/2025_02_FEB.webp",
  "covers/2025_03_MAR.webp", "covers/2025_04_APL.webp", "covers/2025_05_MAY.webp",
  "covers/2025_06_JUN.webp", "covers/2025_07_JLY.webp", "covers/2025_08_AUG.webp",
  "covers/2025_09_SEP.webp", "covers/2025_10_OCT.webp", "covers/2025_11_NOV.webp",
  "covers/2025_12_DEC.webp", "covers/2026_01_JAN.webp", "covers/2026_02_FEB.webp",
  "covers/2026_03_MAR.webp"
];

const WORLD_W = 8000;
const WORLD_H = 8000;
const COVER_W = 280;
const COVER_H = 280;
const GAP = 24;
const EDGE_MARGIN = 500;
const MIN_DISTANCE = 100;

function getThumbPath(fullPath) {
  const parts = fullPath.split("/");
  const filename = parts.pop();
  parts.push("thumbs", filename);
  return parts.join("/");
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* -------------------------------------------------- */
/* EASTCOVER Voting (Supabase) */
/* -------------------------------------------------- */
const SUPABASE_PROJECT_URL = "https://bncnrkuvdzzcoqcnovrf.supabase.co";
const VOTE_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/vote`;
const RESULTS_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/results`;
const DEVICE_KEY = "eastcover_device_id";
const CURRENT_VOTE_KEY = "eastcover_current_vote";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

async function voteForCover(coverId) {
  const device_id = getDeviceId();
  const res = await fetch(VOTE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id, cover_id: coverId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vote failed (${res.status}): ${text}`);
  }
  localStorage.setItem(CURRENT_VOTE_KEY, coverId);
  return res.json();
}

async function getResults() {
  const res = await fetch(RESULTS_ENDPOINT, { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Results failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.results || [];
}

function getCurrentVote() {
  return localStorage.getItem(CURRENT_VOTE_KEY);
}

function clearLocalVote() {
  localStorage.removeItem(CURRENT_VOTE_KEY);
  refreshVoteState();
  updateLeaderboardUI();
}

function hasMyVote(coverId) {
  return getCurrentVote() === coverId;
}

window.eastcoverVote = { getDeviceId, voteForCover, getResults, getCurrentVote, clearLocalVote };

function getCoverId(cover) {
  const p = (cover.dataset.fullSrc || "").split("/").pop().replace(/\.(webp|jpg|jpeg|png)$/i, "");
  return p || String(cover.dataset.index ?? "");
}

function meetsMinDistance(a, b) {
  const hGap = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const vGap = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  if (hGap < 0 && vGap < 0) return false;
  const gap = hGap < 0 ? vGap : vGap < 0 ? hGap : Math.min(hGap, vGap);
  return gap >= MIN_DISTANCE;
}

function placeNonOverlapping(count) {
  const placed = [];
  for (let i = 0; i < count; i++) {
    for (let t = 0; t < 5000; t++) {
      const rw = COVER_W + GAP, rh = COVER_H + GAP;
      const x = Math.random() * (WORLD_W - rw - EDGE_MARGIN * 2) + EDGE_MARGIN;
      const y = Math.random() * (WORLD_H - rh - EDGE_MARGIN * 2) + EDGE_MARGIN;
      const rect = { x, y, w: rw, h: rh };
      if (placed.every(o => meetsMinDistance(rect, o))) {
        placed.push(rect);
        break;
      }
    }
  }
  return placed;
}

let coverImages = [];
let imagesLoadedCount = 0;
let totalCoverImages = 0;
const LOAD_THRESHOLD = 0.5;
let minTimeElapsed = false;

function maybeHideLoader() {
  if (!loaderScreen || !minTimeElapsed) return;
  if (!allLoaderMessagesShown) return;
  if (imagesLoadedCount < totalCoverImages * LOAD_THRESHOLD) return;
  if (loaderMsgInterval) { clearInterval(loaderMsgInterval); loaderMsgInterval = null; }
  loaderScreen.classList.add("hidden");
}

function onCoverImageLoad() {
  imagesLoadedCount++;
  maybeHideLoader();
}

function renderCovers(positions, onLoad) {
  coverImages = [];
  positions.forEach((pos, i) => {
    const fullPath = covers[i % covers.length];
    const thumbPath = getThumbPath(fullPath);
    const filename = fullPath.split("/").pop().replace(/\.(jpg|webp)$/, "");

    const cover = document.createElement("div");
    cover.dataset.fullSrc = fullPath;
    cover.className = "cover";
    cover.style.left = pos.x + "px";
    cover.style.top = pos.y + "px";
    cover.dataset.index = String(i);
    cover.tabIndex = -1;

    const img = document.createElement("img");
    img.alt = filename;
    img.draggable = false;
    cover.classList.add("img-loading");
    const countLoad = () => {
      if (img.dataset.counted) return;
      img.dataset.counted = "1";
      cover.classList.remove("img-loading");
      onLoad && onLoad();
    };
    img.addEventListener("load", countLoad);
    img.addEventListener("error", () => {
      if (img.src !== fullPath) {
        img.src = fullPath;
        img.addEventListener("load", countLoad);
      } else {
        countLoad();
      }
    });
    img.src = thumbPath;
    img.loading = "eager";
    if (img.complete) countLoad();

    const shine = document.createElement("div");
    shine.className = "shine";
    const spec = document.createElement("div");
    spec.className = "spec";

    const crownEl = document.createElement("div");
    crownEl.className = "cover-crown";
    crownEl.textContent = "👑";
    crownEl.setAttribute("aria-hidden", "true");
    const coverId = filename;
    if (hasMyVote(coverId)) cover.classList.add("is-voted");

    cover.appendChild(img);
    cover.appendChild(shine);
    cover.appendChild(spec);
    cover.appendChild(crownEl);

    const tooltip = document.createElement("div");
    tooltip.className = "cover-tooltip";
    tooltip.textContent = filename;
    tooltip.style.display = "none";
    world.appendChild(tooltip);

    cover.addEventListener("mouseenter", () => {
      tooltip.style.left = pos.x + COVER_W / 2 + "px";
      tooltip.style.top = pos.y + COVER_H + 10 + "px";
      tooltip.style.display = "block";
    });
    cover.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });

    cover.addEventListener("focus", () => {
      if (cover.classList.contains("is-active")) return;
      coverImages.forEach(({ img: c, tooltip: t }) => {
        c.classList.remove("focused");
        c.tabIndex = -1;
        if (t) t.style.display = "none";
      });
      cover.classList.add("focused");
      tooltip.style.display = "block";
      tooltip.style.left = pos.x + COVER_W / 2 + "px";
      tooltip.style.top = pos.y + COVER_H + 10 + "px";
      if (skipScrollOnFocus) {
        skipScrollOnFocus = false;
      } else {
        viewport.scrollLeft = pos.x + COVER_W / 2 - viewport.clientWidth / 2;
        viewport.scrollTop = pos.y + COVER_H / 2 - viewport.clientHeight / 2;
      }
    });

    cover.addEventListener("blur", () => {
      cover.classList.remove("focused");
      tooltip.style.display = "none";
    });

    cover.addEventListener("keydown", (e) => {
      if (cover.classList.contains("is-active")) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); closeActive(); }
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openActive(cover);
      }
      const idx = parseInt(cover.dataset.index, 10);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault();
        let next = idx;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(idx + 1, coverImages.length - 1);
        else next = Math.max(idx - 1, 0);
        if (next !== idx) coverImages[next].img.focus();
      }
    });

    world.appendChild(cover);
    coverImages.push({ img: cover, position: pos, index: i, tooltip });
  });
}

/* Start loading images immediately (while loader displays) */
const positions = placeNonOverlapping(covers.length);
totalCoverImages = positions.length;
renderCovers(positions, onCoverImageLoad);

/* -------------------------------------------------- */
/* LOADER TEXT LOOP */
/* -------------------------------------------------- */

const loaderMessages = [
  "adding some imagination",
  "adding some life...",
  "adding some faces...",
  "adding some love...",
  "adding some love making...",
  "adding some friends...",
  "adding some colors...",
  "adding some APE...",
  "adding some long island iced tea...",
  "adding some 脆脆的東西...",
  "adding some milk...",
  "adding some anxiety...",
  "adding some sweaty palms...",
  "adding some Taipei...",
  "adding some Tokyo...",
  "adding some Langley...",
  "adding all the influences...",
  "adding all the influences...",
  "adding all the influences...",
  "adding all the influences...",
  "adding all the influences...",
];
let allLoaderMessagesShown = false;
let loaderMsgInterval = null;
const loaderTextEl = document.getElementById("loader-text");
if (loaderTextEl) {
  let msgIdx = 0;
  loaderTextEl.textContent = loaderMessages[0];
  loaderMsgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % loaderMessages.length;
    loaderTextEl.textContent = loaderMessages[msgIdx];
    if (msgIdx === 0) {
      allLoaderMessagesShown = true;
      clearInterval(loaderMsgInterval);
      maybeHideLoader();
    }
  }, 650);
}

/* -------------------------------------------------- */
/* COORD DISPLAY (under HUD) */
/* -------------------------------------------------- */

const coordDisplay = document.getElementById("coord-display");
if (coordDisplay && viewport) {
  let coordX = 0, coordY = 0;
  const mobileQuery = window.matchMedia("(max-width: 600px)");

  function updateCoordDisplay() {
    if (mobileQuery.matches) {
      coordX = Math.round(viewport.scrollLeft + viewport.clientWidth / 2);
      coordY = Math.round(viewport.scrollTop + viewport.clientHeight / 2);
    }
    coordDisplay.textContent = `x: ${coordX} · y: ${coordY}`;
  }

  document.addEventListener("mousemove", (e) => {
    if (!mobileQuery.matches) {
      coordX = e.clientX;
      coordY = e.clientY;
      updateCoordDisplay();
    }
  });
  viewport.addEventListener("scroll", updateCoordDisplay);
  window.addEventListener("resize", updateCoordDisplay);
  mobileQuery.addEventListener("change", updateCoordDisplay);
  updateCoordDisplay();
}

/* -------------------------------------------------- */
/* ZOOM (trackpad pinch + mobile pinch only) */
/* -------------------------------------------------- */

const ZOOM_MIN = 1;      /* viewport = 100%, can't zoom in further */
const ZOOM_MAX = 0.35;   /* max zoom out = 35% = see ~3x more world */
let currentZoom = 1;

function applyZoom(newZoom, centerX, centerY) {
  const oldZoom = currentZoom;
  newZoom = Math.max(ZOOM_MAX, Math.min(ZOOM_MIN, newZoom));
  currentZoom = newZoom;

  const worldX = (centerX + viewport.scrollLeft) / oldZoom;
  const worldY = (centerY + viewport.scrollTop) / oldZoom;

  world.style.zoom = newZoom;

  viewport.scrollLeft = worldX * newZoom - centerX;
  viewport.scrollTop = worldY * newZoom - centerY;
}

function initZoom() {
  world.style.zoom = 1;

  /* Trackpad pinch (Ctrl+wheel) */
  viewport.addEventListener("wheel", (e) => {
    if (activeCover) { closeActive(); e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const cx = viewport.clientWidth / 2;
      const cy = viewport.clientHeight / 2;
      const delta = -e.deltaY * 0.01;
      applyZoom(currentZoom + delta, cx, cy);
      return;
    }
    e.preventDefault();
    viewport.scrollLeft += e.deltaX;
    viewport.scrollTop += e.deltaY;
  }, { passive: false });

  /* Mobile pinch */
  let pinchStartDist = 0, pinchStartZoom = 1, pinchCenterX = 0, pinchCenterY = 0;

  viewport.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      pinchStartDist = Math.hypot(dx, dy);
      pinchStartZoom = currentZoom;
      const rect = viewport.getBoundingClientRect();
      pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
    }
  }, { passive: true });

  viewport.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && pinchStartDist > 0) {
      e.preventDefault();
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / pinchStartDist;
      applyZoom(pinchStartZoom * scale, pinchCenterX, pinchCenterY);
    }
  }, { passive: false });

  viewport.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) pinchStartDist = 0;
  }, { passive: true });
}

/* -------------------------------------------------- */
/* GET ARTWORK AVERAGE COLOR (SAFE) */
/* -------------------------------------------------- */

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0, l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2*l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2*l - 1)) * s;
  const x = c * (1 - Math.abs(((h/60) % 2) - 1));
  const m = l - c/2;
  let r=0,g=0,b=0;
  if (h < 60) { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }
  return {
    r: Math.round((r+m)*255),
    g: Math.round((g+m)*255),
    b: Math.round((b+m)*255)
  };
}

function getAverageColor(img) {
  if (!img || !img.complete || !img.naturalWidth) return { r: 128, g: 128, b: 128 };

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const size = 40;
  canvas.width = size;
  canvas.height = size;

  try {
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    let r=0,g=0,b=0,count=0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 10) continue;
      r += data[i];
      g += data[i+1];
      b += data[i+2];
      count++;
    }
    if (!count) return { r: 128, g: 128, b: 128 };

    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    const hsl = rgbToHsl(r, g, b);
    const boosted = hslToRgb(hsl.h, clamp(hsl.s * 1.25, 0, 1), clamp(hsl.l * 1.05, 0, 1));

    return boosted;
  } catch {
    return { r: 128, g: 128, b: 128 };
  }
}

/* -------------------------------------------------- */
/* ENLARGE SCALE */
/* -------------------------------------------------- */

function getEnlargeScale() {
  const pad = Math.min(48, window.innerWidth * 0.06, window.innerHeight * 0.06);
  const maxW = window.innerWidth - pad * 2;
  const maxH = window.innerHeight - pad * 2;
  const scaleX = maxW / COVER_W;
  const scaleY = maxH / COVER_H;
  return clamp(Math.min(scaleX, scaleY), 1.1, 2.3);
}

/* -------------------------------------------------- */
/* ACTIVE STATE */
/* -------------------------------------------------- */

let activeCover = null;
let skipScrollOnFocus = false;

function applyTransform(cover) {
  const st = cover._state;
  if (!st) return;

  const t = performance.now();
  const floatY = st.floatAmp * Math.sin(t * st.floatSpeed);

  cover.style.transform =
    `translate3d(${st.dx}px, ${st.dy + floatY}px, ${st.z}px)
     scale(${st.s})
     rotateX(${st.rx.toFixed(2)}deg)
     rotateY(${st.ry.toFixed(2)}deg)`;
}

function animateActive(cover) {
  const st = cover._state;
  if (!st) return;

  // init velocities once
  st.vrx ??= 0;
  st.vry ??= 0;
  st.vz  ??= 0;

  // Pokémon-card feel
  const K = 0.16;  // stiffness
  const D = 0.80;  // damping

  st.vrx = (st.vrx + (st.trx - st.rx) * K) * D;
  st.vry = (st.vry + (st.try_ - st.ry) * K) * D;
  st.vz  = (st.vz  + (st.tz  - st.z ) * K) * D;

  st.rx += st.vrx;
  st.ry += st.vry;
  st.z  += st.vz;

  updateSpecularFromTilt(cover);
  applyTransform(cover);
  cover._anim = requestAnimationFrame(() => animateActive(cover));
}

/* -------------------------------------------------- */
/* TILT + MICRO Z LIFT */
/* -------------------------------------------------- */

function updateCoverTilt(cover, clientX, clientY) {
  const st = cover._state;
  if (!st) return;

  const rect = cover.getBoundingClientRect();

  let x = (clientX - rect.left) / rect.width;
  let y = (clientY - rect.top) / rect.height;

  const over = x >= 0 && x <= 1 && y >= 0 && y <= 1;

  x = clamp(x, 0, 1);
  y = clamp(y, 0, 1);

  // normalized position -1..1
  const nx = (x - 0.5) * 2;
  const ny = (y - 0.5) * 2;

  // distance 0..1 (center to corners)
  const r = Math.min(1, Math.hypot(nx, ny));

  // non-linear (more edge response, more “card”)
  const ex = Math.sign(nx) * Math.pow(Math.abs(nx), 1.35);
  const ey = Math.sign(ny) * Math.pow(Math.abs(ny), 1.35);

  // tune these
  const MAX_TILT  = 24; // rotateX/Y
  const MAX_LIFT  = 34; // translateZ

  if (over) {
    st.trx = (-ey) * MAX_TILT;
    st.try_ = ex * MAX_TILT;
    st.tz = r * MAX_LIFT;

    // holo vars
    cover.style.setProperty("--mx", `${x * 100}%`);
    cover.style.setProperty("--my", `${y * 100}%`);
    cover.style.setProperty("--posx", `${x * 100}%`);
    cover.style.setProperty("--posy", `${y * 100}%`);
    cover.style.setProperty("--hyp", r.toFixed(3));
  } else {
    st.trx = 0;
    st.try_ = 0;
    st.tz = 0;
    cover.style.setProperty("--hyp", "0.25");
  }
}


function updateSpecularFromTilt(cover) {
  const st = cover._state;
  if (!st) return;

  const MAX_TILT = 24;
  const nx = clamp(st.ry / MAX_TILT, -1, 1);
  const ny = clamp(st.rx / MAX_TILT, -1, 1);
  const hx = 50 + nx * 30;
  const hy = 50 - ny * 30;

  // intensity grows with tilt amount
  const mag = Math.min(1, Math.hypot(nx, ny));
  const intensity = 0.12 + mag * 0.40;

  cover.style.setProperty("--hx", `${hx}%`);
  cover.style.setProperty("--hy", `${hy}%`);
  cover.style.setProperty("--hi", intensity.toFixed(3));
}


/* -------------------------------------------------- */
/* OPEN / CLOSE */
/* -------------------------------------------------- */

function setArtworkGlow(cover) {
  const img = cover.querySelector("img");
  const { r, g, b } = getAverageColor(img);

  cover.style.setProperty("--glow", `rgba(${r}, ${g}, ${b}, 0.62)`);
  const glow1 = `rgba(${r}, ${g}, ${b}, 0.55)`;
  const glow2 = `rgba(${r}, ${g}, ${b}, 0.28)`;

  cover.style.boxShadow = `
    0 35px 95px rgba(0,0,0,.45),
    0 0 70px ${glow1},
    0 0 140px ${glow2}
  `;
}

function openActive(cover) {
  if (activeCover && activeCover !== cover) closeActive();

  const fullPath = cover.dataset.fullSrc;
  if (fullPath) {
    const img = cover.querySelector("img");
    if (img && img.src.includes("/thumbs/")) img.src = fullPath;
  }

  const rect = cover.getBoundingClientRect();

  cover._originalParent = cover.parentNode;
  cover._originalNext = cover.nextSibling;
  cover._originalLeft = cover.style.left;
  cover._originalTop = cover.style.top;
  cover._originalRect = rect;

  setArtworkGlow(cover);

  document.body.appendChild(cover);
  document.body.classList.add("cover-active");
  cover.classList.add("is-active");
  backdrop.hidden = false;

  /* Use intrinsic size so enlarged view is same size regardless of zoom level */
  const centerX = window.innerWidth / 2 - COVER_W / 2;
  const centerY = window.innerHeight / 2 - COVER_H / 2;
  const origCenterX = rect.left + rect.width / 2;
  const origCenterY = rect.top + rect.height / 2;

  cover.style.position = "fixed";
  cover.style.left = (origCenterX - COVER_W / 2) + "px";
  cover.style.top = (origCenterY - COVER_H / 2) + "px";
  cover.style.width = COVER_W + "px";
  cover.style.height = COVER_H + "px";
  cover.style.margin = "0";
  cover.style.setProperty("--mx", "50%");
  cover.style.setProperty("--my", "50%");
  cover.style.setProperty("--posx", "50%");
  cover.style.setProperty("--posy", "50%");
  cover.style.setProperty("--hyp", "0.25");
    // ✅ initialize spec highlight vars so it’s visible immediately
  cover.style.setProperty("--hx", "50%");
  cover.style.setProperty("--hy", "50%");
  cover.style.setProperty("--hi", "0.18");  

  const scale = getEnlargeScale();
  const dx = centerX - (origCenterX - COVER_W / 2);
  const dy = centerY - (origCenterY - COVER_H / 2);

  activeCover = cover;

  cover._state = {
    rx: 0, ry: 0, rz: 0,
    trx: 0, try_: 0, trz: 0,
    tx: 0, ty: 0,
    ttx: 0, tty: 0,
    z: 0, tz: 0,
    dx, dy,
    s: scale,
    floatAmp: 6,
    floatSpeed: 0.003
  };

  cover.style.transition = "transform .35s cubic-bezier(.2,.8,.2,1)";
  cover.style.transform = `translate3d(${dx}px,${dy}px,0) scale(${scale})`;

  setTimeout(() => {
    if (activeCover !== cover) return;
    cover.style.transition = "";
    animateActive(cover);
  }, 360);
}

function closeActive() {
  if (!activeCover) return;

  const cover = activeCover;
  activeCover = null;
  backdrop.hidden = true;

  cover._anim && cancelAnimationFrame(cover._anim);

  cover.style.transition = "transform .28s cubic-bezier(.2,.8,.2,1)";
  cover.style.transform = "translate3d(0,0,0) scale(1) rotateX(0deg) rotateY(0deg)";

  setTimeout(() => {
    if (cover.parentNode !== document.body) return;

    const parent = cover._originalParent;
    const next = cover._originalNext;
    if (parent) {
      if (next && next.parentNode === parent) parent.insertBefore(cover, next);
      else parent.appendChild(cover);
    }

    const entry = coverImages.find(e => e.img === cover);
    const left = entry ? entry.position.x + "px" : (cover._originalLeft || "");
    const top  = entry ? entry.position.y + "px" : (cover._originalTop || "");

    document.body.classList.remove("cover-active");
    cover.classList.remove("is-active");
    cover.style.position = "";
    cover.style.left = left;
    cover.style.top = top;
    cover.style.width = "";
    cover.style.height = "";
    cover.style.margin = "";
    cover.style.transform = "";
    cover.style.transition = "";
    cover.style.boxShadow = "";
    cover.style.removeProperty("--glow");
    cover._state = null;
    skipScrollOnFocus = true;
    cover.focus({ preventScroll: true });
  }, 290);
}

/* -------------------------------------------------- */
/* COVER CLICK + ENABLE */
/* -------------------------------------------------- */

function enableCover(cover) {
  let downX = 0, downY = 0, moved = false;

  cover.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    if (cover === activeCover) cover.setPointerCapture(e.pointerId);
  });

  cover.addEventListener("pointermove", (e) => {
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 8) moved = true;
    if (cover === activeCover) updateCoverTilt(cover, e.clientX, e.clientY);
  });

  cover.addEventListener("pointerup", (e) => {
    if (cover === activeCover) try { cover.releasePointerCapture(e.pointerId); } catch (_) {}
  });
  cover.addEventListener("pointercancel", (e) => {
    if (cover === activeCover) try { cover.releasePointerCapture(e.pointerId); } catch (_) {}
  });

  cover.addEventListener("pointerleave", () => {
    if (cover !== activeCover || !cover._state) return;
    cover._state.trx = 0;
    cover._state.try_ = 0;
    cover._state.tz = 0;
    cover.style.setProperty("--hyp", "0.25");
  });

  let clickTimeout = null;
  cover.addEventListener("click", (e) => {
    if (moved || isPanning) return;
    e.preventDefault();
    e.stopPropagation();
    if (cover.classList.contains("is-active")) {
      closeActive();
      return;
    }
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      toggleVote(cover);
      return;
    }
    clickTimeout = setTimeout(() => {
      clickTimeout = null;
      openActive(cover);
    }, 350);
  });
}
async function toggleVote(cover) {
  const id = getCoverId(cover);
  if (hasMyVote(id)) return; /* already voted for this one */
  try {
    await voteForCover(id);
    refreshVoteState();
    await updateLeaderboardUI();
  } catch (err) {
    console.error("Vote failed:", err);
  }
}
function refreshVoteState() {
  const current = getCurrentVote();
  coverImages.forEach(({ img: c }) => {
    const id = getCoverId(c);
    if (id === current) {
      c.classList.add("is-voted");
    } else {
      c.classList.remove("is-voted");
    }
  });
}
const validCoverIds = new Set(covers.map((p) => p.split("/").pop().replace(/\.(webp|jpg)$/i, "")));

function scrollToCover(coverId) {
  const entry = coverImages.find((e) => getCoverId(e.img) === coverId);
  if (!entry) return;
  const { position: pos } = entry;
  viewport.scrollLeft = pos.x + COVER_W / 2 - viewport.clientWidth / 2;
  viewport.scrollTop = pos.y + COVER_H / 2 - viewport.clientHeight / 2;
  skipScrollOnFocus = true;
  entry.img.focus({ preventScroll: true });
}

async function updateLeaderboardUI() {
  const el = document.getElementById("leaderboard");
  if (!el) return;
  try {
    const results = await getResults();
    const withVotes = (results || []).filter(
      (r) => (r.votes ?? r.count ?? 0) > 0 && validCoverIds.has(r.cover_id || r.id || "")
    );
    if (withVotes.length === 0) {
      el.innerHTML = "";
      const toggle = document.getElementById("leaderboard-toggle");
      if (toggle) toggle.style.display = "none";
      return;
    }
    const toggle = document.getElementById("leaderboard-toggle");
    if (toggle) toggle.style.display = "";
    const sorted = [...withVotes].sort((a, b) => (b.votes ?? b.count ?? 0) - (a.votes ?? a.count ?? 0));
    const top = sorted.slice(0, 3);
    el.innerHTML = top.map((r) => {
      const id = r.cover_id || r.id || "";
      return `<div class="leaderboard-item" data-cover-id="${id}" role="button" tabindex="0"><span class="leaderboard-filename">${id}</span><span class="leaderboard-count">${r.votes ?? r.count ?? 0}</span></div>`;
    }).join("");
  } catch {
    el.innerHTML = "";
  }
}

/* -------------------------------------------------- */
/* PAN */
/* -------------------------------------------------- */

let isPanning = false;
let panStartX = 0, panStartY = 0, scrollStartX = 0, scrollStartY = 0;

viewport.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".cover")) return;
  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  scrollStartX = viewport.scrollLeft;
  scrollStartY = viewport.scrollTop;
  viewport.style.cursor = "grabbing";
});

viewport.addEventListener("pointermove", (e) => {
  if (!isPanning) return;
  viewport.scrollLeft = scrollStartX + panStartX - e.clientX;
  viewport.scrollTop  = scrollStartY + panStartY - e.clientY;
});

document.addEventListener("pointerup", () => { isPanning = false; viewport.style.cursor = "grab"; });
document.addEventListener("pointercancel", () => { isPanning = false; viewport.style.cursor = "grab"; });

world.addEventListener("dragstart", (e) => e.preventDefault());

/* -------------------------------------------------- */
/* GLOBAL LISTENERS */
/* -------------------------------------------------- */

document.addEventListener("pointermove", (e) => {
  if (activeCover) updateCoverTilt(activeCover, e.clientX, e.clientY);
});

backdrop.addEventListener("click", closeActive);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeActive();
});

/* -------------------------------------------------- */
/* RESIZE */
/* -------------------------------------------------- */

window.addEventListener("resize", () => {
  if (!activeCover || !activeCover._state) return;
  const rect = activeCover._originalRect;
  if (!rect) return;
  const s = getEnlargeScale();
  const cx = window.innerWidth / 2 - rect.width / 2;
  const cy = window.innerHeight / 2 - rect.height / 2;
  activeCover._state.s = s;
  activeCover._state.dx = cx - rect.left;
  activeCover._state.dy = cy - rect.top;
});

/* -------------------------------------------------- */
/* INIT */
/* -------------------------------------------------- */

coverImages.forEach(({ img }) => enableCover(img));

const lastIdx = covers.length - 1;
viewport.scrollLeft = positions[lastIdx].x + COVER_W / 2 - viewport.clientWidth / 2;
viewport.scrollTop  = positions[lastIdx].y + COVER_H / 2 - viewport.clientHeight / 2;

initZoom();

const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
if (zoomInBtn && zoomOutBtn) {
  const doZoom = (delta) => {
    const cx = viewport.clientWidth / 2;
    const cy = viewport.clientHeight / 2;
    applyZoom(currentZoom + delta, cx, cy);
  };
  zoomInBtn.addEventListener("click", () => doZoom(0.15));
  zoomOutBtn.addEventListener("click", () => doZoom(-0.15));
}

updateLeaderboardUI();

const leaderboardSection = document.querySelector(".leaderboard-section");
const leaderboardToggle = document.getElementById("leaderboard-toggle");
if (leaderboardSection && leaderboardToggle) {
  leaderboardToggle.addEventListener("click", () => {
    const collapsed = leaderboardSection.classList.toggle("is-collapsed");
    leaderboardToggle.setAttribute("aria-label", collapsed ? "Expand leaderboard" : "Collapse leaderboard");
    leaderboardToggle.setAttribute("aria-expanded", !collapsed);
  });
}

const leaderboardEl = document.getElementById("leaderboard");
if (leaderboardEl) {
  leaderboardEl.addEventListener("click", (e) => {
    const item = e.target.closest(".leaderboard-item[data-cover-id]");
    if (item) scrollToCover(item.dataset.coverId);
  });
  leaderboardEl.addEventListener("keydown", (e) => {
    const item = e.target.closest(".leaderboard-item[data-cover-id]");
    if (item && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      scrollToCover(item.dataset.coverId);
    }
  });
}

setTimeout(() => { minTimeElapsed = true; maybeHideLoader(); }, 10000);
