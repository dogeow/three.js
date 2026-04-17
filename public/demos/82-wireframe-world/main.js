import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

// ─── Scene Setup ───────────────────────────────────────────────────────────
const canvas = document.createElement('canvas')
document.body.appendChild(canvas)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000, 1)

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x000000, 0.008)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500)
camera.position.set(45, 35, 45)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1
controls.target.set(0, 5, 0)

// ─── GUI State ────────────────────────────────────────────────────────────
const params = {
  lineColor: '#00ffcc',
  lineOpacity: 0.6,
  showTerrain: true,
  showBuildings: true,
  showGrid: true,
  showScanLine: true,
  scanSpeed: 0.5,
  showParticles: true,
  pulseIntensity: 0.5,
  showWater: true,
  showTrees: true,
  showSkyDome: true,
  showDataStreams: true,
  breathing: true,
  wireframeDensity: 40,
}

// ─── Material Factory ──────────────────────────────────────────────────────
function makeMat(color, opacity, blending = THREE.AdditiveBlending) {
  return new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending,
    depthWrite: false,
  })
}

let baseColor = new THREE.Color(params.lineColor)
const matGrid = makeMat('#00ffcc', 0.25)
const matTerrain = makeMat('#00ff88', 0.55)
const matBuilding = makeMat('#00ffcc', 0.65)
const matTree = makeMat('#00ff99', 0.5)
const matWater = makeMat('#0088ff', 0.4)
const matSky = makeMat('#004488', 0.2)
const matParticle = makeMat('#00ffcc', 0.9)
const matScan = makeMat('#00ffcc', 0.15, THREE.AdditiveBlending)
const matPulse = makeMat('#00ffcc', 0.3, THREE.AdditiveBlending)
const matStream = makeMat('#00ffcc', 0.7, THREE.AdditiveBlending)
const matPulseBuilding = makeMat('#00ffcc', 0.4, THREE.AdditiveBlending)

// Group references
let terrainGroup = new THREE.Group()
let buildingGroup = new THREE.Group()
let treeGroup = new THREE.Group()
let waterGroup = new THREE.Group()
let skyGroup = new THREE.Group()
let particleSystem = null
let dataStreamsGroup = null
let scanPlane = null
let gridMesh = null

// ─── Grid Floor ───────────────────────────────────────────────────────────
function buildGrid() {
  if (gridMesh) scene.remove(gridMesh)
  const gridSize = 120, gridDiv = 60
  const step = gridSize / gridDiv
  const gridPoints = []
  for (let i = 0; i <= gridDiv; i++) {
    const x = -gridSize / 2 + i * step
    gridPoints.push(-gridSize / 2, 0, x, gridSize / 2, 0, x)
    gridPoints.push(x, 0, -gridSize / 2, x, 0, gridSize / 2)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3))
  gridMesh = new THREE.LineSegments(geo, matGrid.clone())
  scene.add(gridMesh)
}

// ─── Terrain ───────────────────────────────────────────────────────────────
const terrainOriginalPositions = []

function buildTerrain() {
  if (terrainGroup) scene.remove(terrainGroup)
  terrainGroup = new THREE.Group()
  terrainOriginalPositions.length = 0

  const geo = new THREE.PlaneGeometry(90, 90, params.wireframeDensity, params.wireframeDensity)
  geo.rotateX(-Math.PI / 2)

  // Distort vertices to create hills/mountains
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const distFromCenter = Math.sqrt(x * x + z * z)
    const noise1 = Math.sin(x * 0.15) * Math.cos(z * 0.12) * 6
    const noise2 = Math.sin(x * 0.3 + 1) * Math.cos(z * 0.25) * 3
    const noise3 = Math.sin(x * 0.5 + z * 0.3) * 1.5
    let y = noise1 + noise2 + noise3
    // Flatten center area
    if (distFromCenter < 12) y *= distFromCenter / 12
    // Raise some peaks
    if (y > 4 && Math.random() > 0.7) y += 3 + Math.random() * 4
    pos.setY(i, y)
    terrainOriginalPositions.push(y)
  }
  geo.computeVertexNormals()

  const wireGeo = new THREE.WireframeGeometry(geo)
  const wireMat = matTerrain.clone()
  const terrain = new THREE.LineSegments(wireGeo, wireMat)
  terrainGroup.add(terrain)
  scene.add(terrainGroup)
}

