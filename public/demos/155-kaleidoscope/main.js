import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 3.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1.5;
controls.maxDistance = 10;

// ── Inner Scene (rendered to texture) ─────────────────────────────────────
const innerScene = new THREE.Scene();
innerScene.background = new THREE.Color(0x010108);

// Lights
innerScene.add(new THREE.AmbientLight(0xffffff, 0.6));
const ptLight1 = new THREE.PointLight(0xff00ff, 3, 12);
ptLight1.position.set(1.5, 1.5, 1.5);
innerScene.add(ptLight1);
const ptLight2 = new THREE.PointLight(0x00ffff, 3, 12);
ptLight2.position.set(-1.5, -1.5, 1.5);
innerScene.add(ptLight2);
const ptLight3 = new THREE.PointLight(0xffaa00, 2, 10);
ptLight3.position.set(0, -1.5, -1.5);
innerScene.add(ptLight3);

// ── Render Target ──────────────────────────────────────────────────────────
let rtSize = Math.min(innerWidth, innerHeight);
const renderTarget = new THREE.WebGLRenderTarget(rtSize, rtSize, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
});

// ── Inner Scene: Dynamic Geometry ─────────────────────────────────────────

// Central rotating polyhedra
const polyGroup = new THREE.Group();
innerScene.add(polyGroup);

const polyDefs = [
  { geo: () => new THREE.OctahedronGeometry(0.28), color: 0xff00ff, speed: 0.8 },
  { geo: () => new THREE.IcosahedronGeometry(0.22), color: 0x00ffff, speed: -0.6 },
  { geo: () => new THREE.TetrahedronGeometry(0.25), color: 0xffaa00, speed: 1.2 },
  { geo: () => new THREE.DodecahedronGeometry(0.2), color: 0xaa00ff, speed: -0.9 },
];
const polyMeshes = polyDefs.map(def => {
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    emissive: def.color,
    emissiveIntensity: 0.6,
    wireframe: false,
    metalness: 0.8,
    roughness: 0.2,
  });
  const mesh = new THREE.Mesh(def.geo(), mat);
  polyGroup.add(mesh);
  return { mesh, speed: def.speed };
});

// Concentric rings (animated)
const rings = [];
const ringDefs = [
  { radius: 0.5, tube: 0.012, color: 0xff00ff, speed: 0.4 },
  { radius: 0.8, tube: 0.010, color: 0x00ffff, speed: -0.3 },
  { radius: 1.1, tube: 0.008, color: 0xffaa00, speed: 0.5 },
  { radius: 1.4, tube: 0.010, color: 0xaa00ff, speed: -0.35 },
  { radius: 1.7, tube: 0.008, color: 0x00ff88, speed: 0.25 },
];
ringDefs.forEach(def => {
  const mat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.8 });
  const geo = new THREE.TorusGeometry(def.radius, def.tube, 8, 80);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  innerScene.add(mesh);
  rings.push({ mesh, speed: def.speed, baseColor: def.color });
});

// Radiating lines from center
const lineCount = 24;
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
const lineGeos = [];
for (let i = 0; i < lineCount; i++) {
  const angle = (i / lineCount) * Math.PI * 2;
  const pts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.cos(angle) * 2, Math.sin(angle) * 2, 0),
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, lineMat.clone());
  line.material.opacity = 0.08 + Math.random() * 0.1;
  innerScene.add(line);
  lineGeos.push({ line, angle });
}

// Particle field
const particleCount = 300;
const particleGeo = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
const pColors = new Float32Array(particleCount * 3);
const pSizes = new Float32Array(particleCount);
const pSpeeds = new Float32Array(particleCount);
const particleColors = [
  new THREE.Color(0xff00ff),
  new THREE.Color(0x00ffff),
  new THREE.Color(0xffaa00),
  new THREE.Color(0xaa00ff),
  new THREE.Color(0x00ff88),
];

for (let i = 0; i < particleCount; i++) {
  const angle = Math.random() * Math.PI * 2;
  const r = 0.3 + Math.random() * 1.8;
  pPositions[i * 3] = Math.cos(angle) * r;
  pPositions[i * 3 + 1] = Math.sin(angle) * r;
  pPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  const c = particleColors[Math.floor(Math.random() * particleColors.length)];
  pColors[i * 3] = c.r;
  pColors[i * 3 + 1] = c.g;
  pColors[i * 3 + 2] = c.b;
  pSizes[i] = 2 + Math.random() * 4;
  pSpeeds[i] = 0.2 + Math.random() * 0.8;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
particleGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

const particleMat = new THREE.PointsMaterial({
  size: 0.03,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const particles = new THREE.Points(particleGeo, particleMat);
innerScene.add(particles);

// Spiral arms
const spiralCount = 6;
const spirals = [];
for (let s = 0; s < spiralCount; s++) {
  const pts = [];
  const turns = 2;
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI * 2 * turns + (s / spiralCount) * Math.PI * 2;
    const r = 0.15 + t * 1.7;
    pts.push(new THREE.Vector3(
      Math.cos(angle) * r,
      Math.sin(angle) * r,
      0
    ));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const color = particleColors[s % particleColors.length];
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
  });
  const spiral = new THREE.Line(geo, mat);
  innerScene.add(spiral);
  spirals.push({ line: spiral, offset: (s / spiralCount) * Math.PI * 2, color });
}

// ── Kaleidoscope Shader ─────────────────────────────────────────────────────
const kaleidoscopeMat = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: renderTarget.texture },
    sliceCount: { value: 8.0 },
    time: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float sliceCount;
    uniform float time;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv * 2.0 - 1.0;
      float angle = atan(centered.y, centered.x);
      float radius = length(centered);
      float rotatedAngle = angle + time * 0.3;
      float sliceAngle = 6.28318530718 / sliceCount;
      float a = mod(rotatedAngle, sliceAngle);
      if (a > sliceAngle * 0.5) {
        a = sliceAngle - a;
      }
      vec2 mirrored = vec2(cos(a), sin(a)) * radius;
      vec2 mirroredUv = (mirrored + 1.0) * 0.5;
      mirroredUv.x = 1.0 - mirroredUv.x;
      vec4 color = texture2D(tDiffuse, mirroredUv);
      // Vignette
      float vignette = 1.0 - smoothstep(0.65, 1.0, radius);
      color.rgb *= vignette;
      // Slight glow at center
      float centerGlow = smoothstep(0.3, 0.0, radius) * 0.1;
      color.rgb += vec3(centerGlow);
      gl_FragColor = color;
    }
  `,
  side: THREE.FrontSide,
});

// ── Kaleidoscope Sphere ─────────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(3.0, 64, 64);
const kaleidoscopeSphere = new THREE.Mesh(sphereGeo, kaleidoscopeMat);
scene.add(kaleidoscopeSphere);

// ── UI ─────────────────────────────────────────────────────────────────────
const ui = document.createElement('div');
ui.style.cssText = `
  position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:16px;
  background:rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.12);
  border-radius:12px;padding:10px 20px;backdrop-filter:blur(8px);
  font-family:system-ui,sans-serif;color:rgba(255,255,255,0.7);font-size:13px;
