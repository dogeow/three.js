// 3120. Procedural Dungeon Generator
// BSP (Binary Space Partitioning) room generation with corridors
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080810)
scene.fog = new THREE.FogExp2(0x080810, 0.015)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 60, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.4, 0.8))

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.1

// Lights
scene.add(new THREE.AmbientLight(0x112233, 0.5))
const torchLight1 = new THREE.PointLight(0xff6600, 2, 15)
torchLight1.position.set(-5, 3, -5)
scene.add(torchLight1)
const torchLight2 = new THREE.PointLight(0xff6600, 2, 15)
torchLight2.position.set(15, 3, 15)
scene.add(torchLight2)

const torchGeo = new THREE.SphereGeometry(0.15, 8, 8)
const torchMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 2 })

function createTorch(x, z) {
  const light = new THREE.PointLight(0xff6600, 1.5, 12)
  light.position.set(x, 2.5, z)
  scene.add(light)
  const flame = new THREE.Mesh(torchGeo, torchMat.clone())
  flame.position.set(x, 2.5, z)
  scene.add(flame)
  return { light, flame }
}

// Ground
const groundGeo = new THREE.PlaneGeometry(100, 100)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Dungeon parameters
const MAP_W = 60
const MAP_H = 60
const CELL = 2
const MIN_ROOM = 5
const MAX_ROOM = 14

let map = []
let rooms = []
let corridorSegments = []
let torches = []
let dungeonMeshes = []
let playerMesh = null

// BSP Node
class BSPNode {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h
    this.left = null; this.right = null
    this.room = null
  }

  split() {
    if (this.left || this.right) return false

    const splitH = Math.random() > 0.5
    const max = (splitH ? this.h : this.w) - MIN_ROOM
    if (max <= MIN_ROOM) return false

    const split = Math.floor(Math.random() * (max - MIN_ROOM)) + MIN_ROOM

    if (splitH) {
      this.left = new BSPNode(this.x, this.y, this.w, split)
      this.right = new BSPNode(this.x, this.y + split, this.w, this.h - split)
    } else {
      this.left = new BSPNode(this.x, this.y, split, this.h)
      this.right = new BSPNode(this.x + split, this.y, this.w - split, this.h)
    }
    return true
  }

  createRooms() {
    if (this.left || this.right) {
      if (this.left) this.left.createRooms()
      if (this.right) this.right.createRooms()
    } else {
      const rw = Math.floor(Math.random() * (MAX_ROOM - MIN_ROOM)) + MIN_ROOM
      const rh = Math.floor(Math.random() * (MAX_ROOM - MIN_ROOM)) + MIN_ROOM
      const rx = this.x + Math.floor(Math.random() * (this.w - rw - 1)) + 1
      const ry = this.y + Math.floor(Math.random() * (this.h - rh - 1)) + 1
      this.room = { x: rx, y: ry, w: rw, h: rh }
      rooms.push(this.room)
    }
  }

  getRoom() {
    if (this.room) return this.room
    const l = this.left ? this.left.getRoom() : null
    const r = this.right ? this.right.getRoom() : null
    if (!l && !r) return null
    if (!l) return r
    if (!r) return l
    return Math.random() > 0.5 ? l : r
  }

  connectRooms() {
    if (!this.left || !this.right) return
    this.left.connectRooms()
    this.right.connectRooms()

    const rl = this.left.getRoom()
    const rr = this.right.getRoom()
    if (!rl || !rr) return

    const px = Math.floor(rl.x + rl.w / 2)
    const py = Math.floor(rl.y + rl.h / 2)
    const qx = Math.floor(rr.x + rr.w / 2)
    const qy = Math.floor(rr.y + rr.h / 2)

    if (Math.random() > 0.5) {
      carveHCorridor(px, qx, py)
      carveVCorridor(py, qy, qx)
    } else {
      carveVCorridor(py, qy, px)
      carveHCorridor(px, qx, qy)
    }
  }
}

function initMap() {
  map = []
  for (let y = 0; y < MAP_H; y++) {
    map[y] = []
    for (let x = 0; x < MAP_W; x++) {
      map[y][x] = 1 // Wall
    }
  }
}

function carveRoom(r) {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
        map[y][x] = 0
      }
    }
  }
}

function carveHCorridor(x1, x2, y) {
  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  for (let x = minX; x <= maxX; x++) {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
      map[y][x] = 0
      corridorSegments.push({ x, y })
    }
  }
}

function carveVCorridor(y1, y2, x) {
  const minY = Math.min(y1, y2)
  const maxY = Math.max(y1, y2)
  for (let y = minY; y <= maxY; y++) {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
      map[y][x] = 0
      corridorSegments.push({ x, y })
    }
  }
}

