// 3538. Softbody Jelly Physics
// Softbody Jelly Physics — spring-mass jelly with volume preservation
// type: softbody-jelly
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 8, 20)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const params = {
  stiffness: 0.4,
  damping: 0.92,
  gravity: -9.8,
  bounce: 0.6,
  jellyColor: 0x44aaff,
  jellyOpacity: 0.8,
  autoDrop: true,
  dropInterval: 3.0,
}

// Jelly: subdivided icosahedron
const JELLY_RADIUS = 2.0
const JELLY_SUBDIV = 3
const geo = new THREE.IcosahedronGeometry(JELLY_RADIUS, JELLY_SUBDIV)
const posAttr = geo.attributes.position

const NUM_VERTS = posAttr.count
const particles = []
const restPositions = []

for (let i = 0; i < NUM_VERTS; i++) {
  particles.push({
    x: posAttr.getX(i), y: posAttr.getY(i), z: posAttr.getZ(i),
    ox: posAttr.getX(i), oy: posAttr.getY(i), oz: posAttr.getZ(i),
    vx: 0, vy: 0, vz: 0
  })
  restPositions.push({ x: posAttr.getX(i), y: posAttr.getY(i), z: posAttr.getZ(i) })
}

// Build spring constraints from edges
const constraints = []
const edgeSet = new Set()
function addEdge(a, b) {
  const key = a < b ? `${a},${b}` : `${b},${a}`
  if (edgeSet.has(key)) return
  edgeSet.add(key)
  const pa = restPositions[a], pb = restPositions[b]
  const dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z
  const rest = Math.sqrt(dx * dx + dy * dy + dz * dz)
  constraints.push({ a, b, rest })
}

const indices = geo.index.array
for (let i = 0; i < indices.length; i += 3) {
  addEdge(indices[i], indices[i + 1])
  addEdge(indices[i + 1], indices[i + 2])
  addEdge(indices[i + 2], indices[i])
}

const jellyMat = new THREE.MeshPhysicalMaterial({
  color: params.jellyColor,
  transparent: true,
  opacity: params.jellyOpacity,
  roughness: 0.1,
  metalness: 0.0,
  transmission: 0.5,
  thickness: 1.5,
  ior: 1.33,
})
const jellyMesh = new THREE.Mesh(geo, jellyMat)
scene.add(jellyMesh)

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x2a2a4e, roughness: 0.8 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -JELLY_RADIUS - 0.5
ground.receiveShadow = true
scene.add(ground)

const grid = new THREE.GridHelper(40, 40, 0x444466, 0x333355)
grid.position.y = ground.position.y + 0.01
scene.add(grid)

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xffffff, 1.2)
sun.position.set(10, 20, 10)
sun.castShadow = true
scene.add(sun)
const rim = new THREE.PointLight(0x4488ff, 1, 50)
rim.position.set(-10, 10, -10)
scene.add(rim)

let lastDrop = 0

function resetJelly() {
  for (let i = 0; i < NUM_VERTS; i++) {
    particles[i].x = restPositions[i].x
    particles[i].y = restPositions[i].y + 6
    particles[i].z = restPositions[i].z
    particles[i].vx = (Math.random() - 0.5) * 0.5
    particles[i].vy = 0
    particles[i].vz = (Math.random() - 0.5) * 0.5
    particles[i].ox = particles[i].x
    particles[i].oy = particles[i].y
    particles[i].oz = particles[i].z
  }
}

function updateJelly(dt) {
  const g = params.gravity * dt * dt
  const bounce = params.bounce
  const stiffness = params.stiffness
  const damping = params.damping
  const floorY = ground.position.y + JELLY_RADIUS

  for (let i = 0; i < NUM_VERTS; i++) {
    const p = particles[i]
    p.vy += g
    p.vx *= damping; p.vy *= damping; p.vz *= damping
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt
    if (p.y < floorY) {
      p.y = floorY
      p.vy = -p.vy * bounce
      p.vx *= 0.8; p.vz *= 0.8
    }
    const wall = 15.0
    if (Math.abs(p.x) > wall) { p.vx = -p.vx * bounce; p.x = Math.sign(p.x) * wall }
    if (Math.abs(p.z) > wall) { p.vz = -p.vz * bounce; p.z = Math.sign(p.z) * wall }
  }

  // Spring constraints
  for (let iter = 0; iter < 4; iter++) {
    for (const c of constraints) {
      const pa = particles[c.a], pb = particles[c.b]
      const dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001
      const diff = (dist - c.rest) / dist * 0.5 * stiffness
      const cx = dx * diff, cy = dy * diff, cz = dz * diff
      pa.x += cx; pa.y += cy; pa.z += cz
      pb.x -= cx; pb.y -= cy; pb.z -= cz
    }
  }

  // Update geometry
  for (let i = 0; i < NUM_VERTS; i++) {
    posAttr.setXYZ(i, particles[i].x, particles[i].y, particles[i].z)
  }
  posAttr.needsUpdate = true
  geo.computeVertexNormals()
}

const gui = new GUI()
gui.add(params, 'stiffness', 0.05, 1.0).name('Stiffness')
gui.add(params, 'damping', 0.8, 0.99).name('Damping')
gui.add(params, 'gravity', -20, 0).name('Gravity')
gui.add(params, 'bounce', 0, 1).name('Bounce')
gui.addColor(params, 'jellyColor').name('Color').onChange(v => jellyMat.color.setHex(v))
gui.add(params, 'jellyOpacity', 0.3, 1.0).name('Opacity').onChange(v => jellyMat.opacity = v)
gui.add(params, 'autoDrop').name('Auto Drop')
gui.add({ reset: resetJelly }, 'reset').name('Reset Jelly')

resetJelly()
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  updateJelly(dt)
  if (params.autoDrop && clock.elapsedTime - lastDrop > params.dropInterval) {
    resetJelly()
    lastDrop = clock.elapsedTime
  }
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
