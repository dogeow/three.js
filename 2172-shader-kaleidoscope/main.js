// 2172. 着色器万花筒 — Enhanced Edition
// 着色器万花筒效果 + 鼠标交互 + 分段控制
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
camera.position.z = 5

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// ─── UI Controls ─────────────────────────────────────────────────────────────
const params = {
  segments: 8,
  speed: 1.0,
  scale: 1.0,
  hueShift: 0.0,
  symmetry: 8,
  mouseInfluence: 0.3
}

const gui = { el: null }
function buildUI() {
  const div = document.createElement('div')
  div.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(0,0,0,0.7);color:#fff;padding:16px;border-radius:8px;font-family:monospace;font-size:13px;z-index:100;min-width:200px'
  div.innerHTML = `
    <div style="margin-bottom:12px;font-weight:bold;font-size:15px;">🎨 Kaleidoscope Controls</div>
    <div style="margin-bottom:8px">Segments: <span id="segVal">${params.segments}</span></div>
    <input type="range" id="seg" min="3" max="24" value="${params.segments}" style="width:100%">
    <div style="margin-bottom:8px;margin-top:8px">Speed: <span id="spdVal">${params.speed.toFixed(1)}</span></div>
    <input type="range" id="spd" min="0.1" max="3" step="0.1" value="${params.speed}" style="width:100%">
    <div style="margin-bottom:8px;margin-top:8px">Scale: <span id="sclVal">${params.scale.toFixed(1)}</span></div>
    <input type="range" id="scl" min="0.3" max="3" step="0.1" value="${params.scale}" style="width:100%">
    <div style="margin-bottom:8px;margin-top:8px">Hue Shift: <span id="hueVal">${params.hueShift.toFixed(2)}</span></div>
    <input type="range" id="hue" min="0" max="1" step="0.01" value="${params.hueShift}" style="width:100%">
    <div style="margin-top:8px;font-size:11px;opacity:0.6">Mouse: drag to rotate, scroll to zoom</div>
  `
  document.body.appendChild(div)
  gui.el = div

  div.querySelector('#seg').addEventListener('input', (e) => { params.segments = parseInt(e.target.value); div.querySelector('#segVal').textContent = params.segments })
  div.querySelector('#spd').addEventListener('input', (e) => { params.speed = parseFloat(e.target.value); div.querySelector('#spdVal').textContent = params.speed.toFixed(1) })
  div.querySelector('#scl').addEventListener('input', (e) => { params.scale = parseFloat(e.target.value); div.querySelector('#sclVal').textContent = params.scale.toFixed(1) })
  div.querySelector('#hue').addEventListener('input', (e) => { params.hueShift = parseFloat(e.target.value); div.querySelector('#hueVal').textContent = params.hueShift.toFixed(2) })
}
buildUI()

// ─── Kaleidoscope Shader Material ───────────────────────────────────────────
const kaleidoMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSegments: { value: params.segments },
    uSpeed: { value: params.speed },
    uScale: { value: params.scale },
    uHueShift: { value: params.hueShift },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uSegments;
    uniform float uSpeed;
    uniform float uScale;
    uniform float uHueShift;
    uniform vec2 uMouse;
    varying vec2 vUv;

    vec2 kaleido(vec2 uv, float segs) {
      float angle = atan(uv.y, uv.x);
      float r = length(uv);
      float step = 6.28318 / segs;
      angle = mod(angle, step);
      angle = abs(angle - step * 0.5);
      return vec2(cos(angle), sin(angle)) * r;
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float pattern(vec2 p, float t) {
      float v = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float time = t * (0.5 + fi * 0.15);
        vec2 offset = vec2(
          sin(time * 0.8 + fi * 1.3),
          cos(time * 1.1 + fi * 1.7)
        ) * uScale;
        float d = length(p - offset);
        v += 0.5 + 0.5 * sin(d * (8.0 + fi * 2.0) - t * (2.0 + fi * 0.5));
      }
      return v / 5.0;
    }

    void main() {
      vec2 uv = (vUv - 0.5) * 2.0;
      uv.x *= uResolution.x / uResolution.y;

      // 鼠标影响
      vec2 mouse = (uMouse - 0.5) * 2.0;
      uv += mouse * uMouseInfluence * sin(uTime * 0.5);

      // Apply kaleidoscope
      vec2 kUv = kaleido(uv, uSegments);

      // Multiple overlapping patterns
      float t = uTime * uSpeed;
      float p1 = pattern(kUv, t);
      float p2 = pattern(kUv * 1.5 + vec2(0.3, 0.7), t * 0.7);
      float p3 = pattern(kUv * 0.7 - vec2(0.5, 0.2), t * 1.3);

      float final = p1 * 0.5 + p2 * 0.3 + p3 * 0.2;

      // Color mapping with hue shift
      float hue = final * 0.6 + uHueShift + uTime * 0.02;
      vec3 col = hsv2rgb(vec3(hue, 0.9, 1.0));

      // Bright center glow
      float glow = 1.0 - smoothstep(0.0, 1.5, length(kUv));
      col += vec3(0.2, 0.4, 0.8) * glow * 0.5;

      float vig = 1.0 - length(uv) * 0.25;
      col *= vig;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.DoubleSide
})

const geo = new THREE.PlaneGeometry(10, 10)
const mesh = new THREE.Mesh(geo, kaleidoMat)
scene.add(mesh)

// ─── Background Particle Stars ─────────────────────────────────────────────
const starCount = 500
const starPos = new Float32Array(starCount * 3)
for (let i = 0; i < starCount; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 40
  starPos[i * 3 + 1] = (Math.random() - 0.5) * 40
  starPos[i * 3 + 2] = -5 - Math.random() * 10
}
const starGeo = new THREE.BufferGeometry()
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0xffffff, size: 0.05, transparent: true, opacity: 0.6
}))
scene.add(stars)

// ─── Mouse ───────────────────────────────────────────────────────────────────
window.addEventListener('mousemove', (e) => {
  kaleidoMat.uniforms.uMouse.value.set(e.clientX / innerWidth, e.clientY / innerHeight)
})

// ─── Animation ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  kaleidoMat.uniforms.uTime.value = t
  kaleidoMat.uniforms.uSegments.value = params.segments
  kaleidoMat.uniforms.uSpeed.value = params.speed
  kaleidoMat.uniforms.uScale.value = params.scale
  kaleidoMat.uniforms.uHueShift.value = params.hueShift

  mesh.rotation.z = t * 0.05

  // Star twinkle
  const starAttr = stars.geometry.attributes.position
  for (let i = 0; i < starCount; i++) {
    starAttr.array[i * 3 + 2] += 0.005
    if (starAttr.array[i * 3 + 2] > -5) starAttr.array[i * 3 + 2] = -15
  }
  starAttr.needsUpdate = true

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  kaleidoMat.uniforms.uResolution.value.set(innerWidth, innerHeight)
})
