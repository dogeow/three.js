// 3118. A* Pathfinding 3D
// A* algorithm on 3D grid with real-time visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const GRID = 20
const CELL = 2
const START = { x: 0, y: 0, z: 0 }
const END = { x: GRID - 1, y: 0, z: GRID - 1 }

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080812)
scene.fog = new THREE.FogExp2(0x080812, 0.02)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(30, 35, 30)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.8)
composer.addPass(bloom)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.1

// Lights
scene.add(new THREE.AmbientLight(0x334466, 2.5))
const sun = new THREE.DirectionalLight(0xaaccff, 3.0)
sun.position.set(20, 40, 20)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 100
sun.shadow.camera.left = -50
sun.shadow.camera.right = 50
sun.shadow.camera.top = 50
sun.shadow.camera.bottom = -50
scene.add(sun)

const fill = new THREE.PointLight(0x6688bb, 8, 80)
fill.position.set(-15, 25, -15)
scene.add(fill)

const accent = new THREE.PointLight(0xffaa44, 5, 60)
accent.position.set(15, 20, 30)
scene.add(accent)

// Grid ground
const groundGeo = new THREE.PlaneGeometry(GRID * CELL + 4, GRID * CELL + 4)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const gridLine = new THREE.GridHelper(GRID * CELL, GRID, 0x334466, 0x223344)
gridLine.position.y = 0.02
scene.add(gridLine)

// Cell storage
const cells = []
const cellMeshes = []
const cellGeo = new THREE.BoxGeometry(CELL * 0.9, CELL * 0.3, CELL * 0.9)

// Cell types: 0=open, 1=wall, 2=start, 3=end, 4=path, 5=open-search, 6=closed
const cellColors = {
  0: { color: 0x223344, emissive: 0x112233, ei: 0.1 },
  1: { color: 0x1a1a2e, emissive: 0x0a0a15, ei: 0 },
  2: { color: 0x00ff88, emissive: 0x00ff88, ei: 0.8 },
  3: { color: 0xff4444, emissive: 0xff4444, ei: 0.8 },
  4: { color: 0xffcc00, emissive: 0xffcc00, ei: 0.5 },
  5: { color: 0x4488ff, emissive: 0x4488ff, ei: 0.3 },
  6: { color: 0x333366, emissive: 0x222244, ei: 0.1 }
}

for (let z = 0; z < GRID; z++) {
  cells[z] = []
  cellMeshes[z] = []
  for (let x = 0; x < GRID; x++) {
    cells[z][x] = 0
    const mat = new THREE.MeshStandardMaterial(cellColors[0])
    const mesh = new THREE.Mesh(cellGeo, mat)
    mesh.position.set(x * CELL - (GRID * CELL) / 2 + CELL / 2, 0.15, z * CELL - (GRID * CELL) / 2 + CELL / 2)
    mesh.receiveShadow = true
    scene.add(mesh)
    cellMeshes[z][x] = mesh
  }
}

function setCell(x, z, type) {
  if (x < 0 || x >= GRID || z < 0 || z >= GRID) return
  cells[z][x] = type
  const c = cellColors[type]
  const mesh = cellMeshes[z][x]
  mesh.material.color.setHex(c.color)
  mesh.material.emissive.setHex(c.emissive)
  mesh.material.emissiveIntensity = c.ei
}

function setCellHeight(x, z, h) {
  if (x < 0 || x >= GRID || z < 0 || z >= GRID) return
  const mesh = cellMeshes[z][x]
  mesh.scale.y = 1 + h
  mesh.position.y = 0.15 + h * 0.5
}

// Mark start and end
setCell(START.x, START.z, 2)
setCell(END.x, END.z, 3)

// Heightmap terrain
const heightMap = Array.from({ length: GRID }, (_, z) =>
  Array.from({ length: GRID }, (_, x) => {
    // Gentle hills
    return Math.floor(
      Math.sin(x * 0.4) * Math.cos(z * 0.4) * 1.5 +
      Math.sin(x * 0.2 + z * 0.3) * 1 +
      Math.random() * 0.3
    )
  })
)

