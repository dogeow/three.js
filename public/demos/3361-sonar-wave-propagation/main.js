// 3361. Sonar Wave Propagation — underwater acoustic ping visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000510)
scene.fog = new THREE.FogExp2(0x000820, 0.018)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 35, 45)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI * 0.52

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.2, 0.5, 0.1))

// Lights
scene.add(new THREE.AmbientLight(0x002233, 1))
const ptLight = new THREE.PointLight(0x0044aa, 2, 100)
ptLight.position.set(0, 30, 0)
scene.add(ptLight)

// Ocean floor
const floorGeo = new THREE.PlaneGeometry(200, 200, 40, 40)
const floorPos = floorGeo.attributes.position
for (let i = 0; i < floorPos.count; i++) {
  floorPos.setZ(i, (Math.random() - 0.5) * 2.5)
}
floorGeo.computeVertexNormals()
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x111a22,
  roughness: 0.95,
  metalness: 0.0,
  flatShading: true
})
const floor = new THREE.Mesh(floorGeo, floorMat)
floor.rotation.x = -Math.PI / 2
floor.position.y = -8
scene.add(floor)

// Rocky formations on floor
for (let i = 0; i < 12; i++) {
  const r = 3 + Math.random() * 6
  const geo = new THREE.DodecahedronGeometry(r, 1)
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a2530, roughness: 0.9, flatShading: true })
  const mesh = new THREE.Mesh(geo, mat)
  const ang = Math.random() * Math.PI * 2
  const dist = 10 + Math.random() * 40
  mesh.position.set(Math.cos(ang) * dist, -8 + r * 0.5, Math.sin(ang) * dist)
  mesh.rotation.set(Math.random(), Math.random(), Math.random())
  scene.add(mesh)
}

// Bioluminescent ambient particles
const AMBIENT_COUNT = 300
const ambPos = new Float32Array(AMBIENT_COUNT * 3)
const ambVel = []
for (let i = 0; i < AMBIENT_COUNT; i++) {
  ambPos[i * 3] = (Math.random() - 0.5) * 80
  ambPos[i * 3 + 1] = -5 + Math.random() * 20
  ambPos[i * 3 + 2] = (Math.random() - 0.5) * 80
  ambVel.push({ vx: (Math.random() - 0.5) * 0.01, vy: (Math.random() - 0.5) * 0.005, vz: (Math.random() - 0.5) * 0.01 })
}
const ambGeo = new THREE.BufferGeometry()
ambGeo.setAttribute('position', new THREE.BufferAttribute(ambPos, 3))
const ambMat = new THREE.PointsMaterial({ color: 0x004433, size: 0.3, transparent: true, opacity: 0.6 })
const ambParticles = new THREE.Points(ambGeo, ambMat)
scene.add(ambParticles)

// Fish-like swarm particles (scatter when sonar passes)
const FISH_COUNT = 80
const fishPos = new Float32Array(FISH_COUNT * 3)
const fishVel = []
for (let i = 0; i < FISH_COUNT; i++) {
  fishPos[i * 3] = (Math.random() - 0.5) * 60
  fishPos[i * 3 + 1] = -2 + Math.random() * 10
  fishPos[i * 3 + 2] = (Math.random() - 0.5) * 60
  fishVel.push({ vx: (Math.random() - 0.5) * 0.08, vy: 0, vz: (Math.random() - 0.5) * 0.08 })
}
const fishGeo = new THREE.BufferGeometry()
fishGeo.setAttribute('position', new THREE.BufferAttribute(fishPos, 3))
const fishMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.4, transparent: true, opacity: 0.8 })
const fishParticles = new THREE.Points(fishGeo, fishMat)
scene.add(fishParticles)

// Sonar ping system
const pings = [] // { ringMeshes: [], radius: 0, opacity: 1, speed: 0.5 }

function createPing(x, z) {
  if (pings.length >= 8) pings.shift() // max 8 active pings
  
  const ping = {
    center: new THREE.Vector3(x, 0, z),
    radius: 0,
    maxRadius: 50,
    speed: 0.6 + Math.random() * 0.3,
    opacity: 1.0,
    rings: []
  }

  // Create 3 concentric rings at slightly different heights
  for (let ring = 0; ring < 3; ring++) {
    const geo = new THREE.RingGeometry(0.01, 0.3, 64)
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.1, ring * 0.3 + 0.3, ring * 0.2 + 0.4),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, -1 + ring * 1.5, z)
    scene.add(mesh)
    ping.rings.push(mesh)
  }

  // Central glow sphere
  const glowGeo = new THREE.SphereGeometry(0.5, 16, 16)
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.8 })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  glow.position.set(x, 0, z)
  scene.add(glow)
  ping.glow = glow

  pings.push(ping)

  // Audio ping
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.8)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(); osc.stop(ctx.currentTime + 0.8)
  } catch (e) {}
}

