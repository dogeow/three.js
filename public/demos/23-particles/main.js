import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x03040a)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// ============ 用 Canvas 画一个圆形软粒子贴图 ============
function makeCircleSprite() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0.0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)')
  grad.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

// ============ 5 万个粒子 ============
const COUNT = 50000

// BufferGeometry：Three.js 处理大量顶点数据的基础
const geo = new THREE.BufferGeometry()
const positions = new Float32Array(COUNT * 3)
const colors = new Float32Array(COUNT * 3)

const color = new THREE.Color()
for (let i = 0; i < COUNT; i++) {
  // 让粒子在一个球壳内分布
  const r = 3 + Math.random() * 2
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(Math.random() * 2 - 1)
  positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
  positions[i * 3 + 2] = r * Math.cos(phi)

  // 每个粒子自己的颜色（按位置着色：HSL 渐变）
  color.setHSL((phi / Math.PI), 0.7, 0.6)
  colors[i * 3]     = color.r
  colors[i * 3 + 1] = color.g
  colors[i * 3 + 2] = color.b
}

geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

// PointsMaterial：每个顶点渲染成一个贴图小精灵
const mat = new THREE.PointsMaterial({
  size: 0.08,
  map: makeCircleSprite(),
  vertexColors: true,       // 使用顶点颜色
  transparent: true,
  depthWrite: false,        // ⚠️ 关掉写深度，避免前后透明粒子互相遮挡出黑边
  blending: THREE.AdditiveBlending  // 叠加混合：亮的地方更亮，星空/火焰必备
})

const points = new THREE.Points(geo, mat)
scene.add(points)

// ============ 渲染循环：整体自转 + 每个粒子呼吸 ============
const clock = new THREE.Clock()
const positionAttr = geo.attributes.position
const origin = positions.slice() // 保存原始位置

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // 每帧更新部分粒子位置（全部更新也行，这里示意如何动）
  for (let i = 0; i < COUNT; i++) {
    const ox = origin[i * 3]
    const oy = origin[i * 3 + 1]
    const oz = origin[i * 3 + 2]
    // 按原点到粒子的方向呼吸式收缩放大
    const s = 1 + Math.sin(t * 2 + i * 0.001) * 0.05
    positionAttr.array[i * 3]     = ox * s
    positionAttr.array[i * 3 + 1] = oy * s
    positionAttr.array[i * 3 + 2] = oz * s
  }
  positionAttr.needsUpdate = true // ⚠️ 改了数据必须告诉 GPU

  points.rotation.y = t * 0.1
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})