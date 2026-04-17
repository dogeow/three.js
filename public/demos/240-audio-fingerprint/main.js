import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('canvas-container');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const controlsDiv = document.getElementById('controls');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const progressFill = document.getElementById('progress-fill');
const timeDisplay = document.getElementById('time-display');

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0a0a0f);
container.appendChild(renderer.domElement);

// Scene & Camera
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 25, 45);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 5;
controls.maxDistance = 120;

// Lighting
scene.add(new THREE.AmbientLight(0x110022, 0.5));
const dirLight = new THREE.DirectionalLight(0x00ffcc, 1.2);
dirLight.position.set(10, 30, 10);
scene.add(dirLight);
const pointLight = new THREE.PointLight(0xff00aa, 2, 80);
pointLight.position.set(-20, 15, -10);
scene.add(pointLight);

// Grid helper
const grid = new THREE.GridHelper(100, 40, 0x003333, 0x001a1a);
scene.add(grid);

// State
let audioContext = null;
let analyserNode = null;
let sourceNode = null;
let audioBuffer = null;
let audioBufferSource = null;
let startTime = 0;
let pauseTime = 0;
let isPlaying = false;

let mesh = null;
let animFrameId = null;

const FREQ_BINS = 128;       // frequency axis
const TIME_SLICES = 256;     // time axis
const TERRAIN_SIZE = 40;

let currentSlice = 0;
let dataHistory = [];        // array of Float32Array (frequency data per slice)

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function getAnalyser() {
  if (!analyserNode) {
    analyserNode = getAudioContext().createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.65;
  }
  return analyserNode;
}

function decodeAudio(arrayBuffer) {
  return getAudioContext().decodeAudioData(arrayBuffer);
}

function buildTerrain(freqData, timeIndex) {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];
  const indices = [];

  const binCount = freqData.length;
  const sliceCount = dataHistory.length;

  // Use accumulated history; if not enough, repeat last
  const sliceData = dataHistory.slice(-TIME_SLICES);
  const actualSlices = sliceData.length;

  // Build vertex grid
  for (let tz = 0; tz <= actualSlices; tz++) {
    for (let fx = 0; fx < binCount; fx++) {
      const dz = (tz / TIME_SLICES) * TERRAIN_SIZE - TERRAIN_SIZE / 2;
      const dx = (fx / binCount) * TERRAIN_SIZE - TERRAIN_SIZE / 2;

      let mag = 0;
      if (tz < sliceData.length) {
        mag = sliceData[tz][fx] || 0;
      }
      const dy = mag * 18;

      vertices.push(dx, dy, dz);

      // Color gradient: cyan -> magenta -> yellow based on height
      const t = Math.min(mag * 4, 1);
      const r = t < 0.5 ? THREE.MathUtils.lerp(0, 1, t * 2) : 1;
      const g = t < 0.5 ? THREE.MathUtils.lerp(0.8, 0, t * 2) : THREE.MathUtils.lerp(0, 0.8, (t - 0.5) * 2);
      const b = t < 0.5 ? THREE.MathUtils.lerp(1, 0, t * 2) : 1;
      colors.push(r, g, b);
    }
  }

  // Build indices for triangles
  const cols = binCount;
  for (let tz = 0; tz < actualSlices; tz++) {
    for (let fx = 0; fx < cols - 1; fx++) {
      const a = tz * cols + fx;
      const b = tz * cols + fx + 1;
      const c = (tz + 1) * cols + fx;
      const d = (tz + 1) * cols + fx + 1;

      if (tz < actualSlices - 1) {
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 80,
    specular: 0x00ffcc,
    emissive: 0x001122,
    wireframe: false,
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
}

function buildRealtimeTerrain(freqData) {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];
  const indices = [];

  const binCount = freqData.length;

  // Rolling window of slices
  const sliceCount = dataHistory.length;
  const maxSlices = TIME_SLICES;

  for (let tz = 0; tz <= maxSlices; tz++) {
    const dataIdx = Math.max(0, sliceCount - maxSlices + tz - 1);
    const slice = dataHistory[dataIdx] || freqData;

    for (let fx = 0; fx < binCount; fx++) {
      const dz = (tz / maxSlices) * TERRAIN_SIZE - TERRAIN_SIZE / 2;
      const dx = (fx / binCount) * TERRAIN_SIZE - TERRAIN_SIZE / 2;

      let mag = 0;
      if (tz > 0 && dataHistory[Math.min(dataIdx, sliceCount - 1)]) {
        const src = dataHistory[Math.min(dataIdx, sliceCount - 1)];
        mag = src[fx] || 0;
      }

      const dy = mag * 18;
      vertices.push(dx, dy, dz);

      const t = Math.min(mag * 4, 1);
      const r = t < 0.5 ? THREE.MathUtils.lerp(0, 1, t * 2) : 1;
      const g = t < 0.5 ? THREE.MathUtils.lerp(0.8, 0, t * 2) : THREE.MathUtils.lerp(0, 0.8, (t - 0.5) * 2);
      const b = t < 0.5 ? THREE.MathUtils.lerp(1, 0, t * 2) : 1;
      colors.push(r, g, b);
    }
  }

  const cols = binCount;
  const rows = maxSlices + 1;
  for (let tz = 0; tz < maxSlices; tz++) {
    for (let fx = 0; fx < cols - 1; fx++) {
      const a = tz * cols + fx;
      const b = tz * cols + fx + 1;
      const c = (tz + 1) * cols + fx;
      const d = (tz + 1) * cols + fx + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 80,
    specular: 0x00ffcc,
    emissive: 0x001122,
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
}

function normalizeFreqData(dataArray) {
  const arr = new Float32Array(dataArray.length);
  const max = Math.max(...dataArray.map(Math.abs));
  for (let i = 0; i < dataArray.length; i++) {
    arr[i] = max > 0 ? dataArray[i] / max : 0;
  }
  return arr;
}

async function loadFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await decodeAudio(arrayBuffer);

  // Build initial fingerprint snapshot
  dataHistory = [];

  // Simulate slices from the audio buffer's overall profile
  // We do a single full-spectrum analysis for the whole buffer
  const ctx = getAudioContext();
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
  const offlineSource = offlineCtx.createBufferSource();
  offlineSource.buffer = audioBuffer;

  const offlineAnalyser = offlineCtx.createAnalyser();
  offlineAnalyser.fftSize = 512;
  offlineSource.connect(offlineAnalyser);
  offlineAnalyser.connect(offlineCtx.destination);
  offlineSource.start();

  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);

  // Chunk audio into slices
  const samplesPerSlice = Math.floor(channelData.length / TIME_SLICES);
  for (let i = 0; i < TIME_SLICES; i++) {
    const slice = channelData.slice(i * samplesPerSlice, (i + 1) * samplesPerSlice);
    const freqData = computeSimpleSpectrum(slice);
    dataHistory.push(normalizeFreqData(freqData));
  }

  buildTerrain(dataHistory[0] || new Float32Array(FREQ_BINS).fill(0), 0);

  dropZone.classList.add('hidden');
  controlsDiv.style.display = 'flex';

  const duration = audioBuffer.duration;
  playBtn.disabled = false;
  pauseBtn.disabled = true;

  updateTimeDisplay(0, duration);

  startAudio();
}

function computeSimpleSpectrum(samples) {
  const N = 256; // FFT size
  const real = new Float32Array(N);
  const imag = new Float32Array(N);

  // Apply Hanning window
  for (let i = 0; i < N && i < samples.length; i++) {
    const win = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
    real[i] = (samples[i] || 0) * win;
  }

  // DFT (simplified for demo — in production use native FFT via AnalyserNode)
  const mag = new Float32Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      re += real[n] * Math.cos(angle);
      im += real[n] * Math.sin(angle);
    }
    mag[k] = Math.sqrt(re * re + im * im) / N;
  }

  // Downsample to FREQ_BINS
  const result = new Float32Array(FREQ_BINS);
  const binStep = (N / 2) / FREQ_BINS;
  for (let i = 0; i < FREQ_BINS; i++) {
    const start = Math.floor(i * binStep);
    const end = Math.floor((i + 1) * binStep);
    let sum = 0;
    for (let j = start; j < end; j++) sum += mag[j];
    result[i] = sum / (end - start || 1);
  }

  return result;
}

