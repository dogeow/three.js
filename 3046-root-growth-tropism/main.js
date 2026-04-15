import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080302)
scene.fog = new THREE.FogExp2(0x080302, 0.02)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300)
camera.position.set(0, 15, 50)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI * 0.9

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.2, 0.4, 0.2)
composer.addPass(bloom)

// Lighting
const ambient = new THREE.AmbientLight(0x221100, 0.4)
scene.add(ambient)

const dirLight = new THREE.DirectionalLight(0xffeebb, 0.8)
dirLight.position.set(10, 30, 10)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(1024, 1024)
scene.add(dirLight)

const pointLight = new THREE.PointLight(0xff8800, 1.0, 30)
pointLight.position.set(0, -5, 0)
scene.add(pointLight)

// Soil layers (cutaway view)
const soilGeo = new THREE.BoxGeometry(80, 40, 80)
const soilMat = new THREE.MeshStandardMaterial({
  color: 0x2a1a0a,
  roughness: 0.95,
  metalness: 0.0,
})
const soil = new THREE.Mesh(soilGeo, soilMat)
soil.position.y = -20
soil.receiveShadow = true
scene.add(soil)

// Transparent front face to see inside
const viewGeo = new THREE.PlaneGeometry(80, 40)
const viewMat = new THREE.MeshStandardMaterial({
  color: 0x1a0f05,
  transparent: true,
  opacity: 0.3,
  side: THREE.DoubleSide,
})
const viewPlane = new THREE.Mesh(viewGeo, viewMat)
viewPlane.position.set(0, -20, 40)
viewPlane.rotation.y = Math.PI
scene.add(viewPlane)

// Grid on soil surface
const grid = new THREE.GridHelper(80, 20, 0x3a2a1a, 0x1f1408)
grid.position.y = 0.01
scene.add(grid)

// =========================================================
// Root Growth System
// =========================================================

const ROOT_COLOR_BASE = new THREE.Color(0x4a3010)
const ROOT_COLOR_TIP = new THREE.Color(0x8b6030)
const SHOOT_COLOR = new THREE.Color(0x2d5a1e)

const rootSystems = []

function createRootMaterial(isShoot = false) {
  return new THREE.MeshStandardMaterial({
    color: isShoot ? SHOOT_COLOR : ROOT_COLOR_BASE,
    emissive: isShoot ? new THREE.Color(0x0a2008) : new THREE.Color(0x1a0a00),
    emissiveIntensity: 0.3,
    roughness: 0.9,
    metalness: 0.0,
  })
}

class RootBranch {
  constructor(start, direction, length, radius, depth, maxDepth, isShoot, parentMat) {
    this.start = start.clone()
    this.direction = direction.clone().normalize()
    this.length = length
    this.radius = radius
    this.depth = depth
    this.maxDepth = maxDepth
    this.isShoot = isShoot
    this.grown = 0 // 0 to 1
    this.children = []
    this.mesh = null
    this.tip = start.clone()

    this.createMesh(parentMat)
  }

  createMesh(parentMat) {
    const segments = Math.max(2, Math.floor(this.length * 3))
    const geo = new THREE.CylinderGeometry(
      this.radius * 0.7,
      this.radius,
      1, // start with length 1, scale
      6,
      segments
    )
    // Re-orient to direction
    const mat = parentMat || createRootMaterial(this.isShoot)
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true

    // Orient the cylinder along direction
    const axis = new THREE.Vector3(0, 1, 0)
    const dir = this.direction.clone()
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir)
    this.mesh.quaternion.copy(quaternion)
    this.mesh.position.copy(this.start).addScaledVector(dir, 0.5)
    this.mesh.scale.set(1, 0.001, 1)

    scene.add(this.mesh)
  }

  update(dt, time) {
    if (this.grown < 1) {
      this.grown = Math.min(1, this.grown + dt * (0.08 + (this.maxDepth - this.depth) * 0.02))
      this.mesh.scale.set(1, this.length * this.grown, 1)
      this.mesh.position.copy(this.start).addScaledVector(this.direction, this.length * this.grown * 0.5)

      // Color gradient as it grows
      const t = this.grown
      const col = ROOT_COLOR_TIP.clone().lerp(ROOT_COLOR_BASE, t)
      this.mesh.material.color.copy(col)
    }

    this.tip.copy(this.start).addScaledVector(this.direction, this.length * this.grown)

    // Sway slightly
    if (this.isShoot && this.mesh) {
      const sway = Math.sin(time * 1.5 + this.depth) * 0.02 * this.grown
      this.mesh.rotation.z = sway
    }

    for (const child of this.children) {
      child.update(dt, time)
    }
  }
}

