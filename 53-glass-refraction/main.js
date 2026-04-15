import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const scene = new THREE.Scene()
// 深色背景，让玻璃折射的彩色光线更突出
scene.background = new THREE.Color(0x0a0a18)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 2, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// ============ 环境贴图（彩色室内环境）============
// PMREMGenerator 将环境转为 PBR 可用的预过滤格式
const pmrem = new THREE.PMREMGenerator(renderer)
pmrem.compileEquirectangularShader()
const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environment = envTexture
// 也作为背景，玻璃折射时会映出彩色环境
scene.background = envTexture

// 环境球：放在场景中央，让玻璃物体围成一圈折射它
const envSphereGeo = new THREE.SphereGeometry(6, 32, 32)
const envSphereMat = new THREE.MeshBasicMaterial({
  map: envTexture,
  side: THREE.BackSide
})
const envSphere = new THREE.Mesh(envSphereGeo, envSphereMat)
scene.add(envSphere)

// ============ 玻璃材质工厂函数 ============
function makeGlass(iou, label) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1.0,     // 完全透光
    roughness: 0.0,        // 完美光滑
    metalness: 0.0,       // 非金属
    ior: iou,             // 折射率
    thickness: 0.8,       // 厚度，越大光线弯折越明显
    envMapIntensity: 1.2,
    transparent: true,
    opacity: 1.0
  })
}

// ============ 三个不同折射率的球体（第一排）============
const glassSpheres = [
  { ior: 1.0, label: 'IOR 1.0 (无折射)' },
  { ior: 1.5, label: 'IOR 1.5 (玻璃)' },
  { ior: 2.4, label: 'IOR 2.4 (钻石)' }
]

glassSpheres.forEach((cfg, i) => {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 64, 64),
    makeGlass(cfg.ior, cfg.label)
  )
  sphere.position.set((i - 1) * 2.4, 1.2, 0)
  scene.add(sphere)
})

// 球体标签
glassSpheres.forEach((cfg, i) => {
  const c = document.createElement('canvas')
  c.width = 320; c.height = 64
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, 0, 320, 64)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 26px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(cfg.label, 160, 32)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true })
  )
  sprite.scale.set(2, 0.4, 1)
  sprite.position.set((i - 1) * 2.4, 0.2, 0)
  scene.add(sprite)
})

// ============ 更多玻璃几何体展示 ============
// 玻璃立方体
const glassCube = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 1.1, 1.1),
  makeGlass(1.5, 'cube')
)
glassCube.position.set(-3.5, 1.2, -1.5)
glassCube.rotation.set(0.4, 0.5, 0)
scene.add(glassCube)

// 玻璃环面结
const glassTorus = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.55, 0.18, 128, 32),
  makeGlass(1.5, 'torusknot')
)
glassTorus.position.set(3.5, 1.2, -1.5)
scene.add(glassTorus)

// 玻璃正十二面体
const glassDodeca = new THREE.Mesh(
  new THREE.DodecahedronGeometry(0.7, 0),
  makeGlass(2.4, 'dodeca')
)
glassDodeca.position.set(0, 1.2, -2.5)
scene.add(glassDodeca)

// ============ 底部网格地面（装饰）============
const grid = new THREE.GridHelper(20, 30, 0x334466, 0x112233)
grid.position.y = -1.5
scene.add(grid)

// ============ 彩色点光源装饰 ============
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
dLight1.position.set(5, 10, 5)
scene.add(dLight1)

const pLight1 = new THREE.PointLight(0xff6699, 3, 20)
pLight1.position.set(-4, 3, 2)
scene.add(pLight1)

const pLight2 = new THREE.PointLight(0x6699ff, 3, 20)
pLight2.position.set(4, 3, -2)
scene.add(pLight2)

const pLight3 = new THREE.PointLight(0x66ffcc, 2, 15)
pLight3.position.set(0, 5, 0)
scene.add(pLight3)

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // 让装饰物体缓慢旋转，展示不同角度的折射
  glassCube.rotation.y = t * 0.3
  glassCube.rotation.x = t * 0.2
  glassTorus.rotation.x = t * 0.4
  glassTorus.rotation.y = t * 0.3
  glassDodeca.rotation.y = t * 0.25
  glassDodeca.rotation.x = t * 0.15

  // 让环境球缓慢旋转，丰富折射内容
  envSphere.rotation.y = t * 0.1

  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})