for (let z = 0; z < GRID; z++) {
  for (let x = 0; x < GRID; x++) {
    if (heightMap[z][x] > 0) setCellHeight(x, z, heightMap[z][x])
  }
}

// A* implementation
class MinHeap {
  constructor() { this.data = [] }
  push(item) {
    this.data.push(item)
    this._up(this.data.length - 1)
  }
  pop() {
    const top = this.data[0]
    this.data[0] = this.data[this.data.length - 1]
    this.data.pop()
    if (this.data.length > 0) this._down(0)
    return top
  }
  get size() { return this.data.length }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.data[p].f <= this.data[i].f) break
      ;[this.data[p], this.data[i]] = [this.data[i], this.data[p]]
      i = p
    }
  }
  _down(i) {
    const n = this.data.length
    while (true) {
      let m = i
      const l = 2 * i + 1, r = 2 * i + 2
      if (l < n && this.data[l].f < this.data[m].f) m = l
      if (r < n && this.data[r].f < this.data[m].f) m = r
      if (m === i) break
      ;[this.data[m], this.data[i]] = [this.data[i], this.data[m]]
      i = m
    }
  }
}

function heuristic(a, b) {
  // Diagonal distance (Chebyshev)
  const dx = Math.abs(a.x - b.x)
  const dz = Math.abs(a.z - b.z)
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)
}

function getNeighbors(node) {
  const dirs = [
    { x: 1, z: 0, cost: 1 }, { x: -1, z: 0, cost: 1 },
    { x: 0, z: 1, cost: 1 }, { x: 0, z: -1, cost: 1 },
    { x: 1, z: 1, cost: Math.SQRT2 }, { x: -1, z: 1, cost: Math.SQRT2 },
    { x: 1, z: -1, cost: Math.SQRT2 }, { x: -1, z: -1, cost: Math.SQRT2 }
  ]
  return dirs
    .map(d => ({ x: node.x + d.x, z: node.z + d.z }))
    .filter(n => n.x >= 0 && n.x < GRID && n.z >= 0 && n.z < GRID)
}

let currentPath = []
let openSet = new MinHeap()
let cameFrom = new Map()
let gScore = new Map()
let fScore = new Map()
let openHash = new Set()
let closedSet = new Set()
let stepCount = 0
let isRunning = false
let foundPath = false
let pathMesh = null
let searchStepDelay = 30 // ms per step

const stepStats = { opened: 0, closed: 0, pathLength: 0 }

function runAstar() {
  // Reset
  currentPath = []
  openSet = new MinHeap()
  cameFrom = new Map()
  gScore = new Map()
  fScore = new Map()
  openHash = new Set()
  closedSet = new Set()
  stepCount = 0
  foundPath = false
  isRunning = true

  // Reset cell colors
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      if (cells[z][x] === 4 || cells[z][x] === 5 || cells[z][x] === 6) {
        setCell(x, z, 0)
      }
    }
  }
  if (pathMesh) { scene.remove(pathMesh); pathMesh = null }
  setCell(START.x, START.z, 2)
  setCell(END.x, END.z, 3)

  const startKey = `${START.x},${START.z}`
  gScore.set(startKey, 0)
  fScore.set(startKey, heuristic(START, END))
  openSet.push({ x: START.x, z: START.z, f: fScore.get(startKey) })
  openHash.add(startKey)
  stepStats.opened = 0
  stepStats.closed = 0
}

