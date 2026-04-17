// 3563. Verlet Physics Playground
// Verlet物理游乐场 - 链式绳子、柔体、布料落布
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d0d1a)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 20, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 地面
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Verlet粒子
class VerletPoint {
  constructor(x, y, z, pinned = false) {
    this.pos = new THREE.Vector3(x, y, z)
    this.oldPos = new THREE.Vector3(x, y, z)
    this.acc = new THREE.Vector3()
    this.pinned = pinned
  }

  update(dt) {
    if (this.pinned) return
    const vel = this.pos.clone().sub(this.oldPos).multiplyScalar(0.99) // 阻尼
    this.oldPos.copy(this.pos)
    this.pos.add(vel)
    this.pos.add(this.acc.multiplyScalar(dt * dt))
    this.acc.set(0, 0, 0)
    // 地面碰撞
    if (this.pos.y < 0.5) this.pos.y = 0.5
  }

  applyForce(fx, fy, fz) {
    this.acc.x += fx
    this.acc.y += fy
    this.acc.z += fz
  }
}

class Constraint {
  constructor(p1, p2, restLen) {
    this.p1 = p1
    this.p2 = p2
    this.restLen = restLen
  }

  satisfy() {
    const diff = this.p2.pos.clone().sub(this.p1.pos)
    const dist = diff.length()
    if (dist < 0.001) return
    const correction = diff.multiplyScalar((dist - this.restLen) / dist * 0.5)
    if (!this.p1.pinned) this.p1.pos.add(correction)
    if (!this.p2.pinned) this.p2.pos.sub(correction)
  }
}

// === 链式绳子 ===
const ropePoints = []
const ropeConstraints = []
const ROPE_LEN = 25
for (let i = 0; i < ROPE_LEN; i++) {
  ropePoints.push(new VerletPoint(i * 0.8 - 10, 18 - i * 0.8, 0, i === 0))
}
for (let i = 0; i < ROPE_LEN - 1; i++) {
  ropeConstraints.push(new Constraint(ropePoints[i], ropePoints[i + 1], 0.8))
}

// 绳子渲染
const ropeGeo = new THREE.BufferGeometry()
const ropePositions = new Float32Array(ROPE_LEN * 3)
ropeGeo.setAttribute('position', new THREE.BufferAttribute(ropePositions, 3))
const ropeLine = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0xffcc00, linewidth: 2 }))
scene.add(ropeLine)

const ropeBalls = []
for (const p of ropePoints) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.5, roughness: 0.3 })
  )
  scene.add(m)
  ropeBalls.push(m)
}

// === 布料 ===
const CLOTH_W = 18
const CLOTH_H = 18
const CLOTH_SIZE = 10
const clothPoints = []
const clothConstraints = []
for (let y = 0; y < CLOTH_H; y++) {
  for (let x = 0; x < CLOTH_W; x++) {
    const pinned = y === 0
    clothPoints.push(new VerletPoint(
      (x - CLOTH_W / 2) * (CLOTH_SIZE / CLOTH_W),
      15,
      (y - CLOTH_H / 2) * (CLOTH_SIZE / CLOTH_H),
      pinned
    ))
  }
}
// 结构约束
for (let y = 0; y < CLOTH_H; y++) {
  for (let x = 0; x < CLOTH_W; x++) {
    const i = y * CLOTH_W + x
    if (x < CLOTH_W - 1) clothConstraints.push(new Constraint(clothPoints[i], clothPoints[i + 1], CLOTH_SIZE / CLOTH_W))
    if (y < CLOTH_H - 1) clothConstraints.push(new Constraint(clothPoints[i], clothPoints[i + CLOTH_W], CLOTH_SIZE / CLOTH_H))
  }
}
// 剪切约束
for (let y = 0; y < CLOTH_H - 1; y++) {
  for (let x = 0; x < CLOTH_W - 1; x++) {
    const i = y * CLOTH_W + x
    clothConstraints.push(new Constraint(clothPoints[i], clothPoints[i + CLOTH_W + 1], Math.SQRT2 * CLOTH_SIZE / CLOTH_W))
    clothConstraints.push(new Constraint(clothPoints[i + 1], clothPoints[i + CLOTH_W], Math.SQRT2 * CLOTH_SIZE / CLOTH_W))
  }
}

const clothGeo = new THREE.BufferGeometry()
const clothPositions = new Float32Array(CLOTH_W * CLOTH_H * 3)
clothGeo.setAttribute('position', new THREE.BufferAttribute(clothPositions, 3))
const clothIndices = []
for (let y = 0; y < CLOTH_H - 1; y++) {
  for (let x = 0; x < CLOTH_W - 1; x++) {
    const a = y * CLOTH_W + x, b = a + 1, c = a + CLOTH_W, d = c + 1
    clothIndices.push(a, b, c, b, d, c)
  }
}
clothGeo.setIndex(clothIndices)
clothGeo.computeVertexNormals()
const clothMesh = new THREE.Mesh(clothGeo,
  new THREE.MeshStandardMaterial({ color: 0x4488ff, side: THREE.DoubleSide, wireframe: false, roughness: 0.5 }))
clothMesh.castShadow = true
clothMesh.receiveShadow = true
scene.add(clothMesh)

// === 弹跳球 ===
const balls = []
for (let i = 0; i < 5; i++) {
  const p = new VerletPoint(
    (Math.random() - 0.5) * 20,
    15 + Math.random() * 5,
    (Math.random() - 0.5) * 10
  )
  balls.push(p)
}
const ballMeshes = balls.map(p => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.3, roughness: 0.4 })
  )
  scene.add(m)
  return m
})

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xffffff, 1)
sun.position.set(20, 40, 20)
sun.castShadow = true
scene.add(sun)

let time = 0
function animate() {
  requestAnimationFrame(animate)
  time += 0.016
  const dt = 1

  // 重力
  const gravity = 9.8
  for (const p of ropePoints) { if (!p.pinned) p.applyForce(0, -gravity, 0) }
  for (const p of clothPoints) { if (!p.pinned) p.applyForce(Math.sin(time * 2) * 0.3, -gravity, 0) }
  for (const p of balls) p.applyForce(0, -gravity, 0)

  // 更新
  for (const p of ropePoints) p.update(dt)
  for (const p of clothPoints) p.update(dt)
  for (const p of balls) p.update(dt)

  // 约束迭代
  for (let iter = 0; iter < 5; iter++) {
    for (const c of ropeConstraints) c.satisfy()
    for (const c of clothConstraints) c.satisfy()
  }

  // 渲染绳子
  for (let i = 0; i < ROPE_LEN; i++) {
    ropePositions[i * 3] = ropePoints[i].pos.x
    ropePositions[i * 3 + 1] = ropePoints[i].pos.y
    ropePositions[i * 3 + 2] = ropePoints[i].pos.z
    ropeBalls[i].position.copy(ropePoints[i].pos)
  }
  ropeGeo.attributes.position.needsUpdate = true

  // 渲染布料
  for (let i = 0; i < clothPoints.length; i++) {
    clothPositions[i * 3] = clothPoints[i].pos.x
    clothPositions[i * 3 + 1] = clothPoints[i].pos.y
    clothPositions[i * 3 + 2] = clothPoints[i].pos.z
  }
  clothGeo.attributes.position.needsUpdate = true
  clothGeo.computeVertexNormals()

  // 渲染球
  for (let i = 0; i < balls.length; i++) {
    ballMeshes[i].position.copy(balls[i].pos)
  }

  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
