import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a12)

// 添加淡淡雾效增强层次感
scene.fog = new THREE.FogExp2(0x0a0a12, 0.05)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 6, 14)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06

// ============ 网格地面 ============
const grid = new THREE.GridHelper(40, 40, 0x1a1a2e, 0x111122)
scene.add(grid)

// ============ 辅助文字标签（用球体代替） ============
// 为了简单起见，每个混合模式组里放一个球作为中心指示
const sphereGeo = new THREE.SphereGeometry(0.25, 32, 32)

// ============ 定义 5 种混合模式配置 ============
const blendingModes = [
  {
    name: 'Normal',
    blending: THREE.NormalBlending,
    label: 'NormalBlending',
    desc: '默认',
    planes: [
      { color: 0xff4466, opacity: 0.65, offset: [-0.55, 0.3, 0] },
      { color: 0x44aaff, opacity: 0.65, offset: [0.55, -0.3, 0] },
    ]
  },
  {
    name: 'Additive',
    blending: THREE.AdditiveBlending,
    label: 'AdditiveBlending',
    desc: '加法',
    planes: [
      { color: 0xff6600, opacity: 0.6, offset: [-0.55, 0.3, 0] },
      { color: 0xff00cc, opacity: 0.6, offset: [0.55, -0.3, 0] },
      { color: 0x00ffcc, opacity: 0.5, offset: [0, 0.4, 0] },
    ]
  },
  {
    name: 'Multiply',
    blending: THREE.MultiplyBlending,
    label: 'MultiplyBlending',
    desc: '正片叠底',
    planes: [
      { color: 0x9966cc, opacity: 0.7, offset: [-0.55, 0.3, 0] },
      { color: 0x66cc99, opacity: 0.7, offset: [0.55, -0.3, 0] },
    ]
  },
  {
    name: 'Subtractive',
    blending: THREE.SubtractiveBlending,
    label: 'SubtractiveBlending',
    desc: '减去',
    planes: [
      { color: 0xffcc44, opacity: 0.65, offset: [-0.55, 0.3, 0] },
      { color: 0x44ffcc, opacity: 0.65, offset: [0.55, -0.3, 0] },
    ]
  },
  {
    name: 'Screen',
    blending: THREE.ScreenBlending,
    label: 'ScreenBlending',
    desc: '滤色',
    planes: [
      { color: 0xff3366, opacity: 0.6, offset: [-0.55, 0.3, 0] },
      { color: 0x33aaff, opacity: 0.6, offset: [0.55, -0.3, 0] },
      { color: 0xffcc00, opacity: 0.5, offset: [0, 0.4, 0] },
    ]
  }
]

const planeGeo = new THREE.PlaneGeometry(1.6, 1.6)
const group = new THREE.Group()
scene.add(group)

// 5 个混合模式，从左到右排列
const spacing = 5
const startX = -((blendingModes.length - 1) * spacing) / 2

blendingModes.forEach((mode, i) => {
  const col = new THREE.Group()

  mode.planes.forEach(p => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(p.color),
      transparent: true,
      opacity: p.opacity,
      blending: mode.blending,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const mesh = new THREE.Mesh(planeGeo, mat)
    mesh.position.set(p.offset[0], p.offset[1], p.offset[2])
    mesh.rotation.x = -Math.PI / 4 + Math.random() * 0.1
    mesh.rotation.y = Math.random() * 0.2
    col.add(mesh)
  })

  // 中心小指示球
  const sphereMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(mode.planes[0].color),
    transparent: true,
    opacity: 0.9,
    blending: mode.blending
  })
  const sphere = new THREE.Mesh(sphereGeo, sphereMat)
  col.add(sphere)

  // 标签：用球体旁边的文字 plane 模拟
  col.position.x = startX + i * spacing
  col.position.y = 0
  col.position.z = 0
  group.add(col)
})

// 添加一些围绕旋转的装饰粒子（用 Points）
function makeCircleSprite() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0.0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.4)')
  grad.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const particlesGeo = new THREE.BufferGeometry()
const pCount = 2000
const pPos = new Float32Array(pCount * 3)
const pCol = new Float32Array(pCount * 3)
for (let i = 0; i < pCount; i++) {
  pPos[i * 3]     = (Math.random() - 0.5) * 30
  pPos[i * 3 + 1] = (Math.random() - 0.5) * 20
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 20
  const c = new THREE.Color().setHSL(Math.random() * 0.3 + 0.5, 0.8, 0.7)
  pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
particlesGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3))
const particlesMat = new THREE.PointsMaterial({
  size: 0.06,
  map: makeCircleSprite(),
  vertexColors: true,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
})
scene.add(new THREE.Points(particlesGeo, particlesMat))

// ============ 渲染循环 ============
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // 每组平面缓慢上下浮动
  group.children.forEach((col, i) => {
    col.position.y = Math.sin(t * 0.8 + i * 0.9) * 0.5
    col.rotation.y = Math.sin(t * 0.5 + i * 1.2) * 0.3
  })

  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})