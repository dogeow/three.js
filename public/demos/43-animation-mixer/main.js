import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xe8edf3)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(5, 3, 7)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.y = 1

scene.add(new THREE.AmbientLight(0xffffff, 0.7))
const dir = new THREE.DirectionalLight(0xffffff, 1)
dir.position.set(5, 10, 5)
dir.castShadow = true
scene.add(dir)

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.MeshStandardMaterial({ color: 0xd7dee7 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// ============ AnimationMixer 核心 ============
// 原理：
//   gltf.animations —— 模型里烘焙好的一组动作片段 (AnimationClip)
//   AnimationMixer —— 动画播放器，管理所有在该模型上播放的动作
//   mixer.clipAction(clip) —— 把 clip 包装成一个可以 play/stop 的 Action
//   mixer.update(dt) —— 每帧推进时间

let mixer = null
let actions = {}    // name -> AnimationAction
let current = null

const $status = document.getElementById('status')
const $clips = document.getElementById('clips')

const URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb'

new GLTFLoader().load(URL, (gltf) => {
  const model = gltf.scene
  model.scale.setScalar(0.025)
  model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
  scene.add(model)

  // 创建 mixer，绑定到模型根节点
  mixer = new THREE.AnimationMixer(model)

  // 为每个动画片段创建一个 Action，并用名字索引
  gltf.animations.forEach(clip => {
    const action = mixer.clipAction(clip)
    actions[clip.name] = action
    const btn = document.createElement('button')
    btn.textContent = clip.name
    btn.onclick = () => switchTo(clip.name, btn)
    $clips.appendChild(btn)
  })

  // 默认播放第一个
  const firstName = gltf.animations[0].name
  switchTo(firstName, $clips.children[0])

  $status.textContent = `✅ ${gltf.animations.length} 个动作可切换`
}, undefined, err => {
  $status.textContent = '❌ ' + err.message
})

function switchTo(name, btn) {
  const next = actions[name]
  if (!next || next === current) return

  // 交叉淡入淡出：旧动作 0.3 秒淡出，新动作 0.3 秒淡入
  if (current) current.fadeOut(0.3)
  next.reset().fadeIn(0.3).play()
  current = next

  // 按钮高亮
  ;[...$clips.children].forEach(b => b.classList.remove('active'))
  btn?.classList.add('active')
}

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  if (mixer) mixer.update(dt) // ⚠️ 每帧推进动画时间，缺了这个就不动
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})