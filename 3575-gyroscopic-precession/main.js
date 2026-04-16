// 3575. Gyroscopic Precession - Torque-free precession simulation
// type: physics-rotational
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x101018)

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 500)
camera.position.set(25, 15, 30)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Spinning wheel with axle
const wheelGroup = new THREE.Group()

// Rim
const rimGeo = new THREE.TorusGeometry(5, 0.4, 16, 48)
const rimMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.9, roughness: 0.2 })
const rim = new THREE.Mesh(rimGeo, rimMat)
rim.rotation.y = Math.PI / 2
wheelGroup.add(rim)

// Spokes
for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2
  const spokeGeo = new THREE.CylinderGeometry(0.15, 0.15, 9.5, 8)
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.8 })
  const spoke = new THREE.Mesh(spokeGeo, spokeMat)
  spoke.rotation.z = Math.PI / 2
  spoke.rotation.y = angle
  wheelGroup.add(spoke)
}

// Hub
const hubGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 16)
const hubMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.9 })
const hub = new THREE.Mesh(hubGeo, hubMat)
hub.rotation.z = Math.PI / 2
wheelGroup.add(hub)

// Axle
const axleGeo = new THREE.CylinderGeometry(0.2, 0.2, 12, 12)
const axleMat = new THREE.MeshStandardMaterial({ color: 0xccddee, metalness: 0.95 })
const axle = new THREE.Mesh(axleGeo, axleMat)
axle.rotation.z = Math.PI / 2
wheelGroup.add(axle)

// Mounting bracket
const bracketGeo = new THREE.BoxGeometry(0.5, 3, 0.5)
const bracketMat = new THREE.MeshStandardMaterial({ color: 0x444455 })
const bracket1 = new THREE.Mesh(bracketGeo, bracketMat)
bracket1.position.set(-4, 0, 0)
const bracket2 = new THREE.Mesh(bracketGeo, bracketMat)
bracket2.position.set(4, 0, 0)
wheelGroup.add(bracket1, bracket2)

scene.add(wheelGroup)

// Support pivot
const pivotGeo = new THREE.CylinderGeometry(0.4, 0.4, 2, 16)
const pivotMat = new THREE.MeshStandardMaterial({ color: 0x333344 })
const pivot = new THREE.Mesh(pivotGeo, pivotMat)
pivot.position.y = -3
scene.add(pivot)

// Base
const baseGeo = new THREE.CylinderGeometry(4, 5, 1, 32)
const baseMat = new THREE.MeshStandardMaterial({ color: 0x222233 })
const base = new THREE.Mesh(baseGeo, baseMat)
base.position.y = -4
scene.add(base)

// Arrows for torque/angular momentum visualization
const createArrow = (color) => {
  const dir = new THREE.Vector3(1, 0, 0)
  const origin = new THREE.Vector3(0, 0, 0)
  const arrow = new THREE.ArrowHelper(dir, origin, 5, color, 0.8, 0.4)
  return arrow
}
const lArrow = createArrow(0x00ff88)  // Angular momentum (spin)
const tauArrow = createArrow(0xff4444) // Torque vector
wheelGroup.add(lArrow, tauArrow)

// Physics state
const params = { spinSpeed: 15, precessionRate: 0, gravity: 9.8, showArrows: true }
let wheelAngle = 0
let precessionAngle = 0

const gui = new GUI()
gui.add(params, 'spinSpeed', 1, 30, 0.5).name('Spin Speed')
gui.add(params, 'gravity', 0, 20, 0.1).name('Gravity')
gui.add(params, 'showArrows').name('Show Vectors')

scene.add(new THREE.AmbientLight(0x6666aa, 0.4))
const keyLight = new THREE.DirectionalLight(0xffffff, 1)
keyLight.position.set(10, 20, 15)
scene.add(keyLight)
const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3)
fillLight.position.set(-10, 5, -10)
scene.add(fillLight)

const label = document.createElement('div')
label.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);color:#888;font:12px monospace;background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:6px'
label.textContent = 'Spinning wheel precesses under gravity — ωₚ = τ/L'
document.body.appendChild(label)

function animate() {
  requestAnimationFrame(animate)
  const dt = 0.016
  
  // Wheel spin
  wheelAngle += params.spinSpeed * dt
  rim.rotation.x = wheelAngle
  hub.rotation.x = wheelAngle
  
  // Precession: τ = r × F, L = Iω, ω_precession = τ/L
  // Simplified: precession rate proportional to gravity / spin
  const I = 25  // moment of inertia
  const L = I * params.spinSpeed  // angular momentum magnitude
  const tau = 5 * params.gravity  // torque = r × mg
  params.precessionRate = tau / L
  
  precessionAngle += params.precessionRate * dt
  wheelGroup.rotation.z = Math.PI / 6  // tilt angle
  wheelGroup.rotation.y = precessionAngle
  
  lArrow.setDirection(new THREE.Vector3(Math.cos(wheelAngle * 0.3), 0, Math.sin(wheelAngle * 0.3)))
  lArrow.setLength(Math.min(L * 0.15, 8))
  tauArrow.setDirection(new THREE.Vector3(0, Math.cos(precessionAngle), Math.sin(precessionAngle)))
  tauArrow.visible = params.showArrows
  lArrow.visible = params.showArrows
  
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
