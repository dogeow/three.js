// 3240. FM Synthesis Visualizer
// FM合成器可视化 - 调频合成音频的频谱与波形实时3D可视化
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x05050f)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 15, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

const params = {
  carrierFreq: 220,
  modFreq: 220,
  modIndex: 3.0,
  harmonics: 8,
  waveform: 'sine',
  amplitude: 0.3,
  attack: 0.05,
  decay: 0.2,
  spectrumHeight: 10,
  showSpectrum: true,
  showWaveform: true,
  showOperators: true,
  autoPlay: true
}

// Web Audio setup
let audioCtx, analyser, timeDomainData, frequencyData
let isAudioInit = false

function initAudio() {
  if (isAudioInit) return
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 2048
  timeDomainData = new Float32Array(analyser.fftSize)
  frequencyData = new Uint8Array(analyser.frequencyBinCount)
  
  // FM synthesis
  const carrier = audioCtx.createOscillator()
  const modulator = audioCtx.createOscillator()
  const modGain = audioCtx.createGain()
  const masterGain = audioCtx.createGain()
  
  carrier.type = 'sine'
  carrier.frequency.value = params.carrierFreq
  modulator.type = 'sine'
  modulator.frequency.value = params.modFreq
  modGain.gain.value = params.modIndex * params.modFreq
  masterGain.gain.value = params.amplitude
  
  modulator.connect(modGain)
  modGain.connect(carrier.frequency)
  carrier.connect(masterGain)
  masterGain.connect(analyser)
  analyser.connect(audioCtx.destination)
  
  carrier.start()
  modulator.start()
  
  // Expose for GUI updates
  window.fmCarrier = carrier
  window.fmModulator = modulator
  window.fmModGain = modGain
  window.fmMasterGain = masterGain
  
  isAudioInit = true
}

// Spectrum bars
const BAR_COUNT = 64
const barGroup = new THREE.Group()
scene.add(barGroup)

const barGeos = []
const barMats = []
const bars = []

for (let i = 0; i < BAR_COUNT; i++) {
  const geo = new THREE.BoxGeometry(0.4, 0.1, 0.4)
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / BAR_COUNT * 0.3 + 0.5, 0.8, 0.5),
    emissive: new THREE.Color().setHSL(i / BAR_COUNT * 0.3 + 0.5, 1, 0.2),
    emissiveIntensity: 0.5
  })
  const bar = new THREE.Mesh(geo, mat)
  bar.position.x = (i - BAR_COUNT / 2) * 0.6
  bar.position.z = 0
  barGeos.push(geo)
  barMats.push(mat)
  bars.push(bar)
  barGroup.add(bar)
}

barGroup.position.set(0, 0, -10)
barGroup.rotation.x = -0.2

// Waveform curve
const wavePoints = []
const waveCount = 200
const waveGeo = new THREE.BufferGeometry()
const waveMat = new THREE.LineBasicMaterial({ color: 0x00ffaa, linewidth: 2 })
for (let i = 0; i < waveCount; i++) {
  wavePoints.push(new THREE.Vector3((i - waveCount / 2) * 0.3, 0, 0))
}
waveGeo.setFromPoints(wavePoints)
const waveLine = new THREE.Line(waveGeo, waveMat)
waveLine.position.set(0, -8, 5)
scene.add(waveLine)

// Operator circles
const opGroup = new THREE.Group()
scene.add(opGroup)

function createOperator(x, y, color, label) {
  const ringGeo = new THREE.RingGeometry(2, 2.3, 32)
  const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.set(x, y, 0)
  
  const coreGeo = new THREE.CircleGeometry(1.5, 32)
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x111122, emissive: color, emissiveIntensity: 0.3 })
  const core = new THREE.Mesh(coreGeo, coreMat)
  ring.add(core)
  
  opGroup.add(ring)
  return ring
}

const carrierOp = createOperator(0, 3, 0x00ffaa, 'Carrier')
const modOp = createOperator(-8, -3, 0xff4488, 'Modulator')

// Modulation arrow
const arrowDir = new THREE.Vector3(carrierOp.position.x - modOp.position.x, carrierOp.position.y - modOp.position.y, 0).normalize()
const arrowGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-8, -3, 0),
  new THREE.Vector3(0, 3, 0)
])
const arrowMat = new THREE.ArrowHelper(arrowDir, new THREE.Vector3(-8, -3, 0), 12, 0xff4488, 1, 0.5)
scene.add(arrowMat)

