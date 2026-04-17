import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ─── Scene Setup ────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050510, 0.008);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 2, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ─── Post-processing ────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  1.5, 0.4, 0.85
);
bloomPass.threshold = 0.1;
bloomPass.strength = 2.0;
bloomPass.radius = 0.8;
composer.addPass(bloomPass);

// ─── Background ─────────────────────────────────────────────────────────────
const skyGeo = new THREE.PlaneGeometry(200, 120);
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(0x020208) },
    uColor2: { value: new THREE.Color(0x0a0a20) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      float n = noise(vUv * 4.0 + uTime * 0.05) * 0.5 +
                noise(vUv * 8.0 - uTime * 0.03) * 0.25 +
                noise(vUv * 16.0 + uTime * 0.07) * 0.125;
      vec3 col = mix(uColor1, uColor2, vUv.y + n * 0.3);
      // Subtle cloud wisps
      float cloud = noise(vUv * 3.0 + vec2(uTime * 0.02, 0.0));
      cloud = smoothstep(0.4, 0.7, cloud) * 0.15;
      col += cloud;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  depthWrite: false,
  side: THREE.FrontSide,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.position.z = -60;
scene.add(sky);

// ─── Ground plane ───────────────────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(200, 60);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x050510,
  roughness: 0.9,
  metalness: 0.1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -30;
scene.add(ground);

// ─── Ambient + dim fill light ───────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x080818, 1.0);
scene.add(ambient);

const flashLight = new THREE.PointLight(0xffffff, 0, 200);
flashLight.position.set(0, 30, 0);
scene.add(flashLight);

// ─── Lightning bolt class ────────────────────────────────────────────────────
const activeBolts = [];
const boltPool = [];

class LightningBolt {
  constructor() {
    this.group = new THREE.Group();
    this.isActive = false;
    this.life = 0;
    this.maxLife = 0;
    this.intensity = 1.0;
    this.color = new THREE.Color(0xaaddff);
    this.branchProb = 0.4;
    this.children = [];
    this.flickerTime = 0;
    this.points = [];
    this.mainMesh = null;
    this.glowMesh = null;
    scene.add(this.group);
  }

  generatePoints(startX, startY, endY, displacement, depth) {
    if (depth === 0) {
      return [new THREE.Vector3(startX, startY, 0), new THREE.Vector3(startX, endY, 0)];
    }
    const midY = (startY + endY) / 2;
    const segs = 6 + Math.floor(Math.random() * 4);
    const pts = [];
    pts.push(new THREE.Vector3(startX, startY, 0));
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const y = startY + (endY - startY) * t;
      const x = startX + (Math.random() - 0.5) * displacement * (1 - t * 0.5) * 2;
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return pts;
  }

  subdivide(pts, displacement, depth, maxDepth) {
    if (depth >= maxDepth) return pts;
    const newPts = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      if (Math.random() < 0.6 || i === pts.length - 1) {
        const mid = new THREE.Vector3().lerpVectors(prev, curr, 0.5);
        mid.x += (Math.random() - 0.5) * displacement;
        mid.y += (Math.random() - 0.5) * displacement * 0.1;
        newPts.push(mid);
      }
      newPts.push(curr);
    }
    return this.subdivide(newPts, displacement * 0.55, depth + 1, maxDepth);
  }

  buildGeometry(pts) {
    const positions = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      const perpendicular = new THREE.Vector3(-dir.y, dir.x, 0);
      const width = 0.08 + Math.random() * 0.06;

      const base = positions.length / 3;
      positions.push(
        a.x + perpendicular.x * width, a.y + perpendicular.y * width, a.z,
        a.x - perpendicular.x * width, a.y - perpendicular.y * width, a.z,
        b.x + perpendicular.x * width, b.y + perpendicular.y * width, b.z,

        a.x - perpendicular.x * width, a.y - perpendicular.y * width, a.z,
        b.x + perpendicular.x * width, b.y + perpendicular.y * width, b.z,
        b.x - perpendicular.x * width, b.y - perpendicular.y * width, b.z
      );

      // glow outline (wider)
      const gw = width * 3.5;
      positions.push(
        a.x + perpendicular.x * gw, a.y + perpendicular.y * gw, a.z,
        a.x - perpendicular.x * gw, a.y - perpendicular.y * gw, a.z,
        b.x + perpendicular.x * gw, b.y + perpendicular.y * gw, b.z,

        a.x - perpendicular.x * gw, a.y - perpendicular.y * gw, a.z,
        b.x + perpendicular.x * gw, b.y + perpendicular.y * gw, b.z,
        b.x - perpendicular.x * gw, b.y - perpendicular.y * gw, b.z
      );
    }
    return new Float32Array(positions);
  }

  spawn(x) {
    // Clear old children
    this.children.forEach(c => scene.remove(c.group));
    this.children = [];

    const startY = 30;
    const endY = -28;

    // Main bolt
    let pts = this.generatePoints(x, startY, endY, 8, 0);
    pts = this.subdivide(pts, 4.0, 0, 3);

    this.points = pts;

    const coreGeo = new THREE.BufferGeometry();
    const posArr = [];
    const glowArr = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, 0);
      const w = 0.06 + Math.random() * 0.04;

      // Core triangle (no z)
      posArr.push(a.x + perp.x * w, a.y + perp.y * w, 0);
      posArr.push(a.x - perp.x * w, a.y - perp.y * w, 0);
      posArr.push(b.x + perp.x * w, b.y + perp.y * w, 0);

      posArr.push(a.x - perp.x * w, a.y - perp.y * w, 0);
      posArr.push(b.x + perp.x * w, b.y + perp.y * w, 0);
      posArr.push(b.x - perp.x * w, b.y - perp.y * w, 0);

      // Glow quad
      const gw = w * 5;
      glowArr.push(a.x + perp.x * gw, a.y + perp.y * gw, 0);
      glowArr.push(a.x - perp.x * gw, a.y - perp.y * gw, 0);
      glowArr.push(b.x + perp.x * gw, b.y + perp.y * gw, 0);

      glowArr.push(a.x - perp.x * gw, a.y - perp.y * gw, 0);
      glowArr.push(b.x + perp.x * gw, b.y + perp.y * gw, 0);
      glowArr.push(b.x - perp.x * gw, b.y - perp.y * gw, 0);
    }

    const coreMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    if (this.mainMesh) this.group.remove(this.mainMesh);
    if (this.glowMesh) this.group.remove(this.glowMesh);

    coreGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posArr), 3));
    glowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(glowArr), 3));

    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(glowArr), 3));

    this.mainMesh = new THREE.Mesh(coreGeo, coreMat);
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.mainMesh);
    this.group.add(this.glowMesh);

    // Branches
    const numBranches = 2 + Math.floor(Math.random() * 3);
    for (let b = 0; b < numBranches; b++) {
      if (Math.random() > this.branchProb) continue;
      const branchPtIdx = Math.floor(pts.length * (0.2 + Math.random() * 0.5));
      const branchPt = pts[branchPtIdx];
      const nextPt = pts[Math.min(branchPtIdx + 1, pts.length - 1)];
      const dx = nextPt.x - branchPt.x;
      const branchDir = dx > 0 ? -1 : 1;
      const branchEndY = branchPt.y - (8 + Math.random() * 12);
      const branchEndX = branchPt.x + branchDir * (3 + Math.random() * 5);

      let bPts = this.generatePoints(branchPt.x, branchPt.y, branchEndY, 3, 0);
      bPts = this.subdivide(bPts, 1.5, 0, 2);

      const bPosArr = [];
      const bGlowArr = [];
      for (let i = 0; i < bPts.length - 1; i++) {
        const a = bPts[i];
        const b2 = bPts[i + 1];
        const dir = new THREE.Vector3().subVectors(b2, a).normalize();
        const perp = new THREE.Vector3(-dir.y, dir.x, 0);
        const w = 0.03 + Math.random() * 0.03;

        bPosArr.push(a.x + perp.x * w, a.y + perp.y * w, 0);
        bPosArr.push(a.x - perp.x * w, a.y - perp.y * w, 0);
        bPosArr.push(b2.x + perp.x * w, b2.y + perp.y * w, 0);

        bPosArr.push(a.x - perp.x * w, a.y - perp.y * w, 0);
        bPosArr.push(b2.x + perp.x * w, b2.y + perp.y * w, 0);
        bPosArr.push(b2.x - perp.x * w, b2.y - perp.y * w, 0);

        const gw = w * 5;
        bGlowArr.push(a.x + perp.x * gw, a.y + perp.y * gw, 0);
        bGlowArr.push(a.x - perp.x * gw, a.y - perp.y * gw, 0);
        bGlowArr.push(b2.x + perp.x * gw, b2.y + perp.y * gw, 0);

        bGlowArr.push(a.x - perp.x * gw, a.y - perp.y * gw, 0);
        bGlowArr.push(b2.x + perp.x * gw, b2.y + perp.y * gw, 0);
        bGlowArr.push(b2.x - perp.x * gw, b2.y - perp.y * gw, 0);
      }

      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bPosArr), 3));
      const bgGeo = new THREE.BufferGeometry();
      bgGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bGlowArr), 3));

      const bMat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
      const bgMat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });

      const bMesh = new THREE.Mesh(bGeo, bMat);
      const bgMesh = new THREE.Mesh(bgGeo, bgMat);

      const branchGroup = new THREE.Group();
      branchGroup.add(bMesh);
      branchGroup.add(bgMesh);
      scene.add(branchGroup);
      this.children.push({ group: branchGroup, mesh: bMesh, glow: bgMesh, mat: bMat, glowMat: bgMat });
    }

    this.isActive = true;
    this.life = 0;
    this.maxLife = 0.15 + Math.random() * 0.25;
    this.flickerTime = 0;

    // Flash the scene light
    flashLight.intensity = 8 * this.intensity;
    flashLight.position.set(x, 30, 0);

    // Thunder audio
    this.playThunder(x);
  }

  playThunder(x) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const duration = 1.8 + Math.random() * 1.2;
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * duration);
      const buffer = ctx.createBuffer(1, len, sr);
      const data = buffer.getChannelData(0);

      // Crack
      const crackLen = Math.floor(sr * 0.08);
      for (let i = 0; i < crackLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.01)) * 0.9;
      }

      // Rumble
      const dist = Math.abs(x) / 30;
      const delay = 0.3 + dist * 0.5 + Math.random() * 0.3;
      const rumbleStart = Math.floor(delay * sr);
      for (let i = rumbleStart; i < len; i++) {
        const t = (i - rumbleStart) / sr;
        const env = Math.exp(-t * 2.5) * (1 - Math.exp(-t * 30));
        const noise = Math.random() * 2 - 1;
        const wave = Math.sin(2 * Math.PI * 40 * t) * 0.3 +
                     Math.sin(2 * Math.PI * 60 * t) * 0.2 +
                     Math.sin(2 * Math.PI * 25 * t) * 0.4;
        data[i] += (noise * 0.6 + wave * 0.4) * env * 0.7;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.6;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      setTimeout(() => ctx.close(), (duration + 1) * 1000);
    } catch (e) { /* audio blocked */ }
  }

  update(dt) {
    if (!this.isActive) return;

    this.life += dt;
    this.flickerTime += dt;

    const flicker = Math.max(0, 1 - this.life / this.maxLife);
    const fastFlicker = Math.random() > 0.6 ? (0.4 + Math.random() * 0.6) : 1.0;
    const alpha = flicker * fastFlicker * this.intensity;

    if (this.mainMesh) {
      this.mainMesh.material.opacity = Math.min(1.0, alpha * 1.2);
    }
    if (this.glowMesh) {
      this.glowMesh.material.opacity = alpha * 0.5;
    }
    this.children.forEach(c => {
      c.mat.opacity = alpha * 0.9;
      c.glowMat.opacity = alpha * 0.3;
    });

    // Flash light decay
    flashLight.intensity = Math.max(0, flashLight.intensity - dt * 30);

    if (this.life > this.maxLife) {
      this.isActive = false;
      this.group.visible = false;
      this.children.forEach(c => { c.group.visible = false; });
    }
  }

  setVisible(v) {
    this.group.visible = v;
  }
}

