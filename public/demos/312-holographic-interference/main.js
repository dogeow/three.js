import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let scene, camera, renderer, composer, controls;
const params = {
  wavelength: 0.5,
  angle: 0.5,
  phase: 0.0,
  scale: 4.0,
  mode: '3d'
};

let interferenceMesh, particleSystem;
let time = 0;

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float wavelength;
  uniform float angle;
  uniform float phase;
  uniform float scale;

  void main() {
    float x = vUv.x * scale;
    float y = vUv.y * scale;
    float d1 = sqrt(x * x + y * y);
    float x2 = x * cos(angle) + y * sin(angle);
    float d2 = sqrt(x2 * x2 + y * y);
    float k = 6.28318 / wavelength;
    float I = 0.5 + 0.5 * cos(k * (d1 - d2) + phase);
    vec3 col = vec3(
      0.5 + 0.5 * cos(k * (d1 - d2)),
      0.5 + 0.5 * cos(k * (d1 - d2) + 2.094),
      0.5 + 0.5 * cos(k * (d1 - d2) + 4.188)
    );
    col *= I;
    gl_FragColor = vec4(col, 0.9);
  }
`;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 5, 8);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.5, 0.1);
  composer.addPass(bloom);

  createInterference3D();
  createHolographicCone();
  setupGUI();
  window.addEventListener('resize', onResize);
}

function createInterference3D() {
  const geom = new THREE.PlaneGeometry(6, 6, 200, 200);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      wavelength: { value: params.wavelength },
      angle: { value: params.angle },
      phase: { value: params.phase },
      scale: { value: params.scale }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide
  });
  interferenceMesh = new THREE.Mesh(geom, mat);
  interferenceMesh.rotation.x = -Math.PI / 2;
  interferenceMesh.position.y = 0;
  scene.add(interferenceMesh);

  // 3D interference volume
  const volGeom = new THREE.BufferGeometry();
  const count = 8000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  let idx = 0;
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 6;
    const y = (Math.random() - 0.5) * 2;
    const z = (Math.random() - 0.5) * 6;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    const d1 = Math.sqrt(x * x + z * z);
    const x2 = x * Math.cos(params.angle) + z * Math.sin(params.angle);
    const d2 = Math.sqrt(x2 * x2 + z * z);
    const k = 6.28318 / params.wavelength;
    const I = 0.5 + 0.5 * Math.cos(k * (d1 - d2) + params.phase);
    const col = new THREE.Color().setHSL(I * 0.3, 1.0, 0.2 + I * 0.6);
    colors[idx * 3] = col.r;
    colors[idx * 3 + 1] = col.g;
    colors[idx * 3 + 2] = col.b;
    idx++;
  }
  volGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  volGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const volMat = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  particleSystem = new THREE.Points(volGeom, volMat);
  scene.add(particleSystem);
}

function createHolographicCone() {
  const geom = new THREE.ConeGeometry(2, 4, 32, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x4488ff,
    wireframe: true,
    transparent: true,
    opacity: 0.1
  });
  const cone = new THREE.Mesh(geom, mat);
  cone.position.y = 2;
  scene.add(cone);
}

function setupGUI() {
  const gui = new GUI();
  gui.add(params, 'wavelength', 0.1, 2, 0.01).name('Wavelength').onChange(updateShader);
  gui.add(params, 'angle', 0, 3.14, 0.01).name('Beam Angle').onChange(updateShader);
  gui.add(params, 'phase', 0, 6.28, 0.01).name('Phase').onChange(updateShader);
  gui.add(params, 'scale', 1, 10, 0.1).name('Scale').onChange(updateShader);
}

function updateShader() {
  if (interferenceMesh) {
    interferenceMesh.material.uniforms.wavelength.value = params.wavelength;
    interferenceMesh.material.uniforms.angle.value = params.angle;
    interferenceMesh.material.uniforms.phase.value = params.phase;
    interferenceMesh.material.uniforms.scale.value = params.scale;
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;
  params.phase = time;
  updateShader();
  controls.update();
  if (particleSystem) particleSystem.rotation.y += 0.002;
  composer.render();
}
init();
animate();