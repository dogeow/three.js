import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x07090f)
scene.fog = new THREE.FogExp2(0x07090f, 0.045)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4, 13)
camera.lookAt(0, 0.5, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.target.set(0, 0.5, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.3))

const keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
keyLight.position.set(6, 9, 5)
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0x6366f1, 0.5)
fillLight.position.set(-5, 3, -4)
scene.add(fillLight)

const rimLight = new THREE.PointLight(0xf472b6, 8, 20)
rimLight.position.set(-3, 4, 3)
scene.add(rimLight)

const accentLight = new THREE.PointLight(0x34d399, 6, 18)
accentLight.position.set(3, 2, -3)
scene.add(accentLight)

// 地面网格
const grid = new THREE.GridHelper(24, 24, 0x1e293b, 0x111827)
grid.position.y = -2.2
scene.add(grid)

// ============ GUI 参数 ============
const params = {
  viewMode: 'Normal',
  transmission: 0.7,
  rotationSpeed: 0.3,
  showWireframes: true,
  thickness: 0.1,
  ior: 1.5,
}

// ============ 通用材质工厂 ============

function makeGlassMaterial(color, emissive) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity: 0.15,
    metalness: 0.0,
    roughness: 0.05,
    transmission: params.transmission,
    thickness: params.thickness,
    ior: params.ior,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
  })
}

function makeSolidMaterial(color, emissive) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity: 0.2,
    metalness: 0.3,
    roughness: 0.3,
  })
}

function makeWireframeMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  })
}

// ============ 统一更新函数 ============
function applyViewMode(mode) {
  const isWire = mode === 'Wireframe'
  const isTrans = mode === 'Transparent Cutout'

  groups.forEach((g, gi) => {
    g.traverse(obj => {
      if (!obj.isMesh) return

      // 原始材质存在 userData 中
      const orig = obj.userData.originalMaterial
      if (!orig) return

      if (isWire) {
        obj.material = makeWireframeMaterial(wireColors[gi])
        obj.visible = true
      } else if (isTrans) {
        const m = orig.clone()
        m.transmission = params.transmission
        m.opacity = 1.0
        m.thickness = params.thickness
        m.ior = params.ior
        obj.material = m
        obj.visible = true
      } else {
        obj.material = orig.clone()
        if (obj.userData.solidColor) {
          obj.material.color.set(obj.userData.solidColor)
          obj.material.emissive.set(obj.userData.solidEmissive)
          obj.material.transmission = 0
          obj.material.metalness = 0.3
          obj.material.roughness = 0.3
        }
        obj.visible = true
      }
    })
  })
}

function updateTransmission(val) {
  if (params.viewMode !== 'Transparent Cutout') return
  groups.forEach((g) => {
    g.traverse(obj => {
      if (!obj.isMesh) return
      if (obj.material.transmission !== undefined) {
        obj.material.transmission = val
        obj.material.thickness = params.thickness
        obj.material.ior = params.ior
      }
    })
  })
}

// ============ 创建三组布尔运算演示 ============

const groups = []
const wireColors = ['#7dd3fc', '#fb7185', '#4ade80']

// --- 组 0: UNION 并集 ---
// 展示：torus knot + sphere 嵌套/融合在一起（视觉上类似 union）
{
  const g = new THREE.Group()
  g.position.x = -6.5
  g.position.y = 0.5
  scene.add(g)
  groups.push(g)

  // 外层 torusKnot — 大
  const outerMat = makeGlassMaterial(0x0ea5e9, 0x0369a1)
  outerMat.userData = { solidColor: 0x3b82f6, solidEmissive: 0x1d4ed8 }
  const outer = new THREE.Mesh(new THREE.TorusKnotGeometry(1.1, 0.38, 120, 20), outerMat)
  g.add(outer)

  // 内层 sphere — 嵌在里面
  const innerMat = makeSolidMaterial(0xfbbf24, 0x92400e)
  innerMat.userData = { solidColor: 0xf59e0b, solidEmissive: 0x78350f }
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), innerMat)
  g.add(inner)

  // 外壳半透明 ring — 强调 union 形状
  const ringMat = makeGlassMaterial(0x818cf8, 0x4338ca)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 20, 60), ringMat)
  ring.rotation.x = Math.PI / 2
  g.add(ring)
}

