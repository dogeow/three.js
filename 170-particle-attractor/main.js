import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ─── Renderer / Camera / Scene ───────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 120);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ─── Parameters ───────────────────────────────────────────────────────────────
const params = {
  particleCount: 20000,
  attractionStrength: 1.8,
  repulsion: false,
  damping: 0.92,
  influenceRadius: 40,
  resetParticles: resetParticles,
};

let positions, velocities;
let geometry, pointsMesh;

// ─── Color gradient: blue (slow) → green (medium) → red (fast) ────────────────
const color = new THREE.Color();
function speedToColor(speed) {
  // speed range: 0 (still) → ~5+ (fast)
  const t = Math.min(speed / 4.0, 1.0);
  if (t < 0.5) {
    // blue → green
    const r = 0;
    const g = t * 2.0;
    const b = 1.0 - t * 2.0;
    color.setRGB(r, g, b);
  } else {
    // green → red
    const r = (t - 0.5) * 2.0;
    const g = 1.0 - (t - 0.5) * 2.0;
    const b = 0;
    color.setRGB(r, g, b);
  }
  return color;
}

// ─── Particle Init ────────────────────────────────────────────────────────────
function resetParticles() {
  const count = params.particleCount;

  if (pointsMesh) {
    geometry.dispose();
    scene.remove(pointsMesh);
  }

  positions  = new Float32Array(count * 3);
  velocities = new Float32Array(count * 3);

  // sphere distribution
  for (let i = 0; i < count; i++) {
    const phi   = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);
    const r     = 30 + Math.random() * 60;

    positions[i * 3]     = r * Math.sin(theta) * Math.cos(phi);
    positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
    positions[i * 3 + 2] = r * Math.cos(theta);

    velocities[i * 3]     = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(count * 3), 3));

  const material = new THREE.PointsMaterial({
    size: 0.9,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });

  pointsMesh = new THREE.Points(geometry, material);
  scene.add(pointsMesh);
}

// ─── Mouse / Raycasting ───────────────────────────────────────────────────────
const mouse      = new THREE.Vector2();
const mouseWorld = new THREE.Vector3();
const raycaster  = new THREE.Raycaster();
let mouseOnPlane = new THREE.Vector3();

function onMouseMove(e) {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  raycaster.ray.intersectPlane(plane, mouseWorld);
}

window.addEventListener('mousemove', onMouseMove, { passive: true });

// ─── GUI ──────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: 'Particle Attractor' });
gui.add(params, 'attractionStrength', 0, 8, 0.05).name('Attraction Strength');
gui.add(params, 'repulsion').name('Repulsion Mode');
gui.add(params, 'damping', 0.5, 1.0, 0.01).name('Damping');
gui.add(params, 'influenceRadius', 5, 100, 1).name('Influence Radius');
gui.add(params, 'resetParticles').name('Reset Particles');
gui.add({ count: params.particleCount }, 'count', 1000, 50000, 500)
  .name('Particle Count')
  .onChange(v => { params.particleCount = v; resetParticles(); });

// ─── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animation Loop ───────────────────────────────────────────────────────────
const posAttr = geometry.attributes.position;
const colAttr = geometry.attributes.color;

function animate() {
  requestAnimationFrame(animate);

  const pos = posAttr.array;
  const col = colAttr.array;

  for (let i = 0; i < params.particleCount; i++) {
    const ix = i * 3, iy = ix + 1, iz = ix + 2;

    const dx = mouseWorld.x - pos[ix];
    const dy = mouseWorld.y - pos[iy];
    const dz = mouseWorld.z - pos[iz];
    const distSq  = dx * dx + dy * dy + dz * dz;
    const dist    = Math.sqrt(distSq);

    if (dist < params.influenceRadius && dist > 0.1) {
      const force = params.attractionStrength / (dist * 0.3 + 1.0);
      const dir   = params.repulsion ? -1 : 1;
      velocities[ix] += (dx / dist) * force * dir;
      velocities[iy] += (dy / dist) * force * dir;
      velocities[iz] += (dz / dist) * force * dir;
    }

    velocities[ix] *= params.damping;
    velocities[iy] *= params.damping;
    velocities[iz] *= params.damping;

    pos[ix] += velocities[ix];
    pos[iy] += velocities[iy];
    pos[iz] += velocities[iz];

    const speed = Math.sqrt(
      velocities[ix] * velocities[ix] +
      velocities[iy] * velocities[iy] +
      velocities[iz] * velocities[iz]
    );

    const c = speedToColor(speed);
    col[ix] = c.r;
    col[iy] = c.g;
    col[iz] = c.b;
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate  = true;

  controls.update();
  renderer.render(scene, camera);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
resetParticles();
animate();