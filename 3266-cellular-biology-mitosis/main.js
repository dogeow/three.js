// 3266. Cellular Biology Mitosis
// Cell division simulation - prophase through cytokinesis
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.015)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 12, 30)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// Lighting
const ambientLight = new THREE.AmbientLight(0x4488ff, 0.3)
scene.add(ambientLight)
const pointLight = new THREE.PointLight(0x88ccff, 2, 50)
pointLight.position.set(5, 10, 5)
scene.add(pointLight)
const backLight = new THREE.PointLight(0xff88cc, 1, 40)
backLight.position.set(-5, -5, -10)
scene.add(backLight)

// Cell state
let phase = 0
const phases = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase', 'Cytokinesis']
let phaseTime = 0
const PHASE_DURATION = 4.0
let time = 0

// Nucleus
const nucleusGroup = new THREE.Group()
const nuclearEnvelopeMat = new THREE.MeshPhysicalMaterial({
  color: 0x4488ff,
  transparent: true,
  opacity: 0.25,
  roughness: 0.2,
  metalness: 0.1,
  side: THREE.DoubleSide,
})
const nucleusGeo = new THREE.IcosahedronGeometry(3, 3)
const nucleusMesh = new THREE.Mesh(nucleusGeo, nuclearEnvelopeMat)
nucleusGroup.add(nucleusMesh)

// Chromosomes
const chromosomes = []
const chromosomeMat = new THREE.MeshStandardMaterial({
  color: 0x88ffcc,
  roughness: 0.3,
  metalness: 0.4,
  emissive: 0x224433,
  emissiveIntensity: 0.3,
})

for (let i = 0; i < 4; i++) {
  const chrGeo = new THREE.CapsuleGeometry(0.12, 0.8, 4, 8)
  const chr = new THREE.Mesh(chrGeo, chromosomeMat.clone())
  chr.userData.angle = (i / 4) * Math.PI * 2
  chr.userData.spreadAngle = chr.userData.angle
  chr.userData.sisterIndex = i < 2 ? i + 2 : i - 2
  chromosomes.push(chr)
  nucleusGroup.add(chr)
}

// Spindle fibers
const spindleGroup = new THREE.Group()
scene.add(spindleGroup)
const spindleMat = new THREE.LineBasicMaterial({ color: 0x88ffcc, transparent: true, opacity: 0.4 })

// Centrosomes
const centMat = new THREE.MeshStandardMaterial({ color: 0xffcc88, emissive: 0x443300, emissiveIntensity: 0.5 })
const centGeo = new THREE.SphereGeometry(0.3, 8, 8)
const cent1 = new THREE.Mesh(centGeo, centMat)
const cent2 = new THREE.Mesh(centGeo, centMat.clone())
cent1.position.set(-3, 0, 0)
cent2.position.set(3, 0, 0)
nucleusGroup.add(cent1)
nucleusGroup.add(cent2)

scene.add(nucleusGroup)

// Cell membrane
const cellMat = new THREE.MeshPhysicalMaterial({
  color: 0x2266ff,
  transparent: true,
  opacity: 0.08,
  roughness: 0.1,
  metalness: 0.0,
  side: THREE.DoubleSide,
})
let cellGeo = new THREE.SphereGeometry(5, 32, 32)
const cellMesh = new THREE.Mesh(cellGeo, cellMat)
scene.add(cellMesh)

// Daughter cells for cytokinesis
const daughter1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), cellMat.clone())
const daughter2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), cellMat.clone())
daughter1.visible = false
daughter2.visible = false
scene.add(daughter1)
scene.add(daughter2)

// Labels
const labelDiv = document.createElement('div')
labelDiv.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);color:#88ffcc;font-family:monospace;font-size:18px;text-align:center;pointer-events:none;'
document.body.appendChild(labelDiv)

const phaseDiv = document.createElement('div')
phaseDiv.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#aaa;font-family:monospace;font-size:13px;text-align:center;pointer-events:none;'
document.body.appendChild(phaseDiv)

