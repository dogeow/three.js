import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1020)
scene.fog = new THREE.FogExp2(0x0a1020, 0.028)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.6, 12)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.12
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 6
controls.maxDistance = 18
controls.target.set(0, 1.25, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.46))
const keyLight = new THREE.DirectionalLight(0xffffff, 1.35)
keyLight.position.set(5, 8, 6)
scene.add(keyLight)
const fillLight = new THREE.PointLight(0x22d3ee, 16, 20, 2)
fillLight.position.set(-4, 3, 5)
scene.add(fillLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(16, 120),
  new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.92, metalness: 0.08 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -2
scene.add(floor)

const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(2.4, 3, 0.9, 48),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.22 })
)
pedestal.position.y = -1.55
scene.add(pedestal)

const hostGeometry = new THREE.TorusKnotGeometry(1.45, 0.46, 240, 32)
const hostMaterial = new THREE.MeshStandardMaterial({
  color: 0x60a5fa,
  emissive: 0x2563eb,
  emissiveIntensity: 0.24,
  metalness: 0.26,
  roughness: 0.18
})
const hostMesh = new THREE.Mesh(hostGeometry, hostMaterial)
hostMesh.position.y = 1.25
scene.add(hostMesh)

const crystalGeometry = new THREE.ConeGeometry(0.045, 0.38, 6)
crystalGeometry.translate(0, 0.19, 0)
const crystalMaterial = new THREE.MeshStandardMaterial({
  color: 0xa7f3d0,
  emissive: 0x22c55e,
  emissiveIntensity: 0.5,
  metalness: 0.08,
  roughness: 0.22
})

let crystals = null
const tempPosition = new THREE.Vector3()
const tempNormal = new THREE.Vector3()
const tempColor = new THREE.Color()
const dummy = new THREE.Object3D()

function rebuildCrystals(count) {
  if (crystals) {
    scene.remove(crystals)
    crystals.geometry.dispose()
  }

  const sampler = new MeshSurfaceSampler(hostMesh).build()
  crystals = new THREE.InstancedMesh(crystalGeometry, crystalMaterial, count)
  crystals.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

  for (let i = 0; i < count; i++) {
    sampler.sample(tempPosition, tempNormal)
    dummy.position.copy(tempPosition)
    dummy.lookAt(tempPosition.clone().add(tempNormal))
    dummy.rotateX(Math.PI / 2)

    const scale = 0.7 + Math.random() * 1.8
    dummy.scale.setScalar(scale)
    dummy.updateMatrix()
    crystals.setMatrixAt(i, dummy.matrix)

    tempColor.setHSL(0.38 + Math.random() * 0.1, 0.8, 0.62 + Math.random() * 0.08)
    crystals.setColorAt(i, tempColor)
  }

  crystals.instanceMatrix.needsUpdate = true
  if (crystals.instanceColor) crystals.instanceColor.needsUpdate = true
  crystals.position.copy(hostMesh.position)
  scene.add(crystals)
}

const countInput = document.getElementById('count')
const countValue = document.getElementById('count-value')

function syncScatter() {
  const count = Number(countInput.value)
  countValue.textContent = String(count)
  rebuildCrystals(count)
}

countInput.addEventListener('input', syncScatter)
syncScatter()

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  hostMesh.rotation.x += delta * 0.22
  hostMesh.rotation.y += delta * 0.48
  hostMesh.position.y = 1.25 + Math.sin(time * 1.4) * 0.16
  if (crystals) {
    crystals.rotation.copy(hostMesh.rotation)
    crystals.position.copy(hostMesh.position)
  }

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
window.hostMesh = hostMesh

renderer.setAnimationLoop(animate)