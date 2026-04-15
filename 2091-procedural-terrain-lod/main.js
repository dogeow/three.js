/**
 * 2091. 程序化地形 + 多级细节（LOD）+ 多色高度带
 * 功能：
 *   - 基于 Simplex Noise 生成程序化地形
 *   - 根据高度分层着色：水体(蓝)、沙滩(黄)、草地(绿)、岩石(灰)、雪顶(白)
 *   - 多层 LOD 网格叠加显示细节差异
 *   - OrbitControls 自由视角控制
 *   - 方向光 + 环境光 + 阴影
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─────────────────────────────────────────────
// 场景基础设置
// ─────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb) // 天空蓝背景
scene.fog = new THREE.Fog(0x87ceeb, 80, 300) // 远距离雾效，增加层次感

// 透视相机：视野60°，近裁剪0.1，远裁剪2000
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000)
camera.position.set(80, 60, 100) // 斜上方俯瞰角度
camera.lookAt(0, 0, 0)

// WebGL 渲染器，开启抗锯齿和阴影贴图
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)) // 限制像素比，防止性能问题
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap // 柔和阴影
document.body.appendChild(renderer.domElement)

// OrbitControls：鼠标拖拽旋转、滚轮缩放、右键平移
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true       // 阻尼效果，手感更顺滑
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1 // 限制俯视角，防止钻到地面以下
controls.minDistance = 20
controls.maxDistance = 300

// ─────────────────────────────────────────────
// 单纯形 Noise 实现（内联，无依赖）
// ─────────────────────────────────────────────
class SimplexNoise {
  constructor(seed = 1) {
    this.p = new Uint8Array(256)
    for (let i = 0; i < 256; i++) this.p[i] = i
    // Fisher-Yates 洗牌，基于种子
    let s = seed
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647
      const j = s % (i + 1);
      [this.p[i], this.p[j]] = [this.p[j], this.p[i]]
    }
    this.perm = new Uint8Array(512)
    for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255]
  }

  // 2D Simplex Noise，返回 [-1, 1]
  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1)
    const G2 = (3 - Math.sqrt(3)) / 6
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const t = (i + j) * G2
    const X0 = i - t, Y0 = j - t
    const x0 = x - X0, y0 = y - Y0
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2
    const ii = i & 255, jj = j & 255
    const grad = (h, x, y) => {
      const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
      const v = g[h % 8]
      return v[0] * x + v[1] * y
    }
    let n0 = 0, n1 = 0, n2 = 0
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * grad(this.perm[ii + this.perm[jj]], x0, y0) }
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * grad(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1) }
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * grad(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2) }
    return 70 * (n0 + n1 + n2)
  }
}

const noise = new SimplexNoise(42) // 固定种子，保证地形可复现

// ─────────────────────────────────────────────
// 地形参数配置
// ─────────────────────────────────────────────
const TERRAIN_SIZE = 200        // 地形世界尺寸（单位）
const SEGMENTS_LOD = [128, 64, 32, 16]  // LOD 层级：最密 → 最疏
const HEIGHT_SCALE = 18          // 地形起伏强度
const NOISE_SCALE = 0.03         // 噪声频率（越小越平缓）

// ─────────────────────────────────────────────
// 高度→颜色映射（多色高度带）
// ─────────────────────────────────────────────
function getHeightColor(h) {
  const maxH = HEIGHT_SCALE * 1.5
  const t = (h + HEIGHT_SCALE) / (maxH + HEIGHT_SCALE) // 归一化到 [0, 1]
  if (t < 0.25) return 0x1a5f7a  // 深海：深蓝
  if (t < 0.30) return 0x2980b9  // 浅水：浅蓝
  if (t < 0.35) return 0xf0d9a0  // 沙滩：沙黄
  if (t < 0.55) return 0x27ae60  // 草地：翠绿
  if (t < 0.70) return 0x7f8c8d  // 岩石：灰色
  if (t < 0.85) return 0xbdc3c7  // 高山碎石
  return 0xecf0f1                  // 雪顶：近白
}

// ─────────────────────────────────────────────
// 生成带噪声高度的 PlaneGeometry
// ─────────────────────────────────────────────
function buildTerrainGeo(segments, lodIndex) {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)
  const pos = geo.attributes.position

  for (let j = 0; j < pos.count; j++) {
    const x = pos.getX(j)
    const y = pos.getY(j)

    // 多层噪声叠加：底层大范围地形 + 细表层纹理
    let h = noise.noise2D(x * NOISE_SCALE, y * NOISE_SCALE) * HEIGHT_SCALE
    h += noise.noise2D(x * NOISE_SCALE * 3, y * NOISE_SCALE * 3) * (HEIGHT_SCALE * 0.25)
    h += noise.noise2D(x * NOISE_SCALE * 8, y * NOISE_SCALE * 8) * (HEIGHT_SCALE * 0.08)

    // 边缘衰减：让地形边缘平滑过渡到0，避免硬边界
    const nx = x / (TERRAIN_SIZE * 0.5)
    const ny = y / (TERRAIN_SIZE * 0.5)
    const edge = Math.max(0, 1 - Math.sqrt(nx * nx + ny * ny) * 0.9)
    h *= edge

    pos.setZ(j, h)
  }

  geo.computeVertexNormals()
  return geo
}

// ─────────────────────────────────────────────
// 构建多层 LOD 地形网格
// ─────────────────────────────────────────────
const lodMeshes = []

SEGMENTS_LOD.forEach((seg, i) => {
  const geo = buildTerrainGeo(seg, i)

  // 为当前 LOD 层级根据高度设置顶点颜色（多色高度带效果）
  const pos = geo.attributes.position
  const count = pos.count
  const colors = new Float32Array(count * 3)

  for (let j = 0; j < count; j++) {
    const h = pos.getZ(j)
    const col = new THREE.Color(getHeightColor(h))
    colors[j * 3] = col.r
    colors[j * 3 + 1] = col.g
    colors[j * 3 + 2] = col.b
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  // flatShading = true 使每个面片独立着色，强化低多边形风格
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,  // 启用顶点颜色插值
    flatShading: true,    // 关键：面片化着色，强化多边形棱角
    roughness: 0.85,
    metalness: 0.05,
    wireframe: false,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2           // 从 XY 平面转为 XZ 水平面
  mesh.position.y = i * 0.3                 // 每层 LOD 略微抬升，便于观察层级差异
  mesh.receiveShadow = true
  mesh.castShadow = true
  scene.add(mesh)
  lodMeshes.push(mesh)
})

// ─────────────────────────────────────────────
// 简化 LOD 指示标签（纯色半透明平面，仅最高 LOD 层可见）
// ─────────────────────────────────────────────
const wireMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.08
})
const baseGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 1, 1)
const wireMesh = new THREE.Mesh(baseGeo, wireMat)
wireMesh.rotation.x = -Math.PI / 2
wireMesh.position.y = 0.05
scene.add(wireMesh)

// ─────────────────────────────────────────────
// 灯光系统
// ─────────────────────────────────────────────
// 环境光：柔和全局照明
const ambient = new THREE.AmbientLight(0xffeedd, 0.6)
scene.add(ambient)

// 太阳方向光：制造立体感 + 阴影
const sun = new THREE.DirectionalLight(0xfff5cc, 1.2)
sun.position.set(80, 120, 60)
sun.castShadow = true
sun.shadow.mapSize.width = 2048
sun.shadow.mapSize.height = 2048
sun.shadow.camera.near = 10
sun.shadow.camera.far = 400
sun.shadow.camera.left = -120
sun.shadow.camera.right = 120
sun.shadow.camera.top = 120
sun.shadow.camera.bottom = -120
sun.shadow.bias = -0.001
scene.add(sun)

// 补光：从相机方向打过来，减少死黑
const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3)
fillLight.position.set(-camera.position.x, camera.position.y, -camera.position.z)
scene.add(fillLight)

// ─────────────────────────────────────────────
// 窗口自适应
// ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})

// ─────────────────────────────────────────────
// 动画循环
// ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate)
  controls.update()       // 更新 OrbitControls（含阻尼）

  // LOD 层缓慢上下浮动，便于观察层级差异
  const t = performance.now() * 0.001
  lodMeshes.forEach((m, i) => {
    m.position.y = (i * 0.3) + Math.sin(t * 0.5 + i * 0.8) * 0.3
  })

  renderer.render(scene, camera)
}

animate()

// ─────────────────────────────────────────────
// 提示信息
// ─────────────────────────────────────────────
console.log('【2091】程序化地形 LOD | 拖拽旋转 | 滚轮缩放 | 右键平移')
console.log('LOD 层级（从上到下）：128段 → 64段 → 32段 → 16段')
console.log('高度带：深海 → 浅水 → 沙滩 → 草地 → 岩石 → 雪顶')
