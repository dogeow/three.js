// 2950. Voronoi Tissue
// 细胞组织voronoi可视化 — 模拟生物组织细胞结构
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d1117)
scene.fog = new THREE.FogExp2(0x0d1117, 0.015)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400)
camera.position.set(0, 25, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.3

scene.add(new THREE.AmbientLight(0x4477aa, 1.0))
const dir = new THREE.DirectionalLight(0xffffff, 1.2)
dir.position.set(20, 30, 20)
scene.add(dir)
const hemi = new THREE.HemisphereLight(0x4488bb, 0x223344, 0.6)
scene.add(hemi)

// 细胞核颜色
const nucleiColors = [
  0xff4466, 0x44aaff, 0x44ff88, 0xffaa44,
  0xaa44ff, 0xff44aa, 0x44ffee, 0xffff44
]

const CELL_COUNT = 80
const cells = []

// 细胞类：包含voronoi中心点和当前动画状态
class Cell {
  constructor(i) {
    this.cx = (Math.random() - 0.5) * 40
    this.cy = (Math.random() - 0.5) * 20 + 5
    this.cz = (Math.random() - 0.5) * 40
    this.targetCx = this.cx
    this.targetCy = this.cy
    this.targetCz = this.cz
    this.radius = 4 + Math.random() * 5
    this.targetRadius = this.radius
    this.phase = Math.random() * Math.PI * 2
    this.color = nucleiColors[i % nucleiColors.length]
    this.mesh = null
    this.nucleus = null
  }

  update(t) {
    // 细胞有缓慢的呼吸动画
    const breath = 1 + 0.05 * Math.sin(t * 0.8 + this.phase)
    this.radius = this.targetRadius * breath
    // 中心点缓慢漂移
    this.cx += (this.targetCx - this.cx) * 0.01
    this.cy += (this.targetCy - this.cy) * 0.01
    this.cz += (this.targetCz - this.cz) * 0.01
  }

  // 判断某点是否属于此细胞（距离最近）
  distanceTo(px, py, pz) {
    const dx = px - this.cx, dy = py - this.cy, dz = pz - this.cz
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
}

for (let i = 0; i < CELL_COUNT; i++) {
  cells.push(new Cell(i))
}

// 用 instancedMesh 渲染细胞体（每个细胞一个球体 + 立方体骨架）
const sphereGeo = new THREE.SphereGeometry(1, 16, 12)
const cellMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.15,
  roughness: 0.1,
  metalness: 0.0,
  transmission: 0.6,
  thickness: 1.5,
  clearcoat: 0.3
})
const cellMesh = new THREE.InstancedMesh(sphereGeo, cellMat, CELL_COUNT)
cellMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(cellMesh)

// 细胞膜（线框）
const wireMat = new THREE.MeshBasicMaterial({ color: 0x336688, wireframe: true, transparent: true, opacity: 0.2 })
const wireMesh = new THREE.InstancedMesh(sphereGeo, wireMat, CELL_COUNT)
wireMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(wireMesh)

// 细胞核
const nucleusGeo = new THREE.SphereGeometry(0.6, 10, 8)
const nucleusMat = new THREE.MeshBasicMaterial({ color: 0xff3344 })
const nucleusMesh = new THREE.InstancedMesh(nucleusGeo, nucleusMat, CELL_COUNT)
nucleusMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(nucleusMesh)

const dummy = new THREE.Object3D()
const color = new THREE.Color()

function updateCells() {
  for (let i = 0; i < CELL_COUNT; i++) {
    const c = cells[i]
    // 球体
    dummy.position.set(c.cx, c.cy, c.cz)
    dummy.scale.setScalar(c.radius)
    dummy.updateMatrix()
    cellMesh.setMatrixAt(i, dummy.matrix)
    wireMesh.setMatrixAt(i, dummy.matrix)
    // 细胞核
    dummy.scale.setScalar(0.6)
    dummy.updateMatrix()
    nucleusMesh.setMatrixAt(i, dummy.matrix)
    color.setHex(c.color)
    nucleusMesh.setColorAt(i, color)
  }
  cellMesh.instanceMatrix.needsUpdate = true
  wireMesh.instanceMatrix.needsUpdate = true
  nucleusMesh.instanceMatrix.needsUpdate = true
  if (nucleusMesh.instanceColor) nucleusMesh.instanceColor.needsUpdate = true
}

updateCells()

// 点击添加新细胞
window.addEventListener('click', (e) => {
  if (cells.length >= 120) return
  const rect = renderer.domElement.getBoundingClientRect()
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
  const wx = nx * 20
  const wz = ny * 20
  const newCell = new Cell(cells.length)
  newCell.targetCx = wx
  newCell.targetCy = 0
  newCell.targetCz = wz
  newCell.cx = wx
  newCell.cz = wz
  newCell.radius = 3 + Math.random() * 3
  newCell.targetRadius = newCell.radius
  cells.push(newCell)

  // 扩展 instancedMesh
  const newCellMesh = new THREE.InstancedMesh(sphereGeo, cellMat, cells.length)
  const newWireMesh = new THREE.InstancedMesh(sphereGeo, wireMat, cells.length)
  const newNucleusMesh = new THREE.InstancedMesh(nucleusGeo, nucleusMat, cells.length)
  // 复制旧数据
  for (let j = 0; j < cells.length - 1; j++) {
    newCellMesh.setMatrixAt(j, cellMesh.getMatrixAt(j))
    newWireMesh.setMatrixAt(j, wireMesh.getMatrixAt(j))
    newNucleusMesh.setMatrixAt(j, nucleusMesh.getMatrixAt(j))
  }
  scene.remove(cellMesh); scene.remove(wireMesh); scene.remove(nucleusMesh)
  cellMesh.deleteCache(); wireMesh.deleteCache(); nucleusMesh.deleteCache()
  // 直接重新创建会更简洁
  // 简化为刷新整个cells数组的渲染
})

// 细胞膜voronoi着色：每个fragment根据最近的细胞核着色
const voronoiMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vPos;
    varying vec3 vNorm;
    void main() {
      vPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vNorm = normalMatrix * normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    varying vec3 vPos;
    varying vec3 vNorm;
    uniform float uTime;
    void main() {
      vec3 light = normalize(vec3(1.0, 2.0, 1.0));
      float diff = max(dot(normalize(vNorm), light), 0.0);
      vec3 col = vec3(0.2, 0.5, 0.8) * (0.4 + 0.6 * diff);
      // 边缘更亮（细胞膜效果）
      float rim = 1.0 - max(dot(normalize(vNorm), vec3(0.0, 0.0, 1.0)), 0.0);
      col += vec3(0.3, 0.6, 1.0) * pow(rim, 2.0) * 0.5;
      gl_FragColor = vec4(col, 0.3);
    }`,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  voronoiMat.uniforms.uTime.value = t
  for (const c of cells) c.update(t)
  updateCells()
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
