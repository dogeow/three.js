import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// CSS2DRenderer：把 HTML 元素渲染到 3D 世界中，自动跟着相机走
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf8fafc)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(6, 6, 10)

// ============ 两个 Renderer 叠在一起 ============
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(innerWidth, innerHeight)
// 注意：HTML 层必须盖在 canvas 上，且 pointer-events 默认 none（由标签自己决定）
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.top = '0'
labelRenderer.domElement.style.pointerEvents = 'none'
document.body.appendChild(labelRenderer.domElement)

const controls = new OrbitControls(camera, labelRenderer.domElement) // 事件层给顶层
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.7))
const dir = new THREE.DirectionalLight(0xffffff, 0.8)
dir.position.set(5, 8, 5)
scene.add(dir)

// 地面网格
scene.add(new THREE.GridHelper(20, 20, 0xcbd5e1, 0xe2e8f0))

// ============ 数据 + 可视化 ============
const servers = [
  { name: 'web-01',  cpu: 23, pos: [-3, 1, -2], hot: false },
  { name: 'web-02',  cpu: 87, pos: [-1, 1, -2], hot: true },
  { name: 'db-main', cpu: 45, pos: [ 1, 1, -2], hot: false },
  { name: 'cache',   cpu: 12, pos: [ 3, 1, -2], hot: false },
  { name: 'worker',  cpu: 92, pos: [-1, 1,  1], hot: true },
  { name: 'api-gw',  cpu: 56, pos: [ 1, 1,  1], hot: false },
]

servers.forEach(s => {
  // 3D 机箱
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2, 0.8),
    new THREE.MeshStandardMaterial({
      color: s.hot ? 0xef4444 : 0x64748b,
      metalness: 0.5,
      roughness: 0.4
    })
  )
  box.position.set(s.pos[0], s.pos[1], s.pos[2])
  scene.add(box)

  // 创建标签 DOM
  const div = document.createElement('div')
  div.className = 'label' + (s.hot ? ' hot' : '')
  div.innerHTML = `
    <div class="name">${s.name}</div>
    <div class="meta">CPU ${s.cpu}%</div>
  `
  // 点击事件（标签上可以有正常交互）
  div.style.pointerEvents = 'auto'
  div.style.cursor = 'pointer'
  div.onclick = () => alert(`${s.name}\nCPU: ${s.cpu}%`)

  // CSS2DObject 会把 DOM 贴到 3D 场景中
  const label = new CSS2DObject(div)
  label.position.set(0, 1.2, 0) // 相对于父物体
  box.add(label) // 挂到机箱上，机箱移动标签跟着走
})

// ============ 渲染循环 ============
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera) // ⚠️ 两个 renderer 都要调
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  labelRenderer.setSize(innerWidth, innerHeight)
})