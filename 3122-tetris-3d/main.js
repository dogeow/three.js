// 3122. Tetris 3D
// 3D Tetris with rotation, line clearing, scoring, and levels
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const COLS = 10
const ROWS = 20
const COL_DEPTH = 10
const CELL = 1.0

const TETROMINOES = [
  { shape: [[1,1,1,1]], color: 0x00ffff },           // I
  { shape: [[1,1],[1,1]], color: 0xffff00 },         // O
  { shape: [[0,1,0],[1,1,1]], color: 0xa000ff },      // T
  { shape: [[1,0,0],[1,1,1]], color: 0x0000ff },      // J
  { shape: [[0,0,1],[1,1,1]], color: 0xff8800 },      // L
  { shape: [[0,1,1],[1,1,0]], color: 0x00ff00 },      // S
  { shape: [[1,1,0],[0,1,1]], color: 0xff0000 }       // Z
]

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
camera.position.set(COLS * CELL / 2, 12, 30)
camera.lookAt(COLS * CELL / 2, ROWS * CELL / 2 - 2, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.4, 0.8))

scene.add(new THREE.AmbientLight(0x334455, 0.5))
const light1 = new THREE.DirectionalLight(0xaabbff, 0.6)
light1.position.set(10, 30, 20)
scene.add(light1)
const light2 = new THREE.PointLight(0x00ffff, 0.5, 40)
light2.position.set(COLS * CELL / 2, 20, 10)
scene.add(light2)

// Board: 3D grid [z][y][x]
let board = []
let boardMeshes = []
let currentPiece = null
let currentMeshes = []
let score = 0
let level = 1
let linesCleared = 0
let gameOver = false
let dropTimer = 0
let dropInterval = 0.8
let ghostMeshes = []

function initBoard() {
  board = []
  boardMeshes = []
  for (let z = 0; z < COL_DEPTH; z++) {
    board[z] = []
    boardMeshes[z] = []
    for (let y = 0; y < ROWS; y++) {
      board[z][y] = []
      boardMeshes[z][y] = []
      for (let x = 0; x < COLS; x++) {
        board[z][y][x] = 0
        boardMeshes[z][y][x] = null
      }
    }
  }
}

const cubeGeo = new THREE.BoxGeometry(CELL * 0.92, CELL * 0.92, CELL * 0.92)
const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL * 0.94, CELL * 0.94, CELL * 0.94))

function createBlockMesh(color) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.2,
    roughness: 0.3,
    metalness: 0.4
  })
  const mesh = new THREE.Mesh(cubeGeo, mat)
  const edge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }))
  mesh.add(edge)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function removeMesh(m) {
  if (m && m.parent) m.parent.remove(m)
}

function clearMeshes(meshes) {
  meshes.forEach(m => removeMesh(m))
  meshes.length = 0
}

function worldPos(x, y, z) {
  return new THREE.Vector3(
    x * CELL - (COLS * CELL) / 2,
    y * CELL - (ROWS * CELL) / 2,
    z * CELL - (COL_DEPTH * CELL) / 2
  )
}

function spawnPiece() {
  const typeIdx = Math.floor(Math.random() * TETROMINOES.length)
  const type = TETROMINOES[typeIdx]
  const shape = type.shape.map(row => [...row])

  // Randomly rotate 3D-extended shape
  const rotations = Math.floor(Math.random() * 4)
  for (let r = 0; r < rotations; r++) {
    const h = shape.length
    const w = shape[0].length
    const rot = shape[0].map((_, ci) => shape.map(row => row[ci]).reverse())
    shape.length = 0
    shape.push(...rot)
  }

  // Center horizontally
  const offsetX = Math.floor((COLS - shape[0].length) / 2)
  const offsetZ = Math.floor((COL_DEPTH - shape.length) / 2)
  const offsetY = ROWS - shape.length

  currentPiece = {
    shape,
    color: type.color,
    x: offsetX,
    y: offsetY,
    z: offsetZ
  }

  if (!isValidPos(currentPiece)) {
    gameOver = true
  }
}

