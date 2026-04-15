import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// 后期处理三件套
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000005)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 0, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// ============ 场景：一堆发光的霓虹圆环 ============
scene.add(new THREE.AmbientLight(0xffffff, 0.1))

const rings = []
for (let i = 0; i < 12; i++) {
  const color = new THREE.Color().setHSL(i / 12, 1, 0.6)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1 + i * 0.2, 0.08, 16, 80),
    // emissive 自发光 —— Bloom 主要抓这部分
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: color,
      emissiveIntensity: 2 // 大于 1 就能「溢出」产生辉光
    })
  )
  ring.rotation.x = Math.random() * Math.PI
  ring.rotation.y = Math.random() * Math.PI
  scene.add(ring)
  rings.push(ring)
}

// 黑色背景球体衬托
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
))

// ============ EffectComposer 后期处理链 ============
// 原理：先把 scene 渲染到一张 RT（离屏纹理），再一层层跑 Pass 处理
const composer = new EffectComposer(renderer)
composer.setPixelRatio(devicePixelRatio)
composer.setSize(innerWidth, innerHeight)

// Pass 1：正常渲染场景
composer.addPass(new RenderPass(scene, camera))

// Pass 2：UnrealBloom —— 提取亮部 → 模糊 → 叠回去
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  1.5,  // strength 强度
  0.4,  // radius 半径
  0.2   // threshold 亮度阈值：超过才参与 bloom
)
composer.addPass(bloom)

// Pass 3：OutputPass —— 处理 tone mapping / gamma，必须放最后
composer.addPass(new OutputPass())

// ============ 控制面板 ============
document.getElementById('strength').oninput = e => bloom.strength = +e.target.value
document.getElementById('radius').oninput = e => bloom.radius = +e.target.value
document.getElementById('threshold').oninput = e => bloom.threshold = +e.target.value

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  rings.forEach((r, i) => {
    r.rotation.x += 0.005 + i * 0.0005
    r.rotation.y += 0.007
    r.material.emissiveIntensity = 1.5 + Math.sin(t * 2 + i) * 0.5
  })
  controls.update()
  // ⚠️ 用 composer 渲染，不再调用 renderer.render
  composer.render()
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})