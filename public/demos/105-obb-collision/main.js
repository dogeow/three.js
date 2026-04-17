import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { OBB } from 'three/addons/math/OBB.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x070b14)
scene.fog = new THREE.FogExp2(0x070b14, 0.038)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 5.5, 14)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 7
controls.maxDistance = 18
controls.target.set(0, 0.8, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const keyLight = new THREE.DirectionalLight(0xffffff, 1.45)
keyLight.position.set(4, 7, 6)
scene.add(keyLight)
const accentLight = new THREE.PointLight(0x38bdf8, 16, 20, 2)
accentLight.position.set(-4, 2, 4)
scene.add(accentLight)

scene.add(new THREE.GridHelper(26, 26, 0x1d4ed8, 0x1e293b))

const beamSize = new THREE.Vector3(7.6, 1.1, 1.2)
const beamGeometry = new THREE.BoxGeometry(beamSize.x, beamSize.y, beamSize.z)
beamGeometry.userData.obb = new OBB(new THREE.Vector3(), beamSize.clone().multiplyScalar(0.5))

function createBeam(color) {
  const mesh = new THREE.Mesh(
    beamGeometry,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.14,
      roughness: 0.26,
      metalness: 0.12,
      transparent: true,
      opacity: 0.9
    })
  )
  mesh.userData.obb = new OBB()
  mesh.userData.aabb = new THREE.Box3()
  return mesh
}

const beamA = createBeam(0x60a5fa)
beamA.position.set(-0.6, 1.1, 0)
beamA.rotation.set(0.15, 0.4, Math.PI * 0.24)
scene.add(beamA)

const beamB = createBeam(0x34d399)
scene.add(beamB)

const beamAHelper = new THREE.Box3Helper(new THREE.Box3(), 0x3b82f6)
const beamBHelper = new THREE.Box3Helper(new THREE.Box3(), 0x3b82f6)
scene.add(beamAHelper, beamBHelper)

const marker = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0xfacc15 })
)
scene.add(marker)

const connectorGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
const connector = new THREE.Line(
  connectorGeometry,
  new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8 })
)
scene.add(connector)

const speedInput = document.getElementById('speed')
const speedValue = document.getElementById('speed-value')
const aabbValue = document.getElementById('aabb-value')
const obbValue = document.getElementById('obb-value')
const stateValue = document.getElementById('state-value')
const showAABBInput = document.getElementById('show-aabb')

showAABBInput.addEventListener('change', () => {
  beamAHelper.visible = showAABBInput.checked
  beamBHelper.visible = showAABBInput.checked
})

const linePoints = connectorGeometry.attributes.position
const clock = new THREE.Clock()

function updateBeamTransforms(time, speed) {
  beamA.rotation.y = 0.35 + Math.sin(time * 0.32 * speed) * 0.28
  beamA.rotation.z = Math.PI * 0.24 + Math.sin(time * 0.44 * speed) * 0.16

  beamB.position.set(
    1.6 + Math.sin(time * 0.95 * speed) * 2.45,
    1.15 + Math.sin(time * 1.7 * speed) * 0.55,
    Math.cos(time * 0.72 * speed) * 1.05
  )
  beamB.rotation.set(
    0.48 + Math.sin(time * 1.25 * speed) * 0.22,
    -0.42 + Math.cos(time * 0.66 * speed) * 0.34,
    -Math.PI * 0.23 + Math.sin(time * 0.84 * speed) * 0.38
  )
}

function syncCollisionState() {
  beamA.updateMatrixWorld(true)
  beamB.updateMatrixWorld(true)

  beamA.userData.obb.copy(beamGeometry.userData.obb).applyMatrix4(beamA.matrixWorld)
  beamB.userData.obb.copy(beamGeometry.userData.obb).applyMatrix4(beamB.matrixWorld)

  beamA.userData.aabb.setFromObject(beamA)
  beamB.userData.aabb.setFromObject(beamB)
  beamAHelper.box.copy(beamA.userData.aabb)
  beamBHelper.box.copy(beamB.userData.aabb)

  const aabbOverlap = beamA.userData.aabb.intersectsBox(beamB.userData.aabb)
  const obbOverlap = beamA.userData.obb.intersectsOBB(beamB.userData.obb)

  beamA.material.color.setHex(obbOverlap ? 0xf97316 : aabbOverlap ? 0xf59e0b : 0x60a5fa)
  beamB.material.color.setHex(obbOverlap ? 0xfb7185 : aabbOverlap ? 0xfbbf24 : 0x34d399)
  beamA.material.emissive.setHex(obbOverlap ? 0x7c2d12 : aabbOverlap ? 0x78350f : 0x1d4ed8)
  beamB.material.emissive.setHex(obbOverlap ? 0x881337 : aabbOverlap ? 0x854d0e : 0x047857)

  beamAHelper.material.color.setHex(aabbOverlap ? 0xf59e0b : 0x3b82f6)
  beamBHelper.material.color.setHex(aabbOverlap ? 0xf59e0b : 0x3b82f6)

  beamA.userData.obb.clampPoint(beamB.position, marker.position)
  linePoints.setXYZ(0, beamB.position.x, beamB.position.y, beamB.position.z)
  linePoints.setXYZ(1, marker.position.x, marker.position.y, marker.position.z)
  linePoints.needsUpdate = true

  aabbValue.textContent = aabbOverlap ? '是' : '否'
  obbValue.textContent = obbOverlap ? '是' : '否'
  stateValue.textContent = obbOverlap ? '真实碰撞' : aabbOverlap ? 'AABB 假重叠' : '分离'
}

function animate() {
  const time = clock.getElapsedTime()
  const speed = Number(speedInput.value)

  speedValue.textContent = `${speed.toFixed(2)}x`
  updateBeamTransforms(time, speed)
  syncCollisionState()

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
window.beamA = beamA
window.beamB = beamB

renderer.setAnimationLoop(animate)