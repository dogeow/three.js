// 增强：程序化体素城市
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008)
const camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 3000)
camera.position.set(70, 100, 70)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
const mats = [
  new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 }),
  new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.3, metalness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0x44ff44, roughness: 0.6 }),
  new THREE.MeshStandardMaterial({ color: 0xff8844, roughness: 0.5, metalness: 0.3 }),
]
const city = new THREE.Group()
for (let x = -20; x < 20; x++) {
  for (let z = -20; z < 20; z++) {
    if (Math.random() > 0.6) continue
    const h = Math.random() * 8 + 1
    const geo = new THREE.BoxGeometry(2, 2 * h, 2)
    const mesh = new THREE.Mesh(geo, mats[Math.floor(Math.random() * mats.length)])
    mesh.position.set(x * 2.4, h, z * 2.4)
    mesh.castShadow = true
    mesh.receiveShadow = true
    city.add(mesh)
  }
}
scene.add(city)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x222222 }))
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xffffff, 1)
sun.position.set(50, 100, 50)
sun.castShadow = true
scene.add(sun)
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight) })