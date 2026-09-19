const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const translations = {
  en: {
    workspaceLabel: "Workspace", overview: "Overview", addImages: "Add images", savedMeasurements: "Saved measurements",
    settingsLabel: "Settings", preferences: "Preferences", tipTitle: "Quick tip",
    tipText: "Calibrate once, then measure as many times as you like.", readyToMeasure: "READY TO MEASURE",
    heroTitle: "Measure with confidence.", heroSubtitle: "Turn any image into a precise measuring surface.",
    persistentMode: "Persistent mode", persistentHint: "Keep your work saved", uploadImages: "Upload images",
    imageCanvas: "IMAGE CANVAS", canvasHint: "Drag to pan · Scroll to zoom", dropImage: "Drop an image here",
    orBrowse: "or browse from your device", chooseImage: "Choose image", calibration: "CALIBRATION",
    setScale: "Set your scale", set: "Set", calibrationDescription: "Draw a line over a known distance to create your reference.",
    redoCalibration: "Redo calibration", drawReference: "Draw a new reference line", knownDistance: "Known distance",
    currentScale: "Current scale",     measure: "MEASURE", measureAnything: "Measure anything", measurementUnit: "Measurement unit",
    measureDescription: "Draw freely on the image. Your result appears here.", currentMeasurement: "CURRENT MEASUREMENT",
    startMeasuring: "Start measuring", noMeasurements: "No saved measurements yet.",
    shortcut: "Tip: hold space to pan the canvas", localOnly: "Your images stay on your device", privacy: "Privacy"
  },
  fr: {
    workspaceLabel: "Espace de travail", overview: "Vue d’ensemble", addImages: "Ajouter des images", savedMeasurements: "Mesures enregistrées",
    settingsLabel: "Réglages", preferences: "Préférences", tipTitle: "Astuce",
    tipText: "Calibrez une fois, puis mesurez autant de fois que nécessaire.", readyToMeasure: "PRÊT À MESURER",
    heroTitle: "Mesurez en toute confiance.", heroSubtitle: "Transformez chaque image en surface de mesure précise.",
    persistentMode: "Mode persistant", persistentHint: "Conserver votre travail", uploadImages: "Importer des images",
    imageCanvas: "ZONE IMAGE", canvasHint: "Glisser pour déplacer · Molette pour zoomer", dropImage: "Déposez une image ici",
    orBrowse: "ou parcourez votre appareil", chooseImage: "Choisir une image", calibration: "ÉTALONNAGE",
    setScale: "Définir l’échelle", set: "Défini", calibrationDescription: "Tracez une ligne sur une distance connue pour créer votre référence.",
    redoCalibration: "Refaire l’étalonnage", drawReference: "Tracer une nouvelle ligne de référence", knownDistance: "Distance connue",
    currentScale: "Échelle actuelle",     measure: "MESURE", measureAnything: "Mesurez librement", measurementUnit: "Unité de mesure",
    measureDescription: "Tracez sur l’image. Votre résultat apparaîtra ici.", currentMeasurement: "MESURE ACTUELLE",
    startMeasuring: "Commencer à mesurer", noMeasurements: "Aucune mesure enregistrée.",
    shortcut: "Astuce : maintenez Espace pour déplacer la zone", localOnly: "Vos images restent sur votre appareil", privacy: "Confidentialité"
  }
};

const unitToMeters = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };
const unitLabels = { mm: "mm", cm: "cm", m: "m", in: "in", ft: "ft" };
const state = {
  lang: "en",
  unitSystem: "metric",
  displayUnit: "cm",
  persistent: false,
  mode: "pan",
  zoom: 1,
  pan: { x: 0, y: 0 },
  images: [],
  activeImageId: null,
  calibrationLine: null,
  currentLine: null,
  lastMeasurementPixels: null,
  isPanning: false,
  pointerStart: null,
  measurements: []
};

const canvas = $("#measureCanvas");
const ctx = canvas.getContext("2d");
const canvasWrap = $("#canvasWrap");
let toastTimer;

function demoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs><linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dad3ca"/><stop offset="1" stop-color="#b4aaa0"/></linearGradient><linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#9d8371"/><stop offset="1" stop-color="#6c554a"/></linearGradient></defs>
    <rect width="1200" height="800" fill="url(#wall)"/><path d="M0 557L1200 496V800H0z" fill="url(#floor)"/>
    <rect x="110" y="97" width="370" height="335" rx="4" fill="#697b86" stroke="#f6f1ea" stroke-width="15"/><path d="M295 103v326M117 264h356" stroke="#f6f1ea" stroke-width="10"/>
    <rect x="748" y="128" width="291" height="372" rx="3" fill="#c48e62"/><rect x="774" y="157" width="239" height="307" fill="#24383d"/><path d="M887 160v305M777 286h234" stroke="#c2e4e4" stroke-width="4" opacity=".7"/>
    <rect x="510" y="512" width="240" height="26" rx="13" fill="#533e34"/><path d="M549 539l-32 194M714 539l38 194" stroke="#533e34" stroke-width="17"/>
    <circle cx="220" cy="587" r="57" fill="#4d7c5a"/><circle cx="247" cy="550" r="38" fill="#658e65"/><circle cx="184" cy="554" r="33" fill="#789d6a"/><path d="M220 595c18-111 64-151 82-176" stroke="#446846" stroke-width="10" fill="none"/>
    <text x="66" y="740" fill="#f7eee7" opacity=".68" font-family="sans-serif" font-size="19" letter-spacing="4">STUDIO / 04</text>
  </svg>`;
}

function makeImage(file, url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file?.name || "studio-board.svg",
      url,
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      fitScale: 1,
      calibrationLine: null,
      measurements: []
    });
    image.onerror = reject;
    image.src = url;
  });
}

function activeImage() {
  return state.images.find((item) => item.id === state.activeImageId);
}

function savePersistentState() {
  if (!state.persistent) return;
  const image = activeImage();
  if (!image) return;
  localStorage.setItem("measurely-state", JSON.stringify({
    calibrationLine: state.calibrationLine,
    measurements: state.measurements,
    displayUnit: state.displayUnit,
    unitSystem: state.unitSystem,
    imageId: image.id
  }));
}

function loadPersistentState() {
  try {
    const saved = JSON.parse(localStorage.getItem("measurely-state"));
    if (!saved) return;
    state.persistent = true;
    $("#persistentMode").checked = true;
    state.calibrationLine = saved.calibrationLine || null;
    state.measurements = saved.measurements || [];
    state.displayUnit = saved.displayUnit || "cm";
    state.unitSystem = saved.unitSystem || "metric";
    $("#measurementUnit").value = state.displayUnit;
    if (state.images[0]) {
      state.images[0].calibrationLine = state.calibrationLine;
      state.images[0].measurements = state.measurements;
    }
    $("#calibrationUnit").value = state.calibrationLine?.unit || "cm";
  } catch {
    showToast("Saved data could not be loaded.");
  }
}

function resizeCanvas() {
  const rect = canvasWrap.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const image = activeImage();
  if (image) {
    image.fitScale = Math.min((rect.width - 70) / image.width, (rect.height - 70) / image.height);
    draw();
  }
}

function imageTransform(image) {
  const scale = image.fitScale * state.zoom;
  return {
    scale,
    x: canvas.clientWidth / 2 - image.width * scale / 2 + state.pan.x,
    y: canvas.clientHeight / 2 - image.height * scale / 2 + state.pan.y
  };
}

function toImagePoint(point) {
  const image = activeImage();
  if (!image) return point;
  const transform = imageTransform(image);
  return { x: (point.x - transform.x) / transform.scale, y: (point.y - transform.y) / transform.scale };
}

function fromImagePoint(point) {
  const image = activeImage();
  if (!image) return point;
  const transform = imageTransform(image);
  return { x: point.x * transform.scale + transform.x, y: point.y * transform.scale + transform.y };
}

function drawLine(line, color, width = 2, dashed = false) {
  if (!line) return;
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash(dashed ? [6, 5] : []);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.moveTo(line.start.x, line.start.y);
  ctx.lineTo(line.end.x, line.end.y);
  ctx.stroke();
  for (const point of [line.start, line.end]) {
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  const image = activeImage();
  if (!image) return;
  const transform = imageTransform(image);
  ctx.save();
  ctx.shadowColor = "rgba(29,27,45,.17)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(image.image, transform.x, transform.y, image.width * transform.scale, image.height * transform.scale);
  ctx.restore();
  const shownCalibration = state.currentLine && state.mode === "calibration" ? state.currentLine : state.calibrationLine;
  drawLine(shownCalibration, "#7154d9", 2.5, state.mode === "calibration");
  drawLine(state.currentLine && state.mode === "measure" ? state.currentLine : null, "#eb9461", 2.5, false);
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function calibrationPixels() {
  if (!state.calibrationLine) return 0;
  const image = activeImage();
  return distance(toImagePoint(state.calibrationLine.start), toImagePoint(state.calibrationLine.end));
}

function formatValue(value, unit = state.displayUnit) {
  if (!Number.isFinite(value)) return "—";
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals).replace(/\.?0+$/, "")} ${unitLabels[unit]}`;
}