// ─── Buildings ─────────────────────────────────────────────────────────────
function buildBuildings() {
  if (buildingGroup) scene.remove(buildingGroup)
  buildingGroup = new THREE.Group()
  buildingGroup.userData.meshes = []
  buildingGroup.userData.pulseMeshes = []

  const boxGeo = new THREE.BoxGeometry(1, 1, 1)
  const wireGeo = new THREE.WireframeGeometry(boxGeo)

  const buildingPositions = []
  for (let i = 0; i < 35; i++) {
    const angle = (i / 35) * Math.PI * 2 + Math.random() * 0.5
    const radius = 15 + Math.random() * 28
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const h = 2 + Math.random() * 12
    const w = 0.8 + Math.random() * 2.5
    const d = 0.8 + Math.random() * 2.5

    const mesh = new THREE.LineSegments(wireGeo, matBuilding.clone())
    mesh.position.set(x, h / 2, z)
    mesh.scale.set(w, h, d)
    mesh.userData.baseOpacity = matBuilding.opacity
    buildingGroup.add(mesh)
    buildingGroup.userData.meshes.push(mesh)

    // Some buildings with pulsing edges
    if (Math.random() > 0.5) {
      const pulseMesh = new THREE.LineSegments(wireGeo.clone(), matPulseBuilding.clone())
      pulseMesh.position.set(x, h / 2, z)
      pulseMesh.scale.set(w * 1.002, h * 1.002, d * 1.002)
      pulseMesh.userData.baseOpacity = 0.3
      pulseMesh.userData.phase = Math.random() * Math.PI * 2
      buildingGroup.add(pulseMesh)
      buildingGroup.userData.pulseMeshes.push(pulseMesh)
    }

    // Antenna on tall buildings
    if (h > 7 && Math.random() > 0.5) {
      const antGeo = new THREE.BufferGeometry()
      const antPts = [0, h / 2, 0, 0, h / 2 + 2 + Math.random() * 2, 0]
      antGeo.setAttribute('position', new THREE.Float32BufferAttribute(antPts, 3))
      const ant = new THREE.Line(antGeo, makeMat('#ff4444', 0.8))
      ant.position.set(x, h / 2, z)
      buildingGroup.add(ant)
    }
  }

  scene.add(buildingGroup)
}

// ─── Trees ────────────────────────────────────────────────────────────────
function buildTrees() {
  if (treeGroup) scene.remove(treeGroup)
  treeGroup = new THREE.Group()

  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.08, 1, 6)
  const foliageGeo = new THREE.ConeGeometry(0.6, 2, 8)
  const foliageGeo2 = new THREE.ConeGeometry(0.5, 1.5, 8)

  const trunkWire = new THREE.WireframeGeometry(trunkGeo)
  const foliageWire = new THREE.WireframeGeometry(foliageGeo)
  const foliageWire2 = new THREE.WireframeGeometry(foliageGeo2)

  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 5 + Math.random() * 35
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    // Avoid center
    if (Math.sqrt(x * x + z * z) < 8) continue

    // Trunk
    const th = 1 + Math.random() * 1.5
    const trunk = new THREE.LineSegments(trunkWire.clone(), matTree.clone())
    trunk.position.set(x, th / 2, z)
    trunk.scale.set(1, th, 1)
    treeGroup.add(trunk)

    // Foliage layers
    const fh1 = 1.5 + Math.random() * 2
    const foliage1 = new THREE.LineSegments(foliageWire.clone(), matTree.clone())
    foliage1.position.set(x, th + fh1 / 2, z)
    foliage1.scale.set(1, fh1, 1)
    treeGroup.add(foliage1)

    if (Math.random() > 0.4) {
      const fh2 = 1 + Math.random() * 1.5
      const foliage2 = new THREE.LineSegments(foliageWire2.clone(), matTree.clone())
      foliage2.position.set(x, th + fh1 + fh2 / 2, z)
      foliage2.scale.set(1, fh2, 1)
      treeGroup.add(foliage2)
    }
  }
  scene.add(treeGroup)
}

