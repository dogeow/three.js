// 2177. Procedural Terrain LOD
// 程序化地形多级细节
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x112244)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000)
camera.position.set(0, 30, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const levels = [64, 32, 16, 8]
const colors = [0x228833, 0x33aa44, 0x55cc44, 0x88dd66]
levels.forEach((seg, i) => {
  const geo = new THREE.PlaneGeometry(100, 100, seg, seg)
  const pos = geo.attributes.position
  for (let j = 0; j < pos.count; j++) {
    const x = pos.getX(j), y = pos.getY(j)
    const h = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 5 + (Math.random() - 0.5) * 2
    pos.setZ(j, h)
  }
  geo.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({ color: colors[i], wireframe: i % 2 === 0, flatShading: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = i * 0.5
  scene.add(mesh)
})

scene.fog = new THREE.Fog(0x112244, 50, 200)
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xffffcc, 1)
sun.position.set(50, 100, 50)
sun.castShadow = true
scene.add(sun)

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
