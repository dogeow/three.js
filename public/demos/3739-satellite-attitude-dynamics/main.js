// 3739. Satellite Attitude Dynamics
// Euler angle rotation, quaternion representation, torque-free tumble
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000008)
scene.add(new THREE.FogExp2(0x000008, 0.003))
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000)
camera.position.set(8, 5, 12)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Starfield
const starGeo = new THREE.BufferGeometry()
const starCount = 3000
const starPos = new Float32Array(starCount * 3)
for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = 800
  starPos[i*3] = r * Math.sin(phi) * Math.cos(theta)
  starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
  starPos[i*3+2] = r * Math.cos(phi)
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 })))

// Satellite body
const satGroup = new THREE.Group()
const bus = new THREE.Mesh(
  new THREE.BoxGeometry(2, 1.5, 1.5),
  new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 }))
satGroup.add(bus)

// Solar panels
const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a3a6a, metalness: 0.5, roughness: 0.3 })
const panel1 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 1.2), panelMat)
panel1.position.x = -3
satGroup.add(panel1)
const panel2 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 1.2), panelMat)
panel2.position.x = 3
satGroup.add(panel2)
const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 }))
boom.position.y = -2
satGroup.add(boom)

const dish = new THREE.Mesh(
  new THREE.ConeGeometry(0.5, 0.3, 16, 1, true),
  new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide }))
dish.rotation.x = Math.PI
dish.position.set(0.8, 1, 0)
satGroup.add(dish)
scene.add(satGroup)

// Reference axes on satellite
const axisLen = 2.5
const makeAxis = (dir, color) => {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), dir.clone().multiplyScalar(axisLen)])
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color }))
}
satGroup.add(makeAxis(new THREE.Vector3(1,0,0), 0xff3333))
satGroup.add(makeAxis(new THREE.Vector3(0,1,0), 0x33ff33))
satGroup.add(makeAxis(new THREE.Vector3(0,0,1), 0x3333ff))

// Initial angular velocity (principal axes)
const omega = new THREE.Vector3(0.4, 0.8, 0.2).normalize().multiplyScalar(0.6)
const quat = new THREE.Quaternion()
const euler = new THREE.Euler()
const clock = new THREE.Clock()

// Info HUD
let info = document.createElement('div')
info.style.cssText = 'position:fixed;top:10px;left:10px;color:#88ffaa;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.75);padding:10px;border-radius:8px;line-height:1.9'
document.body.appendChild(info)

scene.add(new THREE.AmbientLight(0xffffff, 0.6))

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const angle = omega.length() * dt
  const axis = omega.clone().normalize()
  const dq = new THREE.Quaternion().setFromAxisAngle(axis, angle)
  quat.multiply(dq)
  satGroup.quaternion.copy(quat)

  euler.setFromQuaternion(quat, 'XYZ')
  const rad2deg = 180 / Math.PI
  info.innerHTML = `SATELLITE ATTITUDE<br>Roll X: ${(euler.x*rad2deg).toFixed(1)} deg<br>Pitch Y: ${(euler.y*rad2deg).toFixed(1)} deg<br>Yaw Z: ${(euler.z*rad2deg).toFixed(1)} deg<br>Ang Vel: ${omega.length().toFixed(3)} rad/s<br><span style="color:#aaa">Torque-free rotation</span>`

  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
