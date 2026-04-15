// 2199. 体素城市构建器
// 用体素方块构建程序化城市
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000)
camera.position.set(50, 80, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 体素材质
const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 })
const mat2 = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.3, metalness: 0.5 })
const mat3 = new THREE.MeshStandardMaterial({ color: 0x44ff44, roughness: 0.6 })

// 程序化生成城市
const city = new THREE.Group()
const grid = 20, size = 2
for (let x = -grid; x < grid; x++) {
  for (let z = -grid; z < grid; z++) {
    if (Math.random() > 0.6) continue
    const h = Math.random() * 8 + 1
    const geo = new THREE.BoxGeometry(size, size * h, size)
    const m = Math.random() > 0.7 ? mat2 : (Math.random() > 0.5 ? mat3 : mat)
    const mesh = new THREE.Mesh(geo, m)
    mesh.position.set(x * size * 1.2, size * h / 2, z * size * 1.2)
    mesh.castShadow = true
    mesh.receiveShadow = true
    city.add(mesh)
  }
}
scene.add(city)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x333333 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xffffff, 1)
sun.position.set(50, 100, 50)
sun.castShadow = true
scene.add(sun)

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
