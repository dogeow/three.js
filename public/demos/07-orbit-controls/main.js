import * as THREE from 'three'
// OrbitControls 在 examples/jsm/ 里，需要单独引入
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b132b)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(5, 5, 5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

// ============ 创建 OrbitControls ============
// 第二个参数是 DOM 元素，鼠标事件挂在它上面
const controls = new OrbitControls(camera, renderer.domElement)

// 阻尼：鼠标放开后还会缓慢减速，体验更顺滑
controls.enableDamping = true
controls.dampingFactor = 0.08

// 限制：只允许从上半球看，不让镜头穿到地下
controls.maxPolarAngle = Math.PI / 2 - 0.05

// 缩放距离限制
controls.minDistance = 2
controls.maxDistance = 20

// 控制围绕的目标点（默认是原点）
controls.target.set(0, 0.5, 0)

// ============ 灯光 ============
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 8, 5)
scene.add(light)

// ============ 场景内容 ============

// 网格地面（看 Orbit 旋转最直观）
const grid = new THREE.GridHelper(20, 20, 0x5c6b8c, 0x2c3e50)
scene.add(grid)

// 三轴辅助器：红=X 绿=Y 蓝=Z
scene.add(new THREE.AxesHelper(2))

// 中心放一个有意思的物体
const torus = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.8, 0.25, 200, 32),
  new THREE.MeshStandardMaterial({
    color: 0x5bc0eb,
    metalness: 0.5,
    roughness: 0.2
  })
)
torus.position.y = 1.2
scene.add(torus)

// ============ 渲染循环 ============
function animate() {
  requestAnimationFrame(animate)
  torus.rotation.y += 0.005
  controls.update() // ⚠️ 启用了 damping 必须每帧调用
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.controls = controls