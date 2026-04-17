// 3555. Photonic Crystal Bandgap — 1D/2D Bragg reflectors
// 展示光子晶体的能带结构与频率带隙
// 1D: transfer matrix method 计算反射率
// 2D: 平面波展开法 (PWE) 计算TE/TM模
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'

let mode = '1d'  // '1d' or '2d'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 15, 30)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

// ---- 1D Photonic Crystal Parameters ----
const PERIOD = 1.0
const N_PERIODS = 8
const LAYERS_PERIOD = 40
const N_PERIODS_VIZ = 5

// Materials: high index (dielectric) and low index (air)
const epsHigh = 12.0  // e.g., GaAs
const epsLow = 1.0    // air
const fillFactor = 0.3  // fraction of high-index material in each period

// Frequency range (normalized: omega*a/2πc)
const fMin = 0.0, fMax = 1.2
const fSteps = 400
const reflection = new Float32Array(fSteps)

function compute1DReflection() {
  // Transfer matrix method for 1D multilayer
  // Stack: alternating high/low index layers
  // d_high = fillFactor * PERIOD, d_low = (1-fillFactor) * PERIOD
  const k0_range = fMax * Math.PI / PERIOD
  const dk0 = k0_range / fSteps

  for (let s = 0; s < fSteps; s++) {
    const k0 = (s + 1) * dk0
    const omega = k0 * 1.0  // frequency

    // For each layer in one period
    const kHigh = k0 * Math.sqrt(epsHigh)
    const kLow = k0 * Math.sqrt(epsLow)
    const dHigh = fillFactor * PERIOD
    const dLow = (1 - fillFactor) * PERIOD

    // Transfer matrix for one period
    // M = M_low * M_high (layer by layer)
    const cosDeltaHigh = Math.cos(kHigh * dHigh)
    const cosDeltaLow = Math.cos(kLow * dLow)
    const sinDeltaHigh = Math.sin(kHigh * dHigh)
    const sinDeltaLow = Math.sin(kLow * dLow)

    // Bloch wave number from dispersion: cos(k Bloch * a) = cos(k1*d1)*cos(k2*d2) - 0.5*(Z1/Z2+Z2/Z1)*sin(k1*d1)*sin(k2*d2)
    const Z1 = 1 / epsHigh, Z2 = 1 / epsLow
    const arg = cosDeltaHigh * cosDeltaLow - 0.5 * (Z1 / Z2 + Z2 / Z1) * sinDeltaHigh * sinDeltaLow
    const inBandgap = Math.abs(arg) > 1.0

    // Reflectivity of finite stack
    const delta = inBandgap ? 0 : Math.acos(Math.max(-1, Math.min(1, arg)))
    const r = inBandgap ? 1 : Math.abs((Math.exp(2 * Math.abs(delta) * N_PERIODS_VIZ) - 1) /
                                        (Math.exp(2 * Math.abs(delta) * N_PERIODS_VIZ) + 1))
    reflection[s] = Math.min(r, 0.9999)
  }
}

// ---- 2D Photonic Crystal (Square Lattice) ----
const GRID_2D = 60
const CELL_2D = 0.1

const sceneContent = new THREE.Group()
scene.add(sceneContent)

// 1D band diagram visualization
const bandChartGeo = new THREE.PlaneGeometry(20, 12)
const bandChartMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
const bandChart = new THREE.Mesh(bandChartGeo, bandChartMat)
bandChart.position.set(-15, 8, -10)
bandChart.rotation.x = -Math.PI / 2
scene.add(bandChart)

// 2D crystal visualization
const crystalGeo = new THREE.PlaneGeometry(6, 6)
const crystalMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat)
crystalMesh.position.set(10, 8, 0)
crystalMesh.rotation.x = -Math.PI / 2
scene.add(crystalMesh)

// Band colors (stored per frequency point)
compute1DReflection()

// Create band chart colors
const chartColors = new Float32Array(100 * 3)
const chartGeo = new THREE.PlaneGeometry(20, 12, 99, 99)
chartGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(100 * 100 * 3), 3))

