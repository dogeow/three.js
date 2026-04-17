// 007. Geometry Types — 常用几何体一览
// 演示 Three.js 内置的各种 3D 几何体形状
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 10, 20)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 材质（统一使用绿色系）
const mat = new THREE.MeshStandardMaterial({ color: 0x00cc88, roughness: 0.3 })

// 所有几何体的定义
// 参数说明参考官方文档：https://threejs.org/docs/index.html
const geometries = [
  // 立方体类
  { geo: new THREE.BoxGeometry(2, 2, 2), pos: [-9, 0, 0], label: 'BoxGeometry' },
  // 球体类
  { geo: new THREE.SphereGeometry(1.2, 32, 32), pos: [-6, 0, 0], label: 'SphereGeometry' },
  { geo: new THREE.IcosahedronGeometry(1.2), pos: [-3, 0, 0], label: 'IcosahedronGeometry' },
  { geo: new THREE.OctahedronGeometry(1.2), pos: [0, 0, 0], label: 'OctahedronGeometry' },
  { geo: new THREE.TetrahedronGeometry(1.2), pos: [3, 0, 0], label: 'TetrahedronGeometry' },
  { geo: new THREE.DodecahedronGeometry(1.0), pos: [6, 0, 0], label: 'DodecahedronGeometry' },
  // 环形类
  { geo: new THREE.TorusGeometry(1.0, 0.3, 16, 100), pos: [9, 0, 0], label: 'TorusGeometry' },
  // 第二排
  { geo: new THREE.CylinderGeometry(0.8, 0.8, 2.5, 32), pos: [-9, 0, -8], label: 'CylinderGeometry' },
  { geo: new THREE.ConeGeometry(1.0, 2.5, 32), pos: [-6, 0, -8], label: 'ConeGeometry' },
  { geo: new THREE.TorusKnotGeometry(0.7, 0.25, 100, 16), pos: [-3, 0, -8], label: 'TorusKnotGeometry' },
  { geo: new THREE.CapsuleGeometry(0.8, 2, 16, 32), pos: [0, 0, -8], label: 'CapsuleGeometry' },
  // 平面类
  { geo: new THREE.PlaneGeometry(2.5, 2.5), pos: [4, 0, -8], label: 'PlaneGeometry\n(扁平的)' },
  { geo: new THREE.CircleGeometry(1.2, 32), pos: [7.5, 0, -8], label: 'CircleGeometry' },
  { geo: new THREE.RingGeometry(0.6, 1.2, 32), pos: [10.5, 0, -8], label: 'RingGeometry' },
]

// 创建网格并添加到场景
geometries.forEach(({ geo, pos, label }) => {
  const mesh = new THREE.Mesh(geo, mat.clone())
  mesh.position.set(pos[0], pos[1], pos[2])
  scene.add(mesh)

  // 同时在地上一比一展示（投影到 Y=0）
  const flatMat = new THREE.MeshStandardMaterial({ color: 0x008866, roughness: 0.5, side: THREE.DoubleSide })
  const flatMesh = new THREE.Mesh(geo.clone(), flatMat)
  flatMesh.position.set(pos[0], 0, pos[2] + 0.01)
  flatMesh.scale.set(0.5, 0.5, 0.5)
  scene.add(flatMesh)
})

// 添加环境光和方向光
const ambient = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambient)
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(5, 10, 5)
scene.add(dirLight)

function animate() {
  requestAnimationFrame(animate)
  // 所有几何体缓慢旋转
  scene.children.forEach((child, i) => {
    if (child.isMesh) {
      child.rotation.y += 0.005
    }
  })
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
