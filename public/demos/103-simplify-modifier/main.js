import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x08101a)
scene.fog = new THREE.FogExp2(0x08101a, 0.03)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 3.8, 13.5)

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
controls.target.set(0, 1.1, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.55))
const keyLight = new THREE.DirectionalLight(0xffffff, 1.45)
keyLight.position.set(4, 8, 6)
scene.add(keyLight)
const rimLight = new THREE.PointLight(0x38bdf8, 18, 22, 2)
rimLight.position.set(-5, 3, 4)
scene.add(rimLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(18, 120),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.94, metalness: 0.08 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -2
scene.add(floor)

const leftPedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(2.1, 2.6, 0.8, 48),
  new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.4, metalness: 0.18 })
)
leftPedestal.position.set(-3.8, -1.6, 0)
scene.add(leftPedestal)

const rightPedestal = leftPedestal.clone()
rightPedestal.position.x = 3.8
scene.add(rightPedestal)

function buildBaseGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1.85, 5)
  const position = geometry.attributes.position
  const vertex = new THREE.Vector3()

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i)
    const direction = vertex.clone().normalize()
    const bands =
      Math.sin(direction.x * 13.0) * 0.12 +
      Math.cos(direction.y * 17.0) * 0.08 +
      Math.sin((direction.x + direction.z) * 9.0) * 0.1
    const ridges = Math.sin(vertex.y * 2.8) * 0.07 + Math.cos(vertex.x * 3.6) * 0.05
    const radius = 1 + bands + ridges
    vertex.copy(direction).multiplyScalar(1.72 * radius)
    position.setXYZ(i, vertex.x, vertex.y, vertex.z)
  }

  geometry.computeVertexNormals()
  return geometry
}

const baseGeometry = buildBaseGeometry()
const originalVertexCount = baseGeometry.getAttribute('position').count
const modifier = new SimplifyModifier()

const originalGroup = new THREE.Group()
originalGroup.position.x = -3.8
scene.add(originalGroup)

const originalMesh = new THREE.Mesh(
  baseGeometry,
  new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.2,
    roughness: 0.28,
    metalness: 0.14,
    transparent: true,
    opacity: 0.78
  })
)
originalGroup.add(originalMesh)

const originalWire = new THREE.LineSegments(
  new THREE.WireframeGeometry(baseGeometry),
  new THREE.LineBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.55 })
)
originalGroup.add(originalWire)

const simplifiedGroup = new THREE.Group()
simplifiedGroup.position.x = 3.8
scene.add(simplifiedGroup)

const simplifiedMaterial = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  emissive: 0x7c2d12,
  emissiveIntensity: 0.22,
  roughness: 0.34,
  metalness: 0.08,
  flatShading: true
})
let simplifiedMesh = new THREE.Mesh(baseGeometry.clone(), simplifiedMaterial)
simplifiedGroup.add(simplifiedMesh)

const ratioInput = document.getElementById('ratio')
const ratioValue = document.getElementById('ratio-value')
const beforeValue = document.getElementById('before-value')
const afterValue = document.getElementById('after-value')
beforeValue.textContent = String(originalVertexCount)

let rebuildQueued = false

function rebuildSimplified() {
  rebuildQueued = false
  const ratio = Number(ratioInput.value) / 100
  const removeCount = Math.min(originalVertexCount - 24, Math.floor(originalVertexCount * ratio))
  const simplifiedGeometry = modifier.modify(baseGeometry, removeCount)
  simplifiedGeometry.computeVertexNormals()

  simplifiedMesh.geometry.dispose()
  simplifiedMesh.geometry = simplifiedGeometry

  ratioValue.textContent = `${Math.round(ratio * 100)}%`
  afterValue.textContent = String(simplifiedGeometry.getAttribute('position').count)
}

function queueRebuild() {
  if (rebuildQueued) return
  rebuildQueued = true
  requestAnimationFrame(rebuildSimplified)
}

ratioInput.addEventListener('input', queueRebuild)
queueRebuild()

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  originalGroup.rotation.y += delta * 0.42
  simplifiedGroup.rotation.y += delta * 0.42
  originalGroup.rotation.x = Math.sin(time * 0.7) * 0.12
  simplifiedGroup.rotation.x = Math.sin(time * 0.7) * 0.12
  originalGroup.position.y = Math.sin(time * 1.1) * 0.08 + 1.0
  simplifiedGroup.position.y = Math.sin(time * 1.1) * 0.08 + 1.0

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
window.originalMesh = originalMesh
window.simplifiedMesh = simplifiedMesh

renderer.setAnimationLoop(animate)