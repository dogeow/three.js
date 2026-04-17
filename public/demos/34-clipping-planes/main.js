import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d1117)

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100)
camera.position.set(6, 5, 9)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.localClippingEnabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const dir = new THREE.DirectionalLight(0xffffff, 1.5)
dir.position.set(6, 9, 5)
scene.add(dir)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(7, 64),
  new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.95 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -2.5
scene.add(floor)

const slicePlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
const planeHelper = new THREE.PlaneHelper(slicePlane, 6, 0xffd36d)
scene.add(planeHelper)

function makeClippedMaterial(color, emissive) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0.3,
    metalness: 0.22,
    roughness: 0.22,
    clippingPlanes: [slicePlane],
    clipShadows: true
  })
}

const group = new THREE.Group()
scene.add(group)

const torus = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.1, 0.35, 180, 28),
  makeClippedMaterial(0x60a5fa, 0x1d4ed8)
)
torus.position.set(0, 1.7, 0)
group.add(torus)

const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.3, 1),
  makeClippedMaterial(0xff7b72, 0x7f1d1d)
)
shell.position.set(-2.6, 0.8, -0.6)
group.add(shell)

const column = new THREE.Mesh(
  new THREE.CylinderGeometry(0.9, 0.9, 4.4, 48),
  makeClippedMaterial(0x57d364, 0x14532d)
)
column.position.set(2.5, 0, 0.4)
group.add(column)

const sliceInput = document.querySelector('#slice')
const sliceValue = document.querySelector('#slice-value')

function updatePlane(value) {
  slicePlane.constant = Number(value)
  sliceValue.textContent = Number(value).toFixed(2)
}

updatePlane(sliceInput.value)
sliceInput.addEventListener('input', (event) => {
  updatePlane(event.target.value)
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  torus.rotation.x = t * 0.45
  torus.rotation.y = t * 0.6
  shell.rotation.y = -t * 0.35
  shell.rotation.z = t * 0.25
  column.rotation.y = t * 0.2

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