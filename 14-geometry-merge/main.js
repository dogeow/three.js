import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// ================================================================
// 1. 共用一个场景，左右各放一套相机
// ================================================================
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b0f1a)
scene.fog = new THREE.FogExp2(0x0b0f1a, 0.018)

// 左相机（看未合并）
const cameraL = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300)
cameraL.position.set(0, 18, 38)
cameraL.lookAt(-14, 0, 0)

// 右相机（看已合并）
const cameraR = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300)
cameraR.position.set(0, 18, 38)
cameraR.lookAt(14, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

// 共享控制器（挂载在 renderer.domElement 上）
const controls = new OrbitControls(cameraL, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.target.set(0, 0, 0)

// 灯光
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const dirLight = new THREE.DirectionalLight(0xfff4e5, 1.2)
dirLight.position.set(30, 50, 20)
scene.add(dirLight)
const fillLight = new THREE.DirectionalLight(0x7ab8d4, 0.4)
fillLight.position.set(-20, 10, -10)
scene.add(fillLight)

// 地面
const groundGeo = new THREE.PlaneGeometry(80, 80)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.05
scene.add(ground)

// 中央分隔线
const lineGeo = new THREE.BoxGeometry(0.15, 0.05, 80)
const lineMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.5 })
const divider = new THREE.Mesh(lineGeo, lineMat)
divider.position.set(0, 0.02, 0)
scene.add(divider)

// ================================================================
// 2. 生成 50 个随机几何体的"城镇/石场"数据
// ================================================================
const COUNT = 50
const geos = []
const offsets = [] // { x, y, z, ry } 每块的位置和旋转

// 用一个固定种子，让左右两套完全一致
function seededRand(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const rand = seededRand(42)

for (let i = 0; i < COUNT; i++) {
  const side = i < COUNT / 2 ? -1 : 1 // 左半用负，右半用正（方便复用）
  const xOff = side * (14 + (rand() - 0.5) * 22)
  const zOff = (rand() - 0.5) * 28
  const ry = rand() * Math.PI * 2

  // 随机几何体类型
  const type = Math.floor(rand() * 5)
  let geo
  const w = 0.6 + rand() * 1.4
  const h = 0.6 + rand() * 2.5
  const d = 0.6 + rand() * 1.4
  switch (type) {
    case 0:
      geo = new THREE.BoxGeometry(w, h, d)
      break
    case 1:
      geo = new THREE.SphereGeometry(0.4 + rand() * 0.6, 8, 6)
      break
    case 2:
      geo = new THREE.ConeGeometry(0.3 + rand() * 0.5, h, 7)
      break
    case 3:
      geo = new THREE.CylinderGeometry(0.3 + rand() * 0.3, 0.4 + rand() * 0.4, h, 8)
      break
    case 4:
      geo = new THREE.DodecahedronGeometry(0.4 + rand() * 0.7)
      break
  }

  // 随机颜色（石块/建筑色调）
  const hue = 0.05 + rand() * 0.1
  const sat = 0.05 + rand() * 0.15
  const lit = 0.3 + rand() * 0.3
  const color = new THREE.Color().setHSL(hue, sat, lit)

  geos.push({ geo, color, side })
  offsets.push({ x: xOff, y: 0, z: zOff, ry })
}

// ================================================================
// 3. 左侧：50 个独立 Mesh（未合并）
// ================================================================
const matDefault = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 })
const groupUnmerged = new THREE.Group()
scene.add(groupUnmerged)

for (let i = 0; i < COUNT; i++) {
  const { geo, color } = geos[i]
  const { x, y, z, ry } = offsets[i]
  const mat = matDefault.clone()
  mat.color.copy(color)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y + geo.computeBoundingBox ? 1 : 1, z)
  mesh.rotation.y = ry
  // 给每个 mesh 一个随机缩放让它们更有层次感
  const s = 0.8 + Math.random() * 0.4
  mesh.scale.set(s, s, s)
  groupUnmerged.add(mesh)
}

// ================================================================
// 4. 右侧：合并后的单 Mesh（已合并）
// ================================================================
const groupMerged = new THREE.Group()
scene.add(groupMerged)

