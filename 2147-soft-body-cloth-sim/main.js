// 2147. 软体布料模拟
// 软体布料模拟 - 增强版
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a14)
scene.fog = new THREE.FogExp2(0x0a0a14, 0.025)

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 8, 28)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minDistance = 10
controls.maxDistance = 60
controls.target.set(0, 3, 0)

// 布料分辨率
const W = 28, H = 28
const particles = [], constraints = [], springs = []

// 初始化粒子
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const px = (x - W/2) * 0.5
    const py = 10
    const pz = (y - H/2) * 0.5
    particles.push({
      x: px, y: py, z: pz,
      ox: px, oy: py, oz: pz,
      vx: 0, vy: 0, vz: 0,
      pinned: y < 2 && x % 4 < 2,
      mass: 0.1 + Math.random() * 0.02
    })
  }
}

// 结构约束（相邻粒子）
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (x < W-1) constraints.push([i, i+1, 0.5])
    if (y < H-1) constraints.push([i, i+W, 0.5])
  }
}

// 剪切约束（对角线）
for (let y = 0; y < H-1; y++) {
  for (let x = 0; x < W-1; x++) {
    const i = y * W + x
    constraints.push([i, i+W+1, 0.5 * Math.SQRT2])
    constraints.push([i+1, i+W, 0.5 * Math.SQRT2])
  }
}

// 弹簧约束（远处弹性）
for (let y = 0; y < H; y += 3) {
  for (let x = 0; x < W; x += 3) {
    const i = y * W + x
    if (x + 6 < W) springs.push([i, i+6, 3.0, 0.3])
    if (y + 6 < H) springs.push([i, i+W*6, 3.0, 0.3])
  }
}

// 创建布料几何体
const posArr = new Float32Array(W * H * 3)
const normArr = new Float32Array(W * H * 3)
const uvArr = new Float32Array(W * H * 2)
const indices = []

for (let y = 0; y < H-1; y++) {
  for (let x = 0; x < W-1; x++) {
    const a = y*W+x, b=a+1, c=a+W, d=c+1
    indices.push(a, b, c, b, d, c)
  }
}
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    uvArr[i*2] = x / (W-1)
    uvArr[i*2+1] = y / (H-1)
  }
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))
geo.setIndex(indices)

// 布料材质
const clothMat = new THREE.MeshStandardMaterial({
  color: 0xcc4455,
  roughness: 0.6,
  metalness: 0.1,
  side: THREE.DoubleSide
})
const cloth = new THREE.Mesh(geo, clothMat)
cloth.castShadow = true
cloth.receiveShadow = true
scene.add(cloth)

// 线框显示
const wireGeo = new THREE.WireframeGeometry(geo)
const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })
const wireframe = new THREE.LineSegments(wireGeo, wireMat)
scene.add(wireframe)

// 球体（与布料交互）
const sphereGeo = new THREE.SphereGeometry(2.5, 32, 32)
const sphereMat = new THREE.MeshStandardMaterial({ 
  color: 0x3388ff, 
  roughness: 0.2, 
  metalness: 0.8,
  emissive: 0x112244,
  emissiveIntensity: 0.3
})
const sphere = new THREE.Mesh(sphereGeo, sphereMat)
sphere.position.set(0, 0, 0)
sphere.castShadow = true
scene.add(sphere)

// 地面
const groundGeo = new THREE.PlaneGeometry(100, 100)
const groundMat = new THREE.MeshStandardMaterial({ 
  color: 0x1a1a2a, 
  roughness: 0.9,
  metalness: 0.1
})
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -3
ground.receiveShadow = true
scene.add(ground)

// 灯光
scene.add(new THREE.AmbientLight(0x445566, 0.4))
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
dirLight.position.set(15, 25, 10)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(1024, 1024)
scene.add(dirLight)
const pointLight = new THREE.PointLight(0xff4455, 0.5, 30)
pointLight.position.set(-10, 10, -5)
scene.add(pointLight)

