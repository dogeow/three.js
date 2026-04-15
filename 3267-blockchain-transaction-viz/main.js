// 3267. Blockchain Transaction Viz
// Live blockchain mempool - pending transactions as glowing data packets
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020208)
scene.fog = new THREE.FogExp2(0x020208, 0.004)

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 800)
camera.position.set(0, 30, 60)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.5, 0.2)
composer.addPass(bloom)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.3

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.1))
const dirLight = new THREE.DirectionalLight(0x88ffaa, 0.5)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

// Blockchain structure - 8 nodes in a ring
const NUM_NODES = 8
const RING_RADIUS = 18
const nodes = []
const nodeGroup = new THREE.Group()
scene.add(nodeGroup)

const nodeGeo = new THREE.OctahedronGeometry(1.2, 1)
const nodeMats = [
  new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x004422, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.8 }),
  new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x112244, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.8 }),
  new THREE.MeshStandardMaterial({ color: 0xff88cc, emissive: 0x441122, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.8 }),
  new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x442200, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.8 }),
]

for (let i = 0; i < NUM_NODES; i++) {
  const angle = (i / NUM_NODES) * Math.PI * 2
  const mat = nodeMats[i % nodeMats.length].clone()
  const nodeMesh = new THREE.Mesh(nodeGeo, mat)
  nodeMesh.position.set(Math.cos(angle) * RING_RADIUS, Math.sin(angle) * 3, Math.sin(angle) * RING_RADIUS)
  nodeMesh.userData.baseAngle = angle
  nodeMesh.userData.index = i
  nodes.push(nodeMesh)
  nodeGroup.add(nodeMesh)
}

// Connection lines between nodes (blockchain links)
const linkMat = new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.4 })
for (let i = 0; i < NUM_NODES; i++) {
  const a = nodes[i].position.clone()
  const b = nodes[(i + 1) % NUM_NODES].position.clone()
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const linkGeo = new THREE.BufferGeometry().setFromPoints([a, b])
  const link = new THREE.Line(linkGeo, linkMat)
  nodeGroup.add(link)
}

// Mempool - pending transactions as particles
const MAX_TX = 300
const txPositions = new Float32Array(MAX_TX * 3)
const txColors = new Float32Array(MAX_TX * 3)
const txSizes = new Float32Array(MAX_TX)
const txVelocities = []
const txAges = []
const txDestNodes = []

const txColorsOptions = [
  [0.0, 1.0, 0.4],   // green - low fee
  [0.3, 0.7, 1.0],   // blue - medium
  [1.0, 0.3, 0.8],   // magenta - high fee
  [1.0, 0.8, 0.0],   // gold - priority
]

function randomOnRing(radius) {
  const angle = Math.random() * Math.PI * 2
  return new THREE.Vector3(Math.cos(angle) * radius, (Math.random() - 0.5) * 6, Math.sin(angle) * radius)
}

for (let i = 0; i < MAX_TX; i++) {
  const pos = randomOnRing(RING_RADIUS * (0.3 + Math.random() * 0.8))
  txPositions[i * 3] = pos.x
  txPositions[i * 3 + 1] = pos.y
  txPositions[i * 3 + 2] = pos.z
  const col = txColorsOptions[Math.floor(Math.random() * txColorsOptions.length)]
  txColors[i * 3] = col[0]; txColors[i * 3 + 1] = col[1]; txColors[i * 3 + 2] = col[2]
  txSizes[i] = 0.1 + Math.random() * 0.25
  txVelocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.05))
  txAges.push(Math.random() * 8)
  txDestNodes.push(Math.floor(Math.random() * NUM_NODES))
}

const txGeo = new THREE.BufferGeometry()
txGeo.setAttribute('position', new THREE.BufferAttribute(txPositions, 3))
txGeo.setAttribute('color', new THREE.BufferAttribute(txColors, 3))
txGeo.setAttribute('size', new THREE.BufferAttribute(txSizes, 1))

const txMat = new THREE.PointsMaterial({
  size: 0.3,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
})
const transactions = new THREE.Points(txGeo, txMat)
scene.add(transactions)

// Confirmed blocks - chain of cubes
const blocks = []
const blockMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.4, metalness: 0.6 })
const blockGeo = new THREE.BoxGeometry(1.8, 1.0, 1.8)

for (let i = 0; i < 12; i++) {
  const block = new THREE.Mesh(blockGeo, blockMat.clone())
  block.position.set(0, -5 - i * 2.5, 0)
  block.userData.txCount = Math.floor(50 + Math.random() * 150)
  block.userData.height = i + 1
  blocks.push(block)
  scene.add(block)
}

// Hash lines from blocks to nearest nodes
const hashLines = []
for (let i = 0; i < blocks.length; i++) {
  const nearestNode = nodes[i % NUM_NODES]
  const points = [blocks[i].position.clone().add(new THREE.Vector3(0, 0.5, 0)), nearestNode.position.clone()]
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.15 })
  const line = new THREE.Line(geo, mat)
  hashLines.push(line)
  scene.add(line)
}

