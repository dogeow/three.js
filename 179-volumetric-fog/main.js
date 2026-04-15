import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
import GUI from 'https://unpkg.com/lil-gui@0.19.2/dist/lil-gui.esm.min.js';

// ── Scene setup ─────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06080f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 9);
camera.lookAt(0, 0, 0);

// ── Lighting ──────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x1a1f3a, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 2.5);
dirLight.position.set(5, 8, 3);
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x4488ff, 6, 20);
pointLight.position.set(-4, 3, -2);
scene.add(pointLight);

// ── Geometry ─────────────────────────────────────────────────────────────────
const geoBox = new THREE.BoxGeometry(1.8, 1.8, 1.8);
const geoSphere = new THREE.SphereGeometry(1.0, 32, 32);
const geoTorus = new THREE.TorusGeometry(0.9, 0.35, 24, 60);

const matStd = new THREE.MeshStandardMaterial({
  color: 0xcdd6f4,
  roughness: 0.25,
  metalness: 0.6,
});

// Center box
const boxCenter = new THREE.Mesh(geoBox, matStd.clone());
boxCenter.material.color.set(0xe06c75);
boxCenter.position.set(0, 0.1, 0);
scene.add(boxCenter);

// Orbiting spheres
const spheres = [];
const sphereDefs = [
  { pos: [-3.2, 0.8, -1.0], color: 0x89b4fa, r: 0.9 },
  { pos: [ 3.5,-0.4, -1.5], color: 0xa6e3a1, r: 0.7 },
  { pos: [ 1.2, 1.2, -3.5], color: 0xf5c2e7, r: 0.8 },
  { pos: [-1.5,-1.0, -2.0], color: 0xf9e2af, r: 0.6 },
];
for (const d of sphereDefs) {
  const m = new THREE.Mesh(geoSphere, matStd.clone());
  m.material.color.set(d.color);
  m.position.set(...d.pos);
  m.scale.setScalar(d.r);
  scene.add(m);
  spheres.push(m);
}

// Torus
const torusMesh = new THREE.Mesh(geoTorus, matStd.clone());
torusMesh.material.color.set(0x89dceb);
torusMesh.position.set(-2.5, -0.5, 1.0);
torusMesh.rotation.x = 0.5;
scene.add(torusMesh);

// Ground plane (subtle)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.9, metalness: 0.1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.0;
scene.add(ground);

// ── Fog parameters (GUI-controlled) ─────────────────────────────────────────
const fogParams = {
  density:      0.12,
  color:        '#6b7aff',
  animSpeed:    0.30,
  brightness:   1.20,
};

