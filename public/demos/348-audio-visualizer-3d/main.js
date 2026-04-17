import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0a0a0f);
document.body.appendChild(renderer.domElement);

// ── Scene & Camera ───────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 12, 28);

// ── Controls ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 80;

// ── Lights ───────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x222244, 1.0));
const dirLight = new THREE.DirectionalLight(0x8888ff, 0.6);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// ── Params ───────────────────────────────────────────────────────────────────
const params = {
  barCount:      64,
  spacing:       0.42,
  heightScale:   18,
  colorMode:     'rainbow',
  rotationSpeed: 0.004,
};

// ── Bars ─────────────────────────────────────────────────────────────────────
const bars = [];
let barGroup = new THREE.Group();
scene.add(barGroup);

const normalMat  = new THREE.MeshPhongMaterial({ vertexColors: false, transparent: true, opacity: 0.88 });
const shadowMat  = new THREE.MeshPhongMaterial({ color: 0x080814, transparent: true, opacity: 0.55 });

function rainbowColor(t) {
  const c = new THREE.Color();
  c.setHSL(((t * 237) % 360) / 360, 0.9, 0.58);
  return c;
}

function buildBars() {
  // Remove old children
  while (barGroup.children.length) barGroup.remove(barGroup.children[0]);
  bars.length = 0;

  const count = params.barCount;

  for (let i = 0; i < count; i++) {
    const angle  = (i / count) * Math.PI * 2;
    const radius = 7;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Shadow disc
    const sGeo  = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 8);
    const sMesh = new THREE.Mesh(sGeo, shadowMat);
    sMesh.position.set(x, -0.04, z);
    barGroup.add(sMesh);

    // Bar
    const geo  = new THREE.CylinderGeometry(0.22, 0.26, 1, 8);
    const mat  = normalMat.clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);
    mesh.userData.baseAngle = angle;
    mesh.userData.radius    = radius;
    mesh.userData.index     = i;
    barGroup.add(mesh);
    bars.push(mesh);
  }

  barGroup.rotation.y = 0;
}

buildBars();

// ── Floor grid ───────────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(30, 30, 0x222244, 0x111122);
gridHelper.position.y = -0.06;
scene.add(gridHelper);

// ── GUI ──────────────────────────────────────────────────────────────────────
const gui = new GUI();
gui.add(params, 'barCount',      8,  256, 1).name('Bar Count').onChange(buildBars);
gui.add(params, 'spacing',      0.1,   2, 0.01).name('Spacing');
gui.add(params, 'heightScale',   1,   40, 0.5).name('Height Scale');
gui.add(params, 'colorMode',   ['rainbow', 'monochrome']).name('Color Mode');
gui.add(params, 'rotationSpeed', 0, 0.03, 0.0005).name('Rotation Speed');

// ── Audio ────────────────────────────────────────────────────────────────────
let audioCtx   = null;
let analyser   = null;
let sourceNode = null;
let dataArray  = null;
let isPlaying  = false;
let micStream  = null;
let audioBuffer = null;
let startTime   = 0;
let pauseTime   = 0;

const statusEl  = document.getElementById('status');
const playBtn   = document.getElementById('playBtn');
const micBtn    = document.getElementById('micBtn');

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function loadFile(file) {
  initAudioContext();
  if (sourceNode) { try { sourceNode.stop(); } catch(e){} sourceNode.disconnect(); }
  const reader = new FileReader();
  reader.onload = async e => {
    audioBuffer = await audioCtx.decodeAudioData(e.target.result);
    pauseTime = 0;
    playBuffer();
    isPlaying = true;
    playBtn.textContent = 'Pause';
    playBtn.disabled = false;
    statusEl.textContent = 'Playing: ' + file.name;
  };
  reader.readAsArrayBuffer(file);
}

function playBuffer() {
  if (!audioBuffer) return;
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(analyser);
  sourceNode.start(0, pauseTime);
  sourceNode.onended = () => {
    if (isPlaying) {
      isPlaying = false;
      playBtn.textContent = 'Play';
      pauseTime = 0;
      statusEl.textContent = 'Load a file or enable microphone';
    }
  };
  startTime = audioCtx.currentTime - pauseTime;
}

function togglePlay() {
  if (!audioBuffer) return;
  initAudioContext();
  if (isPlaying) {
    sourceNode.stop();
    pauseTime = audioCtx.currentTime - startTime;
    isPlaying = false;
    playBtn.textContent = 'Play';
  } else {
    playBuffer();
    isPlaying = true;
    playBtn.textContent = 'Pause';
  }
}

document.getElementById('audioFile').addEventListener('change', e => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

playBtn.addEventListener('click', togglePlay);

micBtn.addEventListener('click', async () => {
  initAudioContext();
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    micBtn.textContent = 'Enable Microphone';
    if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
    statusEl.textContent = 'Microphone off';
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    sourceNode = audioCtx.createMediaStreamSource(micStream);
    sourceNode.connect(analyser);
    isPlaying = true;
    playBtn.disabled = true;
    micBtn.textContent = 'Disable Microphone';
    statusEl.textContent = 'Microphone active';
  } catch (err) {
    statusEl.textContent = 'Microphone error: ' + err.message;
  }
});

// ── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animation ────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  if (analyser && isPlaying) {
    analyser.getByteFrequencyData(dataArray);
  }

  const totalBars  = bars.length;
  const binCount   = dataArray ? dataArray.length : 0;
  const spacing    = params.spacing;
  const hScale     = params.heightScale;

  for (let i = 0; i < totalBars; i++) {
    const bar   = bars[i];
    const angle = bar.userData.baseAngle;
    const rad   = bar.userData.radius;

    // Sample frequency data
    let avg = 0;
    if (dataArray && binCount > 0) {
      const t   = i / totalBars;
      const idx = Math.floor(t * binCount * 0.72);
      avg = dataArray[idx] / 255.0;
    }

    const targetH = Math.max(0.08, avg * hScale);

    // Smooth interpolation
    const curH = bar.scale.y;
    bar.scale.y += (targetH - curH) * 0.18;
    bar.position.y = bar.scale.y * 0.5;

    // Update color
    if (params.colorMode === 'rainbow') {
      bar.material.color.copy(rainbowColor(i / totalBars + avg * 0.25));
      bar.material.emissive = bar.material.color.clone().multiplyScalar(0.35);
      bar.material.opacity  = 0.82 + avg * 0.18;
    } else {
      const l = 0.15 + avg * 0.65;
      bar.material.color.setHSL(0.68, 0.5, l);
      bar.material.emissive = new THREE.Color(0.04, 0.04, 0.18);
      bar.material.opacity  = 0.75 + avg * 0.25;
    }

    // Glow via emissive + additive blending hint
    bar.material.emissiveIntensity = 0.6 + avg * 1.4;

    // Reposition based on spacing
    barGroup.rotation.y = (barGroup.rotation.y % (Math.PI * 2));
    const rotatedAngle = angle + barGroup.rotation.y;
    bar.position.x = Math.cos(rotatedAngle) * rad * (spacing / 0.42);
    bar.position.z = Math.sin(rotatedAngle) * rad * (spacing / 0.42);
  }

  // Auto-rotate
  barGroup.rotation.y += params.rotationSpeed;

  controls.update();
  renderer.render(scene, camera);
}

// Enable additive blending glow for bars
bars.forEach(b => {
  b.material.transparent = true;
  b.material.depthWrite  = false;
});

animate();