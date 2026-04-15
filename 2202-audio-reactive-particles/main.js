// 2202. 音频响应粒子
// 音频响应粒子系统
import * as THREE from 'three'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000)
camera.position.z = 30
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const count = 5000
const positions = new Float32Array(count * 3)
const velocities = new Float32Array(count * 3)
const colors = new Float32Array(count * 3)

for (let i = 0; i < count; i++) {
  positions[i*3] = (Math.random() - 0.5) * 40
  positions[i*3+1] = (Math.random() - 0.5) * 40
  positions[i*3+2] = (Math.random() - 0.5) * 40
  velocities[i*3] = (Math.random() - 0.5) * 0.1
  velocities[i*3+1] = (Math.random() - 0.5) * 0.1
  velocities[i*3+2] = (Math.random() - 0.5) * 0.1
  colors[i*3] = Math.random()
  colors[i*3+1] = Math.random()
  colors[i*3+2] = Math.random()
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
const mat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.8 })
scene.add(new THREE.Points(geo, mat))
scene.add(new THREE.AmbientLight(0xffffff, 0.5))

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  const pos = geo.attributes.position
  for (let i = 0; i < count; i++) {
    pos.array[i*3] += velocities[i*3] * (1 + Math.sin(t + i) * 0.5)
    pos.array[i*3+1] += velocities[i*3+1] * (1 + Math.cos(t + i) * 0.5)
    pos.array[i*3+2] += velocities[i*3+2]
    if (Math.abs(pos.array[i*3]) > 20) velocities[i*3] *= -1
    if (Math.abs(pos.array[i*3+1]) > 20) velocities[i*3+1] *= -1
    if (Math.abs(pos.array[i*3+2]) > 20) velocities[i*3+2] *= -1
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
