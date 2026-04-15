// 3003. Turnbased Tactics Grid
// Turnbased Tactics Grid
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 20, 20)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.2

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dirLight = new THREE.DirectionalLight(0xfff0dd, 1)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

// Grid setup
const GRID_SIZE = 8
const CELL_SIZE = 2

// Tile types
const TILE_EMPTY = 0
const TILE_WALL = 1
const TILE_SELECTED = 2
const TILE_MOVE_RANGE = 3
const TILE_ATTACK_RANGE = 4

// Map
const tileMap = [
  [0,0,0,0,1,0,0,0],
  [0,1,0,0,1,0,1,0],
  [0,0,0,0,0,0,0,0],
  [0,0,1,0,0,1,0,0],
  [0,0,0,0,1,0,0,0],
  [0,1,0,0,0,0,1,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0],
]

// Create grid tiles
const tiles = []
const tileGeo = new THREE.BoxGeometry(CELL_SIZE - 0.05, 0.3, CELL_SIZE - 0.05)
const tileMats = {
  [TILE_EMPTY]: new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 }),
  [TILE_WALL]: new THREE.MeshStandardMaterial({ color: 0x4a4a6a, roughness: 0.5, metalness: 0.2 }),
  [TILE_SELECTED]: new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.5, emissive: 0x224488, emissiveIntensity: 0.5 }),
  [TILE_MOVE_RANGE]: new THREE.MeshStandardMaterial({ color: 0x225522, roughness: 0.6, emissive: 0x113311, emissiveIntensity: 0.3 }),
  [TILE_ATTACK_RANGE]: new THREE.MeshStandardMaterial({ color: 0x552222, roughness: 0.6, emissive: 0x331111, emissiveIntensity: 0.3 }),
}

for (let z = 0; z < GRID_SIZE; z++) {
  tiles[z] = []
  for (let x = 0; x < GRID_SIZE; x++) {
    const type = tileMap[z][x]
    const mesh = new THREE.Mesh(tileGeo, tileMats[type].clone())
    mesh.position.set(
      (x - GRID_SIZE / 2 + 0.5) * CELL_SIZE,
      0.15,
      (z - GRID_SIZE / 2 + 0.5) * CELL_SIZE
    )
    mesh.receiveShadow = true
    scene.add(mesh)
    tiles[z][x] = { mesh, type, x, z }
  }
}

// Characters
class Character {
  constructor(x, z, color, name, maxHp, atk, moveRange, atkRange) {
    this.x = x
    this.z = z
    this.maxHp = maxHp
    this.hp = maxHp
    this.atk = atk
    this.moveRange = moveRange
    this.atkRange = atkRange
    this.name = name
    this.hasMoved = false
    this.hasAttacked = false
    this.alive = true

    const group = new THREE.Group()
    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8)
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.6
    body.castShadow = true
    group.add(body)
    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 8, 8)
    const head = new THREE.Mesh(headGeo, bodyMat)
    head.position.y = 1.4
    head.castShadow = true
    group.add(head)
    // HP bar
    const hpBarGeo = new THREE.PlaneGeometry(1, 0.15)
    const hpBarMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
    this.hpBar = new THREE.Mesh(hpBarGeo, hpBarMat)
    this.hpBar.position.set(0, 2, 0)
    this.hpBar.rotation.x = -0.3
    group.add(this.hpBar)

    group.position.set(
      (x - GRID_SIZE / 2 + 0.5) * CELL_SIZE,
      0,
      (z - GRID_SIZE / 2 + 0.5) * CELL_SIZE
    )
    scene.add(group)
    this.mesh = group
    this.color = color
  }

  setTile(x, z) {
    this.x = x
    this.z = z
    this.mesh.position.set(
      (x - GRID_SIZE / 2 + 0.5) * CELL_SIZE,
      0,
      (z - GRID_SIZE / 2 + 0.5) * CELL_SIZE
    )
  }

  updateHpBar() {
    const ratio = this.hp / this.maxHp
    this.hpBar.scale.x = ratio
    this.hpBar.material.color.setHSL(ratio * 0.33, 1, 0.5)
  }

  takeDamage(dmg) {
    this.hp -= dmg
    if (this.hp < 0) this.hp = 0
    this.updateHpBar()
    if (this.hp <= 0) {
      this.alive = false
      this.mesh.visible = false
    }
  }
}

