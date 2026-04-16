// 3557. Hadamard Geodesic Flow — Negative curvature & exponential divergence
// 负曲率空间中的测地线流：初期相近的测地线以指数速度分离
// 这是混沌几何的核心现象：负曲率 → 指数量地线分离
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x030308)
scene.fog = new THREE.FogExp2(0x030308, 0.012)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 35, 25)
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

// Hyperbolic plane visualization using Poincaré disk model
// In Poincaré disk: metric ds² = 4|dw|²/(1-|w|²)²
// Geodesics are arcs of circles orthogonal to boundary, or diameters
const DISK_RADIUS = 14

// Poincaré disk -> 3D position
function poincareTo3D(x, y) {
  const r = Math.sqrt(x*x + y*y)
  const z = 1 + r*r  // height based on radius for 3D effect
  return new THREE.Vector3(x * DISK_RADIUS / r * (r / (1 + z)), -r * DISK_RADIUS / (1 + z) * 2, y * DISK_RADIUS / r * (r / (1 + z)))
  // Actually: project to hemisphere then scale
}

// Better: map disk to upper hemisphere (Beltrami-Klein)
function diskToHemisphere(dx, dy) {
  const r2 = dx*dx + dy*dy
  const z = 1 - r2
  const norm = DISK_RADIUS / (1 + r2)
  return new THREE.Vector3(dx * norm, z * norm * 0.5 - 1, dy * norm)
}

// Draw Poincaré disk boundary circle
const diskGeo = new THREE.RingGeometry(DISK_RADIUS - 0.05, DISK_RADIUS + 0.05, 128)
const diskMat = new THREE.MeshBasicMaterial({ color: 0x334466, side: THREE.DoubleSide })
const diskRing = new THREE.Mesh(diskGeo, diskMat)
diskRing.rotation.x = -Math.PI / 2
diskRing.position.y = 0
scene.add(diskRing)

// Disk fill (semi-transparent)
const diskFillGeo = new THREE.CircleGeometry(DISK_RADIUS - 0.05, 128)
const diskFillMat = new THREE.MeshBasicMaterial({ color: 0x080820, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
const diskFill = new THREE.Mesh(diskFillGeo, diskFillMat)
diskFill.rotation.x = -Math.PI / 2
diskFill.position.y = -0.01
scene.add(diskFill)

// Hyperbolic grid (geodesic parallels and meridians)
const gridGroup = new THREE.Group()
scene.add(gridGroup)

function drawHyperbolicGrid() {
  const lineMat = new THREE.LineBasicMaterial({ color: 0x223355, opacity: 0.4, transparent: true })
  // Concentric circles (geodesic circles in Poincaré disk)
  for (let i = 1; i <= 7; i++) {
    const r = i * DISK_RADIUS / 8
    const geo = new THREE.BufferGeometry().setFromPoints([])
    const pts = []
    for (let a = 0; a <= 64; a++) {
      const angle = (a / 64) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r))
    }
    geo.setFromPoints(pts)
    gridGroup.add(new THREE.Line(geo, lineMat))
  }
  // Radial lines (geodesic diameters)
  for (let a = 0; a < 12; a++) {
    const angle = (a / 12) * Math.PI * 2
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(DISK_RADIUS * Math.cos(angle), 0, DISK_RADIUS * Math.sin(angle))]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    gridGroup.add(new THREE.Line(geo, lineMat))
  }
}
drawHyperbolicGrid()

// Geodesic equation in Poincaré disk:
// dw/dt = v, dv/dt = 2*Re((v²/(1-|w|²)) * conj(w)) * (1-|w|²)² * w/|w|²
// Simplified: use geodesic ODE in Poincaré metric
function geodesicStep(wx, wy, vx, vy, dt) {
  const r2 = wx*wx + wy*wy
  const denom = (1 - r2)
  // Christoffel symbols in Poincaré disk
  // d²w/dt² = (2*r²/(1-r²)) * (dw/dt)² * ŵ
  // where ŵ = unit vector in direction of w
  const r = Math.sqrt(r2) + 1e-10
  const nx = wx / r, ny = wy / r  // unit radial
  const vDotN = vx*nx + vy*ny
  const vPerpX = vx - vDotN * nx
  const vPerpY = vy - vDotN * ny
  const vPerp2 = vPerpX*vPerpX + vPerpY*vPerpY
  // Acceleration toward origin (curvature effect)
  const ax = 2 * r2 / denom * vPerp2 * nx
  const ay = 2 * r2 / denom * vPerp2 * ny
  return [vx + ax * dt, vy + ay * dt]
}

// Trace geodesic from starting point and direction
function traceGeodesic(startX, startY, startVX, startVY, maxSteps, dt) {
  const points = []
  let wx = startX, wy = startY
  let vx = startVX, vy = startVY
  for (let i = 0; i < maxSteps; i++) {
    // Poincaré disk to 3D
    const r2 = wx*wx + wy*wy
    if (r2 >= 0.999) break  // hit boundary
    const pt = diskToHemisphere(wx, wy)
    points.push(pt)
    // Normalize velocity
    const vmag = Math.sqrt(vx*vx + vy*vy)
    vx /= vmag; vy /= vmag
    // Step
    const [nvx, nvy] = geodesicStep(wx, wy, vx, vy, dt)
    wx += nvx * dt * 0.5
    wy += nvy * dt * 0.5
    vx = nvx; vy = nvy
  }
  return points
}

