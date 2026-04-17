// 010. Texture Basics — 纹理贴图基础
// 演示加载外部图片纹理、Canvas 生成的纹理、重复平铺等
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 4, 12)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 环境光 + 方向光
scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(5, 10, 5)
scene.add(dirLight)

// === 纹理 1：外部图片纹理 ===
// 使用 Three.js 内置的 TextureLoader 加载图片
// 注意：跨域图片需要服务器支持（esm.sh CDN 本身支持 CORS）
const loader = new THREE.TextureLoader()
const woodTexture = loader.load(
  'https://threejs.org/examples/textures/hardwood2_diffuse.jpg',
  (texture) => {
    // 加载成功回调
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2, 2)
  },
  undefined,
  (err) => {
    console.warn('外部图片加载失败（可能是 CORS 限制），使用备用方案', err)
  }
)

// === 纹理 2：Canvas 程序化生成纹理 ===
// 不依赖外部资源，在 Canvas 上绘制图案后转为纹理
function createCheckerTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 绘制棋盘格
  const tileSize = size / 8
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#222222'
      ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize)
    }
  }

  // 添加文字
  ctx.fillStyle = '#00ff88'
  ctx.font = 'bold 40px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('Canvas 纹理', size / 2, size / 2)
  ctx.font = '20px monospace'
  ctx.fillText('程序生成', size / 2, size / 2 + 30)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

const checkerTexture = createCheckerTexture()

// === 几何体应用不同纹理 ===
// 地板 - 棋盘格纹理
const planeGeo = new THREE.PlaneGeometry(10, 10)
const planeMat = new THREE.MeshStandardMaterial({
  map: checkerTexture,
  roughness: 0.8,
})
const plane = new THREE.Mesh(planeGeo, planeMat)
plane.rotation.x = -Math.PI / 2
plane.position.y = -1
scene.add(plane)

// 立方体 - 木纹纹理（外部图片）
const boxGeo = new THREE.BoxGeometry(3, 3, 3)
const boxMat = new THREE.MeshStandardMaterial({
  map: woodTexture,
  roughness: 0.6,
})
const box = new THREE.Mesh(boxGeo, boxMat)
box.position.set(0, 2, 0)
scene.add(box)

// 球体 - 法线贴图效果（使用同一棋盘格作为凹凸贴图）
const sphereGeo = new THREE.SphereGeometry(1.5, 64, 64)
const sphereMat = new THREE.MeshStandardMaterial({
  map: checkerTexture,
  normalMap: checkerTexture,  // 用同一纹理当法线贴图
  roughness: 0.5,
})
const sphere = new THREE.Mesh(sphereGeo, sphereMat)
sphere.position.set(-5, 2, 0)
scene.add(sphere)

// === 动画 ===
let textureOffset = 0
function animate() {
  requestAnimationFrame(animate)

  // 让地板纹理缓慢移动（UV 偏移效果）
  textureOffset += 0.002
  checkerTexture.offset.x = textureOffset

  box.rotation.y += 0.01
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
