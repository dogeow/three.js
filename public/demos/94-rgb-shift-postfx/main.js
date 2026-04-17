import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x040612)
scene.fog = new THREE.FogExp2(0x040612, 0.03)

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100)
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
controls.minDistance = 6
controls.maxDistance = 20
controls.target.set(0, 1.2, 0)

scene.add(new THREE.AmbientLight(0x6d8cff, 0.38))

const keyLight = new THREE.PointLight(0x22d3ee, 26, 24, 2)
keyLight.position.set(5, 8, 4)
scene.add(keyLight)

const accentLight = new THREE.PointLight(0xff4fd8, 20, 18, 2)
accentLight.position.set(-4, 2, 6)
scene.add(accentLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(15, 120),
  new THREE.MeshStandardMaterial({
    color: 0x090d19,
    emissive: 0x050814,
    emissiveIntensity: 0.5,
    roughness: 0.92,
    metalness: 0.12
  })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.8
scene.add(floor)

const grid = new THREE.GridHelper(20, 28, 0x1d4ed8, 0x1a2340)
grid.position.y = -1.78
grid.material.transparent = true
grid.material.opacity = 0.32
scene.add(grid)

const stage = new THREE.Group()
scene.add(stage)

const center = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.3, 0.34, 220, 28),
  new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.7,
    metalness: 0.28,
    roughness: 0.18
  })
)
center.position.y = 1.5
stage.add(center)

const satellites = []
const palette = [0x22d3ee, 0xf472b6, 0xf59e0b, 0x4ade80]

for (let i = 0; i < 10; i++) {
  const color = palette[i % palette.length]
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 1.6, 0.45),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.2,
      roughness: 0.28
    })
  )
  mesh.userData = {
    angle: (i / 10) * Math.PI * 2,
    radius: 3.3 + (i % 2) * 0.85,
    lift: (i % 3) * 0.35
  }
  stage.add(mesh)
  satellites.push(mesh)
}

const particles = new THREE.BufferGeometry()
const particlePositions = new Float32Array(1800)
for (let i = 0; i < particlePositions.length; i += 3) {
  const radius = 8 + Math.random() * 10
  const angle = Math.random() * Math.PI * 2
  particlePositions[i] = Math.cos(angle) * radius
  particlePositions[i + 1] = Math.random() * 8 - 1
  particlePositions[i + 2] = Math.sin(angle) * radius
}
particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
scene.add(new THREE.Points(
  particles,
  new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.05, transparent: true, opacity: 0.8 })
))

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const rgbPass = new ShaderPass(RGBShiftShader)
rgbPass.uniforms.amount.value = 0.006
rgbPass.uniforms.angle.value = 0
composer.addPass(rgbPass)
composer.addPass(new OutputPass())

const amountInput = document.getElementById('amount')
const amountValue = document.getElementById('amount-value')
const angleInput = document.getElementById('angle')
const angleValue = document.getElementById('angle-value')
const autoSpinInput = document.getElementById('auto-spin')

function syncAmount() {
  rgbPass.uniforms.amount.value = Number(amountInput.value)
  amountValue.textContent = Number(amountInput.value).toFixed(4)
}

function syncAngle(deg = Number(angleInput.value)) {
  angleInput.value = String(deg)
  rgbPass.uniforms.angle.value = THREE.MathUtils.degToRad(deg)
  angleValue.textContent = `${Math.round(deg)}°`
}

amountInput.addEventListener('input', syncAmount)
angleInput.addEventListener('input', () => syncAngle())

syncAmount()
syncAngle()

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  stage.rotation.y += delta * 0.12
  center.rotation.x += delta * 0.32
  center.rotation.y += delta * 0.65
  center.position.y = 1.5 + Math.sin(time * 1.6) * 0.18

  satellites.forEach((mesh, index) => {
    const data = mesh.userData
    const angle = time * 0.7 + data.angle
    mesh.position.set(
      Math.cos(angle) * data.radius,
      1 + data.lift + Math.sin(time * 1.4 + index) * 0.4,
      Math.sin(angle) * data.radius
    )
    mesh.rotation.y = angle * 1.4
    mesh.rotation.z = Math.sin(time * 1.3 + index) * 0.35
  })

  if (autoSpinInput.checked) {
    const degrees = (time * 48) % 360
    syncAngle(degrees)
  }

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
window.rgbPass = rgbPass

renderer.setAnimationLoop(animate)