// UI labels
const labelStyle = 'position:fixed;color:#88ffcc;font-family:monospace;font-size:12px;pointer-events:none;'
const feeLabel = document.createElement('div')
feeLabel.style.cssText = labelStyle + 'top:20px;left:20px;'
document.body.appendChild(feeLabel)

const blockLabel = document.createElement('div')
blockLabel.style.cssText = labelStyle + 'top:20px;right:20px;text-align:right;'
document.body.appendChild(blockLabel)

const legendLabel = document.createElement('div')
legendLabel.style.cssText = labelStyle + 'bottom:20px;left:20px;font-size:11px;line-height:1.8;'
legendLabel.innerHTML = '● Green: Low fee<br>● Blue: Medium fee<br>● Magenta: High fee<br>● Gold: Priority'
document.body.appendChild(legendLabel)

// Stats
let confirmedCount = 0
let totalFees = 0

function spawnNewTx(index) {
  const pos = randomOnRing(RING_RADIUS * (0.3 + Math.random() * 0.8))
  txPositions[index * 3] = pos.x
  txPositions[index * 3 + 1] = pos.y
  txPositions[index * 3 + 2] = pos.z
  const col = txColorsOptions[Math.floor(Math.random() * txColorsOptions.length)]
  txColors[index * 3] = col[0]; txColors[index * 3 + 1] = col[1]; txColors[index * 3 + 2] = col[2]
  txSizes[index] = 0.1 + Math.random() * 0.25
  txVelocities[index].set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.05)
  txAges[index] = 0
  txDestNodes[index] = Math.floor(Math.random() * NUM_NODES)
}

function updateBlockchain(delta, time) {
  // Rotate node group slowly
  nodeGroup.rotation.y += delta * 0.08

  // Node pulsing
  nodes.forEach((node, i) => {
    node.rotation.x += delta * 0.5
    node.rotation.z += delta * 0.3
    const pulse = 1 + Math.sin(time * 2 + i) * 0.1
    node.scale.setScalar(pulse)
  })

  // Update transactions
  for (let i = 0; i < MAX_TX; i++) {
    txAges[i] += delta
    const v = txVelocities[i]

    // Gentle drift toward destination node
    const destNode = nodes[txDestNodes[i]]
    const toDest = destNode.position.clone().sub(new THREE.Vector3(txPositions[i * 3], txPositions[i * 3 + 1], txPositions[i * 3 + 2]))
    const dist = toDest.length()
    if (dist > 2) {
      v.add(toDest.normalize().multiplyScalar(delta * 0.01))
    }

    txPositions[i * 3] += v.x
    txPositions[i * 3 + 1] += v.y
    txPositions[i * 3 + 2] += v.z

    // Bounce off ring boundary
    const pos = new THREE.Vector3(txPositions[i * 3], txPositions[i * 3 + 1], txPositions[i * 3 + 2])
    if (pos.length() > RING_RADIUS * 1.1) {
      v.multiplyScalar(-0.5)
      txPositions[i * 3] *= 0.9
      txPositions[i * 3 + 2] *= 0.9
    }

    // Confirmed: tx arrives at destination
    if (dist < 2.5) {
      confirmedCount++
      totalFees += (txColors[i * 3] > 0.8 ? 50 : txColors[i * 3 + 2] > 0.6 ? 20 : 5)
      spawnNewTx(i)
    }

    // Fade out old transactions
    const ageFade = Math.max(0, 1 - (txAges[i] - 6) / 3)
    txColors[i * 3] = txColors[i * 3] * ageFade + txColors[i * 3] * (1 - ageFade)
  }
  txGeo.attributes.position.needsUpdate = true
  txGeo.attributes.color.needsUpdate = true

  // Block animation
  blocks.forEach((block, i) => {
    block.rotation.y += delta * 0.3
    block.material.emissive = new THREE.Color(0x112244 * (0.5 + Math.sin(time + i) * 0.5))
  })

  // Hash lines update
  hashLines.forEach((line, i) => {
    const pts = line.geometry.attributes.position.array
    pts[0] = blocks[i].position.x; pts[1] = blocks[i].position.y + 0.5; pts[2] = blocks[i].position.z
    pts[3] = nodes[i % NUM_NODES].position.x; pts[4] = nodes[i % NUM_NODES].position.y; pts[5] = nodes[i % NUM_NODES].position.z
    line.geometry.attributes.position.needsUpdate = true
    line.material.opacity = 0.1 + Math.sin(time * 0.5 + i * 0.5) * 0.08
  })

  // Bloom intensity
  bloom.strength = 0.6 + Math.sin(time * 0.8) * 0.2

  // UI
  feeLabel.innerHTML = `Confirmed: <b>${confirmedCount}</b><br>Total Fees: <b>${totalFees}</b> sat/vB<br>Mempool: <b>${MAX_TX}</b> tx`
  blockLabel.innerHTML = `Block #${blocks[0].userData.height}<br>TXs: ${blocks[0].userData.txCount}<br>Hash: ${Math.random().toString(16).slice(2, 10)}...`
}

let lastTime = performance.now()
function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const delta = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now
  const time = now / 1000
  updateBlockchain(delta, time)
  controls.update()
  composer.render()
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
