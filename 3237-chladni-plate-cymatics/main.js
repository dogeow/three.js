// 3237. Chladni Plate Cymatics
// 克拉德尼板克拉尼图形 - 声波振动节点图案可视化
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a14)
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 25, 30)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(10, 30, 10)
scene.add(dirLight)
const pointLight = new THREE.PointLight(0x4488ff, 2, 50)
pointLight.position.set(0, 15, 0)
scene.add(pointLight)

// Parameters
const params = {
  freqA: 120,
  freqB: 180,
  amplitude: 1.5,
  resolution: 80,
  mode: 'standing-wave',
  animateSpeed: 0.5,
  colorScheme: 'ocean'
}

// Grid for Chladni pattern
const GRID = params.resolution
const SIZE = 30
let geometry, material, mesh
let time = 0

// Color schemes
const COLORS = {
  ocean: [0x0077be, 0x00a8cc, 0xff6f61, 0xffd700],
  fire: [0xff2200, 0xff6600, 0xffaa00, 0xffffff],
  neon: [0xff00ff, 0x00ffff, 0x00ff00, 0xffff00],
  crystal: [0x88ccff, 0xffffff, 0xccddff, 0xaaccff]
}

function chladniValue(x, y, t, m, n) {
  const L = SIZE / 2
  const xi = (x + L) / L - 1
  const yi = (y + L) / L - 1
  const freq = params.freqA + (m + n) * 10
  const phase = freq * t * 0.01
  // Chladni formula: sin(mπx)sin(nπy) - sin(nπx)sin(mπy)
  const pi = Math.PI
  const val = Math.sin(m * pi * xi) * Math.sin(n * pi * yi) * Math.cos(phase) -
              Math.sin(n * pi * xi) * Math.sin(m * pi * yi) * Math.sin(phase)
  return val * params.amplitude
}

function buildMesh() {
  if (mesh) {
    scene.remove(mesh)
    geometry.dispose()
    material.dispose()
  }
  
  geometry = new THREE.PlaneGeometry(SIZE, SIZE, GRID - 1, GRID - 1)
  const positions = geometry.attributes.position.array
  const colors = new Float32Array(positions.length)
  const scheme = COLORS[params.colorScheme] || COLORS.ocean
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const m = Math.floor(params.freqA / 40)
    const n = Math.floor(params.freqB / 40)
    const z = chladniValue(x, y, time, Math.max(1, m), Math.max(1, n))
    positions[i + 2] = z
    
    // Color based on z value
    const t = (z / params.amplitude + 1) / 2
    const c1 = new THREE.Color(scheme[0])
    const c2 = new THREE.Color(scheme[1])
    const c = c1.lerp(c2, t)
    colors[i] = c.r
    colors[i + 1] = c.g
    colors[i + 2] = c.b
  }
  
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  
  material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.3,
    roughness: 0.4,
    side: THREE.DoubleSide,
    wireframe: false
  })
  
  mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
  
  // Wireframe overlay
  if (mesh.userData.wireframe) scene.remove(mesh.userData.wireframe)
  const wireGeo = new THREE.WireframeGeometry(geometry)
  const wireMat = new THREE.LineBasicMaterial({ color: 0x4488ff, opacity: 0.15, transparent: true })
  const wireMesh = new THREE.LineSegments(wireGeo, wireMat)
  mesh.userData.wireframe = wireMesh
  scene.add(wireMesh)
}

buildMesh()

// Boundary frame
const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE, 0.5, SIZE))
const frameMat = new THREE.LineBasicMaterial({ color: 0x4488ff, opacity: 0.5, transparent: true })
scene.add(new THREE.LineSegments(frameGeo, frameMat))

// GUI
const gui = new GUI()
gui.add(params, 'freqA', 20, 400, 1).name('频率 A').onChange(buildMesh)
gui.add(params, 'freqB', 20, 400, 1).name('频率 B').onChange(buildMesh)
gui.add(params, 'amplitude', 0.1, 5, 0.1).name('振幅').onChange(buildMesh)
gui.add(params, 'resolution', 20, 150, 1).name('网格精度').onChange(buildMesh)
gui.add(params, 'animateSpeed', 0, 3, 0.1).name('动画速度')
gui.add(params, 'colorScheme', Object.keys(COLORS)).name('配色方案').onChange(buildMesh)
gui.add({ wireframe: false }, 'wireframe').name('线框模式').onChange(v => {
  material.wireframe = v
})

function updateMesh() {
  if (!geometry) return
  const positions = geometry.attributes.position.array
  const colors = geometry.attributes.color.array
  const scheme = COLORS[params.colorScheme] || COLORS.ocean
  const m = Math.floor(params.freqA / 40)
  const n = Math.floor(params.freqB / 40)
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const z = chladniValue(x, y, time, Math.max(1, m), Math.max(1, n))
    positions[i + 2] = z
    
    const t = (z / params.amplitude + 1) / 2
    const c1 = new THREE.Color(scheme[0])
    const c2 = new THREE.Color(scheme[1])
    const c = c1.lerp(c2, t)
    colors[i] = c.r
    colors[i + 1] = c.g
    colors[i + 2] = c.b
  }
  
  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true
  geometry.computeVertexNormals()
  
  if (mesh.userData.wireframe) {
    mesh.userData.wireframe.geometry.dispose()
    mesh.userData.wireframe.geometry = new THREE.WireframeGeometry(geometry)
  }
}

function animate() {
  requestAnimationFrame(animate)
  time += params.animateSpeed
  updateMesh()
  pointLight.intensity = 1.5 + Math.sin(time * 0.1) * 0.5
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