class RootSystem {
  constructor(x, z) {
    this.x = x
    this.z = z
    this.branches = []
    this.timeToNextBranch = 0
    this.maxRoots = 25
    this.age = 0

    // Create main taproot (going down)
    const start = new THREE.Vector3(x, 0, z)
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      -1,
      (Math.random() - 0.5) * 0.2
    ).normalize()
    const taproot = new RootBranch(start, direction, 6 + Math.random() * 3, 0.5, 0, 6, false, null)
    this.branches.push(taproot)

    // Create shoot going up
    const shootDir = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      1,
      (Math.random() - 0.5) * 0.3
    ).normalize()
    const shoot = new RootBranch(
      new THREE.Vector3(x, 0, z),
      shootDir,
      4 + Math.random() * 4,
      0.35,
      0, 4, true, null
    )
    this.branches.push(shoot)

    // Start branching after delay
    this.timeToNextBranch = 1.0 + Math.random() * 2.0
  }

  update(dt, time) {
    this.age += dt
    this.timeToNextBranch -= dt

    if (this.timeToNextBranch <= 0 && this.countBranches() < this.maxRoots) {
      this.branch()
      this.timeToNextBranch = 0.8 + Math.random() * 2.0
    }

    for (const b of this.branches) {
      b.update(dt, time)
    }
  }

  countBranches() {
    let count = 0
    const traverse = (b) => { count++; b.children.forEach(traverse) }
    for (const b of this.branches) traverse(b)
    return count
  }

  branch() {
    // Find an existing branch to branch from
    const candidates = []
    const collect = (b) => {
      if (b.grown > 0.7 && b.depth < b.maxDepth && b.children.length < 3) {
        candidates.push(b)
      }
      b.children.forEach(collect)
    }
    for (const b of this.branches) collect(b)
    if (candidates.length === 0) return

    const parent = candidates[Math.floor(Math.random() * candidates.length)]

    // Branch direction: deflect from parent with some randomness
    const deflectAngle = (0.3 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1)
    const randomAngle = (Math.random() - 0.5) * Math.PI * 0.8

    const axis = parent.direction.clone().cross(new THREE.Vector3(0, 1, 0)).normalize()
    if (axis.length() < 0.1) axis.set(1, 0, 0)

    const newDir = parent.direction.clone()
    newDir.applyAxisAngle(axis, deflectAngle)
    newDir.applyAxisAngle(parent.direction, randomAngle)
    newDir.normalize()

    const length = parent.length * (0.5 + Math.random() * 0.3)
    const radius = parent.radius * (0.6 + Math.random() * 0.2)
    const depth = parent.depth + 1
    const isShoot = parent.isShoot

    const child = new RootBranch(
      parent.tip.clone(),
      newDir,
      length,
      radius,
      depth,
      parent.maxDepth,
      isShoot,
      parent.mesh.material
    )
    parent.children.push(child)
  }
}

// Plant initial tree
function plantAt(x, z) {
  rootSystems.push(new RootSystem(x, z))
}

plantAt(0, 0)
plantAt(-8, 5)
plantAt(7, -3)

// Click to plant
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ visible: false })
)
groundMesh.rotation.x = -Math.PI / 2
groundMesh.position.y = 0
scene.add(groundMesh)

window.addEventListener('click', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(groundMesh)
  if (hits.length > 0 && rootSystems.length < 12) {
    const p = hits[0].point
    plantAt(p.x, p.z)
  }
})

// GUI
const gui = { bloomStrength: 1.2, maxRoots: 25 }
import('https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm').then(({ GUI }) => {
  const panel = new GUI({ title: '🌱 Root Tropism' })
  panel.add(gui, 'maxRoots', 5, 60).step(1).name('Max Roots').onChange(v => {
    // Update existing systems
    for (const rs of rootSystems) rs.maxRoots = v
  })
  panel.add(gui, 'bloomStrength', 0.3, 3.0).name('Bloom').onChange(v => { bloom.strength = v })
})

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const elapsed = clock.getElapsedTime()

  for (const rs of rootSystems) {
    rs.update(dt, elapsed)
  }

  // Animate point light
  pointLight.position.x = Math.sin(elapsed * 0.3) * 10
  pointLight.position.z = Math.cos(elapsed * 0.3) * 10

  controls.update()
  composer.render()
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
