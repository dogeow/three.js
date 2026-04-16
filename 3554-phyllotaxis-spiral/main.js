// 3554. Phyllotaxis Fibonacci Spiral — Nature's mathematical arrangement
// Golden angle: 137.5077640502548 degrees
// Each seed/leaf at radius sqrt(n) * scale, angle = n * golden_angle
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const GOLDEN_ANGLE = 137.5077640502548 * Math.PI / 180
const MAX_N = 2000

let n = 500
let scale = 0.5
let animSpeed = 0
let colorMode = 0
let showLines = true

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080818)
scene.fog = new THREE.FogExp2(0x080818, 0.015)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 40, 30)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(10, 30, 20)
scene.add(dirLight)

// Instanced mesh for seeds
const sphereGeo = new THREE.SphereGeometry(0.3, 8, 8)
const instancedMesh = new THREE.InstancedMesh(sphereGeo, new THREE.MeshStandardMaterial({ vertexColors: true }), MAX_N)
scene.add(instancedMesh)

// Line geometry for spiral
const linePositions = new Float32Array(MAX_N * 3)
const lineGeo = new THREE.BufferGeometry()
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.15, transparent: true })
const spiralLine = new THREE.Line(lineGeo, lineMat)
scene.add(spiralLine)

// Color modes
const palettes = [
  // Sunflower: yellow center to green edge
  (t, n_) => {
    const r = 0.9 * (1 - t * 0.5)
    const g = 0.7 + 0.3 * Math.sin(t * Math.PI * 4)
    const b = 0.1 + 0.3 * t
    return [r, g, b]
  },
  // Rainbow
  (t) => {
    const h = t * 6
    const s = 1, v = 1
    const i = Math.floor(h)
    const f = h - i
    const p = v * (1 - s), q = v * (1 - f * s), tt = v * (1 - (1 - f) * s)
    const colors6 = [[v,tt,p],[q,v,p],[p,v,tt],[p,q,v],[tt,p,v],[v,p,q]]
    const [r,g,b] = colors6[i % 6]
    return [r, g, b]
  },
  // Blue to white (temperature)
  (t) => [0.2 + t * 0.8, 0.4 + t * 0.6, 0.8 + t * 0.2],
  // Green gradient
  (t) => [0.1, 0.3 + t * 0.6, 0.15 + t * 0.4]
]

const paletteFunc = () => palettes[colorMode]

const dummy = new THREE.Object3D()
const colors = new Float32Array(MAX_N * 3)

function updatePhyllotaxis() {
  let lastX = 0, lastZ = 0
  for (let i = 0; i < n; i++) {
    const angle = i * GOLDEN_ANGLE
    const radius = Math.sqrt(i) * scale
    const x = radius * Math.cos(angle)
    const z = radius * Math.sin(angle)
    const y = (i / n) * 2.0 - 1.0  // slight upward tilt for 3D feel

    dummy.position.set(x, y * 0.5, z)
    dummy.scale.setScalar(0.5 + (i / n) * 1.5)
    dummy.updateMatrix()
    instancedMesh.setMatrixAt(i, dummy.matrix)

    // Store line positions
    linePositions[i * 3 + 0] = x
    linePositions[i * 3 + 1] = y * 0.5
    linePositions[i * 3 + 2] = z

    // Color
    const t = i / n
    const [r, g, b] = paletteFunc()(t, i)
    colors[i * 3 + 0] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b

    lastX = x; lastZ = z
  }
  instancedMesh.count = n
  instancedMesh.instanceMatrix.needsUpdate = true
  instancedMesh.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3))
  instancedMesh.material.vertexColors = true

  lineGeo.setDrawRange(0, n)
  lineGeo.attributes.position.needsUpdate = true
  spiralLine.visible = showLines
}

const gui = new GUI()
gui.add({ n }, 'n', 10, MAX_N, 1).name('Seed Count').onChange(v => { n = v; updatePhyllotaxis() })
gui.add({ scale }, 'scale', 0.1, 2.0).name('Scale').onChange(v => { scale = v; updatePhyllotaxis() })
gui.add({ colorMode }, 'colorMode', { Sunflower: 0, Rainbow: 1, Temperature: 2, Green: 3 }).name('Color').onChange(v => { colorMode = v; updatePhyllotaxis() })
gui.add({ showLines }, 'showLines').name('Show Spiral').onChange(v => { showLines = v; spiralLine.visible = v })
gui.add({ autoRotate: true }, 'autoRotate').name('Auto Rotate')
  .onChange(v => { controls.autoRotate = v })

// Add connecting lines from center to each seed
const radialGeo = new THREE.BufferGeometry()
const radialPositions = new Float32Array(n * 6)
radialGeo.setAttribute('position', new THREE.BufferAttribute(radialPositions, 3))
const radialMat = new THREE.LineBasicMaterial({ color: 0x444444, opacity: 0.1, transparent: true })
const radialLines = new THREE.LineSegments(radialGeo, radialMat)
scene.add(radialLines)

function updateRadialLines() {
  for (let i = 0; i < n; i++) {
    const angle = i * GOLDEN_ANGLE
    const radius = Math.sqrt(i) * scale
    const x = radius * Math.cos(angle)
    const z = radius * Math.sin(angle)
    const y = (i / n) * 2.0 - 1.0
    radialPositions[i * 6 + 0] = 0; radialPositions[i * 6 + 1] = 0; radialPositions[i * 6 + 2] = 0
    radialPositions[i * 6 + 3] = x; radialPositions[i * 6 + 4] = y * 0.5; radialPositions[i * 6 + 5] = z
  }
  radialGeo.attributes.position.needsUpdate = true
  radialGeo.setDrawRange(0, n * 2)
}

updatePhyllotaxis()
updateRadialLines()

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
