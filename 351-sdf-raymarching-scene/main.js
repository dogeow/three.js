import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Renderer / Camera / Scene ─────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const scene = new THREE.Scene();

// ─── Full-screen quad ────────────────────────────────────────────────────────
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`;

const fragmentShader = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uCameraPos;
uniform vec3  uCameraTarget;
uniform float uCameraSpeed;
uniform vec3  uLightPos;
uniform int   uShapeType;

varying vec2 vUv;

// ── SDF Primitives ──────────────────────────────────────────────────────────
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// ── Smooth union ────────────────────────────────────────────────────────────
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// ── Scene SDF ───────────────────────────────────────────────────────────────
float sceneSDF(vec3 p) {
  if (uShapeType == 0) {
    // Scene A: overlapping spheres with smooth union
    float s1 = sdSphere(p - vec3(-0.5, 0.0, 0.0), 0.7);
    float s2 = sdSphere(p - vec3( 0.5, 0.3, 0.0), 0.6);
    float s3 = sdSphere(p - vec3( 0.0,-0.4, 0.5), 0.5);
    float d = smin(s1, s2, 0.35);
    d = smin(d, s3, 0.35);
    return d;
  } else if (uShapeType == 1) {
    // Scene B: box + torus
    float b = sdBox(p - vec3(0.0, 0.0, 0.0), vec3(0.55, 0.35, 0.35));
    float t = sdTorus(p - vec3(0.0, 0.0, 0.0), vec2(0.65, 0.22));
    return smin(b, t, 0.25);
  } else {
    // Scene C: complex compound
    float ground = p.y + 0.8;
    float s1 = sdSphere(p - vec3( 0.0, 0.0, 0.0), 0.55);
    float b  = sdBox(p - vec3( 0.8, 0.1, 0.3), vec3(0.3, 0.25, 0.25));
    float t  = sdTorus(p - vec3(-0.7, 0.1,-0.2), vec2(0.45, 0.18));
    float obj = smin(s1, smin(b, t, 0.3), 0.3);
    return min(ground, obj);
  }
}

// ── Normal via gradient ─────────────────────────────────────────────────────
vec3 calcNormal(vec3 p) {
  const float e = 0.0005;
  return normalize(vec3(
    sceneSDF(p + vec3(e,0,0)) - sceneSDF(p - vec3(e,0,0)),
    sceneSDF(p + vec3(0,e,0)) - sceneSDF(p - vec3(0,e,0)),
    sceneSDF(p + vec3(0,0,e)) - sceneSDF(p - vec3(0,0,e))
  ));
}

// ── Soft shadow ─────────────────────────────────────────────────────────────
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  for (int i = 0; i < 48; i++) {
    float h = sceneSDF(ro + rd * t);
    if (h < 0.001) return 0.0;
    res = min(res, k * h / t);
    t += clamp(h, 0.02, 0.2);
    if (t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}

// ── Ambient occlusion ───────────────────────────────────────────────────────
float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h  = 0.01 + 0.12 * float(i) / 4.0;
    float d  = sceneSDF(p + h * n);
    occ += (h - d) * sca;
    sca *= 0.85;
    if (occ > 0.35) break;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// ── Raymarching ─────────────────────────────────────────────────────────────
float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < 128; i++) {
    float d = sceneSDF(ro + rd * t);
    if (d < 0.0008 || t > 40.0) break;
    t += d * 0.85;
  }
  return t;
}

// ── Camera matrix ───────────────────────────────────────────────────────────
mat3 setCamera(vec3 ro, vec3 ta) {
  vec3 cw = normalize(ta - ro);
  vec3 cp = vec3(0.0, 1.0, 0.0);
  vec3 cu = normalize(cross(cw, cp));
  vec3 cv = cross(cu, cw);
  return mat3(cu, cv, cw);
}

// ── Main ────────────────────────────────────────────────────────────────────
void main() {
  vec2 fragCoord = vUv * uResolution;
  vec2 uv = (fragCoord - 0.5 * uResolution) / uResolution.y;

  float time = uTime * uCameraSpeed;

  vec3 ro = uCameraPos + vec3(
    sin(time * 0.7) * 2.2,
    sin(time * 0.4) * 0.8 + 0.5,
    cos(time * 0.5) * 2.2
  );

  vec3 ta = uCameraTarget;
  mat3 cam = setCamera(ro, ta);
  vec3 rd = cam * normalize(vec3(uv, 1.6));

  float t = raymarch(ro, rd);

  vec3 col = vec3(0.05, 0.05, 0.1); // background

  if (t < 38.0) {
    vec3 p  = ro + rd * t;
    vec3 n  = calcNormal(p);
    vec3 l  = normalize(uLightPos - p);
    vec3 v  = normalize(ro - p);
    vec3 h  = normalize(l + v);

    float diff = max(dot(n, l), 0.0);
    float spec = pow(max(dot(n, h), 0.0), 64.0);
    float sha  = softShadow(p + n * 0.005, l, 0.02, 12.0, 8.0);
    float ao   = ambientOcclusion(p, n);

    float amb  = 0.12 * ao;
    float lit  = diff * sha;

    // Palette based on position
    vec3 baseCol = 0.55 + 0.45 * cos(vec3(0.0, 0.6, 1.0) + length(p) * 1.2 + vec3(0.0, 2.0, 4.0));

    col = baseCol * (amb + lit) + vec3(0.9, 0.95, 1.0) * spec * sha * 0.4;
    col *= ao;
    col = mix(col, vec3(0.05, 0.05, 0.1), 1.0 - exp(-0.015 * t * t));
  }

  // Gamma
  col = pow(col, vec3(0.4545));

  gl_FragColor = vec4(col, 1.0);
}`;

