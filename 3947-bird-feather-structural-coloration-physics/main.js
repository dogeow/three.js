// 3947. Bird Feather Structural Coloration Physics
// Simulates structural coloration via thin-film interference and melanin granule scattering
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050a14);
scene.fog = new THREE.FogExp2(0x050a14, 0.02);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 8, 20);
camera.lookAt(0, 2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x203040, 0.6));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(10, 20, 10);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x6080ff, 0.5, 50);
rimLight.position.set(-15, 5, -10);
scene.add(rimLight);

// Feather barb simulation using instanced mesh
const barbCount = 40;
const barbsPerFeather = 60;
const featherCount = 8;

const barbGeo = new THREE.CylinderGeometry(0.03, 0.06, 3.0, 6);
const barbInstances = [];

// Color variations based on structural parameters
const featherTypes = [
  { name: 'Peacock Blue', baseHue: 0.58, melanin: 0.1, keratin: 0.9 },
  { name: 'Peacock Green', baseHue: 0.35, melanin: 0.1, keratin: 0.9 },
  { name: 'Hummingbird Violet', baseHue: 0.75, melanin: 0.05, keratin: 0.95 },
  { name: 'Bird of Paradise Orange', baseHue: 0.08, melanin: 0.2, keratin: 0.8 },
  { name: 'Morpho Blue', baseHue: 0.62, melanin: 0.02, keratin: 0.98 },
  { name: 'Kingfisher Cyan', baseHue: 0.52, melanin: 0.08, keratin: 0.92 },
];

// Thin-film interference shader for structural color
const structuralColorVert = `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const structuralColorFrag = `
uniform float uTime;
uniform float uHue;
uniform float uMelanin;
uniform float uKeratin;
uniform vec3 uLightDir;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
varying vec3 vWorldPos;

// HSB to RGB
vec3 hsb2rgb(float h, float s, float b) {
  vec3 c = vec3(h, s, b);
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

// Thin-film interference: path difference = 2 * n * d * cos(theta)
float thinFilmInterference(float wavelength, float thickness, float n, float cosTheta) {
  float delta = (4.0 * Math.PI * n * thickness * cosTheta) / wavelength;
  float r = 0.5 + 0.5 * cos(delta);
  return r;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uLightDir);

  float cosTheta = abs(dot(V, N));
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

  // Iridescence angle shift
  float angleShift = sinTheta * (1.0 - uMelanin) * 2.0;

  // Melanin absorption (darker at normal incidence)
  float melaninEffect = uMelanin * (1.0 - cosTheta * 0.5);

  // keratin layer thickness variation creates color
  float keratinThick = uKeratin * 300.0; // nm
  float n_keratin = 1.55;

  // Compute interference for RGB wavelengths
  float r = thinFilmInterference(650.0, keratinThick, n_keratin, cosTheta);
  float g = thinFilmInterference(510.0, keratinThick, n_keratin, cosTheta);
  float b = thinFilmInterference(475.0, keratinThick, n_keratin, cosTheta);

  vec3 structuralColor = vec3(r, g, b);

  // Hue shift with angle
  float shiftedHue = mod(uHue + angleShift * 0.15, 1.0);
  vec3 hueColor = hsb2rgb(shiftedHue, 0.8, 1.0);

  // Mix structural color with hue color
  vec3 baseColor = mix(structuralColor, hueColor, 0.5);

  // Diffuse lighting
  float diff = max(dot(N, L), 0.0);
  vec3 ambient = 0.15 * baseColor;

  // Specular (glossy barb surface)
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 80.0);

  // Combine
  vec3 finalColor = ambient + diff * baseColor * (1.0 - melaninEffect * 0.5) + spec * 0.4;

  // Melanin darkening
  finalColor *= (1.0 - melaninEffect * 0.7);

  // Iridescent shimmer
  float shimmer = sin(uTime * 2.0 + vWorldPos.x * 0.5 + vWorldPos.y * 0.3) * 0.05;
  finalColor += shimmer;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