// ─── Water ────────────────────────────────────────────────────────────────
function buildWater() {
  if (waterGroup) scene.remove(waterGroup)
  waterGroup = new THREE.Group()

  // Outer water ring
  const waterGeo = new THREE.PlaneGeometry(120, 120, 30, 30)
  waterGeo.rotateX(-Math.PI / 2)
  const waterWire = new THREE.WireframeGeometry(waterGeo)
  const water = new THREE.LineSegments(waterWire, matWater.clone())
  water.position.y = -0.3
  waterGroup.add(water)

  // Inner pool
  const poolGeo = new THREE.PlaneGeometry(20, 20, 10, 10)
  poolGeo.rotateX(-Math.PI / 2)
  const poolWire = new THREE.WireframeGeometry(poolGeo)
  const pool = new THREE.LineSegments(poolWire, makeMat('#0044ff', 0.3))
  pool.position.y = -0.5
  waterGroup.add(pool)

  scene.add(waterGroup)
}

// ─── Sky Dome ──────────────────────────────────────────────────────────────
function buildSkyDome() {
  if (skyGroup) scene.remove(skyGroup)
  skyGroup = new THREE.Group()

  // Hemisphere grid
  const skyGeo = new THREE.SphereGeometry(90, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  const skyWire = new THREE.WireframeGeometry(skyGeo)
  const sky = new THREE.LineSegments(skyWire, matSky.clone())
  skyGroup.add(sky)

  // Horizon ring
  const ringGeo = new THREE.TorusGeometry(90, 0.1, 8, 64)
  ringGeo.rotateX(Math.PI / 2)
  const ringWire = new THREE.WireframeGeometry(ringGeo)
  const ring = new THREE.LineSegments(ringWire, makeMat('#0088ff', 0.3))
  ring.position.y = 0.5
  skyGroup.add(ring)

  // Vertical poles at cardinal directions
  const poleGeo = new THREE.BufferGeometry()
  const polePts = []
  for (let dir = 0; dir < 4; dir++) {
    const angle = (dir / 4) * Math.PI * 2
    const px = Math.cos(angle) * 90
    const pz = Math.sin(angle) * 90
    polePts.push(px, 0, pz, px, 90, pz)
  }
  poleGeo.setAttribute('position', new THREE.Float32BufferAttribute(polePts, 3))
  const poles = new THREE.LineSegments(poleGeo, makeMat('#0066ff', 0.2))
  skyGroup.add(poles)

  scene.add(skyGroup)
}

// ─── Particles ────────────────────────────────────────────────────────────
function buildParticles() {
  if (particleSystem) scene.remove(particleSystem)

  const count = 2000
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    // Constellation-like distribution
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 0.7)
    const r = 30 + Math.random() * 50

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = 5 + Math.random() * 40
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    sizes[i] = 0.1 + Math.random() * 0.4
    phases[i] = Math.random() * Math.PI * 2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1))

  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(params.lineColor),
    size: 0.3,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  particleSystem = new THREE.Points(geo, mat)
  scene.add(particleSystem)
}

