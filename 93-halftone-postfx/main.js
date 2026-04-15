import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { HalftonePass } from 'three/addons/postprocessing/HalftonePass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf5efe3)

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 3.6, 11)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.06
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 6
controls.maxDistance = 18
controls.target.set(0, 1.4, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.88))

const keyLight = new THREE.DirectionalLight(0xffffff, 1.7)
keyLight.position.set(5, 8, 6)
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0xffd4d4, 0.9)
fillLight.position.set(-6, 3, -4)
scene.add(fillLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(18, 96),
  new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.96 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.8
scene.add(floor)

const plinth = new THREE.Mesh(
  new THREE.CylinderGeometry(3.2, 3.6, 1, 48),
  new THREE.MeshStandardMaterial({
    color: 0xe6dccb,
    roughness: 0.82,
    metalness: 0.05
  })
)
plinth.position.y = -1.3
scene.add(plinth)

const artwork = new THREE.Group()
artwork.position.y = 1.2
scene.add(artwork)

const torus = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.1, 0.34, 180, 26),
  new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    roughness: 0.28,
    metalness: 0.2
  })
)
artwork.add(torus)

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.88, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    roughness: 0.18,
    metalness: 0.12
  })
)
sphere.position.set(-2.25, 0.5, -0.3)
artwork.add(sphere)

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 1.4, 1.4),
  new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.22,
    metalness: 0.08
  })
)
cube.position.set(2.25, -0.25, 0.4)
artwork.add(cube)

const arch = new THREE.Mesh(
  new THREE.TorusGeometry(3.8, 0.14, 18, 120, Math.PI),
  new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.52,
    metalness: 0.1
  })
)
arch.position.y = 1.2
arch.rotation.z = Math.PI
scene.add(arch)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const halftonePass = new HalftonePass(innerWidth, innerHeight, {
  shape: 1,
  radius: 4,
  scatter: 0.25,
  blending: 1,
  blendingMode: 1,
  greyscale: false
})
composer.addPass(halftonePass)
composer.addPass(new OutputPass())

const shapeInput = document.getElementById('shape')
const shapeValue = document.getElementById('shape-value')
const radiusInput = document.getElementById('radius')
const radiusValue = document.getElementById('radius-value')
const scatterInput = document.getElementById('scatter')
const scatterValue = document.getElementById('scatter-value')
const greyscaleInput = document.getElementById('greyscale')

const shapeLabelMap = {
  1: '圆点',
  2: '椭圆',
  3: '线条',
  4: '方块'
}

shapeInput.addEventListener('input', (event) => {
  const shape = Number(event.target.value)
  halftonePass.uniforms.shape.value = shape
  shapeValue.textContent = shapeLabelMap[shape]
})

radiusInput.addEventListener('input', (event) => {
  const radius = Number(event.target.value)
  halftonePass.uniforms.radius.value = radius
  radiusValue.textContent = radius.toFixed(1)
})

scatterInput.addEventListener('input', (event) => {
  const scatter = Number(event.target.value)
  halftonePass.uniforms.scatter.value = scatter
  scatterValue.textContent = scatter.toFixed(2)
})

greyscaleInput.addEventListener('change', (event) => {
  halftonePass.uniforms.greyscale.value = event.target.checked
})

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  artwork.rotation.y += delta * 0.42
  torus.rotation.x += delta * 0.3
  torus.rotation.z += delta * 0.38
  sphere.position.y = 0.5 + Math.sin(time * 1.5) * 0.25
  cube.rotation.x += delta * 0.52
  cube.rotation.y -= delta * 0.46
  arch.rotation.y = Math.sin(time * 0.45) * 0.22

  controls.update()
  composer.render(delta)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera
window.halftonePass = halftonePass
window.artwork = artwork

renderer.setAnimationLoop(animate)