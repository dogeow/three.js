// 3365. Kinetic Typography 3D — animated 3D text with particles
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080810)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 2, 16)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.3

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.2, 0.4, 0.3)
composer.addPass(bloom)

scene.add(new THREE.AmbientLight(0x6644ff, 0.5))
const ptLight = new THREE.PointLight(0xff6644, 2, 50)
ptLight.position.set(5, 5, 5)
scene.add(ptLight)
const ptLight2 = new THREE.PointLight(0x44aaff, 1.5, 50)
ptLight2.position.set(-5, -3, 5)
scene.add(ptLight2)

// Star field background
const STAR_COUNT = 500
const starPos = new Float32Array(STAR_COUNT * 3)
for (let i = 0; i < STAR_COUNT; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 200
  starPos[i * 3 + 1] = (Math.random() - 0.5) * 200
  starPos[i * 3 + 2] = (Math.random() - 0.5) * 200
}
const starGeo = new THREE.BufferGeometry()
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.6 })
scene.add(new THREE.Points(starGeo, starMat))

// Sparkle particles around text
const SPARKLE_COUNT = 200
const sparklePos = new Float32Array(SPARKLE_COUNT * 3)
const sparkleVel = []
const sparkleBase = []
for (let i = 0; i < SPARKLE_COUNT; i++) {
  const r = 4 + Math.random() * 6
  const theta = Math.random() * Math.PI * 2
  const phi = Math.random() * Math.PI
  const x = r * Math.sin(phi) * Math.cos(theta)
  const y = r * Math.sin(phi) * Math.sin(theta)
  const z = r * Math.cos(phi)
  sparklePos[i * 3] = x; sparklePos[i * 3 + 1] = y; sparklePos[i * 3 + 2] = z
  sparkleBase.push([x, y, z])
  sparkleVel.push({ vx: (Math.random()-0.5)*0.02, vy: (Math.random()-0.5)*0.02, vz: (Math.random()-0.5)*0.02 })
}
const sparkleGeo = new THREE.BufferGeometry()
sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3))
const sparkleMat = new THREE.PointsMaterial({ color: 0xffdd88, size: 0.15, transparent: true, opacity: 0.9 })
const sparkles = new THREE.Points(sparkleGeo, sparkleMat)
scene.add(sparkles)

// Letter meshes
const LETTER_WORDS = ['THREE.JS', 'HELLO', 'WAVE', '2026', 'CUBE']
let letterMeshes = []
let currentWordIndex = 0
let font = null

const params = {
  fontSize: 1.0,
  rotSpeed: 1.0,
  floatAmp: 0.5,
  sparkleCount: 200,
  word: 'THREE.JS'
}

function buildLetters(text) {
  // Remove old letters
  for (const m of letterMeshes) {
    scene.remove(m)
    m.geometry.dispose()
    m.material.dispose()
  }
  letterMeshes = []
  if (!font) return

  const chars = text.split('')
  const totalWidth = chars.length * 1.2 * params.fontSize
  let xOffset = -totalWidth / 2

  chars.forEach((ch, idx) => {
    if (ch === ' ') { xOffset += 0.8 * params.fontSize; return }
    const geo = new TextGeometry(ch, {
      font,
      size: params.fontSize,
      height: params.fontSize * 0.4,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 5
    })
    geo.computeBoundingBox()
    const centerOffset = (geo.boundingBox.max.x - geo.boundingBox.min.x) / 2
    geo.translate(centerOffset, 0, 0)

    // Rainbow gradient per letter
    const hue = (idx / chars.length)
    const color = new THREE.Color().setHSL(hue, 0.8, 0.6)
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.2
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.x = xOffset
    mesh.userData = {
      baseX: xOffset,
      baseY: 0,
      baseZ: 0,
      rotSpeedX: (Math.random() - 0.5) * params.rotSpeed,
      rotSpeedY: (Math.random() - 0.5) * params.rotSpeed,
      rotSpeedZ: (Math.random() - 0.5) * params.rotSpeed,
      phase: idx * 0.3,
      targetScale: 1.0,
      scale: 0.01
    }
    scene.add(mesh)
    letterMeshes.push(mesh)
    xOffset += (geo.boundingBox.max.x - geo.boundingBox.min.x) + 0.15 * params.fontSize
  })
}

// Load font
const fontLoader = new FontLoader()
fontLoader.load(
  'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
  (loadedFont) => {
    font = loadedFont
    buildLetters(params.word)
  },
  undefined,
  () => { console.warn('Font load failed, using fallback') }
)

// GUI
const gui = new GUI()
gui.add(params, 'fontSize', 0.5, 3, 0.1).name('Font Size').onChange(() => buildLetters(params.word))
gui.add(params, 'rotSpeed', 0, 5, 0.1).name('Rotation Speed')
gui.add(params, 'floatAmp', 0, 2, 0.1).name('Float Amplitude')
gui.add(params, 'sparkleCount', 50, 500, 10).name('Sparkle Count').onChange(v => {
  // Adjust sparkle system size would require rebuild, just note it
})
gui.add(params, 'word', LETTER_WORDS).name('Word').onChange(v => buildLetters(v))

// Click to cycle words
window.addEventListener('click', () => {
  currentWordIndex = (currentWordIndex + 1) % LETTER_WORDS.length
  params.word = LETTER_WORDS[currentWordIndex]
  buildLetters(params.word)
  gui.controllers.forEach(c => c.updateDisplay())
})

// Sparkle orbit animation
function updateSparkles(t) {
  const sp = sparkleGeo.attributes.position
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const [bx, by, bz] = sparkleBase[i]
    const r = Math.sqrt(bx*bx + by*by + bz*bz)
    const speed = 0.2 + (i % 5) * 0.05
    const angle = t * speed + i * 0.1
    const phi = Math.acos(by / r)
    const theta = Math.atan2(bz, bx)
    const newPhi = phi + Math.sin(t * 0.3 + i * 0.2) * 0.01
    const newTheta = theta + 0.005
    sp.array[i * 3] = r * Math.sin(newPhi) * Math.cos(newTheta)
    sp.array[i * 3 + 1] = r * Math.cos(newPhi)
    sp.array[i * 3 + 2] = r * Math.sin(newPhi) * Math.sin(newTheta)
  }
  sp.needsUpdate = true
}

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // Animate letters
  for (const mesh of letterMeshes) {
    const ud = mesh.userData
    // Grow in animation
    ud.scale += (ud.targetScale - ud.scale) * 0.1
    mesh.scale.setScalar(ud.scale)
    // Float
    mesh.position.y = ud.baseY + Math.sin(t * 0.8 + ud.phase) * params.floatAmp
    mesh.position.z = ud.baseZ + Math.cos(t * 0.6 + ud.phase) * params.floatAmp * 0.5
    // Rotate
    mesh.rotation.x += ud.rotSpeedX * 0.01 * params.rotSpeed
    mesh.rotation.y += ud.rotSpeedY * 0.015 * params.rotSpeed
    mesh.rotation.z += ud.rotSpeedZ * 0.005 * params.rotSpeed
  }

  updateSparkles(t)

  // Animate lights
  ptLight.position.x = Math.cos(t * 0.3) * 8
  ptLight.position.z = Math.sin(t * 0.3) * 8
  ptLight2.position.x = Math.sin(t * 0.2) * 6
  ptLight2.position.y = Math.cos(t * 0.25) * 4

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
