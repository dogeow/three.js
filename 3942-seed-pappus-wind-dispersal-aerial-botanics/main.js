// 3942. Seed Pappus Wind Dispersal — Dandelion-style aerodynamic seed dispersal simulation
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1628);
scene.fog = new THREE.FogExp2(0x0a1628, 0.008);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 20, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x4060a0, 0.8));
const sun = new THREE.DirectionalLight(0xfff8e0, 1.0);
sun.position.set(30, 60, 20);
scene.add(sun);

// Ground plane
const groundGeo = new THREE.PlaneGeometry(300, 300, 60, 60);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a3a2a, roughness: 1.0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Seed class
class Seed {
  constructor(startPos) {
    this.pos = startPos.clone();
    this.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      -0.5 - Math.random() * 0.5,
      (Math.random() - 0.5) * 2
    );
    this.rot = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    this.rotSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );
    this.lift = 1.0 + Math.random() * 0.5;
    this.dragCoeff = 0.02 + Math.random() * 0.03;
    this.mesh = this.createMesh();
    scene.add(this.mesh);
  }

  createMesh() {
    const group = new THREE.Group();

    // Pappus (parachute) - thin disk with radiating bristles
    const pappusGeo = new THREE.ConeGeometry(0.8, 0.15, 16, 1, true);
    const pappusMat = new THREE.MeshStandardMaterial({
      color: 0xe8dcc8, side: THREE.DoubleSide,
      transparent: true, opacity: 0.7, roughness: 0.8
    });
    const pappus = new THREE.Mesh(pappusGeo, pappusMat);
    pappus.rotation.x = Math.PI;
    group.add(pappus);

    // Bristles (pappus hairs)
    const bristleCount = 80;
    const bristleGeo = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < bristleCount; i++) {
      const angle = (i / bristleCount) * Math.PI * 2;
      const r = 0.75;
      // Radiating outward from center
      positions.push(0, 0, 0);
      positions.push(Math.cos(angle) * r, 0.05, Math.sin(angle) * r);
    }
    bristleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const bristleMat = new THREE.LineBasicMaterial({ color: 0xc8b89a, transparent: true, opacity: 0.5 });
    const bristles = new THREE.LineSegments(bristleGeo, bristleMat);
    group.add(bristles);

    // Seed body (achene)
    const seedGeo = new THREE.SphereGeometry(0.12, 8, 6);
    const seedMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 });
    const seed = new THREE.Mesh(seedGeo, seedMat);
    seed.position.y = -0.8;
    group.add(seed);

    // Beak/awn
    const beakGeo = new THREE.ConeGeometry(0.04, 0.6, 6);
    const beak = new THREE.Mesh(beakGeo, seedMat);
    beak.position.y = -1.2;
    group.add(beak);

    group.scale.setScalar(2.5);
    return group;
  }

  update(dt, wind) {
    // Gravity
    this.vel.y -= 0.8 * dt;

    // Wind force
    const windForce = wind.clone().multiplyScalar(this.lift * 0.15);
    this.vel.add(windForce.multiplyScalar(dt));

    // Drag (terminal velocity)
    const drag = this.vel.clone().multiplyScalar(-this.dragCoeff * this.vel.length());
    this.vel.add(drag.multiplyScalar(dt));

    // Lift from pappus (oriented perpendicular to velocity)
    const speed = this.vel.length();
    if (speed > 0.1) {
      const liftDir = new THREE.Vector3(-this.vel.z, 0, this.vel.x).normalize();
      const liftMag = this.lift * 0.05 * speed;
      this.vel.add(liftDir.multiplyScalar(liftMag * dt));
    }

    this.pos.add(this.vel.clone().multiplyScalar(dt));

    // Update mesh
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.x += this.rotSpeed.x * dt;
    this.mesh.rotation.y += this.rotSpeed.y * dt;
    this.mesh.rotation.z += this.rotSpeed.z * dt;

    // Orient pappus to face velocity (belly up)
    if (this.vel.length() > 0.5) {
      const up = new THREE.Vector3(0, 1, 0);
      const velDir = this.vel.clone().normalize();
      const right = new THREE.Vector3().crossVectors(velDir, up).normalize();
      const adjustedUp = new THREE.Vector3().crossVectors(right, velDir).normalize();
      this.mesh.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(right, adjustedUp, velDir)
      );
    }
  }

  dispose() {
    scene.remove(this.mesh);
    this.mesh.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}

const seeds = [];
const maxSeeds = 80;

// Wind field
const wind = new THREE.Vector3(3, 0, 0);
let windAngle = 0;

// Create plant base
function createPlant(x, z) {
  const plantGroup = new THREE.Group();

  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.05, 0.08, 12, 8);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a7c4e, roughness: 0.9 });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 6;
  plantGroup.add(stem);

  // Pappus head (fluffy seed cluster)
  const headGeo = new THREE.SphereGeometry(1.2, 16, 12);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xe8dcc8, transparent: true, opacity: 0.9, roughness: 0.7
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 12.5;
  head.scale.y = 0.5;
  plantGroup.add(head);

  // Small white dots for seeds
  for (let i = 0; i < 30; i++) {
    const dotGeo = new THREE.SphereGeometry(0.15, 6, 4);
    const dot = new THREE.Mesh(dotGeo, headMat);
    const phi = Math.random() * Math.PI;
    const theta = Math.random() * Math.PI * 2;
    dot.position.set(
      Math.sin(phi) * Math.cos(theta) * 1.1,
      12.5 + Math.cos(phi) * 0.5,
      Math.sin(phi) * Math.sin(theta) * 1.1
    );
    plantGroup.add(dot);
  }

  plantGroup.position.set(x, 0, z);
  scene.add(plantGroup);
}

// Scatter plants
for (let i = 0; i < 15; i++) {
  createPlant(
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 40
  );
}

function releaseSeeds() {
  // Clear old seeds
  seeds.forEach(s => s.dispose());
  seeds.length = 0;

  for (let i = 0; i < maxSeeds; i++) {
    const startPos = new THREE.Vector3(
      (Math.random() - 0.5) * 60,
      12 + Math.random() * 3,
      (Math.random() - 0.5) * 40
    );
    seeds.push(new Seed(startPos));
  }
}

function resetSeeds() {
  seeds.forEach(s => s.dispose());
  seeds.length = 0;
}

document.getElementById('releaseBtn').addEventListener('click', releaseSeeds);
document.getElementById('resetBtn').addEventListener('click', resetSeeds);

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  // Animate wind direction
  windAngle += dt * 0.1;
  wind.set(
    Math.cos(windAngle) * 4,
    0,
    Math.sin(windAngle) * 2
  );

  seeds.forEach(seed => seed.update(dt, wind));

  // Camera slowly follows center of seeds
  if (seeds.length > 0) {
    const avgY = seeds.reduce((s, seed) => s + seed.pos.y, 0) / seeds.length;
    camera.position.y += (avgY * 0.3 + 15 - camera.position.y) * dt * 0.5;
  }
  camera.lookAt(0, camera.position.y - 5, 0);

  const stats = document.getElementById('stats');
  if (stats) stats.textContent = `Seeds: ${seeds.length} | Wind: (${wind.x.toFixed(1)}, ${wind.z.toFixed(1)})`;

  renderer.render(scene, camera);
}
animate();
