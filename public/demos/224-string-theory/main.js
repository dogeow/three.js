import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ── Scene Setup ──────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000510, 0.018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 500);
camera.position.set(0, 3, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 60;

// ── Post-Processing ───────────────────────────────────────────────────────────

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.4,   // strength
  0.5,   // radius
  0.1    // threshold
);
composer.addPass(bloomPass);

// ── Background Starfield ─────────────────────────────────────────────────────

function createStarfield() {
  const geo = new THREE.BufferGeometry();
  const count = 8000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 150 + Math.random() * 150;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = Math.random() * 2.0 + 0.3;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    color: 0xa8c8ff,
    size: 0.25,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7
  });
  return new THREE.Points(geo, mat);
}
scene.add(createStarfield());

// ── String Class ─────────────────────────────────────────────────────────────

class StringObject {
  constructor(type, mode, position, rotation) {
    this.type = type;          // 'open' | 'closed'
    this.mode = mode;          // 1–5 (vibrational mode)
    this.basePosition = position.clone();
    this.baseRotation = rotation.clone();

    this.TUBE_SEGMENTS = 120;
    this.RADIAL_SEGMENTS = 8;
    this.numPoints = 80;

    this.phase = Math.random() * Math.PI * 2;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.copy(rotation);

    this._buildGeometry();
    this._buildMesh();
    scene.add(this.group);
  }

  _buildGeometry() {
    const pts = [];
    for (let i = 0; i <= this.numPoints; i++) {
      pts.push(new THREE.Vector3(0, 0, 0));
    }
    this.curve = new THREE.CatmullRomCurve3(pts, this.type === 'closed');
    this.tubeGeo = new THREE.TubeGeometry(this.curve, this.TUBE_SEGMENTS, this.RADIAL_SEGMENTS, false);
  }

  _buildMesh() {
    const colors = {
      1: new THREE.Color(0x00d4ff),
      2: new THREE.Color(0xff40a0),
      3: new THREE.Color(0xff8040),
      4: new THREE.Color(0xe0e0ff),
      5: new THREE.Color(0xffcc00),
    };
    this.color = colors[this.mode] || new THREE.Color(0xa0c4ff);
    const emissiveIntensity = 0.8;

    const mat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity,
      roughness: 0.2,
      metalness: 0.6,
    });

    this.mesh = new THREE.Mesh(this.tubeGeo, mat);
    this.group.add(this.mesh);

    // Glow halo (slightly larger tube, transparent)
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    this.glowMesh = new THREE.Mesh(this.tubeGeo.clone(), glowMat);
    this.glowMesh.scale.setScalar(1.12);
    this.group.add(this.glowMesh);
  }

  update(tension, amplitude, animationSpeed) {
    const pts = this.curve.points;
    const n = pts.length;
    const omega = this.mode * animationSpeed * 2.0;
    const tensionMod = tension * 0.015;

    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);

      let y = 0;
      let z = 0;

      if (this.type === 'open') {
        // Clamped string: nodes at both ends, fundamental + harmonics
        y = amplitude
          * Math.sin(omega * this.phase)
          * Math.sin(Math.PI * u)
          * Math.cos(omega * this.time + this.phase + u * Math.PI * this.mode);

        // Add higher harmonic contributions
        y += amplitude * 0.4 * Math.sin(2 * Math.PI * u * this.mode)
           * Math.cos(omega * 1.5 * this.time + this.phase * 1.3);
        y += amplitude * 0.2 * Math.sin(3 * Math.PI * u * this.mode)
           * Math.cos(omega * 0.8 * this.time + this.phase * 0.7);

        z = amplitude * 0.3 * Math.sin(omega * 0.7 * this.time + u * Math.PI * 2)
          * Math.sin(Math.PI * u);

      } else {
        // Closed loop: wave propagates around the circumference
        const theta = u * Math.PI * 2;
        y = amplitude
          * Math.cos(omega * this.time + this.mode * theta + this.phase)
          * (0.6 + 0.4 * Math.sin(theta * this.mode + this.phase));
        z = amplitude
          * Math.sin(omega * 0.8 * this.time + this.mode * theta * 0.7 + this.phase)
          * (0.6 + 0.4 * Math.cos(theta * this.mode + this.phase));
      }

      pts[i].set(
        (u - 0.5) * tensionMod * 10,
        y * tension,
        z * tension
      );
    }

    this.curve.updateArcLengths();
    const newGeo = new THREE.TubeGeometry(this.curve, this.TUBE_SEGMENTS, this.RADIAL_SEGMENTS, this.type === 'closed');
    this.mesh.geometry.dispose();
    this.mesh.geometry = newGeo;
    this.glowMesh.geometry.dispose();
    this.glowMesh.geometry = newGeo.clone();
    this.glowMesh.scale.setScalar(1.12);
  }

  setTime(t) {
    this.time = t;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.glowMesh.geometry.dispose();
    this.glowMesh.material.dispose();
    scene.remove(this.group);
  }
}

