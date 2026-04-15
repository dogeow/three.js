// 3324. Topology — 拓扑曲面可视化，莫比乌斯环与Klein瓶
// type: topology
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 5, 25)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 莫比乌斯环参数方程
function mobiusPoint(u, v) {
  const u2 = u * Math.PI  // 0 to π
  const r = 5
  const x = (r + v * Math.cos(u2 / 2)) * Math.cos(u2)
  const y = (r + v * Math.cos(u2 / 2)) * Math.sin(u2)
  const z = v * Math.sin(u2 / 2)
  return new THREE.Vector3(x, y, z)
}

const mobiusGeo = new THREE.BufferGeometry()
const mobiusVerts = []
const mobiusNorms = []
const mobiusUvs = []
const mobiusIndices = []
const segmentsU = 100
const segmentsV = 10

for (let iu = 0; iu <= segmentsU; iu++) {
  for (let iv = 0; iv <= segmentsV; iv++) {
    const u = (iu / segmentsU) * Math.PI * 2
    const v = (iv / segmentsV - 0.5) * 2.5
    const p = mobiusPoint(u, v)
    mobiusVerts.push(p.x, p.y, p.z)
    
    // 法线（数值计算）
    const eps = 0.001
    const pu1 = mobiusPoint(u + eps, v)
    const pu2 = mobiusPoint(u - eps, v)
    const pv1 = mobiusPoint(u, v + eps)
    const pv2 = mobiusPoint(u, v - eps)
    const du = pu1.clone().sub(pu2).normalize()
    const dv = pv1.clone().sub(pv2).normalize()
    const n = du.cross(dv).normalize()
    mobiusNorms.push(n.x, n.y, n.z)
    mobiusUvs.push(iu / segmentsU, iv / segmentsV)
  }
}

for (let iu = 0; iu < segmentsU; iu++) {
  for (let iv = 0; iv < segmentsV; iv++) {
    const a = iu * (segmentsV + 1) + iv
    const b = a + 1
    const c = a + segmentsV + 1
    const d = c + 1
    mobiusIndices.push(a, c, b)
    mobiusIndices.push(b, c, d)
  }
}

mobiusGeo.setAttribute('position', new THREE.Float32BufferAttribute(mobiusVerts, 3))
mobiusGeo.setAttribute('normal', new THREE.Float32BufferAttribute(mobiusNorms, 3))
mobiusGeo.setAttribute('uv', new THREE.Float32BufferAttribute(mobiusUvs, 2))
mobiusGeo.setIndex(mobiusIndices)

const mobiusMat = new THREE.MeshStandardMaterial({
  color: 0x8844ff,
  side: THREE.DoubleSide,
  metalness: 0.4,
  roughness: 0.3,
  wireframe: false
})
const mobiusMesh = new THREE.Mesh(mobiusGeo, mobiusMat)
scene.add(mobiusMesh)

// 彩色边缘线（显示莫比乌斯环的单面性）
const edgePoints = []
for (let i = 0; i <= 200; i++) {
  const u = (i / 200) * Math.PI * 2
  const p = mobiusPoint(u, 0)
  edgePoints.push(p)
}
const edgeCurve = new THREE.CatmullRomCurve3(edgePoints, true)
const edgeGeo = new THREE.TubeGeometry(edgeCurve, 200, 0.08, 8, true)
const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa })
const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat)
scene.add(edgeMesh)

// 第二条边（着色区分）
const edgePoints2 = []
for (let i = 0; i <= 200; i++) {
  const u = (i / 200) * Math.PI * 2
  const p = mobiusPoint(u, 1.2)
  edgePoints2.push(p)
}
const edgeCurve2 = new THREE.CatmullRomCurve3(edgePoints2, true)
const edgeGeo2 = new THREE.TubeGeometry(edgeCurve2, 200, 0.08, 8, true)
const edgeMat2 = new THREE.MeshBasicMaterial({ color: 0xff4488 })
const edgeMesh2 = new THREE.Mesh(edgeGeo2, edgeMat2)
scene.add(edgeMesh2)

// Klein瓶（简化的参数曲面 - 8字形内翻转）
const kleinGeo = new THREE.BufferGeometry()
const kleinVerts = []
const kleinNorms = []
const kleinIndices = []

const segK = 80
for (let i = 0; i < segK; i++) {
  for (let j = 0; j < segK; j++) {
    const u = (i / segK) * Math.PI * 2
    const v = (j / segK) * Math.PI * 2
    
    // 克莱茵瓶参数方程（管状形式）
    const r = 2.5
    const x = (r + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.cos(u)
    const y = (r + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.sin(u)
    const z = Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v)
    
    kleinVerts.push(x * 1.5 - 12, y * 1.5, z * 1.5)
    
    const eps = 0.01
    // approximate normal
    const u2 = ((i + 1) / segK) * Math.PI * 2
    const v2 = ((j + 1) / segK) * Math.PI * 2
    kleinNorms.push(0, 1, 0)  // placeholder
  }
}

for (let i = 0; i < segK - 1; i++) {
  for (let j = 0; j < segK - 1; j++) {
    const a = i * segK + j
    const b = a + 1
    const c = a + segK
    const d = c + 1
    kleinIndices.push(a, c, b)
    kleinIndices.push(b, c, d)
  }
}

kleinGeo.setAttribute('position', new THREE.Float32BufferAttribute(kleinVerts, 3))
kleinGeo.setIndex(kleinIndices)
kleinGeo.computeVertexNormals()

const kleinMat = new THREE.MeshStandardMaterial({
  color: 0xff8844,
  side: THREE.DoubleSide,
  metalness: 0.3,
  roughness: 0.4,
  transparent: true,
  opacity: 0.85
})
const kleinMesh = new THREE.Mesh(kleinGeo, kleinMat)
kleinMesh.position.x = -12
scene.add(kleinMesh)

// 标签
const labelStyle = 'position:fixed;font-family:monospace;font-size:12px;color:#aaa;background:rgba(0,0,0,0.6);padding:4px 8px;border-radius:4px;z-index:100'

const mobiusLabel = document.createElement('div')
mobiusLabel.style.cssText = labelStyle
mobiusLabel.textContent = 'Möbius Strip (单面)'
mobiusLabel.style.left = '30%'
mobiusLabel.style.top = '15px'
document.body.appendChild(mobiusLabel)

const kleinLabel = document.createElement('div')
kleinLabel.style.cssText = labelStyle
kleinLabel.textContent = 'Klein Bottle (不可定向)'
kleinLabel.style.left = '5%'
kleinLabel.style.top = '15px'
document.body.appendChild(kleinLabel)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)
const pLight1 = new THREE.PointLight(0x8844ff, 2, 30)
pLight1.position.set(5, 5, 5)
scene.add(pLight1)
const pLight2 = new THREE.PointLight(0xff8844, 2, 30)
pLight2.position.set(-17, 0, 5)
scene.add(pLight2)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  mobiusMesh.rotation.y = t * 0.3
  mobiusMesh.rotation.x = Math.sin(t * 0.2) * 0.2
  edgeMesh.rotation.y = t * 0.3
  edgeMesh2.rotation.y = t * 0.3
  kleinMesh.rotation.y = -t * 0.2
  kleinMesh.rotation.z = t * 0.15
  pLight1.intensity = 1.5 + Math.sin(t * 2) * 0.5
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
