import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x08111d)
scene.fog = new THREE.FogExp2(0x08111d, 0.03)

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.8, 12)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 6
controls.maxDistance = 18
controls.target.set(0, 1.2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.42))
const keyLight = new THREE.DirectionalLight(0xffffff, 1.32)
keyLight.position.set(5, 8, 5)
scene.add(keyLight)
const rimLight = new THREE.PointLight(0x22d3ee, 14, 20, 2)
rimLight.position.set(-4, 3, 5)
scene.add(rimLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(15, 120),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.94, metalness: 0.08 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -2
scene.add(floor)

const rockGroup = new THREE.Group()
scene.add(rockGroup)

let hullMesh = null
let hullEdges = null
let pointCloud = null

function generatePoints(count) {
  return Array.from({ length: count }, (_, index) => {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
    const radius = 1.8 + Math.random() * 1.25 + Math.sin(index * 1.1) * 0.18
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * radius,
      Math.cos(phi) * radius * (0.8 + Math.random() * 0.45),
      Math.sin(phi) * Math.sin(theta) * radius
    )
  })
}

function rebuildHull(count) {
  if (hullMesh) {
    rockGroup.remove(hullMesh, hullEdges, pointCloud)
    hullMesh.geometry.dispose()
    hullEdges.geometry.dispose()
    pointCloud.geometry.dispose()
  }

  const points = generatePoints(count)
  const hullGeometry = new ConvexGeometry(points)

  hullMesh = new THREE.Mesh(
    hullGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.68,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.18,
      metalness: 0.14,
      roughness: 0.22
    })
  )

  hullEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(hullGeometry),
    new THREE.LineBasicMaterial({ color: 0xe0f2fe })
  )

  const pointGeometry = new THREE.BufferGeometry().setFromPoints(points)
  pointCloud = new THREE.Points(
    pointGeometry,
    new THREE.PointsMaterial({ color: 0xf8fafc, size: 0.12, sizeAttenuation: true })
  )

  hullMesh.position.y = 1.3
  hullEdges.position.copy(hullMesh.position)
  pointCloud.position.copy(hullMesh.position)
  rockGroup.add(hullMesh, hullEdges, pointCloud)
}

const pointsInput = document.getElementById('points')
const pointsValue = document.getElementById('points-value')
const regenButton = document.getElementById('regen')

function syncHull() {
  const count = Number(pointsInput.value)
  pointsValue.textContent = String(count)
  rebuildHull(count)
}

pointsInput.addEventListener('input', syncHull)
regenButton.addEventListener('click', syncHull)
syncHull()

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  rockGroup.rotation.y += delta * 0.25
  rockGroup.rotation.x = Math.sin(time * 0.7) * 0.18
  rockGroup.position.y = Math.sin(time * 1.2) * 0.1

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
window.rockGroup = rockGroup

renderer.setAnimationLoop(animate)