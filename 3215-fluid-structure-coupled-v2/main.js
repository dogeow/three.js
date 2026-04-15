// 3215 - Fluid-Structure Coupled Simulation v2
// SPH-like fluid particles push on a cloth membrane
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050a14)
scene.add(new THREE.AmbientLight(0x334466, 0.5))
const dir = new THREE.DirectionalLight(0x88ccff, 1.0)
dir.position.set(5, 10, 5)
scene.add(dir)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 5, 22)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// --- Fluid Particles (SPH simplified) ---
const N_FLUID = 300
const fPos = new Float32Array(N_FLUID * 3)
const fVel = []
const fCol = new Float32Array(N_FLUID * 3)

for (let i = 0; i < N_FLUID; i++) {
  fPos[i * 3] = (Math.random() - 0.5) * 8
  fPos[i * 3 + 1] = Math.random() * 12 - 4
  fPos[i * 3 + 2] = (Math.random() - 0.5) * 8
  fVel.push({ x: (Math.random() - 0.5) * 0.1, y: -0.5 - Math.random() * 0.5, z: (Math.random() - 0.5) * 0.1 })
  fCol[i * 3] = 0.2; fCol[i * 3 + 1] = 0.6; fCol[i * 3 + 2] = 1.0
}

const fGeo = new THREE.BufferGeometry()
fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3))
fGeo.setAttribute('color', new THREE.BufferAttribute(fCol, 3))
const fMat = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.8 })
scene.add(new THREE.Points(fGeo, fMat))

// --- Cloth Grid (soft body) ---
const GW = 18, GH = 14
const cPosArr = new Float32Array(GW * GH * 3)
const cparticles = []
const cConstraints = []

for (let y = 0; y < GH; y++) {
  for (let x = 0; x < GW; x++) {
    const px = (x - GW / 2) * 0.9
    const py = 6 - y * 0.8
    const pz = 0
    cparticles.push({ x: px, y: py, z: pz, ox: px, oy: py, oz: pz,
      vx: 0, vy: 0, vz: 0, pinned: y === 0 })
    cPosArr[y * GW * 3 + x * 3] = px
    cPosArr[y * GW * 3 + x * 3 + 1] = py
    cPosArr[y * GW * 3 + x * 3 + 2] = pz
  }
}
for (let y = 0; y < GH; y++) {
  for (let x = 0; x < GW; x++) {
    const i = y * GW + x
    if (x < GW - 1) cConstraints.push([i, i + 1, 0.9])
    if (y < GH - 1) cConstraints.push([i, i + GW, 0.8])
    if (x < GW - 1 && y < GH - 1) cConstraints.push([i, i + GW + 1, Math.SQRT2 * 0.85])
    if (x > 0 && y < GH - 1) cConstraints.push([i, i + GW - 1, Math.SQRT2 * 0.85])
  }
}

const cGeo = new THREE.BufferGeometry()
cGeo.setAttribute('position', new THREE.BufferAttribute(cPosArr, 3))
const cIndices = []
for (let y = 0; y < GH - 1; y++) {
  for (let x = 0; x < GW - 1; x++) {
    const a = y * GW + x, b = a + 1, c = a + GW, d = c + 1
    cIndices.push(a, b, c, b, d, c)
  }
}
cGeo.setIndex(cIndices)
cGeo.computeVertexNormals()

const cMat = new THREE.MeshPhongMaterial({ color: 0x44aaff, side: THREE.DoubleSide, transparent: true, opacity: 0.7, wireframe: false })
const cMesh = new THREE.Mesh(cGeo, cMat)
scene.add(cMesh)

// Wireframe overlay
const cWireMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, wireframe: true, transparent: true, opacity: 0.2 })
const cWire = new THREE.Mesh(cGeo, cWireMat)
scene.add(cWire)

// Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x111122 }))
floor.rotation.x = -Math.PI / 2
floor.position.y = -5
scene.add(floor)

// Walls (invisible collision)
const box = new THREE.Box3(
  new THREE.Vector3(-10, -6, -10),
  new THREE.Vector3(10, 14, 10)
)

const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:16px;left:16px;color:#88ccff;font-family:monospace;font-size:13px;background:rgba(5,10,20,0.85);padding:12px;border-radius:8px;line-height:1.8'
info.innerHTML = '<b>Fluid-Structure Coupled v2</b><br>SPH fluid pushes cloth membrane<br>Drag to orbit'
document.body.appendChild(info)

