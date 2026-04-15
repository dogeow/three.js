import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const NUM_DROPLETS   = 12;       // Number of metaball droplets
const DROPLET_RADIUS = 0.9;      // Base radius per droplet
const ISO_LEVEL      = 1.0;      // Metaball isosurface threshold
const K_SMOOTH       = 1.2;      // Smooth-min blending coefficient
const BOUNDS         = 6.0;      // World-space simulation bounds
const RESTITUTION    = 0.3;      // Bounce coefficient
const FRICTION       = 0.985;    // Velocity damping per frame
const SPRING_K       = 3.0;      // Surface tension spring stiffness
const SPRING_DAMP    = 0.92;    // Spring velocity damping
const GRID_RES       = 80;      // Marching-cubes voxel resolution
const BLOB_GLOW      = 0.7;     // Glow intensity of droplet edges

// ─── Renderer & Scene ─────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x020610);  // Deep dark blue-black
scene.fog = new THREE.FogExp2(0x020610, 0.04);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 14);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxDistance = 30;
controls.minDistance  = 4;

// ─── Post-processing: Bloom ───────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2,   // strength
  0.5,   // radius
  0.1    // threshold
);
composer.addPass(bloomPass);

// ─── Metaball Shader ─────────────────────────────────────────────────────────
// Fragment shader: renders metaball surface with water shading
const metaballVert = /* glsl */`
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal   = normalize(normalMatrix * normal);
    vViewDir  = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const metaballFrag = /* glsl */`
  precision highp float;

  uniform vec3  uBaseColor;
  uniform vec3  uLightDir;
  uniform float uTime;
  uniform float uGlow;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  // Schlick Fresnel approximation
  float fresnel(vec3 v, vec3 n, float f0) {
    float cosTheta = clamp(dot(v, n), 0.0, 1.0);
    return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
  }

  // Cheap procedural water caustic shimmer
  float causticNoise(vec3 p, float t) {
    vec2 uv = p.xz * 0.6 + p.y * 0.3;
    float a = sin(uv.x * 4.0 + t * 1.2) * sin(uv.y * 3.7 + t * 0.9);
    float b = sin(uv.x * 2.3 - t * 0.7) * sin(uv.y * 5.1 + t * 1.5);
    return clamp((a + b) * 0.25 + 0.5, 0.0, 1.0);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uLightDir);
    vec3 H = normalize(L + V);

    // Diffuse
    float NdotL = max(dot(N, L), 0.0);
    float diff   = NdotL * 0.6 + 0.4;

    // Specular (GGX-like)
    float NdotH = max(dot(N, H), 0.0);
    float spec  = pow(NdotH, 80.0) * 1.8;

    // Fresnel — water has strong edge reflection
    float F = fresnel(V, N, 0.04);

    // Interior caustic shimmer
    float caus = causticNoise(vWorldPos * 0.5, uTime);

    // Water tint: deeper blue in normals facing up
    float upTint = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 waterColor = mix(uBaseColor, uBaseColor * vec3(0.5, 0.7, 1.0) * 1.4, upTint * 0.4);
    waterColor *= (0.85 + caus * 0.3);

    // Combine
    vec3 col = waterColor * diff;
    col += vec3(1.0, 0.97, 0.93) * spec * (1.0 - F * 0.5);
    col += uBaseColor * F * 0.6;               // Fresnel rim
    col += uBaseColor * uGlow * F * 1.5;       // Extra edge glow

    // Subtle subsurface scatter hint (backlight)
    float sss = pow(max(dot(-L, N), 0.0), 3.0) * 0.25;
    col += uBaseColor * sss;

    gl_FragColor = vec4(col, 0.88);
  }
