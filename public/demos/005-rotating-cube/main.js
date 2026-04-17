// 005. Rotating Cube — 把前面几步组合成完整的可交互场景
// 新技术点：在 OrbitControls 场景中叠加持续旋转动画
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// 场景
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)

// 相机
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(3, 3, 5)
camera.lookAt(0, 0, 0)

// 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

// 轨道控制器（鼠标拖拽旋转、滚轮缩放）
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// 光照：环境光（柔和照亮）+ 方向光（产生立体感）
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

// 立方体
const geometry = new THREE.BoxGeometry(2, 2, 2)
const material = new THREE.MeshStandardMaterial({ color: 0x00ffcc, roughness: 0.3, metalness: 0.2 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// 动画循环：每帧旋转一点点
function animate() {
  requestAnimationFrame(animate)
  // 旋转：绕 X 轴和 Y 轴持续旋转
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
  controls.update()  // 更新轨道控制器
  renderer.render(scene, camera)
}
animate()

// 窗口缩放
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
