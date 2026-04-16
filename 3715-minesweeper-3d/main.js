// 3715. Minesweeper 3D
// 3D grid game with reveal/flood-fill and flag system
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const W = innerWidth, H = innerHeight
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(W, H)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)

const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
camera.position.set(0, 18, 14)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.2

scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const sun = new THREE.DirectionalLight(0xffffff, 0.8)
sun.position.set(5, 15, 5)
scene.add(sun)

// ── Game Config ───────────────────────────────────────────────────────────────
const ROWS = 8, COLS = 8, MINES = 10
const CELL = 2.2
const CELL_H = 0.5

const cellState = []  // 0=hidden, 1=revealed, 2=flagged, 3=mine-blown
const mineSet = new Set()
let gameOver = false, gameWon = false

function cellIndex(r, c) { return r * COLS + c }
function idxToRC(idx) { return [Math.floor(idx / COLS), idx % COLS] }

function placeMines() {
  mineSet.clear()
  while (mineSet.size < MINES) {
    const r = Math.floor(Math.random() * ROWS)
    const c = Math.floor(Math.random() * COLS)
    mineSet.add(cellIndex(r, c))
  }
}

function countAdjMines(r, c) {
  let count = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        if (mineSet.has(cellIndex(nr, nc))) count++
      }
    }
  }
  return count
}

// ── Build Grid ───────────────────────────────────────────────────────────────
const cells = []
const cellGroup = new THREE.Group()
scene.add(cellGroup)

const NUM_COLORS = { 1: 0x4488ff, 2: 0x22aa22, 3: 0xff3333, 4: 0x884488, 5: 0x882200, 6: 0x008888, 7: 0x222222, 8: 0x888888 }
const hiddenMat = new THREE.MeshStandardMaterial({ color: 0x5566aa, roughness: 0.7 })
const revealedMat = new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.9 })
const mineMat = new THREE.MeshStandardMaterial({ color: 0xff2222, roughness: 0.4 })
const flagMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 })

for (let r = 0; r < ROWS; r++) {
  cells[r] = []
  for (let c = 0; c < COLS; c++) {
    const geo = new THREE.BoxGeometry(CELL - 0.1, CELL_H, CELL - 0.1)
    const mesh = new THREE.Mesh(geo, hiddenMat.clone())
    const wx = (c - COLS / 2 + 0.5) * CELL
    const wz = (r - ROWS / 2 + 0.5) * CELL
    mesh.position.set(wx, 0, wz)
    cellGroup.add(mesh)
    cells[r][c] = { mesh, state: 0 }
    cellState.push(0)
  }
}

// Number labels
const labelSprites = []
function makeTextSprite(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'transparent'
  ctx.fillRect(0, 0, 128, 128)
  ctx.font = 'bold 80px Arial'
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 64)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(1.5, 1.5, 1)
  return sprite
}

// Flag visual
const flagGeoms = []
function addFlag(r, c) {
  const [wx, wz] = [(c - COLS / 2 + 0.5) * CELL, (r - ROWS / 2 + 0.5) * CELL]
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
  )
  pole.position.set(wx, 0.6, wz)
  cellGroup.add(pole)
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xff4444, side: THREE.DoubleSide })
  )
  flag.position.set(wx + 0.35, 1.1, wz)
  cellGroup.add(flag)
  flagGeoms.push(pole, flag)
}

function removeFlags() {
  flagGeoms.forEach(m => cellGroup.remove(m))
  flagGeoms.length = 0
}

function updateMinesLeft() {
  let flagged = 0
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (cells[r][c].state === 2) flagged++
  document.getElementById('mines-left').textContent = `Mines: ${MINES - flagged} left`
}

