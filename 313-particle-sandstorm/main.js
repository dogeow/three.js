import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Noise / FBM ────────────────────────────────────────────────────────────

function hash(n) {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

function noise2D(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const a = hash(ix     + iy     * 57.0);
  const b = hash(ix + 1 + iy     * 57.0);
  const c = hash(ix     + (iy + 1) * 57.0);
  const d = hash(ix + 1 + (iy + 1) * 57.0);
  return a + (b - a) * ux + (c - a) * uy + (d - b - c + a) * ux * uy;
}

function fbm(x, y, octaves) {
  let v = 0, amp = 0.5, freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise2D(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.0;
  }
  return v;
}

function windField(x, z, t, windStrength, turbulence) {
  const scale = 0.004;
  const angle = fbm(x * scale + t * 0.12, z * scale + t * 0.08, 4) * turbulence + t * 0.15;
  const speed = windStrength * (0.6 + 0.4 * fbm(x * scale * 2.0 + t * 0.2, z * scale * 2.0 + t * 0.1, 2));
  return {
    dx: Math.cos(angle) * speed * 0.4,
    dz: Math.sin(angle) * speed * 0.4,
    dy: fbm(x * scale * 1.5 + t * 0.18, z * scale * 1.5, 3) * turbulence * 0.12
  };
}

// ─── Scene Setup ─────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2a1500, 0.0025);
scene.background = new THREE.Color(0x1a0f00);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 35, 80);
camera.lookAt(0, 5, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 20;
controls.maxDistance = 250;

// ─── Lighting ────────────────────────────────────────────────────────────────

const ambientLight = new THREE.AmbientLight(0xffa040, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffd080, 2.2);
sunLight.position.set(60, 100, 40);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 350;
sunLight.shadow.camera.left = -120;
sunLight.shadow.camera.right = 120;
sunLight.shadow.camera.top = 120;
sunLight.shadow.camera.bottom = -120;
sunLight.shadow.bias = -0.0003;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xff6620, 0.4);
fillLight.position.set(-50, 30, -60);
scene.add(fillLight);

// ─── Ground ─────────────────────────────────────────────────────────────────

const groundGeo = new THREE.PlaneGeometry(400, 400, 100, 100);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x8B6914,
  roughness: 0.95,
  metalness: 0.0,
});

const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// subtle ground noise via vertex displacement
const posAttr = groundGeo.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
  const gx = posAttr.getX(i);
  const gy = posAttr.getY(i);
  const h = noise2D(gx * 0.03, gy * 0.03) * 2.5;
  posAttr.setZ(i, h);
}
posAttr.needsUpdate = true;
groundGeo.computeVertexNormals();

// ─── Particle System ──────────────────────────────────────────────────────────

const MAX_PARTICLES = 100000;
const MIN_PARTICLES = 10000;

const params = {
  particleCount: 50000,
  windStrength: 2.0,
  turbulence: 1.5,
  timeScale: 1.0,
};

const particleGeo = new THREE.SphereGeometry(0.18, 3, 2);
const particleMat = new THREE.MeshStandardMaterial({
  color: 0xd4a44c,
  roughness: 0.8,
  metalness: 0.0,
});

const instancedMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
instancedMesh.castShadow = false;
instancedMesh.receiveShadow = false;
instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(instancedMesh);

// Color attribute per instance
const colorArray = new Float32Array(MAX_PARTICLES * 3);
const colors = new THREE.InstancedBufferAttribute(colorArray, 3);
instancedMesh.instanceColor = colors;

// Particle state arrays
const positions = new Float32Array(MAX_PARTICLES * 3);
const velocities = new Float32Array(MAX_PARTICLES * 3);
const ages      = new Float32Array(MAX_PARTICLES);
const lifetimes = new Float32Array(MAX_PARTICLES);

function initParticle(i, burstX, burstZ, burstForce) {
  const spread = 150;
  let px, pz;
  if (burstX !== undefined) {
    px = burstX + (Math.random() - 0.5) * 40;
    pz = burstZ + (Math.random() - 0.5) * 40;
  } else {
    px = (Math.random() - 0.5) * spread;
    pz = (Math.random() - 0.5) * spread;
  }
  const py = Math.random() * 20 + 0.5;

  positions[i * 3]     = px;
  positions[i * 3 + 1] = py;
  positions[i * 3 + 2] = pz;

  if (burstForce !== undefined) {
    velocities[i * 3]     = (Math.random() - 0.5) * burstForce * 2;
    velocities[i * 3 + 1] = Math.random() * burstForce * 0.8 + burstForce * 0.3;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * burstForce * 2;
  } else {
    velocities[i * 3]     = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;
  }

  ages[i]      = 0;
  lifetimes[i] = Math.random() * 20 + 8;
}

