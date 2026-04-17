import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x101522)
scene.fog = new THREE.FogExp2(0x101522, 0.03)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100)
camera.position.set(8, 7, 10)

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
dir.position.set(6, 10, 4)
dir.castShadow = true
scene.add(dir)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x1a2236, roughness: 0.92, metalness: 0.08 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const grid = new THREE.GridHelper(30, 30, 0x5f7cff, 0x31415f)
grid.position.y = 0.002
scene.add(grid)

const objects = []

function addEditable(mesh, position, name) {
  mesh.position.copy(position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.name = name
  scene.add(mesh)
  objects.push(mesh)
  return mesh
}

addEditable(
  new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.8, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x5f7cff, metalness: 0.2, roughness: 0.32 })
  ),
  new THREE.Vector3(-3.4, 1, -0.8),
  '方块'
)

addEditable(
  new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 48, 48),
    new THREE.MeshStandardMaterial({ color: 0xff7b72, metalness: 0.35, roughness: 0.18 })
  ),
  new THREE.Vector3(0, 1.1, 0.3),
  '球体'
)

addEditable(
  new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 1.15, 2.6, 32),
    new THREE.MeshStandardMaterial({ color: 0x57d364, metalness: 0.15, roughness: 0.45 })
  ),
  new THREE.Vector3(3.3, 1.3, -1.1),
  '圆柱'
)

const transformControls = new TransformControls(camera, renderer.domElement)
transformControls.attach(objects[0])
transformControls.setSize(0.95)
scene.add(transformControls)

transformControls.addEventListener('dragging-changed', (event) => {
  controls.enabled = !event.value
})

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let isDraggingTransform = false

transformControls.addEventListener('mouseDown', () => {
  isDraggingTransform = true
})
transformControls.addEventListener('mouseUp', () => {
  // 下一帧再放开，避免 mouseup 被当成一次选中点击
  requestAnimationFrame(() => {
    isDraggingTransform = false
  })
})

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (isDraggingTransform) return

  pointer.x = (event.clientX / innerWidth) * 2 - 1
  pointer.y = -(event.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const hit = raycaster.intersectObjects(objects, false)[0]
  if (hit) {
    transformControls.attach(hit.object)
  }
})

addEventListener('keydown', (event) => {
  if (event.repeat) return

  if (event.code === 'KeyW') transformControls.setMode('translate')
  if (event.code === 'KeyE') transformControls.setMode('rotate')
  if (event.code === 'KeyR') transformControls.setMode('scale')
  if (event.code === 'KeyQ') {
    transformControls.setSpace(
      transformControls.space === 'local' ? 'world' : 'local'
    )
  }
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