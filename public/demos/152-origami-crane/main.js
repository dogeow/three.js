import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0f)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(4, 6, 12)
camera.lookAt(0, 1, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.autoRotate = true
controls.autoRotateSpeed = 0.8
controls.minDistance = 5
controls.maxDistance = 25
controls.maxPolarAngle = Math.PI * 0.78
controls.target.set(0, 1, 0)

// Lighting
scene.add(new THREE.AmbientLight(0xfff8f0, 0.8))

const sun = new THREE.DirectionalLight(0xfff5e0, 1.6)
sun.position.set(6, 14, 8)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 40
sun.shadow.camera.left = -12
sun.shadow.camera.right = 12
sun.shadow.camera.top = 12
sun.shadow.camera.bottom = -12
sun.shadow.bias = -0.001
scene.add(sun)

const fill = new THREE.DirectionalLight(0xc0d8ff, 0.5)
fill.position.set(-6, 4, -6)
scene.add(fill)

// Shadow catcher ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.ShadowMaterial({ opacity: 0.2 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.01
ground.receiveShadow = true
scene.add(ground)

// ── Paper material ──────────────────────────────────────────────────────────
const paperMat = new THREE.MeshStandardMaterial({
  color: 0xfaf8f2,
  roughness: 0.9,
  metalness: 0.0,
  side: THREE.DoubleSide,
})

const paperEdgeMat = new THREE.MeshStandardMaterial({
  color: 0xe8e4d8,
  roughness: 0.95,
  metalness: 0.0,
})

// ── Helper: create a flat triangular face ───────────────────────────────────
function makeTriangle(p0, p1, p2, yOffset = 0, color = 0xfaf8f2) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  })
  const geo = new THREE.BufferGeometry()
  const v = [
    p0[0], p0[1] + yOffset, p0[2],
    p1[0], p1[1] + yOffset, p1[2],
    p2[0], p2[1] + yOffset, p2[2],
  ]
  const idx = [0, 1, 2, 2, 1, 0]
  const nrm = new Float32Array(9)
  const uv = new Float32Array([0, 0, 1, 0, 0.5, 1])
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  return mesh
}

// ── Helper: create edge strip between two line segments ─────────────────────
function makeEdge(p0, p1, p2, p3, yOffset = 0, thickness = 0.006) {
  const dirA = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
  const dirB = new THREE.Vector3(p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2])
  const angle = dirA.angleTo(dirB)
  const axis = new THREE.Vector3().crossVectors(dirA, dirB).normalize()
  const geo = new THREE.BoxGeometry(1, 1, 1)
  geo.applyMatrix4(new THREE.Matrix4().makeRotationFromAxisAngle(axis || new THREE.Vector3(1,0,0), angle / 2))
  const mat = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.95 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  return mesh
}

// ── Crane geometry (parts array) ─────────────────────────────────────────────
// Each part: { mesh, restPos, restRot, foldPos, foldRot, pivot }
// "rest" = fully folded crane pose, "fold" = flat sheet pose

const craneGroup = new THREE.Group()
scene.add(craneGroup)

// ─── Wing (left) ─────────────────────────────────────────────────────────────
// A large flat isosceles triangle. Final pose: tilted upward on X axis.
const leftWingGroup = new THREE.Group()
leftWingGroup.position.set(-1.2, 0, 0)
craneGroup.add(leftWingGroup)

const leftWingMesh = makeTriangle(
  [-3.0, 0, 0],  // outer tip
  [-1.2, 0, 0],  // body connection
  [-1.2, 0, 1.8] // body rear
)
leftWingMesh.material.color.set(0xf0ece0)
leftWingGroup.add(leftWingMesh)

// Wing underside
const leftWingUnder = makeTriangle(
  [-3.0, 0.01, 0],
  [-1.2, 0.01, 1.8],
  [-1.2, 0.01, 0]
)
leftWingUnder.material.color.set(0xe4e0d4)
leftWingUnder.material.side = THREE.FrontSide
leftWingGroup.add(leftWingUnder)

// ─── Wing (right) ─────────────────────────────────────────────────────────────
const rightWingGroup = new THREE.Group()
rightWingGroup.position.set(1.2, 0, 0)
craneGroup.add(rightWingGroup)

const rightWingMesh = makeTriangle(
  [3.0, 0, 0],
  [1.2, 0, 0],
  [1.2, 0, 1.8]
)
rightWingMesh.material.color.set(0xf5f1e8)
rightWingGroup.add(rightWingMesh)

const rightWingUnder = makeTriangle(
  [3.0, 0.01, 0],
  [1.2, 0.01, 0],
  [1.2, 0.01, 1.8]
)
rightWingUnder.material.color.set(0xe4e0d4)
rightWingGroup.add(rightWingUnder)

