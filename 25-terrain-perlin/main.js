import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1016)
scene.fog = new THREE.Fog(0x0a1016, 80, 200)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(60, 50, 60)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 0, 0)

scene.add(new THREE.HemisphereLight(0xaacfff, 0x334455, 0.7))
const sun = new THREE.DirectionalLight(0xffffff, 1.2)
sun.position.set(50, 80, 30)
sun.castShadow = true
scene.add(sun)

// ============ 简易 2D 值噪声（Value Noise）============
// 真正的 Perlin 需要梯度向量；这里用 hash + 双线性插值足够演示
// 思路：网格点上算 hash 伪随机，然后用 smoothstep 做双线性插值
let seed = Math.random() * 1000
function hash2(x, y) {
  // 整数格点哈希 → [-1, 1]
  const n = Math.sin((x * 12.9898 + y * 78.233 + seed) * 43758.5453)
  return (n - Math.floor(n)) * 2 - 1
}
function smoothstep(t) { return t * t * (3 - 2 * t) }
function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi

  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)

  const u = smoothstep(xf), v = smoothstep(yf)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

// 分形：多个倍频叠加，每一层频率翻倍、振幅减半
function fbm(x, y, octaves) {
  let sum = 0
  let amp = 1
  let freq = 1
  let max = 0
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq) * amp
    max += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / max
}

// ============ 地形 ============
const SIZE = 120
const SEG = 180
const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)
geometry.rotateX(-Math.PI / 2) // 平面默认立着，转成水平

// 用 vertexColors 按高度着色
const colors = new Float32Array(geometry.attributes.position.count * 3)
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  flatShading: true // 低多边形风格，性能也更好
})

const terrain = new THREE.Mesh(geometry, material)
terrain.receiveShadow = true
terrain.castShadow = true
scene.add(terrain)

// 水面（平面放在 y=0）
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(SIZE * 1.2, SIZE * 1.2),
  new THREE.MeshStandardMaterial({
    color: 0x1e3a5f, transparent: true, opacity: 0.8,
    roughness: 0.2, metalness: 0.1
  })
)
water.rotation.x = -Math.PI / 2
scene.add(water)

// ============ 按参数重新生成地形 ============
function regenerate() {
  const amp = +document.getElementById('amp').value
  const freq = +document.getElementById('freq').value
  const oct = +document.getElementById('oct').value

  const pos = geometry.attributes.position
  const colorLow  = new THREE.Color(0x1e3a5f)  // 水下
  const colorSand = new THREE.Color(0xd4b896)  // 沙滩
  const colorGrass= new THREE.Color(0x4a7c43)  // 草地
  const colorRock = new THREE.Color(0x6b5d54)  // 岩石
  const colorSnow = new THREE.Color(0xf0f0f5)  // 雪峰
  const tmp = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = fbm(x * freq, z * freq, oct) * amp
    pos.setY(i, h)

    // 按高度分段着色
    const t = (h + amp * 0.3) / (amp * 1.2) // 归一到 0~1
    if (h < 0)       tmp.copy(colorLow)
    else if (t < 0.3) tmp.copy(colorSand)
    else if (t < 0.55) tmp.copy(colorGrass)
    else if (t < 0.8)  tmp.copy(colorRock)
    else             tmp.copy(colorSnow)

    colors[i * 3]     = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }
  pos.needsUpdate = true
  geometry.attributes.color.needsUpdate = true
  geometry.computeVertexNormals()
}
regenerate()

;['amp', 'freq', 'oct'].forEach(id => {
  document.getElementById(id).addEventListener('input', regenerate)
})
document.getElementById('regen').addEventListener('click', () => {
  seed = Math.random() * 1000
  regenerate()
})

// ============ 渲染循环 ============
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})