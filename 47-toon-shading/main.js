import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xfef6e4)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 2, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 卡通渲染一般需要较强的方向光和柔和的环境光
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const key = new THREE.DirectionalLight(0xffffff, 1.2)
key.position.set(5, 8, 5)
scene.add(key)

// ============ 生成梯度贴图 ============
// MeshToonMaterial 的核心：gradientMap
// 它是一张 1xN 的小纹理，N 就是色阶数量
// NearestFilter 保证相邻色阶边界是硬的（而不是渐变）
function makeGradientMap(steps) {
  const data = new Uint8Array(steps)
  // 比如 steps=3 → [85, 170, 255]，把 0~1 的光照强度映射到 3 档
  for (let i = 0; i < steps; i++) {
    data[i] = Math.floor((i + 1) / steps * 255)
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat)
  tex.magFilter = THREE.NearestFilter // ⚠️ 不能插值，否则就不卡通了
  tex.minFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

// ============ 几个卡通小物件 ============
const meshes = []

const palette = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xb972e8]

function makeToon(geo, colorHex, x, z) {
  const mat = new THREE.MeshToonMaterial({
    color: colorHex,
    gradientMap: makeGradientMap(3)
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, 0.8, z)
  scene.add(mesh)
  meshes.push(mesh)
  return mesh
}

makeToon(new THREE.SphereGeometry(0.8, 32, 32), palette[0], -3, 0)
makeToon(new THREE.TorusKnotGeometry(0.6, 0.2, 128, 32), palette[1], -1.5, 0)
makeToon(new THREE.ConeGeometry(0.7, 1.4, 32), palette[2], 0, 0)
makeToon(new THREE.BoxGeometry(1.1, 1.1, 1.1), palette[3], 1.5, 0)
makeToon(new THREE.DodecahedronGeometry(0.8), palette[4], 3, 0)

// 地面
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshToonMaterial({ color: 0xf5e6c8, gradientMap: makeGradientMap(3) })
)
ground.rotation.x = -Math.PI / 2
scene.add(ground)

// ============ 切换色阶 ============
document.getElementById('steps').onchange = (e) => {
  const n = +e.target.value
  meshes.forEach(m => {
    m.material.gradientMap = makeGradientMap(n)
    m.material.needsUpdate = true
  })
  ground.material.gradientMap = makeGradientMap(n)
  ground.material.needsUpdate = true
}

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  meshes.forEach((m, i) => {
    m.rotation.y = t * (0.5 + i * 0.1)
    m.position.y = 0.8 + Math.abs(Math.sin(t * 1.5 + i)) * 0.3
  })
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})