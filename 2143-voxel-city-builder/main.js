// 2143. Voxel City Builder
// 体素方块构建程序化城市 - 增强版
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015)

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(60, 45, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1
controls.minDistance = 20
controls.maxDistance = 300
controls.autoRotate = true
controls.autoRotateSpeed = 0.3

// 灯光
scene.add(new THREE.AmbientLight(0x4455aa, 0.3))
const sun = new THREE.DirectionalLight(0xffeedd, 0.8)
sun.position.set(100, 150, 80)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 10
sun.shadow.camera.far = 400
sun.shadow.camera.left = -150
sun.shadow.camera.right = 150
sun.shadow.camera.top = 150
sun.shadow.camera.bottom = -150
scene.add(sun)
const fillLight = new THREE.DirectionalLight(0x6688cc, 0.2)
fillLight.position.set(-50, 30, -50)
scene.add(fillLight)

// 城市生成参数
const GRID_SIZE = 30
const CELL_SIZE = 4
const buildings = []

// 颜色调色板
const colors = [
  0x445566, 0x556677, 0x667788, 0x778899,
  0x334455, 0x2a3a4a, 0x3a4a5a, 0x4a5a6a,
  0x556677, 0x667788, 0x5a6a7a, 0x6a7a8a
]
const roofColors = [
  0x884444, 0x994455, 0xaa4455, 0xbb4455,
  0x448844, 0x559955, 0x66aa66, 0x77bb77
]
const windowColor = 0xffffaa

// 生成城市
function createBuilding(x, z, seed) {
  const rng = (n) => {
    const s = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453
    return s - Math.floor(s)
  }
  
  const width = 1.5 + rng(1) * 2
  const depth = 1.5 + rng(2) * 2
  const height = 2 + rng(3) * 12
  
  const group = new THREE.Group()
  group.position.set(x, height / 2, z)
  
  // 主体
  const bodyGeo = new THREE.BoxGeometry(width, height, depth)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: colors[Math.floor(rng(4) * colors.length)],
    roughness: 0.7,
    metalness: 0.3
  })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)
  
  // 屋顶
  const roofType = Math.floor(rng(5) * 4)
  if (roofType === 0) {
    // 平顶
    const roofGeo = new THREE.BoxGeometry(width + 0.2, 0.3, depth + 0.2)
    const roofMat = new THREE.MeshStandardMaterial({
      color: roofColors[Math.floor(rng(6) * roofColors.length)],
      roughness: 0.8
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.y = height / 2 + 0.15
    roof.castShadow = true
    group.add(roof)
  } else if (roofType === 1) {
    // 尖顶
    const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.7, 2, 4)
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x554433,
      roughness: 0.9
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.y = height / 2 + 1
    roof.rotation.y = Math.PI / 4
    roof.castShadow = true
    group.add(roof)
  } else if (roofType === 2) {
    // 高层塔顶
    const towerGeo = new THREE.BoxGeometry(width * 0.4, height * 0.3, depth * 0.4)
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x667788,
      roughness: 0.5,
      metalness: 0.5
    })
    const tower = new THREE.Mesh(towerGeo, towerMat)
    tower.position.y = height / 2 + height * 0.15
    tower.castShadow = true
    group.add(tower)
  }
  
  // 窗户
  const floors = Math.floor(height / 2)
  const windowsPerFloor = Math.floor(width + depth)
  const winGeo = new THREE.PlaneGeometry(0.3, 0.5)
  const winMat = new THREE.MeshBasicMaterial({ color: windowColor, transparent: true, opacity: 0.9 })
  
  for (let f = 0; f < floors; f++) {
    for (let w = 0; w < windowsPerFloor; w++) {
      if (rng(f * 100 + w) > 0.6) {
        const win = new THREE.Mesh(winGeo, winMat.clone())
        win.material.opacity = 0.3 + rng(f * 50 + w) * 0.6
        const side = Math.floor(rng(f * 10 + w) * 4)
        const y = -height / 2 + 1 + f * 2
        
        if (side === 0) {
          win.position.set(0, y, depth / 2 + 0.01)
        } else if (side === 1) {
          win.position.set(0, y, -depth / 2 - 0.01)
          win.rotation.y = Math.PI
        } else if (side === 2) {
          win.position.set(width / 2 + 0.01, y, 0)
          win.rotation.y = Math.PI / 2
        } else {
          win.position.set(-width / 2 - 0.01, y, 0)
          win.rotation.y = -Math.PI / 2
        }
        group.add(win)
      }
    }
  }
  
  return group
}

