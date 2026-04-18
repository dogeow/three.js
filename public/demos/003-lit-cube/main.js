// 003. Lit Cube — 引入受光材质与第一组灯光
// 新技术点：MeshStandardMaterial + AmbientLight + DirectionalLight
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x3C3C3C)

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(3, 2, 5)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
document.body.appendChild(renderer.domElement)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2)
directionalLight.position.set(4, 6, 8)
scene.add(directionalLight)

const geometry = new THREE.BoxGeometry(2, 2, 2)
const material = new THREE.MeshStandardMaterial({ color: 0x00ffcc, roughness: 0.18, metalness: 0.05 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

renderer.render(scene, camera)

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.render(scene, camera)
})