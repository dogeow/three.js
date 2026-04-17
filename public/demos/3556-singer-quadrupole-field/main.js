// 3556. Electromagnetic Quadrupole Field — Singer pure quadrupole visualization
// 电四极矩场：两个相反偶极子的叠加，形成鞍形势场
// 量子教学演示：四极矩算符的 eigenstates
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 20, 30)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(10, 30, 20)
scene.add(dirLight)

// Quadrupole charges: +q at top, -q at bottom (electric quadrupole)
// In 3D this is a linear quadrupole: +q, -2q, +q along z-axis
// Or 2D: four charges at corners of a square with alternating signs
const charges = [
  { x:  1, y:  1, z: 0, q: +1, mesh: null },
  { x:  1, y: -1, z: 0, q: -1, mesh: null },
  { x: -1, y:  1, z: 0, q: -1, mesh: null },
  { x: -1, y: -1, z: 0, q: +1, mesh: null },
]

const SCALE_VIZ = 4

// Charge meshes
const sphereGeo = new THREE.SphereGeometry(0.4, 16, 16)
charges.forEach((ch, i) => {
  const mat = new THREE.MeshStandardMaterial({
    color: ch.q > 0 ? 0xff4444 : 0x4444ff,
    emissive: ch.q > 0 ? 0xaa0000 : 0x0000aa,
    roughness: 0.2, metalness: 0.8
  })
  ch.mesh = new THREE.Mesh(sphereGeo, mat)
  ch.mesh.position.set(ch.x * SCALE_VIZ, ch.y * SCALE_VIZ, ch.z * SCALE_VIZ)
  scene.add(ch.mesh)
})

// Quadrupole potential: V = k * Q / r^3 * (3cos²θ - 1)
// For linear quadrupole along z: Q = q * (2a² - r² - z²)
// We approximate with point charges for visualization
function potential(x, y, z) {
  let V = 0
  const k = 8.99  // Coulomb constant (scaled)
  for (const ch of charges) {
    const dx = x - ch.x * SCALE_VIZ
    const dy = y - ch.y * SCALE_VIZ
    const dz = z - ch.z * SCALE_VIZ
    const r = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.01
    V += k * ch.q / r
  }
  return V
}

// Field lines (E = -∇V)
const FIELD_STEPS = 60
const FIELD_DT = 0.15

function computeField(x, y, z) {
  const eps = 0.01
  const Ex = -(potential(x+eps,y,z) - potential(x-eps,y,z)) / (2*eps)
  const Ey = -(potential(x,y+eps,z) - potential(x,y-eps,z)) / (2*eps)
  const Ez = -(potential(x,y,z+eps) - potential(x,y,z-eps)) / (2*eps)
  return [Ex, Ey, Ez]
}

function traceFieldLine(startX, startY, startZ, maxSteps, inward) {
  const points = []
  let x = startX, y = startY, z = startZ
  const dt = inward ? -FIELD_DT : FIELD_DT
  for (let step = 0; step < maxSteps; step++) {
    const [Ex, Ey, Ez] = computeField(x, y, z)
    const mag = Math.sqrt(Ex*Ex + Ey*Ey + Ez*Ez) + 0.001
    x += (Ex / mag) * dt
    y += (Ey / mag) * dt
    z += (Ez / mag) * dt
    points.push(new THREE.Vector3(x, y, z))
    // Stop at boundaries
    if (Math.abs(x) > 20 || Math.abs(y) > 20 || Math.abs(z) > 10) break
  }
  return points
}

// Generate field lines from each charge
const fieldLinesGroup = new THREE.Group()
scene.add(fieldLinesGroup)

const lineColors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88, 0xff8844]

function rebuildFieldLines() {
  while (fieldLinesGroup.children.length) {
    fieldLinesGroup.remove(fieldLinesGroup.children[0])
  }

  const linesPerCharge = 12
  charges.forEach((ch, ci) => {
    const color = lineColors[ci % lineColors.length]
    for (let i = 0; i < linesPerCharge; i++) {
      const angle = (i / linesPerCharge) * Math.PI * 2
      const startX = ch.x * SCALE_VIZ + Math.cos(angle) * 0.5
      const startY = ch.y * SCALE_VIZ + Math.sin(angle) * 0.5
      const startZ = ch.z * SCALE_VIZ

      // Trace in both directions
      for (const inward of [false, true]) {
        const pts = traceFieldLine(startX, startY, startZ, FIELD_STEPS, inward)
        if (pts.length < 2) continue

        const geo = new THREE.BufferGeometry().setFromPoints(pts)
        const mat = new THREE.LineBasicMaterial({
          color: color,
          opacity: 0.4,
          transparent: true
        })
        fieldLinesGroup.add(new THREE.Line(geo, mat))
      }
    }
  })
}

// Potential surface (isosurface of V)
const potentialGrid = 40
const isoValue = 0.5  // isosurface level

const verts = []
const indices = []
const isoVerts = []

function marchingCubesIso() {
  // Simplified: draw field magnitude as a color-coded sphere cloud
  // Instead, let's use Points to show potential values
}

// Points showing potential field
const pointCount = 4000
const pointPositions = new Float32Array(pointCount * 3)
const pointColors = new Float32Array(pointCount * 3)
const pointGeo = new THREE.BufferGeometry()
pointGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
pointGeo.setAttribute('color', new THREE.BufferAttribute(pointColors, 3))
const pointMat = new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0.7 })
const fieldPoints = new THREE.Points(pointGeo, pointMat)
scene.add(fieldPoints)

function updateFieldPoints() {
  for (let i = 0; i < pointCount; i++) {
    const x = (Math.random() - 0.5) * 30
    const y = (Math.random() - 0.5) * 30
    const z = (Math.random() - 0.5) * 15
    pointPositions[i * 3 + 0] = x
    pointPositions[i * 3 + 1] = y
    pointPositions[i * 3 + 2] = z

    const V = potential(x, y, z)
    // Color by potential: blue = positive, red = negative, green = near zero
    const t = Math.tanh(V * 0.5)  // map to -1..1
    pointColors[i * 3 + 0] = t > 0 ? t : 0
    pointColors[i * 3 + 1] = 1 - Math.abs(t) * 0.5
    pointColors[i * 3 + 2] = t < 0 ? -t : 0
  }
  pointGeo.attributes.position.needsUpdate = true
  pointGeo.attributes.color.needsUpdate = true
}

rebuildFieldLines()
updateFieldPoints()

// Charge label sprites
function makeTextSprite(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.font = 'bold 48px monospace'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.fillText(text, 64, 46)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(2, 1, 1)
  return sprite
}

charges.forEach((ch, i) => {
  const label = ch.q > 0 ? '+q' : '−q'
  const color = ch.q > 0 ? '#ff6666' : '#6666ff'
  const sprite = makeTextSprite(label, color)
  sprite.position.set(ch.x * SCALE_VIZ, ch.y * SCALE_VIZ + 1.5, ch.z * SCALE_VIZ)
  scene.add(sprite)
})

// Axis arrows
function addAxis() {
  const origin = new THREE.Vector3(0, 0, 0)
  const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1,0,0), origin, 12, 0xff4444, 0.5, 0.3)
  const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), origin, 12, 0x44ff44, 0.5, 0.3)
  const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0,0,1), origin, 8, 0x4444ff, 0.5, 0.3)
  scene.add(arrowX, arrowY, arrowZ)
}
addAxis()

const gui = new GUI()
gui.add({ rebuild: () => { rebuildFieldLines(); updateFieldPoints() } }, 'rebuild').name('↺ Rebuild Lines')

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
