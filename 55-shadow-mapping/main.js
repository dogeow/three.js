import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

// ============================================================
// 三种 shadow type 对比：每种类型需要一个独立的 renderer
// ============================================================
const TYPES = [
  { id: 'basic', type: THREE.BasicShadowMap, label: 'BasicShadowMap' },
  { id: 'pcf',   type: THREE.PCFShadowMap,   label: 'PCFShadowMap' },
  { id: 'soft',  type: THREE.PCFSoftShadowMap, label: 'PCFSoftShadowMap' },
]

const SHADOW_SIZES = [512, 1024, 2048, 4096]

// 全局参数（由 lil-gui 控制）
const params = {
  shadowSize: 1024,
  directionalCast: true,
  pointCast: true,
}

// 每个视图的 renderers / scenes / cameras
const views = {}

TYPES.forEach(({ id, type }) => {
  const container = document.getElementById(`view-${id}`)

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = type
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111118)

  // Camera（三个相机共享同一个 OrbitControls 状态）
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.set(5, 6, 10)
  camera.lookAt(0, 0, 0)

  views[id] = { renderer, scene, camera, container }
})

// 统一使用第一个场景的背景雾效
views.basic.scene.fog = new THREE.Fog(0x111118, 18, 40)
views.pcf.scene.fog   = new THREE.Fog(0x111118, 18, 40)
views.soft.scene.fog  = new THREE.Fog(0x111118, 18, 40)

// ============================================================
// 共享的 OrbitControls（控制第一个 camera，其他跟随）
// ============================================================
const controls = new OrbitControls(views.basic.camera, views.basic.renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.07
controls.target.set(0, 0.5, 0)
controls.update()

// 当 orbit 移动时，同步所有相机的位置和目标
function syncCameras() {
  TYPES.forEach(({ id }) => {
    if (id === 'basic') return
    const src = views.basic.camera
    const dst = views[id].camera
    dst.position.copy(src.position)
    dst.quaternion.copy(src.quaternion)
    dst.updateProjectionMatrix()
  })
}

controls.addEventListener('change', syncCameras)

// ============================================================
// 光照
// ============================================================
TYPES.forEach(({ id }) => {
  const scene = views[id].scene

  // 环境光（极低，让阴影更明显）
  scene.add(new THREE.AmbientLight(0xffffff, 0.08))

  // 平行光（主光源，投射硬阴影）
  const dirLight = new THREE.DirectionalLight(0xfff4e0, 2.2)
  dirLight.position.set(4, 9, 5)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(params.shadowSize, params.shadowSize)
  dirLight.shadow.camera.near = 0.1
  dirLight.shadow.camera.far = 30
  dirLight.shadow.camera.left = -7
  dirLight.shadow.camera.right = 7
  dirLight.shadow.camera.top = 7
  dirLight.shadow.camera.bottom = -7
  dirLight.shadow.bias = -0.001
  scene.add(dirLight)
  views[id].dirLight = dirLight

  // 点光源（也投射阴影，展示点光源阴影贴图）
  const pointLight = new THREE.PointLight(0x60a5fa, 6, 12)
  pointLight.position.set(-2.5, 3.5, -1)
  pointLight.castShadow = true
  pointLight.shadow.mapSize.set(params.shadowSize / 2, params.shadowSize / 2)
  pointLight.shadow.camera.near = 0.1
  pointLight.shadow.camera.far = 15
  pointLight.shadow.bias = -0.002
  scene.add(pointLight)
  views[id].pointLight = pointLight

  // 点光源灯泡（发光小球表示位置）
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa })
  )
  bulb.position.copy(pointLight.position)
  scene.add(bulb)
})

// ============================================================
// 物体：地面 + 几个几何体（同位置出现在三个场景）
// ============================================================
const OBJECT_Y = 0.0

function buildObjects(scene) {
  // 地面
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.9, metalness: 0.05 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = OBJECT_Y
  ground.receiveShadow = true
  scene.add(ground)

  // 材质配色
  const palette = [0xf87171, 0xfb923c, 0xfbbf24, 0x4ade80, 0x60a5fa, 0xc084fc]

  // 排列：左前方几个小几何体
  const positions = [
    [-2.2, 0,  1.5],
    [-0.8, 0,  1.5],
    [ 0.6, 0,  1.5],
    [ 2.0, 0,  1.5],
    [-1.5, 0, -0.2],
    [ 0.2, 0, -0.2],
    [ 1.8, 0, -0.2],
    [-0.6, 0,  3.2],
    [ 1.0, 0,  3.2],
  ]

  const sizes = [0.55, 0.5, 0.6, 0.5, 0.5, 0.55, 0.5, 0.45, 0.5]

  positions.forEach((pos, i) => {
    const geo = i % 3 === 0
      ? new THREE.BoxGeometry(sizes[i], sizes[i] * 1.6, sizes[i])
      : i % 3 === 1
        ? new THREE.SphereGeometry(sizes[i] * 0.75, 24, 24)
        : new THREE.CylinderGeometry(sizes[i] * 0.5, sizes[i] * 0.5, sizes[i] * 1.6, 24)

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: palette[i % palette.length],
        roughness: 0.45,
        metalness: 0.25,
      })
    )
    mesh.position.set(pos[0], OBJECT_Y + sizes[i] * 0.8, pos[2])
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
  })
}

TYPES.forEach(({ id }) => buildObjects(views[id].scene))

// ============================================================
// lil-gui
// ============================================================
const gui = new GUI({ title: '阴影贴图控制' })

gui.add(params, 'shadowSize', SHADOW_SIZES, '阴影贴图分辨率')
  .name('Shadow Map Size')
  .onChange((val) => {
    TYPES.forEach(({ id }) => {
      views[id].dirLight.shadow.mapSize.set(val, val)
      views[id].pointLight.shadow.mapSize.set(val / 2, val / 2)
      // 触发阴影贴图重新渲染
      if (views[id].renderer.shadowMap.active) {
        views[id].renderer.shadowMap.needsUpdate = true
      }
    })
  })

gui.add(params, 'directionalCast').name('平行光阴影')

gui.add(params, 'pointCast').name('点光阴影')

// ============================================================
// 渲染循环
// ============================================================
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  controls.update()

  // 同步点光源灯泡闪烁
  const t = clock.getElapsedTime()
  const pulse = 0.85 + 0.15 * Math.sin(t * 3)
  TYPES.forEach(({ id }) => {
    views[id].pointLight.intensity = params.pointCast ? 6 * pulse : 0
  })

  // 三个 renderer 分别渲染
  TYPES.forEach(({ id }) => {
    views[id].renderer.render(views[id].scene, views[id].camera)
  })
}
animate()

// ============================================================
// 窗口尺寸变化时重新布局
// ============================================================
window.addEventListener('resize', () => {
  TYPES.forEach(({ id }) => {
    const vw = views[id].container.clientWidth
    const vh = views[id].container.clientHeight
    views[id].camera.aspect = vw / vh
    views[id].camera.updateProjectionMatrix()
    views[id].renderer.setSize(vw, vh)
  })
})