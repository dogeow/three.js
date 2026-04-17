import * as THREE from 'three';
import { GUI } from 'lil-gui';

const params = {
  fftSize: 2048,
  smoothing: 0.8,
  barCount: 64,
  rotationSpeed: 0.3,
  colorMode: 'spectrum', // 'spectrum' | 'rainbow' | 'mono'
};

let scene, camera, renderer, bars = [], animId;
let audioContext, analyser, sourceNode, gainNode;
let audioBuffer = null;
let isPlaying = false;
let currentBarCount = params.barCount;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 25);
  camera.lookAt(0, 2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // Fog
  scene.fog = new THREE.FogExp2(0x050510, 0.02);

  buildBars(params.barCount);

  const gui = new GUI();
  gui.add(params, 'fftSize', [256, 512, 1024, 2048, 4096]).name('FFT Size').onChange(v => {
    if (analyser) analyser.fftSize = v;
  });
  gui.add(params, 'smoothing', 0, 0.99, 0.01).name('Smoothing').onChange(v => {
    if (analyser) analyser.smoothingTimeConstant = v;
  });
  gui.add(params, 'barCount', 8, 128, 1).name('Bar Count').onChange(v => {
    rebuildBars(Math.round(v));
  });
  gui.add(params, 'rotationSpeed', 0, 2, 0.01).name('Rotation Speed');
  gui.add(params, 'colorMode', ['spectrum', 'rainbow', 'mono']).name('Color Mode').onChange(() => {
    updateBarColors();
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

function buildBars(count) {
  const totalWidth = count * 0.4;
  const geometry = new THREE.BoxGeometry(0.32, 1, 0.32);

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.x = i * 0.4 - totalWidth / 2 + 0.2;
    mesh.position.y = 0.5;
    mesh.position.z = 0;
    mesh.scale.y = 0.01;
    mesh.userData.currentHeight = 0.01;
    mesh.userData.targetHeight = 0.01;
    bars.push(mesh);
    scene.add(mesh);
  }

  // Floor grid
  const grid = new THREE.GridHelper(totalWidth + 4, count, 0x222244, 0x111122);
  grid.position.y = 0;
  scene.add(grid);
}

function rebuildBars(count) {
  bars.forEach(b => scene.remove(b));
  bars = [];
  currentBarCount = count;
  buildBars(count);
}

function updateBarColors() {
  const count = bars.length;
  bars.forEach((bar, i) => {
    const t = i / (count - 1);
    bar.material.color.set(getColor(t));
  });
}

function getColor(t) {
  if (params.colorMode === 'spectrum') {
    // low=red, mid=green, high=blue
    if (t < 0.5) {
      return new THREE.Color().setRGB(1, t * 2, 0);
    } else {
      return new THREE.Color().setRGB(0, 1 - (t - 0.5) * 2, (t - 0.5) * 2);
    }
  } else if (params.colorMode === 'rainbow') {
    return new THREE.Color().setHSL(t, 1, 0.5);
  } else {
    return new THREE.Color().setRGB(0.3, 0.8, 1);
  }
}

function animate() {
  animId = requestAnimationFrame(animate);
  const time = performance.now() * 0.001;

  // Rotate camera
  const radius = 28;
  camera.position.x = Math.sin(time * params.rotationSpeed) * radius;
  camera.position.z = Math.cos(time * params.rotationSpeed) * radius;
  camera.position.y = 10 + Math.sin(time * 0.2) * 2;
  camera.lookAt(0, 2, 0);

  if (analyser) {
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    const count = bars.length;
    const step = Math.floor(freqData.length / 2 / count);

    bars.forEach((bar, i) => {
      let sum = 0;
      const start = i * step;
      for (let j = 0; j < step; j++) {
        sum += freqData[start + j] || 0;
      }
      const avg = sum / step;
      const targetHeight = Math.max(0.01, (avg / 255) * 15);

      bar.userData.currentHeight += (targetHeight - bar.userData.currentHeight) * 0.2;
      bar.scale.y = bar.userData.currentHeight;
      bar.position.y = bar.userData.currentHeight / 2;

      const t = i / (count - 1);
      bar.material.color.set(getColor(t));
    });
  }

  renderer.render(scene, camera);
}

// Audio
async function startMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = params.fftSize;
    analyser.smoothingTimeConstant = params.smoothing;
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1;
    sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(audioContext.destination);
    hideOverlay();
  } catch (e) {
    showError('Microphone access denied. Please allow microphone permission and try again.');
  }
}

function loadAudioFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      if (!audioContext) audioContext = new AudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      audioBuffer = await audioContext.decodeAudioData(e.target.result);
      document.getElementById('play-file').disabled = false;
      document.getElementById('error-msg').style.display = 'none';
    } catch (err) {
      showError('Could not decode audio file. Please try a different file.');
    }
  };
  reader.readAsArrayBuffer(file);
}

function playFile() {
  if (!audioBuffer) return;
  if (sourceNode) { sourceNode.stop(); sourceNode.disconnect(); }
  if (gainNode) gainNode.disconnect();
  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = params.fftSize;
    analyser.smoothingTimeConstant = params.smoothing;
  }
  gainNode = audioContext.createGain();
  gainNode.gain.value = 1;
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.loop = true;
  sourceNode.connect(analyser);
  analyser.connect(gainNode);
  gainNode.connect(audioContext.destination);
  sourceNode.start();
  isPlaying = true;
  hideOverlay();
}

function hideOverlay() {
  document.getElementById('overlay').style.display = 'none';
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.style.display = 'block';
}

// UI
document.getElementById('src-mic').addEventListener('change', () => {
  document.getElementById('mic-section').style.display = 'block';
  document.getElementById('file-section').style.display = 'none';
});
document.getElementById('src-file').addEventListener('change', () => {
  document.getElementById('mic-section').style.display = 'none';
  document.getElementById('file-section').style.display = 'block';
});

document.getElementById('start-mic').addEventListener('click', startMic);

document.getElementById('audio-file').addEventListener('change', (e) => {
  if (e.target.files[0]) loadAudioFile(e.target.files[0]);
});

document.getElementById('play-file').addEventListener('click', playFile);

init();