import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = [
  0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x14b8a6, 0x3b82f6,
  0x6366f1, 0xa855f7, 0xec4899, 0xf8fafc, 0x94a3b8, 0x1e293b,
  0x854d0e, 0x365314, 0x0c4a6e, 0x3b0764, 0x881337, 0x292524,
]

const paletteEl = document.getElementById('palette')
let currentColorIdx = 0

PALETTE.forEach((color, i) => {
  const sw = document.createElement('div')
  sw.className = 'swatch' + (i === 0 ? ' active' : '')
  sw.style.background = '#' + color.toString(16).padStart(6, '0')
  sw.title = '#' + color.toString(16).padStart(6, '0')
  sw.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'))
    sw.classList.add('active')
    currentColorIdx = i
  })
  paletteEl.appendChild(sw)
})

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080c14)
scene.fog = new THREE.FogExp2(0x080c14, 0.022)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
camera.position.set(14, 10, 14)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.55))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6)
sun.position.set(12, 22, 10)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 120
sun.shadow.camera.left = sun.shadow.camera.bottom = -40
sun.shadow.camera.right = sun.shadow.camera.top = 40
sun.shadow.bias = -0.001
scene.add(sun)

// ─── Ground ───────────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x0f1f0f, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
ground.name = 'ground'
scene.add(ground)

// Grid
const gridHelper = new THREE.GridHelper(80, 80, 0x1a3a1a, 0x0d1f0d)
gridHelper.position.y = 0.01
scene.add(gridHelper)

// ─── Voxel Storage ─────────────────────────────────────────────────────────────
const voxelGeo = new THREE.BoxGeometry(1, 1, 1)
const voxelMap = new Map() // key: "x,y,z" → mesh
const instancedMeshes = new Map() // colorHex → InstancedMesh
const MAX_INSTANCES = 5000
let totalInstances = 0

// Merge threshold: use individual meshes until we have enough of one color
// For simplicity, we use individual meshes with simple material reuse
// but batch them for performance

function getVoxelKey(x, y, z) { return `${x},${y},${z}` }

function placeVoxel(x, y, z, color) {
  const key = getVoxelKey(x, y, z)
  if (voxelMap.has(key)) return
  const mesh = new THREE.Mesh(
    voxelGeo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
  )
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.voxelKey = key
  scene.add(mesh)
  voxelMap.set(key, mesh)
  rebuildInstanced()
}

function removeVoxel(x, y, z) {
  const key = getVoxelKey(x, y, z)
  const mesh = voxelMap.get(key)
  if (!mesh) return
  scene.remove(mesh)
  mesh.material.dispose()
  voxelMap.delete(key)
  rebuildInstanced()
}

// ─── Instanced Rebuild ─────────────────────────────────────────────────────────
function rebuildInstanced() {
  // Group by color
  const groups = new Map()
  voxelMap.forEach((mesh, key) => {
    const color = mesh.material.color.getHex()
    if (!groups.has(color)) groups.set(color, [])
    groups.get(color).push(mesh.position.clone())
  })

  // Remove old instanced
  instancedMeshes.forEach(im => { scene.remove(im); im.geometry.dispose() })
  instancedMeshes.clear()

  const dummy = new THREE.Object3D()
  groups.forEach((positions, color) => {
    if (positions.length === 0) return
    const im = new THREE.InstancedMesh(
      voxelGeo,
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 }),
      positions.length
    )
    im.castShadow = true
    im.receiveShadow = true
    positions.forEach((pos, i) => {
      dummy.position.copy(pos)
      dummy.updateMatrix()
      im.setMatrixAt(i, dummy.matrix)
    })
    im.instanceMatrix.needsUpdate = true
    scene.add(im)
    instancedMeshes.set(color, im)
  })

  document.getElementById('blockCount').textContent = voxelMap.size
  document.getElementById('drawCalls').textContent = renderer.info.render.calls
}

// ─── Controls ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = true
controls.minDistance = 3
controls.maxDistance = 80
// 左键=旋转，中键=缩放，右键保留给删除体素（不绑定到 OrbitControls）
const _midLeftMsg = '滑轮=缩放· 左键=旋转 · 右键=删除'
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: null
}
controls.enablePan = false

