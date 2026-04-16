// 3742. Soil Triaxial Test
// Triaxial compression with Mohr-Coulomb failure, stress-strain curve
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1510)
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 500)
camera.position.set(8, 8, 12)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Specimen
const specimenGeo = new THREE.CylinderGeometry(2, 2, 6, 48)
const specimen = new THREE.Mesh(specimenGeo,
  new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9, metalness: 0.0 }))
specimen.castShadow = true
scene.add(specimen)

// Chamber
const chamberGeo = new THREE.CylinderGeometry(3.5, 3.5, 8, 32)
const chamber = new THREE.Mesh(chamberGeo, new THREE.MeshPhysicalMaterial({
  color: 0x88ccff, transparent: true, opacity: 0.08,
  roughness: 0.1, metalness: 0.0, side: THREE.DoubleSide,
}))
scene.add(chamber)

// Platens
const platenGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.5, 32)
const topPlaten = new THREE.Mesh(platenGeo, new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 }))
topPlaten.position.y = 4.5
scene.add(topPlaten)
const botPlaten = topPlaten.clone()
botPlaten.position.y = -4.5
scene.add(botPlaten)

// Stresses
const params = { cellPressure: 100, axialStress: 100, running: false, speed: 0.5 }

const stressData = []  // (sigma1, sigma3, strain)
let strain = 0

// 2D canvas for stress-strain curve
const curveCanvas = document.createElement('canvas')
curveCanvas.width = 280; curveCanvas.height = 180
const curveTex = new THREE.CanvasTexture(curveCanvas)
const curveMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 3.2),
  new THREE.MeshBasicMaterial({ map: curveTex, transparent: true })
)
curveMesh.position.set(-7, 5, 0)
curveMesh.rotation.y = Math.PI / 5
scene.add(curveMesh)

// Mohr circle canvas
const mohrCanvas = document.createElement('canvas')
mohrCanvas.width = 280; mohrCanvas.height = 180
const mohrTex = new THREE.CanvasTexture(mohrCanvas)
const mohrMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 3.2),
  new THREE.MeshBasicMaterial({ map: mohrTex, transparent: true })
)
mohrMesh.position.set(7, 5, 0)
mohrMesh.rotation.y = -Math.PI / 5
scene.add(mohrMesh)

let info = document.createElement('div')
info.style.cssText = 'position:fixed;top:10px;left:10px;color:#cc9944;font-family:monospace;font-size:11px;background:rgba(0,0,0,0.8);padding:8px;border-radius:6px;line-height:1.8'
document.body.appendChild(info)

function drawCurve() {
  const ctx = curveCanvas.getContext('2d')
  ctx.clearRect(0, 0, 280, 180)
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(0, 0, 280, 180)
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  for (let i = 0; i < 7; i++) {
    ctx.beginPath(); ctx.moveTo(30, i*25+10); ctx.lineTo(270, i*25+10); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(30+i*40, 10); ctx.lineTo(30+i*40, 170); ctx.stroke()
  }
  if (stressData.length < 2) return
  const maxStress = Math.max(...stressData.map(d => d.s1))
  const maxStrain = Math.max(...stressData.map(d => d.eps))
  ctx.strokeStyle = '#ff6622'
  ctx.lineWidth = 2
  ctx.beginPath()
  stressData.forEach((d, i) => {
    const x = 30 + (d.eps/maxStrain)*220
    const y = 170 - (d.s1/maxStress)*150
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.fillStyle = '#ff6622'
  ctx.font = '10px monospace'
  ctx.fillText('Stress-Strain Curve', 80, 12)
  curveTex.needsUpdate = true
}

function drawMohr() {
  const ctx = mohrCanvas.getContext('2d')
  ctx.clearRect(0, 0, 280, 180)
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(0, 0, 280, 180)
  const s3 = params.cellPressure
  const s1 = params.axialStress
  const center = (s1 + s3) / 2
  const radius = (s1 - s3) / 2
  const cx = 140 + center * 0.3
  const cy = 90
  const r = Math.max(radius * 0.3, 5)
  ctx.strokeStyle = '#ff4444'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  // Failure envelope
  ctx.strokeStyle = '#44ff88'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  const phi = 30 * Math.PI / 180
  const coh = 20
  const maxS = Math.max(s1, s3, 200)
  for (let s = 0; s < maxS; s += 2) {
    const tMax = s * Math.tan(phi) + coh
    const px = 140 + s * 0.3
    const py = 90 - tMax * 0.5
    s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.fillStyle = '#44ff88'
  ctx.font = '10px monospace'
  ctx.fillText('Mohr-Coulomb', 90, 12)
  ctx.fillStyle = '#aaa'
  ctx.font = '9px monospace'
  ctx.fillText(`σ1=${s1.toFixed(0)} kPa`, 10, 170)
  ctx.fillText(`σ3=${s3.toFixed(0)} kPa`, 10, 158)
  mohrTex.needsUpdate = true
}

const gui = new GUI()
gui.add(params, 'cellPressure', 10, 300).name('Cell Press (kPa)')
gui.add(params, 'running').name('Run Test')
gui.add(params, 'speed', 0.1, 3).name('Speed')

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xffffff, 1)
sun.position.set(10, 20, 10)
sun.castShadow = true
scene.add(sun)
const fillLight = new THREE.PointLight(0xff8844, 1, 30)
fillLight.position.set(-5, 5, 5)
scene.add(fillLight)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()

  if (params.running) {
    strain += params.speed * 0.002
    specimen.scale.y = Math.max(1 - strain, 0.3)
    specimen.position.y = -specimen.scale.y * 3 + 3
    topPlaten.position.y = 4.5 - strain * 8

    // Deviator stress increases then peaks
    const peakStress = 350
    const devStress = peakStress * Math.min(strain / 0.15, 1) * Math.exp(-strain / 0.3 * 3)
    params.axialStress = params.cellPressure + devStress

    stressData.push({ eps: strain, s1: params.axialStress, s3: params.cellPressure })
    if (stressData.length > 500) stressData.shift()
    drawCurve()
  }
  drawMohr()

  info.innerHTML = `TRIAXIAL TEST<br>Cell Pressure: ${params.cellPressure} kPa<br>Axial Stress: ${params.axialStress.toFixed(0)} kPa<br>Deviator: ${(params.axialStress - params.cellPressure).toFixed(0)} kPa<br>Strain: ${(strain*100).toFixed(1)}%<br>Status: ${strain > 0.15 ? 'FAILURE' : 'Loading'}`

  controls.update()
  renderer.render(scene, camera)
}
drawCurve(); drawMohr()
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
