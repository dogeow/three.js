// Boolean Logic Circuit - Interactive Signal Propagation
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a14)
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(5, 10, 10)
scene.add(dirLight)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 15, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)

// Gate types
const GATE_TYPES = {
  AND: (a, b) => a && b,
  OR: (a, b) => a || b,
  NOT: (a) => !a,
  NAND: (a, b) => !(a && b),
  NOR: (a, b) => !(a || b),
  XOR: (a, b) => a !== b,
  XNOR: (a, b) => a === b
}

// Gate mesh builder
function createGate(type, x, y, z) {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  const isUnary = type === 'NOT'
  const w = isUnary ? 2 : 3
  const bodyGeo = new THREE.BoxGeometry(w, 1.5, 0.6)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x202040,
    metalness: 0.6,
    roughness: 0.3,
    emissive: 0x050510,
    emissiveIntensity: 1
  })
  const body = new THREE.Mesh(bodyGeo, mat)
  body.userData.gate = true
  group.add(body)

  // Wireframe
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(bodyGeo),
    new THREE.LineBasicMaterial({ color: 0x4080ff })
  )
  group.add(edges)

  // Input pins (left)
  const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8)
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 })
  const pin1 = new THREE.Mesh(pinGeo, pinMat.clone())
  pin1.rotation.z = Math.PI / 2
  pin1.position.set(-w/2 - 0.4, isUnary ? 0 : 0.4, 0)
  group.add(pin1)
  group.userData.pin1 = pin1

  if (!isUnary) {
    const pin2 = new THREE.Mesh(pinGeo, pinMat.clone())
    pin2.rotation.z = Math.PI / 2
    pin2.position.set(-w/2 - 0.4, -0.4, 0)
    group.add(pin2)
    group.userData.pin2 = pin2
  }

  // Output pin (right)
  const outPin = new THREE.Mesh(pinGeo, pinMat.clone())
  outPin.rotation.z = Math.PI / 2
  outPin.position.set(w/2 + 0.4, 0, 0)
  group.add(outPin)
  group.userData.outPin = outPin

  group.userData.type = type
  group.userData.inputs = [false, false]
  group.userData.output = false
  group.userData.propagating = false
  group.userData.propagationTime = 0

  return group
}

// Input switch
function createSwitch(x, y, z) {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  const baseGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16)
  const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.7, roughness: 0.3 }))
  group.add(base)

  const knobGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.5, 16)
  const knob = new THREE.Mesh(knobGeo, new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2040aa, emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.4 }))
  knob.position.y = 0.4
  group.add(knob)
  group.userData.knob = knob
  group.userData.value = false
  group.userData.isInput = true

  // LED indicator
  const ledGeo = new THREE.SphereGeometry(0.15, 8, 6)
  const led = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0x000000, emissiveIntensity: 1 }))
  led.position.set(0, 1.0, 0)
  group.add(led)
  group.userData.led = led

  group.userData.value = false
  group.toggle = () => {
    group.userData.value = !group.userData.value
    const c = group.userData.value ? 0x00ff44 : 0x330000
    const em = group.userData.value ? 0x00ff44 : 0x000000
    group.userData.knob.material.color.setHex(group.userData.value ? 0x00ff88 : 0x4488ff)
    group.userData.knob.material.emissive.setHex(em)
    group.userData.led.material.color.setHex(group.userData.value ? 0x00ff00 : 0x330000)
    group.userData.led.material.emissive.setHex(group.userData.value ? 0x00ff00 : 0x000000)
  }

  group.getOutput = () => group.userData.value
  return group
}

// Output LED
function createOutput(x, y, z) {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  const ledGeo = new THREE.SphereGeometry(0.6, 16, 12)
  const led = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0x000000, emissiveIntensity: 2 }))
  group.add(led)
  group.userData.led = led
  group.userData.value = false
  group.setValue = (v) => {
    group.userData.value = v
    led.material.color.setHex(v ? 0x00ff44 : 0x330000)
    led.material.emissive.setHex(v ? 0x00ff44 : 0x000000)
  }
  group.getInput = () => group.userData.value
  return group
}

// Wire
const wireMat = new THREE.LineBasicMaterial({ color: 0x444466 })
function createWire(points) {
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  return new THREE.Line(geo, wireMat.clone())
}

const wires = []
const PROP_DELAY = 0.05 // seconds per gate

// Build circuit
const S1 = createSwitch(-14, 2, 0)
const S2 = createSwitch(-14, -2, 0)
scene.add(S1, S2)

const AND1 = createGate('AND', -7, 3, 0)
const OR1 = createGate('OR', -7, -3, 0)
const NOT1 = createGate('NOT', 0, 3, 0)
const XOR1 = createGate('XOR', 0, -3, 0)
const NAND1 = createGate('NAND', 7, 0, 0)
scene.add(AND1, OR1, NOT1, XOR1, NAND1)

const OUT1 = createOutput(14, 3, 0)
const OUT2 = createOutput(14, -3, 0)
scene.add(OUT1, OUT2)

