// 4252. Diffusion Model Particle Flow
// 粒子扩散模型前向/反向过程可视化
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0510)
scene.fog = new THREE.FogExp2(0x0a0510, 0.015)

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 40, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 粒子系统：模拟从噪声到结构的扩散过程
const N = 12000
const pos = new Float32Array(N * 3)
const vel = new Float32Array(N * 3)
const target = new Float32Array(N * 3)
const col = new Float32Array(N * 3)
const phase = new Float32Array(N) // 0=forward/noise, 1=reverse/structure

// 目标结构：螺旋星系
for (let i = 0; i < N; i++) {
  const theta = Math.random() * Math.PI * 2
  const r = Math.sqrt(Math.random()) * 30
  target[i * 3] = r * Math.cos(theta)
  target[i * 3 + 1] = (Math.random() - 0.5) * 4
  target[i * 3 + 2] = r * Math.sin(theta)

  // 从噪声开始
  pos[i * 3] = (Math.random() - 0.5) * 80
  pos[i * 3 + 1] = (Math.random() - 0.5) * 40
  pos[i * 3 + 2] = (Math.random() - 0.5) * 80

  vel[i * 3] = (Math.random() - 0.5) * 0.5
  vel[i * 3 + 1] = (Math.random() - 0.5) * 0.2
  vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5

  const t = Math.random()
  col[i * 3] = 0.3 + t * 0.7
  col[i * 3 + 1] = 0.1 + t * 0.4
  col[i * 3 + 2] = 0.8 + t * 0.2

  phase[i] = 0
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
geo.setAttribute('color', new THREE.BufferAttribute(col, 3))

const pts = new THREE.Points(geo, new THREE.PointsMaterial({
  size: 0.25, vertexColors: true, transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending, depthWrite: false
}))
scene.add(pts)

// 背景星场
const bgN = 3000
const bgPos = new Float32Array(bgN * 3)
for (let i = 0; i < bgN; i++) {
  bgPos[i * 3] = (Math.random() - 0.5) * 300
  bgPos[i * 3 + 1] = (Math.random() - 0.5) * 200
  bgPos[i * 3 + 2] = (Math.random() - 0.5) * 300
}
const bgGeo = new THREE.BufferGeometry()
bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3))
scene.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({ size: 0.4, color: 0x334466, transparent: true, opacity: 0.5 })))

scene.add(new THREE.AmbientLight(0x8866cc, 0.6))

// UI 状态
let t = 0
let forward = true
const speed = 0.003

// 信息文字
const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:20px;left:20px;color:#a088ff;font-family:monospace;font-size:14px;pointer-events:none;z-index:10;background:rgba(0,0,0,0.4);padding:10px 14px;border-radius:8px;'
document.body.appendChild(info)

// 点击切换方向
window.addEventListener('click', () => { forward = !forward })
window.addEventListener('keydown', e => {
  if (e.code === 'Space') forward = !forward
})

function updateParticles() {
  const p = geo.attributes.position
  const noise = 0.08

  for (let i = 0; i < N; i++) {
    const px = p.array[i * 3], py = p.array[i * 3 + 1], pz = p.array[i * 3 + 2]
    const tx = target[i * 3], ty = target[i * 3 + 1], tz = target[i * 3 + 2]

    // 目标方向
    let dx = tx - px, dy = ty - py, dz = tz - pz

    // 噪声
    dx += (Math.random() - 0.5) * noise
    dy += (Math.random() - 0.5) * noise
    dz += (Math.random() - 0.5) * noise

    const step = forward ? speed : -speed
    p.array[i * 3] += dx * step
    p.array[i * 3 + 1] += dy * step
    p.array[i * 3 + 2] += dz * step
  }
  p.needsUpdate = true
}

function animate() {
  requestAnimationFrame(animate)
  updateParticles()
  controls.update()
  renderer.render(scene, camera)

  const progress = forward ? t : 1 - t
  info.textContent = `${forward ? 'Forward (Noise → Structure)' : 'Reverse (Structure → Noise)'} | Progress: ${(progress * 100).toFixed(1)}% | Click or Space to toggle`
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
