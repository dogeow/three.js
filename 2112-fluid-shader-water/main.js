import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000510);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 8, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const waterGeo = new THREE.PlaneGeometry(30, 30, 128, 128);
const waterMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uResolution: { value: new THREE.Vector2(30, 30) } },
  vertexShader: `
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;
    varying float vElevation;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float wx = pos.x / uResolution.x * 6.0;
      float wz = pos.y / uResolution.y * 6.0;
      float wave = sin(wx * 2.0 + uTime * 1.5) * 0.3;
      wave += sin(wz * 3.0 + uTime * 1.2) * 0.2;
      wave += sin((wx + wz) * 4.0 + uTime * 2.0) * 0.1;
      pos.z = wave;
      vElevation = wave;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uMouse;
    varying vec2 vUv;
    varying float vElevation;
    void main() {
      vec3 deep = vec3(0.0, 0.02, 0.1);
      vec3 shallow = vec3(0.0, 0.3, 0.5);
      float t = clamp((vElevation + 0.6) / 1.2, 0.0, 1.0);
      vec3 color = mix(deep, shallow, t);
      float foam = smoothstep(0.4, 0.7, t);
      color = mix(color, vec3(0.8, 0.95, 1.0), foam * 0.4);
      float fresnel = pow(1.0 - abs(dot(vec3(0.0, 1.0, 0.0), normalize(vec3(0.0, 1.0, 1.0)))), 2.0);
      color += vec3(0.0, 0.15, 0.3) * fresnel;
      float caustic = sin(vUv.x * 40.0 + uTime * 3.0) * sin(vUv.y * 40.0 + uTime * 2.5);
      caustic = caustic * 0.5 + 0.5;
      color += vec3(0.0, 0.08, 0.15) * caustic * t;
      gl_FragColor = vec4(color, 0.92);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI / 2;
scene.add(water);

const skyGeo = new THREE.SphereGeometry(200, 32, 32);
const skyMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vPos;
    void main() {
      float h = normalize(vPos).y * 0.5 + 0.5;
      vec3 horizon = vec3(0.0, 0.01, 0.05);
      vec3 zenith = vec3(0.0, 0.02, 0.08);
      vec3 col = mix(horizon, zenith, h);
      float stars = step(0.998, fract(sin(dot(normalize(vPos).xy * 100.0, vec2(12.9898, 78.233))) * 43758.5453));
      col += vec3(stars * 0.6);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.BackSide
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshStandardMaterial({ color: 0xdddeee, emissive: 0xeeeeff, emissiveIntensity: 0.5 }));
moon.position.set(40, 60, -80);
scene.add(moon);

const dirLight = new THREE.DirectionalLight(0x4466aa, 0.6);
dirLight.position.set(-10, 20, 10);
scene.add(dirLight);
const ambLight = new THREE.AmbientLight(0x112244, 0.5);
scene.add(ambLight);

const mouse = new THREE.Vector2();
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX / window.innerWidth;
  mouse.y = 1.0 - e.clientY / window.innerHeight;
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  waterMat.uniforms.uTime.value = t;
  waterMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
  skyMat.uniforms.uTime.value = t;
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
