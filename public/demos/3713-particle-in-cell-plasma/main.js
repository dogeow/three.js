// 3713. Particle-In-Cell Plasma Simulation
// Electromagnetic particle simulation: push particles via E/B fields on a grid
import * as THREE from 'three'

const W = innerWidth, H = innerHeight
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(W, H)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000112)

const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 300)
camera.position.set(0, 0, 60)
camera.lookAt(0, 0, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.3))

// ── Simulation Grid ────────────────────────────────────────────────────────
const NX = 60, NY = 40
const DX = 1.0, DY = 1.0
const EX = new Float32Array(NX * NY)
const EY = new Float32Array(NX * NY)
const BX = new Float32Array(NX * NY)
const BY = new Float32Array(NX * NY)
const rho = new Float32Array(NX * NY)  // charge density

// ── Particles ───────────────────────────────────────────────────────────────
const N_ELECTRONS = 600
const N_IONS = 60
const electrons = []
const ions = []

const eGeom = new THREE.SphereGeometry(0.35, 6, 6)
const eMat = new THREE.MeshBasicMaterial({ color: 0xff4422 })
const iGeom = new THREE.SphereGeometry(0.6, 6, 6)
const iMat = new THREE.MeshBasicMaterial({ color: 0x4488ff })

for (let i = 0; i < N_ELECTRONS; i++) {
  const x = (Math.random() - 0.5) * NX * DX * 0.8
  const y = (Math.random() - 0.5) * NY * DY * 0.8
  const vx = (Math.random() - 0.5) * 0.5
  const vy = (Math.random() - 0.5) * 0.5
  const mesh = new THREE.Mesh(eGeom, eMat.clone())
  mesh.position.set(x, y, 0)
  scene.add(mesh)
  electrons.push({ x, y, vx, vy, mesh })
}

for (let i = 0; i < N_IONS; i++) {
  const x = (Math.random() - 0.5) * NX * DX * 0.6
  const y = (Math.random() - 0.5) * NY * DY * 0.6
  const vx = (Math.random() - 0.5) * 0.1
  const vy = (Math.random() - 0.5) * 0.1
  const mesh = new THREE.Mesh(iGeom, iMat.clone())
  mesh.position.set(x, y, 0)
  scene.add(mesh)
  ions.push({ x, y, vx, vy, mesh })
}

// ── Field visualization mesh ───────────────────────────────────────────────
const fieldLineMat = new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.3 })
const fieldLines = []
for (let i = 0; i < 12; i++) {
  const geo = new THREE.BufferGeometry()
  const line = new THREE.Line(geo, fieldLineMat)
  scene.add(line)
  fieldLines.push(line)
}

// Background charge viz
const chargeCanvas = document.createElement('canvas')
chargeCanvas.width = NX; chargeCanvas.height = NY
const chargeCtx = chargeCanvas.getContext('2d')
const chargeTex = new THREE.CanvasTexture(chargeCanvas)

const bgMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(NX * DX, NY * DY),
  new THREE.MeshBasicMaterial({ map: chargeTex, transparent: true, opacity: 0.4, depthWrite: false })
)
bgMesh.position.set(0, 0, -0.5)
scene.add(bgMesh)

// Boundary box
const boxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(NX * DX, NY * DY, 1))
const boxLine = new THREE.LineSegments(boxGeo, new THREE.LineBasicMaterial({ color: 0x334466 }))
scene.add(boxLine)

// ── Simulation parameters ───────────────────────────────────────────────────
let E_scale = 1.0, B_scale = 1.0
const DT = 0.08
const QE = -1.0, QI = +1.0
const M_E = 1.0, M_I = 1836.0  // proton/electron mass ratio
const COLLISION_RATE = 0.005

document.getElementById('efield').addEventListener('input', e => {
  E_scale = parseFloat(e.target.value)
  document.getElementById('ef-val').textContent = E_scale.toFixed(1)
})
document.getElementById('bfield').addEventListener('input', e => {
  B_scale = parseFloat(e.target.value)
  document.getElementById('bf-val').textContent = B_scale.toFixed(1)
})

function resetSim() {
  electrons.forEach(p => {
    p.x = (Math.random() - 0.5) * NX * DX * 0.8
    p.y = (Math.random() - 0.5) * NY * DY * 0.8
    p.vx = (Math.random() - 0.5) * 0.5
    p.vy = (Math.random() - 0.5) * 0.5
  })
  ions.forEach(p => {
    p.x = (Math.random() - 0.5) * NX * DX * 0.6
    p.y = (Math.random() - 0.5) * NY * DY * 0.6
    p.vx = (Math.random() - 0.5) * 0.1
    p.vy = (Math.random() - 0.5) * 0.1
  })
}

window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') resetSim()
  if (e.code === 'Space') {
    // Inject electron beam
    for (let i = 0; i < 20; i++) {
      const e = electrons[i]
      e.x = -NX * DX / 2 + 2
      e.y = (Math.random() - 0.5) * 5
      e.vx = 2
      e.vy = (Math.random() - 0.5) * 0.5
    }
  }
})

function interpolateField(fx, fy, fArr) {
  const gx = Math.max(0, Math.min(NX - 2, Math.floor((fx / DX) + NX / 2)))
  const gy = Math.max(0, Math.min(NY - 2, Math.floor((fy / DY) + NY / 2)))
  const tx = (fx / DX) + NX / 2 - gx
  const ty = (fy / DY) + NY / 2 - gy
  const idx00 = gy * NX + gx
  const idx10 = gy * NX + gx + 1
  const idx01 = (gy + 1) * NX + gx
  const idx11 = (gy + 1) * NX + gx + 1
  return (1 - tx) * (1 - ty) * fArr[idx00] +
         tx * (1 - ty) * fArr[idx10] +
         (1 - tx) * ty * fArr[idx01] +
         tx * ty * fArr[idx11]
}

