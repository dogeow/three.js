// Interactive Physics Lab: Projectile, Pendulum, Spring
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x08080f)
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 15, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)

// Grid floor
const gridHelper = new THREE.GridHelper(80, 80, 0x222244, 0x111133)
scene.add(gridHelper)

// ─── Projectile Motion ───
const projParams = { v0: 18, angle: 45, g: 9.8, launch: () => launchProjectile() }
const projTrajectory = []
const projSpheres = []

function launchProjectile() {
  const angleRad = projParams.angle * Math.PI / 180
  const v0x = projParams.v0 * Math.cos(angleRad)
  const v0y = projParams.v0 * Math.sin(angleRad)
  const geo = new THREE.SphereGeometry(0.3, 12, 8)
  const mat = new THREE.MeshStandardMaterial({ color: 0xff6030, emissive: 0xff3010, emissiveIntensity: 0.3 })
  const ball = new THREE.Mesh(geo, mat)
  ball.position.set(-20, 0.3, 5)
  scene.add(ball)
  projSpheres.push({ mesh: ball, x: -20, y: 0.3, vx: v0x, vy: v0y, t: 0 })
  projTrajectory.push(ball)
}

function updateProjectiles(dt) {
  for (let i = projSpheres.length - 1; i >= 0; i--) {
    const p = projSpheres[i]
    p.t += dt
    p.x = -20 + p.vx * p.t
    p.y = 0.3 + p.vy * p.t - 0.5 * projParams.g * p.t * p.t
    if (p.y < 0.3) { scene.remove(p.mesh); projSpheres.splice(i, 1); continue }
    p.mesh.position.set(p.x, p.y, 5)
  }
}

// ─── Pendulum ───
const pendParams = { length: 8, angle: 60, damping: 0.995, g: 9.8 }
const pendPivot = new THREE.Object3D()
pendPivot.position.set(8, 12, -5)
scene.add(pendPivot)
const pendLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -pendParams.length, 0)]),
  new THREE.LineBasicMaterial({ color: 0xaaaaaa })
)
pendPivot.add(pendLine)
const pendBall = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 16, 12),
  new THREE.MeshStandardMaterial({ color: 0x40e0d0, emissive: 0x206060, emissiveIntensity: 0.3, metalness: 0.8, roughness: 0.2 })
)
pendBall.position.set(0, -pendParams.length, 0)
pendPivot.add(pendBall)
let pendAngle = pendParams.angle * Math.PI / 180
let pendOmega = 0

function updatePendulum(dt) {
  const alpha = -(pendParams.g / pendParams.length) * Math.sin(pendAngle)
  pendOmega += alpha * dt
  pendOmega *= pendParams.damping
  pendAngle += pendOmega * dt
  const l = pendParams.length
  pendLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(l * Math.sin(pendAngle), -l * Math.cos(pendAngle), 0)])
  pendBall.position.set(l * Math.sin(pendAngle), -l * Math.cos(pendAngle), 0)
}

// ─── Spring-Mass ───
const springParams = { k: 15, mass: 2, damping: 0.98, initY: 6 }
const springTop = new THREE.Object3D()
springTop.position.set(-8, 12, -5)
scene.add(springTop)
const springCoil = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xffcc00 })
)
scene.add(springCoil)
const springBall = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 16, 12),
  new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x806000, emissiveIntensity: 0.3 })
)
scene.add(springBall)
let springY = springParams.initY
let springV = 0

function updateSpring(dt) {
  const f = -springParams.k * (springY - 6) + springParams.mass * springParams.g
  springV += (f / springParams.mass) * dt
  springV *= springParams.damping
  springY += springV * dt
  springBall.position.set(-8, springY, -5)
  // Draw coil
  const coilPoints = []
  const coils = 8
  const coilRadius = 0.5
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const y = springTop.position.y - t * (springTop.position.y - springBall.position.y)
    const angle = t * coils * Math.PI * 2
    coilPoints.push(new THREE.Vector3(-8 + coilRadius * Math.cos(angle), y, -5 + coilRadius * Math.sin(angle)))
  }
  springCoil.geometry.setFromPoints(coilPoints)
}

// ─── GUI ───
const gui = new GUI()
const projF = gui.addFolder('抛体运动')
projF.add(projParams, 'v0', 5, 30, 0.5).name('初速度')
projF.add(projParams, 'angle', 10, 80, 1).name('角度 (°)')
projF.add(projParams, 'launch').name('发射')

const pendF = gui.addFolder('单摆')
pendF.add(pendParams, 'length', 3, 15, 0.5).name('摆长')
pendF.add(pendParams, 'angle', 10, 170, 5).name('初始角度 (°)')
pendF.add(pendParams, 'damping', 0.95, 1.0, 0.002).name('阻尼')
pendF.add(pendParams, 'g', 1, 20, 0.1).name('重力')
pendF.open()

const springF = gui.addFolder('弹簧振子')
springF.add(springParams, 'k', 5, 30, 1).name('劲度系数')
springF.add(springParams, 'mass', 0.5, 5, 0.1).name('质量')
springF.add(springParams, 'damping', 0.9, 1.0, 0.005).name('阻尼')
springF.add(springParams, 'initY', 2, 12, 0.5).name('初始位移')
springF.open()

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  updateProjectiles(dt)
  updatePendulum(dt)
  updateSpring(dt)
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