function updatePings(dt) {
  for (let pi = pings.length - 1; pi >= 0; pi--) {
    const ping = pings[pi]
    ping.radius += ping.speed * dt * 20
    ping.opacity = Math.max(0, 1 - ping.radius / ping.maxRadius)

    for (const ring of ping.rings) {
      ring.material.opacity = ping.opacity * 0.7
      const sc = ping.radius * 0.06
      ring.scale.set(sc, sc, 1)
    }

    if (ping.glow) {
      ping.glow.material.opacity = ping.opacity * 0.8
      ping.glow.scale.setScalar(ping.opacity * 0.5 + 0.1)
    }

    // Scatter fish when wave passes through them
    const fp = fishGeo.attributes.position
    for (let i = 0; i < FISH_COUNT; i++) {
      const fx = fp.array[i * 3], fz = fp.array[i * 3 + 2]
      const dx = fx - ping.center.x, dz = fz - ping.center.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      // Push fish outward when wave front is near them
      const waveFront = ping.radius
      if (Math.abs(dist - waveFront) < 2) {
        const pushStrength = (1 - Math.abs(dist - waveFront) / 2) * 0.3 * ping.opacity
        fishVel[i].vx += (dx / (dist + 0.01)) * pushStrength
        fishVel[i].vz += (dz / (dist + 0.01)) * pushStrength
      }
    }

    if (ping.radius > ping.maxRadius) {
      for (const ring of ping.rings) { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose() }
      if (ping.glow) { scene.remove(ping.glow); ping.glow.geometry.dispose(); ping.glow.material.dispose() }
      pings.splice(pi, 1)
    }
  }
}

function updateParticles(dt) {
  // Ambient particles
  const ap = ambGeo.attributes.position
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    ap.array[i * 3] += ambVel[i].vx
    ap.array[i * 3 + 1] += ambVel[i].vy
    ap.array[i * 3 + 2] += ambVel[i].vz
    if (ap.array[i * 3] > 40) ap.array[i * 3] = -40
    if (ap.array[i * 3] < -40) ap.array[i * 3] = 40
    if (ap.array[i * 3 + 1] > 15) ap.array[i * 3 + 1] = -5
    if (ap.array[i * 3 + 1] < -5) ap.array[i * 3 + 1] = 15
    if (ap.array[i * 3 + 2] > 40) ap.array[i * 3 + 2] = -40
    if (ap.array[i * 3 + 2] < -40) ap.array[i * 3 + 2] = 40
  }
  ap.needsUpdate = true

  // Fish
  const fp = fishGeo.attributes.position
  for (let i = 0; i < FISH_COUNT; i++) {
    fp.array[i * 3] += fishVel[i].vx
    fp.array[i * 3 + 1] += fishVel[i].vy
    fp.array[i * 3 + 2] += fishVel[i].vz
    // Damping
    fishVel[i].vx *= 0.98; fishVel[i].vy *= 0.98; fishVel[i].vz *= 0.98
    // Boundary wrap
    if (fp.array[i * 3] > 35) { fp.array[i * 3] = -35; fishVel[i].vx = (Math.random() - 0.5) * 0.08 }
    if (fp.array[i * 3] < -35) { fp.array[i * 3] = 35; fishVel[i].vx = (Math.random() - 0.5) * 0.08 }
    if (fp.array[i * 3 + 2] > 35) { fp.array[i * 3 + 2] = -35; fishVel[i].vz = (Math.random() - 0.5) * 0.08 }
    if (fp.array[i * 3 + 2] < -35) { fp.array[i * 3 + 2] = 35; fishVel[i].vz = (Math.random() - 0.5) * 0.08 }
    if (fp.array[i * 3 + 1] > 10) fp.array[i * 3 + 1] = -2
    if (fp.array[i * 3 + 1] < -2) fp.array[i * 3 + 1] = 10
  }
  fp.needsUpdate = true
}

// Click to emit ping
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 8)

window.addEventListener('click', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const target = new THREE.Vector3()
  raycaster.ray.intersectPlane(floorPlane, target)
  if (target) createPing(target.x, target.z)
})

window.addEventListener('touchstart', (e) => {
  e.preventDefault()
  const t = e.touches[0]
  mouse.x = (t.clientX / innerWidth) * 2 - 1
  mouse.y = -(t.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const target = new THREE.Vector3()
  raycaster.ray.intersectPlane(floorPlane, target)
  if (target) createPing(target.x, target.z)
}, { passive: false })

// Periodic ambient ping
let pingTimer = 0

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  pingTimer += dt

  updatePings(dt)
  updateParticles(dt)

  // Ambient ping every 4s
  if (pingTimer > 4) {
    pingTimer = 0
    createPing((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40)
  }

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
