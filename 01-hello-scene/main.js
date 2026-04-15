import * as THREE from 'three'

// ============ 1. 三件套：Scene / Camera / Renderer ============

// 场景：所有 3D 物体的容器
const scene = new THREE.Scene()

// 透视相机：模拟人眼，远小近大
// 参数：视野角度(FOV) | 宽高比 | 近裁剪面 | 远裁剪面
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.z = 3 // 把相机往后挪，否则会挤在物体里面看不到

// 渲染器：把场景画到 canvas 上
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio) // 高清屏不糊
document.body.appendChild(renderer.domElement)

// ============ 2. 创建一个立方体 ============

// 几何体：定义形状（顶点、面）
const geometry = new THREE.BoxGeometry(1, 1, 1)

// 材质：定义外观（颜色、贴图、光照响应方式）
// MeshBasicMaterial 不受光照影响，适合入门
const material = new THREE.MeshBasicMaterial({ color: 0x00ff88 })

// 网格 = 几何体 + 材质
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// ============ 3. 渲染循环 ============

function animate() {
  requestAnimationFrame(animate)

  // 每帧让立方体旋转一点点
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01

  renderer.render(scene, camera)
}
animate()

// ============ 4. 处理窗口缩放 ============

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix() // 改了相机参数后必须调用
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// 暴露到全局，方便在 DevTools 里调试，比如 cube.rotation.x = 0
window.cube = cube
window.camera = camera