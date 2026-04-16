// 4254. Polymer Chain Rouse Dynamics
// 高分子链Rouse模型：珠子-弹簧链的随机运动
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 参数
const N = 40 // 珠子数
const R0 = 2.5 // 平衡弹簧长度
const KB = 0.08 // 弹簧刚度
const FRICTION = 0.12 // 摩擦系数
const DT = 0.016

// 初始化链：自由连接链初始构型
const particles = []
for (let i = 0; i < N; i++) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = i === 0 ? 0 : R0
  const x = i === 0 ? 0 : particles[i-1].x + r * Math.sin(phi) * Math.cos(theta)
  const y = i === 0 ? 0 : particles[i-1].y + r * Math.sin(phi) * Math.sin(theta)
  const z = i === 0 ? 0 : particles[i-1].z + r * Math.cos(phi)
  particles.push({ x, y, z, ox: x, oy: y, oz: z, fx: 0, fy: 0, fz: 0 })
}

// 创建珠子的可视化物
const sphereGeos = []
const sphereMats = []
for (let i = 0; i < N; i++) {
  const geo = new THREE.SphereGeometry(0.5, 16, 16)
  const t = i / (N - 1)
  const col = new THREE.Color().setHSL(0.6 + t * 0.4, 0.8, 0.5)
  const mat = new THREE.MeshPhongMaterial({ color: col, emissive: col.clone().multiplyScalar(0.3) })
  sphereGeos.push(geo)
  sphereMats.push(mat)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(particles[i].x, particles[i].y, particles[i].z)
  scene.add(mesh)
}

// 连接弹簧
const bondGeo = new THREE.BufferGeometry()
const bondPos = new Float32Array((N - 1) * 6)
bondGeo.setAttribute('position', new THREE.BufferAttribute(bondPos, 3))
const bondLine = new THREE.LineSegments(bondGeo, new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 }))
scene.add(bondLine)

// 端点特殊标记
const endGeo = new THREE.OctahedronGeometry(1.0, 0)
const endMat1 = new THREE.MeshPhongMaterial({ color: 0xff4444, emissive: 0x441111 })
const endMat2 = new THREE.MeshPhongMaterial({ color: 0x44ff44, emissive: 0x114411 })
const end1 = new THREE.Mesh(endGeo, endMat1)
const end2 = new THREE.Mesh(endGeo, endMat2)
scene.add(end1)
scene.add(end2)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(20, 30, 20)
scene.add(dirLight)
const ptLight = new THREE.PointLight(0x4488ff, 1, 100)
ptLight.position.set(-20, -10, 20)
scene.add(ptLight)

// 质心追踪
let comX = 0, comY = 0, comZ = 0
for (const p of particles) { comX += p.x; comY += p.y; comZ += p.z }
comX /= N; comY /= N; comZ /= N

function updatePhysics() {
  // 质心
  let cx = 0, cy = 0, cz = 0
  for (const p of particles) { cx += p.x; cy += p.y; cz += p.z }
  cx /= N; cy /= N; cz /= N

  // 力和速度
  for (let i = 0; i < N; i++) {
    const p = particles[i]
    p.fx = 0; p.fy = 0; p.fz = 0

    // 弹簧力
    if (i > 0) {
      const prev = particles[i - 1]
      const dx = p.x - prev.x, dy = p.y - prev.y, dz = p.z - prev.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.0001
      const f = KB * (dist - R0)
      p.fx -= f * dx / dist
      p.fy -= f * dy / dist
      p.fz -= f * dz / dist
      prev.fx += f * dx / dist
      prev.fy += f * dy / dist
      prev.fz += f * dz / dist
    }
    if (i < N - 1) {
      const next = particles[i + 1]
      const dx = p.x - next.x, dy = p.y - next.y, dz = p.z - next.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.0001
      const f = KB * (dist - R0)
      p.fx -= f * dx / dist
      p.fy -= f * dy / dist
      p.fz -= f * dz / dist
      next.fx += f * dx / dist
      next.fy += f * dy / dist
      next.fz += f * dz / dist
    }

    // 随机力（热噪声）
    p.fx += (Math.random() - 0.5) * 0.3
    p.fy += (Math.random() - 0.5) * 0.3
    p.fz += (Math.random() - 0.5) * 0.3

    // Verlet积分
    const vx = (p.x - p.ox) * FRICTION, vy = (p.y - p.oy) * FRICTION, vz = (p.z - p.oz) * FRICTION
    p.ox = p.x; p.oy = p.y; p.oz = p.z
    p.x += vx + p.fx * DT
    p.y += vy + p.fy * DT
    p.z += vz + p.fz * DT
  }
}

function updateVisuals() {
  for (let i = 0; i < N; i++) {
    const p = particles[i]
    scene.children.forEach(c => {
      if (c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry) {
        if (Math.abs(c.position.x - p.ox) < 0.01 && Math.abs(c.position.y - p.oy) < 0.01) {
          c.position.set(p.x, p.y, p.z)
        }
      }
    })
  }
  // 直接重新创建珠子位置
  for (let i = 0; i < N; i++) {
    const p = particles[i]
    sphereMats[i] && (sphereMats[i] = sphereMats[i]) // keep ref
  }
}

const meshRefs = []
for (let i = 0; i < N; i++) {
  const mesh = new THREE.Mesh(sphereGeos[i], sphereMats[i])
  mesh.position.set(particles[i].x, particles[i].y, particles[i].z)
  scene.add(mesh)
  meshRefs.push(mesh)
}

function animate() {
  requestAnimationFrame(animate)
  updatePhysics()

  for (let i = 0; i < N; i++) {
    const p = particles[i]
    meshRefs[i].position.set(p.x, p.y, p.z)
  }

  // 更新弹簧线
  const bp = bondGeo.attributes.position.array
  for (let i = 0; i < N - 1; i++) {
    bp[i * 6] = particles[i].x; bp[i * 6 + 1] = particles[i].y; bp[i * 6 + 2] = particles[i].z
    bp[i * 6 + 3] = particles[i + 1].x; bp[i * 6 + 4] = particles[i + 1].y; bp[i * 6 + 5] = particles[i + 1].z
  }
  bondGeo.attributes.position.needsUpdate = true

  end1.position.set(particles[0].x, particles[0].y, particles[0].z)
  end2.position.set(particles[N-1].x, particles[N-1].y, particles[N-1].z)

  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
