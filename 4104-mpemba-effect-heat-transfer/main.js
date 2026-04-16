// Mpemba Effect Heat Transfer
// Hot water can freeze faster than cold water — Newton's cooling with evaporation
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 30, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 0, 0)

// --- Two beakers of water at different starting temperatures ---
const COLD_START = 80  // cold water (°C)
const HOT_START  = 100 // hot water (°C) — can paradoxically freeze faster

class WaterBeaker {
  constructor(x, label, startTemp) {
    this.temp = startTemp
    this.startTemp = startTemp
    this.x = x
    this.particles = []
    this.FROZEN = -10
    this.frozen = false

    // Transparent cylinder beaker
    const beakerGeo = new THREE.CylinderGeometry(5, 5, 20, 32, 1, true)
    const beakerMat = new THREE.MeshStandardMaterial({
      color: 0xaaddff, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, roughness: 0.1, metalness: 0.1
    })
    this.beakerMesh = new THREE.Mesh(beakerGeo, beakerMat)
    this.beakerMesh.position.set(x, 0, 0)
    scene.add(this.beakerMesh)

    // Bottom
    const bottomGeo = new THREE.CircleGeometry(5, 32)
    const bottomMesh = new THREE.Mesh(bottomGeo, new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.3 }))
    bottomMesh.rotation.x = -Math.PI / 2
    bottomMesh.position.set(x, -10, 0)
    scene.add(bottomMesh)

    // Label
    const labelGeo = new THREE.PlaneGeometry(10, 2)
    const labelCanvas = document.createElement('canvas')
    labelCanvas.width = 512; labelCanvas.height = 96
    const ctx = labelCanvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`${label}: ${Math.round(startTemp)}°C`, 256, 60)
    const labelTex = new THREE.CanvasTexture(labelCanvas)
    const labelMesh = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }))
    labelMesh.position.set(x, 15, 0)
    scene.add(labelMesh)
    this.labelMesh = labelMesh
    this.labelCanvas = labelCanvas
    this.labelCtx = ctx

    // Water particle group
    this.group = new THREE.Group()
    this.group.position.set(x, 0, 0)
    scene.add(this.group)

    const N = 300
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(N * 3)
    const colors = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = Math.random() * 4.5
      const a = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18
      positions[i * 3 + 2] = Math.sin(a) * r
      const heat = startTemp / 100
      colors[i * 3] = 0.2 + heat * 0.8   // R: hot=red
      colors[i * 3 + 1] = 0.4 - heat * 0.3 // G
      colors[i * 3 + 2] = 1.0 - heat * 0.8 // B: cold=blue
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.positions = positions
    this.colors = colors
    this.N = N
    this.geo = geo

    const mat = new THREE.PointsMaterial({
      size: 0.6, vertexColors: true, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    this.points = new THREE.Points(geo, mat)
    this.group.add(this.points)

    // Ice crystal mesh (appears when frozen)
    const iceGeo = new THREE.IcosahedronGeometry(4, 1)
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xaaddff, transparent: true, opacity: 0, roughness: 0.1, metalness: 0.3,
      emissive: 0x4488cc, emissiveIntensity: 0.5
    })
    this.iceMesh = new THREE.Mesh(iceGeo, iceMat)
    this.iceMesh.position.set(x, -5, 0)
    scene.add(this.iceMesh)
  }

  update(dt, evaporationRate) {
    if (this.frozen) return

    // Newton's law of cooling: dT/dt = -k*(T - T_env)
    // Evaporation: hot water loses mass and heat faster (Mpemba mechanism)
    const k = 0.08
    const envTemp = -15 // below freezing
    const evap = evaporationRate * (this.startTemp / HOT_START) * dt
    const dTemp = (-k * (this.temp - envTemp) + evap) * dt
    this.temp = Math.max(this.FROZEN, this.temp + dTemp)

    // Update label
    this.labelCtx.clearRect(0, 0, 512, 96)
    this.labelCtx.fillStyle = this.temp <= 0 ? '#88ccff' : '#ffffff'
    this.labelCtx.font = 'bold 48px monospace'
    this.labelCtx.textAlign = 'center'
    this.labelCtx.fillText(
      `${this.temp <= 0 ? 'FROZEN!' : Math.round(this.temp) + '°C'}`,
      256, 60
    )
    this.labelMesh.material.map.needsUpdate = true

    if (this.temp <= 0) {
      this.frozen = true
      this.points.material.opacity = 0
      this.iceMesh.material.opacity = 0.85
      return
    }

    // Animate particles: more vigorous motion when hotter
    const heat = this.temp / 100
    const speed = 0.3 + heat * 0.4
    const pos = this.geo.attributes.position.array
    const col = this.geo.attributes.color.array

    for (let i = 0; i < this.N; i++) {
      pos[i * 3 + 1] += (Math.random() - 0.5) * speed
      if (pos[i * 3 + 1] > 9) pos[i * 3 + 1] = 9
      if (pos[i * 3 + 1] < -9) pos[i * 3 + 1] = -9

      const heat = Math.max(0, Math.min(1, this.temp / 100))
      col[i * 3]     = 0.2 + heat * 0.8
      col[i * 3 + 1] = 0.4 - heat * 0.3
      col[i * 3 + 2] = 1.0 - heat * 0.8
    }

    this.geo.attributes.position.needsUpdate = true
    this.geo.attributes.color.needsUpdate = true
  }
}

// Create two beakers
const beakerCold = new WaterBeaker(-12, 'Cold Water', COLD_START)
const beakerHot  = new WaterBeaker( 12, 'Hot Water', HOT_START)

// Environment / ice slab at bottom
const slabGeo = new THREE.BoxGeometry(80, 2, 30)
const slabMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.8, emissive: 0x224466, emissiveIntensity: 0.2 })
const slab = new THREE.Mesh(slabGeo, slabMat)
slab.position.set(0, -14, 0)
scene.add(slab)

// Lights
scene.add(new THREE.AmbientLight(0x334466, 0.8))
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
dirLight.position.set(20, 40, 20)
scene.add(dirLight)
const coldLight = new THREE.PointLight(0x4488ff, 1.5, 40)
coldLight.position.set(-12, 15, 0)
scene.add(coldLight)
const hotLight = new THREE.PointLight(0xff4422, 1.5, 40)
hotLight.position.set(12, 15, 0)
scene.add(hotLight)

// GUI
const params = { evaporationRate: 8, speed: 1.0 }
const gui = new GUI()
gui.add(params, 'evaporationRate', 0, 20).name('Evaporation Rate')
gui.add(params, 'speed', 0.1, 3.0).name('Time Speed')

const clock = new THREE.Clock()
let elapsed = 0

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05) * params.speed

  beakerCold.update(dt, params.evaporationRate)
  beakerHot.update(dt, params.evaporationRate)

  // Slowly rotate ice slab
  slab.rotation.y += 0.001

  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