`;
ui.innerHTML = `
  <button class="slice-btn active" data-slices="6" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer">6 瓣</button>
  <button class="slice-btn" data-slices="8" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer">8 瓣</button>
  <button class="slice-btn" data-slices="10" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer">10 瓣</button>
  <button class="slice-btn" data-slices="12" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer">12 瓣</button>
  <div style="display:flex;align-items:center;gap:8px;margin-left:8px">
    <span style="opacity:0.6">速度</span>
    <input type="range" id="speedSlider" min="1" max="100" value="50" style="-webkit-appearance:none;width:80px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2);outline:none" />
  </div>
`;
document.body.appendChild(ui);

let sliceCount = 8;
let rotationSpeed = 1.0;

document.querySelectorAll('.slice-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.slice-btn').forEach(b => { b.style.background = 'rgba(255,255,255,0.1)'; b.style.borderColor = 'rgba(255,255,255,0.2)'; });
    btn.style.background = 'rgba(255,255,255,0.25)';
    btn.style.borderColor = 'rgba(255,255,255,0.5)';
    sliceCount = parseInt(btn.dataset.slices);
  });
});

document.getElementById('speedSlider').addEventListener('input', e => {
  rotationSpeed = parseInt(e.target.value) / 50.0;
});

// ── Animation Loop ──────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // Rotate polyhedra
  polyMeshes.forEach(p => {
    p.mesh.rotation.x += p.speed * 0.01;
    p.mesh.rotation.y += p.speed * 0.015;
  });
  polyGroup.rotation.z = elapsed * 0.05;

  // Rotate rings
  rings.forEach(r => {
    r.mesh.rotation.z += r.speed * 0.01;
    r.mesh.material.opacity = 0.5 + Math.sin(elapsed * 1.5) * 0.3;
  });

  // Animate spiral arms
  spirals.forEach((s, i) => {
    s.line.geometry.setFromPoints(
      (() => {
        const pts = [];
        const turns = 2;
        const steps = 80;
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          const angle = t * Math.PI * 2 * turns + s.offset + elapsed * 0.15;
          const r = 0.15 + t * 1.7;
          pts.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0));
        }
        return pts;
      })()
    );
  });

  // Animate radiating lines
  lineGeos.forEach(l => {
    l.line.rotation.z = elapsed * 0.05;
    l.line.material.opacity = 0.06 + Math.sin(elapsed + l.angle) * 0.05;
  });

  // Animate particles (orbital motion)
  const pos = particleGeo.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const r = 0.3 + ((i * 0.37) % 1.8);
    const speed = pSpeeds[i];
    const t = elapsed * speed * 0.3;
    pos[i * 3] = Math.cos(angle + t) * r;
    pos[i * 3 + 1] = Math.sin(angle + t) * r;
  }
  particleGeo.attributes.position.needsUpdate = true;

  // Animate lights
  ptLight1.position.x = Math.cos(elapsed * 0.4) * 2;
  ptLight1.position.y = Math.sin(elapsed * 0.4) * 2;
  ptLight2.position.x = Math.cos(elapsed * 0.4 + Math.PI) * 2;
  ptLight2.position.y = Math.sin(elapsed * 0.4 + Math.PI) * 2;
  ptLight3.position.x = Math.cos(elapsed * 0.2 + Math.PI / 2) * 1.5;
  ptLight3.position.z = Math.sin(elapsed * 0.2) * 1.5;

  // Inner scene rotation
  innerScene.rotation.z = elapsed * 0.02 * rotationSpeed;

  // Shader
  kaleidoscopeMat.uniforms.time.value = elapsed * rotationSpeed;
  kaleidoscopeMat.uniforms.sliceCount.value = sliceCount;

  // Sphere rotation
  kaleidoscopeSphere.rotation.y = elapsed * 0.03;
  kaleidoscopeSphere.rotation.x = Math.sin(elapsed * 0.02) * 0.15;

  // Render
  renderer.setRenderTarget(renderTarget);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(innerScene, camera);

  renderer.setRenderTarget(null);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(scene, camera);

  controls.update();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  rtSize = Math.min(innerWidth, innerHeight);
  renderTarget.setSize(rtSize, rtSize);
});
