// 2048. SDF Spheres
// 有符号距离场球体
import * as THREE from 'three'
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000)
camera.position.z = 5
const renderer = new THREE.WebGLRenderer()
renderer.setSize(innerWidth,innerHeight)
document.body.appendChild(renderer.domElement)

const geo = new THREE.BoxGeometry()
const mat = new THREE.MeshPhongMaterial({color:0x00ffff})
const mesh = new THREE.Mesh(geo,mat)
scene.add(mesh)

const light = new THREE.DirectionalLight(0xffffff,1)
scene.add(light)

function animate() {
  requestAnimationFrame(animate)
  mesh.rotation.x += 0.01
  mesh.rotation.y += 0.01
  renderer.render(scene,camera)
}
animate()
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth,innerHeight)
})
