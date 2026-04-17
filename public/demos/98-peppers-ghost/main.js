import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1020)

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.8, 12)

const renderer = new SVGRenderer()
renderer.setSize(innerWidth, innerHeight)
renderer.setClearColor(0x0b1020)
renderer.setQuality('high')
renderer.overdraw = 0.5
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 7
controls.maxDistance = 18
controls.target.set(0, 1.2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.72))

const keyLight = new THREE.DirectionalLight(0xffffff, 1.45)
keyLight.position.set(5, 8, 6)
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.45)
fillLight.position.set(-4, 3, -3)
scene.add(fillLight)

const stage = new THREE.Group()
scene.add(stage)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6.8, 96),
  new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.55
  })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.85
stage.add(floor)

const shapes = []

function addShape(geometry, material, edgeColor, position) {
  const group = new THREE.Group()

  const mesh = new THREE.Mesh(geometry, material)
  group.add(mesh)

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: edgeColor })
  )
  group.add(edges)

  group.position.copy(position)
  scene.add(group)
  shapes.push(group)
  return group
}

addShape(
  new THREE.TorusKnotGeometry(0.95, 0.28, 180, 28),
  new THREE.MeshLambertMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.9
  }),
  0xe0f2fe,
  new THREE.Vector3(0, 1.25, 0.2)
)

addShape(
  new THREE.SphereGeometry(0.95, 24, 24),
  new THREE.MeshLambertMaterial({
    color: 0xfb7185,
    transparent: true,
    opacity: 0.86
  }),
  0xffe4e6,
  new THREE.Vector3(-3.25, 0.2, 1.5)
)

addShape(
  new THREE.BoxGeometry(1.6, 1.6, 1.6),
  new THREE.MeshLambertMaterial({
    color: 0x4ade80,
    transparent: true,
    opacity: 0.84
  }),
  0xdcfce7,
  new THREE.Vector3(-1.05, 0.15, -1.5)
)

addShape(
  new THREE.ConeGeometry(0.9, 2.2, 24),
  new THREE.MeshLambertMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.88
  }),
  0xfef9c3,
  new THREE.Vector3(3.25, 0.2, -1.4)
)

const orbitLines = new THREE.Group()
scene.add(orbitLines)

const orbitPalette = [0x60a5fa, 0xf472b6, 0x4ade80]
for (let i = 0; i < 3; i++) {
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 120 }, (_, index) => {
        const angle = (index / 120) * Math.PI * 2
        return new THREE.Vector3(
          Math.cos(angle) * (3 + i * 0.65),
          0,
          Math.sin(angle) * (3 + i * 0.65)
        )
      })
    ),
    new THREE.LineBasicMaterial({ color: orbitPalette[i] })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.15 + i * 0.45
  orbitLines.add(ring)
}

const qualityInput = document.getElementById('quality')
const qualityValue = document.getElementById('quality-value')
const overdrawInput = document.getElementById('overdraw')
const overdrawValue = document.getElementById('overdraw-value')

function syncRendererSettings() {
  renderer.setQuality(qualityInput.value)
  renderer.overdraw = Number(overdrawInput.value)
  qualityValue.textContent = qualityInput.value
  overdrawValue.textContent = Number(overdrawInput.value).toFixed(2)
}

qualityInput.addEventListener('change', syncRendererSettings)
overdrawInput.addEventListener('input', syncRendererSettings)
syncRendererSettings()

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  orbitLines.rotation.y += delta * 0.22

  shapes.forEach((shape, index) => {
    shape.rotation.x += delta * (0.16 + index * 0.04)
    shape.rotation.y += delta * (0.32 + index * 0.08)
  })

  shapes[0].position.y = 1.25 + Math.sin(time * 1.4) * 0.22
  shapes[1].position.y = 0.2 + Math.sin(time * 1.1) * 0.12
  shapes[2].position.y = 0.15 + Math.sin(time * 1.3 + 1.2) * 0.15
  shapes[3].position.y = 0.2 + Math.sin(time * 1.5 + 2.2) * 0.16

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera
window.svgRenderer = renderer

function tick() {
  requestAnimationFrame(tick)
  animate()
}

tick()