function convertFromCalibration(px, unit = state.displayUnit) {
  const refPx = calibrationPixels();
  if (!state.calibrationLine || !refPx) return null;
  const referenceMeters = Number($("#referenceValue").value) * unitToMeters[$("#calibrationUnit").value];
  return (px / refPx) * referenceMeters / unitToMeters[unit];
}

function refreshScaleText() {
  const pixels = calibrationPixels();
  const value = Number($("#referenceValue").value) || 0;
  const unit = $("#calibrationUnit").value;
  $("#scaleSummary").textContent = pixels ? `${value} ${unit} / ${Math.round(pixels)} px` : "Not calibrated";
  $("#calibrationBadge").innerHTML = pixels ? `✓ <span data-i18n="set">${translations[state.lang].set}</span>` : "—";
  $("#resultUnit").textContent = unitLabels[state.displayUnit];
}

function updateCurrentResult() {
  if (state.lastMeasurementPixels === null || state.lastMeasurementPixels === undefined) {
    $("#resultValue").innerHTML = `— <small id="resultUnit">${unitLabels[state.displayUnit]}</small>`;
    return;
  }
  const value = convertFromCalibration(state.lastMeasurementPixels);
  $("#resultValue").innerHTML = value === null
    ? `— <small id="resultUnit">${unitLabels[state.displayUnit]}</small>`
    : `${formatValue(value, state.displayUnit).split(" ")[0]} <small id="resultUnit">${unitLabels[state.displayUnit]}</small>`;
}

function renderMeasurements() {
  const list = $("#measurementList");
  $("#savedCount").textContent = state.measurements.length;
  if (!state.measurements.length) {
    list.innerHTML = `<div class="list-empty" data-i18n="noMeasurements">${translations[state.lang].noMeasurements}</div>`;
    return;
  }
  list.innerHTML = state.measurements.map((measurement, index) => `
    <div class="measurement-item">
      <span class="measurement-line"></span>
      <span class="measurement-name">${measurement.name || `Measurement ${String(index + 1).padStart(2, "0")}`}</span>
      <strong class="measurement-value">${formatValue(measurement.value, measurement.unit)}</strong>
      <button type="button" class="delete-measurement" data-index="${index}" aria-label="Delete measurement">×</button>
    </div>
  `).join("");
  $$(".delete-measurement").forEach((button) => button.addEventListener("click", () => {
    state.measurements.splice(Number(button.dataset.index), 1);
    renderMeasurements();
    savePersistentState();
  }));
}

function renderThumbnails() {
  const row = $("#thumbnailRow");
  row.innerHTML = state.images.map((image) => `
    <button class="thumbnail ${image.id === state.activeImageId ? "active" : ""}" type="button" data-id="${image.id}" title="${image.name}">
      <img src="${image.url}" alt="" /><span>${image.name}</span>
    </button>
  `).join("") + `<button class="thumbnail add-thumbnail" id="addThumbnail" type="button" title="Add image">＋</button>`;
  $$(".thumbnail[data-id]").forEach((thumbnail) => thumbnail.addEventListener("click", () => setActiveImage(thumbnail.dataset.id)));
  $("#addThumbnail").addEventListener("click", openFilePicker);
  $("#imageCount").textContent = state.images.length;
}

function setActiveImage(id) {
  const previousImage = activeImage();
  if (previousImage && previousImage.id !== id) {
    previousImage.calibrationLine = state.calibrationLine;
    previousImage.measurements = state.measurements;
    savePersistentState();
  }
  state.activeImageId = id;
  state.pan = { x: 0, y: 0 };
  state.zoom = 1;
  state.currentLine = null;
  state.lastMeasurementPixels = null;
  const image = activeImage();
  state.calibrationLine = image.calibrationLine || null;
  state.measurements = image.measurements || [];
  $("#activeImageName").textContent = image.name;
  $("#imageDimensions").textContent = `${image.width} × ${image.height} px`;
  $("#resultValue").innerHTML = `— <small id="resultUnit">${unitLabels[state.displayUnit]}</small>`;
  $("#resultPixels").textContent = "Draw a line to begin";
  $("#zoomRange").value = 100;
  $("#zoomLabel").textContent = "100%";
  renderThumbnails();
  renderMeasurements();
  resizeCanvas();
  refreshScaleText();
  draw();
}

