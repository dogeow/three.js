import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x141821)
scene.fog = new THREE.Fog(0x141821, 40, 120)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(30, 30, 50)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dir = new THREE.DirectionalLight(0xffffff, 1)
dir.position.set(20, 40, 20)
scene.add(dir)

// ============ InstancedMesh ============
const COUNT = 10000
const GRID = 100 // 100×100 网格

// 第三个参数是实例数，渲染时 GPU 会按这个数量复制 COUNT 次
const geo = new THREE.BoxGeometry(0.8, 1, 0.8)
const mat = new THREE.MeshStandardMaterial({ roughness: 0.7 })
const mesh = new THREE.InstancedMesh(geo, mat, COUNT)
scene.add(mesh)

// 每个实例需要一个「变换矩阵」 + 可选「颜色」
const dummy = new THREE.Object3D() // 临时对象，用来拼矩阵
const color = new THREE.Color()
const baseHeights = new Float32Array(COUNT) // 保存每个实例的基础高度

for (let i = 0; i < COUNT; i++) {
  const x = (i % GRID - GRID / 2) * 1.0
  const z = (Math.floor(i / GRID) - GRID / 2) * 1.0
  dummy.position.set(x, 0, z)
  dummy.updateMatrix()
  mesh.setMatrixAt(i, dummy.matrix)

  // 按位置设置颜色（每个实例独立）
  const hue = (x + z) * 0.01 + 0.5
  color.setHSL(hue, 0.6, 0.5)
  mesh.setColorAt(i, color)

  baseHeights[i] = 0
}

// ============ 动画：让方块像水波一样起伏 ============
const clock = new THREE.Clock()
let lastTime = performance.now()
let frames = 0
const $fps = document.getElementById('fps')

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  for (let i = 0; i < COUNT; i++) {
    const x = (i % GRID - GRID / 2) * 1.0
    const z = (Math.floor(i / GRID) - GRID / 2) * 1.0
    const dist = Math.sqrt(x * x + z * z)
    const h = Math.sin(dist * 0.3 - t * 3) * 2 + 2

    dummy.position.set(x, h * 0.5, z)
    dummy.scale.set(1, h, 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true // ⚠️ 必须

  controls.update()
  renderer.render(scene, camera)

  // 简易 FPS
  frames++
  const now = performance.now()
  if (now - lastTime > 500) {
    $fps.textContent = 'FPS: ' + ((frames * 1000) / (now - lastTime)).toFixed(0) +
                       ' · Draw Calls: ' + renderer.info.render.calls
    frames = 0
    lastTime = now
  }
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})