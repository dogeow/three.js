// 2167. 体素城市构建器 — Enhanced Edition
// 程序化体素城市 with Three.js post-processing, mouse interaction & animations
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// ─── Scene Setup ────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(55, 85, 55)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

// ─── Post-Processing ────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.4, 0.85)
composer.addPass(bloomPass)
composer.addPass(new OutputPass())

// ─── Controls ───────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1
controls.minDistance = 15
controls.maxDistance = 250
controls.target.set(0, 5, 0)

// ─── Lighting ───────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x1a1a3a, 0.6))

const sun = new THREE.DirectionalLight(0xffeedd, 1.5)
sun.position.set(60, 120, 60)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 400
sun.shadow.camera.left = sun.shadow.camera.bottom = -120
sun.shadow.camera.right = sun.shadow.camera.top = 120
sun.shadow.bias = -0.001
scene.add(sun)

// Accent colored point lights scattered around the city
const accentColors = [0xff3366, 0x33aaff, 0xffcc33, 0x33ffcc]
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2
  const r = 30 + Math.random() * 20
  const pl = new THREE.PointLight(accentColors[i % accentColors.length], 3, 40)
  pl.position.set(Math.cos(angle) * r, 3 + Math.random() * 10, Math.sin(angle) * r)
  scene.add(pl)
}

// ─── Materials ───────────────────────────────────────────────────────────────
const mats = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.85, metalness: 0.1 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.85 }),
  neon: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x1a3320, roughness: 0.9 }),
  road: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 }),
  rooftop: new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.7, metalness: 0.3 }),
}

// ─── City Generation ────────────────────────────────────────────────────────
const city = new THREE.Group()
const buildings = []  // for raycasting / hover
const grid = 22, size = 2

for (let x = -grid; x < grid; x++) {
  for (let z = -grid; z < grid; z++) {
    if (Math.random() > 0.58) continue

    const h = Math.random() * 9 + 1.5
    const w = size * (0.7 + Math.random() * 0.5)
    const d = size * (0.7 + Math.random() * 0.5)

    // Choose material: glass facades on tall buildings, concrete on short
    const isTower = h > 6
    const mat = isTower ? mats.glass : (Math.random() > 0.5 ? mats.concrete : mats.rooftop)

    const geo = new THREE.BoxGeometry(w, size * h, d)
    const mesh = new THREE.Mesh(geo, mat)
    const px = x * size * 1.3
    const pz = z * size * 1.3
    mesh.position.set(px, size * h / 2, pz)
    mesh.castShadow = true
    mesh.receiveShadow = true

    // Tag building data for interaction
    mesh.userData = { type: 'building', height: h, baseY: size * h / 2, hovered: false, phase: Math.random() * Math.PI * 2 }

    // Rooftop emissive beacon on tall buildings
    if (isTower && Math.random() > 0.4) {
      const beacon = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        mats.neon
      )
      beacon.position.set(0, size * h / 2 + 0.5, 0)
      mesh.add(beacon)
    }

    buildings.push(mesh)
    city.add(mesh)
  }
}
scene.add(city)

// ─── Ground / Streets ────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  mats.road
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Street grid lines (subtle emissive strips)
const lineMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.6 })
for (let i = -grid; i <= grid; i++) {
  const hLine = new THREE.Mesh(new THREE.PlaneGeometry(120, 0.15), lineMat)
  hLine.rotation.x = -Math.PI / 2
  hLine.position.set(0, 0.05, i * size * 1.3)
  scene.add(hLine)
  const vLine = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 120), lineMat)
  vLine.rotation.x = -Math.PI / 2
  vLine.position.set(i * size * 1.3, 0.05, 0)
  scene.add(vLine)
}

// ─── Floating Particles ─────────────────────────────────────────────────────
const particleCount = 600
const pPositions = new Float32Array(particleCount * 3)
for (let i = 0; i < particleCount; i++) {
  pPositions[i * 3] = (Math.random() - 0.5) * 120
  pPositions[i * 3 + 1] = Math.random() * 60 + 2
  pPositions[i * 3 + 2] = (Math.random() - 0.5) * 120
}
const pGeo = new THREE.BufferGeometry()
pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
const particles = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({ color: 0x88ccff, size: 0.2, transparent: true, opacity: 0.7, sizeAttenuation: true })
)
scene.add(particles)

// ─── Hover / Raycaster Interaction ──────────────────────────────────────────
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredMesh = null
const highlightMat = new THREE.MeshStandardMaterial({
  color: 0xffffff, emissive: 0x4488ff, emissiveIntensity: 0.5, wireframe: true
})

renderer.domElement.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
})

renderer.domElement.addEventListener('click', (e) => {
  if (!hoveredMesh) return
  // Fly camera toward clicked building
  const target = hoveredMesh.position.clone()
  const offset = new THREE.Vector3(12, 15, 12)
  controls.target.copy(target)
  // Animate camera position toward building
  const dest = target.clone().add(offset)
  camera.position.lerp(dest, 0.3)
})

// ─── Animation Loop ─────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  const delta = clock.getDelta ? 0.016 : 0.016

  // Raycasting — hover highlight
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(buildings)
  if (hits.length > 0) {
    const m = hits[0].object
    if (hoveredMesh !== m) {
      if (hoveredMesh && hoveredMesh.userData.hovered) {
        hoveredMesh.userData.hovered = false
      }
      hoveredMesh = m
      hoveredMesh.userData.hovered = true
      document.body.style.cursor = 'pointer'
    }
  } else {
    if (hoveredMesh) {
      hoveredMesh.userData.hovered = false
      hoveredMesh = null
      document.body.style.cursor = 'default'
    }
  }

  // Building animations: gentle bob + emissive pulse
  buildings.forEach((b) => {
    const ph = b.userData.phase
    const hoverS = b.userData.hovered ? 0.5 : 0
    const bob = Math.sin(t * 0.4 + ph) * 0.08 + hoverS * Math.sin(t * 4 + ph) * 0.15
    b.position.y = b.userData.baseY + bob

    // Pulse emissive on rooftop beacons
    if (b.children.length > 0) {
      const beacon = b.children[0]
      const intensity = b.userData.hovered
        ? 3.5 + Math.sin(t * 6) * 1.5
        : 1.5 + Math.sin(t * 2 + ph) * 0.8
      beacon.material.emissiveIntensity = intensity
    }
  })

  // Particle drift
  const pos = particles.geometry.attributes.position
  for (let i = 0; i < particleCount; i++) {
    pos.array[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.005
    if (pos.array[i * 3 + 1] > 65) pos.array[i * 3 + 1] = 2
  }
  pos.needsUpdate = true
  particles.rotation.y = t * 0.01

  // Animate accent lights
  scene.children.forEach((c) => {
    if (c instanceof THREE.PointLight) {
      c.intensity = 3 + Math.sin(t * 1.5 + c.position.x) * 1.2
    }
  })

  // Sky subtle color shift
  const hue = 0.61 + Math.sin(t * 0.05) * 0.02
  scene.background.setHSL(hue, 0.3, 0.03)

  controls.update()
  composer.render()
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  bloomPass.setSize(innerWidth, innerHeight)
})
