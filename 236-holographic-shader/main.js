import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Scene Setup ───────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000814, 0.08);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ─── Post Processing ────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.4, 0.2
);
composer.addPass(bloomPass);

// RGB Split / Chromatic Aberration Pass
const rgbShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.005 },
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
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      vec2 offset = dir * dist * uAmount;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
};
const rgbPass = new ShaderPass(rgbShader);
composer.addPass(rgbPass);

// ─── Holographic Shader ─────────────────────────────────────────────────────
const holoVertexShader = `
  uniform float uTime;
  uniform float uDistortion;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vFresnel;
  varying float vProximity;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Proximity-based distortion: vertices closer to camera get displaced more
    vec4 worldPos4 = modelMatrix * vec4(pos, 1.0);
    vec3 worldPos = worldPos4.xyz;
    float distToCamera = length(cameraPosition - worldPos);
    float proximity = smoothstep(6.0, 0.5, distToCamera);
    vProximity = proximity;

    // Wave-like distortion
    float wave = sin(pos.y * 4.0 + uTime * 2.0) * 0.05 * proximity;
    float wave2 = cos(pos.x * 3.0 + uTime * 1.5) * 0.04 * proximity;
    pos.x += wave * uDistortion;
    pos.z += wave2 * uDistortion;
    pos.y += sin(pos.x * 5.0 + uTime * 3.0) * 0.03 * proximity * uDistortion;

    // Animated interference pattern
    float interference = sin(pos.x * 10.0 + uTime * 4.0) * cos(pos.y * 10.0 + uTime * 3.0);
    pos += normal * interference * 0.02 * proximity * uDistortion;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos;

    // Fresnel calculation
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 viewDir = normalize(cameraPosition - worldPos);
    vFresnel = pow(1.0 - abs(dot(worldNormal, viewDir)), 3.0);

    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const holoFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uScanlineIntensity;
  uniform float uScanlineCount;
  uniform float uFresnelIntensity;
  uniform float uInterferenceIntensity;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vFresnel;
  varying float vProximity;

  void main() {
    // Scanlines
    float scanline = sin(vWorldPos.y * uScanlineCount + uTime * 3.0) * 0.5 + 0.5;
    scanline = pow(scanline, 1.5) * uScanlineIntensity;

    // Horizontal interference lines
    float interference = sin(vWorldPos.x * 30.0 + uTime * 5.0) * sin(vWorldPos.y * 30.0 - uTime * 3.0);
    interference = pow(abs(interference), 0.5) * uInterferenceIntensity;

    // Moving scan beam
    float scanBeam = fract(vWorldPos.y * 2.0 - uTime * 1.5);
    scanBeam = smoothstep(0.0, 0.1, scanBeam) * smoothstep(0.3, 0.1, scanBeam);
    scanBeam *= 0.5;

    // Fresnel glow
    float fresnel = vFresnel * uFresnelIntensity;

    // Proximity brightness boost
    float proximityBoost = 1.0 + vProximity * 0.8;

    // Combine
    float alpha = uOpacity + fresnel * 0.5 + scanline * 0.2 + scanBeam * 0.3;
    alpha *= proximityBoost;
    alpha = clamp(alpha, 0.0, 1.0);

    // Color with scanline tint
    vec3 color = uColor * (1.0 + fresnel * 2.0 + scanline + scanBeam + interference);
    color += vec3(0.0, fresnel * 0.3, fresnel * 0.5); // cyan shift in fresnel

    // Glitch color flicker
    float glitch = step(0.98, sin(uTime * 47.3) * sin(uTime * 31.7));
    color = mix(color, vec3(1.0, 0.2, 0.4), glitch * 0.3);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ─── Holographic Material ────────────────────────────────────────────────────
const holoMaterial = new THREE.ShaderMaterial({
  vertexShader: holoVertexShader,
  fragmentShader: holoFragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00ffff) },
    uScanlineIntensity: { value: 0.5 },
    uScanlineCount: { value: 80.0 },
    uFresnelIntensity: { value: 2.0 },
    uInterferenceIntensity: { value: 0.3 },
    uOpacity: { value: 0.4 },
    uDistortion: { value: 1.0 },
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// Secondary shell for more hologram density
const holoMaterial2 = new THREE.ShaderMaterial({
  vertexShader: holoVertexShader,
  fragmentShader: holoFragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x0088ff) },
    uScanlineIntensity: { value: 0.3 },
    uScanlineCount: { value: 40.0 },
    uFresnelIntensity: { value: 1.5 },
    uInterferenceIntensity: { value: 0.2 },
    uOpacity: { value: 0.2 },
    uDistortion: { value: 0.6 },
  },
  transparent: true,
  side: THREE.BackSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// ─── Hologram Object ────────────────────────────────────────────────────────
const holoGroup = new THREE.Group();
scene.add(holoGroup);

// Core shape
const coreGeo = new THREE.IcosahedronGeometry(1, 3);
const coreMesh = new THREE.Mesh(coreGeo, holoMaterial);
holoGroup.add(coreMesh);

// Outer shell
const shellMesh = new THREE.Mesh(coreGeo.clone(), holoMaterial2);
holoGroup.add(shellMesh);

// Inner ring
const ringGeo = new THREE.TorusGeometry(1.4, 0.02, 8, 64);
const ringMat = holoMaterial.clone();
ringMat.uniforms.uColor.value = new THREE.Color(0x00aaff);
ringMat.uniforms.uScanlineCount.value = 120.0;
const ring1 = new THREE.Mesh(ringGeo, ringMat);
ring1.rotation.x = Math.PI / 2;
holoGroup.add(ring1);

const ring2 = ring1.clone();
ring2.rotation.x = Math.PI / 3;
ring2.rotation.y = Math.PI / 4;
holoGroup.add(ring2);

const ring3 = ring1.clone();
ring3.rotation.x = -Math.PI / 5;
ring3.rotation.z = Math.PI / 6;
holoGroup.add(ring3);

// Floating particles / data points
const particleCount = 200;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const sizes = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 1.8 + Math.random() * 0.8;
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i * 3 + 2] = r * Math.cos(phi);
  sizes[i] = Math.random() * 3 + 1;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const particleMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float size;
    uniform float uTime;
    varying float vAlpha;
    void main() {
      vAlpha = 0.5 + 0.5 * sin(uTime * 2.0 + position.x * 5.0);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (200.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.0, d) * vAlpha;
      gl_FragColor = vec4(0.0, 0.8, 1.0, a);
    }
  `,
  uniforms: { uTime: { value: 0 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const particles = new THREE.Points(particleGeo, particleMat);
holoGroup.add(particles);

// ─── Ground Grid ─────────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(20, 20, 0x003344, 0x001122);
gridHelper.position.y = -2;
gridHelper.material.opacity = 0.3;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Holographic base plane
const basePlaneGeo = new THREE.PlaneGeometry(6, 6);
const basePlaneMat = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);

      // Radial scan
      float angle = atan(center.y, center.x);
      float radial = fract(angle / 6.2832 + uTime * 0.1);

      // Concentric rings
      float ring = fract(dist * 8.0 - uTime * 0.3);
      ring = smoothstep(0.0, 0.05, ring) * smoothstep(0.15, 0.05, ring);

      // Grid lines
      float gridX = smoothstep(0.02, 0.0, abs(fract(vUv.x * 10.0) - 0.5));
      float gridY = smoothstep(0.02, 0.0, abs(fract(vUv.y * 10.0) - 0.5));
      float grid = max(gridX, gridY) * 0.3;

      float alpha = (ring * 0.4 + grid + radial * 0.1) * (1.0 - smoothstep(0.3, 0.5, dist));
      alpha *= 0.5;

      gl_FragColor = vec4(0.0, 0.6, 1.0, alpha);
    }
  `,
  uniforms: { uTime: { value: 0 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});
const basePlane = new THREE.Mesh(basePlaneGeo, basePlaneMat);
basePlane.rotation.x = -Math.PI / 2;
basePlane.position.y = -1.99;
scene.add(basePlane);

// ─── Ambient Light ───────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x001133, 0.5);
scene.add(ambient);

// ─── GUI ─────────────────────────────────────────────────────────────────────
const params = {
  color: '#00ffff',
  scanlineIntensity: 0.5,
  scanlineCount: 80,
  fresnelIntensity: 2.0,
  interferenceIntensity: 0.3,
  opacity: 0.4,
  distortion: 1.0,
  bloomStrength: 0.8,
  rgbSplit: 0.005,
  rotationSpeed: 1.0,
  particleCount: 200,
};

const gui = new GUI({ title: 'Holographic Controls' });
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '10px';
gui.domElement.style.right = '10px';

const holoFolder = gui.addFolder('Hologram');
holoFolder.addColor(params, 'color').name('Color').onChange(v => {
  const c = new THREE.Color(v);
  holoMaterial.uniforms.uColor.value = c;
  ringMat.uniforms.uColor.value = c;
});
holoFolder.add(params, 'opacity', 0, 1).name('Opacity').onChange(v => {
  holoMaterial.uniforms.uOpacity.value = v;
});
holoFolder.add(params, 'fresnelIntensity', 0, 5).name('Fresnel').onChange(v => {
  holoMaterial.uniforms.uFresnelIntensity.value = v;
});
holoFolder.add(params, 'scanlineIntensity', 0, 1).name('Scanline').onChange(v => {
  holoMaterial.uniforms.uScanlineIntensity.value = v;
});
holoFolder.add(params, 'scanlineCount', 10, 200).name('Scanline #').onChange(v => {
  holoMaterial.uniforms.uScanlineCount.value = v;
});
holoFolder.add(params, 'interferenceIntensity', 0, 1).name('Interference').onChange(v => {
  holoMaterial.uniforms.uInterferenceIntensity.value = v;
});
holoFolder.add(params, 'distortion', 0, 3).name('Distortion').onChange(v => {
  holoMaterial.uniforms.uDistortion.value = v;
  holoMaterial2.uniforms.uDistortion.value = v * 0.6;
});

const fxFolder = gui.addFolder('Effects');
fxFolder.add(params, 'bloomStrength', 0, 2).name('Bloom').onChange(v => {
  bloomPass.strength = v;
});
fxFolder.add(params, 'rgbSplit', 0, 0.02).name('RGB Split').onChange(v => {
  rgbPass.uniforms.uAmount.value = v;
});
fxFolder.add(params, 'rotationSpeed', 0, 3).name('Rotation');

gui.open();

// ─── Animation ───────────────────────────────────────────────────────────────
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;

  holoMaterial.uniforms.uTime.value = t;
  holoMaterial2.uniforms.uTime.value = t;
  ringMat.uniforms.uTime.value = t;
  particleMat.uniforms.uTime.value = t;
  basePlaneMat.uniforms.uTime.value = t;

  holoGroup.rotation.y = t * 0.3 * params.rotationSpeed;
  holoGroup.rotation.x = Math.sin(t * 0.2) * 0.1;

  ring1.rotation.z = t * 0.5 * params.rotationSpeed;
  ring2.rotation.z = -t * 0.4 * params.rotationSpeed;
  ring3.rotation.y = t * 0.3 * params.rotationSpeed;

  composer.render();
}
animate();

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});