function stepAstar() {
  if (!isRunning || foundPath) return

  if (openSet.size === 0) {
    isRunning = false
    return
  }

  const current = openSet.pop()
  const cKey = `${current.x},${current.z}`
  openHash.delete(cKey)

  if (closedSet.has(cKey)) {
    // Already processed
    return
  }

  closedSet.add(cKey)
  stepStats.closed++

  if (cells[current.z][current.x] === 0) {
    setCell(current.x, current.z, 6)
  }

  if (current.x === END.x && current.z === END.z) {
    // Reconstruct path
    let node = current
    while (cameFrom.has(`${node.x},${node.z}`)) {
      currentPath.push(node)
      node = cameFrom.get(`${node.x},${node.z}`)
      if (cells[node.z][node.x] !== 2 && cells[node.z][node.x] !== 3) {
        setCell(node.x, node.z, 4)
      }
    }
    currentPath.reverse()
    stepStats.pathLength = currentPath.length
    foundPath = true
    isRunning = false
    drawPathLine()
    return
  }

  for (const neighbor of getNeighbors(current)) {
    const nKey = `${neighbor.x},${neighbor.z}`
    if (closedSet.has(nKey)) continue
    // Height penalty
    const heightDiff = Math.abs(heightMap[neighbor.z][neighbor.x] - heightMap[current.z][current.x])
    const moveCost = (Math.abs(neighbor.x - current.x) + Math.abs(neighbor.z - current.z) === 2 ? Math.SQRT2 : 1) * (1 + heightDiff * 0.5)
    const tentativeG = (gScore.get(cKey) || 0) + moveCost

    if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
      cameFrom.set(nKey, current)
      gScore.set(nKey, tentativeG)
      const f = tentativeG + heuristic(neighbor, END)
      fScore.set(nKey, f)

      if (!openHash.has(nKey)) {
        openSet.push({ x: neighbor.x, z: neighbor.z, f })
        openHash.add(nKey)
        stepStats.opened++
        if (cells[neighbor.z][neighbor.x] === 0) {
          setCell(neighbor.x, neighbor.z, 5)
        }
      }
    }
  }
}

// Path line
const pathMat = new THREE.LineBasicMaterial({ color: 0xffcc00, linewidth: 3 })
const pathPts = []

function drawPathLine() {
  if (pathMesh) scene.remove(pathMesh)
  if (currentPath.length < 2) return

  const pts = [
    new THREE.Vector3(
      START.x * CELL - (GRID * CELL) / 2 + CELL / 2,
      1,
      START.z * CELL - (GRID * CELL) / 2 + CELL / 2
    ),
    ...currentPath.map(n => new THREE.Vector3(
      n.x * CELL - (GRID * CELL) / 2 + CELL / 2,
      1.5,
      n.z * CELL - (GRID * CELL) / 2 + CELL / 2
    )),
    new THREE.Vector3(
      END.x * CELL - (GRID * CELL) / 2 + CELL / 2,
      1,
      END.z * CELL - (GRID * CELL) / 2 + CELL / 2
    )
  ]

  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  pathMesh = new THREE.Line(geo, pathMat)
  scene.add(pathMesh)
}

// Start/end markers
const markerGeo = new THREE.SphereGeometry(0.6, 16, 16)
const startMarker = new THREE.Mesh(markerGeo, new THREE.MeshStandardMaterial({
  color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.8
}))
startMarker.position.set(START.x * CELL - (GRID * CELL) / 2 + CELL / 2, 1.5, START.z * CELL - (GRID * CELL) / 2 + CELL / 2)
scene.add(startMarker)

const endMarker = new THREE.Mesh(markerGeo, new THREE.MeshStandardMaterial({
  color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 0.8
}))
endMarker.position.set(END.x * CELL - (GRID * CELL) / 2 + CELL / 2, 1.5, END.z * CELL - (GRID * CELL) / 2 + CELL / 2)
scene.add(endMarker)

// UI
const uiDiv = document.createElement('div')
uiDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#fff;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.75);padding:14px;border-radius:8px;border:1px solid #334;min-width:220px;'
document.body.appendChild(uiDiv)

const title = document.createElement('div')
title.style.cssText = 'font-size:15px;font-weight:bold;color:#ffcc00;margin-bottom:10px;'
title.textContent = 'A* Pathfinding 3D'
uiDiv.appendChild(title)

