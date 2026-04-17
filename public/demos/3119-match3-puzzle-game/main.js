// 3119. Match-3 Puzzle Game
// Classic match-3 with gems, cascading, scoring, and combo system
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const ROWS = 8
const COLS = 8
const CELL = 1.1
const TYPES = 6
const COLORS = [0xff4444, 0x44ff44, 0x4488ff, 0xffff44, 0xff44ff, 0x44ffff]

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1e)

const camera = new THREE.OrthographicCamera(
  -(COLS * CELL) / 2 - 1, (COLS * CELL) / 2 + 1,
  (ROWS * CELL) / 2 + 1, -(ROWS * CELL) / 2 - 1,
  0.1, 100
)
camera.position.set(0, 20, 0)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.4, 0.7)
composer.addPass(bloom)

scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const light = new THREE.DirectionalLight(0xffffff, 0.5)
light.position.set(5, 10, 5)
scene.add(light)
const pl = new THREE.PointLight(0xffffff, 0.3, 30)
pl.position.set(0, 5, 0)
scene.add(pl)

// Background plane
const bgGeo = new THREE.PlaneGeometry(COLS * CELL + 2, ROWS * CELL + 2)
const bgMat = new THREE.MeshStandardMaterial({ color: 0x111128, roughness: 0.8 })
const bgPlane = new THREE.Mesh(bgGeo, bgMat)
bgPlane.position.y = -0.3
bgPlane.rotation.x = -Math.PI / 2
scene.add(bgPlane)

// Border frame
const frameGeo = new THREE.PlaneGeometry(COLS * CELL + 2.5, ROWS * CELL + 2.5)
const frameMat = new THREE.MeshBasicMaterial({ color: 0x223344 })
const frame = new THREE.Mesh(frameGeo, frameMat)
frame.position.y = -0.35
frame.rotation.x = -Math.PI / 2
scene.add(frame)

// Grid lines
for (let i = 0; i <= COLS; i++) {
  const x = i * CELL - (COLS * CELL) / 2
  const lineGeo = new THREE.PlaneGeometry(0.02, ROWS * CELL)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x223355, transparent: true, opacity: 0.3 })
  const line = new THREE.Mesh(lineGeo, lineMat)
  line.position.set(x - CELL / 2, -0.2, 0)
  line.rotation.x = -Math.PI / 2
  scene.add(line)
}
for (let i = 0; i <= ROWS; i++) {
  const z = i * CELL - (ROWS * CELL) / 2
  const lineGeo = new THREE.PlaneGeometry(COLS * CELL, 0.02)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x223355, transparent: true, opacity: 0.3 })
  const line = new THREE.Mesh(lineGeo, lineMat)
  line.position.set(0, -0.2, z - CELL / 2)
  line.rotation.x = -Math.PI / 2
  scene.add(line)
}

// Gem types
const gemShapes = [
  new THREE.OctahedronGeometry(0.4, 0),
  new THREE.TetrahedronGeometry(0.45, 0),
  new THREE.IcosahedronGeometry(0.38, 0),
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
  new THREE.ConeGeometry(0.35, 0.6, 6),
  new THREE.DodecahedronGeometry(0.36, 0)
]

// Board state
let board = []
let selected = null
let gems = []
let score = 0
let combo = 0
let moves = 30
let isAnimating = false
let selectedMesh = null

function createGem(type, col, row) {
  const geo = gemShapes[type]
  const mat = new THREE.MeshStandardMaterial({
    color: COLORS[type],
    emissive: COLORS[type],
    emissiveIntensity: 0.2,
    roughness: 0.2,
    metalness: 0.5
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(
    col * CELL - (COLS * CELL) / 2 + CELL / 2,
    0,
    row * CELL - (ROWS * CELL) / 2 + CELL / 2
  )
  mesh.castShadow = true
  mesh.userData = { type, col, row, targetY: 0, animY: 0, scale: 1, vy: 0 }
  scene.add(mesh)
  return mesh
}

function initBoard() {
  board = []
  gems.forEach(g => scene.remove(g))
  gems = []
  for (let row = 0; row < ROWS; row++) {
    board[row] = []
    for (let col = 0; col < COLS; col++) {
      let type
      do {
        type = Math.floor(Math.random() * TYPES)
      } while (
        (col >= 2 && board[row][col - 1] === type && board[row][col - 2] === type) ||
        (row >= 2 && board[row - 1][col] === type && board[row - 2][col] === type)
      )
      board[row][col] = type
      const gem = createGem(type, col, row)
      gem.userData.animY = -(row + 1) * CELL
      gem.position.y = gem.userData.animY
      gem.userData.targetY = 0
      gems.push(gem)
    }
  }
}

function getGem(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
  return gems.find(g => g.userData.col === col && g.userData.row === row)
}

function worldPos(col, row) {
  return new THREE.Vector3(
    col * CELL - (COLS * CELL) / 2 + CELL / 2,
    0,
    row * CELL - (ROWS * CELL) / 2 + CELL / 2
  )
}

function swapGems(a, b, callback) {
  const dur = 200
  const startA = a.position.clone()
  const startB = b.position.clone()
  const t0 = Date.now()

  function anim() {
    const p = Math.min((Date.now() - t0) / dur, 1)
    const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
    a.position.lerpVectors(startA, startB, ease)
    b.position.lerpVectors(startB, startA, ease)
    if (p < 1) {
      requestAnimationFrame(anim)
    } else {
      a.position.copy(startB)
      b.position.copy(startA)
      // Swap in board
      const tmp = { col: a.userData.col, row: a.userData.row }
      a.userData.col = b.userData.col
      a.userData.row = b.userData.row
      b.userData.col = tmp.col
      b.userData.row = tmp.row
      callback()
    }
  }
  anim()
}

function findMatches() {
  const matched = new Set()

  // Horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS - 2; col++) {
      const t = board[row][col]
      if (t < 0) continue
      let len = 1
      while (col + len < COLS && board[row][col + len] === t) len++
      if (len >= 3) {
        for (let i = 0; i < len; i++) matched.add(`${col + i},${row}`)
        col += len - 1
      }
    }
  }

  // Vertical
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS - 2; row++) {
      const t = board[row][col]
      if (t < 0) continue
      let len = 1
      while (row + len < ROWS && board[row + len][col] === t) len++
      if (len >= 3) {
        for (let i = 0; i < len; i++) matched.add(`${col},${row + i}`)
        row += len - 1
      }
    }
  }

  return [...matched].map(s => {
    const [col, row] = s.split(',').map(Number)
    return { col, row }
  })
}

