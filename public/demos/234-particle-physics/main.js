import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GUI }            from 'three/addons/libs/lil-gui.module.min.js';

// ─── Renderer ───────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// ─── Scene & Camera ─────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x000814, 0.00035);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 0, 120);

// ─── Post-processing ────────────────────────────────────────────────────────
const composer    = new EffectComposer(renderer);
const renderPass  = new RenderPass(scene, camera);
const bloomPass   = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.4, 0.2
);
composer.addPass(renderPass);
composer.addPass(bloomPass);

// ─── Background starfield ───────────────────────────────────────────────────
const bgGeo = new THREE.BufferGeometry();
const bgCount = 3000;
const bgPos = new Float32Array(bgCount * 3);
for (let i = 0; i < bgCount; i++) {
  bgPos[i*3]   = (Math.random() - 0.5) * 1000;
  bgPos[i*3+1] = (Math.random() - 0.5) * 1000;
  bgPos[i*3+2] = (Math.random() - 0.5) * 1000 - 300;
}
bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
const bgMat = new THREE.PointsMaterial({ color: 0x334466, size: 0.6, sizeAttenuation: true });
scene.add(new THREE.Points(bgGeo, bgMat));

// ─── Particle data arrays (CPU side) ────────────────────────────────────────
const MAX_PARTICLES = 150000;
const pos      = new Float32Array(MAX_PARTICLES * 3);
const vel      = new Float32Array(MAX_PARTICLES * 3);
const colors   = new Float32Array(MAX_PARTICLES * 3);
const sizes    = new Float32Array(MAX_PARTICLES);
const lifetimes = new Float32Array(MAX_PARTICLES);  // seconds remaining

let activeCount = 100000;

// ─── Initialise particles ───────────────────────────────────────────────────
function initParticle(i) {
  // Spawn on a sphere surface
  const theta = Math.random() * Math.PI * 2;
  const phi   = Math.acos(2 * Math.random() - 1);
  const r     = 25 + Math.random() * 20;
  pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
  pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  pos[i*3+2] = r * Math.cos(phi);

  vel[i*3]   = (Math.random() - 0.5) * 0.3;
  vel[i*3+1] = (Math.random() - 0.5) * 0.3;
  vel[i*3+2] = (Math.random() - 0.5) * 0.3;

  colors[i*3]   = 0.2; colors[i*3+1] = 0.6; colors[i*3+2] = 1.0;
  sizes[i]      = 0.6 + Math.random() * 0.8;
  lifetimes[i]  = 3 + Math.random() * 12;
}

for (let i = 0; i < MAX_PARTICLES; i++) initParticle(i);

// ─── InstancedMesh setup ────────────────────────────────────────────────────
const particleGeo  = new THREE.SphereGeometry(1, 4, 4);
const particleMat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
const instancedMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(instancedMesh);

// ─── Custom ShaderMaterial for InstancedMesh ────────────────────────────────
const shaderMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:    { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
  },
  vertexShader: /* glsl */`
    attribute vec3  aColor;
    attribute float aSize;
    varying   vec3  vColor;
    varying   float vSpeed;

    void main() {
      vColor  = aColor;
      // approximate speed from instance matrix scale as proxy
      vSpeed = length(position) * 0.01;

      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      gl_Position  = projectionMatrix * mvPosition;
      gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3  vColor;
    varying float vSpeed;

    void main() {
      vec2  c   = gl_PointCoord - 0.5;
      float len = length(c);
      if (len > 0.5) discard;

      float glow = 1.0 - smoothstep(0.0, 0.5, len);
      glow = pow(glow, 1.6);

      // hotter = more white/cyan; slower = more purple/blue
      vec3 hotColor = vec3(0.5, 1.0, 1.4);
      vec3 coolColor = vColor;
      vec3 color = mix(coolColor, hotColor, clamp(vSpeed, 0.0, 1.0));

      gl_FragColor = vec4(color * glow * 2.0, glow);
    }
  `,
  transparent: true,
  depthWrite:  false,
  blending:    THREE.AdditiveBlending,
});

