import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// Line2 家族：LineGeometry 存顶点、LineMaterial 控外观、Line2 是 Mesh
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0e1525)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(4, 4, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 参考：三轴网格和坐标轴
scene.add(new THREE.GridHelper(8, 8, 0x333344, 0x1f2437))

// ============ 对比：原生 LineBasicMaterial vs Line2 ============

// 1) 原生细线（无法调粗）
const thinPoints = []
for (let i = 0; i <= 50; i++) {
  const t = i / 50 * Math.PI * 4
  thinPoints.push(new THREE.Vector3(Math.cos(t) * 2 - 3, Math.sin(t * 2) * 0.5 + 0.5, Math.sin(t) * 2))
}
const thinGeo = new THREE.BufferGeometry().setFromPoints(thinPoints)
const thinLine = new THREE.Line(thinGeo, new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 5 })) // linewidth 无效
scene.add(thinLine)

// 加个标签（简单做法：画一张贴图）
function makeLabel(text, color) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 64
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, 0, 256, 64)
  ctx.fillStyle = color
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 32)
  const tex = new THREE.CanvasTexture(c)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }))
  sprite.scale.set(2, 0.5, 1)
  return sprite
}

const label1 = makeLabel('LineBasicMaterial（永远 1px）', '#94a3b8')
label1.position.set(-3, 2.5, 0)
scene.add(label1)

// 2) Line2 粗线 —— 带颜色渐变
const fatPoints = []
const fatColors = []
const color = new THREE.Color()
for (let i = 0; i <= 200; i++) {
  const t = i / 200 * Math.PI * 4
  fatPoints.push(
    Math.cos(t) * 2 + 3,       // x
    Math.sin(t * 2) * 0.5 + 0.5,// y
    Math.sin(t) * 2             // z
  )
  color.setHSL(i / 200, 0.8, 0.6)
  fatColors.push(color.r, color.g, color.b)
}

const fatGeo = new LineGeometry()
fatGeo.setPositions(fatPoints)  // ⚠️ Line2 的 geometry 用扁平数组，不是 Vector3
fatGeo.setColors(fatColors)

const fatMat = new LineMaterial({
  linewidth: 5,                 // 单位：像素
  vertexColors: true,
  dashed: false,
  // ⚠️ Line2 着色器需要知道屏幕分辨率才能做"按像素"宽度
  resolution: new THREE.Vector2(innerWidth, innerHeight),
  // 虚线时才生效
  dashScale: 1, dashSize: 0.2, gapSize: 0.1
})

const fatLine = new Line2(fatGeo, fatMat)
fatLine.computeLineDistances() // 虚线需要距离信息，算一次就行
scene.add(fatLine)

const label2 = makeLabel('Line2（真·可调粗细 + 渐变色）', '#fbbf24')
label2.position.set(3, 2.5, 0)
scene.add(label2)

// ============ UI ============
document.getElementById('width').oninput = e => {
  fatMat.linewidth = +e.target.value
}
document.getElementById('dashed').onchange = e => {
  fatMat.dashed = e.target.checked
  // dashed 切换后要 defines 重建 shader
  fatMat.defines.USE_DASH = e.target.checked ? '' : undefined
  fatMat.needsUpdate = true
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
  // ⚠️ LineMaterial 的 resolution 也要跟着改，否则粗细会失真
  fatMat.resolution.set(innerWidth, innerHeight)
})