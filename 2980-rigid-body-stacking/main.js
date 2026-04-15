// 2980. Rigid Body Stacking
// 刚体堆叠物理 - 用 cannon-es 模拟积木堆叠、倒塌

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import * as CANNON from 'cannon-es'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d1117)
scene.fog = new THREE.FogExp2(0x0d1117, 0.015)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 18, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.target.set(0, 5, 0)

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.5)
sun.position.set(20, 40, 20)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 100
sun.shadow.camera.left = -30
sun.shadow.camera.right = 30
sun.shadow.camera.top = 30
sun.shadow.camera.bottom = -30
scene.add(sun)
const fill = new THREE.DirectionalLight(0x4488ff, 0.4)
fill.position.set(-15, 10, -15)
scene.add(fill)

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.7)
composer.addPass(bloom)

// Ground
const groundGeo = new THREE.PlaneGeometry(60, 60)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.9, metalness: 0.1 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Grid
const grid = new THREE.GridHelper(60, 30, 0x2d3748, 0x1e2433)
grid.position.y = 0.01
scene.add(grid)

// Physics world
const world = new CANNON.World()
world.gravity.set(0, -20, 0)
world.broadphase = new CANNON.NaiveBroadphase()
world.solver.iterations = 20
world.defaultContactMaterial.friction = 0.6
world.defaultContactMaterial.restitution = 0.15

// Ground physics body
const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() })
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(groundBody)

// Block colors
const COLORS = [0xf87171, 0xfb923c, 0xfbbf24, 0x34d399, 0x60a5fa, 0xa78bfa, 0xf472b6]
const mats = COLORS.map(c => new THREE.MeshStandardMaterial({
  color: c, roughness: 0.5, metalness: 0.2
}))

// Three.js meshes and physics bodies
const meshBodies = []
const maxBlocks = 40

function createBox(w, h, d, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const mat = mats[Math.floor(Math.random() * mats.length)].clone()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)

  const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2))
  const body = new CANNON.Body({ mass: h * 2, shape })
  body.position.set(x, y, z)
  body.linearDamping = 0.1
  body.angularDamping = 0.1
  world.addBody(body)

  meshBodies.push({ mesh, body })
  return body
}

function createCylinder(r, h, x, y, z) {
  const geo = new THREE.CylinderGeometry(r, r, h, 16)
  const mat = mats[Math.floor(Math.random() * mats.length)].clone()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)

  const shape = new CANNON.Cylinder(r, r, h, 12)
  const body = new CANNON.Body({ mass: h * 1.5, shape })
  body.position.set(x, y, z)
  body.linearDamping = 0.1
  world.addBody(body)

  meshBodies.push({ mesh, body })
  return body
}

// Build initial tower
function buildTower() {
  const cols = 3
  const rows = 6
  for (let row = 0; row < rows; row++) {
    const w = row % 2 === 0 ? 2.5 : 3.5
    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * (row % 2 === 0 ? 2.5 : 3.5)
      const y = row * 2.0 + 1.0
      const z = (Math.random() - 0.5) * 0.2
      createBox(2.0 + Math.random() * 0.5, 1.8, 2.0 + Math.random() * 0.5, x, y, z)
    }
  }
}

buildTower()

// Cannon mesh sync
function syncPhysics() {
  for (const { mesh, body } of meshBodies) {
    mesh.position.copy(body.position)
    mesh.quaternion.copy(body.quaternion)
  }
}

// Cannon-ES shape type constants
const BOX_SHAPE = 1
const CYLINDER_SHAPE = 7

// Shake camera on impact
let shakeAmt = 0
function addShake(amount) {
  shakeAmt = Math.min(shakeAmt + amount, 0.5)
}

world.addEventListener('postStep', () => {
  for (const { body } of meshBodies) {
    const speed = body.velocity.length()
    if (speed > 3) addShake(speed * 0.003)
  }
})

// Mouse click: spawn block above camera look direction
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

renderer.domElement.addEventListener('click', (e) => {
  if (meshBodies.length >= maxBlocks) {
    // Remove oldest block
    const oldest = meshBodies.shift()
    scene.remove(oldest.mesh)
    world.removeBody(oldest.body)
  }

  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)

  const dir = raycaster.ray.direction.clone()
  const spawnPos = camera.position.clone().add(dir.multiplyScalar(20))
  spawnPos.y = Math.max(spawnPos.y, 15)

  const type = Math.random()
  if (type < 0.6) {
    const w = 1 + Math.random() * 1.5
    const h = 1 + Math.random() * 1.5
    const d = 1 + Math.random() * 1.5
    createBox(w, h, d, spawnPos.x, spawnPos.y, spawnPos.z)
  } else {
    const r = 0.5 + Math.random() * 0.8
    const h = 1 + Math.random() * 2
    createCylinder(r, h, spawnPos.x, spawnPos.y, spawnPos.z)
  }

  // Give it a random spin
  const last = meshBodies[meshBodies.length - 1]
  if (last) {
    last.body.angularVelocity.set(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    )
    last.body.velocity.set(
      (Math.random() - 0.5) * 3,
      -2,
      (Math.random() - 0.5) * 3
    )
  }
})

// Space: demolish all
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    for (const { body } of meshBodies) {
      body.applyImpulse(
        new CANNON.Vec3((Math.random() - 0.5) * 30, 10, (Math.random() - 0.5) * 30),
        body.position
      )
    }
  }
  if (e.code === 'KeyR') {
    // Reset
    for (const { mesh, body } of meshBodies) {
      scene.remove(mesh)
      world.removeBody(body)
    }
    meshBodies.length = 0
    buildTower()
  }
})

// HUD
const hud = document.createElement('div')
hud.style.cssText = 'position:fixed;top:16px;left:16px;color:#60a5fa;font-family:monospace;font-size:13px;pointer-events:none;line-height:1.8'
hud.innerHTML = `
  <div style="color:#f87171">● Rigid Body Stacking</div>
  <div>Click to drop blocks</div>
  <div>Space = demolish</div>
  <div>R = reset tower</div>
  <div>Blocks: <span id="blockCount">${meshBodies.length}</span></div>
`
document.body.appendChild(hud)

const clock = new THREE.Clock()
const baseCamPos = camera.position.clone()

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  world.step(1 / 60, dt, 3)
  syncPhysics()

  // Camera shake
  if (shakeAmt > 0.001) {
    camera.position.x = baseCamPos.x + (Math.random() - 0.5) * shakeAmt * 2
    camera.position.y = baseCamPos.y + (Math.random() - 0.5) * shakeAmt * 2
    shakeAmt *= 0.85
  } else {
    camera.position.copy(baseCamPos)
  }

  controls.update()
  composer.render()

  document.getElementById('blockCount').textContent = meshBodies.length
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

animate()
