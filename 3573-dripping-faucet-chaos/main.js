// 3573. Dripping Faucet Chaos - Period-doubling route to chaos
// type: physics-chaos
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a12)

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 30, 60)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Drip simulation - logistic map for drop spacing
const params = { flowRate: 0.5, damping: 0.3, showDrops: true, showBifurcation: true }

class Drip {
  constructor(x, delay) {
    const geo = new THREE.SphereGeometry(0.8, 12, 12)
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x4488ff, transmission: 0.9, roughness: 0.1, ior: 1.33, thickness: 1
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.set(x, 30, 0)
    this.velocity = 0
    this.delay = delay
    this.active = false
    scene.add(this.mesh)
  }
  update(dt, gravity) {
    if (!this.active) return
    this.velocity += gravity * dt
    this.mesh.position.y += this.velocity * dt
    if (this.mesh.position.y < 0.5) {
      this.active = false
      this.mesh.position.y = 30
      this.velocity = 0
    }
  }
  dispose() {
    scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}

// Bifurcation diagram visualization
const bifurGeo = new THREE.BufferGeometry()
const bifurPoints = new Float32Array(2000 * 3)
bifurGeo.setAttribute('position', new THREE.BufferAttribute(bifurPoints, 3))
const bifurMat = new THREE.PointsMaterial({ color: 0xff8844, size: 0.3, sizeAttenuation: true })
const bifurPoints2D = new THREE.Mesh(bifurGeo, bifurMat)
bifurPoints2D.position.set(-20, 35, -15)
bifurPoints2D.scale.set(1, 0.3, 1)
scene.add(bifurPoints2D)

let dropInterval = 1.0
let dripTimer = 0
let lastDropTime = 0
let dropHistory = []
let logisticR = params.flowRate * 4

// Logistic map bifurcation: x_{n+1} = r * x_n * (1 - x_n)
function computeBifurcation() {
  const pts = []
  let idx = 0
  for (let r = 2.5; r <= 4.0; r += 0.01) {
    let x = 0.5
    for (let warmup = 0; warmup < 100; warmup++) x = r * x * (1 - x)
    for (let n = 0; n < 50; n++) {
      x = r * x * (1 - x)
      if (idx < 2000) {
        pts.push((r - 2.5) / 1.5 * 40 - 20, x * 30 + 35, -15)
        idx++
      }
    }
  }
  const pos = bifurGeo.attributes.position.array
  for (let i = 0; i < pts.length && i < pos.length; i++) pos[i] = pts[i] || 0
  bifurGeo.attributes.position.needsUpdate = true
}
computeBifurcation()

const drips = []
for (let i = 0; i < 20; i++) {
  const x = (i - 10) * 1.5
  const delay = i * 0.05
  drips.push(new Drip(x, delay))
}

const basinGeo = new THREE.PlaneGeometry(40, 35)
const basinMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 })
const basin = new THREE.Mesh(basinGeo, basinMat)
basin.position.y = -0.5
scene.add(basin)

scene.add(new THREE.AmbientLight(0x4444aa, 0.5))
const pointLight = new THREE.PointLight(0x88aaff, 2, 100)
pointLight.position.set(0, 30, 10)
scene.add(pointLight)

const gui = new GUI()
gui.add(params, 'flowRate', 0.1, 1.0, 0.01).name('Flow Rate (r)').onChange(v => logisticR = v * 4)
gui.add(params, 'showBifurcation').name('Show Bifurcation')
gui.add(params, 'showDrops').name('Show Drops')

bifurPoints2D.visible = params.showBifurcation

let t = 0
function animate() {
  requestAnimationFrame(animate)
  const dt = 0.016
  t += dt
  
  // Update logistic map drop timing
  dripTimer += dt
  if (dripTimer > dropInterval) {
    dripTimer = 0
    // Logistic map for period
    const x_n = Math.max(0.001, Math.min(0.999, dropHistory.length > 0 ? dropHistory[dropHistory.length - 1] : 0.5))
    const x_next = logisticR * x_n * (1 - x_n)
    dropHistory.push(x_next)
    if (dropHistory.length > 50) dropHistory.shift()
    dropInterval = x_next * 2 + 0.3
    
    // Find an inactive drip
    const inactive = drips.find(d => !d.active)
    if (inactive) inactive.active = true
  }
  
  drips.forEach(d => d.update(dt, 30))
  basin.position.y = -0.5 + Math.sin(t * 0.5) * 0.1
  
  bifurPoints2D.visible = params.showBifurcation
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
