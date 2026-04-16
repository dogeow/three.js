// 3534. Generative Art Interactive
// Generative Art Interactive — click and drag to create generative art
// type: generative-art
import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
camera.position.z = 1
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const geo = new THREE.PlaneGeometry(2, 2)
const uniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
  uMode: { value: 0 },
  uComplexity: { value: 6.0 },
  uColorShift: { value: 0.5 },
}
const mat = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform vec2 uMouse; uniform vec2 uResolution; uniform float uMode; uniform float uComplexity; uniform float uColorShift; varying vec2 vUv;
    vec3 palette(float t) { return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0,0.33,0.67) + t)); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
    void main() {
      vec2 uv = vUv - 0.5;
      float t = uTime * 0.3;
      vec3 col = vec3(0.0);
      float n = fbm(uv * uComplexity + t);
      if (uMode < 0.5) {
        // Geometric: rotating squares with color palettes
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          vec2 p = uv * (1.0 + fi * 0.3);
          float a = t * (1.0 + fi * 0.2) + fi * 0.785;
          float c = cos(a), s = sin(a);
          p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
          float d = max(abs(p.x), abs(p.y));
          float ring = smoothstep(0.4 + n * 0.3, 0.41 + n * 0.3, d) - smoothstep(0.42 + n * 0.3, 0.43 + n * 0.3, d);
          col += palette(fi / 8.0 + uColorShift + n * 0.5) * ring * 0.8;
        }
      } else if (uMode < 1.5) {
        // Flow field
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 p = uv;
          vec2 flow = vec2(fbm(p + t + fi), fbm(p - t * 0.7 + fi));
          float line = sin((p.x + flow.x * 2.0) * 10.0 * uComplexity + t * 2.0 + fi);
          col[i] += smoothstep(0.0, 0.05, line * 0.02 + 0.5 - abs(p.y + flow.y));
        }
        col *= palette(uColorShift + n);
      } else {
        // Spiral moiré
        float r = length(uv);
        float a = atan(uv.y, uv.x);
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          float spiral = sin(a * (3.0 + fi) - r * 20.0 * uComplexity + t * 3.0 + fi * 2.0);
          col += palette(fi / 5.0 + uColorShift) * smoothstep(0.0, 0.5, spiral) * (1.0 - r) * 0.6;
        }
      }
      col = pow(col, vec3(0.9));
      gl_FragColor = vec4(col, 1.0);
    }`
})

const mesh = new THREE.Mesh(geo, mat)
scene.add(mesh)

const mouse = new THREE.Vector2(0.5, 0.5)
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX / innerWidth
  mouse.y = 1.0 - e.clientY / innerHeight
  uniforms.uMouse.value.copy(mouse)
})
window.addEventListener('click', e => {
  uniforms.uMode.value = (uniforms.uMode.value + 1) % 3
})

const gui = new GUI()
gui.add(uniforms.uMode, 'value', { 'Geometric': 0, 'Flow Field': 1, 'Spiral Moiré': 2 }).name('Mode')
gui.add(uniforms.uComplexity, 'value', 1, 15).name('Complexity')
gui.add(uniforms.uColorShift, 'value', 0, 1).name('Color Shift')

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  uniforms.uTime.value = clock.getElapsedTime()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  uniforms.uResolution.value.set(innerWidth, innerHeight)
})