function buildDungeon() {
  // Clear
  dungeonMeshes.forEach(m => scene.remove(m))
  dungeonMeshes = []
  rooms = []
  corridorSegments = []
  torches.forEach(t => { scene.remove(t.light); scene.remove(t.flame) })
  torches = []

  initMap()

  // BSP
  const root = new BSPNode(1, 1, MAP_W - 2, MAP_H - 2)
  const nodes = [root]

  // Split 4-6 times
  for (let i = 0; i < 5; i++) {
    const next = []
    nodes.forEach(n => {
      if (n.split()) { next.push(n.left); next.push(n.right) }
      else next.push(n)
    })
    nodes.length = 0
    nodes.push(...next)
  }

  root.createRooms()

  // Carve rooms
  rooms.forEach(r => carveRoom(r))

  // Connect
  root.connectRooms()

  // Build 3D meshes
  const wallGeo = new THREE.BoxGeometry(CELL, 5, CELL)
  const floorGeo = new THREE.BoxGeometry(CELL, 0.2, CELL)
  const ceilGeo = new THREE.BoxGeometry(CELL, 0.5, CELL)

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, roughness: 0.9 })
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x333348, roughness: 0.8 })
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 1.0 })

  const wallInst = []
  const floorInst = []

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const wx = x * CELL - (MAP_W * CELL) / 2
      const wz = y * CELL - (MAP_H * CELL) / 2

      if (map[y][x] === 1) {
        // Check if adjacent to floor
        const adj = (y > 0 && map[y-1][x] === 0) || (y < MAP_H-1 && map[y+1][x] === 0) ||
                    (x > 0 && map[y][x-1] === 0) || (x < MAP_W-1 && map[y][x+1] === 0)
        if (adj) {
          const wall = new THREE.Mesh(wallGeo, wallMat)
          wall.position.set(wx, 2.5, wz)
          wall.castShadow = true
          wall.receiveShadow = true
          scene.add(wall)
          dungeonMeshes.push(wall)
        }
      } else {
        const floor = new THREE.Mesh(floorGeo, floorMat)
        floor.position.set(wx, 0, wz)
        floor.receiveShadow = true
        scene.add(floor)
        dungeonMeshes.push(floor)
      }
    }
  }

  // Ceiling
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] === 0) {
        const wx = x * CELL - (MAP_W * CELL) / 2
        const wz = y * CELL - (MAP_H * CELL) / 2
        const ceil = new THREE.Mesh(ceilGeo, ceilMat)
        ceil.position.set(wx, 5.5, wz)
        scene.add(ceil)
        dungeonMeshes.push(ceil)
      }
    }
  }

  // Add torches in rooms
  rooms.forEach(r => {
    const corners = [
      { x: r.x + 1, y: r.y + 1 },
      { x: r.x + r.w - 2, y: r.y + 1 },
      { x: r.x + 1, y: r.y + r.h - 2 },
      { x: r.x + r.w - 2, y: r.y + r.h - 2 }
    ]
    const torchCorner = corners[Math.floor(Math.random() * corners.length)]
    const tx = torchCorner.x * CELL - (MAP_W * CELL) / 2
    const tz = torchCorner.y * CELL - (MAP_H * CELL) / 2
    torches.push(createTorch(tx, tz))

    // Torch on wall
    const bracketGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6)
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x444444 })
    const bracket = new THREE.Mesh(bracketGeo, bracketMat)
    bracket.rotation.z = Math.PI / 2
    bracket.position.set(tx + 0.5, 2.5, tz)
    scene.add(bracket)
    dungeonMeshes.push(bracket)
  })

  // Player marker
  if (rooms.length > 0) {
    const startRoom = rooms[0]
    const px = (startRoom.x + startRoom.w / 2) * CELL - (MAP_W * CELL) / 2
    const pz = (startRoom.y + startRoom.h / 2) * CELL - (MAP_H * CELL) / 2
    if (!playerMesh) {
      const pGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 16)
      const pMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 })
      playerMesh = new THREE.Mesh(pGeo, pMat)
      scene.add(playerMesh)
    }
    playerMesh.position.set(px, 0.75, pz)
    camera.position.set(px, 40, pz + 20)
    controls.target.set(px, 0, pz)
  }
}

// UI
const uiDiv = document.createElement('div')
uiDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#fff;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.75);padding:14px;border-radius:8px;border:1px solid #334;min-width:200px;'
document.body.appendChild(uiDiv)

const title = document.createElement('div')
title.style.cssText = 'font-size:15px;font-weight:bold;color:#ffcc00;margin-bottom:10px;'
title.textContent = '🏰 Procedural Dungeon'
uiDiv.appendChild(title)

const statsDiv = document.createElement('div')
statsDiv.style.cssText = 'font-size:11px;color:#aaa;margin-top:6px;'
uiDiv.appendChild(statsDiv)

const genBtn = document.createElement('button')
genBtn.textContent = '🎲 Generate New Dungeon'
genBtn.style.cssText = 'margin-top:10px;padding:8px 14px;background:#223344;border:1px solid #446688;color:#fff;font-family:monospace;font-size:12px;cursor:pointer;border-radius:6px;width:100%;'
genBtn.onclick = buildDungeon
uiDiv.appendChild(genBtn)

const legendDiv = document.createElement('div')
legendDiv.style.cssText = 'position:fixed;bottom:20px;left:20px;color:#666;font-family:monospace;font-size:11px;'
legendDiv.innerHTML = 'Orbit: drag to rotate | Scroll to zoom'
document.body.appendChild(legendDiv)

// Build first dungeon
buildDungeon()

// Animate
let last = 0
function animate(t = 0) {
  requestAnimationFrame(animate)
  const dt = (t - last) / 1000
  last = t

  // Animate torches
  torches.forEach((torch, i) => {
    torch.light.intensity = 1.5 + Math.sin(t * 0.005 + i * 1.3) * 0.3
    torch.flame.scale.setScalar(1 + Math.sin(t * 0.01 + i * 2) * 0.15)
  })

  // Player bob
  if (playerMesh) {
    playerMesh.position.y = 0.75 + Math.sin(t * 0.003) * 0.05
  }

  statsDiv.innerHTML = `Rooms: ${rooms.length} | Size: ${MAP_W}×${MAP_H} | Cells: ${MAP_W * MAP_H}`
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