// Create teams
const teamBlue = [
  new Character(0, 0, 0x3498db, 'Knight', 100, 30, 3, 1),
  new Character(2, 0, 0x3498db, 'Archer', 60, 40, 2, 3),
  new Character(0, 2, 0x3498db, 'Mage', 50, 50, 2, 2),
]
const teamRed = [
  new Character(7, 7, 0xe74c3c, 'Orc', 120, 25, 2, 1),
  new Character(5, 7, 0xe74c3c, 'Wolf', 70, 35, 4, 1),
  new Character(7, 5, 0xe74c3c, 'Shaman', 45, 55, 2, 2),
]

const allChars = [...teamBlue, ...teamRed]

// Game state
let currentTeam = 'blue'
let selectedChar = null
let gamePhase = 'select' // 'select', 'move', 'attack'
let turnCount = 1

// Pathfinding (BFS for movement)
function getMoveRange(char) {
  const range = []
  const visited = new Set()
  const queue = [{ x: char.x, z: char.z, dist: 0 }]
  visited.add(`${char.x},${char.z}`)
  while (queue.length > 0) {
    const { x, z, dist } = queue.shift()
    if (dist > 0 && tileMap[z][x] === TILE_EMPTY && !getCharAt(x, z)) {
      range.push({ x, z })
    }
    if (dist < char.moveRange) {
      for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, nz = z + dz
        if (nx >= 0 && nx < GRID_SIZE && nz >= 0 && nz < GRID_SIZE &&
            tileMap[nz][nx] === TILE_EMPTY && !visited.has(`${nx},${nz}`)) {
          visited.add(`${nx},${nz}`)
          queue.push({ x: nx, z: nz, dist: dist + 1 })
        }
      }
    }
  }
  return range
}

function getAttackRange(char, tx, tz) {
  // Manhattan distance from target
  const dist = Math.abs(char.x - tx) + Math.abs(char.z - tz)
  return dist <= char.atkRange
}

function getCharAt(x, z) {
  return allChars.find(c => c.alive && c.x === x && c.z === z)
}

function highlightTiles(tileList, type) {
  clearHighlights()
  for (const { x, z } of tileList) {
    tiles[z][x].mesh.material = tileMats[type].clone()
    tiles[z][x].mesh.material.emissive = tileMats[type].emissive
    tiles[z][x].mesh.material.emissiveIntensity = tileMats[type].emissiveIntensity
    tiles[z][x].type = type
  }
}

function clearHighlights() {
  for (let z = 0; z < GRID_SIZE; z++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const t = tiles[z][x]
      t.mesh.material = tileMats[t.tileMap !== undefined ? t.tileMap : TILE_EMPTY].clone()
      t.type = t.tileMap !== undefined ? t.tileMap : TILE_EMPTY
    }
  }
  // Restore wall types
  for (let z = 0; z < GRID_SIZE; z++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (tileMap[z][x] === TILE_WALL) {
        tiles[z][x].mesh.material = tileMats[TILE_WALL].clone()
        tiles[z][x].type = TILE_WALL
      }
    }
  }
}

// Raycaster for click picking
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

function getGridPos(event) {
  mouse.x = (event.clientX / innerWidth) * 2 - 1
  mouse.y = -(event.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const meshes = []
  for (let z = 0; z < GRID_SIZE; z++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      meshes.push(tiles[z][x].mesh)
    }
  }
  const hits = raycaster.intersectObjects(meshes)
  if (hits.length > 0) {
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (tiles[z][x].mesh === hits[0].object) return { x, z }
      }
    }
  }
  return null
}

