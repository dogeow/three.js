import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x07101f)
scene.fog = new THREE.FogExp2(0x07101f, 0.025)

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100)
camera.position.set(8, 5, 11)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.8, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.35))
const dir = new THREE.DirectionalLight(0xffffff, 1.5)
dir.position.set(5, 9, 6)
scene.add(dir)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(16, 80),
  new THREE.MeshStandardMaterial({ color: 0x10192f, roughness: 0.96 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.5
scene.add(floor)

const cubeTarget = new THREE.WebGLCubeRenderTarget(512, {
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter
})
const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeTarget)
scene.add(cubeCamera)

const reflective = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.6, 5),
  new THREE.MeshStandardMaterial({
    envMap: cubeTarget.texture,
    metalness: 1,
    roughness: 0.02,
    color: 0xdbeafe
  })
)
reflective.position.y = 1.8
scene.add(reflective)

const orbiters = []
const colors = [0x60a5fa, 0xf97316, 0x57d364, 0xf472b6, 0xfacc15]
for (let i = 0; i < 5; i++) {
  const mesh = new THREE.Mesh(
    i % 2 === 0
      ? new THREE.TorusKnotGeometry(0.65, 0.18, 120, 18)
      : new THREE.IcosahedronGeometry(0.85, 1),
    new THREE.MeshStandardMaterial({
      color: colors[i],
      emissive: colors[i],
      emissiveIntensity: 0.18,
      metalness: 0.35,
      roughness: 0.22
    })
  )
  scene.add(mesh)
  orbiters.push(mesh)
}

const glowRing = new THREE.Mesh(
  new THREE.TorusGeometry(3.4, 0.08, 16, 100),
  new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.35 })
)
glowRing.rotation.x = Math.PI / 2
glowRing.position.y = 1.8
scene.add(glowRing)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  orbiters.forEach((mesh, index) => {
    const angle = t * (0.35 + index * 0.1) + index * 1.2
    const radius = 3.1 + (index % 2) * 1.2
    mesh.position.set(
      Math.cos(angle) * radius,
      1.4 + Math.sin(t * 1.6 + index) * 1.2,
      Math.sin(angle) * radius
    )
    mesh.rotation.x = t * (0.4 + index * 0.1)
    mesh.rotation.y = t * (0.65 + index * 0.08)
  })

  reflective.rotation.y = t * 0.55

  reflective.visible = false
  cubeCamera.position.copy(reflective.position)
  cubeCamera.update(renderer, scene)
  reflective.visible = true

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