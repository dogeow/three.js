// 3318. EM Wave Propagation — 电磁波传播可视化
// type: em-wave-propagation
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020208)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 30, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 创建电磁场矢量箭头
function makeArrow(origin, dir, color, scale = 1) {
  const group = new THREE.Group()
  const shaftGeo = new THREE.CylinderGeometry(0.05, 0.05, scale * 0.8, 6)
  const headGeo = new THREE.ConeGeometry(0.15, 0.3, 6)
  const mat = new THREE.MeshBasicMaterial({ color })
  const shaft = new THREE.Mesh(shaftGeo, mat)
  shaft.position.y = scale * 0.4
  const head = new THREE.Mesh(headGeo, mat)
  head.position.y = scale * 0.8
  group.add(shaft, head)
  // align to direction
  const up = new THREE.Vector3(0, 1, 0)
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize())
  group.quaternion.copy(quat)
  group.position.copy(origin)
  return group
}

// 创建网格平面
const gridHelper = new THREE.GridHelper(60, 30, 0x222244, 0x111122)
scene.add(gridHelper)

// 创建屏幕（显示波动的画布）
const canvas = document.createElement('canvas')
canvas.width = 512
canvas.height = 256
const ctx = canvas.getContext('2d')
const texture = new THREE.CanvasTexture(canvas)
const screenGeo = new THREE.PlaneGeometry(50, 25)
const screenMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
const screen = new THREE.Mesh(screenGeo, screenMat)
screen.rotation.x = -Math.PI / 2
screen.position.y = 0.01
scene.add(screen)

// E场箭头群（蓝色）
const eArrows = []
const bArrows = []
const numArrows = 20
const spacing = 2.5

for (let i = 0; i < numArrows; i++) {
  for (let j = 0; j < numArrows; j++) {
    const x = (i - numArrows / 2) * spacing
    const z = (j - numArrows / 2) * spacing
    
    // E field arrows (blue, pointing up/down)
    const eDir = new THREE.Vector3(0, 1, 0)
    const eArrow = makeArrow(new THREE.Vector3(x, 0, z), eDir, 0x0088ff, 1)
    scene.add(eArrow)
    eArrows.push(eArrow)
    
    // B field arrows (red, pointing in Z direction)
    const bDir = new THREE.Vector3(0, 0, 1)
    const bArrow = makeArrow(new THREE.Vector3(x, 0.5, z), bDir, 0xff4444, 0.8)
    scene.add(bArrow)
    bArrows.push(bArrow)
  }
}

// 传播方向指示器
const dirGeo = new THREE.ConeGeometry(0.5, 2, 8)
const dirMat = new THREE.MeshBasicMaterial({ color: 0xffff00 })
const dirCone = new THREE.Mesh(dirGeo, dirMat)
dirCone.position.set(0, 15, 0)
scene.add(dirCone)

const labelCanvas = document.createElement('canvas')
labelCanvas.width = 256
labelCanvas.height = 64
const lctx = labelCanvas.getContext('2d')
lctx.fillStyle = '#003366'
lctx.font = 'bold 28px monospace'
lctx.fillText('EM Wave →', 10, 42)
const labelTex = new THREE.CanvasTexture(labelCanvas)
const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex }))
labelSprite.position.set(0, 18, 0)
labelSprite.scale.set(12, 6, 1)
scene.add(labelSprite)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
scene.add(new THREE.PointLight(0xffffff, 1, 200))

let t = 0
const waveSpeed = 2.0
const omega = 3.0
const k = 2.0

function updateWave() {
  ctx.fillStyle = '#000010'
  ctx.fillRect(0, 0, 512, 256)
  
  // 画电场曲线 E = sin(kx - ωt)
  ctx.strokeStyle = '#0088ff'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let px = 0; px < 512; px++) {
    const x = (px / 512) * 60 - 30
    const phase = k * x - omega * t
    const y = 128 - Math.sin(phase) * 80
    px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y)
  }
  ctx.stroke()
  
  // 画磁场曲线 B = sin(kx - ωt + π/2)
  ctx.strokeStyle = '#ff4444'
  ctx.beginPath()
  for (let px = 0; px < 512; px++) {
    const x = (px / 512) * 60 - 30
    const phase = k * x - omega * t + Math.PI / 2
    const y = 128 - Math.sin(phase) * 80
    px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y)
  }
  ctx.stroke()
  
  texture.needsUpdate = true
  
  // 更新箭头方向
  for (let idx = 0; idx < eArrows.length; idx++) {
    const arrow = eArrows[idx]
    const pos = arrow.position
    const phase = k * pos.x - omega * t
    const scale = 0.5 + 0.5 * Math.abs(Math.sin(phase))
    arrow.scale.y = scale
    arrow.position.y = 0.5 + Math.sin(phase) * 2.5
    
    const bArrow = bArrows[idx]
    const bPhase = phase + Math.PI / 2
    bArrow.scale.y = 0.4 + 0.4 * Math.abs(Math.sin(bPhase))
    bArrow.position.y = 0.5 + Math.sin(bPhase) * 2.0
  }
  
  dirCone.position.x = Math.sin(t * 0.3) * 20
  dirCone.rotation.z = t * 2
}

function animate() {
  requestAnimationFrame(animate)
  t += 0.016 * waveSpeed
  updateWave()
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
