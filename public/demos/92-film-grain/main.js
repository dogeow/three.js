import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x070d15)
scene.fog = new THREE.FogExp2(0x070d15, 0.028)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.2, 12)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.18
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.target.set(0, 1.7, 0)

scene.add(new THREE.AmbientLight(0x8ec5ff, 0.45))

const keyLight = new THREE.SpotLight(0xfff1c1, 70, 40, Math.PI / 6, 0.35, 1.4)
keyLight.position.set(6, 12, 8)
keyLight.target.position.set(0, 1.5, 0)
scene.add(keyLight, keyLight.target)

const fillLight = new THREE.PointLight(0x60a5fa, 18, 24, 2)
fillLight.position.set(-6, 3, -4)
scene.add(fillLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(16, 96),
  new THREE.MeshStandardMaterial({
    color: 0x0c1624,
    roughness: 0.92,
    metalness: 0.08
  })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.8
scene.add(floor)

const grid = new THREE.GridHelper(18, 24, 0x2a3b56, 0x172436)
grid.position.y = -1.78
grid.material.opacity = 0.28
grid.material.transparent = true
scene.add(grid)

const stage = new THREE.Group()
scene.add(stage)

const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(2.2, 2.6, 1.1, 48),
  new THREE.MeshStandardMaterial({
    color: 0x1a2434,
    metalness: 0.35,
    roughness: 0.42
  })
)
pedestal.position.y = -1.25
stage.add(pedestal)

const sculpture = new THREE.Group()
sculpture.position.y = 1.55
stage.add(sculpture)

const torusKnot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.1, 0.28, 220, 32),
  new THREE.MeshStandardMaterial({
    color: 0xf7c55a,
    emissive: 0x9a5a10,
    emissiveIntensity: 0.55,
    metalness: 0.58,
    roughness: 0.24
  })
)
sculpture.add(torusKnot)

for (let i = 0; i < 6; i++) {
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 2.8 + Math.sin(i) * 0.8, 0.28),
    new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0x60a5fa : 0xfb7185,
      emissive: i % 2 === 0 ? 0x2563eb : 0xbe123c,
      emissiveIntensity: 0.85,
      metalness: 0.18,
      roughness: 0.32
    })
  )
  const angle = (i / 6) * Math.PI * 2
  pillar.position.set(Math.cos(angle) * 3.4, -0.15, Math.sin(angle) * 3.4)
  stage.add(pillar)
}

const sparkleGeo = new THREE.BufferGeometry()
const sparklePositions = new Float32Array(1800)
for (let i = 0; i < sparklePositions.length; i += 3) {
  const radius = 5 + Math.random() * 12
  const angle = Math.random() * Math.PI * 2
  sparklePositions[i] = Math.cos(angle) * radius
  sparklePositions[i + 1] = Math.random() * 7 - 0.5
  sparklePositions[i + 2] = Math.sin(angle) * radius
}
sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3))
scene.add(new THREE.Points(
  sparkleGeo,
  new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.06, transparent: true, opacity: 0.75 })
))

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const filmPass = new FilmPass(0.55, false)
composer.addPass(filmPass)
composer.addPass(new OutputPass())

const grainInput = document.getElementById('grain')
const grainValue = document.getElementById('grain-value')
const grayscaleButton = document.getElementById('grayscale')

grainInput.addEventListener('input', (event) => {
  const intensity = Number(event.target.value)
  filmPass.uniforms.intensity.value = intensity
  grainValue.textContent = intensity.toFixed(2)
})

function syncGrayscaleLabel() {
  grayscaleButton.textContent = `切换灰度胶片：${filmPass.uniforms.grayscale.value ? '开' : '关'}`
}

grayscaleButton.addEventListener('click', () => {
  filmPass.uniforms.grayscale.value = !filmPass.uniforms.grayscale.value
  syncGrayscaleLabel()
})

syncGrayscaleLabel()

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  stage.rotation.y += delta * 0.18
  torusKnot.rotation.x += delta * 0.35
  torusKnot.rotation.y += delta * 0.7
  sculpture.position.y = 1.55 + Math.sin(time * 1.3) * 0.24
  camera.position.x = Math.sin(time * 0.18) * 0.9

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
window.filmPass = filmPass
window.torusKnot = torusKnot

renderer.setAnimationLoop(animate)