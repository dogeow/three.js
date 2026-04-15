import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSM } from 'three/addons/csm/CSM.js'
import { CSMHelper } from 'three/addons/csm/CSMHelper.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xd7e2ea)
scene.fog = new THREE.Fog(0xd7e2ea, 90, 240)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 260)
camera.position.set(18, 16, 36)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.02
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 18
controls.maxDistance = 70
controls.maxPolarAngle = Math.PI * 0.47
controls.target.set(0, 2.2, -50)

scene.add(new THREE.AmbientLight(0xffffff, 1.55))

const fillLight = new THREE.DirectionalLight(0xb9d7ff, 0.8)
fillLight.position.set(30, 24, 18)
scene.add(fillLight)

const sunDirection = new THREE.Vector3(-0.82, -1, -0.24).normalize()
const csm = new CSM({
  maxFar: 180,
  cascades: 4,
  mode: 'practical',
  parent: scene,
  shadowMapSize: 1024,
  lightDirection: sunDirection.clone(),
  lightIntensity: 2.6,
  lightFar: 220,
  lightMargin: 60,
  camera
})

const csmHelper = new CSMHelper(csm)
csmHelper.visible = false
scene.add(csmHelper)

const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xcbbf9d })
const roadMaterial = new THREE.MeshPhongMaterial({ color: 0x2b313d })
const curbMaterial = new THREE.MeshPhongMaterial({ color: 0x8d857a })
const columnMaterial = new THREE.MeshPhongMaterial({ color: 0xae7d5a })
const crownMaterial = new THREE.MeshPhongMaterial({ color: 0x426654 })
const droneMaterial = new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x7c2d12 })

for (const material of [groundMaterial, roadMaterial, curbMaterial, columnMaterial, crownMaterial, droneMaterial]) {
  csm.setupMaterial(material)
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(180, 320),
  groundMaterial
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 300),
  roadMaterial
)
road.rotation.x = -Math.PI / 2
road.position.set(0, 0.02, -42)
road.receiveShadow = true
scene.add(road)

const curbLeft = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 300), curbMaterial)
curbLeft.position.set(-8.6, 0.12, -42)
curbLeft.castShadow = true
curbLeft.receiveShadow = true
scene.add(curbLeft)

const curbRight = curbLeft.clone()
curbRight.position.x = 8.6
scene.add(curbRight)

const benchGeometry = new THREE.BoxGeometry(1.8, 0.28, 0.7)
const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.3, 2.2, 12)
const crownGeometry = new THREE.SphereGeometry(1.15, 20, 20)
const towerGeometry = new THREE.BoxGeometry(1.7, 6.5, 1.7)

for (let i = 0; i < 30; i++) {
  const z = -6 - i * 9.2
  const towerLeft = new THREE.Mesh(towerGeometry, columnMaterial)
  towerLeft.position.set(-11.5, 3.25, z)
  towerLeft.scale.y = 0.75 + (i % 5) * 0.16
  towerLeft.castShadow = true
  towerLeft.receiveShadow = true
  scene.add(towerLeft)

  const towerRight = towerLeft.clone()
  towerRight.position.x = 11.5
  scene.add(towerRight)

  const treeTrunkLeft = new THREE.Mesh(trunkGeometry, columnMaterial)
  treeTrunkLeft.position.set(-15.2, 1.1, z - 2)
  treeTrunkLeft.castShadow = true
  treeTrunkLeft.receiveShadow = true
  scene.add(treeTrunkLeft)

  const treeTrunkRight = treeTrunkLeft.clone()
  treeTrunkRight.position.x = 15.2
  scene.add(treeTrunkRight)

  const crownLeft = new THREE.Mesh(crownGeometry, crownMaterial)
  crownLeft.position.set(-15.2, 3.35, z - 2)
  crownLeft.castShadow = true
  crownLeft.receiveShadow = true
  scene.add(crownLeft)

  const crownRight = crownLeft.clone()
  crownRight.position.x = 15.2
  scene.add(crownRight)

  if (i % 3 === 0) {
    const benchLeft = new THREE.Mesh(benchGeometry, curbMaterial)
    benchLeft.position.set(-10.1, 0.46, z + 2)
    benchLeft.castShadow = true
    benchLeft.receiveShadow = true
    scene.add(benchLeft)

    const benchRight = benchLeft.clone()
    benchRight.position.x = 10.1
    scene.add(benchRight)
  }
}

const drone = new THREE.Group()
const droneBody = new THREE.Mesh(
  new THREE.SphereGeometry(0.9, 28, 28),
  droneMaterial
)
droneBody.castShadow = true
droneBody.receiveShadow = true
drone.add(droneBody)

for (let i = -1; i <= 1; i += 2) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.05, 10, 48),
    new THREE.MeshBasicMaterial({ color: 0xfde68a })
  )
  ring.rotation.x = Math.PI / 2
  ring.position.x = i * 0.9
  drone.add(ring)
}

scene.add(drone)

const shadowFarInput = document.getElementById('shadow-far')
const shadowFarValue = document.getElementById('shadow-far-value')
const modeInput = document.getElementById('mode')
const modeValue = document.getElementById('mode-value')
const fadeInput = document.getElementById('fade')
const helperInput = document.getElementById('helper')

function syncCSM() {
  csm.maxFar = Number(shadowFarInput.value)
  csm.mode = modeInput.value
  csm.fade = fadeInput.checked
  csm.updateFrustums()
  shadowFarValue.textContent = shadowFarInput.value
  modeValue.textContent = modeInput.value
  csmHelper.visible = helperInput.checked
  if (csmHelper.visible) csmHelper.update()
}

shadowFarInput.addEventListener('input', syncCSM)
modeInput.addEventListener('change', syncCSM)
fadeInput.addEventListener('change', syncCSM)
helperInput.addEventListener('change', syncCSM)
syncCSM()

const clock = new THREE.Clock()

function animate() {
  const time = clock.getElapsedTime()

  drone.position.set(
    Math.sin(time * 0.55) * 5.2,
    5.4 + Math.sin(time * 1.5) * 0.5,
    -34 + Math.cos(time * 0.38) * 56
  )
  drone.rotation.y = time * 1.2

  controls.update()
  camera.updateMatrixWorld()
  csm.update()
  if (csmHelper.visible) csmHelper.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  csm.updateFrustums()
  if (csmHelper.visible) csmHelper.update()
})

window.scene = scene
window.camera = camera
window.csm = csm

renderer.setAnimationLoop(animate)