// Disk to hemisphere
function diskToHemisphere(dx, dy) {
  const r2 = dx*dx + dy*dy
  const norm = DISK_RADIUS / (1 + r2)
  const z = (1 - r2) / (1 + r2) * DISK_RADIUS * 0.4
  return new THREE.Vector3(dx * norm, z, dy * norm)
}

const geodesicsGroup = new THREE.Group()
scene.add(geodesicsGroup)

const divergenceData = []  // store divergence over time

function rebuildGeodesics() {
  while (geodesicsGroup.children.length) {
    geodesicsGroup.remove(geodesicsGroup.children[0])
  }
  divergenceData.length = 0

  const nRays = 24
  const baseAngle = 0
  const initSeparation = 0.005  // initial angular separation in radians
  const rayLength = 500

  const basePts = traceGeodesic(0.1, 0.1, 0.8, 0.6, rayLength, 0.02)

  for (let i = 0; i < nRays; i++) {
    const sep = (i - nRays/2) * initSeparation
    // Rotate direction by small angle
    const ca = Math.cos(sep), sa = Math.sin(sep)
    const dvx = basePts[1] ? (basePts[1].x - basePts[0].x) : 0.8
    const dvy = basePts[1] ? (basePts[1].z - basePts[0].z) : 0.6
    const startVX = dvx * ca - dvy * sa
    const startVY = dvx * sa + dvy * ca

    const pts = traceGeodesic(0.1, 0.1, startVX, startVY, rayLength, 0.02)
    if (pts.length < 2) continue

    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const hue = i / nRays
    const color = new THREE.Color().setHSL(hue, 0.9, 0.6)
    const mat = new THREE.LineBasicMaterial({ color, opacity: 0.7, transparent: true })
    geodesicsGroup.add(new THREE.Line(geo, mat))

    // Compute separation from center ray at each point
    if (i === 0) {
      for (let j = 0; j < pts.length; j++) {
        divergenceData.push({ step: j, separation: 0 })
      }
    } else {
      for (let j = 0; j < Math.min(pts.length, divergenceData.length); j++) {
        const sep3D = pts[j].distanceTo(basePts[j])
        divergenceData[j].separation = Math.max(divergenceData[j].separation, sep3D)
      }
    }
  }
}

// Also draw a 3D surface representing the hyperbolic plane
const surfaceGroup = new THREE.Group()
scene.add(surfaceGroup)

function buildHyperbolicSurface() {
  const res = 80
  const positions = []
  const indices = []
  const colors = []

  for (let j = 0; j <= res; j++) {
    for (let i = 0; i <= res; i++) {
      const x = (i / res - 0.5) * 2 * DISK_RADIUS * 0.95
      const y = (j / res - 0.5) * 2 * DISK_RADIUS * 0.95
      const r2 = x*x + y*y
      if (r2 >= DISK_RADIUS * DISK_RADIUS * 0.9) {
        positions.push(0, -10, 0)
        colors.push(0, 0, 0)
        continue
      }
      const r = Math.sqrt(r2)
      // Poincaré disk z: z = (1-r²)/(1+r²)
      const z = DISK_RADIUS * 0.3 * (1 - r2 / (DISK_RADIUS * DISK_RADIUS))
      const nx = x / (r + 0.001), ny = y / (r + 0.001)
      positions.push(x, z, y)
      const t = r / DISK_RADIUS
      colors.push(0.05 + t * 0.1, 0.08 + t * 0.15, 0.2 + t * 0.3)
    }
  }

  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const a = j * (res+1) + i
      const b = a + 1
      const c = a + (res+1)
      const d = c + 1
      if (positions[a*3+1] > -5 && positions[b*3+1] > -5 && positions[c*3+1] > -5 && positions[d*3+1] > -5) {
        indices.push(a, b, c, b, d, c)
      }
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geo, mat)
  surfaceGroup.add(mesh)
}

buildHyperbolicSurface()
rebuildGeodesics()

// Draw divergence chart
const chartGroup = new THREE.Group()
scene.add(chartGroup)

function buildDivergenceChart() {
  while (chartGroup.children.length) chartGroup.remove(chartGroup.children[0])
  if (divergenceData.length < 2) return

  const pts = divergenceData.map((d, i) => new THREE.Vector3(i * 0.2 - divergenceData.length * 0.1, d.separation * 5, 0))
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color: 0xff6600, linewidth: 2 })
  chartGroup.add(new THREE.Line(geo, mat))

  // Axes
  const xGeo = new THREE.BufferGeometry().setFromPoints([pts[0].clone(), pts[pts.length-1].clone()])
  chartGroup.add(new THREE.Line(xGeo, new THREE.LineBasicMaterial({ color: 0x888888 })))
}

buildDivergenceChart()
chartGroup.position.set(-15, -3, 5)
chartGroup.scale.set(0.5, 0.5, 0.5)

const gui = new GUI()
gui.add({ rebuild: () => { rebuildGeodesics(); buildDivergenceChart() } }, 'rebuild').name('↺ Rebuild')

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
