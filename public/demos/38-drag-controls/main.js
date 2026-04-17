import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DragControls } from 'three/addons/controls/DragControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x10131d)
scene.fog = new THREE.FogExp2(0x10131d, 0.028)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(8, 6, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const dir = new THREE.DirectionalLight(0xffffff, 1.5)
dir.position.set(5, 10, 6)
dir.castShadow = true
scene.add(dir)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 0.94, metalness: 0.06 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const draggable = []

function addDraggable(mesh, position) {
  mesh.position.copy(position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.baseEmissive = mesh.material.emissive.clone()
  scene.add(mesh)
  draggable.push(mesh)
}

addDraggable(
  new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.8, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x0f172a, roughness: 0.28, metalness: 0.18 })
  ),
  new THREE.Vector3(-3.4, 1, -1)
)

addDraggable(
  new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.MeshStandardMaterial({ color: 0xff7b72, emissive: 0x1f1115, roughness: 0.16, metalness: 0.34 })
  ),
  new THREE.Vector3(0, 1.05, 0.8)
)

addDraggable(
  new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.1, 2.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x57d364, emissive: 0x0c1c13, roughness: 0.42, metalness: 0.1 })
  ),
  new THREE.Vector3(3.4, 1.2, -0.9)
)

const dragControls = new DragControls(draggable, camera, renderer.domElement)
dragControls.transformGroup = false

dragControls.addEventListener('hoveron', (event) => {
  event.object.material.emissive.set(0x223355)
})

dragControls.addEventListener('hoveroff', (event) => {
  event.object.material.emissive.copy(event.object.userData.baseEmissive)
})

dragControls.addEventListener('dragstart', (event) => {
  controls.enabled = false
  event.object.material.emissive.set(0x335577)
})

dragControls.addEventListener('drag', (event) => {
  event.object.position.y = Math.max(event.object.position.y, 0.6)
})

dragControls.addEventListener('dragend', (event) => {
  controls.enabled = true
  event.object.material.emissive.copy(event.object.userData.baseEmissive)
})

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})