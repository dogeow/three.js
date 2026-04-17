import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080c14)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
camera.position.set(12, 10, 12)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.5)
sun.position.set(10, 20, 8)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 80
sun.shadow.camera.left = sun.shadow.camera.bottom = -30
sun.shadow.camera.right = sun.shadow.camera.top = 30
scene.add(sun)

// ─── Ground ──────────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.1 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
ground.name = 'ground'
scene.add(ground)

let gridHelper = new THREE.GridHelper(60, 60, 0x1e3a5f, 0x0f2744)
gridHelper.position.y = 0.01
scene.add(gridHelper)

// ─── Objects ──────────────────────────────────────────────────────────────────
const selectableObjects = []
let selectedMeshes = new Set()
let gridSize = 1.0

const palette = [
  0x38bdf8, 0x818cf8, 0xf472b6, 0x34d399,
  0xf59e0b, 0xfb923c, 0xa78bfa, 0x2dd4bf,
]

function makeMesh(x, z) {
  const h = 0.5 + Math.random() * 2
  const w = 0.5 + Math.random() * 1.5
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, w),
    new THREE.MeshStandardMaterial({
      color: palette[Math.floor(Math.random() * palette.length)],
      roughness: 0.4, metalness: 0.4
    })
  )
  mesh.position.set(x, h / 2, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.isSelectable = true
  scene.add(mesh)
  selectableObjects.push(mesh)
  return mesh
}

// Initial scatter
for (let i = 0; i < 24; i++) {
  const x = (Math.random() - 0.5) * 22
  const z = (Math.random() - 0.5) * 22
  makeMesh(Math.round(x / gridSize) * gridSize, Math.round(z / gridSize) * gridSize)
}

// ─── Selection Box ────────────────────────────────────────────────────────────
const selBoxMat = new THREE.MeshBasicMaterial({
  color: 0xf59e0b, transparent: true, opacity: 0.12,
  side: THREE.DoubleSide, depthWrite: false
})
const selBoxGeo = new THREE.BoxGeometry(1, 1, 1)
const selBox = new THREE.Mesh(selBoxGeo, selBoxMat)
selBox.visible = false
scene.add(selBox)

const selBoxEdge = new THREE.LineSegments(
  new THREE.EdgesGeometry(selBoxGeo),
  new THREE.LineBasicMaterial({ color: 0xf59e0b })
)
selBox.add(selBoxEdge)

// Selection highlight material
const highlightMat = new THREE.MeshBasicMaterial({
  color: 0xf59e0b, transparent: true, opacity: 0.18,
  side: THREE.DoubleSide, depthWrite: false
})

// ─── Raycaster ───────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let isBoxSelecting = false
let boxStart = new THREE.Vector2()
let boxEnd = new THREE.Vector2()

function getMouseNDC(e) {
  const rect = renderer.domElement.getBoundingClientRect()
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width)  * 2 - 1,
   -((e.clientY - rect.top)  / rect.height) * 2 + 1
  )
}

function deselectAll() {
  selectedMeshes.forEach(m => {
    m.material.emissive?.set(0x000000)
    m.scale.setScalar(1)
  })
  selectedMeshes.clear()
  selBox.visible = false
  updateUI()
}

function selectMesh(mesh, additive = false) {
  if (!additive) deselectAll()
  if (!mesh || selectedMeshes.has(mesh)) return
  selectedMeshes.add(mesh)
  mesh.material.emissive = mesh.material.emissive || new THREE.Color(0x000000)
  mesh.material.emissive.set(0xf59e0b)
  mesh.material.emissiveIntensity = 0.3
  updateSelBox()
  updateUI()
}

function updateSelBox() {
  if (selectedMeshes.size === 0) {
    selBox.visible = false
    return
  }
  const box = new THREE.Box3()
  selectedMeshes.forEach(m => box.expandByObject(m))
  const center = new THREE.Vector3()
  const size   = new THREE.Vector3()
  box.getCenter(center)
  box.getSize(size)
  selBox.position.copy(center)
  selBox.scale.copy(size)
  selBox.visible = true
}

