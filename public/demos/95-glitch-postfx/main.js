import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x05070e)
scene.fog = new THREE.FogExp2(0x05070e, 0.032)

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.4, 12)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 6
controls.maxDistance = 20
controls.target.set(0, 1.4, 0)

scene.add(new THREE.AmbientLight(0x8aa7ff, 0.35))

const redLight = new THREE.PointLight(0xfb7185, 22, 18, 2)
redLight.position.set(-4, 5, 5)
scene.add(redLight)

const cyanLight = new THREE.PointLight(0x22d3ee, 18, 18, 2)
cyanLight.position.set(4, 2, -4)
scene.add(cyanLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(15, 120),
  new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    emissive: 0x060914,
    emissiveIntensity: 0.5,
    roughness: 0.94,
    metalness: 0.12
  })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.8
scene.add(floor)

const pillars = []
for (let i = 0; i < 12; i++) {
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 3 + (i % 4) * 0.45, 0.32),
    new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0x22d3ee : 0xfb7185,
      emissive: i % 2 === 0 ? 0x0ea5e9 : 0xe11d48,
      emissiveIntensity: 0.85,
      roughness: 0.32,
      metalness: 0.16
    })
  )
  const angle = (i / 12) * Math.PI * 2
  const radius = 4.4 + (i % 2) * 1.2
  pillar.position.set(Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius)
  scene.add(pillar)
  pillars.push(pillar)
}

const core = new THREE.Mesh(
  new THREE.OctahedronGeometry(1.45, 1),
  new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.28,
    metalness: 0.42,
    roughness: 0.18
  })
)
core.position.y = 1.6
scene.add(core)

const rings = new THREE.Group()
scene.add(rings)

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.4 + i * 0.85, 0.08, 16, 120),
    new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x22d3ee : 0xfb7185 })
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.4 + i * 0.7
  rings.add(ring)
}

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const glitchPass = new GlitchPass()
glitchPass.generateTrigger = function () {
  this.randX = THREE.MathUtils.randInt(36, 72)
}
glitchPass.generateTrigger()
composer.addPass(glitchPass)
composer.addPass(new OutputPass())

const enabledInput = document.getElementById('enabled')
const wildInput = document.getElementById('wild')
const burstButton = document.getElementById('burst')
const modeLabel = document.getElementById('mode')
const intervalLabel = document.getElementById('interval')

function syncStatus() {
  glitchPass.enabled = enabledInput.checked
  glitchPass.goWild = wildInput.checked
  modeLabel.textContent = !enabledInput.checked
    ? '已关闭'
    : wildInput.checked
      ? '狂暴模式'
      : '正常脉冲'
  intervalLabel.textContent = glitchPass.enabled ? '36~72 帧' : '-'
}

enabledInput.addEventListener('change', syncStatus)
wildInput.addEventListener('change', syncStatus)
burstButton.addEventListener('click', () => {
  glitchPass.curF = 0
})

syncStatus()

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  core.rotation.x += delta * 0.45
  core.rotation.y += delta * 0.82
  core.position.y = 1.6 + Math.sin(time * 1.8) * 0.18
  rings.rotation.y += delta * 0.3

  pillars.forEach((pillar, index) => {
    pillar.scale.y = 0.8 + (Math.sin(time * 1.4 + index) + 1) * 0.15
  })

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
window.glitchPass = glitchPass

renderer.setAnimationLoop(animate)