// 008. Material Showcase — 四种材质对比演示
// MeshBasicMaterial：不收光照影响 | MeshLambertMaterial：漫反射
// MeshPhongMaterial：镜面高光 | MeshStandardMaterial：PBR 材质
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 4, 14)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 四种材质对比
// 注意：MeshBasicMaterial 不受光照影响，其他三种需要光照才能可见
const materials = [
  {
    mat: new THREE.MeshBasicMaterial({ color: 0x00ffcc }),
    title: 'MeshBasicMaterial',
    desc: '完全不受光照影响，始终显示指定颜色。常用于调试或不需要光照效果的场景（如 2D UI）。',
    pos: [-7.5, 0, 0],
  },
  {
    mat: new THREE.MeshLambertMaterial({ color: 0x00ffcc }),
    title: 'MeshLambertMaterial',
    desc: '兰伯特漫反射模型，计算简单，适合不需要高光的场景。性能好但光照效果较平淡。',
    pos: [-2.5, 0, 0],
  },
  {
    mat: new THREE.MeshPhongMaterial({
      color: 0x00ffcc,
      shininess: 80,        // 高光强度（值越大高光越集中）
    }),
    title: 'MeshPhongMaterial',
    desc: '包含镜面高光，可以做出金属、塑料质感。shininess 控制高光锐度。',
    pos: [2.5, 0, 0],
  },
  {
    mat: new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      roughness: 0.3,       // 粗糙度：0=完全光滑高反，1=完全粗糙
      metalness: 0.6,       // 金属度：0=非金属，1=金属
    }),
    title: 'MeshStandardMaterial',
    desc: 'PBR（基于物理的渲染）材质。roughness + metalness 两个参数即可覆盖大多数真实材质。推荐优先使用。',
    pos: [7.5, 0, 0],
  },
]

// 为每种材质创建一个立方体和球体
materials.forEach(({ mat, pos }) => {
  // 立方体（上方）
  const boxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8)
  const box = new THREE.Mesh(boxGeo, mat)
  box.position.set(pos[0], pos[1] + 2, pos[2])
  scene.add(box)

  // 球体（下方），突出高光效果
  const sphereGeo = new THREE.SphereGeometry(1.0, 32, 32)
  const sphere = new THREE.Mesh(sphereGeo, mat.clone())
  sphere.position.set(pos[0], pos[1] - 1, pos[2])
  scene.add(sphere)
})

// 光照（Basic 不受影响，其他三种都需要光照才能可见）
const ambient = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambient)

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(5, 10, 7)
scene.add(dirLight)

const pointLight = new THREE.PointLight(0x4488ff, 1, 50)
pointLight.position.set(-10, 5, 5)
scene.add(pointLight)

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
