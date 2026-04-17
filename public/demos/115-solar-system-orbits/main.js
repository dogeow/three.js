import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Scene Setup ───────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000008);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 80, 120);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 20;
controls.maxDistance = 500;
controls.target.set(0, 0, 0);

// ─── Lights ───────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x111133, 0.4);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xfff5e0, 3.5, 600);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// ─── Sun ──────────────────────────────────────────────────────────────────────
const sunGeo = new THREE.SphereGeometry(4.5, 32, 32);
const sunMat = new THREE.MeshStandardMaterial({
  color: 0xffaa22,
  emissive: 0xff8800,
  emissiveIntensity: 2.0,
  roughness: 1,
  metalness: 0,
});
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Sun glow (additive sprite-like sphere)
const glowGeo = new THREE.SphereGeometry(5.8, 32, 32);
const glowMat = new THREE.MeshBasicMaterial({
  color: 0xff6600,
  transparent: true,
  opacity: 0.12,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const sunGlow = new THREE.Mesh(glowGeo, glowMat);
scene.add(sunGlow);

// ─── Stars ────────────────────────────────────────────────────────────────────
function createStars(count, radius) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.85 + Math.random() * 0.3);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = Math.random() * 1.4 + 0.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  });
  return new THREE.Points(geo, mat);
}
scene.add(createStars(4000, 800));

// ─── Planet Data ──────────────────────────────────────────────────────────────
// Kepler-like: T² ∝ R³, so T = k * R^1.5
// We use visual approximation with period in seconds at 1x speed
const PLANET_DATA = [
  {
    name: 'Mercury',
    radius: 0.38,
    orbitRadius: 11,
    color: 0xb5b5b5,
    emissive: 0x1a1a1a,
    period: 2.0,
    tilt: 0.03,
    moons: [],
  },
  {
    name: 'Venus',
    radius: 0.65,
    orbitRadius: 17,
    color: 0xe8cda0,
    emissive: 0x3a2800,
    period: 4.0,
    tilt: 3.1,
    moons: [],
  },
  {
    name: 'Earth',
    radius: 0.70,
    orbitRadius: 24,
    color: 0x3a7fd5,
    emissive: 0x001133,
    period: 6.0,
    tilt: 0.41,
    moons: [
      { name: 'Moon', radius: 0.20, orbitRadius: 1.8, period: 1.2, color: 0xaaaaaa },
    ],
  },
  {
    name: 'Mars',
    radius: 0.50,
    orbitRadius: 33,
    color: 0xc1440e,
    emissive: 0x220500,
    period: 9.0,
    tilt: 0.44,
    moons: [],
  },
  {
    name: 'Jupiter',
    radius: 2.2,
    orbitRadius: 52,
    color: 0xc88b3a,
    emissive: 0x2a1500,
    period: 28,
    tilt: 0.054,
    moons: [
      { name: 'Io', radius: 0.22, orbitRadius: 3.2, period: 0.35, color: 0xeedd44 },
      { name: 'Europa', radius: 0.18, orbitRadius: 4.0, period: 0.6, color: 0xccbbaa },
    ],
  },
  {
    name: 'Saturn',
    radius: 1.8,
    orbitRadius: 72,
    color: 0xe8d5a0,
    emissive: 0x2a2000,
    period: 50,
    tilt: 0.466,
    hasRings: true,
    moons: [
      { name: 'Titan', radius: 0.28, orbitRadius: 4.0, period: 1.2, color: 0xd4a050 },
      { name: 'Rhea', radius: 0.14, orbitRadius: 5.2, period: 2.0, color: 0xcccccc },
    ],
  },
];

// ─── Orbit Lines ──────────────────────────────────────────────────────────────
function createOrbitLine(radius) {
  const points = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0x334466,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  return new THREE.LineLoop(geo, mat);
}

// ─── Planet Factory ───────────────────────────────────────────────────────────
const orbitLines = [];
const orbitGroup = new THREE.Group();
scene.add(orbitGroup);

const planets = [];

