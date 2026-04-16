// 3898. Wave Function Collapse & Born Rule
// 波函数坍缩与玻恩规则可视化
// type: quantum-mechanics | physics | visualization
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 0, 50)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0x334466, 1))
const dLight = new THREE.DirectionalLight(0xffffff, 0.8)
dLight.position.set(10, 20, 10)
scene.add(dLight)

// ── Hilbert space 3D lattice (state grid) ─────────────────────────────────────
const N = 8 // 8x8x8 = 512 basis states
const SPACING = 4
const amplitudes = new Float32Array(N * N * N * 2) // real + imag pairs
const probabilities = new Float32Array(N * N * N)

function idx(x, y, z) { return (x * N + y) * N + z }

// Initialize as superposition: sum of several momentum eigenstates
function initSuperposition() {
  const kVectors = [
    [1, 0, 0], [0, 1, 0], [0, 0, 1],
    [1, 1, 1], [2, 0, 0], [0, 2, 0],
    [1, 1, 0], [0, 1, 1]
  ]
  const phases = [0, 0.5, 1.0, 0.3, 0.7, 1.2, 0.9, 0.1]
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        const i = idx(x, y, z)
        let real = 0, imag = 0
        for (let k = 0; k < kVectors.length; k++) {
          const [kx, ky, kz] = kVectors[k]
          const phase = (x * kx + y * ky + z * kz) * 0.5 + phases[k] * Math.PI
          real += Math.cos(phase) / Math.sqrt(kVectors.length)
          imag += Math.sin(phase) / Math.sqrt(kVectors.length)
        }
        amplitudes[i * 2] = real
        amplitudes[i * 2 + 1] = imag
        probabilities[i] = real * real + imag * imag
      }
    }
  }
  normalizeProbabilities()
}

function normalizeProbabilities() {
  let sum = 0
  for (let i = 0; i < probabilities.length; i++) sum += probabilities[i]
  for (let i = 0; i < probabilities.length; i++) probabilities[i] /= sum
}

initSuperposition()

// Build sphere positions and colors
const spherePositions = []
const sphereColors = []
const sphereSizes = []

for (let x = 0; x < N; x++) {
  for (let y = 0; y < N; y++) {
    for (let z = 0; z < N; z++) {
      spherePositions.push(
        (x - N / 2) * SPACING,
        (y - N / 2) * SPACING,
        (z - N / 2) * SPACING
      )
      const i = idx(x, y, z)
      const prob = probabilities[i]
      // Color by phase angle
      const real = amplitudes[i * 2], imag = amplitudes[i * 2 + 1]
      const angle = Math.atan2(imag, real)
      const hue = (angle / (2 * Math.PI) + 1) % 1
      const col = new THREE.Color().setHSL(hue, 0.9, 0.3 + prob * 5)
      sphereColors.push(col.r, col.g, col.b)
      sphereSizes.push(prob * 20 + 0.1)
    }
  }
}

// Instanced spheres
const baseGeo = new THREE.SphereGeometry(0.5, 8, 8)
const instMesh = new THREE.InstancedMesh(baseGeo, new THREE.MeshPhongMaterial({
  vertexColors: true, transparent: true, opacity: 0.85, shininess: 80
}), spherePositions.length / 3)

const dummy = new THREE.Object3D()
for (let i = 0; i < spherePositions.length / 3; i++) {
  dummy.position.set(spherePositions[i * 3], spherePositions[i * 3 + 1], spherePositions[i * 3 + 2])
  const s = sphereSizes[i]
  dummy.scale.setScalar(Math.cbrt(s) * 2 + 0.3)
  dummy.updateMatrix()
  instMesh.setMatrixAt(i, dummy.matrix)
  instMesh.setColorAt(i, new THREE.Color(sphereColors[i * 3], sphereColors[i * 3 + 1], sphereColors[i * 3 + 2]))
}
instMesh.instanceMatrix.needsUpdate = true
instMesh.instanceColor.needsUpdate = true
scene.add(instMesh)

// ── Wireframe lattice ──────────────────────────────────────────────────────────
const latticeGeo = new THREE.BoxGeometry((N - 1) * SPACING, (N - 1) * SPACING, (N - 1) * SPACING)
const edges = new THREE.EdgesGeometry(latticeGeo)
const lattice = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x223355, transparent: true, opacity: 0.3 }))
scene.add(lattice)

