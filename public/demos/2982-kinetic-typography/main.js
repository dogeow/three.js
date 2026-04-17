// 2982. Kinetic Typography
// 动力学文字 - 3D 文字物理动画，字符受重力/弹跳/堆积影响

import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080c14)
scene.fog = new THREE.FogExp2(0x080c14, 0.02)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 15, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.target.set(0, 5, 0)

scene.add(new THREE.AmbientLight(0x334466, 0.6))
const sun = new THREE.DirectionalLight(0xfff0dd, 1.5)
sun.position.set(20, 40, 20)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -40
sun.shadow.camera.right = 40
sun.shadow.camera.top = 40
sun.shadow.camera.bottom = -40
scene.add(sun)
const rim = new THREE.DirectionalLight(0x4488ff, 0.6)
rim.position.set(-15, 5, -15)
scene.add(rim)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.4, 0.6)
composer.addPass(bloom)

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Grid
const grid = new THREE.GridHelper(100, 50, 0x1f2937, 0x0f172a)
grid.position.y = 0.01
scene.add(grid)

// Physics letters
let GRAVITY = -15
const DAMPING = 0.75
const FRICTION = 0.92

class Letter {
  constructor(mesh, x, y, z) {
    this.mesh = mesh
    this.vx = (Math.random() - 0.5) * 6
    this.vy = 0
    this.vz = (Math.random() - 0.5) * 6
    this.rx = 0; this.ry = 0; this.rz = 0
    this.vrx = (Math.random() - 0.5) * 4
    this.vry = (Math.random() - 0.5) * 4
    this.vrz = (Math.random() - 0.5) * 4
    this.grounded = false
    this.groundY = 0.3
    mesh.position.set(x, y, z)
    scene.add(mesh)
    mesh.castShadow = true
  }

  update(dt) {
    if (this.grounded) return

    this.vy += GRAVITY * dt
    this.mesh.position.x += this.vx * dt
    this.mesh.position.y += this.vy * dt
    this.mesh.position.z += this.vz * dt

    this.mesh.rotation.x += this.vrx * dt
    this.mesh.rotation.y += this.vry * dt
    this.mesh.rotation.z += this.vrz * dt

    const h = this.groundY
    if (this.mesh.position.y < h) {
      this.mesh.position.y = h
      this.vy = -this.vy * DAMPING
      this.vx *= FRICTION
      this.vz *= FRICTION
      this.vrx *= 0.8
      this.vry *= 0.8
      this.vrz *= 0.8

      if (Math.abs(this.vy) < 0.5 && Math.abs(this.vx) < 0.3 && Math.abs(this.vz) < 0.3) {
        this.grounded = true
        this.vy = 0; this.vx = 0; this.vz = 0
        this.vrx = 0; this.vry = 0; this.vrz = 0
      }
    }

    // Bounds
    const B = 35
    if (Math.abs(this.mesh.position.x) > B) { this.vx *= -0.8; this.mesh.position.x = Math.sign(this.mesh.position.x) * B }
    if (Math.abs(this.mesh.position.z) > B) { this.vz *= -0.8; this.mesh.position.z = Math.sign(this.mesh.position.z) * B }
  }
}

const letters = []
let font = null

// Materials
const PALETTES = [
  [0xf87171, 0xfb923c, 0xfbbf24, 0x34d399, 0x60a5fa, 0xa78bfa, 0xf472b6],
  [0xfbbf24, 0xf59e0b, 0xef4444, 0xdc2626, 0x9333ea, 0x6366f1, 0x06b6d4],
  [0x10b981, 0x059669, 0x047857, 0x84cc16, 0x65a30d, 0xfacc15, 0xeab308],
]

let paletteIdx = 0
const mats = PALETTES[0].map(c => new THREE.MeshStandardMaterial({
  color: c, roughness: 0.4, metalness: 0.2,
  emissive: new THREE.Color(c).multiplyScalar(0.15)
}))

