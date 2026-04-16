// 4233. Shader Art Cellular Automata
// Game of Life rendered as full-screen GPU shader art
// type: shader-art

import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(1)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

const W = Math.floor(innerWidth)
const H = Math.floor(innerHeight)

const rtOpts = {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  format: THREE.RGBAFormat,
  type: THREE.FloatType
}
let rtA = new THREE.WebGLRenderTarget(W, H, rtOpts)
let rtB = new THREE.WebGLRenderTarget(W, H, rtOpts)

const baseVert = `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`

const updateFrag = `precision highp float;
uniform sampler2D uState;
uniform vec2 uResolution;
varying vec2 vUv;
int neighbors(vec2 uv) {
  int n = 0;
  for (int dx = -1; dx <= 1; dx++)
  for (int dy = -1; dy <= 1; dy++) {
    if (dx == 0 && dy == 0) continue;
    vec2 nuv = fract(uv + vec2(float(dx), float(dy)) / uResolution);
    n += int(texture2D(uState, nuv).r > 0.5 ? 1 : 0);
  }
  return n;
}
void main() {
  float alive = texture2D(uState, vUv).r;
  int n = neighbors(vUv);
  float next = alive;
  if (alive > 0.5) {
    next = (n == 2 || n == 3) ? 1.0 : 0.0;
  } else {
    next = (n == 3) ? 1.0 : 0.0;
  }
  gl_FragColor = vec4(next, next, next, 1.0);
}`

const displayFrag = `precision highp float;
uniform sampler2D uState;
varying vec2 vUv;
void main() {
  float alive = texture2D(uState, vUv).r;
  vec3 bg = vec3(0.02, 0.03, 0.08);
  vec3 col = mix(bg, vec3(0.1, 0.9, 0.7), alive);
  float ring = fract(length(vUv - 0.5) * 8.0);
  col += vec3(0.0, 0.1, 0.15) * exp(-ring * 3.0);
  gl_FragColor = vec4(col, 1.0);
}`

const updateMat = new THREE.ShaderMaterial({
  uniforms: {
    uState: { value: null },
    uResolution: { value: new THREE.Vector2(W, H) }
  },
  vertexShader: baseVert,
  fragmentShader: updateFrag
})

const displayMat = new THREE.ShaderMaterial({
  uniforms: { uState: { value: null } },
  vertexShader: baseVert,
  fragmentShader: displayFrag
})

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), updateMat)
scene.add(quad)

const initData = new Float32Array(W * H * 4)
for (let i = 0; i < W * H; i++) {
  const alive = Math.random() < 0.25 ? 1.0 : 0.0
  initData[i*4] = alive
  initData[i*4+1] = alive
  initData[i*4+2] = alive
  initData[i*4+3] = 1.0
}
const initTex = new THREE.DataTexture(initData, W, H, THREE.RGBAFormat, THREE.FloatType)
initTex.needsUpdate = true

renderer.setRenderTarget(rtA)
const initMat = new THREE.MeshBasicMaterial({ map: initTex })
quad.material = initMat
renderer.render(scene, camera)

let frameCount = 0
const params = { speed: 4, reset: () => resetState() }

function resetState() {
  const data = new Float32Array(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    const alive = Math.random() < 0.25 ? 1.0 : 0.0
    data[i*4] = data[i*4+1] = data[i*4+2] = alive
    data[i*4+3] = 1.0
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType)
  tex.needsUpdate = true
  renderer.setRenderTarget(rtA)
  quad.material = new THREE.MeshBasicMaterial({ map: tex })
  renderer.render(scene, camera)
  frameCount = 0
}

const gui = new GUI()
gui.add(params, 'speed', 1, 12, 1).name('Speed (frames/step)')
gui.add(params, 'reset').name('Reset Random')

function animate() {
  requestAnimationFrame(animate)
  if (frameCount % params.speed === 0) {
    updateMat.uniforms.uState.value = rtA.texture
    quad.material = updateMat
    renderer.setRenderTarget(rtB)
    renderer.render(scene, camera)
    const tmp = rtA; rtA = rtB; rtB = tmp
  }
  displayMat.uniforms.uState.value = rtA.texture
  quad.material = displayMat
  renderer.setRenderTarget(null)
  renderer.render(scene, camera)
  frameCount++
}
animate()

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
})