function startAudio() {
  if (audioBufferSource) {
    audioBufferSource.stop();
    audioBufferSource.disconnect();
  }

  audioBufferSource = audioContext.createBufferSource();
  audioBufferSource.buffer = audioBuffer;

  const analyser = getAnalyser();
  analyser.fftSize = 512;

  audioBufferSource.connect(analyser);
  analyser.connect(audioContext.destination);

  audioBufferSource.start(0, pauseTime);
  startTime = audioContext.currentTime - pauseTime;
  isPlaying = true;

  playBtn.disabled = true;
  pauseBtn.disabled = false;

  audioBufferSource.onended = () => {
    if (isPlaying) {
      isPlaying = false;
      pauseTime = 0;
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      progressFill.style.width = '0%';
      updateTimeDisplay(0, audioBuffer.duration);
    }
  };

  animate();
}

function pauseAudio() {
  if (!isPlaying) return;
  audioBufferSource.stop();
  pauseTime = audioContext.currentTime - startTime;
  isPlaying = false;
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  cancelAnimationFrame(animFrameId);
}

function animate() {
  if (!isPlaying) return;
  animFrameId = requestAnimationFrame(animate);

  const analyser = getAnalyser();
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  // Downsample to FREQ_BINS
  const freqData = new Float32Array(FREQ_BINS);
  const step = Math.floor(bufferLength / FREQ_BINS);
  for (let i = 0; i < FREQ_BINS; i++) {
    freqData[i] = (dataArray[i * step] || 0) / 255;
  }

  // Push to history
  dataHistory.push(freqData);
  if (dataHistory.length > TIME_SLICES + 10) {
    dataHistory.shift();
  }

  buildRealtimeTerrain(freqData);

  // Update progress
  const currentTime = audioContext.currentTime - startTime;
  const duration = audioBuffer.duration;
  const progress = Math.min(currentTime / duration, 1);
  progressFill.style.width = (progress * 100) + '%';
  updateTimeDisplay(currentTime, duration);

  controls.update();
  renderer.render(scene, camera);
}

function updateTimeDisplay(current, total) {
  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };
  timeDisplay.textContent = `${fmt(current)} / ${fmt(total)}`;
}

// Drag & drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('audio/')) {
    loadFile(file);
  }
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) loadFile(file);
});

playBtn.addEventListener('click', startAudio);
pauseBtn.addEventListener('click', pauseAudio);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initial render
function renderLoop() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}
renderLoop();