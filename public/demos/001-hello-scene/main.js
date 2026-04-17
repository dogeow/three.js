// 001. Hello Scene — 最简单的 Three.js 场景（无动画，静态展示）
// 核心三要素：Scene（场景）、Camera（相机）、Renderer（渲染器）
import * as THREE from 'three'

// 1. 创建场景（所有 3D 物体的容器）
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

// 2. 创建透视相机
// 参数：视野角(FOV) | 宽高比 | 近裁剪面 | 远裁剪面
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
camera.position.z = 5  // 把相机往后移，否则会看不到物体

// 3. 创建 WebGL 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

// 4. 创建一个绿色立方体
const geometry = new THREE.BoxGeometry(2, 2, 2)
const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// 5. 渲染（这里只渲染一次，无动画循环）
renderer.render(scene, camera)

// 6. 处理窗口缩放
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
