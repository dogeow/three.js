import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1020)
scene.fog = new THREE.FogExp2(0x0b1020, 0.025)

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100)
camera.position.set(8, 5, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.6, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const dir = new THREE.DirectionalLight(0xffffff, 1.6)
dir.position.set(5, 8, 6)
scene.add(dir)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x121a2f, roughness: 0.94 })
)
floor.rotation.x = -Math.PI / 2
scene.add(floor)

const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(2.6, 3.1, 0.55, 48),
  new THREE.MeshStandardMaterial({ color: 0x23304e, metalness: 0.2, roughness: 0.45 })
)
stage.position.y = 0.28
scene.add(stage)

const monitorFrame = new THREE.Mesh(
  new THREE.BoxGeometry(5.6, 3.5, 0.22),
  new THREE.MeshStandardMaterial({ color: 0x1c2538, metalness: 0.5, roughness: 0.35 })
)
monitorFrame.position.set(0, 3.2, -2.7)
scene.add(monitorFrame)

const monitorStand = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.22, 1.8, 18),
  new THREE.MeshStandardMaterial({ color: 0x202838, metalness: 0.4, roughness: 0.5 })
)
monitorStand.position.set(0, 1.9, -2.7)
scene.add(monitorStand)

const subScene = new THREE.Scene()
subScene.background = new THREE.Color(0x050913)
subScene.add(new THREE.AmbientLight(0xffffff, 0.35))
const subLight = new THREE.DirectionalLight(0xffffff, 1.6)
subLight.position.set(3, 5, 4)
subScene.add(subLight)

const subCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 30)
subCamera.position.set(0, 2.5, 6)
subCamera.lookAt(0, 1.1, 0)

const renderTarget = new THREE.WebGLRenderTarget(1024, 1024)

const subFloor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 60),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.96 })
)
subFloor.rotation.x = -Math.PI / 2
subFloor.position.y = -1.2
subScene.add(subFloor)

const subObjects = []
const colors = [0x60a5fa, 0xff7b72, 0x57d364, 0xfacc15]
for (let i = 0; i < 4; i++) {
  const mesh = new THREE.Mesh(
    i % 2 === 0
      ? new THREE.TorusKnotGeometry(0.75, 0.24, 120, 20)
      : new THREE.IcosahedronGeometry(0.95, 1),
    new THREE.MeshStandardMaterial({
      color: colors[i],
      emissive: colors[i],
      emissiveIntensity: 0.18,
      metalness: 0.28,
      roughness: 0.2
    })
  )
  mesh.position.set((i - 1.5) * 1.7, 0.9 + (i % 2) * 0.4, 0)
  subScene.add(mesh)
  subObjects.push(mesh)
}

const monitorScreen = new THREE.Mesh(
  new THREE.PlaneGeometry(5.1, 3),
  new THREE.MeshBasicMaterial({ map: renderTarget.texture })
)
monitorScreen.position.set(0, 3.2, -2.58)
scene.add(monitorScreen)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  subObjects.forEach((mesh, index) => {
    mesh.rotation.x = t * (0.4 + index * 0.08)
    mesh.rotation.y = t * (0.7 + index * 0.05)
    mesh.position.z = Math.sin(t * 1.3 + index) * 0.75
  })

  renderer.setRenderTarget(renderTarget)
  renderer.render(subScene, subCamera)
  renderer.setRenderTarget(null)

  stage.rotation.y = Math.sin(t * 0.5) * 0.15
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