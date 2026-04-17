import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x020617, 0.03)

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.8, 13)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.12
renderer.domElement.style.position = 'absolute'
renderer.domElement.style.inset = '0'
document.body.appendChild(renderer.domElement)

const cssRenderer = new CSS3DRenderer()
cssRenderer.setSize(innerWidth, innerHeight)
cssRenderer.domElement.style.position = 'absolute'
cssRenderer.domElement.style.top = '0'
cssRenderer.domElement.style.left = '0'
cssRenderer.domElement.style.pointerEvents = 'auto'
document.body.appendChild(cssRenderer.domElement)

const controls = new OrbitControls(camera, cssRenderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 7
controls.maxDistance = 20
controls.target.set(0, 1.2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.55))
const keyLight = new THREE.DirectionalLight(0xffffff, 1.45)
keyLight.position.set(5, 8, 4)
scene.add(keyLight)

const fillLight = new THREE.PointLight(0x22d3ee, 20, 22, 2)
fillLight.position.set(-5, 3, 5)
scene.add(fillLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(18, 120),
  new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x0b1326,
    emissiveIntensity: 0.45,
    metalness: 0.08,
    roughness: 0.92
  })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.95
scene.add(floor)

const grid = new THREE.GridHelper(20, 28, 0x1d4ed8, 0x1e293b)
grid.position.y = -1.93
grid.material.transparent = true
grid.material.opacity = 0.24
scene.add(grid)

const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(2.8, 3.2, 0.8, 48),
  new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.18,
    roughness: 0.42
  })
)
stage.position.y = -1.55
scene.add(stage)

const hub = new THREE.Group()
scene.add(hub)

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.2, 1),
  new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.45,
    metalness: 0.26,
    roughness: 0.16,
    clearcoat: 1
  })
)
core.position.y = 1.35
hub.add(core)

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2 + i * 0.5, 0.06, 12, 120),
    new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x67e8f9 : 0xa78bfa })
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.55 + i * 0.45
  hub.add(ring)
}

const cards = [
  { title: 'CSS 面板', body: 'HTML 和 CSS 的排版能力完整保留，按钮、图标、渐变都能直接复用。', chips: ['DOM', 'CSS', 'Layout'], color: '#67e8f9' },
  { title: '3D 定位', body: '卡片像 Mesh 一样拥有 position / rotation / scale，可以围绕模型布置信息。', chips: ['Object3D', 'Transform'], color: '#f472b6' },
  { title: '信息可视化', body: '适合节点详情、空间标注、看板总览、产品热点说明等场景。', chips: ['Dashboard', 'Inspector'], color: '#a3e635' }
]

const cssObjects = []

cards.forEach((card, index) => {
  const element = document.createElement('div')
  element.className = 'panel'
  element.innerHTML = `
    <h3 style="color:${card.color}">${card.title}</h3>
    <p>${card.body}</p>
    <div class="chips">${card.chips.map((chip) => `<span class="chip">${chip}</span>`).join('')}</div>
  `

  const object = new CSS3DObject(element)
  const angle = (index / cards.length) * Math.PI * 2
  object.scale.setScalar(0.01)
  object.position.set(Math.cos(angle) * 4.2, 1.7, Math.sin(angle) * 4.2)
  object.lookAt(0, 1.5, 0)
  object.userData = { angle, radius: 4.2, lift: index * 0.3 }
  hub.add(object)
  cssObjects.push(object)
})

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  hub.rotation.y += delta * 0.1
  core.rotation.x += delta * 0.3
  core.rotation.y += delta * 0.58
  core.position.y = 1.35 + Math.sin(time * 1.6) * 0.16

  cssObjects.forEach((object) => {
    const angle = object.userData.angle + time * 0.22
    object.position.set(
      Math.cos(angle) * object.userData.radius,
      1.55 + Math.sin(time * 1.2 + object.userData.lift) * 0.28,
      Math.sin(angle) * object.userData.radius
    )
    object.lookAt(0, 1.6, 0)
  })

  controls.update()
  renderer.render(scene, camera)
  cssRenderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  cssRenderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera

renderer.setAnimationLoop(animate)