window.addEventListener('click', e => {
  const pos = getGridPos(e)
  if (!pos) return

  const clickedChar = getCharAt(pos.x, pos.z)

  if (gamePhase === 'select') {
    const team = currentTeam === 'blue' ? teamBlue : teamRed
    const char = team.find(c => c.alive && c.x === pos.x && c.z === pos.z)
    if (char && !char.hasMoved) {
      selectedChar = char
      gamePhase = 'move'
      const range = getMoveRange(char)
      highlightTiles([{ x: char.x, z: char.z }], TILE_SELECTED)
      highlightTiles(range, TILE_MOVE_RANGE)
    }
  } else if (gamePhase === 'move') {
    const moveRange = getMoveRange(selectedChar)
    const canMove = moveRange.find(r => r.x === pos.x && r.z === pos.z)
    const targetChar = getCharAt(pos.x, pos.z)

    if (canMove) {
      selectedChar.setTile(pos.x, pos.z)
      selectedChar.hasMoved = true
      clearHighlights()
      gamePhase = 'attack'
      // Show attack range
      const enemyTeam = currentTeam === 'blue' ? teamRed : teamBlue
      for (const enemy of enemyTeam) {
        if (enemy.alive && getAttackRange(selectedChar, enemy.x, enemy.z)) {
          tiles[enemy.z][enemy.x].mesh.material = tileMats[TILE_ATTACK_RANGE].clone()
          tiles[enemy.z][enemy.x].type = TILE_ATTACK_RANGE
        }
      }
    } else if (clickedChar && clickedChar === selectedChar) {
      // Click same char again to go to attack phase
      gamePhase = 'attack'
      const enemyTeam = currentTeam === 'blue' ? teamRed : teamRed
      for (const enemy of enemyTeam) {
        if (enemy.alive && getAttackRange(selectedChar, enemy.x, enemy.z)) {
          tiles[enemy.z][enemy.x].mesh.material = tileMats[TILE_ATTACK_RANGE].clone()
          tiles[enemy.z][enemy.x].type = TILE_ATTACK_RANGE
        }
      }
    } else {
      clearHighlights()
      selectedChar = null
      gamePhase = 'select'
    }
  } else if (gamePhase === 'attack') {
    const enemyTeam = currentTeam === 'blue' ? teamRed : teamBlue
    const target = enemyTeam.find(e => e.alive && e.x === pos.x && e.z === pos.z)
    if (target && getAttackRange(selectedChar, pos.x, pos.z)) {
      target.takeDamage(selectedChar.atk)
      selectedChar.hasAttacked = true
      logDiv.textContent = `${selectedChar.name} deals ${selectedChar.atk} dmg to ${target.name}!`
    }
    clearHighlights()
    selectedChar = null

    // End turn if all units have acted
    const team = currentTeam === 'blue' ? teamBlue : teamRed
    const allActed = team.filter(c => c.alive).every(c => c.hasMoved && c.hasAttacked)
    if (allActed) {
      currentTeam = currentTeam === 'blue' ? 'red' : 'blue'
      turnCount++
      for (const c of allChars) { c.hasMoved = false; c.hasAttacked = false }
      logDiv.textContent = `=== Turn ${turnCount}: ${currentTeam === 'blue' ? 'Blue' : 'Red'} Team ===`
      gamePhase = 'select'
    } else {
      gamePhase = 'select'
    }
  }
})

// Hover highlight
const highlightMesh = new THREE.Mesh(
  new THREE.BoxGeometry(CELL_SIZE - 0.1, 0.35, CELL_SIZE - 0.1),
  new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.3 })
)
highlightMesh.visible = false
scene.add(highlightMesh)

window.addEventListener('mousemove', e => {
  const pos = getGridPos(e)
  if (pos) {
    highlightMesh.visible = true
    highlightMesh.position.set(
      (pos.x - GRID_SIZE / 2 + 0.5) * CELL_SIZE,
      0.2,
      (pos.z - GRID_SIZE / 2 + 0.5) * CELL_SIZE
    )
  } else {
    highlightMesh.visible = false
  }
})

// UI
const logDiv = document.createElement('div')
logDiv.style.cssText = 'position:fixed;bottom:20px;left:20px;color:#fff;font:14px monospace;background:rgba(0,0,0,0.7);padding:10px;border-radius:4px;min-width:300px'
logDiv.textContent = 'Click a unit to select | Blue Team\'s turn'
document.body.appendChild(logDiv)

const statusDiv = document.createElement('div')
statusDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#fff;font:bold 16px monospace;background:rgba(0,0,0,0.7);padding:10px;border-radius:4px'
statusDiv.innerHTML = 'Turn-Based Tactics<br>Blue: Knight/Archer/Mage | Red: Orc/Wolf/Shaman'
document.body.appendChild(statusDiv)

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