PLANET_DATA.forEach(data => {
  const group = new THREE.Group();

  // Planet mesh
  const geo = new THREE.SphereGeometry(data.radius, 24, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: data.color,
    emissive: data.emissive,
    emissiveIntensity: 0.3,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.z = data.tilt;
  group.add(mesh);

  // Saturn rings
  if (data.hasRings) {
    const ringGeo = new THREE.TorusGeometry(data.radius * 1.55, data.radius * 0.45, 4, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc8b878,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.2;
    group.add(ring);
  }

  // Moons
  data.moons.forEach(moonData => {
    const moonGeo = new THREE.SphereGeometry(moonData.radius, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({
      color: moonData.color,
      emissive: moonData.color,
      emissiveIntensity: 0.1,
      roughness: 0.9,
      metalness: 0,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.userData = {
      orbitRadius: moonData.orbitRadius,
      period: moonData.period,
      name: moonData.name,
      isMoon: true,
    };
    group.add(moonMesh);
  });

  group.userData = {
    orbitRadius: data.orbitRadius,
    period: data.period,
    name: data.name,
    angle: Math.random() * Math.PI * 2,
    isPlanet: true,
  };

  scene.add(group);
  planets.push(group);

  // Orbit line
  const line = createOrbitLine(data.orbitRadius);
  orbitGroup.add(line);
  orbitLines.push(line);
});

// ─── Labels ───────────────────────────────────────────────────────────────────
const labelContainer = document.getElementById('labels');
const labelEls = {};

planets.forEach(group => {
  const el = document.createElement('div');
  el.className = 'label';
  el.textContent = group.userData.name;
  labelContainer.appendChild(el);
  labelEls[group.userData.name] = el;

  // Also label moons
  group.children.forEach(child => {
    if (child.userData.isMoon) {
      const mel = document.createElement('div');
      mel.className = 'label';
      mel.textContent = child.userData.name;
      labelContainer.appendChild(mel);
      labelEls[child.userData.name] = mel;
    }
  });
});

// ─── Controls ─────────────────────────────────────────────────────────────────
let timeMultiplier = 1.0;
let showOrbits = true;
let showLabels = true;

document.getElementById('speedSlider').addEventListener('input', e => {
  timeMultiplier = parseFloat(e.target.value);
  document.getElementById('speedVal').textContent = timeMultiplier.toFixed(1) + 'x';
});

document.getElementById('orbitToggle').addEventListener('change', e => {
  showOrbits = e.target.checked;
  orbitGroup.visible = showOrbits;
});

document.getElementById('labelToggle').addEventListener('change', e => {
  showLabels = e.target.checked;
  Object.values(labelEls).forEach(el => {
    el.style.opacity = showLabels ? '1' : '0';
  });
});

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animation Loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Sun gentle pulse
  const pulse = 1 + Math.sin(elapsed * 1.5) * 0.015;
  sun.scale.setScalar(pulse);
  sunGlow.scale.setScalar(pulse * 1.15);

  // Planets
  planets.forEach(group => {
    const { orbitRadius, period, angle } = group.userData;
    const newAngle = angle + (delta * timeMultiplier * (1 / period) * Math.PI * 2);
    group.userData.angle = newAngle;

    group.position.x = Math.cos(newAngle) * orbitRadius;
    group.position.z = Math.sin(newAngle) * orbitRadius;

    // Rotate planet on its axis
    group.rotation.y += delta * timeMultiplier * 0.5;

    // Moons orbit around their planet
    group.children.forEach(child => {
      if (child.userData.isMoon) {
        const ma = elapsed * timeMultiplier * (Math.PI * 2 / child.userData.period);
        child.position.x = Math.cos(ma) * child.userData.orbitRadius;
        child.position.z = Math.sin(ma) * child.userData.orbitRadius;
      }
    });
  });

  // Update labels
  if (showLabels) {
    planets.forEach(group => {
      const el = labelEls[group.userData.name];
      if (el) {
        const worldPos = new THREE.Vector3();
        group.getWorldPosition(worldPos);
        worldPos.y += group.userData.isPlanet
          ? (PLANET_DATA.find(p => p.name === group.userData.name)?.radius ?? 1) + 0.8
          : 0.5;
        const screenPos = worldPos.project(camera);
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
        if (screenPos.z < 1) {
          el.style.display = 'block';
          el.style.left = x + 'px';
          el.style.top = y + 'px';
        } else {
          el.style.display = 'none';
        }
      }

      // Moon labels
      group.children.forEach(child => {
        if (child.userData.isMoon) {
          const el = labelEls[child.userData.name];
          if (el) {
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            worldPos.y += 0.5;
            const screenPos = worldPos.project(camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
            if (screenPos.z < 1) {
              el.style.display = 'block';
              el.style.left = x + 'px';
              el.style.top = y + 'px';
              el.style.fontSize = '10px';
              el.style.color = 'rgba(200, 200, 200, 0.75)';
            } else {
              el.style.display = 'none';
            }
          }
        }
      });
    });
  } else {
    Object.values(labelEls).forEach(el => { el.style.display = 'none'; });
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ─── Expose to window ────────────────────────────────────────────────────────
window.THREE = THREE;
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.controls = controls;
window.planets = planets;
window.orbitLines = orbitLines;