// 4103. Soliton Wave Collision
// KdV 孤立波碰撞：两个不同速度的孤立子相撞后保持形状
// type: physics-simulation
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020818)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 18, 35)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 参数
const params = {
  soliton1Speed: 3.0,
  soliton2Speed: 1.8,
  soliton1Height: 3.0,
  soliton2Height: 2.0,
  amplitude: 1.0,
  numParticles: 2500,
  damping: 0.0
}

// 网格参数
const gridW = 80
const gridH = 50
const cellW = 60 / gridW
const cellH = 40 / gridH

// 波场数据（高度场）
const heightField = new Float32Array(gridW * gridH)
const prevHeight = new Float32Array(gridW * gridH)
const velocity = new Float32Array(gridW * gridH)

// 创建水面几何体
const waterGeo = new THREE.PlaneGeometry(60, 40, gridW - 1, gridH - 1)
const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vHeight;
    void main() {
      vNormal = normalMatrix * normal;
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vHeight = position.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uLightDir;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vHeight;
    void main() {
      vec3 normal = normalize(vNormal);
      float diff = max(dot(normal, uLightDir), 0.0);
      vec3 deepColor = vec3(0.0, 0.08, 0.25);
      vec3 shallowColor = vec3(0.0, 0.55, 0.75);
      vec3 peakColor = vec3(1.0, 0.9, 0.3);
      float t = clamp((vHeight + 1.0) / 4.0, 0.0, 1.0);
      vec3 baseColor = mix(deepColor, shallowColor, t);
      baseColor = mix(baseColor, peakColor, max(0.0, t - 0.7) * 3.0);
      vec3 color = baseColor * (0.3 + 0.7 * diff);
      gl_FragColor = vec4(color, 0.92);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
})
const waterMesh = new THREE.Mesh(waterGeo, waterMat)
waterMesh.rotation.x = -Math.PI / 2
waterMesh.position.y = 0
scene.add(waterMesh)

// 粒子系统（跟随波峰）
const particleGeo = new THREE.BufferGeometry()
const particlePositions = new Float32Array(params.numParticles * 3)
const particleSizes = new Float32Array(params.numParticles)
const particleColors = new Float32Array(params.numParticles * 3)
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1))
particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))
const particleMat = new THREE.PointsMaterial({
  size: 0.25,
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  sizeAttenuation: true
})
const particleSystem = new THREE.Points(particleGeo, particleMat)
scene.add(particleSystem)

// 初始化粒子位置
const particleData = []
for (let i = 0; i < params.numParticles; i++) {
  const px = (Math.random() - 0.5) * 58
  const py = (Math.random() - 0.5) * 38
  particleData.push({ x: px, y: py })
}

// 添加边界墙可视化
const wallGeo = new THREE.BoxGeometry(60.5, 0.5, 5)
const wallMat = new THREE.MeshPhongMaterial({ color: 0x223344, transparent: true, opacity: 0.5 })
const wall1 = new THREE.Mesh(wallGeo, wallMat)
wall1.position.set(0, -0.25, -20.5)
scene.add(wall1)
const wall2 = new THREE.Mesh(wallGeo, wallMat.clone())
wall2.position.set(0, -0.25, 19.5)
scene.add(wall2)

