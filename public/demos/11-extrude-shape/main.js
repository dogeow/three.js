import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1020)

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.5, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const dir = new THREE.DirectionalLight(0xffffff, 1.5)
dir.position.set(4, 8, 5)
scene.add(dir)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(12, 80),
  new THREE.MeshStandardMaterial({ color: 0x10192f, roughness: 0.94 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.7
scene.add(floor)

function buildBadgeShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 2.6)
  shape.bezierCurveTo(1.8, 2.5, 2.8, 1.4, 2.8, 0.1)
  shape.bezierCurveTo(2.8, -1.8, 1.3, -3.2, 0, -4.2)
  shape.bezierCurveTo(-1.3, -3.2, -2.8, -1.8, -2.8, 0.1)
  shape.bezierCurveTo(-2.8, 1.4, -1.8, 2.5, 0, 2.6)

  const hole = new THREE.Path()
  hole.absellipse(0, -0.25, 0.95, 1.35, 0, Math.PI * 2, false, 0)
  shape.holes.push(hole)
  return shape
}

const material = new THREE.MeshStandardMaterial({
  color: 0xf97316,
  emissive: 0x7c2d12,
  emissiveIntensity: 0.18,
  metalness: 0.42,
  roughness: 0.22
})

let badgeMesh = null

function rebuildBadge(depth) {
  const nextDepth = Number(depth)
  if (badgeMesh) {
    scene.remove(badgeMesh)
    badgeMesh.geometry.dispose()
  }

  const geometry = new THREE.ExtrudeGeometry(buildBadgeShape(), {
    depth: nextDepth,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelSegments: 6,
    curveSegments: 32
  })
  geometry.center()

  badgeMesh = new THREE.Mesh(geometry, material)
  badgeMesh.rotation.x = -0.18
  badgeMesh.position.y = 0.9
  scene.add(badgeMesh)
}

const depthInput = document.querySelector('#depth')
rebuildBadge(depthInput.value)
depthInput.addEventListener('input', (event) => {
  rebuildBadge(event.target.value)
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  if (badgeMesh) {
    badgeMesh.rotation.y = t * 0.7
    badgeMesh.position.y = 0.85 + Math.sin(t * 1.8) * 0.12
  }

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