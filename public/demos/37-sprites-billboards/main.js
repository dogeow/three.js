import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050913)
scene.fog = new THREE.FogExp2(0x050913, 0.02)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.5, 11)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 2.2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const dir = new THREE.DirectionalLight(0xffffff, 1.3)
dir.position.set(4, 8, 5)
scene.add(dir)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(12, 80),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.96, metalness: 0.04 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1
scene.add(floor)

function createSpriteTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(128, 128, 12, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.18, 'rgba(180,240,255,0.95)')
  gradient.addColorStop(0.45, 'rgba(64,160,255,0.55)')
  gradient.addColorStop(1, 'rgba(64,160,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const spriteTexture = createSpriteTexture()
const sprites = []

for (let i = 0; i < 28; i++) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: spriteTexture,
      color: new THREE.Color().setHSL(0.55 + (i % 6) * 0.05, 0.8, 0.62),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  )

  const angle = (i / 28) * Math.PI * 2
  const radius = 2 + (i % 4) * 0.7
  sprite.position.set(
    Math.cos(angle) * radius,
    1 + (i % 5) * 0.55,
    Math.sin(angle) * radius
  )
  const size = 0.9 + (i % 3) * 0.45
  sprite.scale.setScalar(size)
  scene.add(sprite)
  sprites.push(sprite)
}

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.4, 1),
  new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.7,
    roughness: 0.28,
    metalness: 0.18
  })
)
core.position.y = 2.2
scene.add(core)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  core.rotation.x = t * 0.35
  core.rotation.y = t * 0.6

  sprites.forEach((sprite, index) => {
    const angle = (index / sprites.length) * Math.PI * 2 + t * 0.28
    const radius = 2 + (index % 4) * 0.7
    sprite.position.x = Math.cos(angle) * radius
    sprite.position.z = Math.sin(angle) * radius
    sprite.position.y = 1.2 + (index % 5) * 0.55 + Math.sin(t * 2 + index) * 0.18
    const pulse = 0.85 + Math.sin(t * 4 + index) * 0.2
    sprite.scale.setScalar((0.9 + (index % 3) * 0.45) * pulse)
  })

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