// ─── Data Streams ─────────────────────────────────────────────────────────
function buildDataStreams() {
  if (dataStreamsGroup) scene.remove(dataStreamsGroup)
  dataStreamsGroup = new THREE.Group()
  dataStreamsGroup.userData.streams = []

  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 100
    const z = (Math.random() - 0.5) * 100
    const length = 3 + Math.random() * 10
    const speed = 0.5 + Math.random() * 2
    const phase = Math.random() * Math.PI * 2

    const geo = new THREE.BufferGeometry()
    const pts = [x, 60, z, x, 60 - length, z]
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))

    const mat = makeMat(params.lineColor, 0.6).clone()
    const line = new THREE.Line(geo, mat)
    line.userData = { speed, phase, length, x, z, head: 60, tail: 60 - length }
    dataStreamsGroup.add(line)
    dataStreamsGroup.userData.streams.push(line)
  }
  scene.add(dataStreamsGroup)
}

// ─── Scan Line ─────────────────────────────────────────────────────────────
function buildScanLine() {
  if (scanPlane) scene.remove(scanPlane)

  const scanGeo = new THREE.PlaneGeometry(140, 2)
  scanGeo.rotateX(-Math.PI / 2)
  scanPlane = new THREE.Mesh(scanGeo, matScan.clone())
  scanPlane.position.y = 0
  scene.add(scanPlane)

  // Scan glow line
  const glowGeo = new THREE.PlaneGeometry(140, 0.3)
  glowGeo.rotateX(-Math.PI / 2)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const glowLine = new THREE.Mesh(glowGeo, glowMat)
  glowLine.position.y = 0.1
  scanPlane.add(glowLine)
}

// ─── Build All ─────────────────────────────────────────────────────────────
function buildAll() {
  buildGrid()
  buildTerrain()
  buildBuildings()
  buildTrees()
  buildWater()
  buildSkyDome()
  buildParticles()
  buildDataStreams()
  buildScanLine()
}

buildAll()

// ─── GUI ───────────────────────────────────────────────────────────────────
const gui = new GUI({ title: 'Wireframe World Controls' })

const colorFolder = gui.addFolder('显示 / Display')
colorFolder.addColor(params, 'lineColor').name('Line Color').onChange(v => {
  baseColor = new THREE.Color(v)
})
colorFolder.add(params, 'lineOpacity', 0.1, 1.0, 0.05).name('Opacity')
  .onChange(v => {
    matGrid.opacity = v * 0.4
    matTerrain.opacity = v * 0.9
    matBuilding.opacity = v * 1.0
    matTree.opacity = v * 0.8
    matWater.opacity = v * 0.6
    matSky.opacity = v * 0.3
  })

const showFolder = gui.addFolder('开关 / Toggle')
showFolder.add(params, 'showGrid').name('Grid').onChange(v => { if (gridMesh) gridMesh.visible = v })
showFolder.add(params, 'showTerrain').name('Terrain').onChange(v => { terrainGroup.visible = v })
showFolder.add(params, 'showBuildings').name('Buildings').onChange(v => { buildingGroup.visible = v })
showFolder.add(params, 'showTrees').name('Trees').onChange(v => { treeGroup.visible = v })
showFolder.add(params, 'showWater').name('Water').onChange(v => { waterGroup.visible = v })
showFolder.add(params, 'showSkyDome').name('Sky Dome').onChange(v => { skyGroup.visible = v })
showFolder.add(params, 'showParticles').name('Particles').onChange(v => { if (particleSystem) particleSystem.visible = v })
showFolder.add(params, 'showDataStreams').name('Data Streams').onChange(v => { if (dataStreamsGroup) dataStreamsGroup.visible = v })

const fxFolder = gui.addFolder('特效 / Effects')
fxFolder.add(params, 'showScanLine').name('Scan Line').onChange(v => { if (scanPlane) scanPlane.visible = v })
fxFolder.add(params, 'scanSpeed', 0.1, 2.0, 0.1).name('Scan Speed')
fxFolder.add(params, 'pulseIntensity', 0, 1.0, 0.05).name('Pulse Intensity')
fxFolder.add(params, 'breathing').name('Breathing Terrain')
fxFolder.add(params, 'wireframeDensity', 10, 60, 1).name('Terrain Density')
  .onChange(() => buildTerrain())

