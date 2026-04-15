import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050913)
scene.fog = new THREE.FogExp2(0x050913, 0.018)

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 200)
camera.position.set(9, 7, 13)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dir = new THREE.DirectionalLight(0xffffff, 1.4)
dir.position.set(8, 12, 6)
scene.add(dir)

const points = [
  new THREE.Vector3(-4, 1.2, 0),
  new THREE.Vector3(-2, 4.5, 3),
  new THREE.Vector3(1.8, 5.2, 2.4),
  new THREE.Vector3(5, 2.5, -1.5),
  new THREE.Vector3(3.2, -0.2, -4),
  new THREE.Vector3(-0.8, 1.8, -5),
  new THREE.Vector3(-4.8, 3.6, -2.2)
]

const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.15)
const tubeGeometry = new THREE.TubeGeometry(curve, 320, 0.22, 18, true)
const tubeMaterial = new THREE.MeshStandardMaterial({
  color: 0x60a5fa,
  emissive: 0x1d4ed8,
  emissiveIntensity: 0.55,
  metalness: 0.2,
  roughness: 0.18
})
const tube = new THREE.Mesh(tubeGeometry, tubeMaterial)
scene.add(tube)

const guide = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(curve.getPoints(220)),
  new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.28 })
)
scene.add(guide)

const controlDotGeo = new THREE.SphereGeometry(0.12, 18, 18)
const controlDotMat = new THREE.MeshBasicMaterial({ color: 0xfef08a })
points.forEach((point) => {
  const dot = new THREE.Mesh(controlDotGeo, controlDotMat)
  dot.position.copy(point)
  scene.add(dot)
})

const ship = new THREE.Group()
const shipBody = new THREE.Group()
ship.add(shipBody)

const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.18, 0.9, 8, 18),
  new THREE.MeshStandardMaterial({ color: 0xff7b72, metalness: 0.55, roughness: 0.2 })
)
body.rotation.z = Math.PI / 2
shipBody.add(body)

const nose = new THREE.Mesh(
  new THREE.ConeGeometry(0.16, 0.45, 24),
  new THREE.MeshStandardMaterial({ color: 0xffd36d, metalness: 0.25, roughness: 0.18 })
)
nose.rotation.z = -Math.PI / 2
nose.position.x = 0.68
shipBody.add(nose)

const glow = new THREE.PointLight(0x8be9fd, 12, 8)
ship.add(glow)
scene.add(ship)

const speedInput = document.querySelector('#speed')
const speedValue = document.querySelector('#speed-value')
let speed = Number(speedInput.value)
speedValue.textContent = `${speed.toFixed(1)}x`

speedInput.addEventListener('input', (event) => {
  speed = Number(event.target.value)
  speedValue.textContent = `${speed.toFixed(1)}x`
})

const up = new THREE.Vector3(0, 1, 0)
const lookTarget = new THREE.Vector3()
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime() * 0.08 * speed
  const u = t % 1
  const nextU = (u + 0.01) % 1
  const position = curve.getPointAt(u)
  const nextPosition = curve.getPointAt(nextU)

  ship.position.copy(position)
  lookTarget.copy(nextPosition)
  ship.lookAt(lookTarget)
  ship.rotateY(Math.PI / 2)
  ship.up.copy(up)
  shipBody.rotation.x = Math.sin(t * 8) * 0.08

  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})