import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// ============ 创建 LoadingManager ============
// LoadingManager 可以监听所有 loader 的 onStart / onProgress / onLoad / onError
// 适合做统一的加载 UI（如进度条、百分比提示）

const progressBar   = document.getElementById('progress-bar')
const progressText  = document.getElementById('progress-text')
const loadingLabel  = document.getElementById('loading-label')
const overlay       = document.getElementById('loading-overlay')

const manager = new THREE.LoadingManager()

// 已加载资源计数
let loadedCount = 0
let totalCount  = 0

manager.onStart = (url, loaded, total) => {
  totalCount = total
  loadedCount = 0
  loadingLabel.textContent = '开始加载...'
}

manager.onProgress = (url, loaded, total) => {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
  progressBar.style.width  = pct + '%'
  progressText.textContent = pct + '%  ·  ' + url.split('/').pop()
}

manager.onLoad = () => {
  loadingLabel.textContent = '✅ 全部加载完成'
  progressBar.style.width  = '100%'
  progressText.textContent = '100%'
  // 短暂停留后淡出覆盖层
  setTimeout(() => overlay.classList.add('hidden'), 600)
}

manager.onError = (url) => {
  console.error('加载失败：' + url)
  progressText.textContent = '❌ 失败：' + url.split('/').pop()
}

// ============ 场景基础 ============
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 1.2, 3.5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08

// ============ 灯光 ============
scene.add(new THREE.AmbientLight(0xffffff, 0.5))

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
dirLight.position.set(5, 8, 5)
dirLight.castShadow = true
scene.add(dirLight)

const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4)
fillLight.position.set(-4, 2, -3)
scene.add(fillLight)

// ============ Canvas 程序化纹理（备用资源） ============
// 用 Canvas 画一张彩色渐变纹理，作为备用或辅助贴图
function makeCanvasTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 512, 512)
  grad.addColorStop(0,   '#4fc3f7')
  grad.addColorStop(0.5, '#7e57c2')
  grad.addColorStop(1,   '#f06292')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)
  // 画一些条纹增加细节
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  for (let i = 0; i < 512; i += 24) {
    ctx.fillRect(i, 0, 12, 512)
  }
  return new THREE.CanvasTexture(c)
}

// ============ GLTFLoader 实例（绑定 manager） ============
const gltfLoader = new GLTFLoader(manager)

// 官方示例模型：破损头盔
const MODEL_URL = 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf'

gltfLoader.load(MODEL_URL, (gltf) => {
  const model = gltf.scene

  // 给模型应用 Canvas 纹理作为环境贴图影响
  const canvasTex = makeCanvasTexture()
  canvasTex.mapping = THREE.EquirectangularReflectionMapping
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  // 头盔适当缩放并居中
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.sub(center)
  model.scale.set(1.2, 1.2, 1.2)

  scene.add(model)
  window.helmet = model
}, undefined, (err) => {
  console.error('GLTF 模型加载失败：', err)
})

// ============ 同时用 manager 加载一张额外纹理（演示多资源并行） ============
// 这里使用 TextureLoader，并注入同一个 manager
const texLoader = new THREE.TextureLoader(manager)
texLoader.load(
  'https://threejs.org/examples/textures/uv_grid_opengl.jpg',
  (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(4, 4)
    // 纹理可作为后续使用，此处仅展示 manager 能追踪它
    window.extraTex = tex
  },
  undefined,
  (err) => {
    console.error('纹理加载失败：', err)
  }
)

// ============ 渲染循环 ============
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  if (window.helmet) {
    window.helmet.rotation.y += 0.003
  }
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})