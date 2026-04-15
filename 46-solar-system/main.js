import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()

// ============ 满天星 ============
{
  const starsGeo = new THREE.BufferGeometry()
  const positions = []
  for (let i = 0; i < 2000; i++) {
    // 在一个大球壳里随机撒点
    const r = 80 + Math.random() * 20
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 2 - 1)
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    )
  }
  starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const stars = new THREE.Points(
    starsGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true })
  )
  scene.add(stars)
}

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 25, 45)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 0, 0)

// ============ 太阳 ============
// MeshBasicMaterial 不受光影响 —— 因为太阳本身就是光源
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(2.5, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0xffcc33 })
)
scene.add(sun)

// 在太阳位置放点光源，照亮所有行星
const sunLight = new THREE.PointLight(0xffffff, 2.5, 200, 0)
sun.add(sunLight) // 挂在太阳里，太阳动它跟着动

// 微弱环境光，避免行星背面全黑
scene.add(new THREE.AmbientLight(0xffffff, 0.05))

// ============ 工厂函数：创建一颗行星 ============
// 关键技巧：每颗行星用「轨道节点 (Object3D)」承载
//   orbit (旋转 = 公转) → planet (旋转 = 自转)
function createPlanet({ size, color, distance, speed, rotateSpeed }) {
  const orbit = new THREE.Object3D() // 空节点，作为公转的「转盘」
  scene.add(orbit)

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(size, 32, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
  )
  planet.position.x = distance // 离父节点（轨道）的半径
  orbit.add(planet)

  // 画一个轨道圆环（视觉辅助）
  const ringGeo = new THREE.RingGeometry(distance - 0.02, distance + 0.02, 128)
  const ring = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ color: 0x444466, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
  )
  ring.rotation.x = -Math.PI / 2
  scene.add(ring)

  return { orbit, planet, speed, rotateSpeed }
}

// 8 大行星（参数仅为视觉效果，不是真实比例）
const planets = [
  createPlanet({ size: 0.3, color: 0xa9a9a9, distance: 5,  speed: 1.6, rotateSpeed: 0.03 }), // 水
  createPlanet({ size: 0.5, color: 0xffcc99, distance: 7,  speed: 1.2, rotateSpeed: 0.02 }), // 金
  createPlanet({ size: 0.55,color: 0x3b82f6, distance: 9.5,speed: 1.0, rotateSpeed: 0.04 }), // 地
  createPlanet({ size: 0.4, color: 0xc1440e, distance: 12, speed: 0.8, rotateSpeed: 0.04 }), // 火
  createPlanet({ size: 1.2, color: 0xd2b48c, distance: 16, speed: 0.45,rotateSpeed: 0.05 }), // 木
  createPlanet({ size: 1.0, color: 0xf5deb3, distance: 20, speed: 0.35,rotateSpeed: 0.05 }), // 土
  createPlanet({ size: 0.8, color: 0x88e0e0, distance: 24, speed: 0.25,rotateSpeed: 0.04 }), // 天王
  createPlanet({ size: 0.78,color: 0x4060ff, distance: 28, speed: 0.18,rotateSpeed: 0.04 }), // 海王
]

// ============ 给地球加一颗月亮 ============
// 地球是 planets[2].planet
// 月亮挂在「月亮轨道」下，再把月亮轨道挂在地球下
// 这样地球公转时月亮跟着走，月亮还能围着地球转
const earth = planets[2].planet
const moonOrbit = new THREE.Object3D()
earth.add(moonOrbit)
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 1 })
)
moon.position.x = 1
moonOrbit.add(moon)

// 土星环
{
  const saturn = planets[5].planet
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.3, 2, 64),
    new THREE.MeshBasicMaterial({ color: 0xd4a373, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
  )
  ring.rotation.x = -Math.PI / 2.3
  saturn.add(ring)
}

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()

  sun.rotation.y += dt * 0.1

  planets.forEach(({ orbit, planet, speed, rotateSpeed }) => {
    orbit.rotation.y += dt * speed * 0.4   // 公转
    planet.rotation.y += rotateSpeed       // 自转
  })

  moonOrbit.rotation.y += dt * 2 // 月亮绕地球

  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

// 调试用
window.scene = scene
window.planets = planets