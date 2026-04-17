// 2933. Forest Fire Sim
// Cellular automata fire spread on 3D terrain grid
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a3020)
scene.fog = new THREE.Fog(0x1a3020, 40, 120)

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 300)
camera.position.set(0, 40, 50)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)

scene.add(new THREE.AmbientLight(0x2a4030, 0.8))
const sun = new THREE.DirectionalLight(0xffe0a0, 1.0)
sun.position.set(30, 60, 20)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
scene.add(sun)

const GRID = 40
const CELL_SIZE = 2
const GRID_WORLD = GRID * CELL_SIZE

// Cell states: 0=empty, 1=tree, 2=burning, 3=ash
const grid = new Int8Array(GRID * GRID)
const gridMeshes = []
const burningLights = []

const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 })
const ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID_WORLD, GRID_WORLD), groundMat)
ground.rotation.x = -Math.PI/2
ground.position.y = -0.1
ground.receiveShadow = true
scene.add(ground)

const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 1 })
const treeCanopyMat = new THREE.MeshStandardMaterial({ color: 0x2a6020, roughness: 1 })
const burningTreeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1 })
const ashMat = new THREE.MeshStandardMaterial({ color: 0x2a2020, roughness: 1 })

// Create grid mesh placeholders
for (let y = 0; y < GRID; y++) {
  for (let x = 0; x < GRID; x++) {
    const idx = y * GRID + x
    const wx = (x - GRID/2) * CELL_SIZE
    const wz = (y - GRID/2) * CELL_SIZE

    // Seed with forest (dense in center, sparse at edges)
    const dist = Math.sqrt(wx*wx + wz*wz)
    const density = Math.max(0, 1 - dist / (GRID_WORLD * 0.45))
    grid[idx] = Math.random() < density * 0.85 ? 1 : 0

    const group = new THREE.Group()
    group.position.set(wx, 0, wz)
    scene.add(group)
    gridMeshes.push(group)
  }
}

function rebuildMesh(idx) {
  const x = idx % GRID
  const y = Math.floor(idx / GRID)
  const wx = (x - GRID/2) * CELL_SIZE
  const wz = (y - GRID/2) * CELL_SIZE
  const group = gridMeshes[idx]
  while (group.children.length) group.remove(group.children[0])

  const state = grid[idx]
  if (state === 1) {
    const height = 3 + Math.random() * 4
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, height, 6), treeTrunkMat)
    trunk.position.y = height/2
    trunk.castShadow = true
    group.add(trunk)
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 6), treeCanopyMat)
    canopy.position.y = height + 0.5
    canopy.castShadow = true
    group.add(canopy)
  } else if (state === 2) {
    const height = 3 + Math.random() * 3
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, height, 6), burningTreeMat)
    trunk.position.y = height/2
    group.add(trunk)
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 6), burningTreeMat.clone())
    canopy.material.emissiveIntensity = 0.5 + Math.random()
    canopy.position.y = height + 0.5
    group.add(canopy)
  } else if (state === 3) {
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.4, 6), ashMat)
    stump.position.y = 0.2
    group.add(stump)
  }
}

for (let i = 0; i < grid.length; i++) rebuildMesh(i)

// Ignite center
function ignite(x, y) {
  const idx = y * GRID + x
  if (grid[idx] === 1) {
    grid[idx] = 2
    rebuildMesh(idx)
  }
}

function toggleBurning(x, y) {
  const idx = y * GRID + x
  if (grid[idx] === 1) {
    grid[idx] = 2
  } else if (grid[idx] === 2) {
    grid[idx] = 1
  } else {
    return
  }
  rebuildMesh(idx)
}

// Click to ignite
window.addEventListener('click', e => {
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1
  ), camera)
  const hits = raycaster.intersectObjects(gridMeshes.flatMap(g => g.children), true)
  if (hits.length) {
    const group = hits[0].object.parent
    const idx = gridMeshes.indexOf(group)
    if (idx >= 0) {
      const gx = idx % GRID
      const gy = Math.floor(idx / GRID)
      toggleBurning(gx, gy)
    }
  }
})

// Fire spread rules
function spreadFire() {
  const newGrid = grid.slice()
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const idx = y * GRID + x
      if (grid[idx] === 2) {
        // Trees become ash after burning
        newGrid[idx] = 3
        // Spread to neighbors
        const windX = Math.sin(Date.now() * 0.0001) * 0.5
        const windZ = 0.3
        [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx, dy], i) => {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return
          if (grid[ny * GRID + nx] !== 1) return
          const factor = i < 4 ? 0.15 : 0.05
          const windBonus = dx * windX * 0.05 + dy * windZ * 0.05
          if (Math.random() < factor + windBonus) {
            newGrid[ny * GRID + nx] = 2
          }
        })
      }
    }
  }
  let changed = false
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== newGrid[i]) {
      grid[i] = newGrid[i]
      rebuildMesh(i)
      changed = true
    }
  }
}

let frame = 0
function animate() {
  requestAnimationFrame(animate)
  frame++
  if (frame % 8 === 0) spreadFire()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
