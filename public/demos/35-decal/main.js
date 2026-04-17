import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1d25)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(4, 3, 6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment()).texture

const key = new THREE.DirectionalLight(0xffffff, 1)
key.position.set(5, 8, 5)
scene.add(key)

// ============ 目标模型（子弹打上去的对象） ============
// 用一个 TorusKnot 比较考验贴花算法 —— 曲面复杂还能紧贴就说明功能正常
const targets = []

const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1, 0.35, 128, 32),
  new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.3, roughness: 0.5 })
)
knot.position.set(-1.5, 0.5, 0)
scene.add(knot)
targets.push(knot)

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.3, roughness: 0.5 })
)
sphere.position.set(2, 0.5, 0)
scene.add(sphere)
targets.push(sphere)

// ============ 画一张「弹孔」贴图 ============
function makeBulletHoleTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')

  // 外圈放射裂纹
  ctx.strokeStyle = 'rgba(30,30,30,0.8)'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2
    const r1 = 15 + Math.random() * 5
    const r2 = 40 + Math.random() * 20
    ctx.beginPath()
    ctx.moveTo(size / 2 + Math.cos(a) * r1, size / 2 + Math.sin(a) * r1)
    ctx.lineTo(size / 2 + Math.cos(a) * r2, size / 2 + Math.sin(a) * r2)
    ctx.stroke()
  }
  // 深色中心洞
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, 20)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(0.6, 'rgba(10,10,10,0.9)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, 20, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(c)
  return tex
}

const decalTexture = makeBulletHoleTexture()
const decalMaterial = new THREE.MeshStandardMaterial({
  map: decalTexture,
  transparent: true,
  depthTest: true,
  depthWrite: false,      // ⚠️ 贴花叠在目标表面上，关掉 depthWrite 避免 z-fighting
  polygonOffset: true,    // ⚠️ 往前偏一点，避免和原表面打架
  polygonOffsetFactor: -4,
  normalScale: new THREE.Vector2(1, 1)
})

// ============ 点击 → 打弹孔 ============
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const decals = []
const $count = document.getElementById('count')

// 为了区分"拖拽相机"和"点击"，记录按下/抬起位置
let downPos = null
addEventListener('pointerdown', e => {
  downPos = { x: e.clientX, y: e.clientY }
})
addEventListener('pointerup', e => {
  if (!downPos) return
  const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y
  downPos = null
  if (dx * dx + dy * dy > 16) return // 拖拽超过阈值不算点击

  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hit = raycaster.intersectObjects(targets)[0]
  if (!hit) return

  placeDecal(hit)
})

function placeDecal(hit) {
  const position = hit.point.clone()

  // ⚠️ DecalGeometry 需要一个「朝向」：让贴花的 +Z 指向表面法线
  // 用 Euler 控制朝向，简单做法：构造一个虚拟 Object3D 看向法线方向
  const n = hit.face.normal.clone()
  n.transformDirection(hit.object.matrixWorld) // 世界空间法线
  const dummy = new THREE.Object3D()
  dummy.position.copy(position)
  dummy.lookAt(position.clone().add(n))
  // 稍微随机一点转角，避免所有弹孔纹路方向一致
  dummy.rotateZ(Math.random() * Math.PI * 2)

  const size = new THREE.Vector3(0.4, 0.4, 0.4) // 贴花范围（包围盒）

  // DecalGeometry(mesh, position, orientation, size)
  const decalGeo = new DecalGeometry(hit.object, position, dummy.rotation, size)
  // 每个弹孔用独立材质便于后面逐个操作（想复用也行）
  const decal = new THREE.Mesh(decalGeo, decalMaterial.clone())
  scene.add(decal)
  decals.push(decal)
  $count.textContent = '弹孔数：' + decals.length
}

document.getElementById('clear').onclick = () => {
  decals.forEach(d => {
    scene.remove(d)
    d.geometry.dispose()
    d.material.dispose()
  })
  decals.length = 0
  $count.textContent = '弹孔数：0'
}

// ============ 渲染循环 ============
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})