// ─── Animation ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
let frameCount = 0, lastFps = 0

function updateFPS() {
  frameCount++
  const now = performance.now()
  if (now - lastFps >= 1000) {
    document.getElementById('fps').textContent = `FPS: ${frameCount}`
    frameCount = 0
    lastFps = now
  }
}

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  const delta = clock.getDelta()

  updateFPS()
  controls.update()

  // Scan line sweep
  if (scanPlane && params.showScanLine) {
    const scanY = (Math.sin(t * params.scanSpeed * 0.3) + 1) / 2 * 35 + 2
    scanPlane.position.y = scanY
    const scanMat = scanPlane.material
    scanMat.opacity = 0.1 + Math.abs(Math.sin(t * params.scanSpeed * 2)) * 0.15
  }

  // Breathing terrain
  if (params.showTerrain && params.breathing && terrainGroup.children.length > 0) {
    const seg = terrainGroup.children[0]
    const geo = seg.geometry
    const pos = geo.attributes.position
    const count = pos.count
    const breathe = Math.sin(t * 0.8) * 0.3 * params.pulseIntensity

    // We need to cache original positions since WireframeGeometry rearranges them
    if (!geo.userData.originalY) {
      geo.userData.originalY = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        geo.userData.originalY[i] = pos.getY(i)
      }
    }

    for (let i = 0; i < count; i++) {
      const origY = geo.userData.originalY[i]
      const wave = Math.sin(t * 1.5 + i * 0.1) * 0.1 * params.pulseIntensity
      pos.setY(i, origY + breathe * 0.2 + wave)
    }
    pos.needsUpdate = true
  }

  // Pulse buildings
  if (buildingGroup && buildingGroup.userData.pulseMeshes) {
    buildingGroup.userData.pulseMeshes.forEach(m => {
      const phase = m.userData.phase || 0
      const pulse = (Math.sin(t * 2 + phase) * 0.5 + 0.5) * params.pulseIntensity
      m.material.opacity = m.userData.baseOpacity * pulse
    })
  }

  // Particle animation
  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position
    const count = positions.count
    for (let i = 0; i < count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      // Gentle drift
      const drift = Math.sin(t * 0.3 + i * 0.01) * 0.02
      positions.setX(i, x + drift)
      positions.setY(i, y + Math.sin(t * 0.5 + i * 0.05) * 0.01)
      positions.setZ(i, z + Math.cos(t * 0.3 + i * 0.01) * 0.02)
    }
    positions.needsUpdate = true
    particleSystem.material.opacity = 0.5 + Math.sin(t * 1.2) * 0.3 * params.pulseIntensity
  }

  // Water wave
  if (waterGroup && waterGroup.children.length > 0) {
    waterGroup.children.forEach((child, ci) => {
      child.material.opacity = (ci === 0 ? 0.25 : 0.2) + Math.sin(t * 0.8 + ci) * 0.1
    })
  }

  // Data streams
  if (dataStreamsGroup && dataStreamsGroup.userData.streams) {
    dataStreamsGroup.userData.streams.forEach(stream => {
      const { speed, length } = stream.userData
      const newY = 60 - ((t * speed * 8) % 65)
      stream.userData.head = newY
      stream.userData.tail = newY - length
      const pts = stream.geometry.attributes.position
      pts.setY(0, stream.userData.head)
      pts.setY(1, stream.userData.tail)
      pts.needsUpdate = true
      stream.material.opacity = 0.3 + Math.sin(t * 3 + stream.userData.phase) * 0.3
    })
  }

  // Grid pulse
  if (gridMesh) {
    gridMesh.material.opacity = 0.15 + Math.sin(t * 0.5) * 0.1
  }

  // Sky dome slow rotation
  if (skyGroup) {
    skyGroup.rotation.y = t * 0.02
  }

  renderer.render(scene, camera)
}

animate()

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})