`;

// ─── Marching Cubes (simplified uniform-grid variant) ────────────────────────
// We implement a GPU-based raymarch approach: render full-screen quad,
// raymarch signed-distance field in fragment shader for metaball surface.
const raymarchVert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const raymarchFrag = /* glsl */`
  precision highp float;

  uniform vec2  uResolution;
  uniform float uTime;
  uniform vec3  uCamPos;
  uniform mat4  uCamMatrix;
  uniform vec3  uDropletPositions[${NUM_DROPLETS}];
  uniform float uDropletRadius;
  uniform float uIsoLevel;
  uniform float uKSmooth;
  uniform vec3  uLightDir;

  varying vec2 vUv;

  // Smooth minimum (polynomial smin)
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // Metaball SDF: negative inside, positive outside
  float metaballSDF(vec3 p) {
    float acc = 0.0;
    for (int i = 0; i < ${NUM_DROPLETS}; i++) {
      float d = length(p - uDropletPositions[i]) - uDropletRadius;
      acc += uDropletRadius * uDropletRadius / (d * d + 0.001);
    }
    return acc - uIsoLevel;
  }

  // Finite-difference normal
  vec3 calcNormal(vec3 p) {
    float e = 0.025;
    return normalize(vec3(
      metaballSDF(p + vec3(e,0,0)) - metaballSDF(p - vec3(e,0,0)),
      metaballSDF(p + vec3(0,e,0)) - metaballSDF(p - vec3(0,e,0)),
      metaballSDF(p + vec3(0,0,e)) - metaballSDF(p - vec3(0,0,e))
    ));
  }

  // Raymarch against metaball field
  vec4 raymarch(vec3 ro, vec3 rd) {
    float t = 0.5;
    for (int i = 0; i < 80; i++) {
      vec3 p = ro + rd * t;
      float d = metaballSDF(p);
      if (d < 0.002) {
        // Found surface — compute normal & shade
        vec3 N = calcNormal(p);
        vec3 V = normalize(-rd);

        float NdotL = max(dot(N, uLightDir), 0.0);
        float diff   = NdotL * 0.6 + 0.4;

        vec3 H = normalize(uLightDir + V);
        float NdotH = max(dot(N, H), 0.0);
        float spec  = pow(NdotH, 80.0) * 1.8;

        // Fresnel
        float cosT   = clamp(dot(V, N), 0.0, 1.0);
        float F     = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);

        // Interior caustic shimmer
        float caus = clamp(
          sin(p.x * 4.0 + uTime * 1.2) * sin(p.y * 3.7 + uTime * 0.9) * 0.25 + 0.5,
          0.0, 1.0
        );

        // Water base color: icy blue
        vec3 baseColor = vec3(0.35, 0.70, 1.00);
        float upTint = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 waterColor = mix(baseColor, baseColor * vec3(0.5, 0.75, 1.3), upTint * 0.4);
        waterColor *= (0.85 + caus * 0.3);

        vec3 col  = waterColor * diff;
        col += vec3(1.0, 0.97, 0.93) * spec * (1.0 - F * 0.5);
        col += baseColor * F * 0.8;
        col += baseColor * 0.7 * F * 1.5;  // edge glow

        float sss = pow(max(dot(-uLightDir, N), 0.0), 3.0) * 0.25;
        col += baseColor * sss;

        return vec4(col, 0.90);
      }
      t += max(abs(d) * 0.5, 0.04);
      if (t > 25.0) break;
    }
    return vec4(0.0); // miss
  }

  void main() {
    // Reconstruct world-space ray from camera matrix
    vec2 ndc = vUv * 2.0 - 1.0;
    vec3 ro  = uCamPos;
    vec3 rd  = normalize(mat3(uCamMatrix) * vec3(ndc, -1.5));

    vec4 col = raymarch(ro, rd);

    // Background: dark gradient
    vec3 bg = mix(vec3(0.01, 0.02, 0.06), vec3(0.00, 0.01, 0.03), vUv.y);

    gl_FragColor = vec4(mix(bg, col.rgb, col.a), 1.0);
  }
