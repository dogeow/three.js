// 3243. Isometric City Builder
// 等距视角城市建造器 - 2:1等距视角的城市规划与建筑设计可视化
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1628)
const camera = new THREE.OrthographicCamera(-60, 60, 40, -40, 0.1, 1000)
camera.position.set(50, 50, 50)
camera.lookAt(0, 0, 0)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

scene.add(new THREE.AmbientLight(0x6699cc, 0.6))
const sunLight = new THREE.DirectionalLight(0xffffee, 1.2)
sunLight.position.set(30, 60, 20)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.near = 0.1
sunLight.shadow.camera.far = 200
sunLight.shadow.camera.left = -60
sunLight.shadow.camera.right = 60
sunLight.shadow.camera.top = 60
sunLight.shadow.camera.bottom = -60
scene.add(sunLight)

const params = {
  gridSize: 20,
  buildingDensity: 0.6,
  maxHeight: 12,
  buildingStyle: 'modern',
  colorScheme: 'city',
  autoGenerate: true,
  showGrid: true,
  timeOfDay: 0.5,
  rotation: 0
}

const BUILDING_COLORS = {
  modern: [0x4477aa, 0x5588bb, 0x6699cc, 0x88aacc, 0x336699],
  brutalist: [0x888888, 0x999999, 0x777777, 0xaaaaaa, 0x666666],
  cyberpunk: [0xff0066, 0x00ffcc, 0x6600ff, 0xff6600, 0x00ff66],
  warm: [0xffddaa, 0xeecc99, 0xddaa77, 0xffbb88, 0xccaa88],
  pastel: [0xaaccff, 0xccaaff, 0xaaffcc, 0xffccaa, 0xccffee]
}

const ROOF_TYPES = ['flat', 'pointed', 'terraced']

let gridHelpers = []
let buildings = []
let instancedMeshes = []

// Create ground plane
const groundGeo = new THREE.PlaneGeometry(60, 60)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.9, metalness: 0.1 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.1
ground.receiveShadow = true
scene.add(ground)

// Grid
function createGrid() {
  gridHelpers.forEach(g => scene.remove(g))
  gridHelpers = []
  
  if (!params.showGrid) return
  
  const size = 40
  const divisions = params.gridSize
  const grid = new THREE.GridHelper(size, divisions, 0x334466, 0x223344)
  grid.position.y = 0.01
  scene.add(grid)
  gridHelpers.push(grid)
  
  // Border
  const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, 0.1, size))
  const borderMat = new THREE.LineBasicMaterial({ color: 0x4488aa, opacity: 0.5, transparent: true })
  const border = new THREE.LineSegments(borderGeo, borderMat)
  border.position.y = 0.05
  scene.add(border)
  gridHelpers.push(border)
}
createGrid()

// Building types
function createBuilding(x, z, style, colors) {
  const width = 1.5 + Math.random() * 2
  const depth = 1.5 + Math.random() * 2
  const height = 1 + Math.random() * params.maxHeight * params.buildingDensity
  
  const buildingGroup = new THREE.Group()
  buildingGroup.position.set(x, 0, z)
  
  // Main body
  const bodyGeo = new THREE.BoxGeometry(width, height, depth)
  const bodyColor = colors[Math.floor(Math.random() * colors.length)]
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.6,
    metalness: style === 'cyberpunk' ? 0.4 : 0.1
  })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = height / 2
  body.castShadow = true
  body.receiveShadow = true
  buildingGroup.add(body)
  
  // Roof
  const roofType = ROOF_TYPES[Math.floor(Math.random() * ROOF_TYPES.length)]
  if (roofType === 'pointed') {
    const roofGeo = new THREE.ConeGeometry(Math.min(width, depth) * 0.6, 2, 4)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.3, roughness: 0.5 })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.y = height + 1
    roof.rotation.y = Math.PI / 4
    roof.castShadow = true
    buildingGroup.add(roof)
  } else if (roofType === 'terraced') {
    for (let i = 0; i < 2; i++) {
      const tierGeo = new THREE.BoxGeometry(width * (0.8 - i * 0.2), 0.5, depth * (0.8 - i * 0.2))
      const tier = new THREE.Mesh(tierGeo, bodyMat)
      tier.position.y = height + i * 0.5
      tier.castShadow = true
      buildingGroup.add(tier)
    }
  }
  
  // Windows (emissive rectangles)
  if (style !== 'brutalist') {
    const winColors = style === 'cyberpunk' ? [0x00ffcc, 0xff0066, 0xff6600] : [0xffffaa, 0xffff88, 0xffddaa]
    const windowMat = new THREE.MeshBasicMaterial({ color: winColors[Math.floor(Math.random() * winColors.length)] })
    
    for (let floor = 0; floor < Math.floor(height / 2); floor++) {
      for (let side = 0; side < 4; side++) {
        const winCount = Math.floor(Math.random() * 2) + 1
        for (let w = 0; w < winCount; w++) {
          const winGeo = new THREE.PlaneGeometry(0.3, 0.4)
          const win = new THREE.Mesh(winGeo, windowMat)
          const angle = side * Math.PI / 2
          const dist = side % 2 === 0 ? width / 2 + 0.01 : depth / 2 + 0.01
          win.position.set(
            Math.sin(angle) * dist + (Math.random() - 0.5) * width * 0.5,
            0.5 + floor * 2,
            Math.cos(angle) * dist + (Math.random() - 0.5) * depth * 0.5
          )
          win.rotation.y = angle
          if (side >= 2) win.rotation.y += Math.PI
          buildingGroup.add(win)
        }
      }
    }
  }
  
  // Antenna on tall buildings
  if (height > 8) {
    const antGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8)
    const antMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 })
    const ant = new THREE.Mesh(antGeo, antMat)
    ant.position.y = height + 1
    buildingGroup.add(ant)
    
    // Blinking light
    const lightGeo = new THREE.SphereGeometry(0.1, 8, 8)
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const light = new THREE.Mesh(lightGeo, lightMat)
    light.position.y = height + 2.1
    buildingGroup.add(light)
  }
  
  return buildingGroup
}