// ─── Body ─────────────────────────────────────────────────────────────────────
// Two triangles forming a diamond/rhombus: front body (toward neck) + rear body (toward tail)
const bodyGroup = new THREE.Group()
craneGroup.add(bodyGroup)

// Front body triangle (narrower toward neck)
const bodyFrontMesh = makeTriangle(
  [-1.2, 0, 1.8],  // left rear
  [1.2, 0, 1.8],   // right rear
  [0, 0, 0.2]      // front (neck connection)
)
bodyFrontMesh.material.color.set(0xfaf8f2)
bodyGroup.add(bodyFrontMesh)

const bodyFrontUnder = makeTriangle(
  [-1.2, 0.01, 1.8],
  [0, 0.01, 0.2],
  [1.2, 0.01, 1.8]
)
bodyFrontUnder.material.color.set(0xeae6da)
bodyGroup.add(bodyFrontUnder)

// Rear body triangle (toward tail)
const bodyRearMesh = makeTriangle(
  [-1.2, 0, 1.8],  // left rear
  [1.2, 0, 1.8],   // right rear
  [0, 0, 3.2]      // tail tip
)
bodyRearMesh.material.color.set(0xf2eee6)
bodyGroup.add(bodyRearMesh)

const bodyRearUnder = makeTriangle(
  [-1.2, 0.01, 1.8],
  [0, 0.01, 3.2],
  [1.2, 0.01, 1.8]
)
bodyRearUnder.material.color.set(0xdcd8cc)
bodyGroup.add(bodyRearUnder)

// ─── Neck ─────────────────────────────────────────────────────────────────────
const neckGroup = new THREE.Group()
neckGroup.position.set(0, 0, 0.2)
craneGroup.add(neckGroup)

// Neck: narrow trapezoid-like shape made of 2 triangles
const neckFrontMesh = makeTriangle(
  [-0.3, 0, 0],    // base left
  [0.3, 0, 0],     // base right
  [0, 0, 1.4]       // neck tip (head connection)
)
neckFrontMesh.material.color.set(0xfaf8f2)
neckGroup.add(neckFrontMesh)

const neckRearMesh = makeTriangle(
  [-0.3, 0.01, 0],
  [0, 0.01, 1.4],
  [0.3, 0.01, 0]
)
neckRearMesh.material.color.set(0xe8e4d8)
neckGroup.add(neckRearMesh)

// ─── Head ─────────────────────────────────────────────────────────────────────
const headGroup = new THREE.Group()
headGroup.position.set(0, 0, 1.4)
craneGroup.add(headGroup)

// Head: small triangle with a point (beak)
const headMesh = makeTriangle(
  [-0.35, 0, 0],
  [0.35, 0, 0],
  [0, 0, 0.5]
)
headMesh.material.color.set(0xfaf8f1)
headGroup.add(headMesh)

const headUnder = makeTriangle(
  [-0.35, 0.01, 0],
  [0, 0.01, 0.5],
  [0.35, 0.01, 0]
)
headUnder.material.color.set(0xe2ded2)
headGroup.add(headUnder)

// Beak tip
const beakMesh = makeTriangle(
  [-0.1, 0, 0],
  [0.1, 0, 0],
  [0, 0, 0.2]
)
beakMesh.material.color.set(0xf0ece0)
headGroup.add(beakMesh)

// ─── Tail ─────────────────────────────────────────────────────────────────────
const tailGroup = new THREE.Group()
tailGroup.position.set(0, 0, 3.2)
craneGroup.add(tailGroup)

const tailMesh = makeTriangle(
  [-0.5, 0, 0],
  [0.5, 0, 0],
  [0, 0, 1.2]
)
tailMesh.material.color.set(0xf5f1e6)
tailGroup.add(tailMesh)

const tailUnder = makeTriangle(
  [-0.5, 0.01, 0],
  [0, 0.01, 1.2],
  [0.5, 0.01, 0]
)
tailUnder.material.color.set(0xdcd8cc)
tailGroup.add(tailUnder)

