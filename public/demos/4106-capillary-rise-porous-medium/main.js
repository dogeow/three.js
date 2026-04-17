// Capillary Rise in Porous Medium
// Water rises through a porous medium via capillary action — Jurin's law
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x112211)
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 30, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Soil/porous medium: a translucent block filled with random particles
const SOIL_W = 16, SOIL_H = 40, SOIL_D = 16
const PARTICLE_N = 2000

const soilGeo = new THREE.BoxGeometry(SOIL_W, SOIL_H, SOIL_D)
const soilMat = new THREE.MeshStandardMaterial({
  color: 0x886644, transparent: true, opacity: 0.3, roughness: 1.0
})
const soilMesh = new THREE.Mesh(soilGeo, soilMat)
scene.add(soilMesh)

// Pore particles inside soil
const porePos = new Float32Array(PARTICLE_N * 3)
const poreCol = new Float32Array(PARTICLE_N * 3)
for (let i = 0; i < PARTICLE_N; i++) {
  porePos[i * 3]     = (Math.random() - 0.5) * (SOIL_W - 1)
  porePos[i * 3 + 1] = (Math.random() - 0.5) * SOIL_H
  porePos[i * 3 + 2] = (Math.random() - 0.5) * (SOIL_D - 1)
  poreCol[i * 3]     = 0.5 + Math.random() * 0.3
  poreCol[i * 3 + 1] = 0.35 + Math.random() * 0.2
  poreCol[i * 3 + 2] = 0.2
}
const poreGeo = new THREE.BufferGeometry()
poreGeo.setAttribute('position', new THREE.BufferAttribute(porePos, 3))
poreGeo.setAttribute('color', new THREE.BufferAttribute(poreCol, 3))
const poreMat = new THREE.PointsMaterial({ size: 0.4, vertexColors: true, transparent: true, opacity: 0.6 })
const poreMesh = new THREE.Points(poreGeo, poreMat)
scene.add(poreMesh)

// Water rising particles
const WATER_N = 800
const waterPos = new Float32Array(WATER_N * 3)
const waterCol = new Float32Array(WATER_N * 3)
for (let i = 0; i < WATER_N; i++) {
  waterPos[i * 3]     = (Math.random() - 0.5) * (SOIL_W - 1)
  waterPos[i * 3 + 1] = -SOIL_H / 2 + Math.random() * 0.5 // start at bottom
  waterPos[i * 3 + 2] = (Math.random() - 0.5) * (SOIL_D - 1)
  waterCol[i * 3]     = 0.1
  waterCol[i * 3 + 1] = 0.4
  waterCol[i * 3 + 2] = 0.9
}
const waterGeo = new THREE.BufferGeometry()
waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPos, 3))
waterGeo.setAttribute('color', new THREE.BufferAttribute(waterCol, 3))
const waterMat = new THREE.PointsMaterial({
  size: 0.35, vertexColors: true, transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending
})
const waterMesh = new THREE.Points(waterGeo, waterMat)
scene.add(waterMesh)

// Water surface (animated level)
const waterSurfGeo = new THREE.PlaneGeometry(SOIL_W - 0.5, SOIL_D - 0.5)
waterSurfGeo.rotateX(-Math.PI / 2)
const waterSurfMat = new THREE.MeshStandardMaterial({
  color: 0x0066cc, transparent: true, opacity: 0.6,
  roughness: 0.1, metalness: 0.2
})
const waterSurfMesh = new THREE.Mesh(waterSurfGeo, waterSurfMat)
scene.add(waterSurfMesh)

// Container walls (glass)
const glassMat = new THREE.MeshStandardMaterial({
  color: 0xaaddff, transparent: true, opacity: 0.1, side: THREE.DoubleSide, roughness: 0.05
})
const glassBox = new THREE.Mesh(new THREE.BoxGeometry(SOIL_W + 0.5, SOIL_H + 5, SOIL_D + 0.5), glassMat)
scene.add(glassBox)

// Reservoir at bottom
const resGeo = new THREE.BoxGeometry(SOIL_W + 4, 4, SOIL_D + 4)
const resMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, transparent: true, opacity: 0.7, roughness: 0.1 })
const reservoir = new THREE.Mesh(resGeo, resMat)
reservoir.position.y = -SOIL_H / 2 - 4.5
scene.add(reservoir)

// Glass beaker
const beakerGeo = new THREE.CylinderGeometry(SOIL_W / 2 + 1, SOIL_W / 2 + 1, SOIL_H + 8, 32, 1, true)
const beakerMesh = new THREE.Mesh(beakerGeo, glassMat)
beakerMesh.position.y = -2
scene.add(beakerMesh)

