// 增强：粒子漩涡
import * as THREE from 'three'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000005)
scene.fog = new THREE.FogExp2(0x000005, 0.02)
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000)
camera.position.z = 50
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const COUNT = 10000
const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3)
for (let i = 0; i < COUNT; i++) {
  const theta = Math.random() * Math.PI * 20
  const r = Math.sqrt(theta) * 3
  const phi = Math.random() * Math.PI * 2
  pos[i*3] = r * Math.cos(phi + theta * 0.2)
  pos[i*3+1] = (Math.random() - 0.5) * 5
  pos[i*3+2] = r * Math.sin(phi + theta * 0.2)
  col[i*3] = 0.2 + Math.random() * 0.8; col[i*3+1] = 0.5; col[i*3+2] = 1.0
}
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0.8 })))
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
function animate() {
  requestAnimationFrame(animate)
  const pa = geo.attributes.position
  for (let i = 0; i < COUNT; i++) { const theta = Math.atan2(pa.array[i*3+2], pa.array[i*3]); const r = Math.sqrt(pa.array[i*3]**2 + pa.array[i*3+2]**2); const nt = theta + 0.01; pa.array[i*3] = Math.cos(nt) * r; pa.array[i*3+2] = Math.sin(nt) * r }
  pa.needsUpdate = true
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })