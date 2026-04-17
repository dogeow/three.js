// 3270. Granular Synthesis Visualizer
// Audio granular synthesis with 3D grain cloud visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020208)
scene.fog = new THREE.FogExp2(0x020208, 0.006)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 8, 30)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.2, 0.4, 0.1)
composer.addPass(bloom)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.2

// Audio setup
let audioCtx = null
let masterGain = null
let oscillators = []
let isPlaying = false

function initAudio() {
  if (audioCtx) return
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  masterGain = audioCtx.createGain()
  masterGain.gain.value = 0.15
  masterGain.connect(audioCtx.destination)
}

// Granular synthesis parameters
const params = {
  grainSize: 40,       // ms
  grainDensity: 25,     // grains per second
  pitchVariation: 0.3,
  scatterRadius: 2,
  attackTime: 15,       // ms
  releaseTime: 25,     // ms
  baseFreq: 220,
  harmony: [1, 1.5, 2, 2.5, 3],
}

// Grain particle system - 2000 grains
const MAX_GRAINS = 2000
const grainPositions = new Float32Array(MAX_GRAINS * 3)
const grainColors = new Float32Array(MAX_GRAINS * 3)
const grainSizes = new Float32Array(MAX_GRAINS)
const grainAlphas = new Float32Array(MAX_GRAINS)
const grainVelocities = []
const grainLifetimes = []
const grainMaxLifetimes = []

const grainGeo = new THREE.BufferGeometry()
grainGeo.setAttribute('position', new THREE.BufferAttribute(grainPositions, 3))
grainGeo.setAttribute('color', new THREE.BufferAttribute(grainColors, 3))
grainGeo.setAttribute('size', new THREE.BufferAttribute(grainSizes, 1))

const grainMat = new THREE.PointsMaterial({
  size: 0.4,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
})

const grainSystem = new THREE.Points(grainGeo, grainMat)
scene.add(grainSystem)

// Grain connections (proximity graph)
const LINE_COUNT = 300
const linePositions = new Float32Array(LINE_COUNT * 2 * 3)
const lineGeo = new THREE.BufferGeometry()
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
const lineMat = new THREE.LineBasicMaterial({ color: 0x4466ff, transparent: true, opacity: 0.1 })
const grainLines = new THREE.LineSegments(lineGeo, lineMat)
scene.add(grainLines)

// Central sound source sphere
const sourceGeo = new THREE.IcosahedronGeometry(1.5, 3)
const sourceMat = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  emissive: 0x2233aa,
  emissiveIntensity: 0.5,
  roughness: 0.2,
  metalness: 0.8,
  transparent: true,
  opacity: 0.8,
})
const sourceMesh = new THREE.Mesh(sourceGeo, sourceMat)
scene.add(sourceMesh)

// Orbiting emitter nodes
const emitterGeo = new THREE.OctahedronGeometry(0.4, 1)
const emitterMat = new THREE.MeshStandardMaterial({ color: 0x88ffcc, emissive: 0x224433, emissiveIntensity: 0.6 })
const emitters = []
for (let i = 0; i < 5; i++) {
  const emitter = new THREE.Mesh(emitterGeo, emitterMat.clone())
  emitter.userData.angle = (i / 5) * Math.PI * 2
  emitter.userData.radius = 5 + i * 0.8
  emitter.userData.speed = 0.3 + i * 0.1
  emitter.userData.yOffset = i * 0.6
  emitters.push(emitter)
  scene.add(emitter)
}

// Initialize grain data
for (let i = 0; i < MAX_GRAINS; i++) {
  grainPositions[i * 3] = (Math.random() - 0.5) * 20
  grainPositions[i * 3 + 1] = (Math.random() - 0.5) * 10
  grainPositions[i * 3 + 2] = (Math.random() - 0.5) * 20
  grainColors[i * 3] = 0.2 + Math.random() * 0.3
  grainColors[i * 3 + 1] = 0.5 + Math.random() * 0.5
  grainColors[i * 3 + 2] = 0.8 + Math.random() * 0.2
  grainSizes[i] = 0.1 + Math.random() * 0.4
  grainAlphas[i] = Math.random()
  grainVelocities.push(new THREE.Vector3(
    (Math.random() - 0.5) * 0.1,
    (Math.random() - 0.5) * 0.05,
    (Math.random() - 0.5) * 0.1
  ))
  grainLifetimes.push(Math.random() * 5)
  grainMaxLifetimes.push(2 + Math.random() * 4)
}
grainGeo.attributes.position.needsUpdate = true

