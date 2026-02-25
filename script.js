const viewport = document.getElementById("viewport");
const world = document.getElementById("world");
const backdrop = document.getElementById("backdrop");
const loaderScreen = document.getElementById("loader-screen");

/* -------------------------------------------------- */
/* CONFIG */
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
  "covers/2025_12_DEC.webp", "covers/2026_01_JAN.webp", "covers/2026_02_FEB.webp"
];

const WORLD_W = 8000;
const WORLD_H = 8000;
const COVER_W = 280;
const COVER_H = 280;
const GAP = 24;
const EDGE_MARGIN = 500;
const MIN_DISTANCE = 100;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* -------------------------------------------------- */
/* PLACEMENT */
/* -------------------------------------------------- */

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

function renderCovers(positions) {
  coverImages = [];
  positions.forEach((pos, i) => {
    const path = covers[i % covers.length];
    const filename = path.split("/").pop().replace(/\.(jpg|webp)$/, "");

    const cover = document.createElement("div");
    cover.className = "cover";
    cover.style.left = pos.x + "px";
    cover.style.top = pos.y + "px";
    cover.dataset.index = String(i);
    cover.tabIndex = i === 0 ? 0 : -1;  /* roving tabindex: only one in tab order, so Tab returns to last focused */

    const img = document.createElement("img");
    img.alt = filename;
    img.draggable = false;
    cover.classList.add("img-loading");
    img.addEventListener("load", () => cover.classList.remove("img-loading"));
    img.addEventListener("error", () => cover.classList.remove("img-loading"));
    if (i === 0) {
      img.src = path;
      img.loading = "eager";
      if (img.complete) cover.classList.remove("img-loading");
    } else {
      img.dataset.src = path;
      img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      img.loading = "lazy";
    }

    const shine = document.createElement("div");
    shine.className = "shine";

    // ✅ NEW: specular highlight layer (must exist for CSS)
    const spec = document.createElement("div");
    spec.className = "spec";

    const label = document.createElement("div");
    label.className = "cover-filename";
    label.textContent = filename;

    cover.appendChild(img);
    cover.appendChild(shine);
    cover.appendChild(spec);
    cover.appendChild(label);

    const tooltip = document.createElement("div");
    tooltip.className = "cover-tooltip";
    tooltip.textContent = filename;
    tooltip.style.display = "none";
    world.appendChild(tooltip);

    cover.addEventListener("mouseenter", () => {
      tooltip.style.left = pos.x + COVER_W / 2 + "px";
      tooltip.style.top = pos.y - 35 + "px";
      tooltip.style.display = "block";
    });
    cover.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });

    cover.addEventListener("focus", () => {
      if (cover.classList.contains("is-active")) return;
      coverImages.forEach(({ img, tooltip: t }) => {
        img.classList.remove("focused");
        img.tabIndex = -1;
        if (t) t.style.display = "none";
      });
      cover.tabIndex = 0;  /* keep this cover as the single tab stop so Tab continues here when returning */
      cover.classList.add("focused");
      tooltip.style.display = "block";
      tooltip.style.left = pos.x + COVER_W / 2 + "px";
      tooltip.style.top = pos.y - 35 + "px";
      viewport.scrollLeft = pos.x + COVER_W / 2 - viewport.clientWidth / 2;
      viewport.scrollTop = pos.y + COVER_H / 2 - viewport.clientHeight / 2;
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
      if (e.key === "Tab") {
        const next = Math.max(idx - 1, 0);  /* Tab alone = previous cover */
        if (next !== idx) {
          e.preventDefault();
          coverImages[next].img.focus();
        }
        return;
      }
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

  /* Preload nearby images via Intersection Observer (viewport is scroll root) */
  const preloadObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const img = e.target.querySelector("img");
      if (!img || !img.dataset.src) continue;
      img.src = img.dataset.src;
      delete img.dataset.src;
      preloadObserver.unobserve(e.target);
    }
  }, { root: viewport, rootMargin: "150%", threshold: 0 });

  coverImages.slice(1).forEach(({ img: cover }) => preloadObserver.observe(cover));
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
  // fallback if not ready
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
      // ignore near-transparent pixels (just in case)
      const a = data[i+3];
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

    // Make glow "feel" like the cover: boost saturation + lift midtones a bit
    const hsl = rgbToHsl(r,g,b);
    const boosted = hslToRgb(hsl.h, clamp(hsl.s * 1.25, 0, 1), clamp(hsl.l * 1.05, 0, 1));

    return boosted;
  } catch (e) {
    // Canvas can throw if image is cross-origin without CORS headers
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

  // NEW: spec highlight follows rx/ry
updateSpecularFromTilt(cover);

applyTransform(cover);
cover._anim = requestAnimationFrame(() => animateActive(cover));

}
/* -------------------------------------------------- */
/* REALISTIC TILT + MICRO Z LIFT */
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
    // ✅ uniform corner toward cursor
    st.trx  = (-ey) * MAX_TILT;
    st.try_ = ( ex) * MAX_TILT;

    // ✅ lift stronger near corners
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

  const MAX_TILT = 24; // must match updateCoverTilt

  // normalize to -1..1
  const nx = clamp(st.ry / MAX_TILT, -1, 1); // left/right tilt
  const ny = clamp(st.rx / MAX_TILT, -1, 1); // up/down tilt

  // ✅ move WITH tilt direction (feels like the light is "attached" to the card)
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

  // expose to CSS if you want: box-shadow: 0 0 90px var(--glow)
  cover.style.setProperty("--glow", `rgba(${r}, ${g}, ${b}, 0.62)`);

  // JS shadow (stronger + layered)
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

  const rect = cover.getBoundingClientRect();

  cover._originalParent = cover.parentNode;
  cover._originalNext = cover.nextSibling;
  cover._originalLeft = cover.style.left;
  cover._originalTop = cover.style.top;
  cover._originalRect = rect;

  // apply glow AFTER rect capture but BEFORE moving is fine
  setArtworkGlow(cover);

  document.body.appendChild(cover);
  cover.classList.add("is-active");
  backdrop.hidden = false;

  cover.style.position = "fixed";
  cover.style.left = rect.left + "px";
  cover.style.top = rect.top + "px";
  cover.style.width = rect.width + "px";
  cover.style.height = rect.height + "px";
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
  const centerX = window.innerWidth / 2 - rect.width / 2;
  const centerY = window.innerHeight / 2 - rect.height / 2;

  const dx = centerX - rect.left;
  const dy = centerY - rect.top;

  activeCover = cover;

  cover._state = {
    // rotation
    rx:0, ry:0, rz:0,
    trx:0, try_:0, trz:0,
  
    // parallax translate
    tx:0, ty:0,
    ttx:0, tty:0,
  
    // lift
    z:0, tz:0,
  
    // positioning
    dx, dy,
    s:scale,
  
    // float
    floatAmp:6,
    floatSpeed:0.003
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
    cover.focus({ preventScroll: false });  /* return focus so Tab/arrows continue from this cover */
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

  cover.addEventListener("click", (e) => {
    if (moved || isPanning) return;
    e.preventDefault();
    e.stopPropagation();
    if (cover.classList.contains("is-active")) closeActive();
    else openActive(cover);
  });
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

viewport.addEventListener("wheel", (e) => {
  if (activeCover) { closeActive(); e.preventDefault(); return; }
  if (e.ctrlKey) return;
  e.preventDefault();
  viewport.scrollLeft += e.deltaX;
  viewport.scrollTop  += e.deltaY;
}, { passive: false });

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

const positions = placeNonOverlapping(covers.length);
renderCovers(positions);
coverImages.forEach(({ img }) => enableCover(img));

const lastIdx = covers.length - 1;
viewport.scrollLeft = positions[lastIdx].x + COVER_W / 2 - viewport.clientWidth / 2;
viewport.scrollTop  = positions[lastIdx].y + COVER_H / 2 - viewport.clientHeight / 2;

/* Hide loading screen after page load AND at least 3 seconds */
let pageLoaded = document.readyState === "complete";
let minTimeElapsed = false;
function maybeHideLoader() {
  if (!loaderScreen || !pageLoaded || !minTimeElapsed) return;
  loaderScreen.classList.add("hidden");
}
setTimeout(() => { minTimeElapsed = true; maybeHideLoader(); }, 2000);
if (pageLoaded) maybeHideLoader();
else window.addEventListener("load", () => { pageLoaded = true; maybeHideLoader(); });
