// PCR Gel Electrophoresis Visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 8, 35)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)
scene.add(new THREE.AmbientLight(0x8888ff, 0.3))
const pointLight = new THREE.PointLight(0x8888ff, 1, 50)
pointLight.position.set(0, 15, 10)
scene.add(pointLight)

// Gel box
const gelW = 20, gelH = 16, gelD = 1.2
const gelGeo = new THREE.BoxGeometry(gelW, gelH, gelD)
const gelMat = new THREE.MeshPhysicalMaterial({
  color: 0xaaccff,
  transparent: true,
  opacity: 0.25,
  roughness: 0.1,
  metalness: 0.0,
  transmission: 0.8,
  thickness: 0.5
})
const gel = new THREE.Mesh(gelGeo, gelMat)
scene.add(gel)

// Gel grid lines (wells)
const wellY = gelH / 2 - 1.5
const numWells = 8
const wellSpacing = gelW / (numWells + 1)
const wellGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 16)
const wellMat = new THREE.MeshStandardMaterial({ color: 0x334466, emissive: 0x112244, emissiveIntensity: 0.3 })
for (let i = 0; i < numWells; i++) {
  const well = new THREE.Mesh(wellGeo, wellMat)
  well.position.set(-gelW / 2 + wellSpacing * (i + 1), wellY, gelD / 2 + 0.05)
  scene.add(well)
}

// Electrode visualization
const electrodeMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.1 })
// Positive electrode (top - red)
const posElectrode = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, gelW - 2, 16), new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x880000, emissiveIntensity: 0.5, metalness: 0.7 }))
posElectrode.rotation.z = Math.PI / 2
posElectrode.position.set(0, gelH / 2 + 0.5, 0)
scene.add(posElectrode)

// Negative electrode (bottom - black)
const negElectrode = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, gelW - 2, 16), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 }))
negElectrode.rotation.z = Math.PI / 2
negElectrode.position.set(0, -gelH / 2 - 0.5, 0)
scene.add(negElectrode)

// Electric field arrows
const arrowDir = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, gelH/2, 0), gelH * 0.4, 0xff4444, 1.5, 1)
scene.add(arrowDir)

// DNA band definitions (base pairs per fragment)
const lanes = [
  { name: 'Ladder', bands: [100, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000, 3000, 5000], color: 0xffcc00, isLadder: true },
  { name: 'Sample A', bands: [180, 340, 580, 720, 1200], color: 0x00ccff, isLadder: false },
  { name: 'Sample B', bands: [180, 290, 650, 890, 1100, 1800], color: 0x00ff88, isLadder: false },
  { name: 'Sample C', bands: [340, 520, 980], color: 0xff6688, isLadder: false },
  { name: 'Negative', bands: [], color: 0x444466, isLadder: false },
  { name: 'Positive', bands: [200, 400, 600, 1000], color: 0xff8800, isLadder: false },
  { name: 'Marker', bands: [100, 500, 1000, 2500], color: 0xcc44ff, isLadder: false },
  { name: 'Fragment', bands: [150, 300, 450, 600, 750, 900, 1100, 1400], color: 0x44ffee, isLadder: false },
]

const params = {
  voltage: 120,
  runTime: 0,
  duration: 25,
  run: false,
  reset: () => { params.runTime = 0; resetBands() }
}

// DNA fragment class
class DNAFragment {
  constructor(basePairs, color, x) {
    this.bp = basePairs
    this.color = color
    this.x = x
    this.y = wellY
    this.targetY = wellY - (basePairs / 3000) * (gelH - 4) * 0.5
    this.speed = (basePairs / 3000) * 0.3
    this.mesh = null
    this.glow = null
  }
  create() {
    const w = 0.6, h = Math.max(0.3, this.bp / 200)
    const geo = new THREE.BoxGeometry(w, h, gelD * 0.5)
    const mat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.9
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.set(this.x, this.y, 0)
    scene.add(this.mesh)
    // Glow
    const glowGeo = new THREE.BoxGeometry(w * 1.5, h * 1.5, gelD * 0.3)
    const glowMat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.2 })
    this.glow = new THREE.Mesh(glowGeo, glowMat)
    this.glow.position.copy(this.mesh.position)
    scene.add(this.glow)
  }
  update(dt, voltage) {
    if (!this.mesh) return
    const speed = this.speed * voltage / 120 * 2
    this.y = Math.max(this.targetY, this.y - speed * dt)
    this.mesh.position.y = this.y
    this.glow.position.y = this.y
  }
}

const fragments = []
function resetBands() {
  fragments.forEach(f => { scene.remove(f.mesh); scene.remove(f.glow) })
  fragments.length = 0
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i]
    const x = -gelW / 2 + wellSpacing * (i + 1)
    for (const bp of lane.bands) {
      const f = new DNAFragment(bp, lane.color, x)
      f.create()
      fragments.push(f)
    }
  }
}
resetBands()

// Title labels
function makeLabel(text, x, y, z, col = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = col
  ctx.font = 'bold 36px monospace'
  ctx.fillText(text, 10, 50)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }))
  sprite.position.set(x, y, z)
  sprite.scale.set(8, 2, 1)
  return sprite
}

scene.add(makeLabel('PCR Gel Electrophoresis', 0, gelH / 2 + 4, 2, '#aaddff'))
scene.add(makeLabel(`+`, 0, gelH / 2 + 1.5, 1, '#ff4444'))
scene.add(makeLabel(`-`, 0, -gelH / 2 - 1.5, 1, '#888888'))

// Gel lane labels
for (let i = 0; i < lanes.length; i++) {
  const x = -gelW / 2 + wellSpacing * (i + 1)
  scene.add(makeLabel(lanes[i].name, x, wellY + 2, 2, '#88aacc'))
}

// BP ruler
for (let i = 0; i <= 3000; i += 500) {
  const y = wellY - (i / 3000) * (gelH - 4) * 0.5
  const rulerX = gelW / 2 + 1.5
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.8, 0, 0)])
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x6688aa }))
  line.position.set(rulerX, y, gelD / 2)
  scene.add(line)
  scene.add(makeLabel(`${i}bp`, rulerX + 1, y, gelD / 2, '#6688aa'))
}

// GUI
const gui = new GUI()
gui.add(params, 'voltage', 50, 200, 5).name('电压 (V)')
gui.add(params, 'run').name('开始电泳')
gui.add(params, 'reset').name('重置')
gui.add(params, 'duration', 5, 60, 1).name('运行时长 (s)')

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  if (params.run && params.runTime < params.duration) {
    params.runTime += dt
    const v = params.voltage
    for (const f of fragments) f.update(dt, v)
    arrowDir.setDirection(new THREE.Vector3(0, -1, 0))
    arrowDir.setLength(gelH * 0.3 * (v / 200), 1.5, 1)
  }
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
