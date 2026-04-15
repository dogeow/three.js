// ============================================================
// 2093. 软体布料模拟（增强版）
// 弹簧-质点布料模拟 + 多固定点 + 球体碰撞 + OrbitControls
// Three.js r160
// ============================================================
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ------------------------------------------------------------
// 场景初始化
// ------------------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

// 相机设置
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 5, 22)

// 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// 轨道控制器
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// ------------------------------------------------------------
// 布料参数配置
// ------------------------------------------------------------
const COLS = 22          // 布料横向质点数
const ROWS = 22          // 布料纵向质点数
const REST_DIST = 0.45   // 质点间自然距离
const GRAVITY = -0.0008  // 重力加速度
const DAMPING = 0.98     // 速度阻尼（抑制震荡）
const CONSTRAINT_ITER = 6 // 约束求解迭代次数

// ------------------------------------------------------------
// 质点与约束定义
// ------------------------------------------------------------
const particles = []
const constraints = []

// 创建布料质点网格
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const px = (x - COLS / 2) * REST_DIST
    const py = 6                           // 布料初始高度
    const pz = (y - ROWS / 2) * REST_DIST

    // 多固定点策略：四角 + 上边每隔3个点固定
    const pinned =
      y === 0 && (x === 0 || x === COLS - 1 || x % 3 === 0)

    particles.push({
      x: px, y: py, z: pz,    // 当前帧位置
      px: px, py: py, pz: pz, // 上一帧位置（Verlet）
      pinned,
    })
  }
}

// 创建结构约束（水平 + 垂直弹簧）
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const i = y * COLS + x
    if (x < COLS - 1) constraints.push([i, i + 1, REST_DIST])       // 水平弹簧
    if (y < ROWS - 1) constraints.push([i, i + COLS, REST_DIST])    // 垂直弹簧
  }
}

// ------------------------------------------------------------
// Three.js 几何体构建
// ------------------------------------------------------------
const posArr = new Float32Array(COLS * ROWS * 3)
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))

// 布料面片索引（两组三角面构成四边形网格）
const indices = []
for (let y = 0; y < ROWS - 1; y++) {
  for (let x = 0; x < COLS - 1; x++) {
    const a = y * COLS + x
    const b = a + 1
    const c = a + COLS
    const d = c + 1
    indices.push(a, b, c, b, d, c)
  }
}
geo.setIndex(indices)

// 布料网格材质（半透明红色布料）
const clothMesh = new THREE.Mesh(
  geo,
  new THREE.MeshPhongMaterial({
    color: 0xcc2233,
    side: THREE.DoubleSide,
    shininess: 40,
  })
)
clothMesh.visible = true
scene.add(clothMesh)

// 布料线框（调试/可视化）
const wireMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.15,
})
scene.add(new THREE.Mesh(geo, wireMat))

// ------------------------------------------------------------
// 碰撞球体
// ------------------------------------------------------------
const ballRadius = 2.5
const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32)
const ballMat = new THREE.MeshPhongMaterial({
  color: 0x4488ff,
  shininess: 80,
})
const ball = new THREE.Mesh(ballGeo, ballMat)
ball.position.set(0, 1, 0)
scene.add(ball)

// ------------------------------------------------------------
// 光照系统
// ------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.4))

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

const pointLight = new THREE.PointLight(0xff8844, 0.6, 50)
pointLight.position.set(-8, 10, -5)
scene.add(pointLight)

// ------------------------------------------------------------
// 布料物理更新（Verlet 积分 + 约束求解 + 球体碰撞）
// ------------------------------------------------------------
function updateCloth() {
  const W = ballRadius + 0.05

  // 1. Verlet 积分：计算每个自由质点的新位置
  for (const p of particles) {
    if (p.pinned) continue

    // 根据当前-上帧位置差推算速度，加上重力
    const vx = (p.x - p.px) * DAMPING
    const vy = (p.y - p.py) * DAMPING + GRAVITY
    const vz = (p.z - p.pz) * DAMPING

    // 存储当前位置为"上一帧"
    p.px = p.x
    p.py = p.y
    p.pz = p.z

    // 更新位置（Verlet 核心公式）
    p.x += vx
    p.y += vy
    p.z += vz

    // 2. 球体碰撞检测与响应
    const dx = p.x - ball.position.x
    const dy = p.y - ball.position.y
    const dz = p.z - ball.position.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist < W) {
      // 将质点推出球体表面
      const m = W / dist
      p.x = ball.position.x + dx * m
      p.y = ball.position.y + dy * m
      p.z = ball.position.z + dz * m
    }
  }

  // 3. 约束求解（多次迭代保证稳定性）
  for (let iter = 0; iter < CONSTRAINT_ITER; iter++) {
    for (const [ai, bi, rest] of constraints) {
      const pa = particles[ai]
      const pb = particles[bi]

      const dx = pb.x - pa.x
      const dy = pb.y - pa.y
      const dz = pb.z - pa.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < 0.0001) continue

      const diff = (dist - rest) / dist * 0.5

      if (!pa.pinned) {
        pa.x += dx * diff
        pa.y += dy * diff
        pa.z += dz * diff
      }
      if (!pb.pinned) {
        pb.x -= dx * diff
        pb.y -= dy * diff
        pb.z -= dz * diff
      }
    }
  }

  // 4. 将质点位置同步到 BufferGeometry 并重算法线
  for (let i = 0; i < particles.length; i++) {
    posArr[i * 3]     = particles[i].x
    posArr[i * 3 + 1] = particles[i].y
    posArr[i * 3 + 2] = particles[i].z
  }
  geo.attributes.position.needsUpdate = true
  geo.computeVertexNormals()
}

// ------------------------------------------------------------
// 球体轻微浮动动画（让碰撞效果更丰富）
// ------------------------------------------------------------
let time = 0
function animateBall() {
  time += 0.016
  ball.position.y = 1.0 + Math.sin(time * 0.8) * 0.5
}

// ------------------------------------------------------------
// 渲染循环
// ------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate)
  animateBall()
  updateCloth()
  controls.update()
  renderer.render(scene, camera)
}
animate()

// ------------------------------------------------------------
// 响应窗口尺寸变化
// ------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