// Replace MeshBasicMaterial with ShaderMaterial
instancedMesh.material = shaderMat;

// ─── Create attributes for shader ───────────────────────────────────────────
const colorAttr  = new THREE.InstancedBufferAttribute(colors, 3);
const sizeAttr   = new THREE.InstancedBufferAttribute(sizes,  1);
particleGeo.setAttribute('aColor', colorAttr);
particleGeo.setAttribute('aSize',  sizeAttr);

// ─── Trail geometry (line segments) ─────────────────────────────────────────
const TRAIL_LENGTH = 3;
const trailPositions = new Float32Array(MAX_PARTICLES * TRAIL_LENGTH * 3 * 2);
const trailColors    = new Float32Array(MAX_PARTICLES * TRAIL_LENGTH * 3 * 2);

const trailGeo = new THREE.BufferGeometry();
const trailPosAttr = new THREE.BufferAttribute(trailPositions, 3);
const trailColAttr = new THREE.BufferAttribute(trailColors,   3);
trailPosAttr.setUsage(THREE.DynamicDrawUsage);
trailColAttr.setUsage(THREE.DynamicDrawUsage);
trailGeo.setAttribute('position', trailPosAttr);
trailGeo.setAttribute('color',    trailColAttr);

const trailMat  = new THREE.LineSegmentsMaterial({
  vertexColors:  true,
  transparent:   true,
  opacity:       0.45,
  blending:      THREE.AdditiveBlending,
  depthWrite:   false,
  sizeAttenuation: true,
});
const trailLines = new THREE.LineSegments(trailGeo, trailMat);
scene.add(trailLines);

// ─── Mouse interaction ──────────────────────────────────────────────────────
const mouse     = new THREE.Vector2(9999, 9999);
const mouseWorld = new THREE.Vector3();
const raycaster  = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);

let mouseDown  = false;
let attractMode = true; // true = attract, false = repel

window.addEventListener('mousemove', e => {
  mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
});
window.addEventListener('mousedown', () => { mouseDown = true; });
window.addEventListener('mouseup',   () => { mouseDown = false; });

// Touch support
window.addEventListener('touchstart', e => {
  mouse.x =  (e.touches[0].clientX / innerWidth)  * 2 - 1;
  mouse.y = -(e.touches[0].clientY / innerHeight) * 2 + 1;
  mouseDown = true;
}, { passive: true });
window.addEventListener('touchend', () => { mouseDown = false; });
window.addEventListener('touchmove', e => {
  mouse.x =  (e.touches[0].clientX / innerWidth)  * 2 - 1;
  mouse.y = -(e.touches[0].clientY / innerHeight) * 2 + 1;
}, { passive: true });

// ─── Params ─────────────────────────────────────────────────────────────────
const params = {
  particleCount:  100000,
  gravity:        -0.08,
  windX:          0.0,
  windY:          0.0,
  windZ:          0.0,
  windStrength:   0.15,
  mouseForce:     2.5,
  mouseRadius:    40,
  attract:        true,
  trail:          true,
  trailLength:    TRAIL_LENGTH,
  bloomStrength:  0.85,
  bloomRadius:    0.4,
  bloomThreshold: 0.2,
  colorSlow:      '#4400ff',
  colorFast:      '#00ffff',
  colorHot:       '#ffffff',
  reset:          () => { for (let i = 0; i < MAX_PARTICLES; i++) initParticle(i); },
};

