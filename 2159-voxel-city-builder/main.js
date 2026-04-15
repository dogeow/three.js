// 2159. Voxel City Builder - Enhanced Edition
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008)

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(55, 90, 55)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true; controls.dampingFactor = 0.06
controls.maxPolarAngle = Math.PI / 2.1; controls.minDistance = 20; controls.maxDistance = 200

// Lighting
scene.add(new THREE.AmbientLight(0x334466, 0.5))
const sun = new THREE.DirectionalLight(0xffeedd, 1.2)
sun.position.set(60, 120, 60); sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = sun.shadow.camera.bottom = -100
sun.shadow.camera.right = sun.shadow.camera.top = 100; sun.shadow.camera.far = 400
scene.add(sun)
const fillLight = new THREE.PointLight(0x4488ff, 0.8, 150)
fillLight.position.set(-40, 30, -40); scene.add(fillLight)

// Materials
const matC = new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.85 })
const matG = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.75 })
const matGr = new THREE.MeshStandardMaterial({ color: 0x2d7d46, roughness: 0.7 })
const matD = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9, metalness: 0.2 })

// City Generation
const buildings = []
for (let x = -22; x < 22; x++) {
  for (let z = -22; z < 22; z++) {
    if (Math.random() > 0.58) continue
    const h = Math.random() * 10 + 1.5
    const geo = new THREE.BoxGeometry(2 * (0.7 + Math.random() * 0.5), h * 2, 2 * (0.7 + Math.random() * 0.5))
    const r = Math.random()
    let mat = r > 0.75 ? matG.clone() : (r > 0.5 ? matGr.clone() : [matC, matD][Math.floor(Math.random() * 2)].clone())
    if (r > 0.75) { mat.emissive = new THREE.Color(0x112233); mat.emissiveIntensity = Math.random() * 0.5 }
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x * 2.4, h, z * 2.4)
    mesh.castShadow = mesh.receiveShadow = true
    mesh.userData = { baseY: h, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5, origEmissive: mat.emissiveIntensity || 0.1 }
    buildings.push(mesh); scene.add(mesh)
  }
}

// Ground & Grid
const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.95 }))
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
scene.add(new THREE.GridHelper(200, 40, 0x334466, 0x222244))

// Particles - Stars
const sPos = new Float32Array(1500 * 3)
for (let i = 0; i < 4500; i++) sPos[i] = (Math.random() - 0.5) * 600
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.5, transparent: true, opacity: 0.8 })))

// Particles - Floating Dust
const dPos = new Float32Array(300 * 3), dVel = new Float32Array(300 * 3)
for (let i = 0; i < 300; i++) {
  dPos[i * 3] = (Math.random() - 0.5) * 100; dPos[i * 3 + 1] = Math.random() * 30 + 2; dPos[i * 3 + 2] = (Math.random() - 0.5) * 100
  dVel[i * 3] = (Math.random() - 0.5) * 0.05; dVel[i * 3 + 1] = 0.02 + Math.random() * 0.03; dVel[i * 3 + 2] = (Math.random() - 0.5) * 0.05
}
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3))
scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xff8844, size: 0.3, transparent: true, opacity: 0.6 })))

// Mouse Raycasting
const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2()
let hovered = null, clicked = null
window.addEventListener('mousemove', e => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1 })
window.addEventListener('click', () => {
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(buildings)
  if (hits.length > 0) {
    clicked = hits[0].object; clicked.material.emissive = new THREE.Color(0xffffff); clicked.material.emissiveIntensity = 3.0
    setTimeout(() => { if (clicked) clicked.material.emissiveIntensity = clicked.userData.origEmissive }, 200)
  }
})

// Animation
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()
  controls.update()

  buildings.forEach(b => { b.position.y = b.userData.baseY + Math.sin(elapsed * b.userData.speed + b.userData.phase) * 0.3; b.rotation.y += 0.002 })

  for (let i = 0; i < 300; i++) {
    dPos[i * 3] += dVel[i * 3]; dPos[i * 3 + 1] += dVel[i * 3 + 1]; dPos[i * 3 + 2] += dVel[i * 3 + 2]
    if (dPos[i * 3 + 1] > 40) { dPos[i * 3] = (Math.random() - 0.5) * 100; dPos[i * 3 + 1] = 2; dPos[i * 3 + 2] = (Math.random() - 0.5) * 100 }
  }
  dustGeo.attributes.position.needsUpdate = true

  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(buildings)
  if (hovered && hovered !== clicked) hovered.material.emissiveIntensity = hovered.userData.origEmissive
  if (hits.length > 0) {
    hovered = hits[0].object
    if (hovered !== clicked) { hovered.material.emissive = new THREE.Color(0x4488ff); hovered.material.emissiveIntensity = 0.5 }
    document.body.style.cursor = 'pointer'
  } else { hovered = null; document.body.style.cursor = 'default' }

  fillLight.intensity = 0.6 + Math.sin(elapsed * 0.7) * 0.2
  sun.position.x = 60 + Math.sin(elapsed * 0.1) * 10; sun.position.z = 60 + Math.cos(elapsed * 0.1) * 10
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
