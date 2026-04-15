import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, composer, controls;
const PARTICLE_COUNT = 30000;
const beams = [];

class ParticleBeam {
  constructor(origin, direction) {
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
    this.life = 1.0;
    this.decay = 0.003 + Math.random() * 0.005;
    this.geometry = new THREE.BufferGeometry();
    this.count = 2000;
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const t = Math.random();
      const spread = (1 - t) * 0.5;
      positions[i * 3] = origin.x + direction.x * t * 8 + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = origin.y + direction.y * t * 8 + (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = origin.z + direction.z * t * 8 + (Math.random() - 0.5) * spread;
      const hue = 0.5 + Math.random() * 0.3;
      const col = new THREE.Color().setHSL(hue, 1.0, 0.6);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      sizes[i] = 2 + Math.random() * 4;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.points = new THREE.Points(this.geometry, mat);
    scene.add(this.points);

    // Beam core line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      origin,
      origin.clone().add(direction.clone().multiplyScalar(8))
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    this.line = new THREE.Line(lineGeom, lineMat);
    scene.add(this.line);
  }

  update() {
    this.life -= this.decay;
    this.points.material.opacity = Math.max(0, this.life);
    this.line.material.opacity = Math.max(0, this.life * 0.3);
    if (this.life <= 0) {
      scene.remove(this.points);
      scene.remove(this.line);
      this.geometry.dispose();
      this.points.material.dispose();
      return false;
    }
    return true;
  }
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 3, 10);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
  bloom.threshold = 0.1;
  bloom.strength = 2.0;
  bloom.radius = 0.5;
  composer.addPass(bloom);

  // Grid
  const grid = new THREE.GridHelper(20, 20, 0x333333, 0x111111);
  scene.add(grid);

  // Ambient particles (background dust)
  const dustGeom = new THREE.BufferGeometry();
  const dustPos = new Float32Array(5000 * 3);
  for (let i = 0; i < 5000; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 20;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0x444466, size: 0.02, transparent: true, opacity: 0.5 });
  scene.add(new THREE.Points(dustGeom, dustMat));

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('click', onClick);
}

function onClick(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, target);
  const origin = new THREE.Vector3(0, 0.5, 0);
  const direction = target.clone().sub(origin).normalize();
  beams.push(new ParticleBeam(origin, direction));
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  for (let i = beams.length - 1; i >= 0; i--) {
    if (!beams[i].update()) beams.splice(i, 1);
  }
  composer.render();
}
init();
animate();