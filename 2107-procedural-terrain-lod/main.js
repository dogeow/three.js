// 2107. 程序化地形LOD
// 程序化地形多级细节
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a2634)
scene.fog = new THREE.FogExp2(0x1a2634, 0.005)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000)
camera.position.set(80, 60, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1
controls.minDistance = 20
controls.maxDistance = 400

// 地形参数
const TERRAIN_SIZE = 200
const TERRAIN_SEGMENTS = 128

// 单纯形噪声函数
function noise2D(x, y) {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  x -= Math.floor(x)
  y -= Math.floor(y)
  const u = x * x * (3 - 2 * x)
  const v = y * y * (3 - 2 * y)
  const a = (Math.sin(X * 12.9898 + Y * 78.233) * 43758.5453) % 1
  const b = (Math.sin((X + 1) * 12.9898 + Y * 78.233) * 43758.5453) % 1
  const c = (Math.sin(X * 12.9898 + (Y + 1) * 78.233) * 43758.5453) % 1
  const d = (Math.sin((X + 1) * 12.9898 + (Y + 1) * 78.233) * 43758.5453) % 1
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(x, y, octaves = 6) {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < octaves; i++) {
    value += amplitude * (noise2D(x * frequency, y * frequency) * 2 - 1)
    amplitude *= 0.5
    frequency *= 2
  }
  return value
}

// 地形颜色映射
const terrainColors = {
  deepWater: new THREE.Color(0x1a3a5c),
  shallowWater: new THREE.Color(0x2d5a7b),
  sand: new THREE.Color(0xc2a366),
  grass: new THREE.Color(0x3d7a3d),
  rock: new THREE.Color(0x6b6b6b),
  snow: new THREE.Color(0xf5f5f5)
}

// 创建地形几何体
function createTerrain(segments, scale, offsetY = 0) {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)
  geo.rotateX(-Math.PI / 2)
  
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    
    // 生成高度
    const nx = x / TERRAIN_SIZE * scale
    const nz = z / TERRAIN_SIZE * scale
    let height = fbm(nx, nz, 6) * 30
    
    // 添加山丘
    height += fbm(nx * 0.3, nz * 0.3, 3) * 20
    // 添加山脉
    height += Math.sin(nx * 0.5) * Math.cos(nz * 0.5) * 15
    
    // 岛屿衰减
    const distFromCenter = Math.sqrt((x / TERRAIN_SIZE) ** 2 + (z / TERRAIN_SIZE) ** 2)
    const islandFade = 1 - Math.pow(distFromCenter * 1.2, 2)
    height *= Math.max(0, islandFade)
    
    pos.setY(i, height)
    
    // 颜色
    let color
    if (height < -5) color = terrainColors.deepWater
    else if (height < 0) color = terrainColors.shallowWater
    else if (height < 3) color = terrainColors.sand
    else if (height < 15) color = terrainColors.grass
    else if (height < 25) color = terrainColors.rock
    else color = terrainColors.snow
    
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  
  return geo
}

// 多层LOD地形
const terrainMeshes = []
const lodLevels = [
  { segments: 128, visible: true },
  { segments: 64, visible: true },
  { segments: 32, visible: true },
  { segments: 16, visible: true }
]

lodLevels.forEach((level, i) => {
  const geo = createTerrain(level.segments, 4)
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: i % 2 === 0
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = i * 0.2
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.lodIndex = i
  mesh.visible = level.visible
  terrainMeshes.push(mesh)
  scene.add(mesh)
})

// LOD指示器
const lodIndicatorMat = new THREE.MeshBasicMaterial({ 
  color: 0xffffff, 
  wireframe: true, 
  transparent: true, 
  opacity: 0.3 
})
const lodIndicators = []
lodLevels.forEach((level, i) => {
  const indicatorGeo = new THREE.PlaneGeometry(TERRAIN_SIZE * 0.9, TERRAIN_SIZE * 0.9, level.segments, level.segments)
  indicatorGeo.rotateX(-Math.PI / 2)
  const indicator = new THREE.Mesh(indicatorGeo, lodIndicatorMat.clone())
  indicator.position.y = i * 0.2 + 0.1
  indicator.visible = false
  lodIndicators.push(indicator)
  scene.add(indicator)
})