function isValidPos(piece) {
  for (let zi = 0; zi < piece.shape.length; zi++) {
    for (let yi = 0; yi < piece.shape[zi].length; yi++) {
      for (let xi = 0; xi < piece.shape[yi].length; xi++) {
        if (!piece.shape[zi][yi][xi]) continue
        const gx = piece.x + xi
        const gy = piece.y + yi
        const gz = piece.z + zi
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS || gz < 0 || gz >= COL_DEPTH) return false
        if (board[gz][gy][gx]) return false
      }
    }
  }
  return true
}

function lockPiece() {
  const p = currentPiece
  for (let zi = 0; zi < p.shape.length; zi++) {
    for (let yi = 0; yi < p.shape[zi].length; yi++) {
      for (let xi = 0; xi < p.shape[yi].length; xi++) {
        if (!p.shape[zi][yi][xi]) continue
        const gx = p.x + xi
        const gy = p.y + yi
        const gz = p.z + zi
        if (gy < 0) { gameOver = true; return }
        board[gz][gy][gx] = p.color
        const mesh = createBlockMesh(p.color)
        mesh.position.copy(worldPos(gx, gy, gz))
        scene.add(mesh)
        boardMeshes[gz][gy][gx] = mesh
      }
    }
  }
  clearMeshes(currentMeshes)
  clearLines()
  spawnPiece()
}

function clearLines() {
  const fullLayers = []
  for (let z = 0; z < COL_DEPTH; z++) {
    let full = true
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!board[z][y][x]) { full = false; break }
      }
      if (!full) break
    }
    if (full) fullLayers.push(z)
  }

  if (fullLayers.length === 0) return

  // Animate and remove
  fullLayers.forEach(z => {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const m = boardMeshes[z][y][x]
        if (m) {
          animateBlockPop(m)
          boardMeshes[z][y][x] = null
          board[z][y][x] = 0
        }
      }
    }
  })

  // Score
  const pts = [0, 100, 300, 500, 800][Math.min(fullLayers.length, 4)] * level
  score += pts
  linesCleared += fullLayers.length
  level = Math.floor(linesCleared / 10) + 1
  dropInterval = Math.max(0.1, 0.8 - level * 0.05)

  showClearEffect(fullLayers)
  setTimeout(() => compactLayers(fullLayers), 300)
}

function compactLayers(removedZ) {
  removedZ.forEach(z => {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        board[z][y][x] = 0
        if (boardMeshes[z][y][x]) { scene.remove(boardMeshes[z][y][x]); boardMeshes[z][y][x] = null }
      }
    }
  })
}

function animateBlockPop(mesh) {
  const start = Date.now()
  const dur = 200
  function anim() {
    const t = (Date.now() - start) / dur
    if (t >= 1) { scene.remove(mesh); return }
    mesh.scale.setScalar(1 + t * 3)
    mesh.material.opacity = 1 - t
    mesh.material.transparent = true
    requestAnimationFrame(anim)
  }
  anim()
}

function showClearEffect(layers) {
  layers.forEach(z => {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const pGeo = new THREE.SphereGeometry(0.2, 6, 6)
        const pMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true })
        const p = new THREE.Mesh(pGeo, pMat)
        p.position.copy(worldPos(x, y, z))
        scene.add(p)
        const start = Date.now()
        function anim() {
          const t = (Date.now() - start) / 400
          if (t >= 1) { scene.remove(p); return }
          p.position.y += 0.1
          p.scale.setScalar(1 + t * 4)
          p.material.opacity = 1 - t
          requestAnimationFrame(anim)
        }
        anim()
      }
    }
  })
}

function rotatePiece() {
  const p = currentPiece
  const h = p.shape.length
  const w = p.shape[0].length
  const d = p.shape[0][0].length

  // Rotate 90° around Y axis
  const rotated = []
  for (let yi = 0; yi < d; yi++) {
    rotated[yi] = []
    for (let zi = 0; zi < h; zi++) {
      rotated[yi][zi] = []
      for (let xi = 0; xi < w; xi++) {
        rotated[yi][zi][xi] = p.shape[h - 1 - zi][yi][xi]
      }
    }
  }

  const newPiece = { ...p, shape: rotated }
  if (isValidPos(newPiece)) {
    currentPiece = newPiece
  }
}