const statusDiv = document.createElement('div')
uiDiv.appendChild(statusDiv)

const statsDiv = document.createElement('div')
statsDiv.style.cssText = 'margin-top:8px;font-size:11px;color:#aaa;'
uiDiv.appendChild(statsDiv)

const controlsDiv = document.createElement('div')
controlsDiv.style.cssText = 'position:fixed;top:20px;right:20px;display:flex;flex-direction:column;gap:8px;'
document.body.appendChild(controlsDiv)

const btnStyle = 'padding:8px 16px;background:#223344;border:1px solid #446688;color:#fff;font-family:monospace;font-size:12px;cursor:pointer;border-radius:6px;'
const buttons = [
  { label: '▶ Run A*', action: () => runAstar() },
  { label: '⏩ Step x10', action: () => { for (let i = 0; i < 10; i++) stepAstar() } },
  { label: '🔀 Randomize Walls', action: () => randomizeWalls() },
  { label: '🗑 Clear Walls', action: () => clearWalls() },
  { label: '🎲 Random Obstacles', action: () => addRandomObstacles() }
]
buttons.forEach(b => {
  const btn = document.createElement('button')
  btn.textContent = b.label
  btn.style.cssText = btnStyle
  btn.onclick = b.action
  controlsDiv.appendChild(btn)
})

function randomizeWalls() {
  clearWalls()
  const numWalls = Math.floor(GRID * GRID * 0.25)
  for (let i = 0; i < numWalls; i++) {
    const x = Math.floor(Math.random() * GRID)
    const z = Math.floor(Math.random() * GRID)
    if ((x === START.x && z === START.z) || (x === END.x && z === END.z)) continue
    setCell(x, z, 1)
    setCellHeight(x, z, 2 + Math.random() * 2)
  }
}

function clearWalls() {
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      if (cells[z][x] === 1) {
        setCell(x, z, 0)
        setCellHeight(x, z, heightMap[z][x])
      }
    }
  }
}

function addRandomObstacles() {
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(Math.random() * (GRID - 2)) + 1
    const z = Math.floor(Math.random() * (GRID - 2)) + 1
    if ((x === START.x && z === START.z) || (x === END.x && z === END.z)) continue
    const size = Math.floor(Math.random() * 3) + 1
    for (let dz = 0; dz < size; dz++) {
      for (let dx = 0; dx < size; dx++) {
        const nx = x + dx, nz = z + dz
        if (nx < GRID && nz < GRID && !(nx === START.x && nz === START.z) && !(nx === END.x && nz === END.z)) {
          setCell(nx, nz, 1)
          setCellHeight(nx, nz, 1.5 + Math.random())
        }
      }
    }
  }
}

// Auto-run timer
let lastStep = 0
function animate(t = 0) {
  requestAnimationFrame(animate)
  const dt = (t - last) / 1000
  last = t

  // Auto-step
  if (isRunning && t - lastStep > searchStepDelay) {
    stepAstar()
    lastStep = t
  }

  // Update UI
  statusDiv.innerHTML = isRunning
    ? `<span style="color:#4488ff;">🔍 Searching... step ${stepCount++}</span>`
    : foundPath
    ? `<span style="color:#00ff88;">✅ Path found! ${currentPath.length} steps</span>`
    : `<span style="color:#aaa;">⏸ Ready. Click Run.</span>`

  statsDiv.innerHTML = `Opened: ${stepStats.opened} | Closed: ${stepStats.closed} | Path: ${stepStats.pathLength}<br>Grid: ${GRID}×${GRID} | Diagonal: √2 | Height penalty: 0.5×`

  // Animate start/end
  startMarker.scale.setScalar(1 + Math.sin(t * 0.003) * 0.1)
  endMarker.scale.setScalar(1 + Math.cos(t * 0.003) * 0.1)

  controls.update()
  composer.render()
}

let last = 0
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
