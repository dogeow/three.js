import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b0f1a)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment()).texture

// ============ 场景：展台上几件「产品」 ============
const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(6, 6, 0.2, 64),
  new THREE.MeshStandardMaterial({ color: 0x1a2333, metalness: 0.5, roughness: 0.3 })
)
stage.position.y = -0.1
scene.add(stage)

const products = [
  { name: '红宝石', color: 0xef4444, pos: [-3.5, 0.8, 0], geo: new THREE.OctahedronGeometry(0.7, 0) },
  { name: '金戒指', color: 0xfbbf24, pos: [0, 0.5, 0], geo: new THREE.TorusGeometry(0.7, 0.22, 32, 100) },
  { name: '翡翠球', color: 0x10b981, pos: [3.5, 0.7, 0], geo: new THREE.SphereGeometry(0.7, 64, 64) }
]
const productMeshes = []
products.forEach(p => {
  const mesh = new THREE.Mesh(
    p.geo,
    new THREE.MeshStandardMaterial({ color: p.color, metalness: 0.8, roughness: 0.15 })
  )
  mesh.position.set(...p.pos)
  scene.add(mesh)
  productMeshes.push(mesh)
})

// ============ 相机路径点 ============
// 每个路径点 = 相机在哪 + 看着哪
const waypoints = [
  { name: '全景', pos: new THREE.Vector3(0, 5, 10), target: new THREE.Vector3(0, 0.5, 0) },
  { name: '红宝石', pos: new THREE.Vector3(-3.5, 1.2, 2.5), target: new THREE.Vector3(-3.5, 0.8, 0) },
  { name: '金戒指', pos: new THREE.Vector3(0, 1, 2.2), target: new THREE.Vector3(0, 0.5, 0) },
  { name: '翡翠球', pos: new THREE.Vector3(3.5, 1.2, 2.5), target: new THREE.Vector3(3.5, 0.7, 0) },
  { name: '俯瞰', pos: new THREE.Vector3(0, 9, 0.01), target: new THREE.Vector3(0, 0, 0) }
]

// 初始姿势
camera.position.copy(waypoints[0].pos)
controls.target.copy(waypoints[0].target)

// ============ 极简 Tween 实现 ============
// 用一个当前 tween 状态记录：起点、终点、已经过的时间、总时长
// 每帧 requestAnimationFrame 里推进时间、按 easing 曲线插值
let tween = null

// 缓动函数：easeInOutCubic —— 两头慢、中间快，最自然的手感
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function tweenTo(wp, duration = 1.2) {
  tween = {
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos: wp.pos.clone(),
    toTarget: wp.target.clone(),
    duration,
    elapsed: 0
  }
}

function updateTween(dt) {
  if (!tween) return
  tween.elapsed += dt
  let t = Math.min(tween.elapsed / tween.duration, 1)
  const k = easeInOutCubic(t)
  camera.position.lerpVectors(tween.fromPos, tween.toPos, k)
  controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k)
  if (t >= 1) tween = null
}

// ============ UI：路径点按钮 ============
const $wp = document.getElementById('wp')
waypoints.forEach((wp, i) => {
  const btn = document.createElement('button')
  btn.textContent = wp.name
  btn.onclick = () => {
    tweenTo(wp)
    ;[...$wp.children].forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
  }
  $wp.appendChild(btn)
})
$wp.children[0].classList.add('active')

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  updateTween(dt)

  productMeshes.forEach((m, i) => m.rotation.y += 0.005 + i * 0.002)

  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})