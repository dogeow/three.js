// 3321. Julia Fractal — 复数迭代分形，GPU着色器渲染
// type: julia-fractal
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 3)
const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Julia参数（可调）
const juliaC = { x: -0.7, y: 0.27015 }
const maxIter = 256

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uC;
varying vec2 vUv;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = (vUv - 0.5) * 3.5;
  vec2 z = uv;
  int iter = 0;
  float smoothVal = 0.0;
  
  for (int i = 0; i < 256; i++) {
    if (dot(z, z) > 4.0) {
      // smooth coloring
      smoothVal = float(i) - log2(log2(dot(z, z))) + 4.0;
      break;
    }
    // z = z^2 + c
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + uC;
    iter++;
  }
  
  if (iter == 256) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float t = smoothVal / float(${maxIter});
    // 颜色映射：随时间缓慢变化
    float hue = t * 0.8 + uTime * 0.05 + length(uv) * 0.1;
    float sat = 0.8 + 0.2 * sin(t * 10.0);
    float val = 1.0 - t * 0.3;
    vec3 col = hsv2rgb(vec3(fract(hue), sat, val));
    gl_FragColor = vec4(col, 1.0);
  }
}
`

const uniforms = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
  uC: { value: new THREE.Vector2(juliaC.x, juliaC.y) }
}

const mat = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms
})

const geo = new THREE.PlaneGeometry(4, 4)
const mesh = new THREE.Mesh(geo, mat)
scene.add(mesh)

// 参数滑块UI
const gui = document.createElement('div')
gui.style.cssText = 'position:fixed;bottom:20px;left:20px;background:rgba(0,0,0,0.7);color:#fff;padding:15px;border-radius:8px;font-family:monospace;font-size:13px;z-index:100;min-width:220px'
gui.innerHTML = `
<div style="margin-bottom:8px;font-weight:bold;color:#88f">Julia Fractal</div>
<label>c_real: <input type="range" id="cr" min="-1" max="1" step="0.001" value="-0.7" style="width:120px"></label>
<span id="crv" style="margin-left:8px">-0.700</span><br>
<label>c_imag: <input type="range" id="ci" min="-1" max="1" step="0.001" value="0.27015" style="width:120px"></label>
<span id="civ" style="margin-left:8px">0.270</span>
<div style="margin-top:8px;font-size:11px;color:#888">拖动滑块探索不同Julia集</div>
`
document.body.appendChild(gui)

document.getElementById('cr').addEventListener('input', e => {
  uniforms.uC.value.x = parseFloat(e.target.value)
  document.getElementById('crv').textContent = parseFloat(e.target.value).toFixed(3)
})
document.getElementById('ci').addEventListener('input', e => {
  uniforms.uC.value.y = parseFloat(e.target.value)
  document.getElementById('civ').textContent = parseFloat(e.target.value).toFixed(3)
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  uniforms.uTime.value = clock.getElapsedTime()
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  uniforms.uResolution.value.set(innerWidth, innerHeight)
})
