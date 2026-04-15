// 3322. Polarized Light — 偏振光可视化，马吕斯定律演示
// type: polarized-light
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x010105)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 5, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 光源（从左侧发射偏振光）
const lightGeo = new THREE.SphereGeometry(1.5, 32, 32)
const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 2 })
const lightSphere = new THREE.Mesh(lightGeo, lightMat)
lightSphere.position.set(-25, 0, 0)
scene.add(lightSphere)

// 偏振片1（可旋转）
const polarizer1Group = new THREE.Group()
polarizer1Group.position.set(-10, 0, 0)
const p1FrameGeo = new THREE.TorusGeometry(6, 0.3, 8, 64)
const p1FrameMat = new THREE.MeshStandardMaterial({ color: 0x333355, metalness: 0.8, roughness: 0.2 })
const p1Frame = new THREE.Mesh(p1FrameGeo, p1FrameMat)
polarizer1Group.add(p1Frame)
// 偏振片栅格线
for (let i = -5; i <= 5; i++) {
  const lineGeo = new THREE.BoxGeometry(12, 0.1, 0.1)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x4488ff })
  const line = new THREE.Mesh(lineGeo, lineMat)
  line.position.y = i
  polarizer1Group.add(line)
}
scene.add(polarizer1Group)

// 偏振片2（可旋转）
const polarizer2Group = new THREE.Group()
polarizer2Group.position.set(5, 0, 0)
const p2Frame = new THREE.Mesh(p1FrameGeo.clone(), p1FrameMat.clone())
polarizer2Group.add(p2Frame)
for (let i = -5; i <= 5; i++) {
  const lineGeo = new THREE.BoxGeometry(12, 0.1, 0.1)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xff4444 })
  const line = new THREE.Mesh(lineGeo, lineMat)
  line.position.y = i
  polarizer2Group.add(line)
}
scene.add(polarizer2Group)

// 屏幕（显示透射光强度）
const screenGeo = new THREE.PlaneGeometry(16, 16)
const screenCanvas = document.createElement('canvas')
screenCanvas.width = 256
screenCanvas.height = 256
const screenCtx = screenCanvas.getContext('2d')
const screenTex = new THREE.CanvasTexture(screenCanvas)
const screenMat = new THREE.MeshBasicMaterial({ map: screenTex })
const screen = new THREE.Mesh(screenGeo, screenMat)
screen.position.set(20, 0, 0)
screen.rotation.y = Math.PI / 2
scene.add(screen)

// 光束可视化（用粒子表示）
const beamGeo = new THREE.BufferGeometry()
const beamCount = 500
const beamPositions = new Float32Array(beamCount * 3)
for (let i = 0; i < beamCount; i++) {
  beamPositions[i * 3] = -25 + Math.random() * 45
  beamPositions[i * 3 + 1] = (Math.random() - 0.5) * 10
  beamPositions[i * 3 + 2] = (Math.random() - 0.5) * 10
}
beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPositions, 3))
const beamMat = new THREE.PointsMaterial({ size: 0.3, color: 0xffffaa, transparent: true, opacity: 0.8 })
const beam = new THREE.Points(beamGeo, beamMat)
scene.add(beam)

scene.add(new THREE.AmbientLight(0xffffff, 0.3))

// UI
const ui = document.createElement('div')
ui.style.cssText = 'position:fixed;bottom:20px;left:20px;background:rgba(0,0,0,0.75);color:#fff;padding:15px;border-radius:8px;font-family:monospace;font-size:13px;z-index:100;min-width:240px'
ui.innerHTML = `
<div style="margin-bottom:10px;font-weight:bold;color:#aaa">Polarized Light</div>
<div style="margin-bottom:6px">
  Polarizer 1 角度: <span id="p1val">0</span>°
  <input type="range" id="p1" min="0" max="180" value="0" style="width:150px;display:block">
</div>
<div style="margin-bottom:6px">
  Polarizer 2 角度: <span id="p2val">90</span>°
  <input type="range" id="p2" min="0" max="180" value="90" style="width:150px;display:block">
</div>
<div style="margin-top:8px;font-size:11px;color:#888">
  马吕斯定律: I = I₀ cos²(θ₁-θ₂)<br>
  两偏振片垂直时光被完全阻挡
</div>
`
document.body.appendChild(ui)

let angle1 = 0, angle2 = 90

document.getElementById('p1').addEventListener('input', e => {
  angle1 = parseInt(e.target.value)
  document.getElementById('p1val').textContent = angle1
  polarizer1Group.rotation.z = angle1 * Math.PI / 180
})
document.getElementById('p2').addEventListener('input', e => {
  angle2 = parseInt(e.target.value)
  document.getElementById('p2val').textContent = angle2
  polarizer2Group.rotation.z = angle2 * Math.PI / 180
})

function updateScreen() {
  // 马吕斯定律
  const theta = (angle1 - angle2) * Math.PI / 180
  const intensity = Math.cos(theta) * Math.cos(theta)
  
  // 画屏幕
  const ctx = screenCtx
  ctx.fillStyle = `rgb(${Math.floor(intensity * 255)}, ${Math.floor(intensity * 255)}, ${Math.floor(intensity * 200)})`
  ctx.fillRect(0, 0, 256, 256)
  
  // 画强度曲线
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 220, 256, 36)
  ctx.strokeStyle = '#ffff00'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let x = 0; x < 256; x++) {
    const a = x / 256 * Math.PI
    const y = 220 + 18 - Math.cos(a) * Math.cos(a) * 18
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  
  ctx.fillStyle = '#888'
  ctx.font = '10px monospace'
  ctx.fillText('Malus Law: cos²(θ)', 5, 248)
  
  screenTex.needsUpdate = true
  
  // 更新光束颜色
  beamMat.color.setHSL(0.12, 0.5, 0.3 + intensity * 0.5)
  beamMat.opacity = 0.3 + intensity * 0.7
}

function animate() {
  requestAnimationFrame(animate)
  updateScreen()
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