// ─── GUI ────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: 'Particle Physics' });
gui.add(params, 'particleCount', 1000, MAX_PARTICLES, 1000).name('Particle Count').onChange(applyCount);
gui.add(params, 'gravity', -1, 1, 0.01).name('Gravity');
gui.add(params, 'windStrength', 0, 1, 0.01).name('Wind Strength');
gui.add(params, 'windX', -1, 1, 0.01).name('Wind X');
gui.add(params, 'windY', -1, 1, 0.01).name('Wind Y');
gui.add(params, 'windZ', -1, 1, 0.01).name('Wind Z');
gui.add(params, 'mouseForce', 0, 10, 0.1).name('Mouse Force');
gui.add(params, 'mouseRadius', 5, 100, 1).name('Mouse Radius');
gui.add(params, 'attract').name('Attract (repulse if off)');
gui.add(params, 'trail').name('Show Trails').onChange(v => { trailLines.visible = v; });
gui.add(params, 'bloomStrength', 0, 3, 0.05).name('Bloom Strength').onChange(v => { bloomPass.strength = v; });
gui.add(params, 'bloomRadius', 0, 1, 0.05).name('Bloom Radius').onChange(v => { bloomPass.radius = v; });
gui.add(params, 'bloomThreshold', 0, 1, 0.05).name('Bloom Threshold').onChange(v => { bloomPass.threshold = v; });
gui.addColor(params, 'colorSlow').name('Color — Slow');
gui.addColor(params, 'colorFast').name('Color — Fast');
gui.addColor(params, 'colorHot').name('Color — Hot');
gui.add(params, 'reset').name('🔄 Reset Particles');

