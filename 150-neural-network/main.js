import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050a14)
scene.fog = new THREE.FogExp2(0x050a14, 0.015)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 0, 22)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
dirLight.position.set(5, 10, 10)
scene.add(dirLight)

// ─── Network Definition ────────────────────────────────────────────────────────
const ARCHITECTURE = [8, 12, 8, 4] // input, hidden1, hidden2, output
const LAYER_SPACING = 5
const NODE_SPACING = 2.0

// Generate initial random weights
function randomWeights(arch) {
  const weights = []
  for (let l = 0; l < arch.length - 1; l++) {
    const layer = []
    for (let i = 0; i < arch[l]; i++) {
      const neuron = []
      for (let j = 0; j < arch[l+1]; j++) {
        neuron.push((Math.random() - 0.5) * 2)
      }
      layer.push(neuron)
    }
    weights.push(layer)
  }
  return weights
}

let weights = randomWeights(ARCHITECTURE)
let activations = ARCHITECTURE.map(n => new Array(n).fill(0))
let animQueue = []
let animTime = 0

// ─── Node Meshes ──────────────────────────────────────────────────────────────
const nodeGroup = new THREE.Group()
scene.add(nodeGroup)

const layerGroups = []
const nodeMeshes = []

ARCHITECTURE.forEach((count, layerIdx) => {
  const lg = new THREE.Group()
  const layerNodes = []

  const yOffset = (count - 1) * NODE_SPACING / 2

  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.35, 16, 16)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.1,
      roughness: 0.3,
      metalness: 0.5,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(
      layerIdx * LAYER_SPACING - (ARCHITECTURE.length - 1) * LAYER_SPACING / 2,
      i * NODE_SPACING - yOffset,
      0
    )
    mesh.userData = { layer: layerIdx, index: i, activation: 0 }
    mesh.castShadow = true
    lg.add(mesh)
    layerNodes.push(mesh)
    nodeMeshes.push(mesh)
  }

  nodeGroup.add(lg)
  layerGroups.push(lg)
})

// ─── Edge Meshes ───────────────────────────────────────────────────────────────
const edgeGroup = new THREE.Group()
scene.add(edgeGroup)

const edgeMeshes = [] // {mesh, fromLayer, fromIdx, toLayer, toIdx, weight}

ARCHITECTURE.forEach((count, layerIdx) => {
  if (layerIdx >= ARCHITECTURE.length - 1) return
  const nextCount = ARCHITECTURE[layerIdx + 1]
  const yOffset = (count - 1) * NODE_SPACING / 2
  const nextYOffset = (nextCount - 1) * NODE_SPACING / 2

  for (let i = 0; i < count; i++) {
    for (let j = 0; j < nextCount; j++) {
      const p1 = new THREE.Vector3(
        layerIdx * LAYER_SPACING - (ARCHITECTURE.length - 1) * LAYER_SPACING / 2,
        i * NODE_SPACING - yOffset,
        0
      )
      const p2 = new THREE.Vector3(
        (layerIdx + 1) * LAYER_SPACING - (ARCHITECTURE.length - 1) * LAYER_SPACING / 2,
        j * NODE_SPACING - nextYOffset,
        0
      )

      const w = weights[layerIdx][i][j]
      const thickness = Math.min(Math.abs(w) * 0.06, 0.12)
      const color = w > 0
        ? new THREE.Color().setHSL(0.7 + w * 0.15, 0.8, 0.4 + w * 0.2)
        : new THREE.Color().setHSL(0.0 + Math.abs(w) * 0.1, 0.8, 0.3 + Math.abs(w) * 0.2)

      const geo = new THREE.CylinderGeometry(thickness, thickness, p1.distanceTo(p2), 4, 1)
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 + Math.abs(w) * 0.2 })
      const mesh = new THREE.Mesh(geo, mat)

      // Position at midpoint
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
      mesh.position.copy(mid)

      // Orient along direction
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize()
      const up = new THREE.Vector3(0, 1, 0)
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
      mesh.quaternion.copy(quat)

      mesh.userData = { fromLayer: layerIdx, fromIdx: i, toLayer: layerIdx + 1, toIdx: j, weight: w }
      edgeGroup.add(mesh)
      edgeMeshes.push(mesh)
    }
  }
})

// ─── Activation Packets ─────────────────────────────────────────────────────────
const packets = []
const packetGeo = new THREE.SphereGeometry(0.15, 8, 8)
const packetColors = [0x60a5fa, 0x34d399, 0xf472b6, 0xfbbf24, 0xa78bfa, 0x38bdf8, 0xf87171, 0x2dd4bf]

function spawnPacket(fromLayer, fromIdx, toLayer, toIdx) {
  const p1 = nodeMeshes
    .filter(n => n.userData.layer === fromLayer && n.userData.index === fromIdx)[0]
  const p2 = nodeMeshes
    .filter(n => n.userData.layer === toLayer && n.userData.index === toIdx)[0]
  if (!p1 || !p2) return

  const mesh = new THREE.Mesh(
    packetGeo,
    new THREE.MeshBasicMaterial({
      color: packetColors[fromLayer % packetColors.length],
      transparent: true, opacity: 0.9,
    })
  )
  mesh.position.copy(p1.position)
  mesh.scale.setScalar(0.5 + Math.abs(weights[fromLayer][fromIdx][toIdx]) * 0.3)
  scene.add(mesh)

  packets.push({
    mesh,
    from: p1.position.clone(),
    to: p2.position.clone(),
    progress: 0,
    speed: 1.5 + Math.random() * 0.5,
  })
}

