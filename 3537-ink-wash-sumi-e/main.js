// 3537. Ink Wash Sumi E
// Ink Wash Sumi E — traditional East Asian ink painting simulation
// type: ink-wash
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf5f0e8) // rice paper color
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
camera.position.z = 1
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const p = {
  brushSize: 0.04,
  brushIntensity: 0.9,
  noiseScale: 8.0,
  timeScale: 0.15,
  edgeDarken: 0.7,
  paperTexture: 0.15,
  bamboo: true,
  mountain: true,
  water: true,
}

const geo = new THREE.PlaneGeometry(2, 2)
const uniforms = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
  uBrushSize: { value: p.brushSize },
  uBrushIntensity: { value: p.brushIntensity },
  uNoiseScale: { value: p.noiseScale },
  uTimeScale: { value: p.timeScale },
  uEdgeDarken: { value: p.edgeDarken },
  uPaperTexture: { value: p.paperTexture },
  uBamboo: { value: 1.0 },
  uMountain: { value: 1.0 },
  uWater: { value: 1.0 },
}

const mat = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform vec2 uResolution; uniform float uBrushSize; uniform float uBrushIntensity; uniform float uNoiseScale; uniform float uTimeScale; uniform float uEdgeDarken; uniform float uPaperTexture; uniform float uBamboo; uniform float uMountain; uniform float uWater; varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; } return v; }

    // Ink brush stroke SDF
    float brushStroke(vec2 uv, vec2 a, vec2 b, float width) {
      vec2 dir = b - a;
      float len = length(dir);
      dir = dir / max(len, 0.001);
      vec2 p = uv - a;
      float t = clamp(dot(p, dir), 0.0, len);
      vec2 proj = a + dir * t;
      float d = length(uv - proj);
      return smoothstep(width, width * 0.3, d);
    }

    // Ink bleeding effect
    float inkBleed(vec2 uv, float ink) {
      float n = fbm(uv * uNoiseScale + uTime * uTimeScale) * 0.3;
      return smoothstep(0.0, 0.5, ink + n);
    }

    // Bamboo stalk
    float bamboo(vec2 uv, float t) {
      float x = abs(uv.x - 0.15);
      float stalk = smoothstep(0.025, 0.015, x);
      float joints = smoothstep(0.003, 0.0, abs(fract(uv.y * 6.0) - 0.5) - 0.45) * smoothstep(0.025, 0.01, x);
      float sway = sin(t * 1.5 + uv.y * 3.0) * 0.01;
      x = abs(uv.x + sway - 0.15);
      float leaves = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float y = uv.y - 0.3 - fi * 0.15;
        float lx = uv.x + sway - (0.15 + sin(fi) * 0.05);
        float leaf = smoothstep(0.06, 0.0, abs(lx) - y * 0.4) * smoothstep(0.0, 0.05, y) * smoothstep(0.4, 0.3, y);
        leaves = max(leaves, leaf);
      }
      return max(stalk, max(joints, leaves));
    }

    // Mountain layers
    float mountains(vec2 uv, float t) {
      float ink = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float amp = 0.15 + fi * 0.05;
        float freq = 2.0 + fi * 1.5;
        float sp = fi * 0.3;
        float h = amp * (noise(vec2(uv.x * freq + t * 0.1 + sp, fi * 10.0)) * 0.5 +
                        noise(vec2(uv.x * freq * 2.0 + t * 0.05 + sp, fi * 5.0)) * 0.3 +
                        noise(vec2(uv.x * freq * 4.0, fi * 3.0)) * 0.2);
        float y = uv.y - (0.55 - fi * 0.12);
        float m = smoothstep(0.008 + h * 0.5, 0.0, y - h);
        float fade = smoothstep(0.0, 0.8, uv.x) * smoothstep(1.0, 0.2, uv.x);
        ink = max(ink, m * fade * (0.9 - fi * 0.2));
      }
      return ink;
    }

    // Water reflection
    float water(vec2 uv, float t) {
      float ripple = noise(vec2(uv.x * 20.0 + t * 0.5, uv.y * 5.0)) * 0.003;
      float surface = smoothstep(0.005, 0.0, abs(uv.y - 0.18 + ripple));
      float reflect = mountains(vec2(uv.x, 0.36 - uv.y + ripple * 2.0), t) * 0.3;
      return max(surface, reflect);
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * uTimeScale;
      float ink = 0.0;

      if (uBamboo > 0.5) {
        for (int i = 0; i < 2; i++) {
          float fi = float(i);
          float x = 0.15 + fi * 0.12;
          float sway = sin(t * 1.5 + fi * 1.5) * 0.008;
          ink = max(ink, bamboo(uv + vec2(sway, 0.0), t) * (0.7 + fi * 0.2));
        }
      }

      if (uMountain > 0.5) ink = max(ink, mountains(uv, t));
      if (uWater > 0.5) ink = max(ink, water(uv, t));

      ink = inkBleed(uv, ink * uBrushIntensity);

      // Paper texture
      float paper = fbm(uv * 80.0) * uPaperTexture;
      float edgeVignette = 1.0 - uEdgeDarken * pow(length(uv - 0.5) * 1.8, 2.5);

      float inkVal = (1.0 - ink) * edgeVignette + paper;
      inkVal = clamp(inkVal, 0.0, 1.0);

      // Sepia ink color
      vec3 inkColor = mix(vec3(0.05, 0.03, 0.02), vec3(0.95, 0.93, 0.88), inkVal);
      gl_FragColor = vec4(inkColor, 1.0);
    }`
})

scene.add(new THREE.Mesh(geo, mat))

const gui = new GUI()
gui.add(p, 'bamboo').name('Bamboo').onChange(v => uniforms.uBamboo.value = v ? 1.0 : 0.0)
gui.add(p, 'mountain').name('Mountains').onChange(v => uniforms.uMountain.value = v ? 1.0 : 0.0)
gui.add(p, 'water').name('Water').onChange(v => uniforms.uWater.value = v ? 1.0 : 0.0)
gui.add(p, 'brushIntensity', 0.3, 1.0).name('Ink Intensity').onChange(v => uniforms.uBrushIntensity.value = v)
gui.add(p, 'paperTexture', 0.0, 0.4).name('Paper Texture').onChange(v => uniforms.uPaperTexture.value = v)
gui.add(p, 'edgeDarken', 0.0, 1.0).name('Edge Darken').onChange(v => uniforms.uEdgeDarken.value = v)

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