// 鼠标交互
const mouse = new THREE.Vector2()
const mouseWorld = new THREE.Vector3()
let mouseActive = false

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
})

window.addEventListener('mousedown', () => { mouseActive = true })
window.addEventListener('mouseup', () => { mouseActive = false })

const clock = new THREE.Clock()
const gravity = -0.008
const damping = 0.98

function updateCloth() {
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)
  
  // 更新鼠标世界坐标
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -sphere.position.y)
  raycaster.ray.intersectPlane(plane, mouseWorld)
  
  // 韦尔莱 积分
  for (const p of particles) {
    if (p.pinned) continue
    const vx = (p.x - p.ox) * damping
    const vy = (p.y - p.oy) * damping + gravity
    const vz = (p.z - p.oz) * damping
    p.ox = p.x; p.oy = p.y; p.oz = p.z
    p.x += vx; p.y += vy; p.z += vz
  }
  
  // 球体碰撞
  const spherePos = sphere.position
  const sphereR = 2.5
  for (const p of particles) {
    const dx = p.x - spherePos.x
    const dy = p.y - spherePos.y
    const dz = p.z - spherePos.z
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
    if (dist < sphereR + 0.1) {
      const m = (sphereR + 0.1) / dist
      p.x = spherePos.x + dx * m
      p.y = spherePos.y + dy * m
      p.z = spherePos.z + dz * m
    }
  }
  
  // 鼠标拖拽
  if (mouseActive) {
    for (const p of particles) {
      if (p.pinned) continue
      const dx = p.x - mouseWorld.x
      const dy = p.y - mouseWorld.y
      const dz = p.z - mouseWorld.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
      if (dist < 3) {
        const force = (3 - dist) / 3 * 0.3
        p.x += dx * force * 0.1
        p.y += dy * force * 0.1
        p.z += dz * force * 0.1
      }
    }
  }
  
  // 约束求解
  for (let iter = 0; iter < 6; iter++) {
    for (const [a, b, rest] of constraints) {
      const pa = particles[a], pb = particles[b]
      const dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
      if (dist < 0.001) continue
      const diff = (dist - rest) / dist * 0.5
      if (!pa.pinned) { pa.x += dx*diff; pa.y += dy*diff; pa.z += dz*diff }
      if (!pb.pinned) { pb.x -= dx*diff; pb.y -= dy*diff; pb.z -= dz*diff }
    }
    
    // 弹簧约束
    for (const [a, b, rest, stiff] of springs) {
      const pa = particles[a], pb = particles[b]
      const dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
      if (dist < 0.001) continue
      const diff = (dist - rest) / dist * stiff * 0.3
      if (!pa.pinned) { pa.x += dx*diff; pa.y += dy*diff; pa.z += dz*diff }
      if (!pb.pinned) { pb.x -= dx*diff; pb.y -= dy*diff; pb.z -= dz*diff }
    }
    
    // 地面碰撞
    for (const p of particles) {
      if (p.y < -2.8) {
        p.y = -2.8
        p.vy *= -0.3
      }
    }
  }
  
  // 更新几何体
  for (let i = 0; i < particles.length; i++) {
    posArr[i*3] = particles[i].x
    posArr[i*3+1] = particles[i].y
    posArr[i*3+2] = particles[i].z
  }
  geo.attributes.position.needsUpdate = true
  geo.computeVertexNormals()
  
  // 更新线框
  wireGeo.copy(geo)
}

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  // 球体动画
  sphere.position.x = Math.sin(t * 0.7) * 5
  sphere.position.z = Math.cos(t * 0.5) * 4
  sphere.position.y = Math.sin(t * 0.9) * 2 + 2
  sphere.rotation.y = t * 0.5
  
  // 光照跟随球体
  pointLight.position.copy(sphere.position)
  
  updateCloth()
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