// 天空盒渐变
const skyGeo = new THREE.SphereGeometry(500, 32, 32)
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uTopColor: { value: new THREE.Color(0x0a1628) },
    uBottomColor: { value: new THREE.Color(0x2d5a7b) },
    uOffset: { value: 0.4 },
    uExponent: { value: 0.8 }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uTopColor;
    uniform vec3 uBottomColor;
    uniform float uOffset;
    uniform float uExponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition).y + uOffset;
      gl_FragColor = vec4(mix(uBottomColor, uTopColor, max(pow(max(h, 0.0), uExponent), 0.0)), 1.0);
    }
  `,
  side: THREE.BackSide
})
scene.add(new THREE.Mesh(skyGeo, skyMat))

// 灯光
scene.add(new THREE.AmbientLight(0x6688aa, 0.4))
const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2)
sunLight.position.set(100, 150, 100)
sunLight.castShadow = true
sunLight.shadow.mapSize.width = 2048
sunLight.shadow.mapSize.height = 2048
sunLight.shadow.camera.near = 10
sunLight.shadow.camera.far = 500
sunLight.shadow.camera.left = -150
sunLight.shadow.camera.right = 150
sunLight.shadow.camera.top = 150
sunLight.shadow.camera.bottom = -150
scene.add(sunLight)

const fillLight = new THREE.DirectionalLight(0x6688cc, 0.3)
fillLight.position.set(-50, 50, -50)
scene.add(fillLight)

// 树木装饰
const treeCount = 500
const treeGeo = new THREE.BufferGeometry()
const treePositions = new Float32Array(treeCount * 3)
let treeIndex = 0

for (let i = 0; i < treeCount; i++) {
  const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8
  const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8
  const distFromCenter = Math.sqrt((x / TERRAIN_SIZE) ** 2 + (z / TERRAIN_SIZE) ** 2)
  if (distFromCenter > 0.7) continue
  
  // 计算地形高度
  const nx = x / TERRAIN_SIZE * 4
  const nz = z / TERRAIN_SIZE * 4
  let height = fbm(nx, nz, 6) * 30
  height += fbm(nx * 0.3, nz * 0.3, 3) * 20
  height += Math.sin(nx * 0.5) * Math.cos(nz * 0.5) * 15
  const islandFade = 1 - Math.pow(distFromCenter * 1.2, 2)
  height *= Math.max(0, islandFade)
  
  if (height > 2 && height < 15) {
    treePositions[treeIndex * 3] = x
    treePositions[treeIndex * 3 + 1] = height
    treePositions[treeIndex * 3 + 2] = z
    treeIndex++
  }
}

treeGeo.setAttribute('position', new THREE.BufferAttribute(treePositions.slice(0, treeIndex * 3), 3))

const treeMat = new THREE.PointsMaterial({
  color: 0x2d5a2d,
  size: 2,
  sizeAttenuation: true
})
const trees = new THREE.Points(treeGeo, treeMat)
scene.add(trees)

// LOD控制变量
let showLODWires = false
window.addEventListener('keydown', (e) => {
  if (e.key === 'l') {
    showLODWires = !showLODWires
    lodIndicators.forEach(ind => ind.visible = showLODWires)
  }
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  // 根据相机距离调整LOD显示
  const camDist = camera.position.distanceTo(new THREE.Vector3(0, 0, 0))
  
  terrainMeshes.forEach((mesh, i) => {
    const threshold = 50 + i * 50
    mesh.visible = camDist < threshold + 50
  })
  
  // LOD线框指示器
  lodIndicators.forEach((ind, i) => {
    const threshold = 50 + i * 50
    ind.visible = showLODWires && camDist > threshold && camDist < threshold + 100
  })
  
  // 太阳移动
  sunLight.position.x = Math.cos(t * 0.05) * 150
  sunLight.position.z = Math.sin(t * 0.05) * 150
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

console.log('程序化地形LOD initialized - Press L to toggle LOD wireframes')
