import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x05111f)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 2, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const key = new THREE.DirectionalLight(0xffffff, 0.9)
key.position.set(4, 6, 4)
scene.add(key)

// 共用几何体 —— 用 TorusKnot 比较能看出差异
const baseGeo = new THREE.TorusKnotGeometry(0.7, 0.25, 64, 16)

const group = new THREE.Group()
scene.add(group)

// ① 普通实体
{
  const mesh = new THREE.Mesh(
    baseGeo,
    new THREE.MeshStandardMaterial({ color: 0x4a90e2, metalness: 0.3, roughness: 0.5 })
  )
  mesh.position.x = -4.5
  group.add(mesh)
}

// ② EdgesGeometry：只取"硬边"
// 第二个参数 thresholdAngle（度）决定两面夹角多大才算硬边
// 默认 1°，TorusKnot 是光滑曲面，提高阈值才有明显边线
{
  const edges = new THREE.EdgesGeometry(baseGeo, 15) // 15° 阈值
  const lines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x66fcf1 })
  )
  lines.position.x = -1.5
  group.add(lines)
}

// ③ material.wireframe：最简单的线框，画所有三角形边
{
  const mesh = new THREE.Mesh(
    baseGeo,
    new THREE.MeshBasicMaterial({ color: 0x66fcf1, wireframe: true })
  )
  mesh.position.x = 1.5
  group.add(mesh)
}

// ④ 「实体 + 外描边」组合（Unity 卡通 / CAD 风）
// 技巧：实体往内缩小一点，描边用 LineSegments 套在外面；或者
// 更经典的做法：反向法线 + cull=BackSide 的"外壳" —— 下面用更简单的 LineSegments 叠加
{
  const solid = new THREE.Mesh(
    baseGeo,
    new THREE.MeshStandardMaterial({ color: 0xff6699, metalness: 0.2, roughness: 0.7 })
  )
  const edges = new THREE.EdgesGeometry(baseGeo, 15)
  const lines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 })
  )
  const combo = new THREE.Group()
  combo.add(solid)
  combo.add(lines)
  combo.position.x = 4.5
  group.add(combo)
}

// 地面网格
const grid = new THREE.GridHelper(15, 15, 0x335577, 0x113355)
grid.position.y = -1.5
scene.add(grid)

// ============ 渲染循环 ============
function animate() {
  requestAnimationFrame(animate)
  group.children.forEach(child => {
    child.rotation.y += 0.008
    child.rotation.x += 0.004
  })
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})