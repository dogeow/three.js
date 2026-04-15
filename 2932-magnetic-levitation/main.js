// 2932. Magnetic Levitation
// Superconductor levitation with Meissner effect and flux pinning
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080c14)
scene.fog = new THREE.Fog(0x080c14, 30, 80)

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 200)
camera.position.set(0, 8, 25)
camera.lookAt(0, 3, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)

// Lighting
scene.add(new THREE.AmbientLight(0x1a2a4a, 0.5))
const mainLight = new THREE.DirectionalLight(0x8899ff, 1.0)
mainLight.position.set(10, 20, 10)
mainLight.castShadow = true
scene.add(mainLight)
const rimLight = new THREE.PointLight(0x4466ff, 2, 30)
rimLight.position.set(-10, 5, 0)
scene.add(rimLight)

// Superconductor base platform
const baseGeo = new THREE.CylinderGeometry(8, 8, 1.5, 64)
const baseMat = new THREE.MeshStandardMaterial({
  color: 0x0a2040,
  metalness: 0.9,
  roughness: 0.1,
  emissive: 0x001040,
  emissiveIntensity: 0.3
})
const base = new THREE.Mesh(baseGeo, baseMat)
base.position.y = 0.75
base.receiveShadow = true
base.castShadow = true
scene.add(base)

// Superconductor surface rings
for (let r = 1; r <= 3; r++) {
  const ringGeo = new THREE.TorusGeometry(r * 2, 0.05, 8, 64)
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    emissive: 0x0055cc,
    emissiveIntensity: 0.8,
    metalness: 0.8
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = Math.PI/2
  ring.position.y = 1.52
  scene.add(ring)
}

// Magnetic rail coils (two parallel tracks)
function createCoil(x) {
  const group = new THREE.Group()
  for (let i = 0; i < 12; i++) {
    const coilGeo = new THREE.TorusGeometry(1.2, 0.15, 8, 24)
    const hue = i / 12
    const coilMat = new THREE.MeshStandardMaterial({
      color: 0x334466,
      metalness: 0.8,
      roughness: 0.2,
      emissive: new THREE.Color().setHSL(hue, 1, 0.3),
      emissiveIntensity: 1
    })
    const coil = new THREE.Mesh(coilGeo, coilMat)
    coil.position.set(x, i * 0.6 + 2, 0)
    coil.rotation.x = Math.PI/2
    coil.userData.phase = i * (Math.PI / 6)
    group.add(coil)
  }
  scene.add(group)
  return group
}

const coilGroup1 = createCoil(-3)
const coilGroup2 = createCoil(3)

// Magnetic field visualization
const FIELD_COUNT = 400
const fieldGeo = new THREE.BufferGeometry()
const fieldPos = new Float32Array(FIELD_COUNT * 3)
const fieldColors = new Float32Array(FIELD_COUNT * 3)

for (let i = 0; i < FIELD_COUNT; i++) {
  const x = (Math.random() - 0.5) * 14
  const y = Math.random() * 12
  const z = (Math.random() - 0.5) * 14
  fieldPos[i*3] = x
  fieldPos[i*3+1] = y
  fieldPos[i*3+2] = z
  fieldColors[i*3] = 0.2
  fieldColors[i*3+1] = 0.5
  fieldColors[i*3+2] = 1.0
}

fieldGeo.setAttribute('position', new THREE.BufferAttribute(fieldPos, 3))
fieldGeo.setAttribute('color', new THREE.BufferAttribute(fieldColors, 3))

const fieldMat = new THREE.PointsMaterial({
  size: 0.15,
  vertexColors: true,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})

const fieldLines = new THREE.Points(fieldGeo, fieldMat)
scene.add(fieldLines)

// Levitating object (high-temperature superconductor puck)
const puckGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.8, 32)
const puckMat = new THREE.MeshStandardMaterial({
  color: 0x88ccff,
  metalness: 0.7,
  roughness: 0.2,
  emissive: 0x1144aa,
  emissiveIntensity: 0.4,
  transparent: true,
  opacity: 0.9
})
const puck = new THREE.Mesh(puckGeo, puckMat)
puck.castShadow = true
scene.add(puck)

