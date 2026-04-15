// 3323. Double Helix — DNA双螺旋，生物大分子三维结构
// type: double-helix
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x010208)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 20, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.8

// DNA参数
const numTurns = 10
const basePairs = numTurns * 10  // 每圈10个碱基对
const helixRadius = 3.5
const pitch = 3.0  // 每圈高度
const totalHeight = numTurns * pitch

// 碱基对颜色
const baseColors = {
  A: 0x44dd44,  // 腺嘌呤 绿
  T: 0xdd4444,  // 胸腺嘧啶 红
  G: 0x4488ff,  // 鸟嘌呤 蓝
  C: 0xffaa00   // 胞嘧啶 橙
}

const dnaGroup = new THREE.Group()

// 创建一条螺旋链
function createHelixStrand(color, offset) {
  const points = []
  for (let i = 0; i <= basePairs; i++) {
    const t = i / basePairs
    const angle = t * numTurns * Math.PI * 2 + offset
    const y = t * totalHeight - totalHeight / 2
    const x = Math.cos(angle) * helixRadius
    const z = Math.sin(angle) * helixRadius
    points.push(new THREE.Vector3(x, y, z))
  }
  
  const curve = new THREE.CatmullRomCurve3(points)
  const tubeGeo = new THREE.TubeGeometry(curve, basePairs * 2, 0.3, 8, false)
  const tubeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 })
  const tube = new THREE.Mesh(tubeGeo, tubeMat)
  dnaGroup.add(tube)
  
  // 糖-磷酸骨架球
  for (let i = 0; i <= basePairs; i += 2) {
    const t = i / basePairs
    const angle = t * numTurns * Math.PI * 2 + offset
    const y = t * totalHeight - totalHeight / 2
    const x = Math.cos(angle) * helixRadius
    const z = Math.sin(angle) * helixRadius
    const sphereGeo = new THREE.SphereGeometry(0.4, 12, 12)
    const sphere = new THREE.Mesh(sphereGeo, tubeMat.clone())
    sphere.position.set(x, y, z)
    dnaGroup.add(sphere)
  }
}

// 两条互补链
createHelixStrand(0x4488ff, 0)   // 蓝色骨架
createHelixStrand(0xff44aa, Math.PI)  // 粉色骨架

// 碱基对
const basePairTypes = [['A', 'T'], ['T', 'A'], ['G', 'C'], ['C', 'G']]
for (let i = 0; i < basePairs; i++) {
  const t = i / basePairs
  const angle = t * numTurns * Math.PI * 2
  const y = t * totalHeight - totalHeight / 2
  
  const [b1, b2] = basePairTypes[i % basePairTypes.length]
  const x1 = Math.cos(angle) * helixRadius
  const z1 = Math.sin(angle) * helixRadius
  const x2 = Math.cos(angle + Math.PI) * helixRadius
  const z2 = Math.sin(angle + Math.PI) * helixRadius
  
  // 碱基对连接棒
  const midX = (x1 + x2) / 2
  const midZ = (z1 + z2) / 2
  const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2)
  
  const barGeo = new THREE.CylinderGeometry(0.15, 0.15, len * 0.7, 8)
  const barMat = new THREE.MeshStandardMaterial({ 
    color: len > 5 ? 0x44ff44 : 0xff4444, 
    emissive: len > 5 ? 0x003300 : 0x330000 
  })
  const bar = new THREE.Mesh(barGeo, barMat)
  bar.position.set(midX, y, midZ)
  bar.rotation.z = Math.PI / 2
  bar.rotation.y = -angle
  dnaGroup.add(bar)
  
  // 碱基球（末端）
  for (const [bx, bz, base, col] of [[x1, z1, b1, baseColors[b1]], [x2, z2, b2, baseColors[b2]]]) {
    const bGeo = new THREE.SphereGeometry(0.5, 12, 12)
    const bMat = new THREE.MeshStandardMaterial({ 
      color: col, 
      emissive: col, 
      emissiveIntensity: 0.3,
      roughness: 0.2 
    })
    const bMesh = new THREE.Mesh(bGeo, bMat)
    bMesh.position.set(bx, y, bz)
    dnaGroup.add(bMesh)
  }
}

scene.add(dnaGroup)

// 标签
const labelCanvas = document.createElement('canvas')
labelCanvas.width = 256
labelCanvas.height = 64
const lctx = labelCanvas.getContext('2d')
lctx.fillStyle = '#224466'
lctx.font = 'bold 24px monospace'
lctx.fillText('DNA Double Helix', 10, 42)
const labelTex = new THREE.CanvasTexture(labelCanvas)
const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }))
label.position.set(0, totalHeight / 2 + 5, 0)
label.scale.set(16, 4, 1)
scene.add(label)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)
const pLight = new THREE.PointLight(0x4488ff, 2, 60)
pLight.position.set(-10, 0, 10)
scene.add(pLight)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  dnaGroup.rotation.y = t * 0.3
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
