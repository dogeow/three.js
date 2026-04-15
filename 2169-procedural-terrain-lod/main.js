// 2169. 程序化地形LOD — Enhanced Edition
// 程序化地形多级细节 + 鼠标交互 + 动态天气
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87CEEB)
scene.fog = new THREE.FogExp2(0x87CEEB, 0.004)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000)
camera.position.set(0, 40, 80)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2 - 0.05
controls.minDistance = 10
controls.maxDistance = 300

// ─── Noise Terrain ───────────────────────────────────────────────────────────
const perlin = new ImprovedNoise()
const SEED = Math.random() * 100

function getHeight(x, z, scale, octaves) {
  let h = 0, amp = 1, freq = 1, max = 0
  for (let i = 0; i < octaves; i++) {
    h += perlin.noise(x * freq + SEED, z * freq + SEED, SEED) * amp
    max += amp; amp *= 0.5; freq *= 2
  }
  return (h / max) * scale
}

function buildTerrain(segments, scale, yOffset) {
  const geo = new THREE.PlaneGeometry(200, 200, segments, segments)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const h = getHeight(x * 0.02, z * 0.02, scale, 6)
    pos.setY(i, h + yOffset)
  }
  geo.computeVertexNormals()
  return geo
}

const terrainMats = [
  new THREE.MeshStandardMaterial({ color: 0x1a4728, roughness: 0.95, metalness: 0.0 }), // deep forest
  new THREE.MeshStandardMaterial({ color: 0x2d5e3a, roughness: 0.9, metalness: 0.0 }), // grass
  new THREE.MeshStandardMaterial({ color: 0x7a6e5d, roughness: 0.8, metalness: 0.1, flatShading: true }), // rock
  new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.7, metalness: 0.2, flatShading: true }), // snow
]

const terrainGroup = new THREE.Group()

// LOD等级: detail decreases as distance increases
const terrainHigh = new THREE.Mesh(buildTerrain(200, 18, 0), terrainMats[0])
const terrainMid = new THREE.Mesh(buildTerrain(100, 18, 0), terrainMats[1])
const terrainLow = new THREE.Mesh(buildTerrain(50, 18, 0), terrainMats[2])
const terrainFlat = new THREE.Mesh(buildTerrain(20, 18, 0), terrainMats[3])

;[terrainHigh, terrainMid, terrainLow, terrainFlat].forEach((m, i) => {
  m.receiveShadow = true
  m.castShadow = i < 2
  m.position.y = i * 0.05
  terrainGroup.add(m)
})
scene.add(terrainGroup)

// ─── Trees ───────────────────────────────────────────────────────────────────
const treeGroup = new THREE.Group()
function makeTree(x, z) {
  const h = getHeight(x * 0.02, z * 0.02, 18, 6)
  if (h < -3 || h > 6) return // only place trees in valid elevation

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 })
  )
  trunk.position.set(x, h + 1.5, z)
  trunk.castShadow = true

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a5c2a, roughness: 0.8 })
  )
  leaves.position.set(x, h + 5.5, z)
  leaves.castShadow = true

  treeGroup.add(trunk, leaves)
}

for (let i = 0; i < 300; i++) {
  const x = (Math.random() - 0.5) * 180
  const z = (Math.random() - 0.5) * 180
  makeTree(x, z)
}
scene.add(treeGroup)

// ─── Water / Lake ─────────────────────────────────────────────────────────────
const lakeGeo = new THREE.CircleGeometry(20, 32)
const lakeMat = new THREE.MeshStandardMaterial({
  color: 0x2266aa, roughness: 0.1, metalness: 0.3,
  transparent: true, opacity: 0.85
})
const lake = new THREE.Mesh(lakeGeo, lakeMat)
lake.rotation.x = -Math.PI / 2
lake.position.y = -2.8
scene.add(lake)

// ─── Clouds ──────────────────────────────────────────────────────────────────
const cloudGroup = new THREE.Group()
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 })

for (let i = 0; i < 12; i++) {
  const cx = (Math.random() - 0.5) * 400
  const cy = 60 + Math.random() * 30
  const cz = (Math.random() - 0.5) * 400
  for (let j = 0; j < 4; j++) {
    const puffs = new THREE.Mesh(
      new THREE.SphereGeometry(4 + Math.random() * 4, 8, 8),
      cloudMat
    )
    puffs.position.set(cx + j * 5 - 10, cy + Math.random() * 3, cz + Math.random() * 5)
    cloudGroup.add(puffs)
  }
}
scene.add(cloudGroup)

// ─── Mouse Click — Stamp Crater ─────────────────────────────────────────────
const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const stampMeshes = []

window.addEventListener('click', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects([terrainHigh])
  if (hits.length > 0) {
    const pt = hits[0].point
    const stamp = new THREE.Mesh(
      new THREE.CircleGeometry(5, 24),
      new THREE.MeshBasicMaterial({ color: 0x8B7355, transparent: true, opacity: 0.6 })
    )
    stamp.rotation.x = -Math.PI / 2
    stamp.position.set(pt.x, pt.y + 0.1, pt.z)
    scene.add(stamp)
    stampMeshes.push(stamp)
  }
})

// ─── Lights ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x88aacc, 0.7))
const sun = new THREE.DirectionalLight(0xffffcc, 1.5)
sun.position.set(80, 120, 60)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 500
sun.shadow.camera.left = sun.shadow.camera.bottom = -150
sun.shadow.camera.right = sun.shadow.camera.top = 150
scene.add(sun)

// Sky color update for sunset effect
const skyColors = [
  new THREE.Color(0x87CEEB), // day
  new THREE.Color(0xff8844), // sunset
  new THREE.Color(0x1a1a4a), // night
]

// ─── Animation ──────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // LOD: show terrain based on camera distance
  const dist = camera.position.length()
  terrainHigh.visible = dist < 100
  terrainMid.visible = dist >= 80 && dist < 200
  terrainLow.visible = dist >= 150 && dist < 350
  terrainFlat.visible = dist >= 280

  // Move clouds
  cloudGroup.children.forEach((c, i) => {
    c.position.x += 0.02 * (i % 2 === 0 ? 1 : -1)
    if (c.position.x > 250) c.position.x = -250
    if (c.position.x < -250) c.position.x = 250
  })

  // Lake shimmer
  lake.material.opacity = 0.75 + Math.sin(t * 0.8) * 0.1

  // Sky color cycling (slow day/night)
  const phase = (t * 0.02) % 3
  const idx = Math.floor(phase)
  const blend = phase - idx
  if (idx < 2) {
    scene.background.lerpColors(skyColors[idx], skyColors[idx + 1], blend)
    scene.fog.color.lerpColors(skyColors[idx], skyColors[idx + 1], blend)
  }

  // Stamp fade
  stampMeshes.forEach((s, i) => {
    s.material.opacity -= 0.003
    if (s.material.opacity <= 0) { scene.remove(s); stampMeshes.splice(i, 1) }
  })

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
