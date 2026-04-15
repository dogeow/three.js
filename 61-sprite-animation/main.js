import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

// ============ 场景初始化 ============
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080c18)
scene.fog = new THREE.FogExp2(0x080c18, 0.025)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 5, 13)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 2, 0)

// ============ 灯光 ============
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dir = new THREE.DirectionalLight(0xffffff, 1.5)
dir.position.set(5, 8, 6)
scene.add(dir)

// ============ 网格地面 ============
const grid = new THREE.GridHelper(22, 22, 0x1e3a5f, 0x0f1e33)
grid.position.y = -0.01
scene.add(grid)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(11, 64),
  new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.95, metalness: 0.05 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -0.02
scene.add(floor)

// ============ 程序生成 Sprite Sheet ============
// 8 帧，每帧 64x64，总图 512x64
const FRAME_COUNT = 8
const FRAME_W = 64
const FRAME_H = 64
const SHEET_W = FRAME_W * FRAME_COUNT
const SHEET_H = FRAME_H

const sheetCanvas = document.getElementById('sheetCanvas')
sheetCanvas.width = SHEET_W
sheetCanvas.height = SHEET_H
const sheetCtx = sheetCanvas.getContext('2d')

// 绘制 8 帧弹跳球：下落压缩、上弹拉伸、落地瞬间
function drawFrame(ctx, frame, cx, cy, size) {
  ctx.clearRect(0, 0, FRAME_W, FRAME_H)

  // 弹跳球动画：frame 0-3 下落+压缩，4-7 上弹+拉伸
  const t = frame / (FRAME_COUNT - 1) // 0 -> 1
  // 正弦曲线模拟弹跳：上升时拉伸，下落时压缩
  const bounceY = Math.sin(t * Math.PI) // 0->1->0
  const squashX = 1 + (1 - bounceY) * 0.45 // 压扁
  const squashY = 1 - (1 - bounceY) * 0.45 // 拉伸
  const r = size / 2

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(squashX, squashY)

  // 球体渐变
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r)
  grad.addColorStop(0, '#fffde7')
  grad.addColorStop(0.3, '#ffcc02')
  grad.addColorStop(0.7, '#ff6600')
  grad.addColorStop(1, '#cc3300')
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // 高光
  ctx.beginPath()
  ctx.arc(-r * 0.25, -r * 0.3, r * 0.22, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fill()

  // 小高光
  ctx.beginPath()
  ctx.arc(-r * 0.12, -r * 0.15, r * 0.08, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fill()

  // 落地时的阴影（只在压缩帧明显）
  const shadowAlpha = Math.max(0, (1 - bounceY) * 0.5)
  const shadowScale = 1 + (1 - bounceY) * 0.5
  ctx.restore()

  // 在帧下方画地面阴影（相对于帧内坐标）
  ctx.save()
  ctx.globalAlpha = shadowAlpha
  const sg = ctx.createRadialGradient(cx, cy + r * squashY + 4, 0, cx, cy + r * squashY + 4, r * shadowScale)
  sg.addColorStop(0, 'rgba(0,0,0,0.8)')
  sg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sg
  ctx.beginPath()
  ctx.ellipse(cx, cy + r * squashY + 4, r * shadowScale, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// 画 8 帧到 canvas
for (let i = 0; i < FRAME_COUNT; i++) {
  const ox = i * FRAME_W + FRAME_W / 2
  const oy = FRAME_H / 2
  drawFrame(sheetCtx, i, ox, oy, FRAME_W * 0.82)
}

// 将 canvas 转为 CanvasTexture
const sheetTexture = new THREE.CanvasTexture(sheetCanvas)
sheetTexture.colorSpace = THREE.SRGBColorSpace
// 帧宽比例（用于 UV 计算）
const FRAME_COLS = FRAME_COUNT

// ============ 创建多个 Sprite，各自有不同速度/偏移 ============
const spriteDefs = [
  { x: -4,   z: -2,  speed: 1.2,  color: 0xffcc02, scale: 3.0, offset: 0 },
  { x:  0,   z:  1,  speed: 1.8,  color: 0xff6633, scale: 2.2, offset: 2 },
  { x:  4,   z: -2,  speed: 2.5,  color: 0xff22aa, scale: 2.8, offset: 4 },
  { x: -2.5, z:  3,  speed: 0.9,  color: 0x22ffcc, scale: 2.0, offset: 6 },
  { x:  2.5, z:  3,  speed: 1.5,  color: 0x66aaff, scale: 3.4, offset: 1 },
]

const sprites = spriteDefs.map((def, idx) => {
  // 为每个 sprite 克隆一份纹理，这样 UV 偏移互不影响
  const tex = sheetTexture.clone()
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true

  const mat = new THREE.SpriteMaterial({
    map: tex,
    color: new THREE.Color(def.color),
    transparent: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.position.set(def.x, 1.5, def.z)
  sprite.scale.setScalar(def.scale)

  // 额外属性
  sprite.userData = {
    speed: def.speed,
    offset: def.offset,
    currentFrame: 0,
    tex: tex,
  }

  scene.add(sprite)
  return sprite
})

// ============ lil-gui ============
const params = {
  speed: 4,
  paused: false,
  frameCount: FRAME_COUNT,
}

const gui = new GUI({ title: '动画控制' })
gui.add(params, 'speed', 0.5, 12, 0.1).name('动画速度')
gui.add(params, 'paused').name('暂停')
gui.add(params, 'frameCount', 1, FRAME_COUNT, 1).name('帧数').onChange((v) => {
  sprites.forEach(s => {
    if (s.userData.currentFrame >= v) {
      s.userData.currentFrame = 0
      s.userData.tex.offset.x = 0
    }
  })
})

// ============ 动画循环 ============
const clock = new THREE.Clock()
let elapsed = 0

function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()

  if (!params.paused) {
    elapsed += dt
  }

  sprites.forEach((sprite) => {
    const { speed, offset, tex } = sprite.userData

    // 计算当前帧：基于时间 + 各自偏移
    const t = (elapsed * speed * 0.5 + offset / FRAME_COUNT) % 1
    const frame = Math.floor(t * params.frameCount) % params.frameCount

    // UV 偏移：每帧占 1/FRAME_COUNT 的宽度
    tex.offset.x = frame / FRAME_COUNT
    tex.needsUpdate = true

    // 让 sprite 上下浮动一下，模拟弹跳高度
    const bounce = Math.abs(Math.sin(elapsed * speed * 2 + offset * 0.5))
    sprite.position.y = 1.5 + bounce * 2.2
  })

  controls.update()
  renderer.render(scene, camera)
}
animate()

// ============ 窗口调整 ============
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})