// Fluid-structure coupling
function applyFluidForceOnCloth() {
  for (const fp of fVel) {
    for (let ci = 0; ci < cparticles.length; ci++) {
      if (cparticles[ci].pinned) continue
      const cp = cparticles[ci]
      for (let fi = 0; fi < N_FLUID; fi++) {
        const dx = fPos[fi * 3] - cp.x
        const dy = fPos[fi * 3 + 1] - cp.y
        const dz = fPos[fi * 3 + 2] - cp.z
        const dist2 = dx * dx + dy * dy + dz * dz
        if (dist2 < 1.0) {
          const force = 0.15 * (1.0 - dist2) / dist2
          cp.vx += dx * force
          cp.vy += dy * force
          cp.vz += dz * force
        }
      }
    }
  }
}

function updateCloth() {
  for (const p of cparticles) {
    if (p.pinned) continue
    // Gravity
    p.vy -= 0.004
    // Damping
    p.vx *= 0.97; p.vy *= 0.97; p.vz *= 0.97
    // Integrate
    p.x += p.vx; p.y += p.vy; p.z += p.vz
    // Floor collision
    if (p.y < -5) { p.y = -5; p.vy *= -0.3 }
    // Wall collision
    if (Math.abs(p.x) > 9) { p.x = Math.sign(p.x) * 9; p.vx *= -0.3 }
    if (Math.abs(p.z) > 9) { p.z = Math.sign(p.z) * 9; p.vz *= -0.3 }
  }
  // Constraints
  for (let iter = 0; iter < 4; iter++) {
    for (const [a, b, rest] of cConstraints) {
      const pa = cparticles[a], pb = cparticles[b]
      const dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < 0.001) continue
      const diff = (dist - rest) / dist * 0.5
      if (!pa.pinned) { pa.x += dx * diff; pa.y += dy * diff; pa.z += dz * diff }
      if (!pb.pinned) { pb.x -= dx * diff; pb.y -= dy * diff; pb.z -= dz * diff }
    }
  }
  // Update geometry
  for (let i = 0; i < cparticles.length; i++) {
    cPosArr[i * 3] = cparticles[i].x
    cPosArr[i * 3 + 1] = cparticles[i].y
    cPosArr[i * 3 + 2] = cparticles[i].z
  }
  cGeo.attributes.position.needsUpdate = true
  cGeo.computeVertexNormals()
}

function updateFluid() {
  // SPH-like: simple gravity + boundary
  for (let i = 0; i < N_FLUID; i++) {
    fPos[i * 3] += fVel[i].x
    fPos[i * 3 + 1] += fVel[i].y
    fPos[i * 3 + 2] += fVel[i].z
    // Gravity
    fVel[i].y -= 0.003
    // Floor bounce
    if (fPos[i * 3 + 1] < -4.5) {
      fPos[i * 3 + 1] = -4.5
      fVel[i].y *= -0.4
    }
    // Wall bounce
    if (Math.abs(fPos[i * 3]) > 9) { fPos[i * 3] = Math.sign(fPos[i * 3]) * 9; fVel[i].x *= -0.5 }
    if (Math.abs(fPos[i * 3 + 2]) > 9) { fPos[i * 3 + 2] = Math.sign(fPos[i * 3 + 2]) * 9; fVel[i].z *= -0.5 }
    // Reset top
    if (fPos[i * 3 + 1] > 12) {
      fPos[i * 3] = (Math.random() - 0.5) * 8
      fPos[i * 3 + 1] = 12
      fPos[i * 3 + 2] = (Math.random() - 0.5) * 8
      fVel[i] = { x: (Math.random() - 0.5) * 0.2, y: -0.5 - Math.random() * 0.5, z: (Math.random() - 0.5) * 0.2 }
    }
    // Color by velocity
    const speed = Math.sqrt(fVel[i].x ** 2 + fVel[i].y ** 2 + fVel[i].z ** 2)
    const h = Math.max(0, 0.6 - speed * 0.1)
    const c = new THREE.Color().setHSL(h, 0.8, 0.5)
    fCol[i * 3] = c.r; fCol[i * 3 + 1] = c.g; fCol[i * 3 + 2] = c.b
  }
  fGeo.attributes.position.needsUpdate = true
  fGeo.attributes.color.needsUpdate = true
}

function animate() {
  requestAnimationFrame(animate)
  applyFluidForceOnCloth()
  updateCloth()
  updateFluid()
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