`;

// Full-screen quad for raymarch pass
const fsqGeo = new THREE.PlaneGeometry(2, 2);
const fsqMat = new THREE.ShaderMaterial({
  vertexShader:   raymarchVert,
  fragmentShader: raymarchFrag,
  uniforms: {
    uResolution:     { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTime:            { value: 0.0 },
    uCamPos:          { value: camera.position },
    uCamMatrix:       { value: camera.matrixWorld },
    uDropletPositions:{ value: [] },
    uDropletRadius:   { value: DROPLET_RADIUS },
    uIsoLevel:        { value: ISO_LEVEL },
    uKSmooth:         { value: K_SMOOTH },
    uLightDir:        { value: new THREE.Vector3(0.5, 1.0, 0.8).normalize() },
  },
  depthWrite: false,
  depthTest:  false,
});
const fsq = new THREE.Mesh(fsqGeo, fsqMat);
fsq.frustumCulled = false;
scene.add(fsq);

// ─── Droplet Physics State ────────────────────────────────────────────────────
// Each droplet: position, velocity, "home" position (anchor), isDragged flag
const droplets = [];
const rng = (() => { let s = 42; return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; })();

for (let i = 0; i < NUM_DROPLETS; i++) {
  const angle = (i / NUM_DROPLETS) * Math.PI * 2 + rng() * 0.4;
  const r     = 2.5 + rng() * 2.0;
  droplets.push({
    pos:     new THREE.Vector3(Math.cos(angle) * r, (rng() - 0.5) * 2.0, Math.sin(angle) * r),
    vel:     new THREE.Vector3((rng() - 0.5) * 0.05, (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.05),
    home:    new THREE.Vector3(Math.cos(angle) * r, (rng() - 0.5) * 2.0, Math.sin(angle) * r),
    isDragged: false,
  });
}

// ─── Mouse / Touch Interaction ───────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse2D   = new THREE.Vector2();
let   dragDroplet = null;
let   dragPlane   = new THREE.Plane();
let   dragOffset  = new THREE.Vector3();
let   mouseDown   = false;
let   mousePos    = new THREE.Vector2();

// Convert screen coords to normalised device coords
function toNDC(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  return new THREE.Vector2(
    ((clientX - r.left) / r.width)  *  2 - 1,
    ((clientY - r.top)  / r.height) * -2 + 1
  );
}

// Find the droplet closest to the ray within a threshold
function pickDroplet(ndc) {
  raycaster.setFromCamera(ndc, camera);
  let best = null, bestDist = Infinity;
  for (const d of droplets) {
    // Approximate: distance from ray to droplet center
    const dist = raycaster.ray.distanceToPoint(d.pos);
    if (dist < DROPLET_RADIUS * 1.8 && d.pos.distanceTo(raycaster.ray.origin) < bestDist) {
      bestDist = d.pos.distanceTo(raycaster.ray.origin);
      best = d;
    }
  }
  return best;
}

renderer.domElement.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  mouseDown = true;
  const ndc = toNDC(e.clientX, e.clientY);
  dragDroplet = pickDroplet(ndc);
  if (dragDroplet) {
    dragDroplet.isDragged = true;
    // Build a plane at the droplet's depth facing camera
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    dragPlane.setFromNormalAndCoplanarPoint(camDir, dragDroplet.pos);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, hit);
    dragOffset.subVectors(dragDroplet.pos, hit);
    controls.enabled = false;  // disable orbit while dragging
  }
  mousePos.set(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  mousePos.set(e.clientX, e.clientY);
  if (dragDroplet) {
    const ndc = toNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, hit)) {
      dragDroplet.pos.copy(hit).add(dragOffset);
      // Clamp inside bounds
      dragDroplet.pos.clamp(
        new THREE.Vector3(-BOUNDS, -BOUNDS, -BOUNDS),
        new THREE.Vector3( BOUNDS,  BOUNDS,  BOUNDS)
      );
    }
  }
});

window.addEventListener('mouseup', () => {
  if (dragDroplet) {
    dragDroplet.isDragged = false;
    // Update home to new position so surface tension pulls from here
    dragDroplet.home.copy(dragDroplet.pos);
    dragDroplet = null;
  }
  mouseDown = false;
  controls.enabled = true;
});

// Touch support
renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    mouseDown = true;
    const ndc = toNDC(t.clientX, t.clientY);
    dragDroplet = pickDroplet(ndc);
    if (dragDroplet) {
      dragDroplet.isDragged = true;
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      dragPlane.setFromNormalAndCoplanarPoint(camDir, dragDroplet.pos);
      const hit = new THREE.Vector3();
      raycaster.setFromCamera(ndc, camera);
      raycaster.ray.intersectPlane(dragPlane, hit);
      dragOffset.subVectors(dragDroplet.pos, hit);
      controls.enabled = false;
    }
    mousePos.set(t.clientX, t.clientY);
  }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', e => {
  if (!mouseDown || !dragDroplet || e.touches.length !== 1) return;
  const t = e.touches[0];
  mousePos.set(t.clientX, t.clientY);
  const ndc = toNDC(t.clientX, t.clientY);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, hit)) {
    dragDroplet.pos.copy(hit).add(dragOffset);
    dragDroplet.pos.clamp(
      new THREE.Vector3(-BOUNDS, -BOUNDS, -BOUNDS),
      new THREE.Vector3( BOUNDS,  BOUNDS,  BOUNDS)
    );
  }
}, { passive: true });

window.addEventListener('touchend', () => {
  if (dragDroplet) {
    dragDroplet.isDragged = false;
    dragDroplet.home.copy(dragDroplet.pos);
    dragDroplet = null;
  }
  mouseDown = false;
  controls.enabled = true;
});

// ─── Background Particles (subtle ambient sparkles) ──────────────────────────
const ptCount = 600;
const ptPositions = new Float32Array(ptCount * 3);
for (let i = 0; i < ptCount; i++) {
  ptPositions[i*3+0] = (rng() - 0.5) * 40;
  ptPositions[i*3+1] = (rng() - 0.5) * 40;
  ptPositions[i*3+2] = (rng() - 0.5) * 40;
}
const ptGeo = new THREE.BufferGeometry();
ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPositions, 3));
const ptMat = new THREE.PointsMaterial({
  color: 0x4488bb,
  size: 0.04,
  transparent: true,
  opacity: 0.35,
  sizeAttenuation: true,
});
scene.add(new THREE.Points(ptGeo, ptMat));

// ─── Physics Update ───────────────────────────────────────────────────────────
function updatePhysics(dt) {
  for (const d of droplets) {
    if (d.isDragged) {
      // Kill velocity while dragged
      d.vel.set(0, 0, 0);
      continue;
    }

    // Surface tension: spring back toward home position
    const tension = new THREE.Vector3().subVectors(d.home, d.pos);
    d.vel.addScaledVector(tension, SPRING_K * dt);

    // Droplet-droplet repulsion (prevents total collapse)
    for (const other of droplets) {
      if (other === d) continue;
      const diff = new THREE.Vector3().subVectors(d.pos, other.pos);
      const dist = diff.length();
      const minDist = DROPLET_RADIUS * 2.2;
      if (dist < minDist && dist > 0.001) {
        const push = diff.normalize().multiplyScalar((minDist - dist) * 0.6);
        d.vel.add(push);
      }
    }

    // Damping
    d.vel.multiplyScalar(SPRING_DAMP);

    // Integrate
    d.pos.addScaledVector(d.vel, dt);

    // Soft world bounds (spring wall)
    const bound = BOUNDS * 0.85;
    const axis  = ['x','y','z'];
    for (const ax of axis) {
      if (d.pos[ax] > bound) { d.vel[ax] -= (d.pos[ax] - bound) * 4.0 * dt; }
      if (d.pos[ax] < -bound){ d.vel[ax] -= (d.pos[ax] + bound) * 4.0 * dt; }
    }
  }
}

// ─── Animation Loop ───────────────────────────────────────────────────────────
let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt  = Math.min((now - prevTime) / 1000.0, 0.033);  // cap at ~30fps equivalent
  prevTime  = now;

  const t = now * 0.001;

  controls.update();

  // Physics
  updatePhysics(dt);

  // Update shader uniforms
  fsqMat.uniforms.uTime.value = t;
  fsqMat.uniforms.uCamPos.value.copy(camera.position);
  fsqMat.uniforms.uCamMatrix.value.copy(camera.matrixWorld);
  fsqMat.uniforms.uDropletPositions.value = droplets.map(d => d.pos.clone());

  composer.render();
}

// ─── Auto-resize ──────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  fsqMat.uniforms.uResolution.value.set(w, h);
});

animate();