// Grid
const grid = new THREE.GridHelper(60, 30, 0x222244, 0x111122)
grid.position.y = -12
scene.add(grid)

// Interaction hint
const hint = document.createElement('div')
hint.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#88aacc;font-family:monospace;font-size:14px;pointer-events:none'
hint.textContent = 'Click anywhere to start audio | Space to trigger note'
document.body.appendChild(hint)

document.addEventListener('click', () => {
  if (!isAudioInit) initAudio()
  if (audioCtx.state === 'suspended') audioCtx.resume()
}, { once: true })

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && isAudioInit) {
    const now = audioCtx.currentTime
    window.fmMasterGain.gain.setValueAtTime(0, now)
    window.fmMasterGain.gain.linearRampToValueAtTime(params.amplitude, now + params.attack)
    window.fmMasterGain.gain.linearRampToValueAtTime(0, now + params.attack + params.decay)
  }
})

function updateFM() {
  if (!isAudioInit || !window.fmCarrier) return
  window.fmCarrier.frequency.setValueAtTime(params.carrierFreq, audioCtx.currentTime)
  window.fmModulator.frequency.setValueAtTime(params.modFreq, audioCtx.currentTime)
  window.fmModGain.gain.setValueAtTime(params.modIndex * params.modFreq, audioCtx.currentTime)
  window.fmMasterGain.gain.setValueAtTime(params.amplitude, audioCtx.currentTime)
}

function updateSpectrum() {
  if (!analyser) return
  analyser.getByteFrequencyData(frequencyData)
  for (let i = 0; i < BAR_COUNT; i++) {
    const idx = Math.floor(i * frequencyData.length / BAR_COUNT / 4)
    const value = frequencyData[idx] / 255
    const h = Math.max(0.1, value * params.spectrumHeight)
    bars[i].scale.y = h * 10
    bars[i].position.y = h * 5
    barMats[i].emissiveIntensity = value * 0.8 + 0.1
    barMats[i].color.setHSL(i / BAR_COUNT * 0.3 + 0.5, 0.8, 0.3 + value * 0.4)
  }
}

function updateWaveform() {
  if (!analyser) return
  analyser.getFloatTimeDomainData(timeDomainData)
  const positions = waveLine.geometry.attributes.position.array
  for (let i = 0; i < waveCount && i < timeDomainData.length; i++) {
    positions[i * 3 + 1] = timeDomainData[i * 4] * 5
  }
  waveLine.geometry.attributes.position.needsUpdate = true
}

const gui = new GUI()
gui.add(params, 'carrierFreq', 55, 880, 1).name('载波频率 (Hz)').onChange(updateFM)
gui.add(params, 'modFreq', 20, 800, 1).name('调制频率 (Hz)').onChange(updateFM)
gui.add(params, 'modIndex', 0, 20, 0.1).name('调制指数').onChange(updateFM)
gui.add(params, 'amplitude', 0, 0.5, 0.01).name('主音量').onChange(updateFM)
gui.add(params, 'spectrumHeight', 1, 20, 1).name('频谱高度')
gui.add(params, 'showSpectrum').name('显示频谱')
gui.add(params, 'showWaveform').name('显示波形')
gui.add(params, 'showOperators').name('显示算子')

const guiOpts = gui.addFolder('合成选项')
guiOpts.add(params, 'attack', 0.01, 0.5, 0.01).name('起音')
guiOpts.add(params, 'decay', 0.05, 1, 0.01).name('衰减')

barGroup.visible = params.showSpectrum
waveLine.visible = params.showWaveform
opGroup.visible = params.showOperators
gui.onChange(e => {
  if (e.property === 'showSpectrum') barGroup.visible = e.value
  if (e.property === 'showWaveform') waveLine.visible = e.value
  if (e.property === 'showOperators') opGroup.visible = e.value
})

function animate() {
  requestAnimationFrame(animate)
  updateSpectrum()
  updateWaveform()
  carrierOp.rotation.z += 0.01
  modOp.rotation.z -= 0.015
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