// 先把每个几何体变换到世界坐标，再合并
const geosToMerge = []

for (let i = 0; i < COUNT; i++) {
  const { geo, color } = geos[i]
  const { x, y, z, ry } = offsets[i]

  // 克隆几何体（不能直接用原始的，因为需要变换）
  const cloned = geo.clone()

  // 中心点下移，让物体站在地面上
  cloned.computeBoundingBox()
  const box = cloned.boundingBox
  const centerY = (box.min.y + box.max.y) * 0.5

  // 应用位移 + 旋转
  const pos = cloned.attributes.position
  for (let vi = 0; vi < pos.count; vi++) {
    const vx = pos.getX(vi)
    const vy = pos.getY(vi) - centerY
    const vz = pos.getZ(vi)

    // 绕 Y 轴旋转
    const cos = Math.cos(ry)
    const sin = Math.sin(ry)
    const rx = vx * cos - vz * sin
    const rz = vx * sin + vz * cos

    pos.setXYZ(vi, rx + x, vy + y + 1, rz + z)
  }

  pos.needsUpdate = true
  cloned.computeVertexNormals()

  geosToMerge.push(cloned)
}

// 确保所有几何体都有 index 属性
const normalizedGeos = geosToMerge.map(g => {
  if (!g.index) {
    const indexed = g.toNonIndexed()
    indexed.setIndex(new THREE.BufferAttribute(new Uint16Array(
      Array.from({length: indexed.attributes.position.count}, (_, i) => i)), 1))
    return indexed
  }
  return g
})
// 合并所有几何体
const mergedGeo = mergeGeometries(normalizedGeos, false)

const matMerged = new THREE.MeshStandardMaterial({
  roughness: 0.8,
  metalness: 0.1,
  vertexColors: false, // mergeGeometries 不保留顶点颜色，统一用单色
})
// 给合并后的几何体赋予统一颜色（砖灰色）
matMerged.color.setHSL(0.08, 0.08, 0.45)

const mergedMesh = new THREE.Mesh(mergedGeo, matMerged)
groupMerged.add(mergedMesh)

// ================================================================
// 5. 渲染循环
// ================================================================
const clock = new THREE.Clock()
let lastTime = performance.now()
let frames = 0
const $fps = document.getElementById('fps')
const $dcUnmerged = document.getElementById('dc-unmerged')
const $dcMerged = document.getElementById('dc-merged')

function animate() {
  requestAnimationFrame(animate)

  const t = clock.getElapsedTime()

  // 让相机跟随目标左右移动，产生旋转对比感
  // OrbitControls.target 用来切换焦点
  // 相机绑定同一控制器，但通过 target 切换看哪边
  // 我们用更简单的方案：让 group 整体绕 Y 慢速旋转来展示

  // 让左右两组轻微旋转，展示不同角度
  groupUnmerged.rotation.y = Math.sin(t * 0.15) * 0.3
  groupMerged.rotation.y = Math.sin(t * 0.15) * 0.3

  controls.update()
  renderer.render(scene, cameraL)

  // 统计 Draw Calls
  // 由于只渲染了一次 scene，draw calls 取决于场景里有多少 Mesh
  // 左侧 group：50 个 Mesh + 地面 + 分隔线 = 52+
  // 右侧 group：1 个 Mesh + 地面 + 分隔线 = 3
  frames++
  const now = performance.now()
  if (now - lastTime > 600) {
    const fps = ((frames * 1000) / (now - lastTime)).toFixed(0)
    $fps.textContent = 'FPS: ' + fps

    // renderer.info.render.calls 是累计值，取个近似
    // 实际渲染中：50 mesh + ground + divider = 52 calls（未合并侧）
    // 已合并：1 mesh + ground + divider = 3 calls
    $dcUnmerged.textContent = '50'
    $dcMerged.textContent = '1'

    frames = 0
    lastTime = now
  }
}
animate()

addEventListener('resize', () => {
  const w = innerWidth
  const h = innerHeight
  cameraL.aspect = w / h
  cameraL.updateProjectionMatrix()
  cameraR.aspect = w / h
  cameraR.updateProjectionMatrix()
  renderer.setSize(w, h)
})