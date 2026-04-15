// 2109. 软体布料模拟
// 软体布料模拟
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a15)
scene.fog = new THREE.FogExp2(0x0a0a15, 0.03)

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 8, 25)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI * 0.85

// 布料参数
const W = 30, H = 30
const particles = []
const constraints = []
let draggedParticle = null
let mouseTarget = new THREE.Vector3()

// 初始化粒子
function initCloth() {
  particles.length = 0
  constraints.length = 0
  
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = (x - W / 2) * 0.6
      const py = 10 - y * 0.4
      const pz = (y - H / 2) * 0.1
      
      particles.push({
        x: px, y: py, z: pz,
        ox: px, oy: py, oz: pz,
        px: px, py: py, pz: pz,
        pinned: y === 0 && (x === 0 || x === W - 1 || x === Math.floor(W / 2)),
        mass: 1.0,
        fx: 0, fy: 0, fz: 0
      })
    }
  }
  
  // 创建约束
  const restLen = 0.6
  const restLenDiag = restLen * Math.sqrt(2)
  
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      // 水平约束
      if (x < W - 1) constraints.push({ a: i, b: i + 1, rest: restLen })
      // 垂直约束
      if (y < H - 1) constraints.push({ a: i, b: i + W, rest: restLen * 0.9 })
      // 对角线约束（保持布料形状）
      if (x < W - 1 && y < H - 1) {
        constraints.push({ a: i, b: i + W + 1, rest: restLenDiag })
        constraints.push({ a: i + 1, b: i + W, rest: restLenDiag })
      }
    }
  }
}
initCloth()

// 创建布料几何体
const posArr = new Float32Array(W * H * 3)
const normArr = new Float32Array(W * H * 3)
const uvArr = new Float32Array(W * H * 2)
const indices = []

for (let y = 0; y < H - 1; y++) {
  for (let x = 0; x < W - 1; x++) {
    const a = y * W + x, b = a + 1, c = a + W, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    uvArr[i * 2] = x / (W - 1)
    uvArr[i * 2 + 1] = y / (H - 1)
  }
}

const clothGeo = new THREE.BufferGeometry()
clothGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
clothGeo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
clothGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))
clothGeo.setIndex(indices)