// --- 组 1: SUBTRACTION 差集 ---
// 展示：大圆柱内部挖掉 4 个小圆柱（模拟 subtraction 效果）
{
  const g = new THREE.Group()
  g.position.x = 0
  g.position.y = 0.5
  scene.add(g)
  groups.push(g)

  // 主圆柱（外层透明）
  const cylMat = makeGlassMaterial(0xf43f5e, 0xbe123c)
  cylMat.userData = { solidColor: 0xef4444, solidEmissive: 0x991b1b }
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.8, 48), cylMat)
  g.add(cylinder)

  // 挖去的 4 个小圆柱 — solid 颜色显示"被减去"的部分
  const holeR = 0.32
  const holeDist = 0.55
  const holeMat = makeSolidMaterial(0xfde68a, 0x92400e)
  holeMat.userData = { solidColor: 0xfacc15, solidEmissive: 0x78350f }

  const h1 = new THREE.Mesh(new THREE.CylinderGeometry(holeR, holeR, 3.2, 24), holeMat)
  h1.position.set(holeDist, 0, 0)
  g.add(h1)

  const h2 = new THREE.Mesh(new THREE.CylinderGeometry(holeR, holeR, 3.2, 24), holeMat)
  h2.position.set(-holeDist, 0, 0)
  g.add(h2)

  const h3 = new THREE.Mesh(new THREE.CylinderGeometry(holeR, holeR, 3.2, 24), holeMat)
  h3.position.set(0, 0, holeDist)
  g.add(h3)

  const h4 = new THREE.Mesh(new THREE.CylinderGeometry(holeR, holeR, 3.2, 24), holeMat)
  h4.position.set(0, 0, -holeDist)
  g.add(h4)

  // 加一个小横杆穿过（进一步说明挖空）
  const barMat = makeGlassMaterial(0x38bdf8, 0x0284c7)
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 12), barMat)
  bar.rotation.z = Math.PI / 2
  bar.position.y = 0.6
  g.add(bar)
}

// --- 组 2: INTERSECTION 交集 ---
// 展示：box 和 sphere 的交集区域 — 用半透明 box 包裹 sphere，叠加显示重叠
{
  const g = new THREE.Group()
  g.position.x = 6.5
  g.position.y = 0.5
  scene.add(g)
  groups.push(g)

  // 外层 box — 透明
  const boxMat = makeGlassMaterial(0x4ade80, 0x15803d)
  boxMat.userData = { solidColor: 0x22c55e, solidEmissive: 0x14532d }
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.0), boxMat)
  box.rotation.y = Math.PI / 6
  g.add(box)

  // 内层 sphere — solid，强调交集区域
  const sphereMat = makeSolidMaterial(0xa78bfa, 0x5b21b6)
  sphereMat.userData = { solidColor: 0x8b5cf6, solidEmissive: 0x4c1d95 }
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 32), sphereMat)
  g.add(sphere)

  // 交集区域指示：更小的内嵌八面体
  const interMat = makeSolidMaterial(0xfbbf24, 0x92400e)
  interMat.userData = { solidColor: 0xfacc15, solidEmissive: 0x78350f }
  const octa = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), interMat)
  g.add(octa)
}

// ============ GUI ============
const gui = new GUI({ title: 'CSG 布尔控制' })

gui.add(params, 'viewMode', ['Normal', 'Wireframe', 'Transparent Cutout'])
  .name('显示模式')
  .onChange(applyViewMode)

gui.add(params, 'transmission', 0, 1, 0.01)
  .name('透明度')
  .onChange(updateTransmission)

gui.add(params, 'thickness', 0, 0.5, 0.01)
  .name('材质厚度')
  .onChange(v => {
    if (params.viewMode === 'Transparent Cutout') {
      groups.forEach(g => g.traverse(obj => {
        if (obj.isMesh && obj.material.transmission !== undefined) {
          obj.material.thickness = v
        }
      }))
    }
  })

gui.add(params, 'ior', 1.0, 2.5, 0.01)
  .name('折射率 IOR')
  .onChange(v => {
    if (params.viewMode === 'Transparent Cutout') {
      groups.forEach(g => g.traverse(obj => {
        if (obj.isMesh && obj.material.transmission !== undefined) {
          obj.material.ior = v
        }
      }))
    }
  })

gui.add(params, 'rotationSpeed', 0, 1.5, 0.01)
  .name('旋转速度')

gui.add(params, 'showWireframes')
  .name('显示线框')
  .onChange(val => {
    // 单独控制辅助线框
    if (val) {
      groups.forEach((g, i) => {
        g.userData.helper && (g.userData.helper.visible = true)
      })
    } else {
      groups.forEach(g => {
        g.userData.helper && (g.userData.helper.visible = false)
      })
    }
  })

// 给每组添加辅助轮廓线
groups.forEach((g, i) => {
  const helperGeo = new THREE.TorusKnotGeometry(1.4, 0.01, 80, 8)
  // 每个组共用近似辅助线
  const helperMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(wireColors[i]),
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  })
  const helper = new THREE.LineSegments(new THREE.WireframeGeometry(helperGeo), helperMat)
  helper.visible = params.showWireframes
  g.userData.helper = helper
  scene.add(helper)
})

// ============ 渲染循环 ============
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // 每组自转
  groups.forEach((g, i) => {
    const speed = params.rotationSpeed * 0.4
    g.rotation.y = t * speed + i * (Math.PI * 2 / 3)
    g.rotation.x = Math.sin(t * speed * 0.5 + i) * 0.3

    // 辅助线框跟随
    if (g.userData.helper) {
      g.userData.helper.position.copy(g.position)
      g.userData.helper.rotation.copy(g.rotation)
    }
  })

  controls.update()
  renderer.render(scene, camera)
}
animate()

// ============ 响应式 ============
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})