const uniforms = {
  uResolution:  { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uTime:        { value: 0.0 },
  uCameraPos:   { value: new THREE.Vector3(0, 0.5, 3) },
  uCameraTarget:{ value: new THREE.Vector3(0, 0, 0) },
  uCameraSpeed: { value: 1.0 },
  uLightPos:    { value: new THREE.Vector3(3, 5, 4) },
  uShapeType:   { value: 0 },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
});

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(mesh);

// ─── OrbitControls (overrides animation on drag) ───────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enableZoom = true;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};

// Store user camera override
let userCameraOverride = false;
let userCameraPos = new THREE.Vector3(0, 0.5, 3);
let userCameraTarget = new THREE.Vector3(0, 0, 0);

controls.addEventListener('start', () => { userCameraOverride = true; });
controls.addEventListener('change', () => {
  userCameraPos.copy(controls.object.position);
  userCameraTarget.copy(controls.target);
});

// ─── lil-gui ─────────────────────────────────────────────────────────────────
const params = {
  cameraSpeed: 1.0,
  shapeType: 'Spheres (smooth union)',
  lightX: 3,
  lightY: 5,
  lightZ: 4,
};

const shapeLabels = ['Spheres (smooth union)', 'Box + Torus', 'Compound Scene'];

const gui = new GUI({ title: 'SDF Raymarching' });
gui.add(params, 'cameraSpeed', 0.1, 3.0).name('Camera Speed').onChange(v => {
  uniforms.uCameraSpeed.value = v;
});
gui.add(params, 'shapeType', shapeLabels).name('Shape Type').onChange(v => {
  uniforms.uShapeType.value = shapeLabels.indexOf(v);
});
gui.add(params, 'lightX', -10, 10).name('Light X').onChange(updateLight);
gui.add(params, 'lightY', -10, 15).name('Light Y').onChange(updateLight);
gui.add(params, 'lightZ', -10, 10).name('Light Z').onChange(updateLight);

function updateLight() {
  uniforms.uLightPos.value.set(params.lightX, params.lightY, params.lightZ);
}

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

// ─── Animate ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (!userCameraOverride) {
    uniforms.uCameraPos.value.copy(userCameraPos);
    uniforms.uCameraTarget.value.copy(userCameraTarget);
  } else {
    uniforms.uCameraPos.value.copy(userCameraPos);
    uniforms.uCameraTarget.value.copy(userCameraTarget);
  }

  uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}

animate();