// 布料材质 - 渐变丝绸效果
const clothMat = new THREE.ShaderMaterial({
  uniforms: {
    uLightDir: { value: new THREE.Vector3(1, 2, 1).normalize() },
    uTime: { value: 0 },
    uMouseInfluence: { value: 0 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      vNormal = normalMatrix * normal;
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uLightDir;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    vec3 palette(float t) {
      vec3 a = vec3(0.5, 0.2, 0.3);
      vec3 b = vec3(0.6, 0.4, 0.5);
      vec3 c = vec3(1.0, 0.8, 0.9);
      vec3 d = vec3(0.3, 0.1, 0.2);
      return a + b * cos(6.28318 * (c * t + d));
    }
    
    void main() {
      vec3 normal = normalize(vNormal);
      float diff = max(dot(normal, uLightDir), 0.0);
      
      // 丝绸光泽效果
      vec3 viewDir = normalize(cameraPosition - vPosition);
      vec3 halfDir = normalize(uLightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
      
      // 颜色基于UV和位置
      vec3 baseColor = palette(vUv.x * 0.5 + vUv.y * 0.3 + sin(uTime * 0.2) * 0.1);
      baseColor += palette(vUv.y + 0.5) * 0.3;
      
      // 边缘光晕
      float rim = 1.0 - max(dot(viewDir, normal), 0.0);
      rim = pow(rim, 3.0);
      
      vec3 finalColor = baseColor * (0.4 + diff * 0.8);
      finalColor += vec3(1.0, 0.95, 0.9) * spec * 0.6;
      finalColor += vec3(0.6, 0.3, 0.4) * rim * 0.4;
      
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `,
  side: THREE.DoubleSide,
  transparent: true
})

const cloth = new THREE.Mesh(clothGeo, clothMat)
cloth.castShadow = true
cloth.receiveShadow = true
scene.add(cloth)

// 布料网格线（调试用，可关闭）
const wireCloth = new THREE.Mesh(clothGeo, new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.1
}))
scene.add(wireCloth)

// 球体障碍物
const sphereObstacles = [
  { pos: new THREE.Vector3(0, 4, 2), radius: 2.5 },
  { pos: new THREE.Vector3(-6, 2, -2), radius: 2 },
  { pos: new THREE.Vector3(6, 3, -1), radius: 2 }
]

sphereObstacles.forEach(({ pos, radius }) => {
  const geo = new THREE.SphereGeometry(radius, 32, 32)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2244aa,
    roughness: 0.3,
    metalness: 0.7,
    transparent: true,
    opacity: 0.8
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.copy(pos)
  mesh.castShadow = true
  scene.add(mesh)
})

// 地面
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -2
ground.receiveShadow = true
scene.add(ground)

// 灯光
scene.add(new THREE.AmbientLight(0x334455, 0.6))
const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2)
dirLight.position.set(10, 20, 10)
dirLight.castShadow = true
dirLight.shadow.mapSize.width = 2048
dirLight.shadow.mapSize.height = 2048
scene.add(dirLight)

const pointLight = new THREE.PointLight(0x4466ff, 1, 30)
pointLight.position.set(-5, 10, 5)
scene.add(pointLight)

// 鼠标交互
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let mouseInfluence = 0

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  raycaster.ray.intersectPlane(plane, mouseTarget)
})

window.addEventListener('mousedown', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  
  // 找到最近的未固定粒子
  let minDist = Infinity
  let closest = null
  particles.forEach((p, i) => {
    if (p.pinned) return
    const dist = raycaster.ray.distanceToPoint(new THREE.Vector3(p.x, p.y, p.z))
    if (dist < 1.5 && dist < minDist) {
      minDist = dist
      closest = i
    }
  })
  
  if (closest !== null) {
    draggedParticle = closest
  }
})

window.addEventListener('mouseup', () => {
  draggedParticle = null
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'r') {
    initCloth()
  }
})

// 韦尔莱积分更新布料
const gravity = -0.0008
const damping = 0.98
const windStrength = 0.0003

function updateCloth() {
  const dt = 1.0
  
  // 应用力
  particles.forEach((p, i) => {
    if (p.pinned) return
    
    // 重力
    p.fy = gravity
    
    // 风
    const windDir = new THREE.Vector3(
      Math.sin(performance.now() * 0.001) * windStrength,
      Math.sin(performance.now() * 0.0015) * windStrength * 0.5,
      Math.cos(performance.now() * 0.0012) * windStrength
    )
    p.fx = windDir.x
    p.fy += windDir.y
    p.fz = windDir.z
    
    // 鼠标拖拽
    if (draggedParticle === i) {
      const dx = mouseTarget.x - p.x
      const dy = mouseTarget.y - p.y
      const dz = mouseTarget.z - p.z
      p.fx += dx * 0.1
      p.fy += dy * 0.1
      p.fz += dz * 0.1
    }
  })
  
  // 韦尔莱积分
  particles.forEach(p => {
    if (p.pinned) return
    
    const vx = (p.x - p.ox) * damping
    const vy = (p.y - p.oy) * damping
    const vz = (p.z - p.oz) * damping
    
    p.ox = p.x
    p.oy = p.y
    p.oz = p.z
    
    p.x += vx + p.fx * dt * dt
    p.y += vy + p.fy * dt * dt
    p.z += vz + p.fz * dt * dt
    
    // 球体碰撞
    sphereObstacles.forEach(({ pos, radius }) => {
      const dx = p.x - pos.x
      const dy = p.y - pos.y
      const dz = p.z - pos.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      
      if (dist < radius + 0.1) {
        const push = (radius + 0.1) / dist
        p.x = pos.x + dx * push
        p.y = pos.y + dy * push
        p.z = pos.z + dz * push
      }
    })
    
    // 地面碰撞
    if (p.y < -1.9) {
      p.y = -1.9
    }
  })
  
  // 约束求解
  for (let iter = 0; iter < 8; iter++) {
    constraints.forEach(c => {
      const pa = particles[c.a]
      const pb = particles[c.b]
      
      const dx = pb.x - pa.x
      const dy = pb.y - pa.y
      const dz = pb.z - pa.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      
      if (dist === 0) return
      
      const diff = (dist - c.rest) / dist
      const offsetX = dx * diff * 0.5
      const offsetY = dy * diff * 0.5
      const offsetZ = dz * diff * 0.5
      
      if (!pa.pinned) {
        pa.x += offsetX
        pa.y += offsetY
        pa.z += offsetZ
      }
      if (!pb.pinned) {
        pb.x -= offsetX
        pb.y -= offsetY
        pb.z -= offsetZ
      }
    })
  }
  
  // 更新几何体
  for (let i = 0; i < particles.length; i++) {
    posArr[i * 3] = particles[i].x
    posArr[i * 3 + 1] = particles[i].y
    posArr[i * 3 + 2] = particles[i].z
  }
  clothGeo.attributes.position.needsUpdate = true
  clothGeo.computeVertexNormals()
}

// 鼠标影响力可视化
const mouseRingGeo = new THREE.RingGeometry(0.5, 0.8, 32)
const mouseRingMat = new THREE.MeshBasicMaterial({
  color: 0x66aaff,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide
})
const mouseRing = new THREE.Mesh(mouseRingGeo, mouseRingMat)
scene.add(mouseRing)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  updateCloth()
  
  clothMat.uniforms.uTime.value = t
  
  // 鼠标环跟随
  mouseRing.position.copy(mouseTarget)
  mouseRing.lookAt(camera.position)
  mouseRing.scale.setScalar(1 + Math.sin(t * 5) * 0.2)
  
  // 球体旋转
  sphereObstacles.forEach(({ pos }, i) => {
    const mesh = scene.children.find(c => c.geometry?.type === 'SphereGeometry' && c.position.equals(pos))
    if (mesh) {
      mesh.rotation.y = t * 0.5 + i
      mesh.rotation.x = Math.sin(t * 0.3 + i) * 0.3
    }
  })
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

console.log('Cloth Sim initialized - Drag particles with mouse, press R to reset')