async function addFiles(files) {
  const validFiles = [...files].filter((file) => file.type.startsWith("image/"));
  if (!validFiles.length) return showToast("Please choose an image file.");
  for (const file of validFiles) {
    try {
      const image = await makeImage(file, URL.createObjectURL(file));
      state.images.push(image);
    } catch {
      showToast(`Could not open ${file.name}.`);
    }
  }
  $("#canvasEmpty").hidden = state.images.length > 0;
  if (!state.activeImageId && state.images.length) setActiveImage(state.images[0].id);
  else renderThumbnails();
  showToast(`${validFiles.length} image${validFiles.length > 1 ? "s" : ""} added.`);
}

function openFilePicker() { $("#fileInput").click(); }

function setMode(mode) {
  state.mode = mode;
  state.currentLine = null;
  canvas.style.cursor = mode === "pan" ? "grab" : "crosshair";
  draw();
  if (mode === "calibration") showToast("Draw a line over a known distance.");
  if (mode === "measure") showToast("Draw a measurement line on the image.");
}

function finishLine() {
  if (!state.currentLine || distance(state.currentLine.start, state.currentLine.end) < 5) {
    state.currentLine = null;
    draw();
    return;
  }
  if (state.mode === "calibration") {
    const value = Number($("#referenceValue").value);
    if (!value || value <= 0) {
      showToast("Enter a known distance first.");
      state.currentLine = null;
      draw();
      return;
    }
    state.calibrationLine = state.currentLine;
    activeImage().calibrationLine = state.calibrationLine;
    state.currentLine = null;
    setMode("pan");
    refreshScaleText();
    savePersistentState();
    showToast("Calibration updated.");
  } else if (state.mode === "measure") {
    const pixels = distance(toImagePoint(state.currentLine.start), toImagePoint(state.currentLine.end));
    const value = convertFromCalibration(pixels);
    state.lastMeasurementPixels = pixels;
    updateCurrentResult();
    $("#resultPixels").textContent = `${Math.round(pixels)} px · ${value === null ? "Calibrate to get a real-world result" : "Unsaved measurement"}`;
    if (value !== null) {
      state.measurements.unshift({ name: `Measurement ${String(state.measurements.length + 1).padStart(2, "0")}`, value, unit: state.displayUnit, pixels });
      activeImage().measurements = state.measurements;
      renderMeasurements();
      savePersistentState();
    }
    state.currentLine = null;
    setMode("pan");
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function updateLanguage(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (translations[lang][key]) element.textContent = translations[lang][key];
  });
  $$(".language-button").forEach((button) => button.classList.toggle("active", button.dataset.language === lang));
  $("#measurementUnit").setAttribute("aria-label", translations[lang].measurementUnit);
  renderMeasurements();
  refreshScaleText();
}

function setMeasurementUnit(unit) {
  state.displayUnit = unit;
  state.unitSystem = ["mm", "cm", "m"].includes(unit) ? "metric" : "imperial";
  refreshScaleText();
  updateCurrentResult();
  savePersistentState();
}

canvas.addEventListener("pointerdown", (event) => {
  if (!activeImage()) return;
  canvas.setPointerCapture(event.pointerId);
  const point = pointerPosition(event);
  state.pointerStart = point;
  if (state.mode === "calibration" || state.mode === "measure") {
    state.currentLine = { start: point, end: point };
  } else {
    state.isPanning = true;
    canvas.style.cursor = "grabbing";
  }
});

canvas.addEventListener("pointermove", (event) => {
  const point = pointerPosition(event);
  if (state.currentLine) {
    state.currentLine.end = point;
    if (state.mode === "measure" && state.calibrationLine) {
      const pixels = distance(toImagePoint(state.currentLine.start), toImagePoint(state.currentLine.end));
      const value = convertFromCalibration(pixels);
      if (value !== null) {
        state.lastMeasurementPixels = pixels;
        updateCurrentResult();
        $("#resultPixels").textContent = `${Math.round(pixels)} px · Live preview`;
      }
    }
    draw();
  } else if (state.isPanning && state.pointerStart) {
    state.pan.x += point.x - state.pointerStart.x;
    state.pan.y += point.y - state.pointerStart.y;
    state.pointerStart = point;
    draw();
  }
});