// ── Volumetric fog shader pass ───────────────────────────────────────────────
const VolumetricFogShader = {
  uniforms: {
    tDiffuse:       { value: null },
    uCameraPos:     { value: new THREE.Vector3() },
    uCameraMatrix:  { value: new THREE.Matrix4() },
    uInvProj:       { value: new THREE.Matrix4() },
    uResolution:    { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTime:          { value: 0.0 },
    uFogDensity:    { value: fogParams.density },
    uFogColor:      { value: new THREE.Color(fogParams.color) },
    uAnimSpeed:     { value: fogParams.animSpeed },
    uBrightness:    { value: fogParams.brightness },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;

    uniform sampler2D tDiffuse;
    uniform vec3  uCameraPos;
    uniform mat4  uCameraMatrix;
    uniform mat4  uInvProj;
    uniform vec2  uResolution;
    uniform float uTime;
    uniform float uFogDensity;
    uniform vec3  uFogColor;
    uniform float uAnimSpeed;
    uniform float uBrightness;

    varying vec2 vUv;

    // ── SDF helpers ──────────────────────────────────────────────────────────

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

    // Scene SDF — returns distance to closest surface
    float sceneSDF(vec3 p) {
      // 5 spheres (matches JS sphereDefs + centre box)
      float d = sdSphere(p - vec3( 0.0, 0.1, 0.0), 0.9);
      d = min(d, sdSphere(p - vec3(-3.2, 0.8,-1.0), 0.9));
      d = min(d, sdSphere(p - vec3( 3.5,-0.4,-1.5), 0.7));
      d = min(d, sdSphere(p - vec3( 1.2, 1.2,-3.5), 0.8));
      d = min(d, sdSphere(p - vec3(-1.5,-1.0,-2.0), 0.6));
      // centre box
      d = min(d, sdBox(p - vec3(0.0, 0.1, 0.0), vec3(0.9, 0.9, 0.9)));
      // torus
      d = min(d, sdTorus(p - vec3(-2.5, -0.5, 1.0), vec2(0.9, 0.35)));
      return d;
    }

    // ── Noise / FBM for fog density ─────────────────────────────────────────

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f); // smoothstep
      return mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z
      );
    }

    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p  = p * 2.1 + vec3(31.7, 17.3, 5.9);
        a *= 0.5;
      }
      return v;
    }

    // ── Fog density field ────────────────────────────────────────────────────

    float fogDensity(vec3 p) {
      // animated low-freq FBM
      vec3 ap = p * 0.5 + vec3(uTime * uAnimSpeed * 0.15,
                               uTime * uAnimSpeed * 0.10,
                               uTime * uAnimSpeed * 0.12);
      float base = fbm(ap);
      // height falloff — denser near ground
      float h = exp(-max(p.y + 1.5, 0.0) * 0.7);
      return base * h;
    }

    // ── Main ────────────────────────────────────────────────────────────────

    void main() {
      vec4 sceneColor = texture2D(tDiffuse, vUv);

      // Reconstruct world-space ray direction from UV
      vec2 ndc = vUv * 2.0 - 1.0;
      vec4 clipPos = vec4(ndc, 1.0, 1.0);
      vec4 viewPos = uInvProj * clipPos;
      viewPos /= viewPos.w;
      vec3 rayDir = normalize((uCameraMatrix * vec4(viewPos.xyz, 0.0)).xyz);

      // Ray start = camera position
      vec3 rayOrigin = uCameraPos;

      // March through the fog
      float t      = 0.3;
      float tMax   = 25.0;
      int   steps  = 64;
      float stepSz = (tMax - 0.3) / float(steps);

      float fogAcc   = 0.0;
      float transmit = 1.0;

      for (int i = 0; i < 64; i++) {
        if (transmit < 0.01) break;

        vec3 p = rayOrigin + rayDir * t;

        // Skip sampling inside geometry (near-zero SDF = solid)
        float sdf = sceneSDF(p);
        if (sdf < 0.1) {
          t += max(stepSz * 0.5, -sdf * 0.5);
          continue;
        }

        float d = fogDensity(p) * uFogDensity;
        d = clamp(d, 0.0, 1.0);

        float absorption = d * stepSz * 3.5;
        fogAcc   += transmit * d * stepSz * 8.0;
        transmit *= exp(-absorption);

        t += stepSz;
      }

      fogAcc = clamp(fogAcc * uBrightness, 0.0, 1.0);

      vec3 finalColor = mix(sceneColor.rgb, uFogColor, fogAcc);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

// ── Post-processing composer ─────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const fogPass = new ShaderPass(VolumetricFogShader);
composer.addPass(fogPass);

// ── lil-gui ──────────────────────────────────────────────────────────────────
const gui = new GUI({ title: 'Volumetric Fog' });
gui.add(fogParams, 'density',   0.0, 0.5,  0.01).name('Density').onChange(v => {
  fogPass.uniforms.uFogDensity.value = v;
});
gui.addColor(fogParams, 'color').name('Color').onChange(v => {
  fogPass.uniforms.uFogColor.value.set(v);
});
gui.add(fogParams, 'animSpeed', 0.0, 1.5,  0.01).name('Anim Speed').onChange(v => {
  fogPass.uniforms.uAnimSpeed.value = v;
});
gui.add(fogParams, 'brightness',0.5, 3.0,  0.05).name('Brightness').onChange(v => {
  fogPass.uniforms.uBrightness.value = v;
});

// ── Animation loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  // Camera slowly orbits
  const r = 9.0;
  camera.position.x = Math.sin(t * 0.18) * r;
  camera.position.z = Math.cos(t * 0.18) * r;
  camera.position.y = 2.0 + Math.sin(t * 0.13) * 0.8;
  camera.lookAt(0, 0, 0);

  // Torus spins
  torusMesh.rotation.z = t * 0.4;

  // Update fog uniforms
  fogPass.uniforms.uTime.value = t;
  fogPass.uniforms.uCameraPos.value.copy(camera.position);
  fogPass.uniforms.uCameraMatrix.value.copy(camera.matrixWorld);
  fogPass.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse);

  composer.render();
}

animate();

// ── Resize handler ────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  fogPass.uniforms.uResolution.value.set(w, h);
});