// 地形
const groundGeo = new THREE.PlaneGeometry(200, 200, 50, 50)
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a2a,
  roughness: 0.95,
  metalness: 0.05
})
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// 人行道网格
const sidewalkGeo = new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE + 10, GRID_SIZE * CELL_SIZE + 10)
const sidewalkMat = new THREE.MeshStandardMaterial({
  color: 0x2a2a3a,
  roughness: 0.9
})
const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat)
sidewalk.rotation.x = -Math.PI / 2
sidewalk.position.y = 0.05
sidewalk.receiveShadow = true
scene.add(sidewalk)

// 随机种建筑
const rng = (n) => Math.sin(n * 78.233) * 43758.5453 - Math.floor(Math.sin(n * 78.233) * 43758.5453)
for (let gz = 0; gz < GRID_SIZE; gz++) {
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    const seed = gx * 1000 + gz
    if (rng(seed) > 0.35) {
      const x = (gx - GRID_SIZE / 2) * CELL_SIZE + (rng(seed + 1) - 0.5) * 2
      const z = (gz - GRID_SIZE / 2) * CELL_SIZE + (rng(seed + 2) - 0.5) * 2
      const building = createBuilding(x, z, seed)
      scene.add(building)
      buildings.push(building)
    }
  }
}

// 道路网格
const roadMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.95 })
for (let i = 0; i <= GRID_SIZE; i++) {
  const roadH = new THREE.Mesh(new THREE.PlaneGeometry(CELL_SIZE * 0.8, GRID_SIZE * CELL_SIZE), roadMat)
  roadH.rotation.x = -Math.PI / 2
  roadH.position.set((i - GRID_SIZE / 2) * CELL_SIZE, 0.02, 0)
  roadH.receiveShadow = true
  scene.add(roadH)
  
  const roadV = new THREE.Mesh(new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, CELL_SIZE * 0.8), roadMat)
  roadV.rotation.x = -Math.PI / 2
  roadV.position.set(0, 0.02, (i - GRID_SIZE / 2) * CELL_SIZE)
  roadV.receiveShadow = true
  scene.add(roadV)
}

// 鼠标交互
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let highlightMesh = null

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
})

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  // 窗户灯光闪烁
  buildings.forEach((building, bi) => {
    building.children.forEach(child => {
      if (child.material && child.material.opacity !== undefined && child.material.opacity < 1) {
        if (Math.sin(t * 2 + bi * 0.5) > 0.7) {
          child.material.opacity = 0.8 + Math.random() * 0.2
        }
      }
    })
  })
  
  // 鼠标悬停高亮
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(buildings, true)
  
  if (intersects.length > 0) {
    const bld = intersects[0].object.parent
    if (bld && bld.isGroup && bld !== highlightMesh) {
      if (highlightMesh) highlightMesh.children[0].material.emissive?.setHex(0x000000)
      highlightMesh = bld
      if (highlightMesh.children[0].material) {
        highlightMesh.children[0].material.emissive = new THREE.Color(0x222244)
        highlightMesh.children[0].material.emissiveIntensity = 0.3
      }
    }
  } else if (highlightMesh) {
    highlightMesh.children[0].material.emissive?.setHex(0x000000)
    highlightMesh = null
  }
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
