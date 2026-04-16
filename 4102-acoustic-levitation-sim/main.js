// 4102. Acoustic Levitation Sim
// 声波悬浮：驻波节点捕获粒子的物理可视化
// type: physics-visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 12, 30)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 声音参数
const wavelength = 4.0      // 声波波长
const frequency = 1.5        // 频率
const amplitude = 2.5        // 振幅
const numParticles = 400    // 悬浮粒子数
const numNodes = 4          // 节点数（驻波腹数）

// 创建悬浮粒子
const particleGeo = new THREE.SphereGeometry(0.12, 8, 8)
const particles = []
const particleData = []

for (let i = 0; i < numParticles; i++) {
  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color().setHSL(i / numParticles, 0.8, 0.6),
    emissive: new THREE.Color().setHSL(i / numParticles, 1.0, 0.2),
    shininess: 80
  })
  const mesh = new THREE.Mesh(particleGeo, mat)
  
  // 随机初始位置
  const phase = Math.random() * Math.PI * 2
  const x = (Math.random() - 0.5) * 20
  const y = Math.random() * 6 - 1
  const z = (Math.random() - 0.5) * 8
  
  mesh.position.set(x, y, z)
  scene.add(mesh)
  particles.push(mesh)
  particleData.push({ phase, baseX: x, y, z, vx: 0, vy: 0 })
}

// 超声波发射器（上下两个面）
const transducerGeo = new THREE.BoxGeometry(22, 0.5, 10)
const transducerMat = new THREE.MeshPhongMaterial({
  color: 0x223344,
  emissive: 0x112233,
  shininess: 100,
  transparent: true,
  opacity: 0.85
})
const topTransducer = new THREE.Mesh(transducerGeo, transducerMat)
topTransducer.position.set(0, 7, 0)
scene.add(topTransducer)

const bottomTransducer = new THREE.Mesh(transducerGeo, transducerMat.clone())
bottomTransducer.position.set(0, -1, 0)
scene.add(bottomTransducer)

// 声波传播线（可视化驻波）
const waveLinePoints = []
const waveLineCount = 50
for (let i = 0; i <= waveLineCount; i++) {
  const x = (i / waveLineCount - 0.5) * 22
  waveLinePoints.push(new THREE.Vector3(x, 3, 0))
}
const waveLineGeo = new THREE.BufferGeometry().setFromPoints(waveLinePoints)
const waveLineMat = new THREE.LineBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.4 })
const waveLine = new THREE.Line(waveLineGeo, waveLineMat)
scene.add(waveLine)

// 节点指示器（悬浮位置）
const nodePositions = []
for (let n = 0; n <= numNodes; n++) {
  const y = -1 + (n / numNodes) * 8
  nodePositions.push(y)
  const nodeGeo = new THREE.RingGeometry(0.3, 0.5, 32)
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
  const nodeRing = new THREE.Mesh(nodeGeo, nodeMat)
  nodeRing.position.set(0, y, 0)
  nodeRing.rotation.x = Math.PI / 2
  scene.add(nodeRing)
}

// 灯光
scene.add(new THREE.AmbientLight(0x334466, 0.6))
const topLight = new THREE.PointLight(0x4488ff, 2, 40)
topLight.position.set(0, 10, 0)
scene.add(topLight)
const bottomLight = new THREE.PointLight(0xff8844, 1.5, 30)
bottomLight.position.set(0, -3, 0)
scene.add(bottomLight)
const sideLight = new THREE.DirectionalLight(0xffffff, 0.8)
sideLight.position.set(10, 5, 10)
scene.add(sideLight)

// 时间 & 动画
const clock = new THREE.Clock()
let time = 0

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  time += delta

  // 更新驻波可视化线
  const positions = waveLineGeo.attributes.position.array
  for (let i = 0; i <= waveLineCount; i++) {
    const x = (i / waveLineCount - 0.5) * 22
    const y = 3 + Math.sin(x * Math.PI * 2 / wavelength - time * frequency * Math.PI * 2) * amplitude * 0.5
    positions[i * 3 + 1] = y
  }
  waveLineGeo.attributes.position.needsUpdate = true

  // 超声波发光强度脉动
  topTransducer.material.emissive.setHex(0x112233 + Math.floor(Math.sin(time * frequency * Math.PI * 2) * 0x223344))
  bottomTransducer.material.emissive.setHex(0x112233 + Math.floor(Math.sin(time * frequency * Math.PI * 2 + Math.PI) * 0x223344))

  // 粒子物理：被吸引到最近的节点
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    const d = particleData[i]

    // 找到最近的节点
    let nearestY = nodePositions[0]
    let nearestDist = Math.abs(d.y - nearestY)
    for (const ny of nodePositions) {
      const dist = Math.abs(d.y - ny)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestY = ny
      }
    }

    // 水平方向：被声压固定在原位附近
    const targetX = d.baseX + Math.sin(time * 0.5 + d.phase) * 0.2
    const targetZ = d.z + Math.cos(time * 0.7 + d.phase) * 0.15

    // 垂直方向：被节点捕获
    // 添加微小的声波振动
    const acousticY = nearestY + Math.sin(time * frequency * Math.PI * 2 + d.phase) * 0.15

    // 弹簧力
    const springK = 8.0
    d.vx += (targetX - p.position.x) * springK * delta
    d.vy += (acousticY - p.position.y) * springK * delta
    d.vx *= 0.92
    d.vy *= 0.88

    p.position.x += d.vx * delta
    p.position.y += d.vy * delta
    p.position.z = targetZ

    // 发光强度随位置变化
    const proximity = 1.0 - Math.min(1.0, nearestDist / 2.0)
    p.material.emissiveIntensity = 0.1 + proximity * 0.4
  }

  // 粒子随波振动（整体跟随声波）
  const waveY = Math.sin(time * frequency * Math.PI * 2) * amplitude * 0.3
  topTransducer.position.y = 7 + waveY
  bottomTransducer.position.y = -1 - waveY

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
