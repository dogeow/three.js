// 3269. Real Time Gis 3d Map
// 3D terrain map with city blocks, population heatmap, and real-time data overlays
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a2a3a)

// Main renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// CSS2D renderer for labels
const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(innerWidth, innerHeight)
labelRenderer.domElement.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;'
document.body.appendChild(labelRenderer.domElement)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(80, 60, 80)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.1
controls.minDistance = 20
controls.maxDistance = 300

// Terrain
const GRID = 80
const TERRAIN_SIZE = 120
const heights = new Float32Array((GRID + 1) * (GRID + 1))

function getHeight(x, z) {
  // Multi-octave noise for terrain
  const freq1 = 0.03, freq2 = 0.08, freq3 = 0.2
  const n1 = Math.sin(x * freq1 + z * freq1 * 0.7) * 8
  const n2 = Math.sin(x * freq2 + z * freq2 * 1.3 + 1.5) * 3
  const n3 = Math.sin(x * freq3 + z * freq3 * 0.9 + 3.0) * 0.8
  const dist = Math.sqrt(x * x + z * z) / (TERRAIN_SIZE * 0.5)
  const flatZone = Math.max(0, 1 - dist * dist * 2)
  return n1 + n2 + n3 - flatZone * 5
}

for (let z = 0; z <= GRID; z++) {
  for (let x = 0; x <= GRID; x++) {
    const wx = (x / GRID - 0.5) * TERRAIN_SIZE
    const wz = (z / GRID - 0.5) * TERRAIN_SIZE
    heights[z * (GRID + 1) + x] = getHeight(wx, wz)
  }
}

const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, GRID, GRID)
terrainGeo.rotateX(-Math.PI / 2)
const pos = terrainGeo.attributes.position
for (let i = 0; i < pos.count; i++) {
  const x = Math.round(pos.getX(i) / TERRAIN_SIZE * GRID + GRID / 2)
  const z = Math.round(pos.getZ(i) / TERRAIN_SIZE * GRID + GRID / 2)
  pos.setY(i, heights[Math.max(0, Math.min(GRID, z)) * (GRID + 1) + Math.max(0, Math.min(GRID, x))])
}
terrainGeo.computeVertexNormals()

const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
})
// Color terrain by height
const colors = []
for (let i = 0; i < pos.count; i++) {
  const y = pos.getY(i)
  let r, g, b
  if (y < -1) { r = 0.1; g = 0.25; b = 0.45 }      // water/valley
  else if (y < 2) { r = 0.2; g = 0.5; b = 0.2 }    // grass
  else if (y < 5) { r = 0.4; g = 0.35; b = 0.25 }  // hill
  else { r = 0.6; g = 0.6; b = 0.6 }               // mountain
  colors.push(r, g, b)
}
terrainGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))

const terrain = new THREE.Mesh(terrainGeo, terrainMat)
terrain.receiveShadow = true
scene.add(terrain)

// City grid
const cityGroup = new THREE.Group()
scene.add(cityGroup)
const buildings = []
const buildingMats = [
  new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.7, metalness: 0.3 }),
  new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6, metalness: 0.4 }),
  new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.5, metalness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.8, metalness: 0.2 }),
]

const CITY_CENTER_X = 0, CITY_CENTER_Z = 0
const BLOCK_SIZE = 6
const ROAD_WIDTH = 1.5