function removeMatches(matches) {
  matches.forEach(({ col, row }) => {
    const gem = getGem(col, row)
    if (!gem) return
    board[row][col] = -1
    gem.userData.type = -1
    gem.visible = false
  })
}

function dropGems() {
  const drops = []

  for (let col = 0; col < COLS; col++) {
    let writeRow = ROWS - 1
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] >= 0) {
        if (row !== writeRow) {
          board[writeRow][col] = board[row][col]
          board[row][col] = -1
          const gem = getGem(col, row)
          if (gem) {
            drops.push({ gem, fromRow: row, toRow: writeRow })
            gem.userData.row = writeRow
          }
        }
        writeRow--
      }
    }
    // Fill empty top rows
    for (let row = writeRow; row >= 0; row--) {
      const type = Math.floor(Math.random() * TYPES)
      board[row][col] = type
      const gem = createGem(type, col, row)
      gem.userData.animY = -(row + 1) * CELL - Math.random() * CELL
      gem.position.y = gem.userData.animY
      drops.push({ gem, fromRow: -1, toRow: row, delay: (writeRow - row) * 30 })
      gems.push(gem)
    }
  }

  return drops
}

function animateDrops(drops) {
  if (drops.length === 0) return new Promise(r => setTimeout(r, 0))
  return new Promise(resolve => {
    const start = Date.now()
    const dur = 300

    function anim() {
      const elapsed = Date.now() - start
      let done = true

      drops.forEach(d => {
        if (elapsed < (d.delay || 0)) return
        const t = Math.min((elapsed - (d.delay || 0)) / dur, 1)
        const ease = t * t * (3 - 2 * t)
        const targetY = 0
        const fromY = d.fromRow < 0
          ? -(d.toRow + 2) * CELL - Math.random() * CELL
          : d.fromRow * CELL - (ROWS * CELL) / 2 + CELL / 2
        const toY = d.toRow * CELL - (ROWS * CELL) / 2 + CELL / 2
        d.gem.position.y = fromY + (toY - fromY) * ease
        d.gem.position.x = d.gem.userData.col * CELL - (COLS * CELL) / 2 + CELL / 2
        if (t < 1) done = false
      })

      if (!done) {
        requestAnimationFrame(anim)
      } else {
        resolve()
      }
    }
    anim()
  })
}

function showMatchEffect(matches) {
  matches.forEach(({ col, row }) => {
    const pos = worldPos(col, row)
    const pGeo = new THREE.SphereGeometry(0.15, 8, 8)
    const pMat = new THREE.MeshBasicMaterial({ color: COLORS[Math.floor(Math.random() * TYPES)], transparent: true })
    const p = new THREE.Mesh(pGeo, pMat)
    p.position.copy(pos)
    p.position.y = 0.3
    scene.add(p)
    const startT = Date.now()
    const dur = 400
    function animP() {
      const t = (Date.now() - startT) / dur
      if (t >= 1) { scene.remove(p); return }
      p.position.y += 0.08
      p.scale.setScalar(1 + t * 2)
      p.material.opacity = 1 - t
      requestAnimationFrame(animP)
    }
    animP()
  })
}

