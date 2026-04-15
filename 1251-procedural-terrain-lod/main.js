// 增强：程序化地形
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000)
camera.position.set(0, 40, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
const geo = new THREE.PlaneGeometry(100, 100, 64, 64)
const pos = geo.attributes.position
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), y = pos.getY(i)
  pos.setZ(i, Math.sin(x * 0.1) * Math.cos(y * 0.1) * 8 + (Math.random() - 0.5) * 2)
}
geo.computeVertexNormals()
const mat = new THREE.MeshStandardMaterial({ color: 0x3a7d44, wireframe: false, flatShading: true })
scene.add(new THREE.Mesh(geo, mat))
scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const sun = new THREE.DirectionalLight(0xffffcc, 1)
sun.position.set(50, 80, 50)
sun.castShadow = true
scene.add(sun)
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })