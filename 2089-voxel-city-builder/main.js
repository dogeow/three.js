// ============================================================
// 2089 · 体素城市构建器
// 程序化生成未来都市天际线
// 特性：程序化建筑 · 多材质 · 实时阴影 · OrbitControls
// ============================================================
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ── 场景 & 渲染器 ───────────────────────────────────────────
const scene = new THREE.Scene()
// 深夜城市天空
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008)

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 3000)
camera.position.set(70, 100, 70)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
// 柔和阴影贴图：柔和阴影边缘
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
// 色调映射，让灯光更有氛围
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

// ── 轨道控制器 ──────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1   // 防止钻到地面以下
controls.minDistance = 20
controls.maxDistance = 400
controls.target.set(0, 10, 0)

// ── 材质库 ──────────────────────────────────────────────────
// 混凝土材质（普通住宅 / 办公）
const matConcrete = new THREE.MeshStandardMaterial({
  color: 0x5a6472, roughness: 0.9, metalness: 0.0
})
// 玻璃幕墙材质（高层写字楼）
const matGlass = new THREE.MeshStandardMaterial({
  color: 0x88ccff, roughness: 0.1, metalness: 0.9,
  transparent: true, opacity: 0.85
})
// 霓虹绿材质（科技 / 未来感建筑）
const matNeon = new THREE.MeshStandardMaterial({
  color: 0x00ff88, roughness: 0.4, metalness: 0.6,
  emissive: 0x00ff44, emissiveIntensity: 0.3
})
// 暖色砖材质（商业 / 娱乐区）
const matBrick = new THREE.MeshStandardMaterial({
  color: 0xcc6644, roughness: 0.8, metalness: 0.1
})
// 屋顶材质（深色防水层）
const matRoof = new THREE.MeshStandardMaterial({
  color: 0x222233, roughness: 0.7, metalness: 0.2
})
// 地面道路材质
const matRoad = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a, roughness: 0.95, metalness: 0.0
})
// 草地 / 空地材质
const matGrass = new THREE.MeshStandardMaterial({
  color: 0x1a3a1a, roughness: 0.9, metalness: 0.0
})
const materials = [matConcrete, matGlass, matNeon, matBrick]

// ── 程序化建筑生成 ──────────────────────────────────────────
const city = new THREE.Group()

/**
 * 创建一栋体素建筑
 * @param {number} bx - 建筑基点 X
 * @param {number} bz - 建筑基点 Z
 * @param {string} type - 'tower' 高层塔楼 | 'block' 方块楼 | 'wide' 宽扁建筑
 */
function createBuilding(bx, bz, type) {
  let height, widthX, widthZ, mat

  if (type === 'tower') {
    // 超高层：窄底、高耸、玻璃幕墙
    height = 15 + Math.random() * 35
    widthX = 2
    widthZ = 2
    mat = matGlass
  } else if (type === 'block') {
    // 中层方块楼：混凝土
    height = 4 + Math.random() * 10
    widthX = 2
    widthZ = 2
    mat = materials[Math.floor(Math.random() * materials.length)]
  } else {
    // 宽扁建筑：商业裙楼或仓库
    height = 1 + Math.random() * 4
    widthX = 3 + Math.floor(Math.random() * 3)
    widthZ = 3 + Math.floor(Math.random() * 3)
    mat = matBrick
  }

  // ── 建筑主体（每层 2 单位高）──
  const bodyGeo = new THREE.BoxGeometry(widthX * 2, height * 2, widthZ * 2)
  const body = new THREE.Mesh(bodyGeo, mat)
  body.position.set(bx, height, bz)
  body.castShadow = true
  body.receiveShadow = true
  city.add(body)

  // ── 屋顶装饰（小型屋顶结构）──
  if (height > 8 && Math.random() > 0.4) {
    const roofGeo = new THREE.BoxGeometry(widthX * 1.2, 1.5, widthZ * 1.2)
    const roof = new THREE.Mesh(roofGeo, matRoof)
    roof.position.set(bx, height * 2 + 0.75, bz)
    roof.castShadow = true
    roof.receiveShadow = true
    city.add(roof)
  }

  // ── 霓虹灯招牌（随机附加）──
  if (Math.random() > 0.7) {
    const signGeo = new THREE.BoxGeometry(widthX * 0.8, 0.4, 0.1)
    const sign = new THREE.Mesh(signGeo, matNeon)
    sign.position.set(bx, height * 2 + 0.2, bz + widthZ + 0.05)
    city.add(sign)
  }
}

