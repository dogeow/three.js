// 2149. 粒子漩涡
// 粒子漩涡系统 - 增强版
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x030308)
scene.fog = new THREE.FogExp2(0x030308, 0.012)

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 25, 55)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minDistance = 20
controls.maxDistance = 150

// 粒子配置
const PARTICLE_COUNT = 12000
const positions = new Float32Array(PARTICLE_COUNT * 3)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
const colors = new Float32Array(PARTICLE_COUNT * 3)
const sizes = new Float32Array(PARTICLE_COUNT)
const angles = new Float32Array(PARTICLE_COUNT)
const radii = new Float32Array(PARTICLE_COUNT)
const heights = new Float32Array(PARTICLE_COUNT)
const vorticities = new Float32Array(PARTICLE_COUNT)

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const angle = Math.random() * Math.PI * 2
  const radius = 3 + Math.random() * 40
  const height = (Math.random() - 0.5) * 30
  
  positions[i*3] = Math.cos(angle) * radius
  positions[i*3+1] = height
  positions[i*3+2] = Math.sin(angle) * radius
  
  angles[i] = angle
  radii[i] = radius
  heights[i] = height
  
  velocities[i*3] = (Math.random() - 0.5) * 0.05
  velocities[i*3+1] = (Math.random() - 0.5) * 0.02
  velocities[i*3+2] = (Math.random() - 0.5) * 0.05
  
  // 颜色：内圈青色，外圈紫色
  const t = radius / 43
  const c = new THREE.Color()
  c.setHSL(0.5 + t * 0.2, 0.8, 0.5 + t * 0.2)
  colors[i*3] = c.r
  colors[i*3+1] = c.g
  colors[i*3+2] = c.b
  
  sizes[i] = 0.3 + (1 - t) * 1.2
  vorticities[i] = 0.5 + Math.random() * 1.5
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

const particleMat = new THREE.PointsMaterial({
  size: 0.6,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true
})

const particles = new THREE.Points(geo, particleMat)
scene.add(particles)

// 中心核心
const coreGeo = new THREE.IcosahedronGeometry(3, 3)
const coreMat = new THREE.MeshBasicMaterial({ 
  color: 0x00ffff,
  transparent: true,
  opacity: 0.15,
  wireframe: true
})
const core = new THREE.Mesh(coreGeo, coreMat)
scene.add(core)

// 内层光晕
const innerGlow = new THREE.Mesh(
  new THREE.SphereGeometry(6, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.05 })
)
scene.add(innerGlow)

// 外层光环
const ringGeo = new THREE.TorusGeometry(15, 0.3, 8, 64)
const ringMat = new THREE.MeshBasicMaterial({ color: 0x4400aa, transparent: true, opacity: 0.3 })
const ring = new THREE.Mesh(ringGeo, ringMat)
ring.rotation.x = Math.PI / 2
scene.add(ring)

// 第二个环
const ring2 = new THREE.Mesh(
  new THREE.TorusGeometry(25, 0.2, 8, 64),
  new THREE.MeshBasicMaterial({ color: 0x8800ff, transparent: true, opacity: 0.2 })
)
ring2.rotation.x = Math.PI / 2.5
ring2.rotation.z = 0.3
scene.add(ring2)

// 灯光
scene.add(new THREE.AmbientLight(0x222244, 0.5))
const pointLight = new THREE.PointLight(0x00ffff, 0.5, 50)
scene.add(pointLight)

// 鼠标交互
const mouse = new THREE.Vector2()
const targetVortexStrength = { value: 1.0 }

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
})

window.addEventListener('mousedown', () => {
  targetVortexStrength.value = 2.5
})
window.addEventListener('mouseup', () => {
  targetVortexStrength.value = 1.0
})

const clock = new THREE.Clock()
let vortexStrength = 1.0

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  // 平滑漩涡强度
  vortexStrength += (targetVortexStrength.value - vortexStrength) * 0.05
  
  const pos = geo.attributes.position
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3
    
    // 漩涡运动
    const radius = radii[i]
    const vortic = vorticities[i]
    angles[i] += (0.02 + (1 - radius / 43) * 0.03) * vortic * vortexStrength
    
    const newX = Math.cos(angles[i]) * radius
    const newZ = Math.sin(angles[i]) * radius
    
    // 螺旋上下运动
    heights[i] += Math.sin(t * 2 + i * 0.01) * 0.03 * vortic
    heights[i] = Math.max(-15, Math.min(15, heights[i]))
    
    pos.array[i3] = newX + velocities[i3]
    pos.array[i3+1] = heights[i] + velocities[i3+1]
    pos.array[i3+2] = newZ + velocities[i3+2]
    
    // 半径微变
    radii[i] += Math.sin(t + i * 0.005) * 0.01
    if (radii[i] < 2) radii[i] = 40
    if (radii[i] > 43) radii[i] = 3
    
    // 鼠标影响粒子散射
    const mDist = Math.sqrt(
      Math.pow(pos.array[i3] - mouse.x * 30, 2) +
      Math.pow(pos.array[i3+2] - mouse.y * 30, 2)
    )
    if (mDist < 10) {
      const push = (10 - mDist) / 10 * 0.5
      pos.array[i3] += mouse.x * push
      pos.array[i3+2] += mouse.y * push
    }
  }
  
  pos.needsUpdate = true
  
  // 核心旋转
  core.rotation.x = t * 0.2
  core.rotation.y = t * 0.4
  core.rotation.z = t * 0.1
  core.scale.setScalar(1 + Math.sin(t * 0.5) * 0.2)
  
  // 环旋转
  ring.rotation.z = t * 0.1
  ring2.rotation.z = -t * 0.15
  
  // 光晕
  innerGlow.scale.setScalar(1 + Math.sin(t * 0.8) * 0.2)
  
  // 灯光位置
  pointLight.position.x = Math.sin(t * 0.3) * 10
  pointLight.position.z = Math.cos(t * 0.3) * 10
  pointLight.intensity = 0.3 + Math.sin(t * 2) * 0.2
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
