import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020912)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 2, 8)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(devicePixelRatio)
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

const ambient = new THREE.AmbientLight(0x003344, 1.0)
scene.add(ambient)
const pointLight = new THREE.PointLight(0x00ffcc, 2, 20)
pointLight.position.set(0, 3, 3)
scene.add(pointLight)

// Base platform
const baseGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.2, 64)
const baseMat = new THREE.MeshStandardMaterial({ color: 0x001122, metalness: 0.9, roughness: 0.2, emissive: 0x003344, emissiveIntensity: 0.2 })
const baseMesh = new THREE.Mesh(baseGeo, baseMat)
baseMesh.position.y = -2
scene.add(baseMesh)

// Concentric rings on base
for (let r = 0; r < 4; r++) {
  const ringGeo = new THREE.TorusGeometry(0.5 + r * 0.4, 0.015, 8, 64)
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 - r * 0.1 })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = Math.PI / 2
  ring.position.y = -1.88
  scene.add(ring)
}

// Projection cone
const coneGeo = new THREE.ConeGeometry(1.5, 3, 32, 1, true)
const coneMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.04, side: THREE.DoubleSide, wireframe: true })
const cone = new THREE.Mesh(coneGeo, coneMat)
cone.position.y = 0.5
scene.add(cone)

// Scan rings
const scanRings = []
for (let i = 0; i < 3; i++) {
  const ringGeo = new THREE.TorusGeometry(1.2 - i * 0.3, 0.01, 8, 64)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.6 })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = Math.PI / 2
  ring.position.y = -1.5 + i * 0.1
  scene.add(ring)
  scanRings.push(ring)
}

// Hologram text
let textMesh = null
const fontURL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json'

function createText(message) {
  if (textMesh) { scene.remove(textMesh); textMesh.geometry.dispose(); textMesh.material.dispose() }
  const loader = new FontLoader()
  loader.load(fontURL, (font) => {
    const geo = new TextGeometry(message || 'HELLO', { font, size: 0.4, height: 0.05, curveSegments: 8 })
    geo.computeBoundingBox()
    const centerOffset = (geo.boundingBox.max.x - geo.boundingBox.min.x) / 2
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.85 })
    textMesh = new THREE.Mesh(geo, mat)
    textMesh.position.set(-centerOffset, 1.2, 0)
    scene.add(textMesh)
  })
}
createText('READY')

// Particle field
const PARTICLE_COUNT = 2000
const particleGeo = new THREE.BufferGeometry()
const positions = new Float32Array(PARTICLE_COUNT * 3)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = 3 + Math.random() * 2
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
  positions[i * 3 + 1] = r * Math.cos(phi)
  positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  velocities[i * 3] = (Math.random() - 0.5) * 0.002
  velocities[i * 3 + 1] = Math.random() * 0.003 + 0.001
  velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
const particleMat = new THREE.PointsMaterial({ color: 0x00ffcc, size: 0.02, transparent: true, opacity: 0.5 })
const particles = new THREE.Points(particleGeo, particleMat)
scene.add(particles)

// Glitch effect
let glitchActive = false, glitchTimer = 0, glitchDuration = 0

function triggerGlitch(duration) {
  glitchActive = true; glitchDuration = duration; glitchTimer = 0
}

// Buttons
document.getElementById('sendBtn').addEventListener('click', () => {
  const msg = document.getElementById('msgInput').value.trim() || 'HELLO'
  createText(msg)
  triggerGlitch(1.5)
})
document.getElementById('receiveBtn').addEventListener('click', () => {
  triggerGlitch(2.0)
  setTimeout(() => createText('INCOMING'), 800)
})
document.getElementById('idleBtn').addEventListener('click', () => createText('READY'))
document.getElementById('msgInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const msg = document.getElementById('msgInput').value.trim() || 'HELLO'
    createText(msg); triggerGlitch(1.5)
  }
})

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  const t = clock.getElapsedTime()

  // Particle orbit
  const pos = particleGeo.attributes.position.array
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pos[i * 3] += velocities[i * 3]
    pos[i * 3 + 1] += velocities[i * 3 + 1]
    pos[i * 3 + 2] += velocities[i * 3 + 2]
    const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2]
    const r = Math.sqrt(px*px + py*py + pz*pz)
    if (r > 5.5 || r < 2.5) {
      velocities[i * 3 + 1] = -velocities[i * 3 + 1]
    }
  }
  particleGeo.attributes.position.needsUpdate = true
  particles.rotation.y = t * 0.05

  // Scan rings
  scanRings.forEach((ring, i) => {
    ring.position.y = -1.5 + 3 * ((t * 0.3 + i * 1.0) % 1.0)
    ring.material.opacity = 0.8 * (1 - ((t * 0.3 + i * 1.0) % 1.0))
  })

  // Text bob
  if (textMesh) {
    textMesh.position.y = 1.2 + Math.sin(t * 1.5) * 0.08
    textMesh.material.opacity = 0.7 + Math.sin(t * 2) * 0.15
  }

  // Glitch
  if (glitchActive) {
    glitchTimer += dt
    if (glitchTimer > glitchDuration) { glitchActive = false; renderer.domElement.style.filter = 'none' }
    else {
      const intensity = Math.sin(glitchTimer * 30) * 0.5 + 0.5
      renderer.domElement.style.filter = `hue-rotate(${intensity * 30}deg) brightness(${1 + intensity * 0.3})`
    }
  }

  controls.update()
  renderer.render(scene, camera)
}
animate()