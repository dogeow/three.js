import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { Sky } from 'three/addons/objects/Sky.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

// ============ 场景 ============
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 20, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// 灯光
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xfff5e0, 1.4)
sun.position.set(100, 120, 60)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 500
sun.shadow.camera.left = -150
sun.shadow.camera.right = 150
sun.shadow.camera.top = 150
sun.shadow.camera.bottom = -150
scene.add(sun)

// ============ Sky 天空 ============
const sky = new Sky()
sky.scale.setScalar(450000)
scene.add(sky)

const skyU = sky.material.uniforms
skyU.turbidity.value = 4
skyU.rayleigh.value = 1.2
skyU.mieCoefficient.value = 0.003
skyU.mieDirectionalG.value = 0.92

const sunV = new THREE.Vector3()
const pmrem = new THREE.PMREMGenerator(renderer)
let envMap

// ============ 地形参数（需要提前定义，updateSky 依赖）============
const params = {
  heightScale: 45,
  noiseScale: 0.018,
  octaves: 5,
  moveSpeed: 20,
  skyElevation: 30,
  skyAzimuth: 200,
  seed: 42
}

function updateSky() {
  sunV.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - params.skyElevation), THREE.MathUtils.degToRad(params.skyAzimuth))
  skyU.sunPosition.value.copy(sunV)
  scene.environment = pmrem.fromScene(sky).texture
}
updateSky()

// ============ Perlin 噪声（2D）============
let noiseSeed = 42
function hash2(x, y) {
  const n = Math.sin((x * 127.1 + y * 311.7 + noiseSeed) * 43758.5453)
  return n - Math.floor(n)
}
function smoothstep(t) { return t * t * (3 - 2 * t) }

function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const a = hash2(xi, yi),     b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1)
  const u = smoothstep(xf), v = smoothstep(yf)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

// 分形噪声：多层 octaves 叠加
function fbm(x, y, octaves) {
  let sum = 0, amp = 1, freq = 1, max = 0
  for (let i = 0; i < octaves; i++) {
    sum += (valueNoise(x * freq, y * freq) * 2 - 1) * amp
    max += amp
    amp *= 0.5
    freq *= 2.1
  }
  return sum / max
}

// ============ 地形 ============
const TERRAIN_SIZE = 300
const TERRAIN_SEG = 256

const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEG, TERRAIN_SEG)
geometry.rotateX(-Math.PI / 2)

const colors = new Float32Array(geometry.attributes.position.count * 3)
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.88,
  metalness: 0.0,
  flatShading: false
})

const terrain = new THREE.Mesh(geometry, material)
terrain.receiveShadow = true
terrain.castShadow = true
scene.add(terrain)

// 颜色定义
const colWater  = new THREE.Color(0x2a5c8a)
const colSand   = new THREE.Color(0xc8a96e)
const colGrass  = new THREE.Color(0x3d7a2a)
const colForest = new THREE.Color(0x2d5e1e)
const colRock   = new THREE.Color(0x7a6a5a)
const colSnow   = new THREE.Color(0xf5f5f8)
const tmpColor  = new THREE.Color()

// 预计算高度图（const 不可 TDZ，需在调用前定义）
const HM_SIZE = 512
const heightMap = new Float32Array(HM_SIZE * HM_SIZE)
const HM_HALF = TERRAIN_SIZE / 2

function buildHeightMap() {
  for (let j = 0; j < HM_SIZE; j++) {
    for (let i = 0; i < HM_SIZE; i++) {
      const wx = (i / HM_SIZE) * TERRAIN_SIZE - HM_HALF
      const wz = (j / HM_SIZE) * TERRAIN_SIZE - HM_HALF
      heightMap[j * HM_SIZE + i] = fbm(wx * params.noiseScale, wz * params.noiseScale, params.octaves) * params.heightScale
    }
  }
}

function getHeightAt(wx, wz) {
  const u = (wx + HM_HALF) / TERRAIN_SIZE
  const v = (wz + HM_HALF) / TERRAIN_SIZE
  if (u < 0 || u > 1 || v < 0 || v > 1) return -params.heightScale * 0.15
  const ci = Math.floor(u * (HM_SIZE - 1))
  const cj = Math.floor(v * (HM_SIZE - 1))
  return heightMap[cj * HM_SIZE + ci]
}