async function processMatches() {
  let matches = findMatches()
  let cascade = 0

  while (matches.length > 0) {
    cascade++
    combo += cascade
    const pts = matches.length * 10 * cascade
    score += pts
    comboLabel.textContent = `Combo ×${cascade}! +${pts}`
    comboLabel.style.opacity = '1'
    setTimeout(() => { comboLabel.style.opacity = '0' }, 1000)

    showMatchEffect(matches)
    await new Promise(r => setTimeout(r, 150))
    removeMatches(matches)
    await new Promise(r => setTimeout(r, 100))
    const drops = dropGems()
    await animateDrops(drops)
    await new Promise(r => setTimeout(r, 100))
    matches = findMatches()
  }

  combo = 0
  isAnimating = false
  if (moves <= 0) {
    setTimeout(() => {
      alert(`Game Over! Score: ${score}`)
    }, 300)
  }
}

// Raycasting for click
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

function selectGem(gem) {
  if (selectedMesh) {
    selectedMesh.scale.setScalar(1)
  }
  if (selectedMesh === gem) {
    selected = null
    selectedMesh = null
    return
  }
  selectedMesh = gem
  gem.scale.setScalar(1.3)
  selected = { col: gem.userData.col, row: gem.userData.row }
}

function handleClick(e) {
  if (isAnimating) return

  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hit = new THREE.Vector3()
  raycaster.ray.intersectPlane(plane, hit)

  // Find nearest gem
  let nearest = null
  let nearestDist = Infinity
  gems.forEach(g => {
    if (g.userData.type < 0) return
    const d = g.position.distanceTo(hit)
    if (d < CELL * 0.6 && d < nearestDist) {
      nearestDist = d
      nearest = g
    }
  })

  if (!nearest) return

  if (!selected) {
    selectGem(nearest)
  } else {
    const dc = Math.abs(nearest.userData.col - selected.col)
    const dr = Math.abs(nearest.userData.row - selected.row)

    if ((dc === 1 && dr === 0) || (dc === 0 && dr === 1)) {
      // Adjacent - swap
      const a = getGem(selected.col, selected.row)
      const b = nearest
      isAnimating = true
      moves--
      movesLabel.textContent = `Moves: ${moves}`
      swapGems(a, b, async () => {
        // Check for matches
        const matches = findMatches()
        if (matches.length === 0) {
          // Swap back
          swapGems(a, b, () => { isAnimating = false })
        } else {
          await processMatches()
        }
      })
      selectedMesh = null
      selected = null
    } else {
      selectGem(nearest)
    }
  }
}

document.addEventListener('click', handleClick)

// UI
const scoreLabel = document.createElement('div')
scoreLabel.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);color:#fff;font-family:monospace;font-size:24px;font-weight:bold;background:rgba(0,0,0,0.7);padding:10px 30px;border-radius:8px;border:1px solid #334;'
document.body.appendChild(scoreLabel)

const comboLabel = document.createElement('div')
comboLabel.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);color:#ffcc00;font-family:monospace;font-size:20px;font-weight:bold;transition:opacity 0.5s;opacity:0;'
document.body.appendChild(comboLabel)

const movesLabel = document.createElement('div')
movesLabel.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#aaa;font-family:monospace;font-size:14px;background:rgba(0,0,0,0.7);padding:8px 20px;border-radius:6px;'
document.body.appendChild(movesLabel)

const restartBtn = document.createElement('button')
restartBtn.textContent = '🔄 Restart'
restartBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 20px;background:#223344;border:1px solid #446688;color:#fff;font-family:monospace;font-size:13px;cursor:pointer;border-radius:6px;'
restartBtn.onclick = () => { score = 0; moves = 30; combo = 0; initBoard() }
document.body.appendChild(restartBtn)

// Title
const titleLabel = document.createElement('div')
titleLabel.textContent = '🎯 Match-3 Puzzle'
titleLabel.style.cssText = 'position:fixed;top:20px;left:20px;color:#ffcc00;font-family:monospace;font-size:14px;font-weight:bold;'
document.body.appendChild(titleLabel)

// Hint label
const hintLabel = document.createElement('div')
hintLabel.innerHTML = 'Click to select, click adjacent to swap<br>Match 3+ to score!'
hintLabel.style.cssText = 'position:fixed;bottom:60px;left:20px;color:#666;font-family:monospace;font-size:11px;'
document.body.appendChild(hintLabel)

// Animate
function animate(t = 0) {
  requestAnimationFrame(animate)

  scoreLabel.textContent = `Score: ${score}`
  movesLabel.textContent = `Moves: ${moves}`

  // Rotate gems
  gems.forEach(g => {
    if (g.userData.type >= 0) {
      g.rotation.y += 0.01
      // Floating bob
      g.position.y = g.position.y * 0.9 + (Math.sin(t * 0.002 + g.userData.col * 0.5 + g.userData.row * 0.3) * 0.05) * 0.1
    }
  })

  composer.render()
}

initBoard()
animate()
window.addEventListener('resize', () => {
  camera.left = -(COLS * CELL) / 2 - 1
  camera.right = (COLS * CELL) / 2 + 1
  camera.top = (ROWS * CELL) / 2 + 1
  camera.bottom = -(ROWS * CELL) / 2 - 1
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
