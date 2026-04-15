// 增强：粒子银河
import * as THREE from 'three'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.015)
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 2000)
camera.position.set(0, 30, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
const COUNT = 8000
const pos = new Float32Array(COUNT * 3)
const col = new Float32Array(COUNT * 3)
for (let i = 0; i < COUNT; i++) {
  const r = 20 + Math.random() * 30
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  pos[i*3] = r * Math.sin(phi) * Math.cos(theta)
  pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.3
  pos[i*3+2] = r * Math.cos(phi)
  const t = Math.random()
  col[i*3] = 0.2 + t * 0.8; col[i*3+1] = 0.5 * t; col[i*3+2] = 1.0 * (1-t)
}
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.9 })))
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const _pl=new THREE.PointLight(0x4488ff, 2, 200);_pl.position.set(30, 30, 30);scene.add(_pl)
const clock = new THREE.Clock()
function animate() { requestAnimationFrame(animate); scene.children.forEach(c => { if (c instanceof THREE.Points) c.rotation.y += 0.001 }); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight) })