function snapSelectedToGrid() {
  selectedMeshes.forEach(m => {
    const nx = Math.round(m.position.x / gridSize) * gridSize
    const nz = Math.round(m.position.z / gridSize) * gridSize
    m.position.x = nx
    m.position.z = nz
  })
  updateSelBox()
}

function deleteSelected() {
  selectedMeshes.forEach(m => {
    scene.remove(m)
    const idx = selectableObjects.indexOf(m)
    if (idx !== -1) selectableObjects.splice(idx, 1)
  })
  deselectAll()
}

// ─── Box selection ────────────────────────────────────────────────────────────
function getObjectsInBox(x1, y1, x2, y2) {
  const rect = renderer.domElement.getBoundingClientRect()
  const ndc1 = new THREE.Vector2(
    ((x1 - rect.left) / rect.width)  * 2 - 1,
   -((y1 - rect.top)  / rect.height) * 2 + 1
  )
  const ndc2 = new THREE.Vector2(
    ((x2 - rect.left) / rect.width)  * 2 - 1,
   -((y2 - rect.top)  / rect.height) * 2 + 1
  )
  const objs = []
  for (const obj of selectableObjects) {
    const projected = obj.position.clone().project(camera)
    const sx = (projected.x + 1) / 2 * rect.width  + rect.left
    const sy = (-projected.y + 1) / 2 * rect.height + rect.top
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2)
    if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) objs.push(obj)
  }
  return objs
}

// ─── Controls ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = true
controls.minDistance = 3
controls.maxDistance = 80
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN
}

// ─── Mouse Events ─────────────────────────────────────────────────────────────
let isDragging = false
let dragStart  = new THREE.Vector2()
let dragObj    = null
let dragPlane  = new THREE.Plane()
let dragOffset = new THREE.Vector3()

renderer.domElement.addEventListener('mousedown', e => {
  if (e.button !== 0) return
  mouse.copy(getMouseNDC(e))
  raycaster.setFromCamera(mouse, camera)

  const hits = raycaster.intersectObjects(selectableObjects)

  if (hits.length > 0) {
    const mesh = hits[0].object
    if (e.shiftKey) {
      selectMesh(mesh, true) // additive
    } else if (!selectedMeshes.has(mesh)) {
      selectMesh(mesh, false)
    }
    // Start drag
    isDragging = true
    dragObj = mesh
    dragStart.set(e.clientX, e.clientY)
    const planeNormal = new THREE.Vector3(0, 1, 0)
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, mesh.position)
    raycaster.ray.intersectPlane(dragPlane, dragOffset)
    dragOffset.sub(mesh.position)
    controls.enabled = false
  } else {
    // Start box select
    if (!e.shiftKey) deselectAll()
    isBoxSelecting = true
    boxStart.set(e.clientX, e.clientY)
    boxEnd.set(e.clientX, e.clientY)
  }
})

renderer.domElement.addEventListener('mousemove', e => {
  if (isBoxSelecting) {
    boxEnd.set(e.clientX, e.clientY)
  }
  if (isDragging && selectedMeshes.size > 0) {
    mouse.copy(getMouseNDC(e))
    raycaster.setFromCamera(mouse, camera)
    const pt = new THREE.Vector3()
    raycaster.ray.intersectPlane(dragPlane, pt)
    const dx = pt.x - dragOffset.x
    const dz = pt.z - dragOffset.z

    selectedMeshes.forEach(m => {
      if (m === dragObj) {
        m.position.x = dx
        m.position.z = dz
      } else {
        const ox = m.position.x - dragObj.position.x
        const oz = m.position.z - dragObj.position.z
        m.position.x = dx + ox
        m.position.z = dz + oz
      }
    })
    updateSelBox()
  }
})

renderer.domElement.addEventListener('mouseup', e => {
  if (isBoxSelecting) {
    const objs = getObjectsInBox(boxStart.x, boxStart.y, boxEnd.x, boxEnd.y)
    objs.forEach(o => selectMesh(o, true))
    isBoxSelecting = false
  }
  isDragging = false
  controls.enabled = true
})

