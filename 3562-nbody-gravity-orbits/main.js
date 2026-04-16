// 3562. N-body Gravity Orbits
// N体引力模拟 - 多星体引力相互作用，轨道力学
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000008)
scene.fog = new THREE.FogExp2(0x000008, 0.003)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 3000)
camera.position.set(0, 120, 200)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const G = 800 // 引力常数（相对单位）
const DT = 0.016

class Body {
  constructor(pos, vel, mass, radius, color, isStar = false) {
    this.position = pos.clone()
    this.velocity = vel.clone()
    this.mass = mass
    this.radius = radius
    this.isStar = isStar
    this.force = new THREE.Vector3()

    const geo = new THREE.SphereGeometry(radius, isStar ? 32 : 16, isStar ? 32 : 16)
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: isStar ? color : 0x000000,
      emissiveIntensity: isStar ? 0.5 : 0,
      roughness: 0.5,
      metalness: 0.3
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = !isStar
    scene.add(this.mesh)

    // 轨迹
    this.trail = []
    this.trailMax = 200
    const trailGeo = new THREE.BufferGeometry()
    const trailMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
    this.trailLine = new THREE.Line(trailGeo, trailMat)
    this.trailPositions = new Float32Array(this.trailMax * 3)
    scene.add(this.trailLine)
  }

  applyForce(force) {
    this.force.add(force)
  }

  update(bodies) {
    // 初始化力
    this.force.set(0, 0, 0)

    // 引力
    for (const other of bodies) {
      if (other === this) continue
      const dir = new THREE.Vector3().subVectors(other.position, this.position)
      const distSq = Math.max(dir.lengthSq(), 1)
      const dist = Math.sqrt(distSq)
      dir.normalize()
      const f = G * this.mass * other.mass / distSq
      dir.multiplyScalar(f)
      this.applyForce(dir)
    }

    // Verlet / Euler 积分
    const accel = this.force.clone().divideScalar(this.mass)
    this.velocity.add(accel.multiplyScalar(DT))
    this.position.add(this.velocity.clone().multiplyScalar(DT))

    this.mesh.position.copy(this.position)

    // 轨迹
    this.trail.push(this.position.clone())
    if (this.trail.length > this.trailMax) this.trail.shift()
    for (let i = 0; i < this.trail.length; i++) {
      this.trailPositions[i * 3] = this.trail[i].x
      this.trailPositions[i * 3 + 1] = this.trail[i].y
      this.trailPositions[i * 3 + 2] = this.trail[i].z
    }
    this.trailLine.geometry.setAttribute('position',
      new THREE.BufferAttribute(this.trailPositions.slice(0, this.trail.length * 3), 3))
  }
}

// 创建恒星和行星
const bodies = []

// 中心恒星
const sun = new Body(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
  5000, 8, 0xffcc44, true
)
bodies.push(sun)

// 行星 1 - 蓝色
const p1 = new Body(
  new THREE.Vector3(40, 0, 0),
  new THREE.Vector3(0, 0, 6.5),
  10, 2, 0x4488ff
)
bodies.push(p1)

// 行星 2 - 红色
const p2 = new Body(
  new THREE.Vector3(0, 0, 65),
  new THREE.Vector3(5.5, 0, 0),
  20, 3, 0xff4444
)
bodies.push(p2)

// 行星 3 - 绿色小卫星
const p3 = new Body(
  new THREE.Vector3(-80, 0, 20),
  new THREE.Vector3(0, 0, -4.5),
  5, 1.5, 0x44ff88
)
bodies.push(p3)

// 行星 4 - 椭圆轨道
const p4 = new Body(
  new THREE.Vector3(100, 0, 0),
  new THREE.Vector3(0, 0, 3.8),
  30, 4, 0xff8800
)
bodies.push(p4)

// 添加卫星到行星1
const moon = new Body(
  new THREE.Vector3(40 + 5, 0, 0),
  new THREE.Vector3(0, 0, 6.5 + 3),
  0.5, 0.5, 0xaaaaaa
)
moon.position.y = 3
moon.velocity.x = 0.05
bodies.push(moon)

// 星空背景
const starCount = 3000
const starPos = new Float32Array(starCount * 3)
for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = 800 + Math.random() * 400
  starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
  starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
  starPos[i * 3 + 2] = r * Math.cos(phi)
}
const starGeo = new THREE.BufferGeometry()
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: false })))

scene.add(new THREE.AmbientLight(0xffffff, 0.1))
const sunLight = new THREE.PointLight(0xffcc44, 3, 500)
sunLight.position.set(0, 0, 0)
scene.add(sunLight)

// UI
const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:16px;left:16px;color:#aaa;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.6);padding:10px;border-radius:6px;line-height:1.8'
info.innerHTML = '🪐 N体引力模拟<br>拖拽旋转 · 滚轮缩放<br>引力常数 G=800'
document.body.appendChild(info)

function animate() {
  requestAnimationFrame(animate)
  for (const body of bodies) body.update(bodies)
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
