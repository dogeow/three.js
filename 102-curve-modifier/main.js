import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Flow } from 'three/addons/modifiers/CurveModifier.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x070b16)
scene.fog = new THREE.FogExp2(0x070b16, 0.026)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120)
camera.position.set(0, 5.2, 14)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.12
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 7
controls.maxDistance = 20
controls.target.set(0, 1.4, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const keyLight = new THREE.DirectionalLight(0xffffff, 1.3)
keyLight.position.set(5, 8, 5)
scene.add(keyLight)
const accentLight = new THREE.PointLight(0xf59e0b, 14, 20, 2)
accentLight.position.set(-4, 2, 5)
scene.add(accentLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(18, 120),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.94, metalness: 0.08 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -2
scene.add(floor)

const curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-6, 0.8, -2),
  new THREE.Vector3(-4, 2.8, 3),
  new THREE.Vector3(-1, 1.2, 5),
  new THREE.Vector3(3, 3.8, 2),
  new THREE.Vector3(5, 0.9, -3),
  new THREE.Vector3(1, 1.2, -6),
  new THREE.Vector3(-4, 3.4, -4)
], true)

const curvePoints = curve.getSpacedPoints(240)
scene.add(new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(curvePoints),
  new THREE.LineBasicMaterial({ color: 0x60a5fa })
))

const train = new THREE.Group()

function addCarriage(offset, color) {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.7, 0.8),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      metalness: 0.18,
      roughness: 0.22
    })
  )
  body.position.x = offset
  train.add(body)

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.45, 0.62),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.08,
      roughness: 0.12
    })
  )
  cabin.position.set(offset + 0.15, 0.45, 0)
  train.add(cabin)
}

addCarriage(-1.9, 0xf59e0b)
addCarriage(0, 0x60a5fa)
addCarriage(1.9, 0x4ade80)

for (let i = -1; i <= 1; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.04, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  )
  ring.rotation.y = Math.PI / 2
  ring.position.set(i * 1.9, 0, 0)
  train.add(ring)
}

const flow = new Flow(train)
flow.updateCurve(0, curve)
scene.add(flow.object3D)

const speedInput = document.getElementById('speed')
const speedValue = document.getElementById('speed-value')

function syncSpeedLabel() {
  speedValue.textContent = Number(speedInput.value).toFixed(2)
}

speedInput.addEventListener('input', syncSpeedLabel)
syncSpeedLabel()

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const speed = Number(speedInput.value)

  flow.moveAlongCurve(delta * speed)
  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera
window.flow = flow

renderer.setAnimationLoop(animate)