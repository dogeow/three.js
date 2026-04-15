// 2145. 程序化地形LOD
// 程序化地形多级细节 - 增强版
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1628)
scene.fog = new THREE.FogExp2(0x0a1628, 0.008)
const camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 2000)
camera.position.set(80, 50, 80)
camera.lookAt(0, 0, 0)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1
controls.minDistance = 20
controls.maxDistance = 300

// 光照系统
scene.add(new THREE.AmbientLight(0x4a6fa5, 0.4))
const sun = new THREE.DirectionalLight(0xffeedd, 1.2)
sun.position.set(100, 150, 80)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 10
sun.shadow.camera.far = 500
sun.shadow.camera.left = -150
sun.shadow.camera.right = 150
sun.shadow.camera.top = 150
sun.shadow.camera.bottom = -150
sun.shadow.bias = -0.0005
scene.add(sun)
const fillLight = new THREE.DirectionalLight(0x6688cc, 0.3)
fillLight.position.set(-50, 30, -50)
scene.add(fillLight)

// 地形生成函数
function generateTerrain(size, segs, heightScale) {
  const geo = new THREE.PlaneGeometry(size, size, segs, segs)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    // 多层噪声叠加
    let h = 0
    h += Math.sin(x * 0.05) * Math.cos(y * 0.05) * heightScale * 0.5
    h += Math.sin(x * 0.1 + 1) * Math.cos(y * 0.08 + 2) * heightScale * 0.3
    h += Math.sin(x * 0.2 + y * 0.15) * heightScale * 0.15
    h += (Math.random() - 0.5) * heightScale * 0.1
    pos.setZ(i, h)
  }
  geo.computeVertexNormals()
  return geo
}

// LOD 级别配置
const lodLevels = [
  { size: 200, segs: 128, colors: [0x1a3a2a, 0x2d5a3d, 0x3d7a4d], heightScale: 12, yPos: 0 },
  { size: 200, segs: 64, colors: [0x2d5a3d, 0x3d7a4d, 0x5d9a6d], heightScale: 12, yPos: 0.1 },
  { size: 200, segs: 32, colors: [0x3d7a4d, 0x5d9a6d, 0x7dba8d], heightScale: 12, yPos: 0.2 },
  { size: 200, segs: 16, colors: [0x5d9a6d, 0x7dba8d, 0x9ddaad], heightScale: 12, yPos: 0.3 }
]

const terrainMeshes = []
lodLevels.forEach((level, idx) => {
  const geo = generateTerrain(level.size, level.segs, level.heightScale)
  const mat = new THREE.MeshStandardMaterial({
    color: level.colors[0],
    roughness: 0.85,
    metalness: 0.05,
    flatShading: idx % 2 === 0
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = level.yPos
  mesh.receiveShadow = true
  mesh.castShadow = idx < 2
  mesh.userData.lodIndex = idx
  terrainMeshes.push(mesh)
  scene.add(mesh)
})

// LOD 切换距离
const lodDistances = [0, 60, 120, 200]

// 水面效果
const waterGeo = new THREE.PlaneGeometry(400, 400, 64, 64)
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x1a4a6a,
  transparent: true,
  opacity: 0.75,
  roughness: 0.1,
  metalness: 0.8
})
const water = new THREE.Mesh(waterGeo, waterMat)
water.rotation.x = -Math.PI / 2
water.position.y = -1
scene.add(water)

// 星空背景
const starGeo = new THREE.BufferGeometry()
const starPositions = new Float32Array(3000 * 3)
for (let i = 0; i < 3000; i++) {
  starPositions[i*3] = (Math.random() - 0.5) * 1000
  starPositions[i*3+1] = Math.random() * 300 + 50
  starPositions[i*3+2] = (Math.random() - 0.5) * 1000
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 }))
scene.add(stars)

// 鼠标交互 - 地形高度提示
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const hoverMarker = new THREE.Mesh(
  new THREE.CircleGeometry(1, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.7 })
)
hoverMarker.rotation.x = -Math.PI / 2
hoverMarker.position.y = 2
hoverMarker.visible = false
scene.add(hoverMarker)

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

const clock = new THREE.Clock()
let autoRotate = true

window.addEventListener('mousedown', () => { autoRotate = false })
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') autoRotate = true
})

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  // 水面动画
  const waterPos = waterGeo.attributes.position
  for (let i = 0; i < waterPos.count; i++) {
    const x = waterPos.getX(i)
    const y = waterPos.getY(i)
    const wave = Math.sin(x * 0.05 + t) * 0.3 + Math.cos(y * 0.05 + t * 0.8) * 0.3
    waterPos.setZ(i, wave)
  }
  waterPos.needsUpdate = true
  waterMat.opacity = 0.7 + Math.sin(t * 0.5) * 0.05
  
  // LOD 切换逻辑
  const camDist = camera.position.length()
  terrainMeshes.forEach((mesh, idx) => {
    mesh.visible = camDist < lodDistances[idx + 1] || idx === lodDistances.length - 1
  })
  
  // 地形高度跟随鼠标
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(terrainMeshes[0])
  if (intersects.length > 0) {
    hoverMarker.visible = true
    hoverMarker.position.x = intersects[0].point.x
    hoverMarker.position.z = intersects[0].point.z
  } else {
    hoverMarker.visible = false
  }
  
  // 星空缓慢移动
  stars.rotation.y = t * 0.005
  
  if (autoRotate) controls.autoRotate = true
  controls.autoRotateSpeed = 0.5
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
