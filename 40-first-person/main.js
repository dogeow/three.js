import * as THREE from 'three'
// PointerLockControls：把鼠标锁到画面中心，像 FPS 游戏那样
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a2034)
scene.fog = new THREE.Fog(0x1a2034, 10, 80)

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 1.7, 0) // 站立视角高度 ≈ 1.7m

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dir = new THREE.DirectionalLight(0xffffff, 1)
dir.position.set(20, 30, 10)
dir.castShadow = true
scene.add(dir)

// ============ PointerLockControls ============
const controls = new PointerLockControls(camera, document.body)
scene.add(controls.getObject())

const overlay = document.getElementById('overlay')
overlay.addEventListener('click', () => controls.lock())
controls.addEventListener('lock', () => overlay.classList.add('hidden'))
controls.addEventListener('unlock', () => overlay.classList.remove('hidden'))

// ============ 场地 ============
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x334155 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// 随机撒一堆彩色方柱作为"地标"
for (let i = 0; i < 60; i++) {
  const h = 1 + Math.random() * 4
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1 + Math.random(), h, 1 + Math.random()),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.5, 0.55)
    })
  )
  box.position.set(
    (Math.random() - 0.5) * 80,
    h / 2,
    (Math.random() - 0.5) * 80
  )
  box.castShadow = true
  box.receiveShadow = true
  scene.add(box)
}

// ============ 键盘 + 物理 ============
const keys = { w: false, a: false, s: false, d: false, space: false }
addEventListener('keydown', e => {
  if (e.code === 'KeyW') keys.w = true
  if (e.code === 'KeyA') keys.a = true
  if (e.code === 'KeyS') keys.s = true
  if (e.code === 'KeyD') keys.d = true
  if (e.code === 'Space') keys.space = true
})
addEventListener('keyup', e => {
  if (e.code === 'KeyW') keys.w = false
  if (e.code === 'KeyA') keys.a = false
  if (e.code === 'KeyS') keys.s = false
  if (e.code === 'KeyD') keys.d = false
  if (e.code === 'Space') keys.space = false
})

const velocity = new THREE.Vector3() // 当前速度
const GRAVITY = 30
const MOVE_SPEED = 40
const JUMP = 10
let onGround = true

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.1) // 防止切后台后 dt 爆炸

  if (controls.isLocked) {
    // 水平移动：带阻尼，不按键就慢慢减速
    velocity.x -= velocity.x * 10 * dt
    velocity.z -= velocity.z * 10 * dt

    // 重力
    velocity.y -= GRAVITY * dt

    // 把键盘输入换算为速度增量
    const forward = Number(keys.w) - Number(keys.s)
    const right = Number(keys.d) - Number(keys.a)
    if (forward) velocity.z -= forward * MOVE_SPEED * dt
    if (right) velocity.x += right * MOVE_SPEED * dt

    if (keys.space && onGround) {
      velocity.y = JUMP
      onGround = false
    }

    // controls.moveRight / moveForward 会按当前朝向平移相机
    controls.moveRight(velocity.x * dt)
    controls.moveForward(-velocity.z * dt)

    // 垂直
    controls.getObject().position.y += velocity.y * dt
    if (controls.getObject().position.y < 1.7) {
      velocity.y = 0
      controls.getObject().position.y = 1.7
      onGround = true
    }
  }

  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})