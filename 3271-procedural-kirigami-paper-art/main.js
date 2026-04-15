// 3271. Procedural Kirigami Paper Art
// 3D paper-cutting art (kirigami) - procedural flower/snowflake patterns with fold animation
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0510)
scene.fog = new THREE.FogExp2(0x0a0510, 0.008)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 15, 30)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.2)
composer.addPass(bloom)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.3

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const spotLight = new THREE.SpotLight(0xffeeff, 2, 60, Math.PI / 6)
spotLight.position.set(5, 20, 10)
scene.add(spotLight)
const fillLight = new THREE.PointLight(0xcc88ff, 0.8, 40)
fillLight.position.set(-10, 5, -10)
scene.add(fillLight)

// Paper material
function makePaperMat(color, opacity = 0.92) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: opacity < 1,
    opacity,
  })
}

// Kirigami petal generator
function createKirigamiPetal(angle, radius, height, color, foldAngle = 0) {
  const group = new THREE.Group()

  // Petal shape using Shape + ExtrudeGeometry
  const shape = new THREE.Shape()
  const pw = 1.2, ph = 3.0
  shape.moveTo(0, 0)
  shape.bezierCurveTo(pw * 0.8, ph * 0.2, pw, ph * 0.6, 0, ph)
  shape.bezierCurveTo(-pw, ph * 0.6, -pw * 0.8, ph * 0.2, 0, 0)

  const extrudeSettings = { depth: 0.04, bevelEnabled: false }
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  const mat = makePaperMat(color)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2 + foldAngle
  group.add(mesh)

  // Inner cut pattern - small holes
  const cutGeo = new THREE.RingGeometry(0.3, 0.5, 12)
  const cutMesh = new THREE.Mesh(cutGeo, new THREE.MeshStandardMaterial({ color: 0x0a0510, side: THREE.DoubleSide }))
  cutMesh.rotation.x = -Math.PI / 2 + foldAngle
  cutMesh.position.y = 0.05
  cutMesh.scale.setScalar(0.8)
  group.add(cutMesh)

  group.rotation.y = angle
  group.rotation.x = foldAngle * 0.5
  return group
}

// Create layered kirigami flower (8 layers, 6 petals each)
const kirigamiGroup = new THREE.Group()
scene.add(kirigamiGroup)

const petalColors = [
  0xff4466, 0xff6688, 0xff88aa, 0xffaa88,
  0xffcc66, 0xffeeaa, 0xffcc44, 0xffdd77,
]
const NUM_LAYERS = 6
const PETALS_PER_LAYER = 6

for (let layer = 0; layer < NUM_LAYERS; layer++) {
  const layerGroup = new THREE.Group()
  const layerRadius = 1.5 + layer * 1.8
  const foldAngle = (layer / NUM_LAYERS) * Math.PI * 0.6
  const color = petalColors[layer % petalColors.length]

  for (let p = 0; p < PETALS_PER_LAYER; p++) {
    const angle = (p / PETALS_PER_LAYER) * Math.PI * 2 + layer * 0.3
    const petal = createKirigamiPetal(angle, layerRadius, 3, color, foldAngle)
    petal.position.y = layer * 0.3
    layerGroup.add(petal)
  }

  kirigamiGroup.add(layerGroup)
}

// Central stamen dots
const stamenGeo = new THREE.SphereGeometry(0.12, 8, 8)
for (let i = 0; i < 20; i++) {
  const angle = Math.random() * Math.PI * 2
  const r = 0.5 + Math.random() * 1.5
  const stamen = new THREE.Mesh(stamenGeo, new THREE.MeshStandardMaterial({
    color: 0xffcc22,
    emissive: 0x443300,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.5,
  }))
  stamen.position.set(Math.cos(angle) * r, 0.3, Math.sin(angle) * r)
  kirigamiGroup.add(stamen)
}

// Base ring
const ringGeo = new THREE.TorusGeometry(2, 0.08, 8, 32)
const ring = new THREE.Mesh(ringGeo, makePaperMat(0xffddee, 0.8))
ring.rotation.x = Math.PI / 2
kirigamiGroup.add(ring)

// Background kirigami snowflakes (smaller)
const snowflakeGroup = new THREE.Group()
scene.add(snowflakeGroup)

function createSnowflake(armAngle, scale = 1) {
  const group = new THREE.Group()
  const armMat = makePaperMat(0xaaccff, 0.6)

  // Main arm
  const armGeo = new THREE.PlaneGeometry(0.15 * scale, 3 * scale)
  const arm = new THREE.Mesh(armGeo, armMat)
  group.add(arm)

  // Side branches
  for (let i = 0; i < 4; i++) {
    const t = 0.3 + i * 0.15
    const bGeo = new THREE.PlaneGeometry(0.08 * scale, 0.8 * scale)
    const branch = new THREE.Mesh(bGeo, armMat)
    branch.position.y = t * scale * 3 - 1.5 * scale
    branch.rotation.z = (i % 2 === 0 ? 1 : -1) * Math.PI * 0.4
    group.add(branch)
  }

  group.rotation.z = armAngle
  return group
}

for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2
  const r = 12 + Math.random() * 8
  const sf = createSnowflake(angle, 0.6 + Math.random() * 0.5)
  sf.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 10, Math.sin(angle) * r)
  sf.userData.floatOffset = Math.random() * Math.PI * 2
  sf.userData.floatSpeed = 0.3 + Math.random() * 0.4
  snowflakeGroup.add(sf)
}

// Wireframe paper edge glow
const wireMat = new THREE.LineBasicMaterial({ color: 0xffaacc, transparent: true, opacity: 0.15 })

// Info UI
const infoDiv = document.createElement('div')
infoDiv.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);color:#ff88cc;font-family:monospace;font-size:13px;text-align:center;pointer-events:none;'
document.body.appendChild(infoDiv)

// Controls hint
const hintDiv = document.createElement('div')
hintDiv.style.cssText = 'position:fixed;bottom:20px;left:20px;color:#aaa;font-family:monospace;font-size:11px;line-height:1.8;'
hintDiv.innerHTML = 'Kirigami Paper Art<br>• Drag to rotate<br>• Scroll to zoom'
document.body.appendChild(hintDiv)

let time = 0
function updateKirigami(delta) {
  time += delta

  // Gentle pulsing of the flower
  const breathe = 1 + Math.sin(time * 0.8) * 0.03
  kirigamiGroup.scale.setScalar(breathe)

  // Rotate slowly
  kirigamiGroup.rotation.y += delta * 0.15

  // Float the snowflakes
  snowflakeGroup.children.forEach(sf => {
    sf.position.y += Math.sin(time * sf.userData.floatSpeed + sf.userData.floatOffset) * 0.005
    sf.rotation.z += delta * 0.2
    sf.rotation.x = Math.sin(time * sf.userData.floatSpeed * 0.5) * 0.1
  })

  // Bloom pulse
  bloom.strength = 0.5 + Math.sin(time * 0.5) * 0.15

  // Stamen glow
  kirigamiGroup.children.forEach(child => {
    if (child.geometry && child.geometry.type === 'SphereGeometry') {
      child.material.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.3
    }
  })

  infoDiv.textContent = '✂️ Procedural Kirigami Paper Art'
}

let lastTime = performance.now()
function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const delta = Math.min((now - lastTime) / 1000, 0.1)
  lastTime = now
  updateKirigami(delta)
  controls.update()
  composer.render()
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
