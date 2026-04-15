// 3303. SPH Fluid Simulation (Smoothed Particle Hydrodynamics)
// type: physics
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const N = 600
const GRAVITY = -9.8
const H = 0.8        // kernel radius
const H2 = H * H
const REST_DENSITY = 1000
const GAS_CONSTANT = 2000
const KERNEL_COEFF = 315 / (65 * Math.PI * Math.pow(H, 9))
const SPIKY_GRAD_COEFF = -45 / (Math.PI * Math.pow(H, 6))
const VISC_COEFF = 0.016
const BOUND_DAMPING = -0.5

let scene, camera, renderer, controls
let particles = [], positions, colors
let geo, points
let containerW = 20, containerH = 20, containerD = 20
let paused = false

const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
let attractPoint = null

class SPHParticle {
  constructor(x, y, z) {
    this.x = x; this.y = y; this.z = z
    this.vx = (Math.random() - 0.5) * 0.5
    this.vy = (Math.random() - 0.5) * 0.5
    this.vz = (Math.random() - 0.5) * 0.5
    this.fx = 0; this.fy = 0; this.fz = 0
    this.density = 0
    this.pressure = 0
  }
}

function poly6(r2) {
  if (r2 >= H2) return 0
  const diff = H2 - r2
  return KERNEL_COEFF * diff * diff * diff
}

function spikyGrad(dx, dy, dz, r) {
  if (r >= H || r < 1e-6) return [0, 0, 0]
  const f = SPIKY_GRAD_COEFF * Math.pow(H - r, 2) / r
  return [f * dx, f * dy, f * dz]
}

function viscLaplacian(r) {
  if (r >= H) return 0
  return VISC_COEFF * (H - r)
}

function computeDensityPressure() {
  for (const p of particles) {
    p.density = 0
    for (const n of particles) {
      const dx = n.x - p.x, dy = n.y - p.y, dz = n.z - p.z
      const r2 = dx * dx + dy * dy + dz * dz
      p.density += n.mass || 1 * poly6(r2)
    }
    p.density = Math.max(p.density, REST_DENSITY * 0.5)
    p.pressure = GAS_CONSTANT * (p.density - REST_DENSITY)
  }
}

function computeForces() {
  for (const p of particles) {
    let fx = 0, fy = GRAVITY * p.density, fz = 0
    for (const n of particles) {
      if (p === n) continue
      const dx = n.x - p.x, dy = n.y - p.y, dz = n.z - p.z
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (r < H && r > 1e-6) {
        const [gx, gy, gz] = spikyGrad(dx, dy, dz, r)
        const pm = (p.pressure + n.pressure) / (2 * n.density)
        fx += -gx * pm * (p.mass || 1)
        fy += -gy * pm * (p.mass || 1)
        fz += -gz * pm * (p.mass || 1)
        const vl = viscLaplacian(r)
        fx += VISC_COEFF * (n.vx - p.vx) * vl * (n.mass || 1) / n.density
        fy += VISC_COEFF * (n.vy - p.vy) * vl * (n.mass || 1) / n.density
        fz += VISC_COEFF * (n.vz - p.vz) * vl * (n.mass || 1) / n.density
      }
    }
    p.fx = fx; p.fy = fy; p.fz = fz
  }
}

function integrate(dt) {
  for (const p of particles) {
    p.vx += (p.fx / p.density) * dt
    p.vy += (p.fy / p.density) * dt
    p.vz += (p.fz / p.density) * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt
    if (p.x < -containerW / 2 + 0.3) { p.x = -containerW / 2 + 0.3; p.vx *= BOUND_DAMPING }
    if (p.x > containerW / 2 - 0.3) { p.x = containerW / 2 - 0.3; p.vx *= BOUND_DAMPING }
    if (p.y < 0.3) { p.y = 0.3; p.vy *= BOUND_DAMPING }
    if (p.y > containerH - 0.3) { p.y = containerH - 0.3; p.vy *= BOUND_DAMPING }
    if (p.z < -containerD / 2 + 0.3) { p.z = -containerD / 2 + 0.3; p.vz *= BOUND_DAMPING }
    if (p.z > containerD / 2 - 0.3) { p.z = containerD / 2 - 0.3; p.vz *= BOUND_DAMPING }
  }
}

function updateParticles() {
  for (let i = 0; i < N; i++) {
    const p = particles[i]
    positions[i * 3] = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz)
    const t = Math.min(speed / 4, 1)
    colors[i * 3] = 0.1 + t * 0.9
    colors[i * 3 + 1] = 0.4 + t * 0.4
    colors[i * 3 + 2] = 1.0 - t * 0.5
  }
  geo.attributes.position.needsUpdate = true
  geo.attributes.color.needsUpdate = true
}

function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050510)
  scene.fog = new THREE.FogExp2(0x050510, 0.015)

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500)
  camera.position.set(25, 18, 35)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  document.body.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // Container box edges
  const boxGeo = new THREE.BoxGeometry(containerW, containerH, containerD)
  const edges = new THREE.EdgesGeometry(boxGeo)
  scene.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.4 })))

  // Floor grid
  const grid = new THREE.GridHelper(40, 40, 0x223355, 0x112233)
  grid.position.y = -0.01
  scene.add(grid)

  // Particles
  particles = []
  for (let i = 0; i < N; i++) {
    const x = (Math.random() - 0.5) * 8 + (Math.random() > 0.5 ? 0 : (Math.random() * 6))
    const y = Math.random() * 12 + 4
    const z = (Math.random() - 0.5) * 8
    particles.push(new SPHParticle(x, y, z))
  }

  positions = new Float32Array(N * 3)
  colors = new Float32Array(N * 3)

  geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeBoundingSphere()

  points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.55,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }))
  scene.add(points)

  scene.add(new THREE.AmbientLight(0x4488ff, 0.6))
  const sun = new THREE.PointLight(0x44aaff, 1.5, 100)
  sun.position.set(20, 30, 20)
  scene.add(sun)

  setupGUI()
  setupEvents()
  animate()
}

function setupGUI() {
  const gui = new GUI()
  gui.add({ particles: N }, 'particles').name('Particle Count').listen()
  gui.add({ gravity: GRAVITY }, 'gravity', -20, 0).name('Gravity').onChange(v => { window._gravity = v })
  gui.add({ paused }, 'paused').name('Pause').onChange(v => { paused = v })
}

function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })

  window.addEventListener('click', (e) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1
    mouse.y = -(e.clientY / innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5)
    const pt = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, pt)
    if (pt) {
      for (let i = 0; i < 30; i++) {
        const p = new SPHParticle(pt.x + (Math.random() - 0.5) * 3, pt.y + 5, pt.z + (Math.random() - 0.5) * 3)
        p.vx = (Math.random() - 0.5) * 2
        p.vy = Math.random() * 3
        p.vz = (Math.random() - 0.5) * 2
        particles.push(p)
      }
      // resize arrays
      const oldN = N
      window._sphN = particles.length
    }
  })

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      particles = []
      for (let i = 0; i < N; i++) {
        const x = (Math.random() - 0.5) * 8
        const y = Math.random() * 12 + 4
        const z = (Math.random() - 0.5) * 8
        particles.push(new SPHParticle(x, y, z))
      }
    }
  })
}

const DT = 0.012

function animate() {
  requestAnimationFrame(animate)
  if (!paused) {
    computeDensityPressure()
    computeForces()
    integrate(DT)
    updateParticles()
  }
  controls.update()
  renderer.render(scene, camera)
}

init()
