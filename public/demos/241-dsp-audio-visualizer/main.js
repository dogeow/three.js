import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─────────────────────────────────────────────
//  AUDIO ENGINE
// ─────────────────────────────────────────────
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.audioElement = null;
    this.frequencyData = null;
    this.waveformData = null;
    this.isPlaying = false;
    this.fftSize = 2048;
  }

  _init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.78;
    this.analyser.connect(this.ctx.destination);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveformData = new Uint8Array(this.analyser.fftSize);
  }

  async loadFile(file) {
    this._init();
    if (this.audioElement) {
      this.audioElement.pause();
      URL.revokeObjectURL(this.audioElement.src);
    }
    const url = URL.createObjectURL(file);
    this.audioElement = new Audio(url);
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;

    if (this.source) this.source.disconnect();
    this.source = this.ctx.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);

    this.isPlaying = false;
    await this.audioElement.play();
    this.isPlaying = true;
  }

  async useMicrophone() {
    this._init();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (this.source) this.source.disconnect();
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement = null;
      }
      this.source = this.ctx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.isPlaying = true;
    } catch (e) {
      console.error('Microphone access denied:', e);
    }
  }

  playPause() {
    if (!this.audioElement) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    } else {
      this.audioElement.play();
      this.isPlaying = true;
    }
  }

  getFrequencyData() {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  getWaveformData() {
    if (!this.analyser) return null;
    this.analyser.getByteTimeDomainData(this.waveformData);
    return this.waveformData;
  }

  getByteFrequencyDataNormalized(numBins) {
    const raw = this.getFrequencyData();
    if (!raw) return new Float32Array(numBins).fill(0);
    const step = Math.floor(raw.length / numBins);
    const out = new Float32Array(numBins);
    for (let i = 0; i < numBins; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += raw[i * step + j];
      }
      out[i] = (sum / step) / 255;
    }
    return out;
  }
}

// ─────────────────────────────────────────────
//  COLOR UTILITIES
// ─────────────────────────────────────────────
function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return parseInt(toHex(r) + toHex(g) + toHex(b), 16);
}

function lerpColor(a, b, t) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t);
}

// ─────────────────────────────────────────────
//  THREE.JS SCENE SETUP
// ─────────────────────────────────────────────
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.FogExp2(0x050508, 0.04);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 6, 22);
camera.lookAt(0, 0, 0);

const clock = new THREE.Clock();

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2, 0.5, 0.15
);
composer.addPass(bloomPass);

// Lights
const ambientLight = new THREE.AmbientLight(0x101020, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// ─────────────────────────────────────────────
//  PARAMETERS
// ─────────────────────────────────────────────
const NUM_BARS = 64;
const params = {
  mode: 'Bars',
  smoothing: 0.78,
  barSpacing: 0.18,
  barDepth: 0.9,
  colorLow: '#00ffaa',
  colorMid: '#aa44ff',
  colorHigh: '#ff3366',
  colorWave: '#44aaff',
  bloomStrength: 1.2,
  bloomRadius: 0.5,
  bloomThreshold: 0.15,
  pulseIntensity: 1.0,
  surfaceHeight: 4.0,
  circularRadius: 9,
  rotationSpeed: 0.3,
  waveformThickness: 0.08,
};

// ─────────────────────────────────────────────
//  GEOMETRY GROUPS
// ─────────────────────────────────────────────
const barsGroup = new THREE.Group();
const waveformGroup = new THREE.Group();
const circularGroup = new THREE.Group();
const surfaceGroup = new THREE.Group();

scene.add(barsGroup, waveformGroup, circularGroup, surfaceGroup);

// ─── BAR VISUALIZER ───
const barMeshes = [];
const barGeo = new THREE.BoxGeometry(1, 1, 1);
const barMats = [];

for (let i = 0; i < NUM_BARS; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ffaa,
    emissive: 0x00ffaa,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.6,
  });
  const mesh = new THREE.Mesh(barGeo, mat);
  const t = i / (NUM_BARS - 1);
  mesh.position.x = (t - 0.5) * (NUM_BARS * params.barSpacing);
  mesh.scale.set(0.85, 0.05, params.barDepth);
  barsGroup.add(mesh);
  barMeshes.push(mesh);
  barMats.push(mat);
}

