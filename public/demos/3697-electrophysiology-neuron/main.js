/**
 * 3697. Electrophysiology Neuron
 * Hodgkin-Huxley model with Na/K/Ca ion channels
 * Visualizes action potential propagation along a myelinated axon
 * 
 * Science: Neurons fire action potentials when membrane voltage exceeds threshold (~-55mV).
 * Na+ channels open first (depolarization), then K+ channels open (repolarization).
 * Calcium channels sustain the plateau in some neuron types.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x030308)
scene.fog = new THREE.FogExp2(0x030308, 0.012)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 600)
camera.position.set(0, 15, 45)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.4, 0.7)
composer.addPass(bloom)

// ─── Neuron morphology ───────────────────────────────────────────────────────
// Soma (cell body)
const somaGeo = new THREE.SphereGeometry(1.5, 32, 32)
const somaMat = new THREE.MeshStandardMaterial({
  color: 0x334466,
  emissive: 0x112233,
  roughness: 0.3,
  metalness: 0.7,
  transparent: true,
  opacity: 0.9
})
const soma = new THREE.Mesh(somaGeo, somaMat)
soma.position.set(0, 0, 0)
scene.add(soma)

// Axon segments (myelinated, with nodes of Ranvier)
const NUM_SEGMENTS = 24
const SEGMENT_LENGTH = 3.0
const nodes = [] // Node of Ranvier positions
const axonMeshes = []
const nodeMeshes = []
const myelinMeshes = []

// Axon hillock (tapering from soma)
const hillockGeo = new THREE.CylinderGeometry(0.8, 0.4, 2.5, 16)
const hillockMat = new THREE.MeshStandardMaterial({ color: 0x445577, roughness: 0.3, metalness: 0.5 })
const hillock = new THREE.Mesh(hillockGeo, hillockMat)
hillock.rotation.z = Math.PI / 2
hillock.position.set(2.5, 0, 0)
scene.add(hillock)

// Create axon segments
for (let i = 0; i < NUM_SEGMENTS; i++) {
  const x = 4.0 + i * SEGMENT_LENGTH
  const isNode = (i % 4 === 3) // Node of Ranvier every 4 segments
  
  if (isNode) {
    nodes.push(i)
    // Node of Ranvier — small gap in myelin
    const nodeGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.6, 12)
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xff4488,
      emissive: 0xff2266,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8
    })
    const node = new THREE.Mesh(nodeGeo, nodeMat)
    node.rotation.z = Math.PI / 2
    node.position.set(x + SEGMENT_LENGTH / 2, 0, 0)
    scene.add(node)
    nodeMeshes.push(node)
  } else {
    // Myelinated segment
    const myelinGeo = new THREE.CylinderGeometry(0.55, 0.55, SEGMENT_LENGTH * 0.9, 12)
    const myelinMat = new THREE.MeshStandardMaterial({
      color: 0x6688bb,
      emissive: 0x334466,
      emissiveIntensity: 0.2,
      roughness: 0.4,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7
    })
    const myelin = new THREE.Mesh(myelinGeo, myelinMat)
    myelin.rotation.z = Math.PI / 2
    myelin.position.set(x + SEGMENT_LENGTH / 2, 0, 0)
    scene.add(myelin)
    myelinMeshes.push(myelin)
    
    // Inner axon fiber (visible through myelin gaps)
    const innerGeo = new THREE.CylinderGeometry(0.15, 0.15, SEGMENT_LENGTH * 0.9, 8)
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xffaa44,
      emissive: 0xff8800,
      emissiveIntensity: 0.3,
      roughness: 0.5
    })
    const inner = new THREE.Mesh(innerGeo, innerMat)
    inner.rotation.z = Math.PI / 2
    inner.position.set(x + SEGMENT_LENGTH / 2, 0, 0)
    scene.add(inner)
    axonMeshes.push(inner)
  }
}

// Dendrites (3 branches)
const dendriteData = []
for (let d = 0; d < 3; d++) {
  const angle = (d / 3) * Math.PI * 2 + Math.PI * 0.3
  const dend = []
  const numBranches = 5
  for (let b = 0; b < numBranches; b++) {
    const len = 2.5 - b * 0.3
    const geo = new THREE.CylinderGeometry(0.12 - b * 0.015, 0.15 - b * 0.015, len, 8)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x44aacc,
      emissive: 0x223344,
      emissiveIntensity: 0.2,
      roughness: 0.4
    })
    const mesh = new THREE.Mesh(geo, mat)
    const bx = Math.cos(angle) * (1.5 + b * len * 0.7)
    const by = Math.sin(angle) * (1.5 + b * len * 0.7) * 0.6
    mesh.position.set(bx, by, 0)
    mesh.rotation.z = Math.PI / 2 + angle + (b % 2 === 0 ? 0.2 : -0.2)
    scene.add(mesh)
    dend.push({ mesh, bx, by, b, len })
  }
  dendriteData.push({ angle, branches: dend })
}

// ─── Hodgkin-Huxley simulation ────────────────────────────────────────────────
// State variables
let V = -65.0        // Membrane potential (mV)
let m = 0.05         // Na activation gate
let h = 0.6          // Na inactivation gate  
let n = 0.32         // K activation gate
let Ca = 0.01        // Internal Ca concentration (mM)

// Gating variable steady states (voltage-dependent)
function alphaM(v) { return 0.1 * (v + 40) / (1 - Math.exp(-(v + 40) / 10)) }
function betaM(v)  { return 4.0 * Math.exp(-(v + 65) / 18) }
function alphaH(v) { return 0.07 * Math.exp(-(v + 65) / 20) }
function betaH(v)  { return 1.0 / (1 + Math.exp(-(v + 35) / 10)) }
function alphaN(v) { return 0.01 * (v + 55) / (1 - Math.exp(-(v + 55) / 10)) }
function betaN(v)  { return 0.125 * Math.exp(-(v + 65) / 80) }

// Maximum conductances (mS/cm²)
const gNa = 120.0, gK = 36.0, gCa = 4.0, gL = 0.3
// Reversal potentials (mV)
const ENa = 50.0, EK = -77.0, ECa = 120.0, EL = -54.387

// Stimulation
let I_inject = 0.0    // External current (μA/cm²)
let I_osc = 0.0       // Oscillatory drive
let apCount = 0
let lastAP = -1.0
let refractoryTimer = 0

// Action potential propagation along axon
const axonVP = new Float32Array(NUM_SEGMENTS).fill(-65.0) // local potentials
const SIGNAL_SPEED = 20.0 // segments per second

// ─── UI ──────────────────────────────────────────────────────────────────────
const barV = document.getElementById('bar-v')
const barNa = document.getElementById('bar-na')
const barK = document.getElementById('bar-k')
const barCa = document.getElementById('bar-ca')
const timeEl = document.getElementById('time')
const apCountEl = document.getElementById('ap-count')

// ─── Input ───────────────────────────────────────────────────────────────────
let mouseDown = false
window.addEventListener('mousedown', () => { mouseDown = true; I_inject = 15.0 })
window.addEventListener('mouseup', () => { mouseDown = false; I_inject = 0 })
window.addEventListener('touchstart', (e) => { e.preventDefault(); I_inject = 15.0 })
window.addEventListener('touchend', () => { I_inject = 0 })

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    I_inject = 20.0
    setTimeout(() => { I_inject = 0 }, 100)
  }
  if (e.key === 'r' || e.key === 'R') {
    V = -65; m = 0.05; h = 0.6; n = 0.32; Ca = 0.01
    apCount = 0; axonVP.fill(-65.0)
  }
})

// Click on soma to inject current
const raycaster = new THREE.Raycaster()
window.addEventListener('click', (e) => {
  raycaster.setFromCamera({ x: (e.clientX / innerWidth) * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 }, camera)
  const hits = raycaster.intersectObject(soma)
  if (hits.length > 0) {
    I_inject = 15.0
    setTimeout(() => { I_inject = 0 }, 200)
  }
})

// ─── Simulation step ──────────────────────────────────────────────────────────
let simTime = 0
const DT = 0.025 // ms

function stepHH() {
  const v = V
  
  // Gating dynamics
  const am = alphaM(v), bm = betaM(v)
  const ah = alphaH(v), bh = betaH(v)
  const an = alphaN(v), bn = betaN(v)
  
  const dm = am * (1 - m) - bm * m
  const dh = ah * (1 - h) - bh * h
  const dn = an * (1 - n) - bn * n
  
  m += dm * DT
  h += dh * DT
  n += dn * DT
  
  // Ionic currents
  const INa = gNa * m * m * m * h * (v - ENa)
  const IK  = gK  * n * n * n * n * (v - EK)
  const ICa = gCa * Ca * (v - ECa)
  const IL  = gL  * (v - EL)
  
  // Oscillatory synaptic drive
  I_osc = 3.0 * Math.sin(simTime * 0.01) // slow oscillation
  
  // Total current
  const Itotal = I_inject + I_osc - INa - IK - ICa - IL
  
  // Capacitive current → voltage change
  const C = 1.0 // membrane capacitance (μF/cm²)
  V += (Itotal / C) * DT
  
  // Calcium influx during AP (simplified)
  if (V > -30 && axonVP[0] < -30) {
    Ca += 0.2
  }
  Ca = Math.max(0.01, Ca - 0.005 * DT) // slow extrusion
  
  // AP detection
  if (V > -30 && lastAP < -30) {
    apCount++
    lastAP = V
  }
  if (V < -30) lastAP = V
  
  // Propagate signal down axon
  for (let i = NUM_SEGMENTS - 1; i > 0; i--) {
    axonVP[i] += (axonVP[i - 1] - axonVP[i]) * DT * SIGNAL_SPEED * 0.5
  }
  axonVP[0] = V * 0.7 + axonVP[0] * 0.3 // soma drives first segment
}

// ─── Visual update ───────────────────────────────────────────────────────────
// Color from voltage
function voltColor(v) {
  if (v > 30)  return new THREE.Color(0xff2244)  // AP peak — bright red
  if (v > 0)   return new THREE.Color(0xff8844)  // depolarization — orange
  if (v > -40) return new THREE.Color(0xffcc44)  // threshold — yellow
  if (v > -55) return new THREE.Color(0x44ff88)  // rest — green
  if (v > -65) return new THREE.Color(0x44ddff)  // slightly depolarized
  return new THREE.Color(0x2244ff)                 // hyperpolarized — blue
}

function updateVisuals() {
  // Soma color
  const sc = voltColor(V)
  somaMat.color.lerp(sc, 0.15)
  somaMat.emissive.lerp(sc.clone().multiplyScalar(0.3), 0.15)
  somaMat.emissiveIntensity = V > -30 ? 0.8 : 0.2
  
  // Hillock
  const hc = voltColor(V * 0.9)
  hillockMat.color.lerp(hc, 0.15)
  hillockMat.emissive.lerp(hc.clone().multiplyScalar(0.2), 0.1)
  
  // Axon segments
  let nodeIdx = 0
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const vp = axonVP[i]
    const col = voltColor(vp)
    
    if (nodeMeshes[i] !== undefined) {
      nodeMeshes[nodeIdx].material.color.lerp(col, 0.2)
      nodeMeshes[nodeIdx].material.emissive.lerp(col.clone().multiplyScalar(0.5), 0.2)
      nodeMeshes[nodeIdx].material.emissiveIntensity = Math.max(0, (vp + 30) / 60)
      nodeIdx++
    }
    
    if (axonMeshes[i]) {
      axonMeshes[i].material.color.lerp(col, 0.15)
      axonMeshes[i].material.emissive.lerp(col.clone().multiplyScalar(0.4), 0.15)
      axonMeshes[i].material.emissiveIntensity = Math.max(0, (vp + 50) / 80)
    }
  }
  
  // Dendrites (respond to V with delay)
  for (const dend of dendriteData) {
    for (const b of dend.branches) {
      const vDend = V + Math.sin(simTime * 0.002 + b.b * 0.5) * 3
      const col = voltColor(vDend)
      b.mesh.material.color.lerp(col, 0.08)
      b.mesh.material.emissive.lerp(col.clone().multiplyScalar(0.2), 0.08)
    }
  }
  
  // UI bars
  const vNorm = Math.max(0, Math.min(1, (V + 80) / 110))
  const naNorm = Math.min(1, m * m * m * h)
  const kNorm = Math.min(1, n * n * n * n)
  const caNorm = Math.min(1, Ca)
  
  barV.style.width = (vNorm * 100).toFixed(1) + '%'
  barNa.style.width = (naNorm * 100).toFixed(1) + '%'
  barK.style.width = (kNorm * 100).toFixed(1) + '%'
  barCa.style.width = (caNorm * 100).toFixed(1) + '%'
  
  barV.style.background = `rgb(${Math.floor(vNorm * 200)}, ${Math.floor((1 - vNorm) * 150)}, ${Math.floor((1 - vNorm) * 255)})`
  barNa.style.background = `rgb(255, ${Math.floor((1 - naNorm) * 100)}, ${Math.floor((1 - naNorm) * 68)})`
  barK.style.background = `rgb(${Math.floor((1 - kNorm) * 68)}, 255, ${Math.floor((1 - kNorm) * 170)})`
  barCa.style.background = `rgb(255, ${Math.floor((1 - caNorm) * 200)}, ${Math.floor((1 - caNorm) * 68)})`
  
  timeEl.textContent = simTime.toFixed(2)
  apCountEl.textContent = apCount
}

// ─── Animate ─────────────────────────────────────────────────────────────────
function animate(time) {
  requestAnimationFrame(animate)
  
  // Run multiple simulation steps per frame for real-time speed
  const stepsPerFrame = 4
  for (let s = 0; s < stepsPerFrame; s++) {
    stepHH()
    simTime += DT
  }
  
  updateVisuals()
  
  // Scene rotation for 3D view
  scene.rotation.y += 0.0005
  
  controls.update()
  composer.render()
}
animate(0)

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

console.log('3697 Electrophysiology Neuron — Hodgkin-Huxley: Na/K/Ca channels, AP propagation')