// Noise
function noise3D(x, y, z) {
  return Math.sin(x * 1.3 + y * 2.1) * Math.cos(y * 1.7 + z * 2.3) * Math.sin(z * 2.9 + x * 1.1)
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function lerp(a, b, t) { return a + (b - a) * t }

function updateChromosomePositions(chr, idx, p) {
  const t = easeInOut(Math.max(0, Math.min(1, p)))
  if (phase === 0) {
    // Interphase - inside nucleus
    const angle = chr.userData.angle
    const r = 1.2
    chr.position.set(Math.cos(angle) * r, Math.sin(angle) * r * 0.5, 0)
    chr.rotation.z = angle
  } else if (phase === 1) {
    // Prophase - condensing, moving to center
    const angle = chr.userData.angle
    chr.position.set(lerp(Math.cos(angle) * 1.2, Math.cos(angle) * 0.3, t), lerp(Math.sin(angle) * 0.6, 0, t), 0)
    chr.scale.setScalar(lerp(1, 1.3, t))
    chr.rotation.z = angle
  } else if (phase === 2) {
    // Metaphase - aligned at equator
    chr.position.set(lerp(Math.cos(chr.userData.spreadAngle) * 0.3, (idx % 2 === 0 ? -1.2 : 1.2), t), 0, 0)
    chr.rotation.z = 0
  } else if (phase === 3) {
    // Anaphase - separating
    const dir = idx < 2 ? -1 : 1
    chr.position.set(lerp((idx % 2 === 0 ? -1.2 : 1.2), dir * 3.5, t), 0, 0)
  } else {
    // Telophase - at poles
    const dir = idx < 2 ? -1 : 1
    chr.position.set(dir * 3.5, 0, 0)
  }
}

function updateSpindleFibers(p) {
  while (spindleGroup.children.length > 0) spindleGroup.remove(spindleGroup.children[0])
  if (phase < 2) return
  const t = easeInOut(Math.max(0, Math.min(1, p)))
  chromosomes.forEach((chr, i) => {
    const points = []
    const c = i < 2 ? cent1.position : cent2.position
    const steps = 10
    for (let s = 0; s <= steps; s++) {
      const st = s / steps
      const x = lerp(c.x, chr.position.x, st)
      const y = lerp(c.y, chr.position.y, st) * (1 - Math.pow(st * 2 - 1, 2))
      const z = lerp(c.z, chr.position.z, st)
      points.push(new THREE.Vector3(x, y, z))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x88ffcc, transparent: true, opacity: Math.max(0, t) * 0.5 }))
    spindleGroup.add(line)
  })
}

function updateScene(delta) {
  time += delta
  phaseTime += delta

  if (phaseTime >= PHASE_DURATION) {
    phaseTime = 0
    phase = (phase + 1) % phases.length
    if (phase === 0) {
      // Reset
      chromosomes.forEach((c, i) => { c.userData.angle = (i / 4) * Math.PI * 2; c.userData.spreadAngle = c.userData.angle; c.scale.setScalar(1) })
    }
  }

  const p = phaseTime / PHASE_DURATION

  // Update phase label
  labelDiv.textContent = `Phase ${phase + 1}/${phases.length}: ${phases[phase]}`
  phaseDiv.textContent = `Progress: ${(p * 100).toFixed(0)}%  |  Time: ${time.toFixed(1)}s`

  // Animate nucleus
  const nucleusPulse = 1 + Math.sin(time * 1.5) * 0.03
  nucleusGroup.children[0].scale.setScalar(nucleusPulse)

  // Update chromosomes
  chromosomes.forEach((chr, i) => updateChromosomePositions(chr, i, p))

  // Spindle fibers
  updateSpindleFibers(p)

  // Cell membrane deformation
  const cellScale = phase < 4 ? 1 + Math.sin(time) * 0.02 : 1 + t * 0.5
  const pinchAmt = phase === 4 || phase === 5 ? easeInOut(Math.min(1, (phase === 4 ? p * 2 : 1 + (p - 0.5) * 2))) : 0

  const pos = cellMesh.geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const r = Math.sqrt(x * x + y * y + z * z)
    let scale = cellScale
    if (pinchAmt > 0) {
      const equatorY = Math.abs(y) / (r + 0.001)
      const pinch = 1 - pinchAmt * (1 - equatorY) * 0.7
      scale *= Math.max(0.3, pinch)
    }
    const noiseVal = noise3D(x * 0.3 + time * 0.2, y * 0.3, z * 0.3) * 0.15
    const finalR = r * scale + noiseVal
    pos.setXYZ(i, (x / (r + 0.001)) * finalR, (y / (r + 0.001)) * finalR, (z / (r + 0.001)) * finalR)
  }
  pos.needsUpdate = true
  cellMesh.geometry.computeVertexNormals()

  // Nuclear envelope fade
  if (phase >= 2) {
    const fade = Math.min(1, (phase === 2 ? p * 2 : 1))
    nucleusGroup.children[0].material.opacity = 0.25 * (1 - fade)
    nucleusGroup.children[0].visible = fade < 0.95
  } else {
    nucleusGroup.children[0].material.opacity = 0.25
    nucleusGroup.children[0].visible = true
  }

  // Daughter cells in cytokinesis
  if (phase === 4 || phase === 5) {
    daughter1.visible = true
    daughter2.visible = true
    const dScale = phase === 4 ? easeInOut(p * 2) * 3 : 3
    const spread = phase === 5 ? 1 + easeInOut(p) * 1.5 : 1
    daughter1.scale.setScalar(dScale * spread)
    daughter2.scale.setScalar(dScale * spread)
    daughter1.position.set(-3.5 * spread, 0, 0)
    daughter2.position.set(3.5 * spread, 0, 0)
    cellMesh.visible = false
  } else {
    daughter1.visible = false
    daughter2.visible = false
    cellMesh.visible = true
  }

  // Rotate cell slowly
  nucleusGroup.rotation.y += delta * 0.2

  labelDiv.innerHTML = `<b>${phases[phase]}</b> <span style="font-size:12px;color:#aaa">(${phase + 1}/6)</span>`
}

let lastTime = performance.now()
function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const delta = Math.min((now - lastTime) / 1000, 0.1)
  lastTime = now
  updateScene(delta)
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