canvas.addEventListener("pointerup", () => {
  if (state.currentLine) finishLine();
  state.isPanning = false;
  state.pointerStart = null;
  if (state.mode === "pan") canvas.style.cursor = "grab";
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const nextZoom = Math.max(.25, Math.min(3, state.zoom + (event.deltaY > 0 ? -.1 : .1)));
  state.zoom = Number(nextZoom.toFixed(2));
  $("#zoomRange").value = Math.round(state.zoom * 100);
  $("#zoomLabel").textContent = `${Math.round(state.zoom * 100)}%`;
  draw();
}, { passive: false });

$("#uploadButton").addEventListener("click", openFilePicker);
$("#emptyUploadButton").addEventListener("click", openFilePicker);
$("#openUploadNav").addEventListener("click", openFilePicker);
$("#fileInput").addEventListener("change", (event) => addFiles(event.target.files));
$("#calibrationButton").addEventListener("click", () => setMode("calibration"));
$("#measureButton").addEventListener("click", () => setMode("measure"));
$("#referenceValue").addEventListener("input", () => { refreshScaleText(); savePersistentState(); });
$("#calibrationUnit").addEventListener("change", () => { refreshScaleText(); savePersistentState(); });
$("#persistentMode").addEventListener("change", (event) => {
  state.persistent = event.target.checked;
  if (state.persistent) {
    savePersistentState();
    showToast("Persistent mode is on.");
  } else {
    localStorage.removeItem("measurely-state");
    showToast("Persistent mode is off.");
  }
});
$("#zoomRange").addEventListener("input", (event) => {
  state.zoom = Number(event.target.value) / 100;
  $("#zoomLabel").textContent = `${event.target.value}%`;
  draw();
});
$("#zoomOut").addEventListener("click", () => { state.zoom = Math.max(.25, state.zoom - .1); $("#zoomRange").value = state.zoom * 100; $("#zoomLabel").textContent = `${Math.round(state.zoom * 100)}%`; draw(); });
$("#zoomIn").addEventListener("click", () => { state.zoom = Math.min(3, state.zoom + .1); $("#zoomRange").value = state.zoom * 100; $("#zoomLabel").textContent = `${Math.round(state.zoom * 100)}%`; draw(); });
$("#fitButton").addEventListener("click", () => { state.zoom = 1; state.pan = { x: 0, y: 0 }; $("#zoomRange").value = 100; $("#zoomLabel").textContent = "100%"; draw(); });
$("#resetButton").addEventListener("click", () => { state.zoom = 1; state.pan = { x: 0, y: 0 }; state.currentLine = null; state.lastMeasurementPixels = null; setMode("pan"); $("#zoomRange").value = 100; $("#zoomLabel").textContent = "100%"; updateCurrentResult(); $("#resultPixels").textContent = "Draw a line to begin"; draw(); });
$$(".language-button").forEach((button) => button.addEventListener("click", () => updateLanguage(button.dataset.language)));
$("#measurementUnit").addEventListener("change", (event) => setMeasurementUnit(event.target.value));
window.addEventListener("resize", resizeCanvas);
canvasWrap.addEventListener("dragover", (event) => { event.preventDefault(); canvasWrap.classList.add("drag-over"); });
canvasWrap.addEventListener("dragleave", () => canvasWrap.classList.remove("drag-over"));
canvasWrap.addEventListener("drop", (event) => { event.preventDefault(); canvasWrap.classList.remove("drag-over"); addFiles(event.dataTransfer.files); });
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && document.activeElement.tagName !== "INPUT") {
    event.preventDefault();
    if (state.mode === "pan") canvas.style.cursor = "grab";
  }
});

(async function init() {
  const demoUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(demoSvg())}`;
  const demo = await makeImage(null, demoUrl);
  state.images = [demo];
  state.activeImageId = demo.id;
  loadPersistentState();
  if (state.persistent && state.images.length) state.activeImageId = state.images[0].id;
  setActiveImage(state.activeImageId);
  renderMeasurements();
  updateLanguage("en");
})();
