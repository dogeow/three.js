import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Sky } from 'three/addons/objects/Sky.js'
import { Water } from 'three/addons/objects/Water.js'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 20000)
camera.position.set(30, 30, 100)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.5
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI * 0.495 // 不让相机穿到水下
controls.target.set(0, 10, 0)
controls.minDistance = 40
controls.maxDistance = 300

// ============ Sky 天空 ============
// Sky 是一个内部用 shader 绘制的大球/立方体，根据 Rayleigh/Mie 参数生成真实散射
const sky = new Sky()
sky.scale.setScalar(10000)
scene.add(sky)

const skyU = sky.material.uniforms
skyU.turbidity.value = 10          // 空气浑浊度
skyU.rayleigh.value = 2            // 瑞利散射（让天空变蓝）
skyU.mieCoefficient.value = 0.005
skyU.mieDirectionalG.value = 0.8

// ============ Water 海面 ============
// 需要一张法线贴图（常用 Three.js 自带的水波法线图）
const waterGeom = new THREE.PlaneGeometry(10000, 10000)
const water = new Water(waterGeom, {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: new THREE.TextureLoader().load(
    'https://unpkg.com/three@0.160.0/examples/textures/waternormals.jpg',
    (tex) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping }
  ),
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffffff,
  waterColor: 0x001e2f,
  distortionScale: 3.7,
  fog: scene.fog !== undefined
})
water.rotation.x = -Math.PI / 2
scene.add(water)

// ============ 一些小船（简单立方体）作为参照 ============
for (let i = 0; i < 8; i++) {
  const boat = new THREE.Mesh(
    new THREE.BoxGeometry(8, 3, 15),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  )
  boat.position.set(
    (Math.random() - 0.5) * 400,
    1.5,
    (Math.random() - 0.5) * 400
  )
  scene.add(boat)
}

// ============ 太阳方向控制 ============
const sun = new THREE.Vector3()
const pmrem = new THREE.PMREMGenerator(renderer)

function updateSun() {
  const elevation = +document.getElementById('elevation').value
  const azimuth = +document.getElementById('azimuth').value

  const phi = THREE.MathUtils.degToRad(90 - elevation)
  const theta = THREE.MathUtils.degToRad(azimuth)
  sun.setFromSphericalCoords(1, phi, theta)

  // 把太阳方向同时告诉天空和水面
  skyU.sunPosition.value.copy(sun)
  water.material.uniforms.sunDirection.value.copy(sun).normalize()

  // 让天空给整个场景提供环境光照（PBR 自动反射天色）
  scene.environment = pmrem.fromScene(sky).texture
}

document.getElementById('elevation').addEventListener('input', updateSun)
document.getElementById('azimuth').addEventListener('input', updateSun)
updateSun()

// ============ 渲染循环 ============
function animate() {
  requestAnimationFrame(animate)
  // Water 的 shader 需要不断推进时间才会有波纹流动
  water.material.uniforms.time.value += 1 / 60
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})