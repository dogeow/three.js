import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1020)
scene.fog = new THREE.FogExp2(0x0b1020, 0.015)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120)
camera.position.set(0, 4.2, 16)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.5, -10)

scene.add(new THREE.AmbientLight(0xffffff, 0.42))
const dir = new THREE.DirectionalLight(0xffffff, 1.5)
dir.position.set(5, 8, 6)
scene.add(dir)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.94 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.6
scene.add(floor)

const guideMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.7 })
for (let i = 0; i < 8; i++) {
  const z = -i * 5
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, -1.59, z),
      new THREE.Vector3(5, -1.59, z)
    ]),
    guideMat
  )
  scene.add(line)
}

const objects = []
for (let i = 0; i < 8; i++) {
  const mesh = new THREE.Mesh(
    i % 2 === 0
      ? new THREE.TorusKnotGeometry(0.8, 0.24, 120, 18)
      : new THREE.IcosahedronGeometry(0.95, 1),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.55 + i * 0.05, 0.72, 0.58),
      emissive: new THREE.Color().setHSL(0.55 + i * 0.05, 0.72, 0.24),
      emissiveIntensity: 0.15,
      metalness: 0.22,
      roughness: 0.16
    })
  )
  mesh.position.set(
    (i % 2 === 0 ? -1 : 1) * (1.3 + (i % 2) * 0.8),
    1 + (i % 3) * 0.45,
    -i * 5
  )
  scene.add(mesh)
  objects.push(mesh)
}

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const bokehPass = new BokehPass(scene, camera, {
  focus: 22,
  aperture: 0.004,
  maxblur: 0.02
})
composer.addPass(bokehPass)

const focusInput = document.querySelector('#focus')
const apertureInput = document.querySelector('#aperture')
const focusValue = document.querySelector('#focus-value')
const apertureValue = document.querySelector('#aperture-value')

function updateFocus(value) {
  const next = Number(value)
  bokehPass.materialBokeh.uniforms.focus.value = next
  focusValue.textContent = next.toFixed(1)
}

function updateAperture(value) {
  const next = Number(value)
  bokehPass.materialBokeh.uniforms.aperture.value = next
  apertureValue.textContent = next.toFixed(4)
}

updateFocus(focusInput.value)
updateAperture(apertureInput.value)

focusInput.addEventListener('input', (event) => {
  updateFocus(event.target.value)
})
apertureInput.addEventListener('input', (event) => {
  updateAperture(event.target.value)
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  objects.forEach((mesh, index) => {
    mesh.rotation.x = t * (0.25 + index * 0.03)
    mesh.rotation.y = t * (0.4 + index * 0.05)
    mesh.position.y = 1 + (index % 3) * 0.45 + Math.sin(t * 1.6 + index) * 0.12
  })

  controls.update()
  composer.render()
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  composer.setSize(innerWidth, innerHeight)
})