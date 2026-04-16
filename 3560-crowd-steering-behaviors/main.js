// 3560. Crowd Steering Behaviors
// 群体引导行为 - Boid算法：寻路、分离、聚集、追逐
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.008)

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 80, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 地面
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200, 40, 40),
  new THREE.MeshStandardMaterial({ color: 0x0a0a1a, roughness: 0.9 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// 网格线
const grid = new THREE.GridHelper(200, 20, 0x222244, 0x111122)
scene.add(grid)

const BOID_COUNT = 300
const boids = []

// Boid颜色映射速度
const speedGeo = new THREE.ConeGeometry(0.4, 1.2, 4)
const speedMats = [
  new THREE.MeshBasicMaterial({ color: 0x4488ff }),
  new THREE.MeshBasicMaterial({ color: 0x44ff88 }),
  new THREE.MeshBasicMaterial({ color: 0xffcc00 }),
  new THREE.MeshBasicMaterial({ color: 0xff4444 }),
]

function randomInRange(min, max) { return min + Math.random() * (max - min) }

class Boid {
  constructor() {
    this.position = new THREE.Vector3(randomInRange(-60, 60), randomInRange(2, 15), randomInRange(-60, 60))
    this.velocity = new THREE.Vector3(randomInRange(-0.3, 0.3), 0, randomInRange(-0.3, 0.3))
    this.acceleration = new THREE.Vector3()
    this.maxSpeed = 0.4
    this.maxForce = 0.01
    this.neighborDist = 12
    this.separateDist = 4
    this.matIdx = 0

    const mat = speedMats[Math.floor(Math.random() * speedMats.length)]
    this.mesh = new THREE.Mesh(speedGeo, mat)
    this.mesh.rotation.x = Math.PI / 2
    scene.add(this.mesh)
  }

  edges() {
    if (this.position.x > 80) this.position.x = -80
    if (this.position.x < -80) this.position.x = 80
    if (this.position.z > 80) this.position.z = -80
    if (this.position.z < -80) this.position.z = 80
    if (this.position.y > 30) this.position.y = 30
    if (this.position.y < 2) this.position.y = 2
  }

  align(boids) {
    let sum = new THREE.Vector3()
    let count = 0
    for (const other of boids) {
      const d = this.position.distanceTo(other.position)
      if (d > 0 && d < this.neighborDist) {
        sum.add(other.velocity)
        count++
      }
    }
    if (count > 0) {
      sum.divideScalar(count)
      sum.setLength(this.maxSpeed)
      const steer = sum.sub(this.velocity)
      steer.clampLength(0, this.maxForce)
      return steer
    }
    return new THREE.Vector3()
  }

  cohesion(boids) {
    let sum = new THREE.Vector3()
    let count = 0
    for (const other of boids) {
      const d = this.position.distanceTo(other.position)
      if (d > 0 && d < this.neighborDist) {
        sum.add(other.position)
        count++
      }
    }
    if (count > 0) {
      sum.divideScalar(count)
      return this.seek(sum)
    }
    return new THREE.Vector3()
  }

  separate(boids) {
    let steer = new THREE.Vector3()
    let count = 0
    for (const other of boids) {
      const d = this.position.distanceTo(other.position)
      if (d > 0 && d < this.separateDist) {
        const diff = new THREE.Vector3().subVectors(this.position, other.position)
        diff.divideScalar(d * d) // 越近越用力
        steer.add(diff)
        count++
      }
    }
    if (count > 0) {
      steer.divideScalar(count)
      steer.setLength(this.maxSpeed)
      steer.sub(this.velocity)
      steer.clampLength(0, this.maxForce)
      return steer
    }
    return new THREE.Vector3()
  }

  seek(target) {
    const desired = new THREE.Vector3().subVectors(target, this.position)
    desired.setLength(this.maxSpeed)
    const steer = desired.sub(this.velocity)
    steer.clampLength(0, this.maxForce)
    return steer
  }

  flock(boids) {
    const alignment = this.align(boids)
    const cohesion = this.cohesion(boids)
    const separation = this.separate(boids)
    alignment.multiplyScalar(1.0)
    cohesion.multiplyScalar(1.0)
    separation.multiplyScalar(1.5)
    this.acceleration.add(alignment).add(cohesion).add(separation)
  }

  update() {
    this.position.add(this.velocity)
    this.velocity.add(this.acceleration)
    this.velocity.clampLength(0, this.maxSpeed)
    this.acceleration.set(0, 0, 0)
    this.edges()

    // 更新mesh
    this.mesh.position.copy(this.position)
    const angle = Math.atan2(this.velocity.x, this.velocity.z)
    this.mesh.rotation.z = angle

    // 颜色按速度
    const speedRatio = this.velocity.length() / this.maxSpeed
    if (speedRatio < 0.33) this.mesh.material = speedMats[0]
    else if (speedRatio < 0.66) this.mesh.material = speedMats[1]
    else if (speedRatio < 0.9) this.mesh.material = speedMats[2]
    else this.mesh.material = speedMats[3]
  }
}

// 鼠标位置（吸引点）
const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const attractPoint = new THREE.Vector3()
const attractMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true })
)
scene.add(attractMesh)

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5)
  raycaster.ray.intersectPlane(plane, attractPoint)
  attractMesh.position.copy(attractPoint)
})

for (let i = 0; i < BOID_COUNT; i++) {
  boids.push(new Boid())
}

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const light = new THREE.PointLight(0x4488ff, 1.5, 200)
light.position.set(0, 50, 0)
scene.add(light)

function animate() {
  requestAnimationFrame(animate)
  for (const boid of boids) {
    boid.flock(boids)
    boid.update()
  }
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