for (let bx = -6; bx <= 6; bx++) {
  for (let bz = -6; bz <= 6; bz++) {
    const cx = bx * (BLOCK_SIZE + ROAD_WIDTH)
    const cz = bz * (BLOCK_SIZE + ROAD_WIDTH)
    const dist = Math.sqrt(cx * cx + cz * cz)

    // Skip center (park) and far edges
    if (dist < 5) continue
    if (dist > 50) continue

    // Building density based on distance from center
    const density = Math.max(0, 1 - dist / 40)
    if (Math.random() > 0.3 + density * 0.5) continue

    const bh = 1 + density * 8 + Math.random() * 3
    const bw = BLOCK_SIZE * (0.6 + Math.random() * 0.3)
    const bd = BLOCK_SIZE * (0.6 + Math.random() * 0.3)

    const geo = new THREE.BoxGeometry(bw, bh, bd)
    const mat = buildingMats[Math.floor(Math.random() * buildingMats.length)].clone()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(cx, heights[Math.round((cz / TERRAIN_SIZE * 0.5 + 0.5) * GRID) * (GRID + 1) + Math.round((cx / TERRAIN_SIZE * 0.5 + 0.5) * GRID)] + bh / 2, cz)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.population = Math.floor(bh * 100 + Math.random() * 500)
    mesh.userData.baseColor = mat.color.clone()
    buildings.push(mesh)
    cityGroup.add(mesh)
  }
}

// Population heatmap overlay - instanced colored boxes
const heatColors = [[0, 0.4, 1], [0.2, 0.8, 0.2], [1, 1, 0], [1, 0.5, 0], [1, 0.1, 0.1]]
const heatGeo = new THREE.BoxGeometry(BLOCK_SIZE * 0.9, 0.2, BLOCK_SIZE * 0.9)
const heatMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, vertexColors: true })
const heatMesh = new THREE.InstancedMesh(heatGeo, heatMat, buildings.length)
const dummy = new THREE.Object3D()
const maxPop = Math.max(...buildings.map(b => b.userData.population))

buildings.forEach((b, i) => {
  const popNorm = b.userData.population / maxPop
  const colorIdx = Math.min(heatColors.length - 1, Math.floor(popNorm * heatColors.length))
  const col = heatColors[colorIdx]
  dummy.position.set(b.position.x, b.position.y + b.geometry.parameters.height / 2 + 0.15, b.position.z)
  dummy.scale.setScalar(1)
  dummy.updateMatrix()
  heatMesh.setMatrixAt(i, dummy.matrix)
  heatMesh.setColorAt(i, new THREE.Color(col[0], col[1], col[2]))
})
heatMesh.instanceMatrix.needsUpdate = true
heatMesh.instanceColor.needsUpdate = true
scene.add(heatMesh)

// Roads - grid lines
const roadMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.95 })
const roadGeo = new THREE.PlaneGeometry(TERRAIN_SIZE * 1.5, ROAD_WIDTH)
roadGeo.rotateX(-Math.PI / 2)
for (let i = -7; i <= 7; i++) {
  const road = new THREE.Mesh(roadGeo, roadMat)
  road.position.set(i * (BLOCK_SIZE + ROAD_WIDTH), 0.05, 0)
  scene.add(road)
  const road2 = road.clone()
  road2.rotation.y = Math.PI / 2
  road2.position.set(0, 0.05, i * (BLOCK_SIZE + ROAD_WIDTH))
  scene.add(road2)
}

// CSS2D city labels
const POP_LABELS = ['低密度', '中密度', '高密度', '超高密度', '密集区']
function addLabel(x, y, z, text, color) {
  const div = document.createElement('div')
  div.style.cssText = `background:rgba(0,0,0,0.6);color:${color};padding:2px 6px;border-radius:3px;font-family:monospace;font-size:10px;white-space:nowrap;`
  div.textContent = text
  const label = new CSS2DObject(div)
  label.position.set(x, y, z)
  scene.add(label)
}

// Lighting
scene.add(new THREE.AmbientLight(0x8899bb, 0.5))
const sun = new THREE.DirectionalLight(0xffffee, 1.0)
sun.position.set(50, 80, 30)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 300
sun.shadow.camera.left = -100
sun.shadow.camera.right = 100
sun.shadow.camera.top = 100
sun.shadow.camera.bottom = -100
scene.add(sun)