function regenerateTerrain() {
  noiseSeed = params.seed
  buildHeightMap()
  const pos = geometry.attributes.position

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = fbm(x * params.noiseScale, z * params.noiseScale, params.octaves) * params.heightScale
    pos.setY(i, h)

    const t = (h + params.heightScale) / (params.heightScale * 2)

    if (h < -params.heightScale * 0.15)     tmpColor.copy(colWater)
    else if (t < 0.22)                        tmpColor.copy(colSand)
    else if (t < 0.45)                        tmpColor.copy(colGrass)
    else if (t < 0.65)                        tmpColor.copy(colForest)
    else if (t < 0.82)                        tmpColor.copy(colRock)
    else                                       tmpColor.copy(colSnow)

    colors[i * 3]     = tmpColor.r
    colors[i * 3 + 1] = tmpColor.g
    colors[i * 3 + 2] = tmpColor.b
  }

  pos.needsUpdate = true
  geometry.attributes.color.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
}

regenerateTerrain()

// 根据地形颜色更新雾气和背景
const fogColor = new THREE.Color(0xa8c8d8)
scene.background = fogColor
scene.fog = new THREE.Fog(fogColor, 60, 280)

// 找一个合适的初始高度
const startHeight = getHeightAt(0, 0)
camera.position.y = Math.max(startHeight + 8, 8)

// ============ GUI ============
const gui = new GUI({ title: '地形漫游参数' })
gui.add(params, 'heightScale', 5, 80, 1).name('地形高度').onChange(regenerateTerrain)
gui.add(params, 'noiseScale', 0.005, 0.06, 0.001).name('噪声频率').onChange(regenerateTerrain)
gui.add(params, 'octaves', 1, 7, 1).name('噪声层数').onChange(regenerateTerrain)
gui.add(params, 'moveSpeed', 5, 60, 1).name('移动速度')
gui.add(params, 'seed', 0, 999, 1).name('随机种子').onChange(regenerateTerrain)
gui.add(params, 'skyElevation', -5, 85, 0.5).name('太阳高度').onChange(updateSky)
gui.add(params, 'skyAzimuth', 0, 360, 1).name('太阳方位').onChange(updateSky)

// ============ PointerLockControls ============
const controls = new PointerLockControls(camera, renderer.domElement)

const overlay = document.getElementById('overlay')
overlay.addEventListener('click', () => controls.lock())
controls.addEventListener('lock', () => overlay.classList.add('hidden'))
controls.addEventListener('unlock', () => overlay.classList.remove('hidden'))

// ============ 键盘输入 ============
const keys = { w: false, a: false, s: false, d: false }
addEventListener('keydown', e => {
  if (e.code === 'KeyW') keys.w = true
  if (e.code === 'KeyA') keys.a = true
  if (e.code === 'KeyS') keys.s = true
  if (e.code === 'KeyD') keys.d = true
})
addEventListener('keyup', e => {
  if (e.code === 'KeyW') keys.w = false
  if (e.code === 'KeyA') keys.a = false
  if (e.code === 'KeyS') keys.s = false
  if (e.code === 'KeyD') keys.d = false
})


// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  if (controls.isLocked) {
    const speed = params.moveSpeed * dt
    const forward = Number(keys.w) - Number(keys.s)
    const right   = Number(keys.d) - Number(keys.a)

    if (forward) controls.moveForward(-forward * speed)
    if (right)   controls.moveRight(right * speed)

    // 相机贴地：射线向下找地形高度
    const camPos = controls.getObject().position
    const groundY = getHeightAt(camPos.x, camPos.z)
    const eyeHeight = 2.5
    camPos.y += (groundY + eyeHeight - camPos.y) * Math.min(dt * 8, 1)

    // 边界限制
    const half = TERRAIN_SIZE / 2 - 5
    camPos.x = Math.max(-half, Math.min(half, camPos.x))
    camPos.z = Math.max(-half, Math.min(half, camPos.z))
  }

  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})