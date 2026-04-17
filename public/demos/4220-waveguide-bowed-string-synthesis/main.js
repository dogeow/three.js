// 4220. Waveguide Bowed String Synthesis
// Physical modeling of violin/viola using Karplus-Strong + delay line waveguide synthesis
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d0d1a)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 8, 16)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Lights
scene.add(new THREE.AmbientLight(0xffeedd, 0.4))
const sun = new THREE.DirectionalLight(0xffffff, 1)
sun.position.set(5, 10, 5)
sun.castShadow = true
scene.add(sun)

// ==== STRING GEOMETRY (visual) ====
const stringGroup = new THREE.Group()
scene.add(stringGroup)

// String body - cylinder
const stringBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.3, 12, 32),
  new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.8, roughness: 0.2 })
)
stringBody.rotation.z = Math.PI / 2
stringBody.castShadow = true
scene.add(stringBody)

// Bridge
const bridge = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 0.3, 0.2),
  new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 })
)
bridge.position.set(2, 0.3, 0)
scene.add(bridge)

// Bow visual
const bowGroup = new THREE.Group()
const bowStick = new THREE.Mesh(
  new THREE.CylinderGeometry(0.05, 0.05, 14, 8),
  new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 })
)
bowStick.rotation.z = Math.PI / 2
bowGroup.add(bowStick)
// Bow hair (thin white lines)
for (let i = -1; i <= 1; i++) {
  const hair = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 13.8, 4),
    new THREE.MeshStandardMaterial({ color: 0xffffcc, roughness: 1 })
  )
  hair.rotation.z = Math.PI / 2
  hair.position.y = i * 0.08
  bowGroup.add(hair)
}
bowGroup.position.set(0, 1.2, 0)
scene.add(bowGroup)

// Vibration visualization points along string
const vibPoints = []
const vibMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa })
for (let i = 0; i < 30; i++) {
  const pt = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), vibMat.clone())
  pt.visible = false
  scene.add(pt)
  vibPoints.push(pt)
}

// Bridge vibration
const bridgeViz = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 0.3, 0.2),
  new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x331100, roughness: 0.8, transparent: true, opacity: 0.8 })
)
bridgeViz.position.set(2, 0.3, 0)
scene.add(bridgeViz)

// ==== WEB AUDIO: WAVEGUIDE STRING SYNTHESIS ====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)()

const params = {
  frequency: 220,    // A3
  bowPressure: 0.5,
  bowSpeed: 0.3,
  brightness: 0.5,
  attack: 0.05,
  decay: 0.3,
  sustain: 0.7,
  release: 0.5,
  volume: 0.4,
  bowing: false
}

// Waveguide synthesis: delay line with feedback
const SAMPLE_RATE = audioCtx.sampleRate
const BASE_FREQ = 220
const DELAY_TIME = 1 / BASE_FREQ
const DELAY_SAMPLES = Math.round(SAMPLE_RATE / BASE_FREQ)

let delayBuffer = new Float32Array(DELAY_SAMPLES)
let writeIdx = 0
let filterState = 0
let isBowing = false
let bowPos = 0
let bowDir = 1

// Create nodes
const masterGain = audioCtx.createGain()
masterGain.gain.value = 0
masterGain.connect(audioCtx.destination)

const vibratoOsc = audioCtx.createOscillator()
vibratoOsc.frequency.value = 5
const vibratoGain = audioCtx.createGain()
vibratoGain.gain.value = 3
vibratoOsc.connect(vibratoGain)
vibratoOsc.start()

const filter = audioCtx.createBiquadFilter()
filter.type = 'lowpass'
filter.frequency.value = 3000
filter.Q.value = 1
filter.connect(masterGain)

const vibratoFilter = audioCtx.createBiquadFilter()
vibratoFilter.type = 'lowpass'
vibratoFilter.frequency.value = 200
vibratoFilter.connect(filter)

const compressor = audioCtx.createDynamicsCompressor()
compressor.threshold.value = -20
compressor.knee.value = 10
compressor.ratio.value = 4
compressor.connect(vibratoFilter)

// Periodic impulse excitation (bowed string model)
function processSample() {
  const feedback = 0.996 - params.brightness * 0.01

  if (isBowing) {
    // Bow creates periodic impulses
    bowPos += params.bowSpeed * 0.01
    if (bowPos > 1) { bowPos = 0; }

    // Velocity of bow at current position
    const velocity = Math.sin(bowPos * Math.PI * 40) * params.bowSpeed
    // Excitation at bow position (simplified)
    const excitation = velocity * params.bowPressure * 0.3

    // Add to delay buffer
    const readIdx = (writeIdx + 1) % DELAY_SAMPLES
    let out = delayBuffer[readIdx]

    // String filter (simplified dispersion)
    filterState = filterState * 0.99 + out * 0.01
    out = out * feedback + filterState * 0.005

    // Bridge coupling
    out += excitation * (1 - Math.abs(bowPos - 0.5) * 2) * 0.5

    delayBuffer[writeIdx] = out
    writeIdx = (writeIdx + 1) % DELAY_SAMPLES

    return out
  } else {
    // Decay
    const readIdx = (writeIdx + 1) % DELAY_SAMPLES
    let out = delayBuffer[readIdx] * 0.9995
    delayBuffer[writeIdx] = out
    writeIdx = (writeIdx + 1) % DELAY_SAMPLES
    return out
  }
}

