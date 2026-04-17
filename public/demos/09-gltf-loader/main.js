import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// GLTFLoader 用来加载 .gltf / .glb 格式的模型，是行业标准
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xd8e2ef)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(4, 3, 5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// ============ 灯光 ============
scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const dir = new THREE.DirectionalLight(0xffffff, 1.2)
dir.position.set(5, 8, 5)
dir.castShadow = true
scene.add(dir)

// ============ 地面 ============
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0xe7eef7 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = 0
ground.receiveShadow = true
scene.add(ground)

// ============ 加载模型 ============
const status = document.getElementById('status')
const loader = new GLTFLoader()

// 经典示例模型：小鸭子
const URL = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Duck/glTF-Binary/Duck.glb'

loader.load(
  URL,
  // 加载成功
  (gltf) => {
    const model = gltf.scene
    // 缩放到合适大小
    model.scale.set(1, 1, 1)
    model.position.y = 0
    // 让所有子网格都投阴影
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    scene.add(model)
    window.duck = model
    status.textContent = '✅ 加载完成 · 模型节点数：' + countNodes(gltf.scene)

    // 让鸭子缓慢自转
    function spin() {
      requestAnimationFrame(spin)
      model.rotation.y += 0.005
    }
    spin()
  },
  // 加载进度
  (e) => {
    if (e.lengthComputable) {
      const percent = ((e.loaded / e.total) * 100).toFixed(0)
      status.textContent = `⏳ 模型加载中... ${percent}%`
    }
  },
  // 加载失败
  (err) => {
    console.error(err)
    status.textContent = '❌ 加载失败：' + err.message + '（可能是网络/CORS 问题，请用本地服务器访问本页面）'
  }
)

function countNodes(obj) {
  let n = 0
  obj.traverse(() => n++)
  return n
}

// ============ 渲染循环 ============
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})