import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x08111c)
scene.fog = new THREE.FogExp2(0x08111c, 0.022)

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 4.5, 18)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 5
controls.maxDistance = 48
controls.target.set(0, 1.8, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dir = new THREE.DirectionalLight(0xffffff, 1.4)
dir.position.set(5, 10, 6)
scene.add(dir)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(20, 80),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.4
scene.add(floor)

const sharedMaterial = new THREE.MeshStandardMaterial({
  color: 0x60a5fa,
  emissive: 0x1d4ed8,
  emissiveIntensity: 0.22,
  metalness: 0.24,
  roughness: 0.22,
  flatShading: true
})

function makeLabelRing(radius, count, color) {
  const group = new THREE.Group()
  for (let i = 0; i < count; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      new THREE.MeshBasicMaterial({ color })
    )
    const angle = (i / count) * Math.PI * 2
    dot.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    group.add(dot)
  }
  return group
}

const lod = new THREE.LOD()

const high = new THREE.Group()
high.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 3), sharedMaterial.clone()))
high.add(makeLabelRing(2.6, 48, 0x93c5fd))

const medium = new THREE.Group()
medium.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), sharedMaterial.clone()))
medium.add(makeLabelRing(2.5, 24, 0x60a5fa))

const low = new THREE.Group()
low.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.9, 0), sharedMaterial.clone()))
low.add(makeLabelRing(2.35, 12, 0x2563eb))

const billboard = new THREE.Sprite(
  new THREE.SpriteMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.85
  })
)
billboard.scale.set(2.8, 2.8, 1)

lod.addLevel(high, 0)
lod.addLevel(medium, 12)
lod.addLevel(low, 22)
lod.addLevel(billboard, 34)
lod.position.y = 1.8
scene.add(lod)

const distanceEl = document.querySelector('#distance')
const levelEl = document.querySelector('#level')
const levels = ['高模', '中模', '低模', 'Billboard']

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  lod.rotation.y = t * 0.35
  lod.update(camera)

  const distance = camera.position.distanceTo(lod.position)
  const active = lod.getCurrentLevel()
  distanceEl.textContent = distance.toFixed(1)
  levelEl.textContent = levels[active] || `层级 ${active}`

  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})