// ── Collapsed marker ──────────────────────────────────────────────────────────
const collapsedMarker = new THREE.Mesh(
  new THREE.OctahedronGeometry(2, 0),
  new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true })
)
scene.add(collapsedMarker)

// ── State probability bars (bottom panel) ─────────────────────────────────────
const barGroup = new THREE.Group()
barGroup.position.set(0, -25, 0)
scene.add(barGroup)

// Show top 20 probabilities as bars
const topStates = []
for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) for (let z = 0; z < N; z++)
  topStates.push({ x, y, z, p: probabilities[idx(x, y, z)] })
topStates.sort((a, b) => b.p - a.p)
const topN = 20
const barW = 0.8, barGap = 1.0
const totalW = topN * barW + (topN - 1) * barGap
for (let i = 0; i < topN; i++) {
  const { x, y, z, p } = topStates[i]
  const h = p * 300
  const barGeo = new THREE.BoxGeometry(barW, h, barW)
  const real = amplitudes[idx(x, y, z) * 2]
  const imag = amplitudes[idx(x, y, z) * 2 + 1]
  const angle = Math.atan2(imag, real)
  const hue = (angle / (2 * Math.PI) + 1) % 1
  const barMat = new THREE.MeshPhongMaterial({
    color: new THREE.Color().setHSL(hue, 0.9, 0.5),
    emissive: new THREE.Color().setHSL(hue, 0.9, 0.2),
    transparent: true, opacity: 0.9
  })
  const bar = new THREE.Mesh(barGeo, barMat)
  bar.position.set(-totalW / 2 + i * (barW + barGap) + barW / 2, h / 2, 0)
  barGroup.add(bar)
}

