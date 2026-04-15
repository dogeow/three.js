// 3360. Scatter Plot Matrix 3D - PCA Dimensionality Reduction Visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(18, 14, 22)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.2)
composer.addPass(bloom)

// Lights
scene.add(new THREE.AmbientLight(0x8899ff, 0.4))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

// Axes helper
function buildAxes(size = 10) {
  const g = new THREE.Group()
  const matR = new THREE.LineBasicMaterial({ color: 0xff4444 })
  const matG = new THREE.LineBasicMaterial({ color: 0x44ff44 })
  const matB = new THREE.LineBasicMaterial({ color: 0x4488ff })
  const makeLine = (mat, dir) => {
    const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(...dir)]
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  makeLine(matR, [size, 0, 0]); makeLine(matG, [0, size, 0]); makeLine(matB, [0, 0, size])
  return g
}
const axes = buildAxes(8)
scene.add(axes)

// Labels (HTML)
function makeLabel(text, color) {
  const div = document.createElement('div')
  div.textContent = text
  div.style.cssText = `position:absolute;color:${color};font-size:12px;font-weight:bold;text-shadow:0 0 4px ${color};pointer-events:none`
  document.body.appendChild(div)
  return div
}
const labelX = makeLabel('PC1', '#ff6666')
const labelY = makeLabel('PC2', '#66ff66')
const labelZ = makeLabel('PC3', '#6699ff')

// Generate synthetic 8-D dataset, project to 3D via PCA
const DIM = 8
const CLUSTERS = 4
const CLUSTER_COLORS = [0x4488ff, 0x44ff88, 0xff8844, 0xff44aa]
const CLUSTER_NAMES = ['A', 'B', 'C', 'D']

let clusterCenters = []
function initClusters(n, spread) {
  clusterCenters = []
  for (let i = 0; i < n; i++) {
    const c = []
    for (let d = 0; d < DIM; d++) c.push((Math.random() - 0.5) * 20)
    clusterCenters.push(c)
  }
}

function generateData(N) {
  const raw = []
  const labels = []
  for (let i = 0; i < N; i++) {
    const ci = i % CLUSTERS
    const c = clusterCenters[ci]
    const pt = []
    for (let d = 0; d < DIM; d++) pt.push(c[d] + (Math.random() - 0.5) * spread)
    raw.push(pt)
    labels.push(ci)
  }
  return { raw, labels }
}

// Simplified PCA: power iteration for top 3 eigenvectors
function computePCA(raw) {
  const N = raw.length, D = raw[0].length
  // Center
  const mean = Array(D).fill(0)
  for (const pt of raw) for (let d = 0; d < D; d++) mean[d] += pt[d]
  for (let d = 0; d < D; d++) mean[d] /= N
  const centered = raw.map(pt => pt.map((v, d) => v - mean[d]))

  // Covariance (D x D)
  const cov = Array(D).fill(0).map(() => Array(D).fill(0))
  for (const pt of centered) for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) cov[i][j] += pt[i] * pt[j]
  for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) cov[i][j] /= N

  // Power iteration for top 3 eigenvectors
  const eigvecs = []
  let cov_copy = cov.map(r => [...r])
  for (let e = 0; e < 3; e++) {
    let v = Array(D).fill(0).map(() => Math.random() - 0.5)
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
    v = v.map(x => x / norm)
    for (let iter = 0; iter < 50; iter++) {
      const newv = Array(D).fill(0)
      for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) newv[i] += cov_copy[i][j] * v[j]
      norm = Math.sqrt(newv.reduce((s, x) => s + x * x, 0))
      v = newv.map(x => x / norm)
    }
    eigvecs.push(v)
    // Deflate
    const vvT = v.map(vi => v.map(vj => vi * vj))
    const lambda = v.reduce((s, vi, i) => s + vi * (cov_copy[i].reduce((ss, cij, j) => ss + cij * v[j], 0)), 0)
    for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) cov_copy[i][j] -= lambda * vvT[i][j]
  }

  // Project to 3D
  return raw.map(pt => {
    const c = pt.map((v, d) => v - mean[d])
    return eigvecs.map(v => v.reduce((s, vi, i) => s + vi * c[i], 0))
  })
}

// Build InstancedMesh for points
const dummy = new THREE.Object3D()
const sphereGeo = new THREE.SphereGeometry(0.12, 8, 8)
let mesh = null

function createScatterPlot(rawData, labels, projected) {
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
  
  const N = rawData.length
  const mat = new THREE.MeshStandardMaterial({ 
    vertexColors: true, 
    roughness: 0.3, 
    metalness: 0.1,
    transparent: true,
    opacity: 0.9
  })
  mesh = new THREE.InstancedMesh(sphereGeo, mat, N)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  
  const colors = new Float32Array(N * 3)
  const basePositions = []

  // Find bounds for normalization
  const xs = projected.map(p => p[0]), ys = projected.map(p => p[1]), zs = projected.map(p => p[2])
  const [xmin,xmax] = [Math.min(...xs), Math.max(...xs)]
  const [ymin,ymax] = [Math.min(...ys), Math.max(...ys)]
  const [zmin,zmax] = [Math.min(...zs), Math.max(...zs)]
  const rng = (v, mn, mx) => mx === mn ? 0 : (v - mn) / (mx - mn) * 16 - 8

  for (let i = 0; i < N; i++) {
    const [x, y, z] = projected[i]
    const nx = rng(x, xmin, xmax), ny = rng(y, ymin, ymax), nz = rng(z, zmin, zmax)
    basePositions.push([nx, ny, nz])
    dummy.position.set(nx, ny, nz)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    const ci = labels[i], c = new THREE.Color(CLUSTER_COLORS[ci])
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3))
  scene.add(mesh)
  return basePositions
}

// State
let params = { clusterCount: 4, pointCount: 500, spread: 4, pointSize: 0.12, animSpeed: 1.0 }
let basePositions = []
let dataState = null

function rebuild() {
  initClusters(params.clusterCount, params.spread)
  const { raw, labels } = generateData(params.pointCount)
  const projected = computePCA(raw)
  basePositions = createScatterPlot(raw, labels, projected)
  dataState = { labels }
}
rebuild()

// GUI
const gui = new GUI()
gui.add(params, 'clusterCount', 2, 6, 1).name('Clusters').onChange(rebuild)
gui.add(params, 'pointCount', 100, 1000, 50).name('Points').onChange(rebuild)
gui.add(params, 'spread', 1, 10, 0.5).name('Spread').onChange(rebuild)
gui.add(params, 'pointSize', 0.05, 0.4, 0.05).name('Point Size').onChange(v => {
  if (mesh) { const sg = new THREE.SphereGeometry(v, 8, 8); mesh.geometry.dispose(); mesh.geometry = sg }
})
gui.add(params, 'animSpeed', 0, 3, 0.1).name('Anim Speed')

// Animate labels
function updateLabels() {
  const w = innerWidth, h = innerHeight
  const toScreen = (p3d) => {
    const v = p3d.clone().project(camera)
    return [(v.x + 1) / 2 * w, (-v.y + 1) / 2 * h]
  }
  const [lx, ly] = toScreen(new THREE.Vector3(9, 0, 0))
  const [mx, my] = toScreen(new THREE.Vector3(0, 9, 0))
  const [zx, zy] = toScreen(new THREE.Vector3(0, 0, 9))
  labelX.style.left = lx + 'px'; labelX.style.top = ly + 'px'
  labelY.style.left = mx + 'px'; labelY.style.top = my + 'px'
  labelZ.style.left = zx + 'px'; labelZ.style.top = zy + 'px'
}

const clock = new THREE.Clock()
let frame = 0
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  frame++
  
  if (mesh && basePositions.length > 0) {
    for (let i = 0; i < basePositions.length; i++) {
      const [bx, by, bz] = basePositions[i]
      const ox = Math.sin(t * 0.5 + i * 0.1) * 0.15
      const oy = Math.cos(t * 0.3 + i * 0.13) * 0.15
      const oz = Math.sin(t * 0.4 + i * 0.07) * 0.15
      dummy.position.set(bx + ox, by + oy, bz + oz)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  if (frame % 3 === 0) updateLabels()
  controls.update()
  composer.render()
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  updateLabels()
})