function movePiece(dx, dy, dz) {
  const np = { ...currentPiece, x: currentPiece.x + dx, y: currentPiece.y + dy, z: currentPiece.z + dz }
  if (isValidPos(np)) {
    currentPiece = np
    return true
  }
  return false
}

function hardDrop() {
  while (movePiece(0, -1, 0)) {}
  lockPiece()
}

function updateGhost() {
  clearMeshes(ghostMeshes)
  const ghost = { ...currentPiece }
  while (true) {
    const np = { ...ghost, y: ghost.y - 1 }
    if (!isValidPos(np)) break
    ghost.y = np.y
  }

  for (let zi = 0; zi < ghost.shape.length; zi++) {
    for (let yi = 0; yi < ghost.shape[zi].length; yi++) {
      for (let xi = 0; xi < ghost.shape[yi].length; xi++) {
        if (!ghost.shape[zi][yi][xi]) continue
        const gx = ghost.x + xi
        const gy = ghost.y + yi
        const gz = ghost.z + zi
        const ghostMesh = new THREE.Mesh(
          cubeGeo,
          new THREE.MeshBasicMaterial({ color: currentPiece.color, transparent: true, opacity: 0.15, wireframe: false })
        )
        const edge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: currentPiece.color }))
        ghostMesh.add(edge)
        ghostMesh.position.copy(worldPos(gx, gy, gz))
        scene.add(ghostMesh)
        ghostMeshes.push(ghostMesh)
      }
    }
  }
}

function updateCurrentMeshes() {
  clearMeshes(currentMeshes)
  if (!currentPiece) return

  for (let zi = 0; zi < currentPiece.shape.length; zi++) {
    for (let yi = 0; yi < currentPiece.shape[zi].length; yi++) {
      for (let xi = 0; xi < currentPiece.shape[yi].length; xi++) {
        if (!currentPiece.shape[zi][yi][xi]) continue
        const gx = currentPiece.x + xi
        const gy = currentPiece.y + yi
        const gz = currentPiece.z + zi
        const mesh = createBlockMesh(currentPiece.color)
        mesh.position.copy(worldPos(gx, gy, gz))
        scene.add(mesh)
        currentMeshes.push(mesh)
      }
    }
  }

  updateGhost()
}

// Board boundary visualization
const boardEdgeGeo = new THREE.BoxGeometry(COLS * CELL + 0.1, ROWS * CELL + 0.1, COL_DEPTH * CELL + 0.1)
const boardEdgeMat = new THREE.MeshBasicMaterial({ color: 0x334466, wireframe: true })
const boardEdge = new THREE.Mesh(boardEdgeGeo, boardEdgeMat)
boardEdge.position.set(0, 0, 0)
scene.add(boardEdge)

// Bottom plane
const bottomGeo = new THREE.PlaneGeometry(COLS * CELL, COL_DEPTH * CELL)
const bottomMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9 })
const bottom = new THREE.Mesh(bottomGeo, bottomMat)
bottom.rotation.x = -Math.PI / 2
bottom.position.y = -ROWS * CELL / 2 + 0.05
bottom.receiveShadow = true
scene.add(bottom)

// Back wall
const backGeo = new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL)
const backMat = new THREE.MeshStandardMaterial({ color: 0x111128, roughness: 0.9 })
const back = new THREE.Mesh(backGeo, backMat)
back.position.z = -COL_DEPTH * CELL / 2 - 0.05
back.receiveShadow = true
scene.add(back)

// UI
const uiDiv = document.createElement('div')
uiDiv.style.cssText = 'position:fixed;top:20px;right:20px;color:#fff;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.8);padding:16px;border-radius:8px;border:1px solid #334;min-width:180px;'
document.body.appendChild(uiDiv)

