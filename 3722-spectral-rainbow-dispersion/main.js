// 3722. Spectral Rainbow Dispersion
// Spectral Rainbow Dispersion
// type: custom
import * as THREE from 'three'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 10, 30)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(10, 20, 10)
scene.add(light)
const geo = new THREE.BoxGeometry(1, 1, 1)
const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff })
const mesh = new THREE.Mesh(geo, mat)
scene.add(mesh)
function animate() { requestAnimationFrame(animate); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
