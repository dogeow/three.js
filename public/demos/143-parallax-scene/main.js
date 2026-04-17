import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Scene Setup ──────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ─── Sky Background ───────────────────────────────────────────────────────────
scene.background = new THREE.Color(0x1a1a2e);

// ─── Canvas Texture Helpers ───────────────────────────────────────────────────
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function makeTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Layer Definitions ────────────────────────────────────────────────────────
// Each layer: { z, speedFactor, draw(ctx, w, h) }
const layerDefs = [
  {
    name: 'sky',
    z: -50,
    speedFactor: 0.02,
    width: 2048,
    height: 1024,
    draw(ctx, w, h) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0,    '#0f0c29');
      grad.addColorStop(0.4,  '#302b63');
      grad.addColorStop(0.7,  '#24243e');
      grad.addColorStop(1,    '#1a1a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const rng = mulberry32(42);
      for (let i = 0; i < 220; i++) {
        const sx = rng() * w;
        const sy = rng() * h * 0.65;
        const sr = 0.5 + rng() * 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Moon
      const moonX = w * 0.78, moonY = h * 0.18, moonR = 55;
      const moonGrad = ctx.createRadialGradient(moonX - 10, moonY - 10, 0, moonX, moonY, moonR);
      moonGrad.addColorStop(0, '#fffbe6');
      moonGrad.addColorStop(0.7, '#f0e68c');
      moonGrad.addColorStop(1, 'rgba(240,230,140,0)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    name: 'farMountains',
    z: -30,
    speedFactor: 0.08,
    width: 2048,
    height: 1024,
    draw(ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#4a6aa0';
      _drawMountainRange(ctx, w, h, 0.55, 0.72, 8, 180);
      ctx.fillStyle = '#3a5a90';
      _drawMountainRange(ctx, w, h, 0.60, 0.75, 6, 140);
    }
  },
  {
    name: 'midMountains',
    z: -15,
    speedFactor: 0.20,
    width: 2048,
    height: 1024,
    draw(ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#2d4878';
      _drawMountainRange(ctx, w, h, 0.58, 0.76, 10, 220);
      ctx.fillStyle = '#213a68';
      _drawMountainRange(ctx, w, h, 0.64, 0.80, 7, 160);
    }
  },
  {
    name: 'hills',
    z: -8,
    speedFactor: 0.38,
    width: 2048,
    height: 1024,
    draw(ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#1d3250';
      _drawMountainRange(ctx, w, h, 0.68, 0.82, 12, 260);
      ctx.fillStyle = '#142540';
      _drawMountainRange(ctx, w, h, 0.72, 0.86, 8, 180);
    }
  },
  {
    name: 'trees',
    z: -2,
    speedFactor: 0.60,
    width: 2048,
    height: 1024,
    draw(ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      const rng = mulberry32(99);
      for (let i = 0; i < 28; i++) {
        const tx = (rng() * w * 1.5) % w;
        const th = 80 + rng() * 120;
        const ty = h * 0.78 - th * 0.4;
        _drawTree(ctx, tx, ty, th, rng);
      }
    }
  },
  {
    name: 'ground',
    z: 0,
    speedFactor: 0.85,
    width: 2048,
    height: 1024,
    draw(ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      // 基底仅限底部
      const grad = ctx.createLinearGradient(0, h * 0.75, 0, h);
      grad.addColorStop(0, 'rgba(15,31,15,0)');
      grad.addColorStop(0.3, '#0a1a0a');
      grad.addColorStop(1, '#050f05');
      ctx.fillStyle = grad;
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      ctx.fillStyle = '#1a3a1a';
      _drawGrassField(ctx, w, h, 0.78, 40);
      ctx.fillStyle = '#152e15';
      _drawGrassField(ctx, w, h, 0.83, 60);
      ctx.fillStyle = '#0f250f';
      _drawGrassField(ctx, w, h, 0.88, 80);
    }
  }
];

// ─── Draw Helpers ─────────────────────────────────────────────────────────────
function _drawMountainRange(ctx, w, h, baseY, peakY, peaks, amp) {
  ctx.beginPath();
  ctx.moveTo(0, h);

  const segW = w / peaks;
  for (let i = 0; i <= peaks; i++) {
    const x = i * segW;
    const mid = (i - 0.5) * segW;
    const varX = mid + (Math.sin(i * 2.3) * segW * 0.3);
    const varY = h * (peakY + Math.sin(i * 1.7) * 0.04);
    if (i === 0) {
      ctx.lineTo(x, h * peakY);
    } else {
      const cpx = (x + ctx.currentX || x) * 0.5 + (x - (ctx.currentX || x)) * 0.5;
      ctx.quadraticCurveTo(varX - segW * 0.15, varY - amp * 0.3, varX, varY);
      ctx.quadraticCurveTo(varX + segW * 0.15, varY - amp * 0.3, x, h * (baseY + (peakY - baseY) * 0.3));
    }
    ctx.currentX = x;
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function _drawTree(ctx, x, y, height, rng) {
  const trunkW = height * 0.06;
  const trunkH = height * 0.25;
  ctx.fillStyle = `rgb(${60 + rng() * 20|0},${35 + rng() * 15|0},${20 + rng() * 10|0})`;
  ctx.fillRect(x - trunkW / 2, y, trunkW, trunkH);

  const leafY = y - height * 0.1;
  const leafR = height * 0.45;
  const leafColors = ['#0a0a0a', '#0d0d15', '#050510', '#101020'];
  const col = leafColors[rng() * leafColors.length | 0];
  ctx.fillStyle = col;

  // Three triangular layers
  for (let l = 0; l < 3; l++) {
    const ly = leafY - l * height * 0.28;
    const lr = leafR * (1 - l * 0.25);
    ctx.beginPath();
    ctx.moveTo(x, ly - lr);
    ctx.lineTo(x - lr * 0.7, ly + lr * 0.4);
    ctx.lineTo(x + lr * 0.7, ly + lr * 0.4);
    ctx.closePath();
    ctx.fill();
  }
}

function _drawGrassField(ctx, w, h, startY, count) {
  const rng = mulberry32(Math.round(startY * 1000));
  for (let i = 0; i < count; i++) {
    const gx = rng() * w;
    const gy = h * startY;
    const gh = 20 + rng() * 40;
    const lean = (rng() - 0.5) * 20;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + lean, gy - gh * 0.6, gx + lean * 1.5, gy - gh);
    ctx.quadraticCurveTo(gx + lean + 2, gy - gh * 0.5, gx + 2, gy);
    ctx.closePath();
    ctx.fill();
  }
}

// Seedable RNG (Mulberry32)
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── Build Layers ─────────────────────────────────────────────────────────────
// 所有层使用相同的 plane 尺寸，靠 z 深度 + renderOrder 进行视差层叠
const PLANE_W = 2 * (innerWidth / innerHeight) * 3;
const PLANE_H = 2 * 3;

const layers = layerDefs.map(def => {
  const canvas = makeCanvas(def.width, def.height);
  const ctx = canvas.getContext('2d');
  def.draw(ctx, def.width, def.height);
  const texture = makeTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_H);
  const isSky = def.name === 'sky';
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: !isSky,       // sky 不透明，作为最底层背景
    depthWrite: isSky,         // 只有 sky 写深度
    depthTest: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = def.z;
  // 从远到近依次绘制：sky renderOrder=0, 依次递增
  mesh.renderOrder = 100 + def.z; // z=-50→50, z=0→100，数值越大越后画
  scene.add(mesh);

  return {
    mesh,
    texture,
    speedFactor: def.speedFactor,
    name: def.name,
    width: def.width,
    targetOffset: 0,
    currentOffset: 0
  };
});

// ─── Mouse / Touch Parallax ───────────────────────────────────────────────────
let isDragging = false;
let prevMouseX = 0;
let mouseX = 0;
let targetShift = 0;
let currentShift = 0;

const sensitivity = 1.8;

function onPointerDown(e) {
  isDragging = true;
  prevMouseX = e.touches ? e.touches[0].clientX : e.clientX;
}

function onPointerMove(e) {
  if (!isDragging) return;
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const delta = (cx - prevMouseX) / innerWidth;
  targetShift -= delta * sensitivity;
  prevMouseX = cx;
}

function onPointerUp() {
  isDragging = false;
}

window.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);
window.addEventListener('touchstart', onPointerDown, { passive: true });
window.addEventListener('touchmove', onPointerMove, { passive: true });
window.addEventListener('touchend', onPointerUp);

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

// ─── UI ───────────────────────────────────────────────────────────────────────
document.getElementById('layerCount').textContent = layers.length;
document.getElementById('speedVal').textContent = sensitivity.toFixed(1);

// ─── Animation Loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Smooth lerp
  currentShift += (targetShift - currentShift) * 0.08;

  layers.forEach(layer => {
    const parallaxShift = currentShift * layer.speedFactor;
    layer.mesh.position.x = parallaxShift;
    layer.texture.offset.x = -parallaxShift * 0.5;
  });

  renderer.render(scene, camera);
}

animate();

// ─── Expose to window ────────────────────────────────────────────────────────
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.layers = layers;