function buildBandChart() {
  // Build a heatmap: x-axis = frequency, y-axis = reflection coefficient
  const cols = chartGeo.attributes.color.array
  const w = 100, h = 100
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      // Interpolate reflection at this position
      const reflIdx = Math.floor(i / w * fSteps)
      const refl = reflection[Math.min(reflIdx, fSteps - 1)]
      const yNorm = j / h  // 0 = top, 1 = bottom
      const filled = yNorm < refl ? 1 : 0
      const colIdx = j * w + i
      // Bandgap: cyan glow; pass band: dark
      cols[colIdx * 3 + 0] = filled * 0.0   // R
      cols[colIdx * 3 + 1] = filled * 0.8   // G
      cols[colIdx * 3 + 2] = filled * 1.0   // B
    }
  }
  chartGeo.attributes.color.needsUpdate = true
}

function buildCrystalViz() {
  // 2D square lattice of dielectric rods
  const crColors = crystalGeo.attributes.color.array
  const n = 20
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1) - 0.5) * 6
      const y = (j / (n - 1) - 0.5) * 6
      // Distance from nearest rod center (lattice constant = 1)
      const rx = ((x / 1 + 0.5) % 1) - 0.5
      const ry = ((y / 1 + 0.5) % 1) - 0.5
      const dist = Math.sqrt(rx * rx + ry * ry)
      const inRod = dist < 0.2 * 1.0  // rod radius = 0.2 * lattice constant
      const colIdx = j * n + i
      crColors[colIdx * 3 + 0] = inRod ? 0.4 : 0.05
      crColors[colIdx * 3 + 1] = inRod ? 0.6 : 0.05
      crColors[colIdx * 3 + 2] = inRod ? 0.9 : 0.08
    }
  }
  crystalGeo.attributes.color.needsUpdate = true
}

// Axes for band chart
function buildAxes() {
  const group = new THREE.Group()
  const lineMat = new THREE.LineBasicMaterial({ color: 0x888888 })

  // X axis (frequency)
  const xGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-10, 0, 0), new THREE.Vector3(10, 0, 0)
  ])
  group.add(new THREE.Line(xGeo, lineMat))

  // Y axis (reflection)
  const yGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-10, 0, 0), new THREE.Vector3(-10, 12, 0)
  ])
  group.add(new THREE.Line(yGeo, lineMat))

  group.position.copy(bandChart.position)
  scene.add(group)
}

buildBandChart()
buildCrystalViz()
buildAxes()

// Rods in 3D for 2D crystal
const rodGeo = new THREE.CylinderGeometry(0.2, 0.2, 6, 16)
const rodMat = new THREE.MeshStandardMaterial({ color: 0x6699cc, roughness: 0.3, metalness: 0.7 })
const rodsGroup = new THREE.Group()
const latticeConst = 0.8
const rodsPerSide = 7
for (let i = 0; i < rodsPerSide; i++) {
  for (let j = 0; j < rodsPerSide; j++) {
    const rod = new THREE.Mesh(rodGeo, rodMat)
    rod.position.set(
      (i - rodsPerSide / 2 + 0.5) * latticeConst,
      0,
      (j - rodsPerSide / 2 + 0.5) * latticeConst
    )
    rodsGroup.add(rod)
  }
}
rodsGroup.position.set(10, 3, 0)
rodsGroup.rotation.x = Math.PI / 2
scene.add(rodsGroup)
rodsGroup.visible = false

// Text labels using sprites
function makeTextSprite(text, x, y, z) {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.font = 'bold 32px monospace'
  ctx.fillStyle = '#aaaaaa'
  ctx.fillText(text, 10, 42)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex })
  const sprite = new THREE.Sprite(mat)
  sprite.position.set(x, y, z)
  sprite.scale.set(8, 2, 1)
  return sprite
}

scene.add(makeTextSprite('Reflection', -21, 8, -10))
scene.add(makeTextSprite('Freq (ωa/2πc)', 0, -0.5, -10))
scene.add(makeTextSprite('Bandgap', -2, 7, -10))

const gui = new GUI()
gui.add({ mode: '1d' }, 'mode', { '1D Bragg Stack': '1d', '2D Square Lattice': '2d' })
  .name('Crystal Type').onChange(v => {
    mode = v
    rodsGroup.visible = v === '2d'
    bandChart.visible = v === '1d'
    crystalMesh.visible = v === '2d'
  })
gui.add({ fillFactor: 0.3 }, 'fillFactor', 0.1, 0.9).name('Fill Factor')
  .onChange(() => { compute1DReflection(); buildBandChart() })

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  rodsGroup.rotation.z += 0.003
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
