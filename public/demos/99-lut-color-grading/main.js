import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x060814)
scene.fog = new THREE.FogExp2(0x060814, 0.028)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4.5, 12)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 7
controls.maxDistance = 20
controls.target.set(0, 1.3, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))

const keyLight = new THREE.DirectionalLight(0xffffff, 1.35)
keyLight.position.set(5, 9, 6)
scene.add(keyLight)

const redLight = new THREE.PointLight(0xfb7185, 18, 18, 2)
redLight.position.set(-4, 3, 4)
scene.add(redLight)

const greenLight = new THREE.PointLight(0x4ade80, 16, 18, 2)
greenLight.position.set(0, 4, -5)
scene.add(greenLight)

const blueLight = new THREE.PointLight(0x60a5fa, 18, 18, 2)
blueLight.position.set(5, 2, 2)
scene.add(blueLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(16, 120),
  new THREE.MeshStandardMaterial({
    color: 0x101826,
    roughness: 0.92,
    metalness: 0.1
  })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.9
scene.add(floor)

const props = []

function addProp(geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y, z)
  scene.add(mesh)
  props.push(mesh)
  return mesh
}

addProp(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.14, metalness: 0.18 }),
  -3.8, 0.2, 1.6
)
addProp(
  new THREE.BoxGeometry(1.8, 1.8, 1.8),
  new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.28, metalness: 0.12 }),
  -1.1, 0.1, -1.4
)
addProp(
  new THREE.TorusKnotGeometry(0.95, 0.28, 180, 28),
  new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.22, metalness: 0.35 }),
  1.8, 1.1, 0.2
)
addProp(
  new THREE.ConeGeometry(1, 2.3, 32),
  new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.08 }),
  4.2, 0.25, -1.6
)

const arches = new THREE.Group()
scene.add(arches)
for (let i = 0; i < 3; i++) {
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(2.2 + i * 0.55, 0.07, 12, 120, Math.PI),
    new THREE.MeshBasicMaterial({ color: [0xfb7185, 0x60a5fa, 0x4ade80][i] })
  )
  arch.position.y = 0.6 + i * 0.5
  arch.rotation.z = Math.PI
  arches.add(arch)
}

function clamp01(value) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function createLUT(transform, size = 16) {
  const data = new Uint8Array(size * size * size * 4)
  let ptr = 0

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const base = {
          r: x / (size - 1),
          g: y / (size - 1),
          b: z / (size - 1)
        }
        const graded = transform(base)
        data[ptr++] = Math.round(clamp01(graded.r) * 255)
        data[ptr++] = Math.round(clamp01(graded.g) * 255)
        data[ptr++] = Math.round(clamp01(graded.b) * 255)
        data[ptr++] = 255
      }
    }
  }

  const texture = new THREE.Data3DTexture(data, size, size, size)
  texture.format = THREE.RGBAFormat
  texture.type = THREE.UnsignedByteType
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.wrapR = THREE.ClampToEdgeWrapping
  texture.unpackAlignment = 1
  texture.needsUpdate = true
  return texture
}

const luts = {
  identity: createLUT(({ r, g, b }) => ({ r, g, b })),
  tealOrange: createLUT(({ r, g, b }) => ({
    r: r * 1.08 + b * 0.04 + 0.02,
    g: g * 0.98 + b * 0.03,
    b: b * 1.08 + g * 0.05
  })),
  magentaNight: createLUT(({ r, g, b }) => ({
    r: r * 0.88 + b * 0.18 + 0.04,
    g: g * 0.82,
    b: b * 1.06 + r * 0.06
  })),
  bleachBypass: createLUT(({ r, g, b }) => {
    const luma = r * 0.3 + g * 0.59 + b * 0.11
    return {
      r: THREE.MathUtils.lerp(r, luma * 1.08, 0.72),
      g: THREE.MathUtils.lerp(g, luma * 1.04, 0.72),
      b: THREE.MathUtils.lerp(b, luma * 0.98, 0.72)
    }
  }),
  warmSunset: createLUT(({ r, g, b }) => ({
    r: r * 1.12 + g * 0.05 + 0.03,
    g: g * 0.94 + r * 0.04,
    b: b * 0.82 + g * 0.02
  }))
}

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const lutPass = new LUTPass({ lut: luts.identity, intensity: 1 })
composer.addPass(lutPass)
composer.addPass(new OutputPass())

const presetInput = document.getElementById('preset')
const presetValue = document.getElementById('preset-value')
const intensityInput = document.getElementById('intensity')
const intensityValue = document.getElementById('intensity-value')

function syncLut() {
  lutPass.lut = luts[presetInput.value]
  lutPass.intensity = Number(intensityInput.value)
  presetValue.textContent = presetInput.value
  intensityValue.textContent = Number(intensityInput.value).toFixed(2)
}

presetInput.addEventListener('change', syncLut)
intensityInput.addEventListener('input', syncLut)
syncLut()

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  props.forEach((mesh, index) => {
    mesh.rotation.y += delta * (0.28 + index * 0.08)
    mesh.rotation.x += delta * (0.12 + index * 0.05)
    mesh.position.y = (index === 2 ? 1.1 : 0.2) + Math.sin(time * 1.2 + index) * 0.18
  })

  arches.rotation.y += delta * 0.18

  controls.update()
  composer.render(delta)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera
window.lutPass = lutPass

renderer.setAnimationLoop(animate)