// ── Particle Info Sprites ─────────────────────────────────────────────────────

const particleLabels = [
  { mode: 1, label: 'e⁻  Electron',     color: '#00d4ff' },
  { mode: 2, label: 'u   Up Quark',     color: '#ff40a0' },
  { mode: 3, label: 'd   Down Quark',   color: '#ff8040' },
  { mode: 4, label: 'ν   Neutrino',     color: '#e0e0ff' },
  { mode: 5, label: 'γ   Photon',       color: '#ffcc00' },
];

function makeLabelSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);

  // Background glow
  const gradient = ctx.createRadialGradient(256, 64, 10, 256, 64, 200);
  gradient.addColorStop(0, color + '33');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 128);

  // Text
  ctx.font = 'bold 36px "Share Tech Mono", monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(5, 1.25, 1);
  return sprite;
}

// ── Create Strings ───────────────────────────────────────────────────────────

const strings = [];

function spawnString(type, mode, pos, rot) {
  const s = new StringObject(type, mode, pos, rot);
  strings.push(s);
  return s;
}

// Open strings — horizontal, spread along X axis
const openPositions = [
  new THREE.Vector3(-14,  3,  0),
  new THREE.Vector3( -7, -1,  2),
  new THREE.Vector3(  0,  4, -1),
  new THREE.Vector3(  7, -2,  1),
  new THREE.Vector3( 14,  2, -2),
];
const openRotations = [
  new THREE.Euler(0.2,  0.1,  0.0),
  new THREE.Euler(0.1, -0.2,  0.1),
  new THREE.Euler(-0.1, 0.0,  0.15),
  new THREE.Euler(0.15, 0.2, -0.1),
  new THREE.Euler(-0.2, -0.1, 0.0),
];

openPositions.forEach((pos, i) => {
  spawnString('open', (i % 5) + 1, pos, openRotations[i]);
});

// Closed strings — loops in various planes
const closedConfigs = [
  { pos: new THREE.Vector3( -8, -4, -3), rot: new THREE.Euler(0.8, 0.3, 0.5),  mode: 1 },
  { pos: new THREE.Vector3(  8,  5, -2), rot: new THREE.Euler(1.2, 0.6, 0.9),  mode: 2 },
  { pos: new THREE.Vector3(  0, -5,  4), rot: new THREE.Euler(0.4, 1.1, 0.3),  mode: 3 },
  { pos: new THREE.Vector3(-13,  1, -5), rot: new THREE.Euler(1.5, 0.8, 1.2),  mode: 1 },
  { pos: new THREE.Vector3( 13, -3,  3), rot: new THREE.Euler(0.7, 1.4, 0.6),  mode: 4 },
];

closedConfigs.forEach(cfg => {
  spawnString('closed', cfg.mode, cfg.pos, cfg.rot);
});

// Add particle label sprites
strings.forEach(s => {
  const modeIdx = s.mode - 1;
  if (modeIdx >= 0 && modeIdx < particleLabels.length) {
    const lbl = particleLabels[modeIdx];
    const sprite = makeLabelSprite(lbl.label, lbl.color);
    sprite.position.set(s.type === 'open' ? 0 : 0, s.type === 'open' ? 3.5 : 2.5, 0);
    s.group.add(sprite);
  }
});

