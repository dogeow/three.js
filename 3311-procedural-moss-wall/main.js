// 3311. Procedural Moss Wall
// 反应扩散 + 程序化苔藓纹理墙
// type: procedural-moss-wall
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1a0a)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 0, 5)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0x88ff88, 0.3))
const dirLight = new THREE.DirectionalLight(0xaaffaa, 0.8)
dirLight.position.set(2, 5, 3)
scene.add(dirLight)

// 灰度SS物理平面 - 128x128
const SIZE = 128
const canvas = document.createElement('canvas')
canvas.width = SIZE
canvas.height = SIZE
const ctx = canvas.getContext('2d')
const imgData = ctx.createImageData(SIZE, SIZE)

// Gray-Scott 反应扩散参数
let gridA = new Float32Array(SIZE * SIZE).fill(1)
let gridB = new Float32Array(SIZE * SIZE).fill(0)
const dA = 1.0, dB = 0.5
const f = 0.055, k = 0.062
const dt = 1.0

function idx(x, y) { return ((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE) }

function laplacian(grid, x, y) {
  return (
    grid[idx(x, y)] * -1 +
    grid[idx(x - 1, y)] * 0.2 + grid[idx(x + 1, y)] * 0.2 +
    grid[idx(x, y - 1)] * 0.2 + grid[idx(x, y + 1)] * 0.2 +
    grid[idx(x - 1, y - 1)] * 0.05 + grid[idx(x + 1, y - 1)] * 0.05 +
    grid[idx(x - 1, y + 1)] * 0.05 + grid[idx(x + 1, y + 1)] * 0.05
  )
}

// 随机种子
for (let i = 0; i < 200; i++) {
  const cx = Math.floor(Math.random() * SIZE)
  const cy = Math.floor(Math.random() * SIZE)
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++)
    if (dx * dx + dy * dy <= 9) gridB[idx(cx + dx, cy + dy)] = 1
}

// ShaderMaterial 渲染苔藓墙
const planeGeo = new THREE.PlaneGeometry(8, 8)
const mossMat = new THREE.ShaderMaterial({
  uniforms: {
    uTex: { value: null },
    uTime: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTex;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float b = texture2D(uTex, vUv).r;
      vec3 dark = vec3(0.02, 0.08, 0.02);
      vec3 mid  = vec3(0.05, 0.25, 0.05);
      vec3 bright = vec3(0.15, 0.55, 0.1);
      vec3 col = mix(dark, mid, smoothstep(0.0, 0.4, b));
      col = mix(col, bright, smoothstep(0.4, 0.8, b));
      // 微观凹凸
      float bump = sin(vUv.x * 200.0) * sin(vUv.y * 200.0) * 0.03 * b;
      col += bump;
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

const mossMesh = new THREE.Mesh(planeGeo, mossMat)
scene.add(mossMesh)

const dataTexture = new THREE.DataTexture(
  new Uint8Array(SIZE * SIZE * 4), SIZE, SIZE, THREE.RGBAFormat
)

function stepRD() {
  const nextA = new Float32Array(SIZE * SIZE)
  const nextB = new Float32Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = idx(x, y)
      const a = gridA[i], b = gridB[i]
      const lapA = laplacian(gridA, x, y)
      const lapB = laplacian(gridB, x, y)
      const reaction = a * b * b
      nextA[i] = Math.max(0, Math.min(1, a + (dA * lapA - reaction + f * (1 - a)) * dt))
      nextB[i] = Math.max(0, Math.min(1, b + (dB * lapB + reaction - (k + f) * b) * dt))
    }
  }
  gridA = nextA; gridB = nextB

  // 更新纹理
  const d = imgData.data
  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = Math.floor(gridB[i] * 255)
    d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255
  }
  dataTexture.needsUpdate = true
  mossMat.uniforms.uTex.value = dataTexture
}

// 每帧
let frame = 0
function animate() {
  requestAnimationFrame(animate)
  frame++
  if (frame % 2 === 0) stepRD()
  mossMat.uniforms.uTime.value += 0.01
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
