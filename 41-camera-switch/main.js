import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.022)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const dirLight = new THREE.DirectionalLight(0xffffff, 1.6)
dirLight.position.set(8, 12, 6)
scene.add(dirLight)
const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.5)
fillLight.position.set(-6, 4, -8)
scene.add(fillLight)

// -- 地面网格 --
const gridHelper = new THREE.GridHelper(24, 24, 0x1e3a5f, 0x0f2040)
scene.add(gridHelper)

// -- 轴向标识 --
const axesHelper = new THREE.AxesHelper(6)
scene.add(axesHelper)

// -- 主体：旋转的几何体组合 --
const group = new THREE.Group()
scene.add(group)

// 主方块
const boxMesh = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.3, roughness: 0.4 })
)
group.add(boxMesh)

// 球体（偏移）
const sphereMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.75, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x34d399, metalness: 0.5, roughness: 0.2 })
)
sphereMesh.position.set(2.5, 0.5, 1)
group.add(sphereMesh)

// 圆环
const torusMesh = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.3, 20, 48),
  new THREE.MeshStandardMaterial({ color: 0xfb923c, metalness: 0.4, roughness: 0.3 })
)
torusMesh.position.set(-2.2, 0.5, -1.5)
group.add(torusMesh)

// 圆柱
const cylMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.5, 0.5, 2.5, 32),
  new THREE.MeshStandardMaterial({ color: 0xf472b6, metalness: 0.3, roughness: 0.3 })
)
cylMesh.position.set(0, 2.5, 2)
group.add(cylMesh)

// -- 环绕小圆球 --
const orbitGroup = new THREE.Group()
scene.add(orbitGroup)
for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2
  const r = 3.8
  const miniSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(i / 6, 0.85, 0.6),
      emissive: new THREE.Color().setHSL(i / 6, 0.85, 0.2),
      emissiveIntensity: 0.6
    })
  )
  miniSphere.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r)
  orbitGroup.add(miniSphere)
}

// =====================
// 三台相机
// =====================
const aspect = innerWidth / innerHeight

// 相机 0：正面透视
const camera0 = new THREE.PerspectiveCamera(52, aspect, 0.1, 200)
camera0.position.set(10, 5, 12)
camera0.lookAt(0, 1, 0)

// 相机 1：俯视透视（鸟瞰）
const camera1 = new THREE.PerspectiveCamera(52, aspect, 0.1, 200)
camera1.position.set(0, 14, 0.01)
camera1.lookAt(0, 0, 0)

// 相机 2：正交侧视
const frustumSize = 12
const camera2 = new THREE.OrthographicCamera(
  -frustumSize * aspect / 2, frustumSize * aspect / 2,
  frustumSize / 2, -frustumSize / 2,
  0.1, 200
)
camera2.position.set(14, 3, 0)
camera2.lookAt(0, 1, 0)

const cameras = [camera0, camera1, camera2]

// =====================
// 渲染器
// =====================
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

// =====================
// OrbitControls（仅绑定当前活动相机）
// =====================
let activeIndex = 0
const controls = new OrbitControls(camera0, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1, 0)
controls.update()

// =====================
// 视口布局
// =====================
// 布局：上方左右各半屏，底部横跨全宽
// viewportN: { x, y, w, h }  — 归一化 0~1，渲染时乘以实际像素
const layouts = [
  { x: 0,   y: 0.5, w: 0.5, h: 0.5 },  // 左上
  { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },  // 右上
  { x: 0,   y: 0,   w: 1.0, h: 0.5 },  // 底部
]

const borderColors = [0x60a5fa, 0x34d399, 0xfb923c]
const labelTexts  = ['正面视角', '俯视视角', '侧视正交']

// 创建视口边框和标签
const vportBorders = []
const vportLabels  = []
layouts.forEach((layout, i) => {
  const border = document.createElement('div')
  border.className = 'viewport-border'
  border.style.cssText = `
    left: ${layout.x * 100}%; top: ${layout.y * 100}%;
    width: ${layout.w * 100}%; height: ${layout.h * 100}%;
    border: 3px solid #${borderColors[i].toString(16).padStart(6, '0')};
    box-sizing: border-box;
    opacity: 0.55;
  `
  document.body.appendChild(border)
  vportBorders.push(border)

  const label = document.createElement('div')
  label.className = 'viewport-label'
  label.textContent = labelTexts[i]
  label.style.cssText = `
    left: ${layout.x * 100}%; top: ${(layout.y + layout.h) * 100}%;
    transform: translate(-50%, -110%);
    background: #${borderColors[i].toString(16).padStart(6, '0')};
    color: #000;
  `
  document.body.appendChild(label)
  vportLabels.push(label)
})

// =====================
// 切换相机按钮
// =====================
const btns = document.querySelectorAll('.cam-btn')
btns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const idx = Number(btn.dataset.cam)
    switchCamera(idx)
  })
})

function switchCamera(idx) {
  // 保存当前相机的状态
  const prev = cameras[activeIndex]
  prev.position.copy(controls.object.position)
  prev.quaternion.copy(controls.object.quaternion)
  // 更新 target
  prev.userData.target = prev.userData.target || new THREE.Vector3()
  prev.userData.target.copy(controls.target)

  activeIndex = idx
  const next = cameras[idx]

  // 恢复状态到新相机
  next.position.copy(prev.position)
  next.quaternion.copy(prev.quaternion)
  controls.object = next
  controls.target.copy(prev.userData.target || new THREE.Vector3(0, 1, 0))
  controls.update()

  // 更新按钮高亮
  btns.forEach((b, i) => {
    b.classList.toggle('active', i === idx)
  })
}

// 为相机存储 target
cameras.forEach((cam) => {
  cam.userData.target = new THREE.Vector3(0, 1, 0)
})
cameras[0].userData.target.set(0, 1, 0)

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  group.rotation.y = t * 0.35
  orbitGroup.rotation.y = t * 0.5

  controls.update()

  const w = innerWidth
  const h = innerHeight

  // 清除并重置
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, w, h)
  renderer.setScissor(0, 0, w, h)
  renderer.setClearColor(0x0a0a1a)
  renderer.clear()
  renderer.setScissorTest(true)

  // 为每个视口渲染
  layouts.forEach((layout, i) => {
    const vx = Math.floor(layout.x * w)
    const vy = Math.floor(layout.y * h)
    const vw = Math.floor(layout.w * w)
    const vh = Math.floor(layout.h * h)

    renderer.setViewport(vx, vy, vw, vh)
    renderer.setScissor(vx, vy, vw, vh)

    const cam = cameras[i]
    if (i === 2) {
      // 正交相机需随窗口更新 frustum
      cam.left   = -frustumSize * (vw / vh) / 2
      cam.right  =  frustumSize * (vw / vh) / 2
      cam.top    =  frustumSize / 2
      cam.bottom = -frustumSize / 2
      cam.updateProjectionMatrix()
    } else {
      cam.aspect = vw / vh
      cam.updateProjectionMatrix()
    }

    renderer.setClearColor(0x0a0a1a)
    renderer.clear()
    renderer.render(scene, cam)
  })

  renderer.setScissorTest(false)
}
animate()

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})