// ─── Raycaster ────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let isMirrored = false

const brushIndicator = document.getElementById('brushIndicator')

function raycast(e) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.set(
    ((e.clientX - rect.left) / rect.width)  * 2 - 1,
   -((e.clientY - rect.top)  / rect.height) * 2 + 1
  )
  raycaster.setFromCamera(mouse, camera)

  // All voxel meshes
  const voxelMeshes = Array.from(voxelMap.values())
  const allObjs = [...voxelMeshes, ground]
  const hits = raycaster.intersectObjects(allObjs)
  return hits.length > 0 ? hits[0] : null
}

// 记录按下位置，避免旋转后释放时误触发放置/删除
let _placeDownX = 0, _placeDownY = 0, _placeBtn = -1
renderer.domElement.addEventListener('mousedown', e => {
  _placeDownX = e.clientX; _placeDownY = e.clientY; _placeBtn = e.button
})
renderer.domElement.addEventListener('mouseup', e => {
  if (e.button !== _placeBtn) return
  const dx = e.clientX - _placeDownX, dy = e.clientY - _placeDownY
  if (dx*dx + dy*dy > 25) return // 拖拽而非点击→交给 OrbitControls

  if (e.button === 1) return
  const hit = raycast(e)
  if (!hit) return

  const color = PALETTE[currentColorIdx]
  const normal = hit.face.normal.clone()

  if (e.button === 2) {
    // 右键删除：直接读 hit.object 上的 voxelKey（仅对体素有效）
    const key = hit.object.userData && hit.object.userData.voxelKey
    if (key) {
      const [x, y, z] = key.split(',').map(Number)
      removeVoxel(x, y, z)
      brushIndicator.textContent = '✕ 删除模式'
    }
    return
  }

  if (e.button !== 0) return

  // 左键放置
  if (hit.object.name === 'ground') {
    const bx = Math.round(hit.point.x - 0.5)
    const bz = Math.round(hit.point.z - 0.5)
    placeVoxel(bx, 0, bz, color)
    if (isMirrored) placeVoxel(-bx - 1, 0, bz, color)
  } else {
    // 在已有体素表面放置：沿法线方向偏移半格
    const pt = hit.point.clone().add(normal.clone().multiplyScalar(0.5))
    const bx = Math.floor(pt.x)
    const by = Math.floor(pt.y)
    const bz = Math.floor(pt.z)
    placeVoxel(bx, by, bz, color)
    if (isMirrored) placeVoxel(-bx - 1, by, bz, color)
  }
  brushIndicator.textContent = '● 放置模式'
})

// 滚轮保留给 OrbitControls 进行缩放，颜色通过键盘 [ / ] 或点击调色板切换
window.addEventListener('keydown', e => {
  if (e.code === 'BracketRight') {
    currentColorIdx = (currentColorIdx + 1) % PALETTE.length
  } else if (e.code === 'BracketLeft') {
    currentColorIdx = (currentColorIdx - 1 + PALETTE.length) % PALETTE.length
  } else {
    return
  }
  document.querySelectorAll('.swatch').forEach((s, i) => {
    s.classList.toggle('active', i === currentColorIdx)
  })
  brushIndicator.textContent = '● 放置模式'
})

renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())

// ─── Keyboard ────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.code === 'KeyX') {
    isMirrored = !isMirrored
    brushIndicator.textContent = isMirrored ? '🔀 镜像模式' : '● 放置模式'
  }
  if (e.code === 'KeyH') {
    gridHelper.visible = !gridHelper.visible
  }
  if (e.code === 'Space') {
    camera.position.y += 2
  }
  if (e.code === 'KeyR') {
    camera.position.set(14, 10, 14)
    controls.target.set(0, 0, 0)
  }
})

// ─── Animate ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

// Build some starter structure
const starter = [
  // Platform
  ...Array.from({length: 5}, (_, x) =>
    Array.from({length: 5}, (_, z) => [x - 2, 0, z - 2])
  ).flat(),
  // Pillar
  ...Array.from({length: 6}, (_, y) => [0, y + 1, 0]),
]
starter.forEach(([x, y, z]) => placeVoxel(x, y, z, 0x64748b))

animate()