// Click on ground to create
renderer.domElement.addEventListener('dblclick', e => {
  if (e.button !== 0) return
  mouse.copy(getMouseNDC(e))
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(ground)
  if (hits.length > 0) {
    const p = hits[0].point
    const nx = Math.round(p.x / gridSize) * gridSize
    const nz = Math.round(p.z / gridSize) * gridSize
    const m = makeMesh(nx, nz)
    selectMesh(m, false)
  }
})

// ─── Keyboard ─────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') deselectAll()
  if (e.code === 'KeyG') snapSelectedToGrid()
  if (e.code === 'Delete' || e.code === 'Backspace') deleteSelected()
  if (e.code === 'ArrowLeft')  rotateSelected(Math.PI  / 12)
  if (e.code === 'ArrowRight') rotateSelected(-Math.PI / 12)
  if (e.code === 'Digit1') setGridSize(0.5)
  if (e.code === 'Digit2') setGridSize(1.0)
  if (e.code === 'Digit3') setGridSize(2.0)
  if (e.code === 'Digit4') setGridSize(5.0)
})

function rotateSelected(angle) {
  if (selectedMeshes.size === 0) return
  const cx = new THREE.Vector3(), cz = new THREE.Vector3()
  selectedMeshes.forEach(m => { cx.add(m.position); })
  cx.divideScalar(selectedMeshes.size)
  const cy = cx.y
  selectedMeshes.forEach(m => {
    const dx = m.position.x - cx.x
    const dz = m.position.z - cx.z
    m.position.x = cx.x + dx * Math.cos(angle) - dz * Math.sin(angle)
    m.position.z = cx.z + dx * Math.sin(angle) + dz * Math.cos(angle)
    m.rotation.y += angle
  })
  updateSelBox()
}

function setGridSize(s) {
  gridSize = s
  rebuildGrid()
  document.getElementById('gridSizeLabel').textContent = s.toFixed(1)
  document.querySelectorAll('[id^=btnG]').forEach(b => b.classList.remove('active'))
  const map = { 0.5: 'btnG1', 1.0: 'btnG2', 2.0: 'btnG3', 5.0: 'btnG4' }
  document.getElementById(map[s])?.classList.add('active')
}

function rebuildGrid() {
  scene.remove(gridHelper)
  const count = Math.round(60 / gridSize)
  gridHelper = new THREE.GridHelper(60, count,
    count > 40 ? 0x1e3a5f : 0x38bdf8,
    count > 40 ? 0x0f2744 : 0x1e3a5f
  )
  gridHelper.position.y = 0.01
  scene.add(gridHelper)
}

// ─── UI Buttons ───────────────────────────────────────────────────────────────
document.getElementById('btnSnap').addEventListener('click',  snapSelectedToGrid)
document.getElementById('btnDel').addEventListener('click',    deleteSelected)
document.getElementById('btnClear').addEventListener('click', () => {
  deselectAll()
  selectableObjects.forEach(m => scene.remove(m))
  selectableObjects.length = 0
  updateUI()
})
document.getElementById('btnG1').addEventListener('click', () => setGridSize(0.5))
document.getElementById('btnG2').addEventListener('click', () => setGridSize(1.0))
document.getElementById('btnG3').addEventListener('click', () => setGridSize(2.0))
document.getElementById('btnG4').addEventListener('click', () => setGridSize(5.0))

function updateUI() {
  document.getElementById('statSel').textContent   = selectedMeshes.size
  document.getElementById('statTotal').textContent = selectableObjects.length
}

// ─── Render ───────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()

  // Animate selected: gentle bobble
  selectedMeshes.forEach((m, i) => {
    m.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3 + i * 0.5) * 0.04)
  })

  // Box select preview
  if (isBoxSelecting) {
    selBoxMat.opacity = 0.1
  }

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

updateUI()
window.scene = scene

animate()