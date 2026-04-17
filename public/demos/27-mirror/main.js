import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Reflector } from 'three/addons/objects/Reflector.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.02)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 4, 10)

const getPixelRatio = () => Math.min(window.devicePixelRatio || 1, 2)
const renderer = new THREE.WebGLRenderer({ antialias: true })
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 2, 0)

const sphereCountInput = document.querySelector('#sphere-count')
const sphereCountValue = document.querySelector('#sphere-count-value')

scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const d1 = new THREE.DirectionalLight(0xffffff, 1)
d1.position.set(5, 10, 5)
scene.add(d1)
const d2 = new THREE.PointLight(0xff6699, 2, 30)
d2.position.set(-4, 3, -2)
scene.add(d2)

// ============ 地面镜子 ============
// Reflector 是一个带反射效果的 Mesh，参数里配纹理分辨率、颜色
const mirrorGeo = new THREE.PlaneGeometry(30, 30)
const groundMirror = new Reflector(mirrorGeo, {
  textureWidth: innerWidth * getPixelRatio(),
  textureHeight: innerHeight * getPixelRatio(),
  clipBias: 0.003,
  color: 0x889099 // 整体偏蓝灰，更像不锈钢镜面
})
groundMirror.rotation.x = -Math.PI / 2
scene.add(groundMirror)

// ============ 立式镜子（后方墙面） ============
const wallMirrorGeo = new THREE.PlaneGeometry(10, 6)
const wallMirror = new Reflector(wallMirrorGeo, {
  textureWidth: 1024,
  textureHeight: 1024,
  clipBias: 0.003,
  color: 0xaaaaaa
})
wallMirror.position.set(0, 3, -8)
scene.add(wallMirror)

function setReflectorExclusions(reflector, hiddenReflectors) {
  const originalOnBeforeRender = reflector.onBeforeRender
  reflector.onBeforeRender = function (...args) {
    const visibility = hiddenReflectors.map((item) => [item, item.visible])
    hiddenReflectors.forEach((item) => {
      item.visible = false
    })

    try {
      return originalOnBeforeRender.apply(this, args)
    } finally {
      visibility.forEach(([item, wasVisible]) => {
        item.visible = wasVisible
      })
    }
  }
}

// Reflector 自身只会在离屏渲染时隐藏自己；两个镜面同时存在时要手动避免互相递归采样。
setReflectorExclusions(groundMirror, [wallMirror])
setReflectorExclusions(wallMirror, [groundMirror])

function resizeReflector(reflector, width, height) {
  reflector.getRenderTarget().setSize(
    Math.max(1, Math.floor(width)),
    Math.max(1, Math.floor(height))
  )
}

function syncViewport() {
  const pixelRatio = getPixelRatio()
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  resizeReflector(groundMirror, innerWidth * pixelRatio, innerHeight * pixelRatio)
}

syncViewport()

function createMirrorFrame(width, height, depth, border) {
  const frameGroup = new THREE.Group()
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.6,
    roughness: 0.4
  })

  const horizontalGeo = new THREE.BoxGeometry(width + border * 2, border, depth)
  const verticalGeo = new THREE.BoxGeometry(border, height, depth)

  const topBar = new THREE.Mesh(horizontalGeo, frameMaterial)
  const bottomBar = new THREE.Mesh(horizontalGeo, frameMaterial)
  const leftBar = new THREE.Mesh(verticalGeo, frameMaterial)
  const rightBar = new THREE.Mesh(verticalGeo, frameMaterial)

  topBar.position.y = height / 2 + border / 2
  bottomBar.position.y = -height / 2 - border / 2
  leftBar.position.x = -width / 2 - border / 2
  rightBar.position.x = width / 2 + border / 2

  frameGroup.add(topBar, bottomBar, leftBar, rightBar)
  return frameGroup
}

const frame = createMirrorFrame(10, 6, 0.18, 0.2)
frame.position.set(0, 3, -8.08)
scene.add(frame)

// ============ 一些有趣的物体让镜子「有东西反射」 ============
const torus = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.8, 0.25, 128, 32),
  new THREE.MeshStandardMaterial({ color: 0xff6699, metalness: 0.6, roughness: 0.2 })
)
torus.position.set(0, 2, 0)
scene.add(torus)

const movingSpheres = []
function getSpherePosition(index, total) {
  const normalizedIndex = total <= 1 ? 0 : index / total
  const angle = normalizedIndex * Math.PI * 2
  const radius = 2.5 + (index % 3) * 0.45
  const height = 0.85 + ((index * 7) % 6) * 0.28

  return {
    x: Math.cos(angle) * radius,
    y: height,
    z: Math.sin(angle) * radius
  }
}

function createSphere(index, total) {
  const hue = total <= 1 ? 0.15 : index / total
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 32, 32),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.7, 0.55),
      metalness: 0.5,
      roughness: 0.3,
      emissive: new THREE.Color().setHSL(hue, 0.7, 0.25)
    })
  )

  const position = getSpherePosition(index, total)
  sphere.position.set(position.x, position.y, position.z)
  scene.add(sphere)
  return sphere
}

function setSphereCount(count) {
  const nextCount = Math.max(0, Math.floor(count))

  while (movingSpheres.length > nextCount) {
    const sphere = movingSpheres.pop()
    scene.remove(sphere)
    sphere.geometry.dispose()
    sphere.material.dispose()
  }

  while (movingSpheres.length < nextCount) {
    movingSpheres.push(createSphere(movingSpheres.length, nextCount))
  }

  movingSpheres.forEach((sphere, index) => {
    const hue = nextCount <= 1 ? 0.15 : index / nextCount
    const position = getSpherePosition(index, nextCount)
    sphere.material.color.setHSL(hue, 0.7, 0.55)
    sphere.material.emissive.setHSL(hue, 0.7, 0.25)
    sphere.position.set(position.x, position.y, position.z)
  })

  sphereCountValue.textContent = String(nextCount)
}

setSphereCount(Number(sphereCountInput.value))
sphereCountInput.addEventListener('input', (event) => {
  setSphereCount(Number(event.target.value))
})

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  torus.rotation.x += 0.01
  torus.rotation.y += 0.015
  movingSpheres.forEach((s, i) => {
    s.position.y = 0.8 + Math.abs(Math.sin(t * 2 + i)) * 1.5
  })
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  syncViewport()
})