// 3086 - Lattice Boltzmann D2Q9 Fluid Simulation
import * as THREE from 'three'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050a14)
const camera = new THREE.OrthographicCamera(-42, 42, 28, -28, 0.1, 100)
camera.position.z = 10
const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const N = 80, L = 80
const f = new Float32Array(9 * N * N), fTmp = new Float32Array(9 * N * N)
const rho = new Float32Array(N * N), vx = new Float32Array(N * N), vy = new Float32Array(N * N)
const w = [4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36]
const cx = [0, 1, 0, -1, 0, 1, -1, -1, 1], cy = [0, 0, 1, 0, -1, 1, 1, -1, -1]
const opp = [0, 3, 4, 1, 2, 7, 8, 5, 6]
for (let i = 0; i < 9 * N * N; i++) f[i] = w[i % 9]
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) rho[y * N + x] = 1.0
const obstacle = new Uint8Array(N * N)
const R = 8, cx0 = N/2, cy0 = N/2
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const dx = x - cx0, dy = y - cy0
  if (dx*dx + dy*dy < R*R) obstacle[y * N + x] = 1
}
const meshGeo = new THREE.PlaneGeometry(L, L, N - 1, N - 1)
meshGeo.rotateX(-Math.PI / 2)
const positions = meshGeo.attributes.position.array
const colors = new Float32Array(positions.length)
meshGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
const mesh = new THREE.Mesh(meshGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }))
scene.add(mesh)
const maxSpeed = 0.12
function equilibrium(i, r, ux, uy) {
  const dot = cx[i] * ux + cy[i] * uy
  return w[i] * r * (1 + 3 * dot + 4.5 * dot * dot - 1.5 * (ux*ux + uy*uy))
}
function simStep() {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const id = y * N + x
    if (obstacle[id]) { for (let i = 0; i < 9; i++) { const fi = f[i * N * N + id]; fTmp[opp[i] * N * N + id] = fi } continue }
    for (let i = 0; i < 9; i++) { const xS = (x - cx[i] + N) % N, yS = (y - cy[i] + N) % N; fTmp[i * N * N + id] = f[i * N * N + yS * N + xS] }
  }
  f.set(fTmp)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const id = y * N + x
    if (obstacle[id]) { rho[id] = 1; vx[id] = 0; vy[id] = 0; continue }
    let r = 0, ux = 0, uy = 0
    for (let i = 0; i < 9; i++) { r += f[i * N * N + id]; ux += cx[i] * f[i * N * N + id]; uy += cy[i] * f[i * N * N + id] }
    rho[id] = r; if (r > 0) { ux /= r; uy /= r }
    if (x === 0) { ux = maxSpeed; uy = 0; r = 1 }
    if (x === N - 1) { r = rho[y * N + (N - 2)]; ux = vx[y * N + (N - 2)]; uy = vy[y * N + (N - 2)] }
    vx[id] = ux; vy[id] = uy
    for (let i = 0; i < 9; i++) f[i * N * N + id] = f[i * N * N + id] * 0.4 + equilibrium(i, r, ux, uy) * 1.667
  }
}
function updateMesh() {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const id = y * N + x, i3 = id * 3
    const spd = Math.sqrt(vx[id]*vx[id] + vy[id]*vy[id])
    const t = Math.min(spd / maxSpeed, 1)
    colors[i3] = t * 0.2; colors[i3+1] = 0.3 + t * 0.7; colors[i3+2] = 0.7 + t * 0.3
    if (obstacle[id]) { colors[i3] = 0.3; colors[i3+1] = 0.25; colors[i3+2] = 0.2 }
    positions[i3] = (x / N - 0.5) * L; positions[i3+1] = (y / N - 0.5) * L; positions[i3+2] = 0
  }
  meshGeo.attributes.position.needsUpdate = true; meshGeo.attributes.color.needsUpdate = true
}
const info = document.createElement('div')
info.style.cssText = 'position:absolute;top:12px;left:12px;color:#66ddff;font:13px/1.6 monospace;pointer-events:none'
info.innerHTML = '<b>3086 - Lattice Boltzmann D2Q9</b><br>Fluid past cylindrical obstacle<br>Inlet flow from left<br>Color = velocity magnitude'
document.body.appendChild(info)
for (let s = 0; s < 300; s++) simStep()
let frame = 0
function animate() { requestAnimationFrame(animate); if (frame++ % 2 === 0) { simStep(); updateMesh() } renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