const featherMaterials = featherTypes.map(ft => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHue: { value: ft.baseHue },
      uMelanin: { value: ft.melanin },
      uKeratin: { value: ft.keratin },
      uLightDir: { value: new THREE.Vector3(10, 20, 10).normalize() }
    },
    vertexShader: structuralColorVert,
    fragmentShader: structuralColorFrag,
  });
});

// Create feathers
const feathers = [];

for (let f = 0; f < featherCount; f++) {
  const featherGroup = new THREE.Group();
  const ft = featherTypes[f % featherTypes.length];
  const mat = featherMaterials[f % featherMaterials.length].clone();

  // Rachis (central shaft)
  const rachisGeo = new THREE.CylinderGeometry(0.08, 0.1, 8, 8);
  const rachisMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });
  const rachis = new THREE.Mesh(rachisGeo, rachisMat);
  rachis.position.y = 4;
  featherGroup.add(rachis);

  // Barbs (individual filaments)
  const barbMat = mat;

  for (let b = 0; b < barbsPerFeather; b++) {
    const barbInst = new THREE.InstancedMesh(barbGeo, barbMat, barbCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < barbCount; i++) {
      const t = b / barbsPerFeather;
      const y = t * 7.5;
      const spread = Math.sin(t * Math.PI) * 1.5;

      dummy.position.set(
        (i - barbCount / 2) * (spread * 2 / barbCount),
        y,
        0
      );
      dummy.rotation.z = spread * 0.05;
      dummy.scale.setScalar(1.0 - t * 0.3);
      dummy.updateMatrix();
      barbInst.setMatrixAt(i, dummy.matrix);
    }

    barbInst.instanceMatrix.needsUpdate = true;
    featherGroup.add(barbInst);
  }

  // Barbules (tiny hooks) - simplified as small spheres
  for (let b = 0; b < 20; b++) {
    const t = b / 20;
    const y = t * 7;
    const barbuleGeo = new THREE.SphereGeometry(0.05, 4, 3);
    const barbule = new THREE.Mesh(barbuleGeo, mat);
    barbule.position.set(
      (Math.random() - 0.5) * 0.5,
      y,
      (Math.random() - 0.5) * 0.5
    );
    featherGroup.add(barbule);
  }

  // Position feathers in a fan
  const angle = (f / featherCount) * Math.PI * 2;
  featherGroup.position.set(
    Math.cos(angle) * 3,
    0,
    Math.sin(angle) * 3
  );
  featherGroup.rotation.y = angle;
  featherGroup.rotation.x = 0.3;

  scene.add(featherGroup);
  feathers.push({ group: featherGroup, mat, angle });
}

// Ground plane
const groundGeo = new THREE.PlaneGeometry(60, 60);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 1.0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
scene.add(ground);

// Light direction (for shader uniform)
const lightDir = new THREE.Vector3(10, 20, 10).normalize();

// Camera orbit
let orbitAngle = 0;
let mouseDown = false, lastX = 0;
renderer.domElement.addEventListener('mousedown', e => { mouseDown = true; lastX = e.clientX; });
window.addEventListener('mouseup', () => mouseDown = false);
window.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  orbitAngle -= (e.clientX - lastX) * 0.005;
  lastX = e.clientX;
});
window.addEventListener('wheel', e => {
  camera.position.z = Math.max(10, Math.min(50, camera.position.z + e.deltaY * 0.05));
});

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const t = now / 1000;

  // Update shader uniforms
  featherMaterials.forEach(mat => {
    mat.uniforms.uTime.value = t;
  });

  // Gently animate feathers
  feathers.forEach((f, i) => {
    f.group.rotation.z = Math.sin(t * 0.5 + i * 0.8) * 0.05;
    f.group.rotation.x = 0.3 + Math.sin(t * 0.3 + i) * 0.03;
  });

  orbitAngle += dt * 0.1;
  camera.position.x = Math.sin(orbitAngle) * 20;
  camera.position.z = Math.cos(orbitAngle) * 20;
  camera.position.y = 8 + Math.sin(orbitAngle * 0.4) * 2;
  camera.lookAt(0, 2, 0);

  renderer.render(scene, camera);
}
animate();
