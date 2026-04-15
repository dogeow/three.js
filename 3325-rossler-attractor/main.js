// 3325. Rossler Attractor — 勒斯开尔吸引子，混沌动力学
// type: rossler-attractor
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050a15)
scene.fog = new THREE.FogExp2(0x050a15, 0.006)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 5, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.4

// Rössler吸引子参数方程
// dx/dt = -y - z, dy/dt = x + a*y, dz/dt = b + z*(x - c)
const a = 0.2, b = 0.2, c = 5.7
const dt = 0.02
const steps = 15000

const positions = new Float32Array(steps * 3)
let x = 1.0, y = 1.0, z = 1.0

for (let i = 0; i < steps; i++) {
  const dx = (-y - z) * dt
  const dy = (x + a * y) * dt
  const dz = (b + z * (x - c)) * dt
  x += dx; y += dy; z += dz
  
  // 缩放使轨迹更居中
  positions[i * 3] = x * 2.0
  positions[i * 3 + 1] = (y - 10) * 2.0
  positions[i * 3 + 2] = z * 0.5
}

// 颜色映射：速度 → 颜色
const colors = new Float32Array(steps * 3)
for (let i = 1; i < steps; i++) {
  const speed = Math.sqrt(
    (positions[i*3] - positions[(i-1)*3]) ** 2 +
    (positions[i*3+1] - positions[(i-1)*3+1]) ** 2 +
    (positions[i*3+2] - positions[(i-1)*3+2]) ** 2
  )
  const t = Math.min(speed * 50, 1.0)
  // 慢=蓝，快=红
  colors[i * 3] = t
  colors[i * 3 + 1] = t * 0.3
  colors[i * 3 + 2] = 1.0 - t * 0.5
  colors[(i-1) * 3] = colors[i * 3] * 0.9
  colors[(i-1) * 3 + 1] = colors[i * 3 + 1] * 0.9
  colors[(i-1) * 3 + 2] = colors[i * 3 + 2] * 0.9
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

// 线宽材质（使用宽度变量着色器）
const mat = new THREE.LineBasicMaterial({ 
  vertexColors: true, 
  transparent: true, 
  opacity: 0.7 
})
const line = new THREE.Line(geo, mat)
scene.add(line)

// 发光粒子
const ptsGeo = new THREE.BufferGeometry()
const ptsPos = new Float32Array(steps * 3)
for (let i = 0; i < steps; i++) {
  ptsPos[i*3] = positions[i*3]
  ptsPos[i*3+1] = positions[i*3+1]
  ptsPos[i*3+2] = positions[i*3+2]
}
ptsGeo.setAttribute('position', new THREE.BufferAttribute(ptsPos, 3))
const ptsMat = new THREE.PointsMaterial({ 
  size: 0.4, 
  vertexColors: true, 
  transparent: true, 
  opacity: 0.5,
  blending: THREE.AdditiveBlending
})
scene.add(new THREE.Points(ptsGeo, ptsMat))

// 起点
const startGeo = new THREE.SphereGeometry(0.6, 12, 12)
const startMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa })
const startMesh = new THREE.Mesh(startGeo, startMat)
startMesh.position.set(positions[0], positions[1], positions[2])
scene.add(startMesh)

// 发光球表示当前演化位置
const glowGeo = new THREE.SphereGeometry(0.5, 16, 16)
const glowMat = new THREE.MeshBasicMaterial({ color: 0xff6600 })
const glowMesh = new THREE.Mesh(glowGeo, glowMat)

// 沿轨迹移动的发光点
const trailCount = 50
const trailGroup = new THREE.Group()
for (let t = 0; t < trailCount; t++) {
  const idx = Math.floor(t / trailCount * steps)
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.2 - t * 0.003, 8, 8),
    new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(colors[idx*3], colors[idx*3+1], colors[idx*3+2]),
      transparent: true,
      opacity: 1 - t / trailCount
    })
  )
  sphere.position.set(positions[idx*3], positions[idx*3+1], positions[idx*3+2])
  trailGroup.add(sphere)
}
scene.add(trailGroup)

scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const pointLight = new THREE.PointLight(0xff4400, 2, 100)
pointLight.position.set(0, 0, 0)
scene.add(pointLight)

// 参数信息
const infoDiv = document.createElement('div')
infoDiv.style.cssText = 'position:fixed;top:15px;right:15px;background:rgba(0,0,0,0.7);color:#aaf;padding:12px;border-radius:8px;font-family:monospace;font-size:12px;z-index:100;line-height:1.8'
infoDiv.innerHTML = `
<div style="color:#88f;font-weight:bold">Rössler Attractor</div>
<div>dx/dt = -y - z</div>
<div>dy/dt = x + 0.2y</div>
<div>dz/dt = 0.2 + z(x - 5.7)</div>
<div style="margin-top:6px;color:#888">混沌系统 · a=0.2 b=0.2 c=5.7</div>
`
document.body.appendChild(infoDiv)

const clock = new THREE.Clock()
let frame = 0
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  controls.update()
  
  // 让发光球沿轨迹缓慢移动
  frame = (frame + 2) % steps
  glowMesh.position.set(positions[frame*3], positions[frame*3+1], positions[frame*3+2])
  pointLight.position.copy(glowMesh.position)
  pointLight.intensity = 1.5 + Math.sin(t * 3) * 0.5
  
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
