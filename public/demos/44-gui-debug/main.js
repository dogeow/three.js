import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0c1222)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(6, 4, 9)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.25))
const dir = new THREE.DirectionalLight(0xffffff, 1.8)
dir.position.set(5, 8, 6)
scene.add(dir)

const point = new THREE.PointLight(0xff7b72, 12, 24)
point.position.set(-3, 2.8, 2)
scene.add(point)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(9, 64),
  new THREE.MeshStandardMaterial({ color: 0x161d31, roughness: 0.92, metalness: 0.08 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.5
scene.add(floor)

const mesh = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.25, 0.42, 180, 28),
  new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.25,
    metalness: 0.55,
    roughness: 0.2
  })
)
mesh.position.y = 1.1
scene.add(mesh)

const params = {
  color: '#60a5fa',
  emissive: '#1d4ed8',
  metalness: 0.55,
  roughness: 0.2,
  emissiveIntensity: 0.25,
  rotateX: 0.45,
  rotateY: 0.8,
  lightIntensity: 1.8,
  pointIntensity: 12,
  background: '#0c1222'
}

const gui = new GUI({ title: '材质与灯光' })
gui.addColor(params, 'color').name('主体颜色').onChange((value) => {
  mesh.material.color.set(value)
})
gui.addColor(params, 'emissive').name('自发光').onChange((value) => {
  mesh.material.emissive.set(value)
})
gui.add(params, 'metalness', 0, 1, 0.01).name('金属度').onChange((value) => {
  mesh.material.metalness = value
})
gui.add(params, 'roughness', 0, 1, 0.01).name('粗糙度').onChange((value) => {
  mesh.material.roughness = value
})
gui.add(params, 'emissiveIntensity', 0, 2, 0.01).name('发光强度').onChange((value) => {
  mesh.material.emissiveIntensity = value
})
gui.add(params, 'rotateX', 0, 2, 0.01).name('X 旋转速度')
gui.add(params, 'rotateY', 0, 2, 0.01).name('Y 旋转速度')
gui.add(params, 'lightIntensity', 0, 4, 0.01).name('主灯亮度').onChange((value) => {
  dir.intensity = value
})
gui.add(params, 'pointIntensity', 0, 24, 0.1).name('点光亮度').onChange((value) => {
  point.intensity = value
})
gui.addColor(params, 'background').name('背景色').onChange((value) => {
  scene.background = new THREE.Color(value)
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  mesh.rotation.x += dt * params.rotateX
  mesh.rotation.y += dt * params.rotateY

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