// ─── Forward Pass ───────────────────────────────────────────────────────────────
function relu(x) { return Math.max(0, x) }
function sigmoid(x) { return 1 / (1 + Math.exp(-x)) }

function forwardPass(inputValues) {
  activations[0] = inputValues.slice()
  for (let l = 0; l < ARCHITECTURE.length - 1; l++) {
    activations[l + 1] = activations[l].map((ai, i) => {
      const sum = activations[l].reduce((s, aj, j) => s + aj * weights[l][j][i], 0)
      return relu(sum)
    })
  }
}

function propagate() {
  animQueue = []
  const topLayer = ARCHITECTURE.length - 1

  // Highlight input activations
  activations[0].forEach((a, i) => {
    if (a > 0.1) {
      nodeMeshes.filter(n => n.userData.layer === 0 && n.userData.index === i).forEach(n => {
        n.material.emissiveIntensity = 0.5 + a * 0.5
      })
    }
  })

  // Queue packets for each layer transition
  for (let l = 0; l < topLayer; l++) {
    for (let i = 0; i < ARCHITECTURE[l]; i++) {
      for (let j = 0; j < ARCHITECTURE[l+1]; j++) {
        if (Math.abs(weights[l][i][j]) > 0.05) {
          animQueue.push({ layer: l, from: i, to: j, delay: l * 0.6 })
        }
      }
    }
  }

  animTime = 0
}

// Initial random propagation
forwardPass(ARCHITECTURE[0].map(() => Math.random()))
propagate()

// ─── Controls ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 5
controls.maxDistance = 40

// Click to activate input nodes
const raycaster = new THREE.Raycaster()
renderer.domElement.addEventListener('click', e => {
  const ndc = new THREE.Vector2(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1
  )
  raycaster.setFromCamera(ndc, camera)
  const hits = raycaster.intersectObjects(nodeMeshes)
  if (hits.length > 0) {
    const node = hits[0].object
    if (node.userData.layer === 0) {
      // Toggle this input
      const idx = node.userData.index
      activations[0][idx] = activations[0][idx] > 0.1 ? 0 : 0.5 + Math.random() * 0.5
      forwardPass(activations[0])
      propagate()
    }
  }
})

document.getElementById('forwardBtn').addEventListener('click', () => {
  forwardPass(ARCHITECTURE[0].map(() => Math.random()))
  propagate()
})
document.getElementById('randomizeBtn').addEventListener('click', () => {
  weights = randomWeights(ARCHITECTURE)
  updateEdgeVisuals()
  forwardPass(activations[0])
})
document.getElementById('resetBtn').addEventListener('click', () => {
  activations = ARCHITECTURE.map(n => new Array(n).fill(0))
  nodeMeshes.forEach(n => { n.material.emissiveIntensity = 0.1 })
  packets.forEach(p => scene.remove(p.mesh))
  packets.length = 0
})
window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') {
    weights = randomWeights(ARCHITECTURE)
    updateEdgeVisuals()
  }
})

function updateEdgeVisuals() {
  edgeMeshes.forEach(em => {
    const { fromLayer, fromIdx, toIdx } = em.userData
    const w = weights[fromLayer][fromIdx][toIdx]
    em.userData.weight = w
    const thickness = Math.min(Math.abs(w) * 0.06, 0.12)
    em.scale.set(1, 1, 1)
    em.geometry.dispose()
    // Can't resize cylinder easily, just update material color/opacity
    em.material.opacity = 0.2 + Math.abs(w) * 0.3
    em.material.color.set(w > 0
      ? new THREE.Color().setHSL(0.75, 0.9, 0.3 + Math.abs(w) * 0.3)
      : new THREE.Color().setHSL(0.0, 0.9, 0.25 + Math.abs(w) * 0.3)
    )
  })
}

// ─── Animate ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const elapsed = clock.elapsedTime

  // Animate packets
  animTime += delta
  animQueue.forEach(item => {
    const startTime = item.delay
    const t = (animTime - startTime) / item.speed
    if (t >= 0 && t <= 1 && !item.spawned) {
      item.spawned = true
      spawnPacket(item.layer, item.from, item.to, item.toLayer)
    }
  })

  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i]
    p.progress += delta * 1.2
    if (p.progress >= 1) {
      scene.remove(p.mesh)
      p.mesh.geometry.dispose()
      packets.splice(i, 1)
      // Flash target node
      const targetNode = nodeMeshes.filter(
        n => n.userData.layer === p.to.z && n.userData.index === n.userData.index
      )[0]
      continue
    }
    const t = p.progress
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    p.mesh.position.lerpVectors(p.from, p.to, ease)
    p.mesh.material.opacity = 0.9 * (1 - t)
    p.mesh.scale.setScalar((1 - t) * 0.8 + 0.2)
  }

  // Update node colors based on activation
  nodeMeshes.forEach((n, idx) => {
    const layer = n.userData.layer
    const index = n.userData.index
    const activation = activations[layer] ? activations[layer][index] : 0
    n.material.emissiveIntensity = 0.1 + activation * 0.5
    n.scale.setScalar(1 + activation * 0.3)

    // Pulse active nodes
    if (activation > 0.1) {
      const pulse = 1 + Math.sin(elapsed * 3 + idx) * 0.1 * activation
      n.scale.setScalar(pulse * (1 + activation * 0.3))
    }
  })

  // Subtle camera bob
  camera.position.z = 22 + Math.sin(elapsed * 0.3) * 0.5

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera
window.renderer = renderer
window.controls = controls
window.nodeMeshes = nodeMeshes
window.weights = weights

animate()