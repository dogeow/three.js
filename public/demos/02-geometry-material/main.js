import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0f1724)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 3.5, 12)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.target.set(0, 1.2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))

const dirLight = new THREE.DirectionalLight(0xffffff, 1.35)
dirLight.position.set(6, 8, 5)
dirLight.castShadow = true
scene.add(dirLight)

const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.45)
rimLight.position.set(-6, 4, -5)
scene.add(rimLight)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 8),
  new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.95, metalness: 0.05 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const grid = new THREE.GridHelper(22, 22, 0x28435d, 0x162233)
grid.position.y = 0.01
scene.add(grid)

const geometryEntries = [
  { geo: new THREE.BoxGeometry(1.2, 1.2, 1.2), y: 1.05 },
  { geo: new THREE.SphereGeometry(0.78, 40, 24), y: 1.05 },
  { geo: new THREE.ConeGeometry(0.78, 1.5, 40), y: 1.05 },
  { geo: new THREE.CylinderGeometry(0.65, 0.65, 1.5, 36), y: 1.05 },
  { geo: new THREE.TorusGeometry(0.62, 0.22, 18, 64), y: 1.05 },
  { geo: new THREE.TorusKnotGeometry(0.5, 0.17, 120, 18), y: 1.05 },
]

const materialPresets = [0x7dd3fc, 0xa78bfa, 0x34d399, 0xf59e0b, 0xfb7185, 0x93c5fd]
const meshes = []

geometryEntries.forEach((entry, index) => {
  const x = (index - (geometryEntries.length - 1) / 2) * 3.1

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.96, 0.36, 32),
    new THREE.MeshStandardMaterial({ color: 0x243244, roughness: 0.9, metalness: 0.08 })
  )
  pedestal.position.set(x, 0.18, 0)
  pedestal.receiveShadow = true
  scene.add(pedestal)

  const mesh = new THREE.Mesh(
    entry.geo,
    new THREE.MeshStandardMaterial({
      color: materialPresets[index],
      roughness: 0.32,
      metalness: 0.18,
    })
  )
  mesh.position.set(x, entry.y, 0)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(entry.geo),
    new THREE.LineBasicMaterial({ color: 0xe6f0ff, transparent: true, opacity: 0.32 })
  )
  edge.position.copy(mesh.position)
  scene.add(edge)

  meshes.push({ mesh, edge })
})

function animate() {
  requestAnimationFrame(animate)
  meshes.forEach(({ mesh, edge }, index) => {
    mesh.rotation.x += 0.003 + index * 0.0005
    mesh.rotation.y += 0.007 + index * 0.0008
    edge.rotation.copy(mesh.rotation)
  })
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera
window.meshes = meshes