// Levitation physics state
const levitation = {
  y: 6,
  vy: 0,
  x: 0,
  vx: 0,
  z: 0,
  vz: 0,
  angle: 0,
  angularVel: 0
}

// Glow effect under puck
const glowGeo = new THREE.CircleGeometry(2, 32)
const glowMat = new THREE.MeshBasicMaterial({
  color: 0x4488ff,
  transparent: true,
  opacity: 0.3,
  side: THREE.DoubleSide
})
const glow = new THREE.Mesh(glowGeo, glowMat)
glow.rotation.x = -Math.PI/2
scene.add(glow)

// Input state
const keys = {}
window.addEventListener('keydown', e => keys[e.code] = true)
window.addEventListener('keyup', e => keys[e.code] = false)

let time = 0
function animate() {
  requestAnimationFrame(animate)
  time += 0.016

  // Animate coil colors (traveling wave)
  [...coilGroup1.children, ...coilGroup2.children].forEach(coil => {
    const phase = coil.userData.phase + time * 4
    const intensity = (Math.sin(phase) + 1) * 0.5
    coil.material.emissiveIntensity = intensity
    coil.material.emissive.setHSL((phase / (Math.PI * 2)) % 1, 1, 0.5)
  })

  // Meissner effect: puck repelled upward when below threshold
  const targetY = 6
  const equilibriumForce = (levitation.y - targetY) * -0.15
  const magneticForce = 0.08 // constant upward from field
  levitation.vy += magneticForce + equilibriumForce - levitation.vy * 0.05

  // Flux pinning: horizontal stability near center
  const centeringForce = -levitation.x * 0.05
  levitation.vx += centeringForce
  levitation.vx *= 0.95
  levitation.x += levitation.vx

  const zForce = -levitation.z * 0.05
  levitation.vz += zForce
  levitation.vz *= 0.95
  levitation.z += levitation.vz

  // Input perturbation
  if (keys['ArrowLeft'] || keys['KeyA']) levitation.vx += 0.01
  if (keys['ArrowRight'] || keys['KeyD']) levitation.vx -= 0.01
  if (keys['ArrowUp'] || keys['KeyW']) levitation.vy += 0.02
  if (keys['ArrowDown'] || keys['KeyS']) levitation.vy -= 0.02

  levitation.y += levitation.vy
  levitation.vy *= 0.98

  // Bounce off floor and ceiling
  if (levitation.y < 2) { levitation.y = 2; levitation.vy *= -0.5 }
  if (levitation.y > 12) { levitation.y = 12; levitation.vy *= -0.3 }

  puck.position.set(levitation.x, levitation.y, levitation.z)
  puck.rotation.y = time * 0.5
  puck.rotation.x = Math.sin(time) * 0.1

  glow.position.y = levitation.y - 0.5
  glow.material.opacity = 0.2 + (levitation.y - 2) * 0.02
  glow.scale.setScalar(1 + (12 - levitation.y) * 0.05)

  // Animate field particles
  const fPos = fieldGeo.attributes.position.array
  for (let i = 0; i < FIELD_COUNT; i++) {
    const px = fPos[i*3], py = fPos[i*3+1], pz = fPos[i*3+2]
    // Field lines curve around puck
    const dx = px - levitation.x
    const dy = py - levitation.y
    const dz = pz - levitation.z
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
    const fieldStrength = Math.max(0, 1 - dist / 8) * 0.1

    fPos[i*3] += dx * fieldStrength * 0.05
    fPos[i*3+1] += Math.sin(time * 2 + i) * 0.02
    fPos[i*3+2] += dz * fieldStrength * 0.05

    if (py < 0 || py > 15) {
      fPos[i*3] = (Math.random() - 0.5) * 14
      fPos[i*3+1] = Math.random() * 12
      fPos[i*3+2] = (Math.random() - 0.5) * 14
    }

    // Color based on proximity to puck
    fieldColors[i*3] = 0.2 + fieldStrength * 0.8
    fieldColors[i*3+1] = 0.5 + fieldStrength * 0.5
    fieldColors[i*3+2] = 1.0
  }
  fieldGeo.attributes.position.needsUpdate = true
  fieldGeo.attributes.color.needsUpdate = true

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