// ── Born rule probability sphere ──────────────────────────────────────────────
const probSphereGeo = new THREE.SphereGeometry(1.5, 32, 32)
const probSphereMat = new THREE.ShaderMaterial({
  uniforms: { uProb: { value: 0 } },
  vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform float uProb;
    varying float vY;
    void main() {
      float normalized = (vY + 1.5) / 3.0;
      vec3 col = mix(vec3(0.0, 0.3, 0.8), vec3(1.0, 0.3, 0.0), normalized);
      gl_FragColor = vec4(col, 0.6 + uProb * 0.4);
    }
  `,
  transparent: true, side: THREE.DoubleSide
})
const probSphere = new THREE.Mesh(probSphereGeo, probSphereMat)
probSphere.position.set(35, 10, 0)
scene.add(probSphere)

// ── UI ────────────────────────────────────────────────────────────────────────
let collapsed = false
let collapseAnim = 0
const infoEl = document.createElement('div')
infoEl.style.cssText = 'position:fixed;top:20px;left:20px;color:#88aaff;font-family:monospace;font-size:13px;z-index:10;pointer-events:none;line-height:1.8'
document.body.appendChild(infoEl)

const btn = document.createElement('button')
btn.textContent = '🎲 Measure (Collapse)'
btn.style.cssText = 'position:fixed;top:20px;right:20px;padding:10px 20px;background:#0d0d2b;border:2px solid #4466ff;color:#88aaff;border-radius:6px;cursor:pointer;font-family:monospace;font-size:14px;z-index:10'
document.body.appendChild(btn)
document.body.appendChild(btn)

let measuredState = null
btn.addEventListener('click', () => {
  if (collapsed) {
    // Reset
    collapsed = false
    collapseAnim = 0
    initSuperposition()
    updateInstMesh()
    btn.textContent = '🎲 Measure (Collapse)'
    return
  }
  // Born rule: sample according to probabilities
  let r = Math.random(), cumsum = 0
  for (let x = 0; x < N && !measuredState; x++)
    for (let y = 0; y < N && !measuredState; y++)
      for (let z = 0; z < N && !measuredState; z++) {
        cumsum += probabilities[idx(x, y, z)]
        if (cumsum >= r) measuredState = { x, y, z }
      }
  collapsed = true
  btn.textContent = '↺ Reset State'
})

function updateInstMesh() {
  let maxP = 0
  for (let i = 0; i < probabilities.length; i++) if (probabilities[i] > maxP) maxP = probabilities[i]
  let count = 0
  for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) for (let z = 0; z < N; z++) {
    const i = idx(x, y, z)
    const real = amplitudes[i * 2], imag = amplitudes[i * 2 + 1]
    const angle = Math.atan2(imag, real)
    const hue = (angle / (2 * Math.PI) + 1) % 1
    const prob = probabilities[i]
    const brightness = collapsed && measuredState && measuredState.x === x && measuredState.y === y && measuredState.z === z ? 1.0 : 0.3 + prob / (maxP || 1) * 0.7
    const col = new THREE.Color().setHSL(hue, 0.9, brightness * 0.6)
    dummy.position.set((x - N / 2) * SPACING, (y - N / 2) * SPACING, (z - N / 2) * SPACING)
    const s = collapsed ? (measuredState && measuredState.x === x && measuredState.y === y && measuredState.z === z ? 3 : 0.3) : (prob / (maxP || 1) * 2 + 0.3)
    dummy.scale.setScalar(s)
    dummy.updateMatrix()
    instMesh.setMatrixAt(count, dummy.matrix)
    instMesh.setColorAt(count, col)
    count++
  }
  instMesh.instanceMatrix.needsUpdate = true
  instMesh.instanceColor.needsUpdate = true
}

// ── Camera rotation ───────────────────────────────────────────────────────────
let autoRot = true
window.addEventListener('mousedown', () => { autoRot = false })
window.addEventListener('keydown', (e) => {
  if (e.key === 'r') { autoRot = true; measuredState = null; collapsed = false; initSuperposition(); updateInstMesh(); btn.textContent = '🎲 Measure (Collapse)' }
})

// ── Animation ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  const dt = clock.getDelta()

  if (autoRot) {
    instMesh.rotation.y = t * 0.1
    instMesh.rotation.x = t * 0.05
    lattice.rotation.y = t * 0.1
    lattice.rotation.x = t * 0.05
  }

  if (collapsed) {
    collapseAnim = Math.min(1, collapseAnim + 0.02)
    if (measuredState) {
      const { x, y, z } = measuredState
      const targetPos = new THREE.Vector3((x - N / 2) * SPACING, (y - N / 2) * SPACING, (z - N / 2) * SPACING)
      collapsedMarker.position.lerp(targetPos, 0.1)
      collapsedMarker.material.opacity = collapseAnim
      collapsedMarker.material.transparent = true
      collapsedMarker.scale.setScalar(1 + Math.sin(t * 5) * 0.2)
      probSphereMat.uniforms.uProb.value = collapseAnim
      probSphere.scale.setScalar(1 + collapseAnim * 2)
    }
  } else {
    collapsedMarker.position.set(0, 0, 0)
    collapsedMarker.scale.setScalar(0)
    probSphereMat.uniforms.uProb.value = 0
    probSphere.scale.setScalar(1)
  }

  // Bar animation
  for (let i = 0; i < Math.min(topN, topStates.length); i++) {
    const { x, y, z } = topStates[i]
    const bar = barGroup.children[i]
    if (bar) {
      const isMeasured = collapsed && measuredState && measuredState.x === x && measuredState.y === y && measuredState.z === z
      const targetH = isMeasured ? probabilities[idx(x, y, z)] * 500 : probabilities[idx(x, y, z)] * 300
      const curH = bar.geometry.parameters.height
      bar.scale.y = targetH / curH
      bar.position.y = targetH / 2
      bar.material.emissiveIntensity = isMeasured ? 1 + Math.sin(t * 5) * 0.5 : 0.3
    }
  }

  updateInstMesh()

  // Info
  let infoText = `▎ Hilbert Space: ${N}³ = ${N*N*N} basis states\n`
  infoText += `▎ Superposition: ${collapsed ? 'COLLAPSED' : 'ACTIVE'}\n`
  infoText += `▎ Max probability: ${(Math.max(...probabilities) * 100).toFixed(2)}%\n`
  if (measuredState) {
    const { x, y, z } = measuredState
    infoText += `▎ Measured: |${x},${y},${z}⟩\n`
    infoText += `▎ Born rule p = ${probabilities[idx(x, y, z)].toFixed(4)}\n`
  }
  infoText += `\n[drag to rotate] [R to reset]`
  infoEl.textContent = infoText

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