// ─── WAVEFORM LINE ───
const waveLineCount = 5;
const waveLines = [];
for (let w = 0; w < waveLineCount; w++) {
  const pts = [];
  for (let i = 0; i < 256; i++) pts.push(new THREE.Vector3((i / 255 - 0.5) * 26, 0, 0));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: 0x44aaff,
    transparent: true,
    opacity: 0.7 - w * 0.12,
  });
  const line = new THREE.Line(geo, mat);
  line.position.z = (w - waveLineCount / 2) * 0.35;
  line.position.y = -1.5;
  waveformGroup.add(line);
  waveLines.push({ line, basePts: pts.slice() });
}

// ─── CIRCULAR SPECTRUM ───
const circGeo = new THREE.TorusGeometry(params.circularRadius, 0.04, 8, NUM_BARS);
const circMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xaa44ff,
  emissiveIntensity: 0.8,
  roughness: 0.2,
  metalness: 0.8,
});
const circMesh = new THREE.Mesh(circGeo, circMat);
circularGroup.add(circMesh);

// Radial bars inside circle
const radBarCount = NUM_BARS;
const radBars = [];
const radBarGeo = new THREE.BoxGeometry(0.12, 1, 0.12);
for (let i = 0; i < radBarCount; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xaa44ff,
    emissive: 0xaa44ff,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.5,
  });
  const m = new THREE.Mesh(radBarGeo, mat);
  radBars.push(m);
  circularGroup.add(m);
}

// ─── 3D SURFACE ───
const surfXSegs = 48;
const surfZSegs = 48;
const surfGeo = new THREE.PlaneGeometry(22, 14, surfXSegs, surfZSegs);
surfGeo.rotateX(-Math.PI / 2);
const surfMat = new THREE.MeshStandardMaterial({
  color: 0x0066ff,
  emissive: 0x002244,
  emissiveIntensity: 0.5,
  wireframe: true,
  roughness: 0.8,
  metalness: 0.2,
});
const surfMesh = new THREE.Mesh(surfGeo, surfMat);
surfMesh.position.y = -3;
surfaceGroup.add(surfMesh);

// ─── GROUND GRID ───
const gridHelper = new THREE.GridHelper(40, 40, 0x111122, 0x0a0a18);
gridHelper.position.y = -4;
scene.add(gridHelper);

// ─────────────────────────────────────────────
//  AUDIO ENGINE INSTANCE
// ─────────────────────────────────────────────
const audio = new AudioEngine();

// ─────────────────────────────────────────────
//  SMOOTHED DATA
// ─────────────────────────────────────────────
let smoothData = new Float32Array(NUM_BARS).fill(0);
let prevSmoothData = new Float32Array(NUM_BARS).fill(0);

// ─────────────────────────────────────────────
//  COLOR BAND LOGIC
// ─────────────────────────────────────────────
function getBandColor(band, lowHex, midHex, highHex) {
  const c1 = new THREE.Color(lowHex);
  const c2 = new THREE.Color(midHex);
  const c3 = new THREE.Color(highHex);
  if (band < 0.5) return c1.clone().lerp(c2, band * 2);
  return c2.clone().lerp(c3, (band - 0.5) * 2);
}

// ─────────────────────────────────────────────
//  VISUALIZATION UPDATE
// ─────────────────────────────────────────────
function updateBars(freq, t) {
  barsGroup.visible = true;
  waveformGroup.visible = false;
  circularGroup.visible = false;
  surfaceGroup.visible = false;

  const colorLow = params.colorLow;
  const colorMid = params.colorMid;
  const colorHigh = params.colorHigh;

  for (let i = 0; i < NUM_BARS; i++) {
    const target = freq[i];
    smoothData[i] = smoothData[i] * params.smoothing + target * (1 - params.smoothing);
    const val = smoothData[i];
    const height = Math.max(0.05, val * 8 * params.pulseIntensity);
    const band = i / (NUM_BARS - 1);
    const col = getBandColor(band, colorLow, colorMid, colorHigh);
    barMeshes[i].scale.y = height;
    barMeshes[i].position.y = height / 2 - 1.5;
    barMats[i].color.copy(col);
    barMats[i].emissive.copy(col);
    barMats[i].emissiveIntensity = 0.3 + val * 1.2;
  }
}

