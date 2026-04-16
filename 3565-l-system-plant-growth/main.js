// 3565 L-System Plant Growth
// 使用 L-System 规则生成程序化植物
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a2a1a)
scene.fog = new THREE.FogExp2(0x1a2a1a, 0.02)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 12, 30)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// L-System 解释器
const RULES = { 'X': 'F+[[X]-X]-F[-FX]+X', 'F': 'FF' }
const AXIOM = 'X'
const ANGLE_STEP = 25 * Math.PI / 180
const LEN_FACTOR = 0.9

function lsystem(axiom, rules, iterations) {
  let result = axiom
  for (let i = 0; i < iterations; i++) {
    let next = ''
    for (const ch of result) next += rules[ch] || ch
    result = next
  }
  return result
}

function buildPlant(ls, startPos, startAngle, segLen) {
  const points = [startPos.clone()]
  const stack = []
  let pos = startPos.clone()
  let angle = startAngle
  let curLen = segLen
  for (const ch of ls) {
    if (ch === 'F') {
      const nx = pos.x + Math.sin(angle) * curLen
      const ny = pos.y + Math.cos(angle) * curLen
      pos.set(nx, ny, pos.z)
      points.push(pos.clone())
      curLen *= LEN_FACTOR
    } else if (ch === '+') angle += ANGLE_STEP
    else if (ch === '-') angle -= ANGLE_STEP
    else if (ch === '[') { stack.push({ pos: pos.clone(), angle, len: curLen }) }
    else if (ch === ']') {
      const s = stack.pop()
      pos.copy(s.pos); angle = s.angle; curLen = s.len
      points.push(pos.clone()); points.push(pos.clone())
    }
  }
  return points
}

function makeLine(pts, color, radius) {
  if (pts.length < 2) return null
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color })
  const line = new THREE.Line(geo, mat)
  const mesh = new THREE.LineSegments(geo, mat)
  // 替换为管状体以增加厚度
  const curve = new THREE.CatmullRomCurve3(pts, false)
  const tubeGeo = new THREE.TubeGeometry(curve, pts.length * 2, radius, 6, false)
  const tubeMesh = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }))
  tubeMesh.castShadow = true
  return tubeMesh
}

// 地面
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(60, 64),
  new THREE.MeshStandardMaterial({ color: 0x2d4a2d, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.1
ground.receiveShadow = true
scene.add(ground)

// 光照
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const sun = new THREE.DirectionalLight(0xfff5e0, 1.2)
sun.position.set(20, 40, 20)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
scene.add(sun)

// 生成参数
let depth = 4
let segLen = 3.5
const group = new THREE.Group()
const plantString = lsystem(AXIOM, RULES, depth)
const stemPts = buildPlant(plantString, new THREE.Vector3(0, 0, 0), 0, segLen)
const stem = makeLine(stemPts, 0x5a3a1a, 0.12)
if (stem) group.add(stem)
// 叶子（附加小球）
const leafPts = buildPlant(plantString, new THREE.Vector3(0, 0, 0), 0, segLen * 0.7)
const leafGeo = new THREE.SphereGeometry(0.3, 6, 4)
const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 0.7 })
leafPts.forEach((p, i) => {
  if (i % 7 === 0) {
    const lf = new THREE.Mesh(leafGeo, leafMat)
    lf.position.copy(p)
    lf.castShadow = true
    group.add(lf)
  }
})
group.position.y = 0
scene.add(group)

// UI
const div = document.createElement('div')
div.style.cssText = 'position:fixed;top:16px;left:16px;color:#fff;font:14px monospace;background:rgba(0,0,0,0.6);padding:12px;border-radius:8px'
div.innerHTML = 'L-System Plant Growth<br>Depth: <input id=sd type=range min=2 max=6 value=4> <span id=sdv>4</span><br>按 R 键重置视角'
document.body.appendChild(div)
document.getElementById('sd').oninput = e => {
  document.getElementById('sdv').textContent = e.target.value
  depth = +e.target.value
  group.clear()
  const ps = lsystem(AXIOM, RULES, depth)
  const s = makeLine(buildPlant(ps, new THREE.Vector3(0,0,0), 0, segLen), 0x5a3a1a, 0.12)
  if (s) group.add(s)
}
controls.target.set(0, 5, 0)
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight) })
