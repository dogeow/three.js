// 3317. Chaos Attractor — 洛伦兹吸引子，非线性动力学
// type: chaos-attractor
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.008)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 10, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

// 洛伦兹方程参数
const sigma = 10.0
const rho = 28.0
const beta = 8.0 / 3.0
const dt = 0.005
const steps = 12000

const positions = new Float32Array(steps * 3)
let x = 0.1, y = 0.0, z = 0.0

for (let i = 0; i < steps; i++) {
  const dx = sigma * (y - x) * dt
  const dy = (x * (rho - z) - y) * dt
  const dz = (x * y - beta * z) * dt
  x += dx; y += dy; z += dz
  positions[i * 3] = x * 1.5
  positions[i * 3 + 1] = y * 1.5
  positions[i * 3 + 2] = (z - 25) * 1.5
}

// 颜色随位置渐变
const colors = new Float32Array(steps * 3)
for (let i = 0; i < steps; i++) {
  const t = i / steps
  // 蓝 → 紫 → 红 热力色
  colors[i * 3] = 0.5 + 0.5 * Math.sin(t * Math.PI * 3 + 0)
  colors[i * 3 + 1] = 0.5 + 0.5 * Math.sin(t * Math.PI * 3 + 2)
  colors[i * 3 + 2] = 0.5 + 0.5 * Math.sin(t * Math.PI * 3 + 4)
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })
const line = new THREE.Line(geo, mat)
scene.add(line)

// 发光粒子点云
const pointsGeo = new THREE.BufferGeometry()
const pointPositions = new Float32Array(steps * 3)
for (let i = 0; i < steps; i++) {
  pointPositions[i * 3] = positions[i * 3]
  pointPositions[i * 3 + 1] = positions[i * 3 + 1]
  pointPositions[i * 3 + 2] = positions[i * 3 + 2]
}
pointsGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
const pointsMat = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.6 })
scene.add(new THREE.Points(pointsGeo, pointsMat))

scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const pointLight = new THREE.PointLight(0x8844ff, 2, 200)
pointLight.position.set(0, 0, 0)
scene.add(pointLight)

// 起点标记
const startGeo = new THREE.SphereGeometry(0.8, 16, 16)
const startMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa })
const startMesh = new THREE.Mesh(startGeo, startMat)
startMesh.position.set(positions[0], positions[1], positions[2])
scene.add(startMesh)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  pointLight.intensity = 1.5 + 1.0 * Math.sin(clock.getElapsedTime() * 2)
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
