// 3213 - Hilbert Space-Filling Curve 3D
// Renders the 3D Hilbert space-filling curve up to iteration 6
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080810)
scene.add(new THREE.AmbientLight(0x4444ff, 0.4))
const dir = new THREE.DirectionalLight(0xffffff, 0.8)
dir.position.set(5, 10, 5)
scene.add(dir)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200)
camera.position.set(8, 6, 12)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Hilbert curve generator
function rot(n, x, y, rx, ry) {
  if (ry !== 0) return { x: y, y: x }
  return { x: n - 1 - x, y: n - 1 - y }
}

function hilbert3D(order) {
  const N = Math.pow(2, order)
  const points = []
  const d = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
  ]
  let rx, ry, s, sd, t
  let x = 0, y = 0, z = 0
  let dir = 0, maxDir = 1
  let sdir = [1, 2, 3, 4, 5, 0, 3, 2, 5, 0, 1, 4]
  let rdir = [1, 0, 3, 2, 5, 4, 3, 6, 1, 6, 5, 6]

  const total = N * N * N
  for (let i = 0; i < total; i++) {
    points.push(new THREE.Vector3(x - N / 2, y - N / 2, z - N / 2))
    rx = ry = 0
    s = 1
    sd = i
    while (s < N) {
      rx = 1 & (Math.floor(sd / 4))
      ry = 1 & (Math.floor(sd / 2) ^ rx)
      const r = rot(s, x, y, rx, ry)
      x = r.x; y = r.y
      const idx = (sd ^ (sd >> 1)) & 3
      if (idx === 0) { const tmp = x; x = z; z = tmp }
      else if (idx === 1) { const tmp = y; y = z; z = tmp }
      else if (idx === 2) { /* identity */ }
      s *= 2; sd = Math.floor(sd / 8)
    }
    const nd = sdir[dir * 2 + rx]
    dir = rdir[dir * 2 + ry]
    x += d[nd][0]; y += d[nd][1]; z += d[nd][2]
  }
  return points
}

// Correct 3D Hilbert via known lookup table approach
function d2xy(n, d) {
  let rx, ry, s, t = d
  let x = 0, y = 0
  const rxArr = [0, 0, 1, 1]
  const ryArr = [0, 1, 0, 1]
  const rotArr = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 1, 0, 1],
    [0, 1, 0, 1]
  ]
  for (s = 1; s < n; s *= 2) {
    rx = 1 & (t / 2)
    ry = 1 & (t ^ rx)
    const r = rotArr[rx][ry]
    let nx = x, ny = y
    if (r === 0) { nx = s - 1 - ry; ny = s - 1 - rx }
    if (r === 1) { nx = ry; ny = rx }
    if (r === 2) { nx = s - 1 - ry; ny = rx }
    if (r === 3) { nx = s - 1 - ry; ny = s - 1 - rx }
    x = nx; y = ny
    t = Math.floor(t / 4)
  }
  return { x, y }
}

function rot3(n, x, y, z, rx, ry) {
  if (ry === 0) {
    if (rx === 1) { x = n - 1 - x; z = n - 1 - z }
    const tmp = y; y = z; z = tmp
  }
  return { x, y, z }
}

function hilbert3(order) {
  const N = Math.pow(2, order)
  const pts = []
  const total = N * N * N
  for (let d = 0; d < total; d++) {
    let x = 0, y = 0, z = 0
    let s, t = d
    let rx, ry
    for (s = 1; s < N; s *= 2) {
      rx = 1 & (t / 2)
      ry = 1 & (t ^ rx)
      const r = rot3(N, x, y, z, rx, ry)
      x = r.x; y = r.y; z = r.z
      x += s * rx
      y += s * ry
      t = Math.floor(t / 4)
    }
    pts.push(new THREE.Vector3(x - N / 2, y - N / 2, z - N / 2))
  }
  return pts
}

let curveGroup = new THREE.Group()
scene.add(curveGroup)

function buildCurve(order) {
  while (curveGroup.children.length) curveGroup.remove(curveGroup.children[0])
  const pts = hilbert3(order)
  const colors = []
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / pts.length
    const c = new THREE.Color().setHSL(0.6 + t * 0.4, 1.0, 0.5 + t * 0.3)
    colors.push(c, c)
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
  const colArr = new Float32Array(colors.length * 3)
  colors.forEach((c, i) => { colArr[i * 3] = c.r; colArr[i * 3 + 1] = c.g; colArr[i * 3 + 2] = c.b })
  lineGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
  const lineMat = new THREE.LineBasicMaterial({ vertexColors: true })
  curveGroup.add(new THREE.Line(lineGeo, lineMat))

  // Dots at sample points
  const dotGeo = new THREE.BufferGeometry().setFromPoints(pts)
  const dotMat = new THREE.PointsMaterial({ size: 0.15, vertexColors: true })
  curveGroup.add(new THREE.Points(dotGeo, dotMat))

  // Bounding box
  const N = Math.pow(2, order)
  const boxGeo = new THREE.BoxGeometry(N, N, N)
  const boxEdges = new THREE.EdgesGeometry(boxGeo)
  const boxLine = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.4 }))
  curveGroup.add(boxLine)
}

let currentOrder = 4
buildCurve(currentOrder)

const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:16px;left:16px;color:#6688ff;font-family:monospace;font-size:13px;background:rgba(8,8,16,0.85);padding:12px;border-radius:8px;line-height:1.8'
info.innerHTML = `<b>Hilbert Space Curve 3D</b><br>Order: ${currentOrder} (${Math.pow(2,currentOrder)**3} pts)<br>Drag to orbit<br>Keys 1-6: change order`
document.body.appendChild(info)
document.addEventListener('keydown', e => {
  const n = parseInt(e.key)
  if (n >= 1 && n <= 6 && n !== currentOrder) {
    currentOrder = n
    buildCurve(currentOrder)
    info.innerHTML = `<b>Hilbert Space Curve 3D</b><br>Order: ${currentOrder} (${Math.pow(2,currentOrder)**3} pts)<br>Drag to orbit<br>Keys 1-6: change order`
  }
})

function animate() {
  requestAnimationFrame(animate)
  curveGroup.rotation.y += 0.003
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