// UI
const startBtn = document.createElement('button')
startBtn.textContent = '▶ START GRANULAR SYNTH'
startBtn.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#2244aa;color:#88ffcc;border:2px solid #4488ff;padding:16px 32px;font-family:monospace;font-size:16px;cursor:pointer;border-radius:8px;z-index:100;'
document.body.appendChild(startBtn)

const infoDiv = document.createElement('div')
infoDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#88ffcc;font-family:monospace;font-size:12px;line-height:1.8;'
document.body.appendChild(infoDiv)

const slidersDiv = document.createElement('div')
slidersDiv.style.cssText = 'position:fixed;top:20px;right:20px;color:#aaa;font-family:monospace;font-size:11px;line-height:2;'
document.body.appendChild(slidersDiv)

function makeSlider(label, min, max, val, cb) {
  const row = document.createElement('div')
  row.innerHTML = `<label style="color:#88ffcc">${label}: <span>${val}</span></label><br><input type="range" min="${min}" max="${max}" value="${val}" step="${(max-min)/100}" style="width:120px"/>`
  row.querySelector('input').oninput = e => { row.querySelector('span').textContent = e.target.value; cb(parseFloat(e.target.value)) }
  slidersDiv.appendChild(row)
}
makeSlider('Grain Size (ms)', 10, 100, params.grainSize, v => params.grainSize = v)
makeSlider('Density (/s)', 5, 60, params.grainDensity, v => params.grainDensity = v)
makeSlider('Pitch Variation', 0, 1, params.pitchVariation, v => params.pitchVariation = v)
makeSlider('Scatter Radius', 0.5, 5, params.scatterRadius, v => params.scatterRadius = v)

let grainSpawnAccum = 0
let activeOscillators = 0

function spawnGrain() {
  // Find a grain to activate
  for (let i = 0; i < MAX_GRAINS; i++) {
    if (grainLifetimes[i] >= grainMaxLifetimes[i]) {
      // Respawn from random emitter
      const em = emitters[Math.floor(Math.random() * emitters.length)]
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * params.scatterRadius
      grainPositions[i * 3] = Math.cos(angle) * r
      grainPositions[i * 3 + 1] = (Math.random() - 0.5) * 4 + em.userData.yOffset
      grainPositions[i * 3 + 2] = Math.sin(angle) * r
      grainVelocities[i].set(
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.08
      )
      grainLifetimes[i] = 0
      grainMaxLifetimes[i] = 1.5 + Math.random() * 3

      // Color by harmony
      const harmonyIdx = Math.floor(Math.random() * params.harmony.length)
      const freq = params.baseFreq * params.harmony[harmonyIdx]
      const col = new THREE.Color().setHSL(0.55 + harmonyIdx * 0.08, 0.8, 0.5 + Math.random() * 0.3)
      grainColors[i * 3] = col.r; grainColors[i * 3 + 1] = col.g; grainColors[i * 3 + 2] = col.b

      if (isPlaying && audioCtx) {
        // Create grain oscillator
        try {
          const osc = audioCtx.createOscillator()
          const env = audioCtx.createGain()
          const pitchMod = 1 + (Math.random() - 0.5) * params.pitchVariation * 2
          osc.frequency.value = freq * pitchMod
          osc.type = ['sine', 'triangle', 'sawtooth'][Math.floor(Math.random() * 3)]
          const now = audioCtx.currentTime
          const attack = params.attackTime / 1000
          const release = params.releaseTime / 1000
          env.gain.setValueAtTime(0, now)
          env.gain.linearRampToValueAtTime(0.3, now + attack)
          env.gain.exponentialRampToValueAtTime(0.001, now + attack + release)
          osc.connect(env)
          env.connect(masterGain)
          osc.start(now)
          osc.stop(now + attack + release + 0.01)
        } catch (e) { /* ignore */ }
      }
      break
    }
  }
}