// Create pool of bolts
const NUM_BOLTS = 5;
for (let i = 0; i < NUM_BOLTS; i++) {
  boltPool.push(new LightningBolt());
}

let boltIndex = 0;
function triggerLightning(x) {
  const bolt = boltPool[boltIndex % NUM_BOLTS];
  boltIndex++;
  bolt.color.set(lightningColor);
  bolt.intensity = guiParams.intensity;
  bolt.branchProb = guiParams.branchProb;
  bolt.spawn(x);
}

// ─── GUI ─────────────────────────────────────────────────────────────────────
const guiParams = {
  intensity: 1.8,
  branchProb: 0.45,
  color: '#aaddff',
  bloomStrength: 2.0,
  bloomRadius: 0.8,
  bloomThreshold: 0.1,
};

let lightningColor = new THREE.Color(0xaaddff);

const gui = new GUI({ title: '⚡ Lightning Controls' });
gui.add(guiParams, 'intensity', 0.2, 3.0).name('Bolt Intensity').onChange(v => {
  boltPool.forEach(b => { b.intensity = v; });
});
gui.add(guiParams, 'branchProb', 0.0, 1.0).name('Branch Prob').onChange(v => {
  boltPool.forEach(b => { b.branchProb = v; });
});
gui.addColor(guiParams, 'color').name('Bolt Color').onChange(v => {
  lightningColor.set(v);
  boltPool.forEach(b => { b.color.set(v); });
});
gui.add(guiParams, 'bloomStrength', 0.0, 5.0).name('Bloom Strength').onChange(v => {
  bloomPass.strength = v;
});
gui.add(guiParams, 'bloomRadius', 0.0, 2.0).name('Bloom Radius').onChange(v => {
  bloomPass.radius = v;
});
gui.add(guiParams, 'bloomThreshold', 0.0, 1.0).name('Bloom Threshold').onChange(v => {
  bloomPass.threshold = v;
});

// ─── Input ───────────────────────────────────────────────────────────────────
window.addEventListener('click', (e) => {
  const x = (e.clientX / innerWidth - 0.5) * 60;
  triggerLightning(x);
});

// Auto-strike
let nextStrikeTime = 3 + Math.random() * 2;
let elapsed = 0;

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ─── Animation Loop ─────────────────────────────────────────────────────────
let last = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  elapsed += dt;

  skyMat.uniforms.uTime.value = elapsed;

  // Auto lightning
  if (elapsed > nextStrikeTime) {
    const x = (Math.random() - 0.5) * 50;
    triggerLightning(x);
    nextStrikeTime = elapsed + 3 + Math.random() * 2;
  }

  // Update all bolts
  boltPool.forEach(b => b.update(dt));

  composer.render();
}

animate();