function updateWaveform(freq, wave, t) {
  barsGroup.visible = false;
  waveformGroup.visible = true;
  circularGroup.visible = false;
  surfaceGroup.visible = false;

  const waveFreq = freq || new Float32Array(NUM_BARS).fill(0);
  const waveTime = wave || new Uint8Array(256).fill(128);

  // Map frequency to line y-offset
  const fStep = Math.floor(waveFreq.length / 5);
  for (let w = 0; w < waveLines.length; w++) {
    const pts = waveLines[w].line.geometry.attributes.position.array;
    const waveCount = pts.length / 3;
    for (let i = 0; i < waveCount; i++) {
      const vi = Math.floor(i * waveTime.length / waveCount);
      const sample = (waveTime[vi] - 128) / 128;
      const fi = Math.min(Math.floor(i * fStep / waveCount), waveFreq.length - 1);
      const freqAmp = waveFreq[fi] || 0;
      pts[i * 3 + 1] = sample * 3 * params.pulseIntensity + freqAmp * 1.5;
    }
    waveLines[w].line.geometry.attributes.position.needsUpdate = true;
  }
}

function updateCircular(freq, t) {
  barsGroup.visible = false;
  waveformGroup.visible = false;
  circularGroup.visible = true;
  surfaceGroup.visible = false;

  circMesh.rotation.z = t * params.rotationSpeed;

  for (let i = 0; i < radBarCount; i++) {
    const fi = Math.floor(i * freq.length / radBarCount);
    const val = freq[fi] || 0;
    const angle = (i / radBarCount) * Math.PI * 2 + t * params.rotationSpeed;
    const barHeight = Math.max(0.05, val * 5 * params.pulseIntensity);
    radBars[i].scale.y = barHeight;
    radBars[i].position.x = Math.cos(angle) * (params.circularRadius + barHeight / 2);
    radBars[i].position.z = Math.sin(angle) * (params.circularRadius + barHeight / 2);
    radBars[i].position.y = 0;
    radBars[i].rotation.y = -angle;
    const band = i / (radBarCount - 1);
    const col = getBandColor(band, params.colorLow, params.colorMid, params.colorHigh);
    radBars[i].material.color.copy(col);
    radBars[i].material.emissive.copy(col);
    radBars[i].material.emissiveIntensity = 0.3 + val * 1.5;
  }
}

function updateSurface(freq, t) {
  barsGroup.visible = false;
  waveformGroup.visible = false;
  circularGroup.visible = false;
  surfaceGroup.visible = true;

  const pos = surfGeo.attributes.position.array;
  const xCount = surfXSegs + 1;
  const zCount = surfZSegs + 1;

  for (let ix = 0; ix < xCount; ix++) {
    for (let iz = 0; iz < zCount; iz++) {
      const idx = ix * zCount + iz;
      const px = pos[idx * 3 + 0];
      const pz = pos[idx * 3 + 2];

      // Map position to frequency bin
      const normX = (px + 11) / 22;
      const normZ = (pz + 7) / 14;
      const fIdx = Math.min(Math.floor((normX * 0.6 + normZ * 0.4) * freq.length), freq.length - 1);
      const amp = freq[fIdx] || 0;

      // Wave animation
      const wave = Math.sin(normX * 4 + t * 1.5) * Math.cos(normZ * 3 + t * 1.2) * 0.3;
      const height = amp * params.surfaceHeight * params.pulseIntensity + wave;

      pos[idx * 3 + 1] = height;
    }
  }

  surfGeo.attributes.position.needsUpdate = true;
  surfGeo.computeVertexNormals();

  // Color surface based on avg amplitude
  const avg = freq.reduce((s, v) => s + v, 0) / freq.length;
  const col = new THREE.Color(params.colorMid).lerp(new THREE.Color(params.colorHigh), avg);
  surfMat.emissive.copy(col);
  surfMat.emissiveIntensity = avg * 1.5;
}

function updateVisualization(freq, wave, t) {
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;
  bloomPass.threshold = params.bloomThreshold;

  switch (params.mode) {
    case 'Bars':     updateBars(freq, t); break;
    case 'Waveform': updateWaveform(freq, wave, t); break;
    case 'Circular': updateCircular(freq, t); break;
    case 'Surface':  updateSurface(freq, t); break;
  }
}

// ─────────────────────────────────────────────
//  CAMERA AUTO-ORBIT
// ─────────────────────────────────────────────
let cameraAngle = 0;
const CAMERA_RADIUS = 22;