function updateGrains(delta, time) {
  // Spawn grains based on density
  if (isPlaying) {
    grainSpawnAccum += params.grainDensity * delta
    while (grainSpawnAccum >= 1) {
      spawnGrain()
      grainSpawnAccum -= 1
    }
  }

  // Update all grains
  for (let i = 0; i < MAX_GRAINS; i++) {
    grainLifetimes[i] += delta
    if (grainLifetimes[i] >= grainMaxLifetimes[i]) continue

    // Move grain
    grainPositions[i * 3] += grainVelocities[i].x
    grainPositions[i * 3 + 1] += grainVelocities[i].y
    grainPositions[i * 3 + 2] += grainVelocities[i].z

    // Fade in/out
    const life = grainLifetimes[i] / grainMaxLifetimes[i]
    const fade = life < 0.1 ? life / 0.1 : life > 0.8 ? (1 - life) / 0.2 : 1
    grainAlphas[i] = fade
  }
  grainGeo.attributes.position.needsUpdate = true
  grainGeo.attributes.color.needsUpdate = true

  // Update grain lines (connect nearby grains)
  let lineIdx = 0
  for (let i = 0; i < MAX_GRAINS && lineIdx < LINE_COUNT * 2; i++) {
    if (grainLifetimes[i] >= grainMaxLifetimes[i]) continue
    for (let j = i + 1; j < MAX_GRAINS && lineIdx < LINE_COUNT * 2; j++) {
      if (grainLifetimes[j] >= grainMaxLifetimes[j]) continue
      const dx = grainPositions[i * 3] - grainPositions[j * 3]
      const dy = grainPositions[i * 3 + 1] - grainPositions[j * 3 + 1]
      const dz = grainPositions[i * 3 + 2] - grainPositions[j * 3 + 2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < 2.5) {
        const base = lineIdx * 6
        linePositions[base] = grainPositions[i * 3]
        linePositions[base + 1] = grainPositions[i * 3 + 1]
        linePositions[base + 2] = grainPositions[i * 3 + 2]
        linePositions[base + 3] = grainPositions[j * 3]
        linePositions[base + 4] = grainPositions[j * 3 + 1]
        linePositions[base + 5] = grainPositions[j * 3 + 2]
        lineIdx++
      }
    }
  }
  // Zero out remaining
  for (let i = lineIdx; i < LINE_COUNT * 2; i++) {
    linePositions[i * 6] = 0; linePositions[i * 6 + 1] = 0; linePositions[i * 6 + 2] = 0
    linePositions[i * 6 + 3] = 0; linePositions[i * 6 + 4] = 0; linePositions[i * 6 + 5] = 0
  }
  lineGeo.attributes.position.needsUpdate = true

  // Animate source mesh
  sourceMesh.rotation.x += delta * 0.3
  sourceMesh.rotation.y += delta * 0.5
  const pulse = 1 + Math.sin(time * 3) * 0.15
  sourceMesh.scale.setScalar(pulse)
  sourceMat.emissiveIntensity = 0.3 + Math.sin(time * 4) * 0.3

  // Emitters orbit
  emitters.forEach((em, i) => {
    em.userData.angle += delta * em.userData.speed
    em.position.set(
      Math.cos(em.userData.angle) * em.userData.radius,
      em.userData.yOffset + Math.sin(time * 0.5 + i) * 0.5,
      Math.sin(em.userData.angle) * em.userData.radius
    )
    em.rotation.x += delta
    em.rotation.z += delta * 0.7
  })

  // Bloom
  bloom.strength = isPlaying ? 1.0 + Math.sin(time * 2) * 0.3 : 0.5

  // Info
  infoDiv.innerHTML = `Grains Active: <b>${buildings => 0}</b><br>Emitters: <b>${emitters.length}</b><br>Base Freq: <b>${params.baseFreq} Hz</b><br>Harmony: <b>${params.harmony.join(', ')}</b><br>Status: <b>${isPlaying ? '▶ Playing' : '⏸ Stopped'}</b>`
}

startBtn.addEventListener('click', () => {
  initAudio()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  isPlaying = !isPlaying
  startBtn.textContent = isPlaying ? '⏸ STOP GRANULAR SYNTH' : '▶ START GRANULAR SYNTH'
  startBtn.style.background = isPlaying ? '#aa2244' : '#2244aa'
})

let lastTime = performance.now()
function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const delta = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now
  const time = now / 1000
  updateGrains(delta, time)
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
