// 2948. Dendritic Growth
// 金属晶体/树枝状生长 — 扩散限制凝聚(DLA)算法，点击注入种子
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.02)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 0, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 光照
scene.add(new THREE.AmbientLight(0x334466, 1.2))
const dir = new THREE.DirectionalLight(0x88ccff, 1.5)
dir.position.set(20, 30, 20)
scene.add(dir)
const point = new THREE.PointLight(0x4488ff, 2, 100)
point.position.set(-10, 10, 10)
scene.add(point)

// 粒子群 — 每个粒子代表晶体的一个节点
const PARTICLE_COUNT = 5000
const positions = new Float32Array(PARTICLE_COUNT * 3)
const colors = new Float32Array(PARTICLE_COUNT * 3)
const sizes = new Float32Array(PARTICLE_COUNT)
const growth = new Float32Array(PARTICLE_COUNT) // 生长进度 0~1
const isActive = new Uint8Array(PARTICLE_COUNT)

// 初始种子粒子
function placeParticle(i, x, y, z, size) {
  positions[i * 3] = x
  positions[i * 3 + 1] = y
  positions[i * 3 + 2] = z
  colors[i * 3] = 0.3 + Math.random() * 0.3
  colors[i * 3 + 1] = 0.6 + Math.random() * 0.4
  colors[i * 3 + 2] = 1.0
  sizes[i] = size
  growth[i] = 1.0
  isActive[i] = 1
}

// 初始种子（中心）
placeParticle(0, 0, 0, 0, 2.0)
for (let i = 1; i < 30; i++) {
  const angle = Math.random() * Math.PI * 2
  const r = 3 + Math.random() * 3
  placeParticle(i, Math.cos(angle) * r, Math.sin(angle) * r, 0, 1.2)
}

let activeCount = 30
const activeParticles = []

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

const mat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uTime;
    void main() {
      vColor = color;
      vAlpha = 0.6 + 0.4 * sin(uTime * 2.0 + position.x);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (200.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = 1.0 - smoothstep(0.3, 0.5, d);
      gl_FragColor = vec4(vColor, a * vAlpha);
    }`,
  transparent: true,
  depthWrite: false,
  vertexColors: true,
  blending: THREE.AdditiveBlending
})

const points = new THREE.Points(geo, mat)
scene.add(points)

// 生长算法：walker 随机游走，碰到粒子就粘附
const walkers = []
for (let i = 0; i < 50; i++) {
  walkers.push({
    x: (Math.random() - 0.5) * 80,
    y: (Math.random() - 0.5) * 80,
    z: (Math.random() - 0.5) * 5,
    active: true
  })
}

function spawnWalker() {
  const r = 35 + Math.random() * 10
  const angle = Math.random() * Math.PI * 2
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
    z: (Math.random() - 0.5) * 5,
    active: true
  }
}

const SPREAD = 0.3 // 随机游走步长
const STICK_DIST = 2.5 // 粘附距离

function updateWalkers() {
  for (const w of walkers) {
    if (!w.active) continue
    // 随机游走
    w.x += (Math.random() - 0.5) * SPREAD * 2
    w.y += (Math.random() - 0.5) * SPREAD * 2
    w.z += (Math.random() - 0.5) * SPREAD * 0.5

    // 检查是否跑出边界
    const dist = Math.sqrt(w.x * w.x + w.y * w.y)
    if (dist > 42 || activeCount >= PARTICLE_COUNT) {
      const idx = walkers.indexOf(w)
      walkers[idx] = spawnWalker()
      continue
    }

    // 检查是否碰到已有粒子
    for (let i = 0; i < activeCount; i++) {
      if (!isActive[i]) continue
      const dx = w.x - positions[i * 3]
      const dy = w.y - positions[i * 3 + 1]
      const dz = w.z - positions[i * 3 + 2]
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (d < STICK_DIST) {
        // 粘附！创建新粒子
        if (activeCount < PARTICLE_COUNT) {
          const newIdx = activeCount
          // 新粒子位置在walker和母粒子之间
          const nx = (positions[i * 3] + w.x) / 2
          const ny = (positions[i * 3 + 1] + w.y) / 2
          const nz = (positions[i * 3 + 2] + w.z) / 2
          placeParticle(newIdx, nx, ny, nz, 1.0 + Math.random() * 0.5)
          activeCount++
          geo.attributes.position.needsUpdate = true
          geo.attributes.color.needsUpdate = true
          geo.attributes.size.needsUpdate = true
        }
        // 重生walker
        const idx = walkers.indexOf(w)
        walkers[idx] = spawnWalker()
        break
      }
    }
  }
}

// 点击注入种子
window.addEventListener('click', (e) => {
  if (activeCount >= PARTICLE_COUNT - 50) return
  // 将屏幕坐标转为场景坐标
  const rect = renderer.domElement.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  // 近似映射到生长区域
  const wx = x * 35
  const wy = y * 35
  for (let i = 0; i < 5; i++) {
    if (activeCount < PARTICLE_COUNT) {
      placeParticle(activeCount, wx + (Math.random() - 0.5) * 3, wy + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, 1.5)
      activeCount++
    }
  }
  geo.attributes.position.needsUpdate = true
  geo.attributes.color.needsUpdate = true
  geo.attributes.size.needsUpdate = true
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  mat.uniforms.uTime.value = clock.getElapsedTime()
  updateWalkers()
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