function respawnParticle(i) {
  const spread = 160;
  const edge = Math.random();
  let px, pz;
  if (edge < 0.25) {
    px = -spread / 2; pz = (Math.random() - 0.5) * spread;
  } else if (edge < 0.5) {
    px = spread / 2; pz = (Math.random() - 0.5) * spread;
  } else if (edge < 0.75) {
    px = (Math.random() - 0.5) * spread; pz = -spread / 2;
  } else {
    px = (Math.random() - 0.5) * spread; pz = spread / 2;
  }
  const py = Math.random() * 15 + 0.5;

  positions[i * 3]     = px;
  positions[i * 3 + 1] = py;
  positions[i * 3 + 2] = pz;

  velocities[i * 3]     = 0;
  velocities[i * 3 + 1] = 0;
  velocities[i * 3 + 2] = 0;

  ages[i]      = 0;
  lifetimes[i] = Math.random() * 25 + 10;
}

// Initialize all particles
for (let i = 0; i < MAX_PARTICLES; i++) {
  initParticle(i);
}

// ─── Burst System ────────────────────────────────────────────────────────────

const bursts = [];

function createBurst(x, z) {
  bursts.push({
    x, z,
    force: 8 + Math.random() * 6,
    radius: 20 + Math.random() * 15,
    count: Math.floor(params.particleCount * 0.15),
    time: 0,
    duration: 0.4,
  });
}

window.addEventListener('click', (e) => {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, target);
  if (target) {
    createBurst(target.x, target.z);
  }
});

// ─── Color Mapping ───────────────────────────────────────────────────────────

const slowColor = new THREE.Color(0xd4a44c); // tan
const midColor  = new THREE.Color(0xe07020); // orange
const fastColor = new THREE.Color(0xff2800); // red

function speedToColor(speed) {
  const t = Math.min(speed / 6.0, 1.0);
  if (t < 0.5) {
    return slowColor.clone().lerp(midColor, t * 2.0);
  } else {
    return midColor.clone().lerp(fastColor, (t - 0.5) * 2.0);
  }
}

// ─── Matrix helper ──────────────────────────────────────────────────────────

const dummy = new THREE.Object3D();

// ─── Animation ──────────────────────────────────────────────────────────────

let time = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const scaledDelta = delta * params.timeScale;
  time += scaledDelta;

  const count = params.particleCount;
  const windStrength = params.windStrength;
  const turbulence = params.turbulence;

  // Process bursts
  for (let b = bursts.length - 1; b >= 0; b--) {
    const burst = bursts[b];
    burst.time += delta;
    if (burst.time > burst.duration) {
      bursts.splice(b, 1);
    }
  }

  for (let i = 0; i < MAX_PARTICLES; i++) {
    ages[i] += scaledDelta;

    const px = positions[i * 3];
    const pz = positions[i * 3 + 2];

    // Wind / FBM force
    const wind = windField(px, pz, time, windStrength, turbulence);
    velocities[i * 3]     += wind.dx * delta;
    velocities[i * 3 + 1] += wind.dy * delta;
    velocities[i * 3 + 2] += wind.dz * delta;

    // Damping
    const damp = 0.92;
    velocities[i * 3]     *= damp;
    velocities[i * 3 + 1] *= damp;
    velocities[i * 3 + 2] *= damp;

    // Gravity
    velocities[i * 3 + 1] -= 1.8 * delta;

    // Bursts
    for (const burst of bursts) {
      const dx = px - burst.x;
      const dz = pz - burst.z;
      const dist2 = dx * dx + dz * dz;
      const burstRadius2 = burst.radius * burst.radius;
      if (dist2 < burstRadius2) {
        const strength = (1.0 - dist2 / burstRadius2) * burst.force * 0.3;
        velocities[i * 3]     += (dx / Math.sqrt(dist2 + 0.01)) * strength * delta * 20;
        velocities[i * 3 + 1] += strength * delta * 15;
        velocities[i * 3 + 2] += (dz / Math.sqrt(dist2 + 0.01)) * strength * delta * 20;
      }
    }

    // Integrate position
    positions[i * 3]     += velocities[i * 3]     * delta * 60;
    positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60;
    positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60;

    // Ground / lifetime bounds
    if (positions[i * 3 + 1] < 0.15 || ages[i] > lifetimes[i]) {
      if (i < count) {
        respawnParticle(i);
      } else {
        // Hide unused particles below ground
        positions[i * 3 + 1] = -1000;
      }
    }

    // Speed-based color
    const vx = velocities[i * 3];
    const vy = velocities[i * 3 + 1];
    const vz = velocities[i * 3 + 2];
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const col = speedToColor(speed);
    colorArray[i * 3]     = col.r;
    colorArray[i * 3 + 1] = col.g;
    colorArray[i * 3 + 2] = col.b;

    // Update instance matrix
    dummy.position.set(
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2]
    );
    const scale = i < count ? 0.8 + Math.random() * 0.4 : 0.0;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  colors.needsUpdate = true;
  instancedMesh.count = count;

  controls.update();
  renderer.render(scene, camera);
}

// ─── GUI ─────────────────────────────────────────────────────────────────────

const gui = new GUI({ title: 'Sandstorm Controls' });
gui.add(params, 'particleCount', MIN_PARTICLES, MAX_PARTICLES, 1000).name('Particles');
gui.add(params, 'windStrength', 0, 5, 0.1).name('Wind Strength');
gui.add(params, 'turbulence', 0, 3, 0.05).name('Turbulence');
gui.add(params, 'timeScale', 0, 2, 0.05).name('Time Scale');

// ─── Resize ──────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();