// Connect wires
function connectWires() {
  // S1 -> AND1, OR1
  wires.length = 0
  scene.children.filter(c => c instanceof THREE.Line).forEach(w => scene.remove(w))
  const w1 = createWire([new THREE.Vector3(-13.3, 2, 0), new THREE.Vector3(-9.7, 3, 0)])
  const w2 = createWire([new THREE.Vector3(-13.3, 2, 0), new THREE.Vector3(-9.7, -3, 0)])
  // S2 -> AND1, OR1
  const w3 = createWire([new THREE.Vector3(-13.3, -2, 0), new THREE.Vector3(-9.7, 2.6, 0)])
  const w4 = createWire([new THREE.Vector3(-13.3, -2, 0), new THREE.Vector3(-9.7, -2.6, 0)])
  // AND1 -> NOT1
  const w5 = createWire([new THREE.Vector3(-4.7, 3, 0), new THREE.Vector3(-2.3, 3, 0)])
  // OR1 -> XOR1
  const w6 = createWire([new THREE.Vector3(-4.7, -3, 0), new THREE.Vector3(-2.3, -3, 0)])
  // NOT1 -> NAND1
  const w7 = createWire([new THREE.Vector3(2.3, 3, 0), new THREE.Vector3(5.7, 0.3, 0)])
  // XOR1 -> NAND1
  const w8 = createWire([new THREE.Vector3(2.3, -3, 0), new THREE.Vector3(5.7, -0.3, 0)])
  // NAND1 -> OUT1
  const w9 = createWire([new THREE.Vector3(10.7, 0, 0), new THREE.Vector3(13.0, 3, 0)])
  // NAND1 -> OUT2
  const w10 = createWire([new THREE.Vector3(10.7, 0, 0), new THREE.Vector3(13.0, -3, 0)])
  // also send NAND to OUT2
  wires.push(w1, w2, w3, w4, w5, w6, w7, w8, w9, w10)
  wires.forEach(w => scene.add(w))
}

connectWires()

// Gate propagation
const gates = [AND1, OR1, NOT1, XOR1, NAND1]
const inputs = [S1, S2]
const outputs = [OUT1, OUT2]

function propagate() {
  // Gather input values
  const a = S1.userData.value
  const b = S2.userData.value
  AND1.userData.inputs = [a, b]
  OR1.userData.inputs = [a, b]
  NOT1.userData.inputs = [a]
  XOR1.userData.inputs = [a, b]

  const andOut = GATE_TYPES.AND(a, b)
  const orOut = GATE_TYPES.OR(a, b)
  const notOut = GATE_TYPES.NOT(a)
  const xorOut = GATE_TYPES.XOR(a, b)
  const nandOut = GATE_TYPES.NAND(andOut, orOut)

  // Color gates by output
  const gateColor = (g, v) => {
    g.children[0].material.emissive.setHex(v ? 0x00ff44 : 0x200010)
    g.children[0].material.emissiveIntensity = v ? 1.5 : 0.2
    // Pin colors
    if (g.userData.pin1) g.userData.pin1.material.emissive.setHex(g.userData.inputs[0] ? 0x00ff44 : 0x200010)
    if (g.userData.pin2) g.userData.pin2.material.emissive.setHex(g.userData.inputs[1] ? 0x00ff44 : 0x200010)
    if (g.userData.outPin) g.userData.outPin.material.emissive.setHex(v ? 0x00ff44 : 0x200010)
  }
  gateColor(AND1, andOut)
  gateColor(OR1, orOut)
  gateColor(NOT1, notOut)
  gateColor(XOR1, xorOut)
  gateColor(NAND1, nandOut)

  OUT1.setValue(nandOut)
  OUT2.setValue(xorOut)

  // Wire colors
  const wireColor = (wire, active) => wire.material.color.setHex(active ? 0x00ff66 : 0x444466)
  wireColor(wires[0], a)
  wireColor(wires[1], a)
  wireColor(wires[2], b)
  wireColor(wires[3], b)
  wireColor(wires[4], andOut)
  wireColor(wires[5], orOut)
  wireColor(wires[6], notOut)
  wireColor(wires[7], xorOut)
  wireColor(wires[8], nandOut)
  wireColor(wires[9], nandOut)
}

S1.toggle = S1.userData.knob.onPointerDown = () => { S1.toggle(); propagate() }
S2.toggle = S2.userData.knob.onPointerDown = () => { S2.toggle(); propagate() }

// Click on switches
renderer.domElement.addEventListener('click', e => {
  const rect = renderer.domElement.getBoundingClientRect()
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  )
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(ndc, camera)
  const hits = raycaster.intersectObjects([S1.userData.knob, S2.userData.knob])
  if (hits.length > 0) {
    if (hits[0].object === S1.userData.knob) { S1.toggle(); propagate() }
    else if (hits[0].object === S2.userData.knob) { S2.toggle(); propagate() }
  }
})

// Title labels using sprites
function makeLabel(text, x, y, z) {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'white'
  ctx.font = 'bold 28px monospace'
  ctx.fillText(text, 10, 42)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.position.set(x, y, z)
  sprite.scale.set(4, 1, 1)
  return sprite
}

scene.add(makeLabel('INPUT A', -14, 3.5, 0))
scene.add(makeLabel('INPUT B', -14, -0.5, 0))
scene.add(makeLabel('AND', -7, 4.2, 0))
scene.add(makeLabel('OR', -7, -1.8, 0))
scene.add(makeLabel('NOT', 0, 4.2, 0))
scene.add(makeLabel('XOR', 0, -1.8, 0))
scene.add(makeLabel('NAND', 7, 1.2, 0))
scene.add(makeLabel('OUTPUT', 14, 4.2, 0))
scene.add(makeLabel('OUTPUT2', 14, -1.8, 0))

// GUI
const gui = new GUI()
const info = { truthTable: 'A B | NAND XOR\n0 0 |  1   0\n0 1 |  1   1\n1 0 |  1   1\n1 1 |  0   0' }
gui.add({ reset: () => { S1.userData.value = false; S2.userData.value = false; S1.toggle(); S2.toggle(); propagate() }}, 'reset').name('复位')
gui.add({ info: info.truthTable }, 'info').name('真值表 (NAND/A⊕B)')

// Initial
S1.toggle(); S2.toggle(); // set false
S1.toggle(); S2.toggle();
propagate()

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
