// 3948. Solar Prominence Loop Formation Simulation
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000008);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 0, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Solar disk (photosphere)
const sunGeo = new THREE.SphereGeometry(20, 64, 64);
const sunMat = new THREE.MeshStandardMaterial({
  color: 0xfff8e0, emissive: 0xffaa00, emissiveIntensity: 1.5,
  roughness: 1.0, metalness: 0.0
});
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Sun surface granulation (simple noise)
const granuleGeo = new THREE.SphereGeometry(20.5, 64, 64);
const granuleMat = new THREE.MeshStandardMaterial({
  color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 0.3,
  transparent: true, opacity: 0.4, wireframe: false
});
const granuleSurface = new THREE.Mesh(granuleGeo, granuleMat);
scene.add(granuleSurface);

// Corona glow
const coronaGeo = new THREE.SphereGeometry(24, 32, 32);
const coronaMat = new THREE.MeshBasicMaterial({
  color: 0xff6600, transparent: true, opacity: 0.08,
  side: THREE.BackSide
});
const corona = new THREE.Mesh(coronaGeo, coronaMat);
scene.add(corona);

// Prominence loop class
class ProminenceLoop {
  constructor(baseAngle, length, height) {
    this.baseAngle = baseAngle;
    this.length = length;
    this.maxHeight = height;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = 0.3 + Math.random() * 0.4;
    this.segments = 40;

    const points = this.computeCurve(0);
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, this.segments, 0.3 + Math.random() * 0.3, 8, false);

    const hue = 0.05 + Math.random() * 0.08; // orange-red
    const color = new THREE.Color().setHSL(hue, 1.0, 0.55 + Math.random() * 0.2);

    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.85 + Math.random() * 0.15,
      roughness: 0.3, metalness: 0.0
    });

    this.mesh = new THREE.Mesh(tubeGeo, mat);
    this.mesh.position.set(
      Math.cos(baseAngle) * 21,
      0,
      Math.sin(baseAngle) * 21
    );
    this.mesh.lookAt(0, 0, 0);
    scene.add(this.mesh);

    // Particles along the loop
    this.particles = [];
    const particleCount = 30;
    const particleGeo = new THREE.SphereGeometry(0.15, 6, 4);
    const particleMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9
    });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(particleGeo, particleMat.clone());
      const t = i / particleCount;
      const pos = curve.getPoint(t);
      p.position.copy(pos).add(this.mesh.position);
      scene.add(p);
      this.particles.push({ mesh: p, t, speed: 0.2 + Math.random() * 0.3 });
    }

    this.curve = curve;
  }

  computeCurve(time) {
    const points = [];
    const n = this.segments;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      // Parabolic loop shape
      const x = (t - 0.5) * this.length;
      const h = this.maxHeight * 4 * t * (1 - t) * (0.8 + 0.2 * Math.sin(time * this.speed + this.phase));
      // Slight twist
      const twist = Math.sin(t * Math.PI) * 0.3 * Math.sin(time * 0.5 + this.phase);
      points.push(new THREE.Vector3(x, h, twist));
    }
    return points;
  }

  update(time) {
    const points = this.computeCurve(time);
    const curve = new THREE.CatmullRomCurve3(points);
    this.curve = curve;

    // Update tube geometry
    const newGeo = new THREE.TubeGeometry(curve, this.segments, 0.3 + Math.random() * 0.2, 8, false);
    this.mesh.geometry.dispose();
    this.mesh.geometry = newGeo;

    // Pulsate emission
    const pulse = 0.8 + 0.4 * Math.sin(time * this.speed * 2 + this.phase);
    this.mesh.material.emissiveIntensity = pulse;

    // Animate particles along the loop
    this.particles.forEach(p => {
      p.t += 0.005 * p.speed;
      if (p.t > 1) p.t -= 1;
      const pos = curve.getPoint(p.t);
      p.mesh.position.copy(pos).add(this.mesh.position);
      // Brightness variation
      const brightness = 0.5 + 0.5 * Math.sin(p.t * Math.PI * 8 + time * 3);
      p.mesh.material.opacity = brightness * 0.9;
    });
  }

  dispose() {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.particles.forEach(p => {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
  }
}

// Create prominence loops
const loops = [];
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  const length = 20 + Math.random() * 15;
  const height = 8 + Math.random() * 15;
  loops.push(new ProminenceLoop(angle, length, height));
}

// Sunspot regions (dark spots on sun surface)
const sunspots = [];
for (let i = 0; i < 5; i++) {
  const geo = new THREE.SphereGeometry(1.5 + Math.random() * 2, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a0a00, emissive: 0x220800, emissiveIntensity: 0.5,
    roughness: 1.0
  });
  const spot = new THREE.Mesh(geo, mat);
  const theta = Math.random() * Math.PI * 2;
  const phi = (Math.random() - 0.5) * 0.8;
  spot.position.set(
    Math.cos(theta) * Math.cos(phi) * 19,
    Math.sin(phi) * 19,
    Math.sin(theta) * Math.cos(phi) * 19
  );
  spot.lookAt(0, 0, 0);
  scene.add(spot);
  sunspots.push(spot);
}

// Camera slow rotation
let camAngle = 0;
let mouseDown = false, lastX = 0;
renderer.domElement.addEventListener('mousedown', e => { mouseDown = true; lastX = e.clientX; });
window.addEventListener('mouseup', () => mouseDown = false);
window.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  camAngle -= (e.clientX - lastX) * 0.003;
  lastX = e.clientX;
});
window.addEventListener('wheel', e => {
  camera.position.z = Math.max(40, Math.min(150, camera.position.z + e.deltaY * 0.1));
});

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const t = now / 1000;

  // Rotate sun slowly
  sun.rotation.y += dt * 0.02;
  granuleSurface.rotation.copy(sun.rotation);

  // Sun breathing
  const breathe = 1.0 + 0.01 * Math.sin(t * 0.5);
  sun.scale.setScalar(breathe);
  corona.scale.setScalar(breathe);

  // Update loops
  loops.forEach(loop => loop.update(t));

  // Sunspot flickering
  sunspots.forEach((spot, i) => {
    const flicker = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.5);
    spot.material.emissiveIntensity = flicker * 0.5;
  });

  // Camera orbit
  camAngle += dt * 0.04;
  camera.position.x = Math.sin(camAngle) * 80;
  camera.position.z = Math.cos(camAngle) * 80;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}
animate();
