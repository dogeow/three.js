// 3088 - Tsunami Shallow Water Wave Equation
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1a2a)
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 50, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
scene.add(new THREE.AmbientLight(0x6699cc, 0.6))
const sun = new THREE.DirectionalLight(0xffffff, 0.8)
sun.position.set(20, 60, 20); scene.add(sun)
const GRID = 100, L = 80
const h = new Float32Array(GRID * GRID)
const hu = new Float32Array(GRID * GRID)
const hv = new Float32Array(GRID * GRID)
const g = 9.8, dt = 0.04, nu = 0.003
for (let i = 0; i < GRID * GRID; i++) {
  const x = (i % GRID) / GRID - 0.5, y = Math.floor(i / GRID) / GRID - 0.5
  const dist = Math.sqrt(x*x + y*y)
  h[i] = 2.0 * Math.exp(-dist * dist * 40) * 6
}
const bed = new Float32Array(GRID * GRID)
for (let i = 0; i < GRID * GRID; i++) {
  const gx = i % GRID, gy = Math.floor(i / GRID)
  bed[i] = -10 + Math.sin(gx / GRID * Math.PI * 4) * 1.2 + Math.cos(gy / GRID * Math.PI * 3) * 0.8
}
const meshGeo = new THREE.PlaneGeometry(L, L, GRID - 1, GRID - 1)
meshGeo.rotateX(-Math.PI / 2)
const positions = meshGeo.attributes.position.array
const colors = new Float32Array(positions.length)
meshGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
const mesh = new THREE.Mesh(meshGeo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide }))
scene.add(mesh)
const waterSurface = new THREE.Mesh(
  new THREE.PlaneGeometry(L, L, GRID - 1, GRID - 1),
  new THREE.MeshStandardMaterial({ color: 0x2266aa, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
)
waterSurface.rotation.x = -Math.PI / 2
waterSurface.position.z = 0
scene.add(waterSurface)
function idx(x, y) { return y * GRID + x }
function shallowWaterStep() {
  const hNew = new Float32Array(GRID * GRID)
  const huNew = new Float32Array(GRID * GRID)
  const hvNew = new Float32Array(GRID * GRID)
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const i = idx(x, y)
      const iR = idx(x+1, y), iL = idx(x-1, y)
      const iU = idx(x, y+1), iD = idx(x, y-1)
      const H = 12 - bed[i]
      const dHdx = (h[iR] - h[iL]) * 0.5
      const dHdy = (h[iU] - h[iD]) * 0.5
      huNew[i] = hu[i] - dt * (g * dHdx + nu * hu[i])
      hvNew[i] = hv[i] - dt * (g * dHdy + nu * hv[i])
      hNew[i] = h[i] - dt * ((huNew[i] - hu[iL]) + (hvNew[i] - hv[iD])) * 0.5
      hNew[i] = Math.max(-10, hNew[i])
    }
  }
  h.set(hNew); hu.set(huNew); hv.set(hvNew)
  // Add periodic wave pulse
  if (Math.random() < 0.003) {
    const cx2 = Math.floor(GRID * 0.2), cy2 = Math.floor(GRID * 0.5)
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.sqrt(dx*dx + dy*dy)
      if (d < 3) {
        const ix = idx(cx2 + dx, cy2 + dy)
        if (ix >= 0 && ix < GRID * GRID) h[ix] += 4 * Math.exp(-d*d)
      }
    }
  }
}
function updateMesh() {
  const maxH = 8
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = idx(x, y), i3 = i * 3
      const waterH = Math.max(0, h[i])
      colors[i3] = 0.1 + waterH / maxH * 0.3
      colors[i3+1] = 0.3 + waterH / maxH * 0.4
      colors[i3+2] = 0.6 + waterH / maxH * 0.3
      if (bed[i] + h[i] < -8) { colors[i3] = 0.1; colors[i3+1] = 0.08; colors[i3+2] = 0.06 }
      positions[i3] = (x / GRID - 0.5) * L
      positions[i3+1] = bed[i] + h[i]
      positions[i3+2] = (y / GRID - 0.5) * L
    }
  }
  meshGeo.attributes.position.needsUpdate = true; meshGeo.attributes.color.needsUpdate = true; meshGeo.computeVertexNormals()
}
const info = document.createElement('div')
info.style.cssText = 'position:absolute;top:12px;left:12px;color:#88ccff;font:13px/1.6 monospace;pointer-events:none'
info.innerHTML = '<b>3088 - Tsunami Shallow Water Wave</b><br>2D shallow water equations (SWE)<br>Random tsunami pulses spawn<br>Rotate camera for 3D view'
document.body.appendChild(info)
for (let s = 0; s < 200; s++) shallowWaterStep()
let frame = 0
function animate() { requestAnimationFrame(animate); if (frame++ % 2 === 0) { shallowWaterStep(); updateMesh() } controls.update(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