const scoreDiv = document.createElement('div')
scoreDiv.style.cssText = 'font-size:24px;font-weight:bold;color:#ffcc00;'
uiDiv.appendChild(scoreDiv)

const levelDiv = document.createElement('div')
levelDiv.style.cssText = 'font-size:16px;color:#aaa;margin-top:4px;'
uiDiv.appendChild(levelDiv)

const linesDiv = document.createElement('div')
linesDiv.style.cssText = 'font-size:13px;color:#888;margin-top:4px;'
uiDiv.appendChild(linesDiv)

const nextLabel = document.createElement('div')
nextLabel.textContent = 'NEXT:'
nextLabel.style.cssText = 'font-size:12px;color:#666;margin-top:12px;'
uiDiv.appendChild(nextLabel)

const nextDiv = document.createElement('div')
nextDiv.style.cssText = 'font-size:11px;color:#aaa;margin-top:4px;'
uiDiv.appendChild(nextDiv)

const helpDiv = document.createElement('div')
helpDiv.innerHTML = '← →: Move | ↑: Rotate | ↓: Soft Drop<br>Space: Hard Drop | R: Restart'
helpDiv.style.cssText = 'position:fixed;bottom:20px;left:20px;color:#666;font-family:monospace;font-size:11px;background:rgba(0,0,0,0.7);padding:10px;border-radius:6px;'
document.body.appendChild(helpDiv)

const gameOverDiv = document.createElement('div')
gameOverDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#ff4444;font-family:monospace;font-size:32px;font-weight:bold;text-align:center;display:none;'
gameOverDiv.innerHTML = 'GAME OVER<br><span style="font-size:16px;color:#fff">Press R to restart</span>'
document.body.appendChild(gameOverDiv)

// Controls
document.addEventListener('keydown', e => {
  if (gameOver) { if (e.key === 'KeyR') restart(); return }
  switch (e.key) {
    case 'ArrowLeft': movePiece(-1, 0, 0); break
    case 'ArrowRight': movePiece(1, 0, 0); break
    case 'ArrowDown': movePiece(0, -1, 0); break
    case 'ArrowUp': rotatePiece(); break
    case 'Space': hardDrop(); break
    case 'KeyR': restart(); break
  }
  updateCurrentMeshes()
})

function restart() {
  initBoard()
  for (let z = 0; z < COL_DEPTH; z++) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (boardMeshes[z][y][x]) { scene.remove(boardMeshes[z][y][x]); boardMeshes[z][y][x] = null }
      }
    }
  }
  clearMeshes(currentMeshes)
  clearMeshes(ghostMeshes)
  score = 0; level = 1; linesCleared = 0; gameOver = false; dropTimer = 0; dropInterval = 0.8
  gameOverDiv.style.display = 'none'
  spawnPiece()
  updateCurrentMeshes()
}

initBoard()
spawnPiece()
updateCurrentMeshes()

// Next piece preview
const nextPieceIdx = () => {
  const nextIdx = Math.floor(Math.random() * TETROMINOES.length)
  nextDiv.textContent = TETROMINOES.map((t, i) => {
    const names = ['I','O','T','J','L','S','Z']
    return `${names[i]}: ${t.color.toString(16)}`
  }).join(' | ')
}

// Animate
let last = 0
function animate(t = 0) {
  requestAnimationFrame(animate)
  const dt = Math.min((t - last) / 1000, 0.1)
  last = t

  if (!gameOver) {
    dropTimer += dt
    if (dropTimer >= dropInterval) {
      dropTimer = 0
      if (!movePiece(0, -1, 0)) {
        lockPiece()
      }
      updateCurrentMeshes()
    }
  }

  // Rotate current piece slowly
  currentMeshes.forEach(m => { m.rotation.y += 0.01 })

  scoreDiv.textContent = `Score: ${score}`
  levelDiv.textContent = `Level: ${level}`
  linesDiv.textContent = `Lines: ${linesCleared}`
  gameOverDiv.style.display = gameOver ? 'block' : 'none'

  composer.render()
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