function updateCamera(t, mode) {
  cameraAngle += 0.0015 * (params.rotationSpeed / 0.3);
  const baseY = mode === 'Surface' ? 10 : 6;
  const baseR = mode === 'Surface' ? 28 : CAMERA_RADIUS;

  camera.position.x = Math.sin(cameraAngle) * baseR;
  camera.position.z = Math.cos(cameraAngle) * baseR;
  camera.position.y = baseY + Math.sin(t * 0.3) * 1.5;
  camera.lookAt(0, mode === 'Surface' ? -1 : 0, 0);
}

// ─────────────────────────────────────────────
//  RENDER LOOP
// ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  const freq = audio.getByteFrequencyDataNormalized(NUM_BARS);
  const wave = audio.getWaveformData();

  updateVisualization(freq, wave, t);
  updateCamera(t, params.mode);

  composer.render();
}

// ─────────────────────────────────────────────
//  GUI
// ─────────────────────────────────────────────
const gui = new GUI({ title: 'DSP Visualizer', width: 240 });
gui.domElement.style.position = 'fixed';
gui.domElement.style.top = '18px';
gui.domElement.style.right = '18px';

const visFolder = gui.addFolder('Visualization');
visFolder.add(params, 'mode', ['Bars', 'Waveform', 'Circular', 'Surface']).name('Mode').onChange(v => {
  document.getElementById('mode-badge').textContent = v;
  document.getElementById('info-mode').textContent = v;
  barsGroup.visible = false; waveformGroup.visible = false;
  circularGroup.visible = false; surfaceGroup.visible = false;
});
visFolder.open();

const styleFolder = gui.addFolder('Style');
styleFolder.addColor(params, 'colorLow').name('Color · Low');
styleFolder.addColor(params, 'colorMid').name('Color · Mid');
styleFolder.addColor(params, 'colorHigh').name('Color · High');
styleFolder.add(params, 'pulseIntensity', 0.1, 3.0, 0.05).name('Pulse');
styleFolder.open();

const geoFolder = gui.addFolder('Geometry');
geoFolder.add(params, 'barSpacing', 0.1, 0.6, 0.02).name('Bar Spacing');
geoFolder.add(params, 'barDepth', 0.2, 3.0, 0.1).name('Bar Depth');
geoFolder.add(params, 'surfaceHeight', 1, 10, 0.5).name('Surface Height');
geoFolder.add(params, 'circularRadius', 4, 18, 0.5).name('Circular Radius');
geoFolder.open();

const bloomFolder = gui.addFolder('Post-Processing');
bloomFolder.add(params, 'bloomStrength', 0, 3, 0.05).name('Bloom Strength');
bloomFolder.add(params, 'bloomRadius', 0, 1, 0.05).name('Bloom Radius');
bloomFolder.add(params, 'bloomThreshold', 0, 1, 0.05).name('Bloom Threshold');
bloomFolder.open();

const audioFolder = gui.addFolder('Audio');
audioFolder.add(params, 'smoothing', 0.0, 0.99, 0.01).name('Smoothing');
audioFolder.open();

// ─────────────────────────────────────────────
//  UI INTERACTIONS
// ─────────────────────────────────────────────
document.getElementById('btn-file').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await audio.loadFile(file);
  document.getElementById('info-source').textContent = file.name.length > 22
    ? file.name.slice(0, 22) + '…'
    : file.name;
  document.getElementById('info-bins').textContent = `${audio.analyser.frequencyBinCount}`;
});

document.getElementById('btn-mic').addEventListener('click', async () => {
  const btn = document.getElementById('btn-mic');
  btn.classList.toggle('active');
  if (btn.classList.contains('active')) {
    await audio.useMicrophone();
    document.getElementById('info-source').textContent = 'Microphone';
    document.getElementById('info-bins').textContent = `${audio.analyser.frequencyBinCount}`;
  } else {
    if (audio.source && audio.source.mediaStream) {
      audio.source.mediaStream.getTracks().forEach(t => t.stop());
    }
    document.getElementById('info-source').textContent = 'None';
  }
});

document.getElementById('btn-playpause').addEventListener('click', () => {
  audio.playPause();
});

// ─────────────────────────────────────────────
//  RESIZE HANDLER
// ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ─────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────
const loader = document.getElementById('loader');
setTimeout(() => {
  loader.classList.add('hidden');
  setTimeout(() => loader.remove(), 600);
}, 400);

animate();