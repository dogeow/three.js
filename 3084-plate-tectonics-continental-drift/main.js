// 3084 - Plate Tectonics Continental Drift
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1628)
scene.fog = new THREE.FogExp2(0x0a1628, 0.012)
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 60, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
scene.add(new THREE.AmbientLight(0x6699cc, 0.6))
const sun = new THREE.DirectionalLight(0xffffcc, 1.2)
sun.position.set(50, 100, 50); sun.castShadow = true; scene.add(sun)
const GRID = 64, SCALE = 1.2
const heightfield = new Float32Array(GRID * GRID)
const plateMap = new Int8Array(GRID * GRID)
const velX = new Float32Array(GRID * GRID)
const velZ = new Float32Array(GRID * GRID)
const continents = [
  { cx: 16, cz: 16, rx: 8, rz: 6, vx: 0.008, vz: 0.003 },
  { cx: 48, cz: 16, rx: 9, rz: 7, vx: -0.007, vz: 0.004 },
  { cx: 16, cz: 48, rx: 7, rz: 8, vx: 0.004, vz: -0.008 },
  { cx: 48, cz: 48, rx: 8, rz: 7, vx: -0.003, vz: -0.005 },
]
for (let i = 0; i < GRID * GRID; i++) {
  const gx = i % GRID; const gz = Math.floor(i / GRID)
  let maxCont = 0; let plateId = 0
  for (let c = 0; c < continents.length; c++) {
    const cont = continents[c]
    const dx = gx - cont.cx; const dz = gz - cont.cz
    const d = Math.sqrt(dx*dx/(cont.rx*cont.rx) + dz*dz/(cont.rz*cont.rz))
    if (d < 1) { const val = 1 - d; if (val > maxCont) { maxCont = val; plateId = c + 1 } }
  }
  plateMap[i] = plateId
  velX[i] = plateId > 0 ? continents[plateId - 1].vx : 0
  velZ[i] = plateId > 0 ? continents[plateId - 1].vz : 0
  heightfield[i] = plateId > 0 ? maxCont * 3 : -1 + Math.sin(gx * 0.3) * 0.3
}
const geometry = new THREE.PlaneGeometry(GRID * SCALE, GRID * SCALE, GRID - 1, GRID - 1)
geometry.rotateX(-Math.PI / 2)
const positions = geometry.attributes.position.array
for (let i = 0; i < GRID * GRID; i++) positions[i * 3 + 1] = heightfield[i]
geometry.attributes.position.needsUpdate = true; geometry.computeVertexNormals()
const oceanMat = new THREE.MeshStandardMaterial({ color: 0x1a4a6e, roughness: 0.2, metalness: 0.1 })
const landMat = new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 0.9 })
const mesh = new THREE.Mesh(geometry, [oceanMat, landMat])
mesh.receiveShadow = true; scene.add(mesh)
const boundaryPoints = []
for (let i = 0; i < GRID * GRID; i++) {
  const gx = i % GRID; const gz = Math.floor(i / GRID)
  if (plateMap[i] > 0) {
    const n = [gx > 0 ? plateMap[i - 1] : 0, gx < GRID-1 ? plateMap[i + 1] : 0, gz > 0 ? plateMap[i - GRID] : 0, gz < GRID-1 ? plateMap[i + GRID] : 0]
    if (n.some(m => m !== plateMap[i] && m > 0)) boundaryPoints.push(gx * SCALE - GRID * SCALE / 2, heightfield[i] + 0.5, gz * SCALE - GRID * SCALE / 2)
  }
}
const boundaryGeo = new THREE.BufferGeometry()
boundaryGeo.setAttribute('position', new THREE.Float32BufferAttribute(boundaryPoints, 3))
scene.add(new THREE.Points(boundaryGeo, new THREE.PointsMaterial({ color: 0xff4400, size: 0.5 })))
const info = document.createElement('div')
info.style.cssText = 'position:absolute;top:12px;left:12px;color:#88ccff;font:13px/1.6 monospace;pointer-events:none'
info.innerHTML = '<b>3084 - Plate Tectonics</b><br>4 continental plates drifting<br>Red dots = plate boundaries<br>Mountains build at collisions'
document.body.appendChild(info)
function updateTerrain(dt) {
  for (let i = 0; i < GRID * GRID; i++) {
    if (plateMap[i] > 0) {
      heightfield[i] += velX[i] * dt * 0.5; heightfield[i] += velZ[i] * dt * 0.5
      const gx = i % GRID; const gz = Math.floor(i / GRID)
      const n = [gx > 0 ? plateMap[i-1] : 0, gx < GRID-1 ? plateMap[i+1] : 0, gz > 0 ? plateMap[i-GRID] : 0, gz < GRID-1 ? plateMap[i+GRID] : 0]
      const sub = n.some(m => m !== plateMap[i] && m > 0)
      if (sub && heightfield[i] > 0) heightfield[i] = Math.max(0, heightfield[i] - 0.001 * dt)
      if (sub) heightfield[i] += 0.002 * dt
    }
  }
  for (let i = 0; i < GRID * GRID; i++) positions[i * 3 + 1] = heightfield[i]
  geometry.attributes.position.needsUpdate = true; geometry.computeVertexNormals()
}
let lastTime = performance.now()
function animate() { requestAnimationFrame(animate); const now = performance.now(); const dt = Math.min(now - lastTime, 50); lastTime = now; updateTerrain(dt); controls.update(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