// Load font
const fontLoader = new FontLoader()
fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', (f) => {
  font = f
  spawnMessage("THREE.JS", -8, 30, 0)
})

function spawnMessage(text, ox, oy, oz) {
  const size = 2.0
  const height = 0.6
  let x = ox, y = oy, z = oz
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === ' ') { x += size * 0.7; continue }
    if (ch === '\n') { x = ox; y -= size * 1.4; continue }

    const geo = new TextGeometry(ch, { font, size, height: height, curveSegments: 4, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 2 })
    geo.computeBoundingBox()
    const mat = mats[i % mats.length].clone()
    mat.emissive = new THREE.Color(mat.color).multiplyScalar(0.1)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.3, z + (Math.random() - 0.5) * 0.3)
    const lh = size
    const letter = new Letter(mesh, mesh.position.x, mesh.position.y, mesh.position.z)
    letter.groundY = 0.3 + height * 0.5
    letters.push(letter)
    x += size * 0.85
  }
}

// Preload font fallback shapes
function spawnRandomShape(x, y, z) {
  const geo = Math.random() < 0.5
    ? new THREE.BoxGeometry(1.5, 1.5, 1.5)
    : new THREE.SphereGeometry(0.9, 16, 16)
  const mat = mats[Math.floor(Math.random() * mats.length)].clone()
  mat.emissive = new THREE.Color(mat.color).multiplyScalar(0.1)
  const mesh = new THREE.Mesh(geo, mat)
  const letter = new Letter(mesh, x, y, z)
  letter.groundY = 0.8
  letters.push(letter)
}

// Spawn on click
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

renderer.domElement.addEventListener('click', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)

  const dir = raycaster.ray.direction
  const pos = raycaster.ray.origin.clone().add(dir.multiplyScalar(25))
  pos.y = Math.max(pos.y, 25)

  if (font) {
    const phrases = ["HELLO", "THREE.JS", "WOW!", "TYPE", "KINETIC", "🎉"]
    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    spawnMessage(phrase, pos.x, pos.y, pos.z)
  } else {
    spawnRandomShape(pos.x, pos.y, pos.z)
  }
})

// Keyboard trigger
const MESSAGES = [
  ["K", "I", "N", "E", "T", "I", "C"],
  ["T", "Y", "P", "O", "G", "R", "A", "P", "H", "Y"],
  ["3", "D", " ", "W", "O", "R", "L", "D"],
]
let msgIdx = 0
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && font) {
    const msg = MESSAGES[msgIdx % MESSAGES.length]
    spawnMessage(msg.join(''), -10 + Math.random() * 5, 30, Math.random() * 5 - 2.5)
    msgIdx++
  }
})

// GUI
const gui = new GUI()
const params = {
  gravity: -15,
  bounce: 0.75,
  message: 'KINETIC',
}
gui.add(params, 'message', ['KINETIC', 'THREE.JS', 'HELLO WORLD', 'PARTICLES', 'WOW!']).name('Message')
gui.add(params, 'gravity', -30, 0).name('Gravity')
gui.add(params, 'bounce', 0, 1).name('Bounce').onChange(v => {
  for (const l of letters) l.vy *= v / DAMPING
})
gui.add({ spawn: () => {
  if (!font) return
  spawnMessage(params.message, -8, 30, 0)
}}, 'spawn').name('Spawn Message')

// HUD
const hud = document.createElement('div')
hud.style.cssText = 'position:fixed;bottom:16px;left:16px;color:#60a5fa;font-family:monospace;font-size:13px;pointer-events:none'
hud.innerHTML = '<div style="color:#f87171">● Kinetic Typography</div><div>Click to drop letters</div><div>Space to spawn preset</div>'
document.body.appendChild(hud)

const clock = new THREE.Clock()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  GRAVITY = params.gravity

  for (const letter of letters) letter.update(dt)
  controls.update()
  composer.render()
}

animate()