// Scale reference bars
function makeLabel(text, y) {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.font = '32px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(text, 128, 40)
  const tex = new THREE.CanvasTexture(canvas)
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  )
  m.position.set(SOIL_W / 2 + 3, y, 0)
  m.rotation.y = Math.PI / 2
  scene.add(m)
}
makeLabel('0 cm', -SOIL_H / 2)
makeLabel('10 cm', 0)
makeLabel('20 cm', SOIL_H / 2)

// Lights
scene.add(new THREE.AmbientLight(0x445533, 0.6))
const sun = new THREE.DirectionalLight(0xffffcc, 1.0)
sun.position.set(20, 40, 20)
sun.castShadow = true
scene.add(sun)
scene.add(new THREE.PointLight(0x4488ff, 2, 40))

// Jurin's law: h = 2γcosθ / (ρgr)
const params = {
  contactAngle: 0,     // 0° = perfect wetting
  surfaceTension: 0.0728, // N/m (water at 20°C)
  poreRadius: 0.15,   // mm
  g: 9.8,
  density: 1000,
  timeScale: 1.0
}

const gui = new GUI()
gui.add(params, 'contactAngle', 0, 90).name('Contact Angle θ (°)')
gui.add(params, 'surfaceTension', 0.01, 0.15).name('Surface Tension γ')
gui.add(params, 'poreRadius', 0.05, 0.5).name('Pore Radius r (mm)')
gui.add(params, 'timeScale', 0.1, 5.0).name('Time Scale')

// Calculate Jurin height
function jurinHeight() {
  const theta = params.contactAngle * Math.PI / 180
  const gamma = params.surfaceTension
  const r = params.poreRadius * 0.001 // convert mm to m
  const rho = params.density
  const g = params.g
  const h = (2 * gamma * Math.cos(theta)) / (rho * g * r)
  return isFinite(h) ? Math.max(0, h) : 0
}

const clock = new THREE.Clock()
let riseTime = 0

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05) * params.timeScale
  riseTime += dt

  const H = jurinHeight()
  const maxRise = Math.min(H, SOIL_H - 2) // clamp to soil height
  const riseFrac = maxRise / (SOIL_H / 2) // normalized

  // Slowly animate water rising
  const currentRise = Math.min(maxRise * (1 - Math.exp(-riseTime * 0.3)), maxRise)

  // Update water surface height
  waterSurfMesh.position.y = -SOIL_H / 2 + currentRise
  waterSurfMesh.scale.y = 1 + Math.sin(riseTime * 3) * 0.02

  // Color water particles blue with height
  const pos = waterGeo.attributes.position.array
  const col = waterGeo.attributes.color.array
  for (let i = 0; i < WATER_N; i++) {
    const baseY = -SOIL_H / 2 + 2
    const targetY = -SOIL_H / 2 + currentRise - 1
    // Move water up over time
    if (pos[i * 3 + 1] < targetY) {
      pos[i * 3 + 1] += dt * (1 + Math.random())
      if (pos[i * 3 + 1] > targetY) pos[i * 3 + 1] = targetY
    }
    // Keep within soil bounds
    pos[i * 3]     = Math.max(-SOIL_W / 2 + 0.5, Math.min(SOIL_W / 2 - 0.5, pos[i * 3] + (Math.random() - 0.5) * 0.05))
    pos[i * 3 + 2] = Math.max(-SOIL_D / 2 + 0.5, Math.min(SOIL_D / 2 - 0.5, pos[i * 3 + 2] + (Math.random() - 0.5) * 0.05))
    // Color: deeper = darker blue
    const depthFrac = (pos[i * 3 + 1] + SOIL_H / 2) / SOIL_H
    col[i * 3]     = 0.05 + depthFrac * 0.1
    col[i * 3 + 1] = 0.3 + depthFrac * 0.3
    col[i * 3 + 2] = 0.7 + depthFrac * 0.3
  }
  waterGeo.attributes.position.needsUpdate = true
  waterGeo.attributes.color.needsUpdate = true

  // Pore color: dampened where water is
  const pCol = poreGeo.attributes.color.array
  for (let i = 0; i < PARTICLE_N; i++) {
    const py = porePos[i * 3 + 1]
    const waterLevel = -SOIL_H / 2 + currentRise
    if (py < waterLevel) {
      pCol[i * 3]     = 0.2
      pCol[i * 3 + 1] = 0.5
      pCol[i * 3 + 2] = 0.9
    }
  }
  poreGeo.attributes.color.needsUpdate = true

  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
