// 3945. Bone Scaffold Osteointegration Medical
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f14);
scene.fog = new THREE.FogExp2(0x0a0f14, 0.015);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(15, 12, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x4060a0, 0.5));
const key = new THREE.DirectionalLight(0xffe0d0, 1.0);
key.position.set(10, 20, 10);
scene.add(key);
const rim = new THREE.PointLight(0xa0c8ff, 0.4, 50);
rim.position.set(-10, 5, -10);
scene.add(rim);

// Scaffold: 3D printed porous structure (gyroid-inspired lattice)
function createScaffold() {
  const group = new THREE.Group();

  const scaffoldMat = new THREE.MeshStandardMaterial({
    color: 0xe8e0d0, roughness: 0.7, metalness: 0.1,
    transparent: true, opacity: 0.85
  });

  // Outer shell
  const shellGeo = new THREE.BoxGeometry(10, 10, 10, 2, 2, 2);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xd0c8b8, roughness: 0.8, metalness: 0.05,
    transparent: true, opacity: 0.4, wireframe: true
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  group.add(shell);

  // Lattice struts using tube geometry along curves
  const strutMat = scaffoldMat.clone();
  const strutRadius = 0.15;

  // Create lattice by drawing intersecting sinusoidal surfaces
  const latticeGroup = new THREE.Group();
  const gridSize = 5;
  const cellSize = 2;

  for (let i = -gridSize; i <= gridSize; i++) {
    for (let j = -gridSize; j <= gridSize; j++) {
      for (let k = -gridSize; k <= gridSize; k++) {
        // Only create struts in a porous pattern (skip some cells)
        if ((i + j + k) % 3 === 0) continue;

        const cx = i * cellSize;
        const cy = j * cellSize;
        const cz = k * cellSize;

        // Vertical strut
        if (j < gridSize) {
          const p1 = new THREE.Vector3(cx, cy, cz);
          const p2 = new THREE.Vector3(cx, cy + cellSize, cz);
          const curve = new THREE.LineCurve3(p1, p2);
          const tubeGeo = new THREE.TubeGeometry(curve, 4, strutRadius, 6, false);
          const strut = new THREE.Mesh(tubeGeo, strutMat);
          latticeGroup.add(strut);
        }

        // X-axis strut
        if (i < gridSize) {
          const p1 = new THREE.Vector3(cx, cy, cz);
          const p2 = new THREE.Vector3(cx + cellSize, cy, cz);
          const curve = new THREE.LineCurve3(p1, p2);
          const tubeGeo = new THREE.TubeGeometry(curve, 4, strutRadius, 6, false);
          const strut = new THREE.Mesh(tubeGeo, strutMat);
          latticeGroup.add(strut);
        }

        // Z-axis strut
        if (k < gridSize) {
          const p1 = new THREE.Vector3(cx, cy, cz);
          const p2 = new THREE.Vector3(cx, cy, cz + cellSize);
          const curve = new THREE.LineCurve3(p1, p2);
          const tubeGeo = new THREE.TubeGeometry(curve, 4, strutRadius, 6, false);
          const strut = new THREE.Mesh(tubeGeo, strutMat);
          latticeGroup.add(strut);
        }
      }
    }
  }

  group.add(latticeGroup);
  return group;
}

const scaffold = createScaffold();
scene.add(scaffold);

// Osteoblast cells (bone-forming cells)
class Osteoblast {
  constructor() {
    const geo = new THREE.SphereGeometry(0.25, 8, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffa060, emissive: 0xff6020, emissiveIntensity: 0.3,
      roughness: 0.6, metalness: 0.1
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    );
    this.target = this.randomTarget();
    this.mesh.position.copy(this.target);
    scene.add(this.mesh);
  }

  randomTarget() {
    // Random point within scaffold volume
    return new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    );
  }

  update(dt) {
    const dir = this.target.clone().sub(this.mesh.position);
    const dist = dir.length();
    if (dist < 0.3) {
      this.target = this.randomTarget();
    } else {
      dir.normalize().multiplyScalar(0.5 * dt);
      this.velocity.add(dir);
      this.velocity.multiplyScalar(0.95); // damping
      this.mesh.position.add(this.velocity);
    }
    // Pulsing glow
    const pulse = 0.3 + 0.2 * Math.sin(performance.now() * 0.003 + this.mesh.position.x);
    this.mesh.material.emissiveIntensity = pulse;
  }
}

// Osteoclasts (bone-resorbing cells, larger, redder)
class Osteoclast {
  constructor() {
    const geo = new THREE.SphereGeometry(0.45, 10, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff3030, emissive: 0xff0000, emissiveIntensity: 0.4,
      roughness: 0.5, metalness: 0.2
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    );
    this.target = this.randomTarget();
    this.mesh.position.copy(this.target);
    scene.add(this.mesh);
  }

  randomTarget() {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    );
  }

  update(dt) {
    const dir = this.target.clone().sub(this.mesh.position);
    const dist = dir.length();
    if (dist < 0.5) {
      this.target = this.randomTarget();
    } else {
      dir.normalize().multiplyScalar(0.3 * dt);
      this.velocity.add(dir);
      this.velocity.multiplyScalar(0.93);
      this.mesh.position.add(this.velocity);
    }
    const pulse = 0.4 + 0.2 * Math.sin(performance.now() * 0.002 + this.mesh.position.y);
    this.mesh.material.emissiveIntensity = pulse;
  }
}

// ECM fibers (extracellular matrix)
const ecmFibers = [];
function spawnEcmFiber() {
  const points = [];
  const start = new THREE.Vector3(
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 8
  );
  points.push(start.clone());
  for (let i = 0; i < 10; i++) {
    points.push(points[points.length - 1].clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      )
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 20, 0.03, 4, false);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd4a060, roughness: 0.9, transparent: true, opacity: 0.6
  });
  const fiber = new THREE.Mesh(geo, mat);
  scene.add(fiber);
  ecmFibers.push({ mesh: fiber, age: 0, maxAge: 8 + Math.random() * 4 });
}

const cells = [];
for (let i = 0; i < 25; i++) cells.push(new Osteoblast());
for (let i = 0; i < 8; i++) cells.push(new Osteoclast());

let ecmTimer = 0;
let time = 0;

// Camera orbit
let orbitAngle = 0;
let mouseDown = false, lastX = 0;
renderer.domElement.addEventListener('mousedown', e => { mouseDown = true; lastX = e.clientX; });
window.addEventListener('mouseup', () => mouseDown = false);
window.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  orbitAngle -= (e.clientX - lastX) * 0.005;
  lastX = e.clientX;
});

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  time += dt;

  cells.forEach(c => c.update(dt));

  // Spawn ECM fibers gradually
  ecmTimer += dt;
  if (ecmTimer > 0.8 && ecmFibers.length < 30) {
    spawnEcmFiber();
    ecmTimer = 0;
  }

  // Age and remove old ECM
  for (let i = ecmFibers.length - 1; i >= 0; i--) {
    ecmFibers[i].age += dt;
    if (ecmFibers[i].age > ecmFibers[i].maxAge) {
      scene.remove(ecmFibers[i].mesh);
      ecmFibers[i].mesh.geometry.dispose();
      ecmFibers.splice(i, 1);
    }
  }

  orbitAngle += dt * 0.08;
  camera.position.x = Math.sin(orbitAngle) * 25;
  camera.position.z = Math.cos(orbitAngle) * 25;
  camera.position.y = 12 + Math.sin(orbitAngle * 0.4) * 4;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}
animate();
