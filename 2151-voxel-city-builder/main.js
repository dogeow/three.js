// 2151. 体素城市构建器 - Enhanced Edition
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.006)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(50, 80, 50)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.4, 0.85))

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredBuilding = null

const matGlass = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.8, emissive: 0x224466, emissiveIntensity: 0.3 })
const matBrick = new THREE.MeshStandardMaterial({ color: 0xcc6644, roughness: 0.85 })
const matOffice = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.2, metalness: 0.6, emissive: 0x112244, emissiveIntensity: 0.5 })
const mats = [matGlass, matBrick, matOffice]

// 生成城市
const city = new THREE.Group()
const buildings = []
const grid = 18, size = 2

for (let x = -grid; x < grid; x++) {
  for (let z = -grid; z < grid; z++) {
    if (Math.random() > 0.55) continue
    const h = Math.random() * 10 + 2
    const geo = new THREE.BoxGeometry(size, size * h, size)
    const mat = mats[Math.floor(Math.random() * mats.length)].clone()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x * size * 1.2, size * h / 2, z * size * 1.2)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = { baseHeight: size * h, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.5 }
    buildings.push(mesh)
    city.add(mesh)
  }
}
scene.add(city)

const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9 }))
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)
scene.add(new THREE.GridHelper(200, 40, 0x222244, 0x111122))

scene.add(new THREE.AmbientLight(0x334466, 0.5))
const sun = new THREE.DirectionalLight(0xffeedd, 1.2)
sun.position.set(80, 120, 60)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
scene.add(sun)
const cityGlow = new THREE.PointLight(0xff6600, 2, 80)
cityGlow.position.set(0, 5, 0)
scene.add(cityGlow)

const pCount = 1500
const pGeo = new THREE.BufferGeometry()
const pPos = new Float32Array(pCount * 3)
for (let i = 0; i < pCount; i++) { pPos[i * 3] = (Math.random() - 0.5) * 400; pPos[i * 3 + 1] = Math.random() * 150 + 20; pPos[i * 3 + 2] = (Math.random() - 0.5) * 400 }
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.5, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }))
scene.add(particles)

// 鼠标交互
window.addEventListener('mousemove', e => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1 })

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()
  controls.update()

  // 射线检测悬停
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(buildings)
  if (hoveredBuilding) hoveredBuilding.material.emissiveIntensity = 0.3
  hoveredBuilding = hits.length ? hits[0].object : null
  if (hoveredBuilding) { hoveredBuilding.material.emissiveIntensity = 1.5; document.body.style.cursor = 'pointer' }
  else document.body.style.cursor = 'default'

  // Animate buildings
  buildings.forEach(b => { b.scale.y = 1 + Math.sin(elapsed * b.userData.speed + b.userData.phase) * 0.015 })

  // Animate particles
  const pos = particles.geometry.attributes.position.array
  for (let i = 0; i < pCount; i++) { pos[i * 3 + 1] += 0.03; if (pos[i * 3 + 1] > 170) pos[i * 3 + 1] = 20 }
  particles.geometry.attributes.position.needsUpdate = true
  particles.rotation.y = elapsed * 0.01

  // Animate glow
  cityGlow.intensity = 1.5 + Math.sin(elapsed * 0.5) * 0.5
  cityGlow.position.x = Math.sin(elapsed * 0.3) * 20
  camera.position.y = 80 + Math.sin(elapsed * 0.2) * 2

  composer.render()
}

window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight) })
animate()