function applyCount() {
  activeCount = params.particleCount;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const _dummy    = new THREE.Object3D();
const _color    = new THREE.Color();
const _tmpVec   = new THREE.Vector3();

function hexToRGB(hex) {
  _color.set(hex);
  return { r: _color.r, g: _color.g, b: _color.b };
}
const slowRGB = hexToRGB(params.colorSlow);
const fastRGB = hexToRGB(params.colorFast);
const hotRGB  = hexToRGB(params.colorHot);

// ─── Update trail ──────────────────────────────────────────────────────────
const trailHistory = [];
for (let i = 0; i < MAX_PARTICLES; i++) {
  trailHistory.push({
    positions: Array.from({ length: TRAIL_LENGTH }, () => ({ x: 0, y: 0, z: 0 })),
  });
}

let trailHead = 0;

function updateTrails(idx) {
  const h = trailHead % TRAIL_LENGTH;
  trailHistory[idx].positions[h] = { x: pos[idx*3], y: pos[idx*3+1], z: pos[idx*3+2] };
  trailHead++;
}

// ─── Animation loop ─────────────────────────────────────────────────────────
let lastTime = performance.now();
let frameCount = 0;
let fpsTime = 0;
const statsEl = document.getElementById('stats');

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt  = Math.min((now - lastTime) / 1000, 0.05); // clamp delta
  lastTime  = now;

  // FPS counter
  frameCount++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    const fps = Math.round(frameCount / fpsTime);
    statsEl.textContent = `FPS: ${fps}  |  Particles: ${activeCount.toLocaleString()}`;
    frameCount = 0;
    fpsTime = 0;
  }

  shaderMat.uniforms.uTime.value = now * 0.001;

  // Update mouse world position (project onto z=0 plane via raycaster)
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  raycaster.ray.intersectPlane(plane, mouseWorld);

  // Refresh color targets from GUI
  const sr = hexToRGB(params.colorSlow);
  const fr = hexToRGB(params.colorFast);
  const hr = hexToRGB(params.colorHot);

  for (let i = 0; i < activeCount; i++) {
    const ix = i * 3, iy = ix + 1, iz = ix + 2;

    // ── Forces ──
    // Gravity
    vel[iy] += params.gravity * dt * 60;

    // Wind
    vel[ix] += params.windX * params.windStrength * dt * 60;
    vel[iy] += params.windY * params.windStrength * dt * 60;
    vel[iz] += params.windZ * params.windStrength * dt * 60;

    // Mouse force
    if (mouseDown) {
      _tmpVec.set(pos[ix], pos[iy], pos[iz]);
      const dist = _tmpVec.distanceTo(mouseWorld);
      if (dist < params.mouseRadius && dist > 0.5) {
        const strength = (1 - dist / params.mouseRadius) * params.mouseForce * dt * 60;
        const dir = params.attract ? -1 : 1;
        _tmpVec.sub(mouseWorld).normalize().multiplyScalar(strength * dir);
        vel[ix] += _tmpVec.x;
        vel[iy] += _tmpVec.y;
        vel[iz] += _tmpVec.z;
      }
    }

    // Velocity damping
    vel[ix] *= 0.992;
    vel[iy] *= 0.992;
    vel[iz] *= 0.992;

    // Speed cap
    const spd = Math.sqrt(vel[ix]*vel[ix] + vel[iy]*vel[iy] + vel[iz]*vel[iz]);
    const maxSpd = 8;
    if (spd > maxSpd) {
      const inv = maxSpd / spd;
      vel[ix] *= inv; vel[iy] *= inv; vel[iz] *= inv;
    }

    // Integrate position
    pos[ix] += vel[ix] * dt * 60;
    pos[iy] += vel[iy] * dt * 60;
    pos[iz] += vel[iz] * dt * 60;

    // Lifetime & respawn
    lifetimes[i] -= dt;
    if (lifetimes[i] <= 0 || pos[ix]*pos[ix] + pos[iy]*pos[iy] + pos[iz]*pos[iz] > 600*600) {
      initParticle(i);
      lifetimes[i] = 3 + Math.random() * 12;
    }

    // ── Instance matrix ──
    _dummy.position.set(pos[ix], pos[iy], pos[iz]);
    const scale = sizes[i] * (0.7 + spd * 0.08);
    _dummy.scale.setScalar(Math.min(scale, 3.5));
    _dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, _dummy.matrix);

    // ── Color based on speed ──
    const t = Math.min(spd / 4.0, 1.0);
    if (t < 0.5) {
      const u = t * 2;
      colors[ix] = sr.r + (fr.r - sr.r) * u;
      colors[iy] = sr.g + (fr.g - sr.g) * u;
      colors[iz] = sr.b + (fr.b - sr.b) * u;
    } else {
      const u = (t - 0.5) * 2;
      colors[ix] = fr.r + (hr.r - fr.r) * u;
      colors[iy] = fr.g + (hr.g - fr.g) * u;
      colors[iz] = fr.b + (hr.b - fr.b) * u;
    }

    // ── Trail ──
    if (params.trail) updateTrails(i);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  colorAttr.needsUpdate = true;
  sizeAttr.needsUpdate  = true;

  // ── Update trail geometry ──
  if (params.trail) {
    let tIdx = 0;
    for (let i = 0; i < activeCount; i++) {
      const history = trailHistory[i].positions;
      const tl = Math.min(params.trailLength, TRAIL_LENGTH);
      for (let t = 0; t < tl; t++) {
        const next = (trailHead + t) % TRAIL_LENGTH;
        const prev = (trailHead + t + 1) % TRAIL_LENGTH;
        const p = history[prev];
        const n = history[next];

        trailPositions[tIdx++] = p.x; trailPositions[tIdx++] = p.y; trailPositions[tIdx++] = p.z;
        trailPositions[tIdx++] = n.x; trailPositions[tIdx++] = n.y; trailPositions[tIdx++] = n.z;

        const fade = 1 - t / tl;
        trailColors[tIdx-6] = colors[i*3]   * fade;
        trailColors[tIdx-5] = colors[i*3+1] * fade;
        trailColors[tIdx-4] = colors[i*3+2] * fade;
        trailColors[tIdx-3] = colors[i*3]   * fade * 0.4;
        trailColors[tIdx-2] = colors[i*3+1] * fade * 0.4;
        trailColors[tIdx-1] = colors[i*3+2] * fade * 0.4;
      }
    }
    trailPosAttr.needsUpdate = true;
    trailColAttr.needsUpdate  = true;
  }

  composer.render();
}

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  shaderMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
});

animate();