function injectParticles() {
  // Occasional thermal injection at boundaries
  if (Math.random() < 0.02) {
    const e = electrons[Math.floor(Math.random() * electrons.length)]
    e.x = -NX * DX / 2
    e.y = (Math.random() - 0.5) * NY * DY
    e.vx = Math.random() * 2 + 0.5
    e.vy = (Math.random() - 0.5) * 0.5
  }
}

function stepPIC() {
  const cx = NX / 2, cy = NY / 2

  // Clear fields and rho
  EX.fill(0); EY.fill(0); BX.fill(0); BY.fill(0); rho.fill(0)

  // Inject charge into rho (particles → grid)
  electrons.forEach(p => {
    const gx = Math.floor((p.x / DX) + cx)
    const gy = Math.floor((p.y / DY) + cy)
    if (gx >= 0 && gx < NX && gy >= 0 && gy < NY) {
      rho[gy * NX + gx] += QE
    }
  })
  ions.forEach(p => {
    const gx = Math.floor((p.x / DX) + cx)
    const gy = Math.floor((p.y / DY) + cy)
    if (gx >= 0 && gx < NX && gy >= 0 && gy < NY) {
      rho[gy * NX + gx] += QI
    }
  })

  // Solve Poisson: EX = -grad(phi), simple explicit
  // Apply external fields
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const idx = y * NX + x
      const fx = (x - NX / 2) * DX
      const fy = (y - NY / 2) * DY
      // External E field (uniform)
      EX[idx] = E_scale * 0.5
      EY[idx] = E_scale * 0.1 * Math.sin(fx * 0.1)
      // External B field (out of plane)
      BX[idx] = 0
      BY[idx] = 0
      // Charge contributes to E
      const phi_scale = 0.3
      if (x > 0 && x < NX - 1) EX[idx] -= phi_scale * (rho[idx] - rho[y * NX + (x - 1)])
      if (y > 0 && y < NY - 1) EY[idx] -= phi_scale * (rho[idx] - rho[(y - 1) * NX + x])
    }
  }

  // Push particles via E and B fields (Boris-like)
  const qm_e = QE / M_E * DT
  const qm_i = QI / M_I * DT

  function pushParticle(p, qm) {
    const Ex = interpolateField(p.x, p.y, EX) * E_scale
    const Ey = interpolateField(p.x, p.y, EY) * E_scale
    const Bz = B_scale * 0.5  // constant B field out of plane

    // E field acceleration
    p.vx += qm * Ex
    p.vy += qm * Ey

    // B field rotation (simplified gyro motion)
    if (Math.abs(Bz) > 0.01) {
      const vPerp = Math.hypot(p.vx, p.vy)
      const gyro = Math.abs(qm * Bz * DT)
      const angle = Math.atan2(p.vy, p.vx) + gyro
      const newV = vPerp * (1 + (Math.random() - 0.5) * COLLISION_RATE)
      p.vx = newV * Math.cos(angle)
      p.vy = newV * Math.sin(angle)
    }

    // Move
    p.x += p.vx * DT
    p.y += p.vy * DT

    // Boundary conditions (periodic on sides, reflecting on top/bottom)
    const halfX = NX * DX / 2, halfY = NY * DY / 2
    if (p.x < -halfX) p.x = -halfX; p.vx = Math.abs(p.vx)
    if (p.x > halfX) p.x = halfX; p.vx = -Math.abs(p.vx)
    if (p.y < -halfY) p.y = -halfY; p.vy = Math.abs(p.vy)
    if (p.y > halfY) p.y = halfY; p.vy = -Math.abs(p.vy)
  }

  electrons.forEach(p => pushParticle(p, qm_e))
  ions.forEach(p => pushParticle(p, qm_i))
}

function updateVisuals() {
  // Update electron positions
  electrons.forEach(p => p.mesh.position.set(p.x, p.y, 0))
  ions.forEach(p => p.mesh.position.set(p.x, p.y, 0))

  // Color electrons by speed
  electrons.forEach(p => {
    const spd = Math.hypot(p.vx, p.vy)
    const r = Math.min(1, 0.3 + spd * 0.5)
    const g = Math.min(1, 0.1 + spd * 0.1)
    p.mesh.material.color.setRGB(r, g * 0.3, 0.1)
  })

  // Update charge density texture
  const imgData = chargeCtx.createImageData(NX, NY)
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const idx = y * NX + x
      const v = rho[idx]
      const i4 = idx * 4
      if (v < 0) {
        imgData.data[i4] = Math.min(255, -v * 20)
        imgData.data[i4 + 1] = 0
        imgData.data[i4 + 2] = 0
        imgData.data[i4 + 3] = Math.min(255, -v * 30)
      } else {
        imgData.data[i4] = 0
        imgData.data[i4 + 1] = 0
        imgData.data[i4 + 2] = Math.min(255, v * 20)
        imgData.data[i4 + 3] = Math.min(255, v * 30)
      }
    }
  }
  chargeCtx.putImageData(imgData, 0, 0)
  chargeTex.needsUpdate = true
}

let t = 0
function animate() {
  requestAnimationFrame(animate); t++

  for (let i = 0; i < 2; i++) stepPIC()
  injectParticles()
  if (t % 2 === 0) updateVisuals()

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