function generateCity() {
  buildings.forEach(b => scene.remove(b))
  buildings = []
  
  const colors = BUILDING_COLORS[params.colorScheme] || BUILDING_COLORS.modern
  const halfGrid = params.gridSize / 2
  const cellSize = 40 / params.gridSize
  
  for (let xi = -halfGrid; xi < halfGrid; xi++) {
    for (let zi = -halfGrid; zi < halfGrid; zi++) {
      if (Math.random() > params.buildingDensity) continue
      
      const x = xi * cellSize + cellSize / 2
      const z = zi * cellSize + cellSize / 2
      
      // Leave center streets
      if (Math.abs(x) < 3 || Math.abs(z) < 3) continue
      
      const building = createBuilding(x, z, params.buildingStyle, colors)
      scene.add(building)
      buildings.push(building)
    }
  }
  
  // Add some trees/vegetation
  for (let i = 0; i < 30; i++) {
    const treeGroup = new THREE.Group()
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 1, 8)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x443322 })
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = 0.5
    treeGroup.add(trunk)
    
    const foliageGeo = new THREE.SphereGeometry(0.8, 8, 8)
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x225533, roughness: 0.8 })
    const foliage = new THREE.Mesh(foliageGeo, foliageMat)
    foliage.position.y = 1.5
    treeGroup.add(foliage)
    
    const angle = Math.random() * Math.PI * 2
    const dist = 5 + Math.random() * 12
    treeGroup.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist)
    treeGroup.scale.setScalar(0.5 + Math.random() * 1)
    scene.add(treeGroup)
    buildings.push(treeGroup)
  }
}

generateCity()

// GUI
const gui = new GUI()
gui.add(params, 'gridSize', 5, 40, 1).name('网格大小').onChange(() => { createGrid(); generateCity() })
gui.add(params, 'buildingDensity', 0.1, 1, 0.05).name('建筑密度').onChange(generateCity)
gui.add(params, 'maxHeight', 2, 20, 1).name('最大高度').onChange(generateCity)
gui.add(params, 'buildingStyle', { 现代: 'modern', 粗野主义: 'brutalist', 赛博朋克: 'cyberpunk', 温暖: 'warm', 粉彩: 'pastel' }).name('建筑风格').onChange(generateCity)
gui.add(params, 'colorScheme', Object.keys(BUILDING_COLORS)).name('色彩方案').onChange(generateCity)
gui.add(params, 'showGrid').name('显示网格').onChange(createGrid)
gui.add(params, 'timeOfDay', 0, 1, 0.01).name('时间').onChange(v => {
  const t = Math.sin(v * Math.PI)
  sunLight.intensity = 0.3 + t * 1.0
  sunLight.color.setHSL(0.1 + v * 0.1, 0.5, 0.6 + t * 0.3)
  scene.background.setHSL(0.6 - v * 0.1, 0.5, 0.03 + t * 0.05)
})
gui.add({ regenerate: generateCity }, 'regenerate').name('重新生成城市')

// Animation
let time = 0
function animate() {
  requestAnimationFrame(animate)
  time += 0.01
  
  // Subtle camera sway
  camera.position.x = 50 + Math.sin(time * 0.2) * 2
  camera.lookAt(0, 0, 0)
  
  // Building light twinkling
  buildings.forEach((b, i) => {
    b.traverse(child => {
      if (child.isMesh && child.material.emissive && child.material.emissiveIntensity !== undefined) {
        if (params.buildingStyle === 'cyberpunk') {
          child.material.emissiveIntensity = 0.3 + Math.sin(time * 2 + i) * 0.2
        }
      }
    })
  })
  
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  const aspect = innerWidth / innerHeight
  const viewSize = 50
  camera.left = -viewSize * aspect
  camera.right = viewSize * aspect
  camera.top = viewSize
  camera.bottom = -viewSize
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