// Wind turbines
const turbineMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.6 })
for (let i = 0; i < 5; i++) {
  const angle = (i / 5) * Math.PI * 2
  const r = 35 + Math.random() * 10
  const tx = Math.cos(angle) * r, tz = Math.sin(angle) * r
  const ty = getHeight(tx, tz)
  const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 8, 8)
  const pole = new THREE.Mesh(poleGeo, turbineMat)
  pole.position.set(tx, ty + 4, tz)
  scene.add(pole)
  const bladeGeo = new THREE.BoxGeometry(0.1, 3, 0.1)
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(bladeGeo, turbineMat)
    blade.position.set(tx, ty + 8, tz)
    blade.rotation.z = (b / 3) * Math.PI * 2
    blade.position.x += Math.cos(blade.rotation.z) * 1.5
    blade.position.y += Math.sin(blade.rotation.z) * 1.5
    blade.rotation.z += Math.PI / 2
    scene.add(blade)
  }
}

// Compass
const compassDiv = document.createElement('div')
compassDiv.style.cssText = 'position:fixed;top:20px;right:20px;width:60px;height:60px;pointer-events:none;transition:transform 0.08s linear;'
compassDiv.innerHTML = '<svg viewBox="0 0 60 60" width="60" height="60"><circle cx="30" cy="30" r="28" fill="rgba(0,0,0,0.5)" stroke="#aaa" stroke-width="1"/><polygon points="30,5 34,30 30,25 26,30" fill="#ff4444"/><polygon points="30,55 34,30 30,35 26,30" fill="#ffffff"/><text x="30" y="12" text-anchor="middle" fill="#ff4444" font-size="8" font-family="monospace">N</text></svg>'
document.body.appendChild(compassDiv)

// 根据相机 azimuth 旋转指南针（OrbitControls 的 azimuthAngle）
function updateCompass() {
  const azimuth = controls.getAzimuthalAngle()
  // SVG 顺时针为正，orbit azimuth 逆时针为正，取负值
  compassDiv.style.transform = 'rotate(' + (-azimuth * 180 / Math.PI).toFixed(1) + 'deg)'
}

// Stats panel
const statsDiv = document.createElement('div')
statsDiv.style.cssText = 'position:fixed;bottom:20px;left:20px;background:rgba(0,0,0,0.6);color:#88ffcc;padding:10px 14px;border-radius:6px;font-family:monospace;font-size:12px;line-height:1.8;'
document.body.appendChild(statsDiv)

let time = 0
function updateMap(delta) {
  time += delta

  // Rotate wind turbine blades
  scene.children.forEach(child => {
    if (child.geometry && child.geometry.type === 'BoxGeometry' && child.position.y > 10 && child.position.y < 15) {
      child.rotation.z += delta * 1.5
    }
  })

  // Animate heatmap opacity
  heatMat.opacity = 0.25 + Math.sin(time * 0.8) * 0.1

  // Building height animation (simulated data update)
  buildings.forEach((b, i) => {
    const pulse = 1 + Math.sin(time * 2 + i * 0.5) * 0.01
    b.scale.y = pulse
  })

  // Update label
  const totalPop = buildings.reduce((s, b) => s + b.userData.population, 0)
  const avgDensity = (totalPop / buildings.length).toFixed(0)
  statsDiv.innerHTML = `City Population: <b>${totalPop.toLocaleString()}</b><br>Avg Building Density: <b>${avgDensity}</b><br>Buildings: <b>${buildings.length}</b><br>Grid: <b>${GRID}×${GRID}</b><br><span style="color:#aaa;font-size:10px">Heatmap Legend:</span><br><span style="color:#88ccff">■</span> Low <span style="color:#88ff44">■</span> Med <span style="color:#ffff44">■</span> High <span style="color:#ff8800">■</span> V.High <span style="color:#ff4444">■</span> Max`
}

let lastTime = performance.now()
function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const delta = Math.min((now - lastTime) / 1000, 0.1)
  lastTime = now
  updateMap(delta)
  controls.update()
  updateCompass()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  labelRenderer.setSize(innerWidth, innerHeight)
})