// ─── Fold targets ─────────────────────────────────────────────────────────────
// For each group: { pos, rot } at rest (folded) and fold (flat)
const parts = [
  {
    group: leftWingGroup,
    rest: { pos: [0, 0, 0], rot: [-0.35, 0.1, -0.08] },
    fold: { pos: [0, -0.05, 0.8], rot: [Math.PI * 0.5, 0.05, 0.0] },
    pivot: [0, 0, 0],
  },
  {
    group: rightWingGroup,
    rest: { pos: [0, 0, 0], rot: [-0.35, -0.1, 0.08] },
    fold: { pos: [0, -0.05, 0.8], rot: [Math.PI * 0.5, -0.05, 0.0] },
    pivot: [0, 0, 0],
  },
  {
    group: bodyGroup,
    rest: { pos: [0, 0.12, 0], rot: [0, 0, 0] },
    fold: { pos: [0, -0.03, 0], rot: [0, 0, 0] },
    pivot: [0, 0, 0],
  },
  {
    group: neckGroup,
    rest: { pos: [0, 0.15, 0], rot: [-0.25, 0, 0] },
    fold: { pos: [0, -0.04, 0], rot: [Math.PI * 0.5, 0, 0] },
    pivot: [0, 0, 0],
  },
  {
    group: headGroup,
    rest: { pos: [0, 0.3, 0], rot: [-0.3, 0, 0] },
    fold: { pos: [0, -0.04, 0], rot: [Math.PI * 0.5, 0, 0] },
    pivot: [0, 0, 0],
  },
  {
    group: tailGroup,
    rest: { pos: [0, 0.15, 0], rot: [0.2, 0, 0] },
    fold: { pos: [0, -0.04, 0], rot: [Math.PI * 0.5, 0, 0] },
    pivot: [0, 0, 0],
  },
]

// Interpolate helper
function lerpV3(a, b, t) {
  return a.map((v, i) => v + (b[i] - v) * t)
}
function lerpAngle(a, b, t) {
  return a + (b - a) * t
}

function applyPartState(part, t) {
  const { group, rest, fold } = part
  const pos = lerpV3(fold.pos, rest.pos, t)
  const rx = lerpAngle(fold.rot[0], rest.rot[0], t)
  const ry = lerpAngle(fold.rot[1], rest.rot[1], t)
  const rz = lerpAngle(fold.rot[2], rest.rot[2], t)
  group.position.set(...pos)
  group.rotation.set(rx, ry, rz)
}

// Smooth easing
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ─── Animation state ──────────────────────────────────────────────────────────
let progress = 0         // 0 = flat, 1 = folded
let direction = 1       // 1 = folding, -1 = unfolding
let speed = 1.0
const BASE_DURATION = 8  // seconds at speed=1

const clock = new THREE.Clock()

// ─── UI ───────────────────────────────────────────────────────────────────────
const ui = document.createElement('div')
ui.style.cssText = `
  position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:16px;
  background:rgba(10,10,15,0.85);border:1px solid rgba(255,255,255,0.12);
  border-radius:12px;padding:12px 20px;backdrop-filter:blur(8px);
  font-family:system-ui,sans-serif;color:rgba(255,255,255,0.7);font-size:13px;
`
ui.innerHTML = `
  <button id="toggleBtn" style="
    background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
    color:#fff;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:14px;
  ">Fold</button>
  <div style="display:flex;align-items:center;gap:10px;">
    <span>Speed</span>
    <input type="range" id="speedSlider" min="0.2" max="4" step="0.1" value="1" style="
      -webkit-appearance:none;width:100px;height:4px;border-radius:2px;
      background:rgba(255,255,255,0.15);outline:none;
    " />
  </div>
`
document.body.appendChild(ui)

document.getElementById('toggleBtn').addEventListener('click', () => {
  direction *= -1
  document.getElementById('toggleBtn').textContent = direction > 0 ? '展开' : '折叠'
})

document.getElementById('speedSlider').addEventListener('input', (e) => {
  speed = parseFloat(e.target.value)
})

// Tip label
const tip = document.createElement('div')
tip.style.cssText = `
  position:fixed;top:20px;left:20px;
  background:rgba(10,10,15,0.85);border:1px solid rgba(255,255,255,0.12);
  border-radius:8px;padding:12px 16px;color:rgba(255,255,255,0.7);
  font-size:13px;max-width:220px;line-height:1.5;backdrop-filter:blur(8px);
  font-family:system-ui,sans-serif;
`
tip.innerHTML = '<strong style="display:block;color:#fff;margin-bottom:4px">折纸仙鹤</strong>动画纸鹤。拖动旋转，滚轮缩放。'
document.body.appendChild(tip)

// ─── Animation loop ───────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate)

  const delta = Math.min(clock.getDelta(), 0.05)
  const deltaProgress = (delta / BASE_DURATION) * speed

  progress += deltaProgress * direction
  progress = Math.max(0, Math.min(1, progress))

  const t = easeInOut(progress)

  for (const part of parts) {
    applyPartState(part, t)
  }

  // Subtle hover animation when fully folded
  if (progress > 0.98) {
    const hover = Math.sin(clock.getElapsedTime() * 1.2) * 0.06
    craneGroup.position.y = hover
  } else {
    craneGroup.position.y = 0
  }

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