// ── Ambient Particles (energy quanta) ────────────────────────────────────────

const energyGeo = new THREE.BufferGeometry();
const eCount = 1200;
const ePos = new Float32Array(eCount * 3);
const eCol = new Float32Array(eCount * 3);
for (let i = 0; i < eCount; i++) {
  ePos[i * 3]     = (Math.random() - 0.5) * 60;
  ePos[i * 3 + 1] = (Math.random() - 0.5) * 30;
  ePos[i * 3 + 2] = (Math.random() - 0.5) * 40;
  const t = Math.random();
  eCol[i * 3]     = 0.1 + t * 0.6;
  eCol[i * 3 + 1] = 0.4 + t * 0.5;
  eCol[i * 3 + 2] = 1.0;
}
energyGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
energyGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3));
const energyMat = new THREE.PointsMaterial({
  size: 0.06,
  vertexColors: true,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const energyPoints = new THREE.Points(energyGeo, energyMat);
scene.add(energyPoints);

// ── Lights ────────────────────────────────────────────────────────────────────

scene.add(new THREE.AmbientLight(0x1a2a4a, 0.8));

const blueLight = new THREE.PointLight(0x2255ff, 2.5, 40);
blueLight.position.set(0, 10, 5);
scene.add(blueLight);

const magentaLight = new THREE.PointLight(0xff2288, 1.8, 35);
magentaLight.position.set(-10, -5, 8);
scene.add(magentaLight);

const goldLight = new THREE.PointLight(0xffcc44, 1.5, 30);
goldLight.position.set(12, 3, -5);
scene.add(goldLight);

// ── GUI ───────────────────────────────────────────────────────────────────────

const params = {
  tension:         1.2,
  amplitude:       0.8,
  animationSpeed:  1.0,
  showModes:       true,
  bloomStrength:   1.4,
  bloomRadius:     0.5,
  bloomThreshold:  0.1,
};

const gui = new GUI({ title: 'String Theory Controls', width: 260 });
gui.domElement.style.position = 'fixed';
gui.domElement.style.top = '20px';
gui.domElement.style.right = '20px';

const simFolder = gui.addFolder('Simulation');
simFolder.add(params, 'tension',        0.1, 3.0, 0.01).name('String Tension');
simFolder.add(params, 'amplitude',      0.1, 2.5, 0.01).name('Vibrational Amplitude');
simFolder.add(params, 'animationSpeed', 0.1, 3.0, 0.01).name('Animation Speed');

const displayFolder = gui.addFolder('Display');
displayFolder.add(params, 'showModes').name('Show Mode Labels');

const bloomFolder = gui.addFolder('Bloom Post-FX');
bloomFolder.add(params, 'bloomStrength', 0.0, 3.0, 0.01).name('Strength').onChange(v => {
  bloomPass.strength = v;
});
bloomFolder.add(params, 'bloomRadius', 0.0, 1.0, 0.01).name('Radius').onChange(v => {
  bloomPass.radius = v;
});
bloomFolder.add(params, 'bloomThreshold', 0.0, 1.0, 0.01).name('Threshold').onChange(v => {
  bloomPass.threshold = v;
});

// ── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animation Loop ───────────────────────────────────────────────────────────

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  strings.forEach(s => {
    s.setTime(elapsed);
    s.update(params.tension, params.amplitude, params.animationSpeed);
    s.group.visible = params.showModes;
  });

  // Slowly rotate energy field
  energyPoints.rotation.y = elapsed * 0.03;
  energyPoints.rotation.x = elapsed * 0.01;

  // Gentle light animation
  blueLight.intensity   = 2.5 + Math.sin(elapsed * 0.7) * 0.5;
  magentaLight.intensity = 1.8 + Math.sin(elapsed * 0.9 + 1.2) * 0.4;
  goldLight.intensity   = 1.5 + Math.sin(elapsed * 0.5 + 2.4) * 0.3;

  controls.update();
  composer.render();
}

animate();