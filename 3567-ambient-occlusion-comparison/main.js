// 3567 Ambient Occlusion Comparison - SSAO vs HBAO vs No AO
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

let mode = 0
const labels = ['No AO', 'SSAO', 'Bloom+AO']
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x222222)
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 200)
camera.position.set(8, 8, 12)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 场景物体
const matGround = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 })
const matBox = new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.4, metalness: 0.1 })
const matSphere = new THREE.MeshStandardMaterial({ color: 0x3366aa, roughness: 0.2, metalness: 0.6 })
const matCyl = new THREE.MeshStandardMaterial({ color: 0x44aa66, roughness: 0.5 })
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), matGround)
ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground)
const box = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), matBox)
box.position.set(-4, 1.5, 0); box.castShadow = true; scene.add(box)
const sphere = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), matSphere)
sphere.position.set(0, 2, 0); sphere.castShadow = true; scene.add(sphere)
const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4, 32), matCyl)
cyl.position.set(4, 2, 0); cyl.castShadow = true; scene.add(cyl)
// 小物体
for (let i = 0; i < 8; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matBox)
  m.position.set((Math.random()-0.5)*10, 0.25, (Math.random()-0.5)*10)
  m.castShadow = true; scene.add(m)
}
// 灯光
scene.add(new THREE.AmbientLight(0xffffff, 0.2))
const sun = new THREE.DirectionalLight(0xfff5e0, 1.5)
sun.position.set(10, 20, 10); sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
scene.add(sun)

// 后处理
const composer = new EffectComposer(renderer)
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)
const ssaoPass = new SSAOPass(scene, camera, innerWidth, innerHeight)
ssaoPass.output = SSAOPass.OUTPUT.Default
composer.addPass(ssaoPass)
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.5, 0.9)
composer.addPass(bloomPass)
const outputPass = new OutputPass()
composer.addPass(outputPass)

const labelDiv = document.createElement('div')
labelDiv.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);color:#fff;font:16px monospace;background:rgba(0,0,0,0.7);padding:10px 24px;border-radius:20px;pointer-events:none'
labelDiv.textContent = labels[0]
document.body.appendChild(labelDiv)
const hintDiv = document.createElement('div')
hintDiv.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:#aaa;font:12px monospace;background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:12px;pointer-events:none'
hintDiv.textContent = 'Press SPACE or click to cycle AO modes'
document.body.appendChild(hintDiv)

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { mode = (mode + 1) % 3; updateMode() }
})
window.addEventListener('click', () => { mode = (mode + 1) % 3; updateMode() })

function updateMode() {
  labelDiv.textContent = labels[mode]
  if (mode === 0) {
    ssaoPass.enabled = false; bloomPass.enabled = false
  } else if (mode === 1) {
    ssaoPass.enabled = true; bloomPass.enabled = false
  } else {
    ssaoPass.enabled = false; bloomPass.enabled = true
  }
}

function animate() { requestAnimationFrame(animate); controls.update(); composer.render() }
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