// ── 城市网格布局 ────────────────────────────────────────────
const GRID = 18          // 网格半径
const CELL = 5          // 每格宽度（体素单位）
const ROAD_W = 1        // 道路宽度（格）

for (let ix = -GRID; ix < GRID; ix += CELL) {
  for (let iz = -GRID; iz < GRID; iz += CELL) {
    // 随机跳过：模拟城市空地 / 公园
    if (Math.random() < 0.25) continue

    const bx = ix + (Math.random() - 0.5) * CELL * 0.5
    const bz = iz + (Math.random() - 0.5) * CELL * 0.5

    // 概率决定建筑类型：塔楼 20%，方块 50%，宽扁 30%
    const r = Math.random()
    const type = r < 0.2 ? 'tower' : r < 0.7 ? 'block' : 'wide'
    createBuilding(bx, bz, type)
  }
}
scene.add(city)

// ── 地面 ────────────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(GRID * CELL * 2.2, GRID * CELL * 2.2, 20, 20)
// 地形起伏（模拟丘陵）
const posAttr = groundGeo.attributes.position
for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i)
  const y = posAttr.getY(i)
  // 边缘略微下沉
  const dist = Math.sqrt(x * x + y * y) / (GRID * CELL)
  posAttr.setZ(i, (1 - dist * dist) * 2 - 0.5)
}
groundGeo.computeVertexNormals()

const ground = new THREE.Mesh(groundGeo, matGrass)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// 道路网络（十字交叉）
const roadH = new THREE.Mesh(new THREE.PlaneGeometry(GRID * CELL * 2, ROAD_W * 2), matRoad)
roadH.rotation.x = -Math.PI / 2
roadH.position.y = 0.02
roadH.receiveShadow = true
scene.add(roadH)

const roadV = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W * 2, GRID * CELL * 2), matRoad)
roadV.rotation.x = -Math.PI / 2
roadV.position.y = 0.02
roadV.receiveShadow = true
scene.add(roadV)

// ── 路灯（程序化放置）──
const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 6)
const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.8 })
const lampGeo = new THREE.SphereGeometry(0.25, 8, 8)
const lampMat = new THREE.MeshStandardMaterial({
  color: 0xffee88, roughness: 0.2, emissive: 0xffaa22, emissiveIntensity: 1.5
})

for (let i = -GRID + 2; i < GRID; i += CELL) {
  for (const sign of [1, -1]) {
    const lamp = new THREE.Mesh(lampGeo, lampMat)
    lamp.position.set(sign * 2, 4.2, i)
    scene.add(lamp)

    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.set(sign * 2, 2, i)
    pole.castShadow = true
    scene.add(pole)
  }
}

// ── 灯光系统 ────────────────────────────────────────────────
// 环境光（深蓝色夜景氛围）
const ambient = new THREE.AmbientLight(0x112244, 0.6)
scene.add(ambient)

// 主光源：月光（冷色方向光）
const moon = new THREE.DirectionalLight(0x8899ff, 0.8)
moon.position.set(-80, 150, -60)
moon.castShadow = true
moon.shadow.mapSize.width = 2048
moon.shadow.mapSize.height = 2048
moon.shadow.camera.near = 10
moon.shadow.camera.far = 500
moon.shadow.camera.left = -150
moon.shadow.camera.right = 150
moon.shadow.camera.top = 150
moon.shadow.camera.bottom = -150
moon.shadow.bias = -0.0005
scene.add(moon)

// 城市灯光点光源（模拟地面霓虹）
const cityGlow = new THREE.PointLight(0xff6622, 1.5, 80)
cityGlow.position.set(0, 20, 0)
scene.add(cityGlow)

// 边缘补光（城市轮廓光）
const rimLight = new THREE.DirectionalLight(0xff4400, 0.3)
rimLight.position.set(80, 60, 80)
scene.add(rimLight)

// ── 动画循环 ────────────────────────────────────────────────
let t = 0
function animate() {
  requestAnimationFrame(animate)
  t += 0.008

  // 城市灯光呼吸效果
  cityGlow.intensity = 1.2 + Math.sin(t) * 0.4

  controls.update()
  renderer.render(scene, camera)
}
animate()

// ── 响应窗口 resize ─────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