function reveal(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return
  const cell = cells[r][c]
  if (cell.state !== 0) return
  const idx = cellIndex(r, c)

  if (mineSet.has(idx)) {
    // Hit a mine!
    cell.state = 3
    cell.mesh.material = mineMat.clone()
    cell.mesh.material.color.setHex(0xff0000)
    gameOver = true
    revealAllMines()
    return
  }

  cell.state = 1
  cell.mesh.material = revealedMat.clone()
  const count = countAdjMines(r, c)
  if (count > 0) {
    const sprite = makeTextSprite(count.toString(), NUM_COLORS[count] || 0xffffff)
    sprite.position.set(
      (c - COLS / 2 + 0.5) * CELL,
      CELL_H / 2 + 0.8,
      (r - ROWS / 2 + 0.5) * CELL
    )
    cellGroup.add(sprite)
    labelSprites.push(sprite)
  } else {
    // Flood fill
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if (!(dr === 0 && dc === 0)) reveal(r + dr, c + dc)
  }
}

function revealAllMines() {
  for (const idx of mineSet) {
    const [r, c] = idxToRC(idx)
    const cell = cells[r][c]
    if (cell.state !== 2) {
      cell.state = 3
      cell.mesh.material = mineMat.clone()
      const [wx, wz] = [(c - COLS / 2 + 0.5) * CELL, (r - ROWS / 2 + 0.5) * CELL]
      const sprite = makeTextSprite('💣', 0xff2222)
      sprite.position.set(wx, CELL_H / 2 + 1, wz)
      cellGroup.add(sprite)
      labelSprites.push(sprite)
    }
  }
}

function checkWin() {
  let revealed = 0
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (cells[r][c].state === 1) revealed++
  if (revealed === ROWS * COLS - MINES) {
    gameWon = true
  }
}

function resetGame() {
  gameOver = false; gameWon = false
  labelSprites.forEach(s => cellGroup.remove(s)); labelSprites.length = 0
  removeFlags()
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      cells[r][c].state = 0
      cells[r][c].mesh.material = hiddenMat.clone()
      cells[r][c].mesh.visible = true
    }
  placeMines()
  updateMinesLeft()
}
resetGame()

// ── Raycasting ───────────────────────────────────────────────────────────────
const ray = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredCell = null

window.addEventListener('mousemove', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  ray.setFromCamera(mouse, camera)
  const hits = ray.intersectObjects(cellGroup.children.filter(m => m.isMesh))
  hoveredCell = null
  hits.forEach(h => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (cells[r][c].mesh === h.object) {
          hoveredCell = [r, c]
          return
        }
      }
    }
  })
})

window.addEventListener('mousedown', e => {
  if (!hoveredCell) return
  const [r, c] = hoveredCell
  if (gameOver || gameWon) return

  if (e.button === 0) {
    // Left click: reveal
    if (cells[r][c].state === 0) {
      reveal(r, c)
      checkWin()
    }
  } else if (e.button === 2) {
    // Right click: toggle flag
    if (cells[r][c].state === 0) {
      cells[r][c].state = 2
      cells[r][c].mesh.material = flagMat.clone()
      addFlag(r, c)
    } else if (cells[r][c].state === 2) {
      cells[r][c].state = 0
      cells[r][c].mesh.material = hiddenMat.clone()
      // Remove last 2 flag meshes
      cellGroup.remove(flagGeoms.pop())
      cellGroup.remove(flagGeoms.pop())
    }
    updateMinesLeft()
  }
})

window.addEventListener('contextmenu', e => e.preventDefault())

window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') resetGame()
})

let t = 0
function animate() {
  requestAnimationFrame(animate); t++
  controls.update()

  // Hover highlight
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cells[r][c]
      if (cell.state === 0) {
        const isHover = hoveredCell && hoveredCell[0] === r && hoveredCell[1] === c
        cell.mesh.material.color.setHex(isHover ? 0x7788cc : 0x5566aa)
      }
    }
  }

  // Gentle bounce on revealed cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cells[r][c]
      if (cell.state === 1 || cell.state === 3) {
        const count = countAdjMines(r, c)
        if (count > 0) {
          const sprite = labelSprites.find(s => {
            const wx = (c - COLS / 2 + 0.5) * CELL
            const wz = (r - ROWS / 2 + 0.5) * CELL
            return Math.abs(s.position.x - wx) < 0.5 && Math.abs(s.position.z - wz) < 0.5
          })
          if (sprite) {
            sprite.position.y = CELL_H / 2 + 0.8 + Math.sin(t * 0.05 + r * c) * 0.05
          }
        }
      }
    }
  }

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