// 灯光
scene.add(new THREE.AmbientLight(0x334466, 0.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
dirLight.position.set(5, 10, 5)
scene.add(dirLight)
const pointLight = new THREE.PointLight(0x00aaff, 1.5, 50)
pointLight.position.set(0, 15, 0)
scene.add(pointLight)

// Soliton 函数
function soliton(x, center, speed, height) {
  // KdV 孤波：sech² 形状
  const k = Math.sqrt(speed) / 2
  const dist = x - center
  return height / (Math.cosh(k * dist) * Math.cosh(k * dist))
}

// 添加孤立波到场
function addSoliton(field, x, center, speed, height) {
  const iCenter = Math.floor((x + 30) / cellW)
  const spread = 20
  for (let di = -spread; di <= spread; di++) {
    const idx = iCenter + di
    if (idx >= 0 && idx < gridW) {
      for (let j = 0; j < gridH; j++) {
        const worldX = (idx - gridW / 2) * cellW
        const worldY = (j - gridH / 2) * cellH
        const distSq = worldY * worldY / (cellH * cellH * 400)
        field[idx * gridH + j] += soliton(worldX, center, speed, height) * Math.exp(-distSq)
      }
    }
  }
}

// 初始化波场
function initWaves(t) {
  heightField.fill(0)
  // 两个孤立波：从左右两侧出发
  const x1 = -25 + t * params.soliton1Speed   // 右侧→左侧
  const x2 = 25 + t * params.soliton2Speed    // 左侧→右侧
  addSoliton(heightField, -30, x1, params.soliton1Speed, params.soliton1Height)
  addSoliton(heightField, 30, x2, params.soliton2Speed, params.soliton2Height)
}

// KdV 波传播一步
function stepKdV(dt) {
  const c2 = 1.0  // 波速平方
  const nu = 0.005 // 耗散
  
  // 简单有限差分：波动方程 + KdV 非线性项
  for (let i = 1; i < gridW - 1; i++) {
    for (let j = 1; j < gridH - 1; j++) {
      const idx = i * gridH + j
      const laplacian = (
        heightField[(i - 1) * gridH + j] +
        heightField[(i + 1) * gridH + j] +
        heightField[i * gridH + j - 1] +
        heightField[i * gridH + j + 1] -
        4 * heightField[idx]
      )
      // KdV: u_t + u*u_x + nu*u_xx = 0
      const advection = 0.5 * (
        heightField[(i + 1) * gridH + j] * heightField[(i + 1) * gridH + j] -
        heightField[(i - 1) * gridH + j] * heightField[(i - 1) * gridH + j]
      ) / (2 * cellW)
      
      velocity[idx] += (c2 * laplacian / (cellW * cellW) - advection) * dt
      velocity[idx] *= (1 - params.damping)
    }
  }
  
  // 更新高度
  for (let i = 0; i < gridW * gridH; i++) {
    heightField[i] += velocity[i] * dt
  }
  
  // 边界条件（软吸收）
  for (let i = 0; i < gridW; i++) {
    for (const j of [0, gridH - 1]) {
      heightField[i * gridH + j] *= 0.95
    }
  }
  for (let j = 0; j < gridH; j++) {
    for (const i of [0, gridW - 1]) {
      heightField[i * gridH + j] *= 0.95
    }
  }
}

// 更新水面几何体
function updateWaterMesh() {
  const positions = waterGeo.attributes.position.array
  for (let i = 0; i < gridW; i++) {
    for (let j = 0; j < gridH; j++) {
      const idx = i * gridH + j
      const vertIdx = i * gridH + j
      positions[vertIdx * 3 + 2] = heightField[idx] * params.amplitude
    }
  }
  waterGeo.attributes.position.needsUpdate = true
  waterGeo.computeVertexNormals()
}

// 更新粒子（跟随波峰）
function updateParticles() {
  const positions = particleGeo.attributes.position.array
  const colors = particleGeo.attributes.color.array
  const sizes = particleGeo.attributes.size.array
  
  for (let p = 0; p < params.numParticles; p++) {
    const pd = particleData[p]
    // 找到最近的网格点
    const gi = Math.round((pd.x + 30) / cellW)
    const gj = Math.round((pd.y + 20) / cellH)
    if (gi >= 0 && gi < gridW && gj >= 0 && gj < gridH) {
      const idx = gi * gridH + gj
      const h = heightField[idx] * params.amplitude
      positions[p * 3 + 2] = h + 0.2
      
      // 颜色基于高度
      const t = Math.max(0, Math.min(1, (h + 1) / 4))
      colors[p * 3] = t
      colors[p * 3 + 1] = 0.3 + t * 0.5
      colors[p * 3 + 2] = 0.7 + t * 0.3
      
      // 大小随高度
      sizes[p] = 0.15 + Math.max(0, h) * 0.1
    }
  }
  
  particleGeo.attributes.position.needsUpdate = true
  particleGeo.attributes.color.needsUpdate = true
  particleGeo.attributes.size.needsUpdate = true
}

// GUI
const gui = new GUI()
gui.add(params, 'soliton1Speed', 0.5, 6.0).name('Soliton 1 Speed')
gui.add(params, 'soliton2Speed', 0.5, 6.0).name('Soliton 2 Speed')
gui.add(params, 'soliton1Height', 0.5, 5.0).name('Soliton 1 Height')
gui.add(params, 'soliton2Height', 0.5, 5.0).name('Soliton 2 Height')
gui.add(params, 'amplitude', 0.1, 2.0).name('Amplitude')
gui.add(params, 'damping', 0, 0.1).name('Damping')

// 重置按钮
let resetTime = 0
gui.add({ reset: () => { resetTime = 0; heightField.fill(0); velocity.fill(0) } }, 'reset').name('Reset')

// 时间
const clock = new THREE.Clock()
let globalTime = 0

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.025)
  globalTime += dt
  resetTime += dt

  // 重新注入孤立波
  if (resetTime < 0.5) {
    initWaves(resetTime)
  } else {
    // 波传播
    for (let step = 0; step < 3; step++) {
      stepKdV(dt / 3)
    }
    // 持续补充孤立波（创造持续的碰撞演示）
    heightField.fill(0)
    addSoliton(heightField, -30, -25 + globalTime * params.soliton1Speed, params.soliton1Speed, params.soliton1Height)
    addSoliton(heightField, 30, 25 + globalTime * params.soliton2Speed, params.soliton2Speed, params.soliton2Height)
    // KdV 传播
    for (let step = 0; step < 2; step++) {
      stepKdV(dt / 2)
    }
  }

  updateWaterMesh()
  updateParticles()
  waterMat.uniforms.uTime.value = globalTime
  
  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
