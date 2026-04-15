// 2325. 粒子漩涡
// 粒子漩涡系统
import * as THREE from 'three'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000)
camera.position.z = 50
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const count = 10000
const positions = new Float32Array(count * 3)
const colors = new Float32Array(count * 3)
for (let i = 0; i < count; i++) {
  const theta = Math.random() * Math.PI * 20
  const r = Math.sqrt(theta) * 3
  const phi = Math.random() * Math.PI * 2
  positions[i*3] = r * Math.cos(phi + theta * 0.2)
  positions[i*3+1] = (Math.random() - 0.5) * 5
  positions[i*3+2] = r * Math.sin(phi + theta * 0.2)
  colors[i*3] = 0.2 + Math.random() * 0.8
  colors[i*3+1] = 0.5
  colors[i*3+2] = 1.0
}
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0.8 })))
scene.add(new THREE.AmbientLight(0xffffff, 0.5))

function animate() {
  requestAnimationFrame(animate)
  const pos = geo.attributes.position
  for (let i = 0; i < count; i++) {
    const theta = Math.atan2(pos.array[i*3+2], pos.array[i*3])
    const r = Math.sqrt(pos.array[i*3]**2 + pos.array[i*3+2]**2)
    const newTheta = theta + 0.01
    pos.array[i*3] = Math.cos(newTheta) * r
    pos.array[i*3+2] = Math.sin(newTheta) * r
  }
  pos.needsUpdate = true
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
