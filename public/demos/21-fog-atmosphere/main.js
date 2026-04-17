import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x88aabb)

// ============ 雾 Fog ============
// FogExp2(color, density) —— 按距离指数衰减，物理上更接近真实空气散射
// 另一种是 Fog(color, near, far) —— 线性，便宜但假
scene.fog = new THREE.FogExp2(0x88aabb, 0.03)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 5, 15)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.y = 2

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dir = new THREE.DirectionalLight(0xffffff, 1)
dir.position.set(10, 20, 5)
scene.add(dir)

// 地面
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x556b5d })
)
ground.rotation.x = -Math.PI / 2
scene.add(ground)

// 森林：一大片随机树（用圆柱+圆锥拼成）
const trunkGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.5, 8)
const leafGeo = new THREE.ConeGeometry(0.9, 2, 8)
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a })
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f })

for (let i = 0; i < 300; i++) {
  const x = (Math.random() - 0.5) * 120
  const z = (Math.random() - 0.5) * 120
  if (Math.sqrt(x * x + z * z) < 4) continue // 中心留空
  const trunk = new THREE.Mesh(trunkGeo, trunkMat)
  trunk.position.set(x, 0.75, z)
  scene.add(trunk)
  const leaf = new THREE.Mesh(leafGeo, leafMat)
  leaf.position.set(x, 2.2, z)
  scene.add(leaf)
}

// ============ 控制面板 ============
const $density = document.getElementById('density')
const $color = document.getElementById('color')

$density.addEventListener('input', () => {
  scene.fog.density = parseFloat($density.value)
})
$color.addEventListener('input', () => {
  const c = new THREE.Color($color.value)
  scene.fog.color.copy(c)
  scene.background.copy(c) // 背景和雾色一致，远景才会「消失在雾里」
})

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