// Script processor approach (deprecated but simple)
let scriptNode = null
function startAudio() {
  if (scriptNode) return
  scriptNode = audioCtx.createScriptProcessor(4096, 1, 1)
  scriptNode.onaudioprocess = e => {
    const out = e.outputBuffer.getChannelData(0)
    for (let i = 0; i < out.length; i++) {
      out[i] = processSample() * 0.5
    }
  }
  scriptNode.connect(compressor)
}

function stopAudio() {
  if (!scriptNode) return
  scriptNode.disconnect()
  scriptNode = null
}

// ADSR envelope
let envState = 'idle'
let envValue = 0
let envTimer = 0

function startEnvelope() {
  envState = 'attack'
  envTimer = 0
  isBowing = true
  masterGain.gain.cancelScheduledValues(audioCtx.currentTime)
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime)
  masterGain.gain.linearRampToValueAtTime(params.volume, audioCtx.currentTime + params.attack)
  masterGain.gain.linearRampToValueAtTime(params.volume * params.sustain, audioCtx.currentTime + params.attack + params.decay)
  filter.frequency.setValueAtTime(3000 + params.brightness * 4000, audioCtx.currentTime)
}

function stopEnvelope() {
  isBowing = false
  masterGain.gain.cancelScheduledValues(audioCtx.currentTime)
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime)
  masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + params.release)
}

// GUI
const gui = new GUI({ title: '🎻 Bowed String' })
gui.add(params, 'frequency', 65, 880).name('Frequency (Hz)').onChange(v => {
  // Recompute delay based on frequency
  const newDelay = Math.round(SAMPLE_RATE / v)
  const newBuf = new Float32Array(newDelay)
  const oldCount = Math.min(delayBuffer.length, newBuf.length)
  for (let i = 0; i < oldCount; i++) {
    newBuf[i] = delayBuffer[(writeIdx + i) % delayBuffer.length]
  }
  delayBuffer = newBuf
  writeIdx = 0
})
gui.add(params, 'bowPressure', 0, 1).name('Bow Pressure')
gui.add(params, 'bowSpeed', 0.05, 1).name('Bow Speed')
gui.add(params, 'brightness', 0, 1).name('Brightness')
gui.add(params, 'volume', 0, 1).name('Volume')

// Instructions overlay
const info = document.createElement('div')
info.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#fff;font-family:monospace;font-size:14px;background:rgba(0,0,0,0.7);padding:12px 24px;border-radius:8px;text-align:center;pointer-events:none'
info.innerHTML = '🎻 Click and hold to bow | Release to stop | Drag to rotate camera'
document.body.appendChild(info)

// Input
window.addEventListener('mousedown', () => { audioCtx.resume(); startAudio(); startEnvelope(); gui.controllers.forEach(c => c.updateDisplay()) })
window.addEventListener('mouseup', () => { stopEnvelope() })
window.addEventListener('touchstart', e => { e.preventDefault(); audioCtx.resume(); startAudio(); startEnvelope() }, { passive: false })
window.addEventListener('touchend', () => { stopEnvelope() })

// String vibration visualization
function updateStringViz() {
  const halfLen = 6
  for (let i = 0; i < vibPoints.length; i++) {
    const t = i / (vibPoints.length - 1)
    const x = (t - 0.5) * 12
    const amplitude = 0.1 * Math.abs(Math.sin(Math.PI * t * 3)) * envValue
    const phase = audioCtx.currentTime * BASE_FREQ * Math.PI * 2 * 2
    const y = Math.sin(t * Math.PI * 3 + phase) * amplitude + 0.3
    vibPoints[i].position.set(x, y, 0)
    vibPoints[i].visible = isBowing || envValue > 0.01
    vibPoints[i].material.color.setHSL(0.4 + t * 0.3, 1, 0.5 + envValue * 0.5)
  }
  // Bridge vibration
  const bridgeAmp = 0.05 * envValue
  bridgeViz.scale.y = 1 + Math.sin(audioCtx.currentTime * BASE_FREQ * Math.PI * 4) * bridgeAmp
  bridgeViz.material.emissive.setScalar(envValue * 0.5)
}

// Animate bow
let bowTime = 0
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  bowTime += dt
  clock.getElapsedTime()

  // Move bow back and forth
  if (isBowing) {
    bowGroup.position.x = Math.sin(bowTime * params.bowSpeed * 3) * 4
    bowGroup.position.y = 0.8 + Math.sin(bowTime * 2) * 0.1
  }

  updateStringViz()
  controls.update()
  renderer.render(scene, camera)
}

const clock = new THREE.Clock()
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
