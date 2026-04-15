import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x03010a)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 2, 8)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.3
document.body.appendChild(renderer.domElement)

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.3))

const lights = [
  { pos: [5, 5, 5],   color: 0xffffff, intensity: 2.5 },
  { pos: [-5, 3, -3], color: 0xc4b5fd, intensity: 1.8 },
  { pos: [0, -3, 5],  color: 0x38bdf8, intensity: 1.2 },
  { pos: [3, -2, -5], color: 0xf472b6, intensity: 1.0 },
  { pos: [-3, 5, -2], color: 0xfbbf24, intensity: 1.5 },
]

lights.forEach(l => {
  const light = new THREE.PointLight(l.color, l.intensity, 20)
  light.position.set(...l.pos)
  scene.add(light)
})

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x080618, roughness: 0.1, metalness: 0.9 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -3.5
scene.add(ground)

// Subtle fog
scene.fog = new THREE.FogExp2(0x03010a, 0.06)

// ─── Environment Map (procedural) ─────────────────────────────────────────────
const pmrem = new THREE.PMREMGenerator(renderer)
pmrem.compileEquirectangularShader()

// Create a simple gradient environment
const envScene = new THREE.Scene()
const envCam = new THREE.CubeCamera(0.1, 100, new THREE.WebGLCubeRenderTarget(256))

const envGeo = new THREE.SphereGeometry(50, 32, 32)
const envMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {},
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float t = d.y * 0.5 + 0.5;
      vec3 bottom = vec3(0.01, 0.005, 0.03);
      vec3 mid    = vec3(0.04, 0.02, 0.1);
      vec3 top    = vec3(0.02, 0.01, 0.06);
      vec3 col = mix(bottom, mid, smoothstep(0.0, 0.5, t));
      col = mix(col, top, smoothstep(0.5, 1.0, t));
      // Add some bright spots for reflections
      float spot1 = smoothstep(0.95, 1.0, dot(d, normalize(vec3(1,0.8,0.5))));
      float spot2 = smoothstep(0.95, 1.0, dot(d, normalize(vec3(-0.8,0.5,-0.3))));
      float spot3 = smoothstep(0.95, 1.0, dot(d, normalize(vec3(0.3,-0.8,0.5))));
      col += vec3(2.0, 1.8, 1.5) * spot1;
      col += vec3(1.5, 1.0, 2.0) * spot2;
      col += vec3(0.5, 1.5, 2.0) * spot3;
      gl_FragColor = vec4(col, 1.0);
    }
  `
})
envScene.add(new THREE.Mesh(envGeo, envMat))
envCam.position.set(0, 0, 0)
envCam.update(renderer, envScene)
const envMap = pmrem.fromCubemap(envCam.renderTarget.texture).texture
scene.environment = envMap
pmrem.dispose()

// ─── Gem Geometry ──────────────────────────────────────────────────────────────
const GEM_TYPES = [
  () => new THREE.OctahedronGeometry(1.2, 2),
  () => new THREE.IcosahedronGeometry(1.1, 1),
  () => new THREE.DodecahedronGeometry(1.0, 0),
  () => {
    const geo = new THREE.OctahedronGeometry(1.3, 0)
    // Stretch it
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) * 1.4)
    }
    geo.computeVertexNormals()
    return geo
  },
  () => new THREE.TorusKnotGeometry(0.7, 0.25, 128, 16, 2, 3),
]

const GEM_COLORS = [
  0x60a5fa, // sapphire blue
  0x34d399, // emerald green
  0xf472b6, // ruby pink
  0xc4b5fd, // amethyst purple
  0xfbbf24, // topaz gold
  0xf87171, // ruby red
  0x2dd4bf, // aquamarine teal
  0xfb923c, // amber orange
]

// Color swatches
const colorRow = document.getElementById('gemColors')
let selectedColorIdx = 0
GEM_COLORS.forEach((c, i) => {
  const sw = document.createElement('div')
  sw.className = 'color-swatch' + (i === 0 ? ' active' : '')
  sw.style.background = '#' + c.toString(16).padStart(6, '0')
  sw.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'))
    sw.classList.add('active')
    selectedColorIdx = i
    rebuildGem()
  })
  colorRow.appendChild(sw)
})

// ─── Gem Mesh ─────────────────────────────────────────────────────────────────
let gemMesh = null
let gemGeo  = null

function rebuildGem() {
  if (gemMesh) { scene.remove(gemMesh); gemMesh.geometry.dispose() }

  const geoIdx = Math.floor(Math.random() * GEM_TYPES.length)
  gemGeo = GEM_TYPES[geoIdx]()

  const color = GEM_COLORS[selectedColorIdx]

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.0,
    roughness: 0.02,
    transmission: 0.95,
    thickness: 1.5,
    ior: currentParams.ior,
    dispersion: currentParams.dispersion,
    transparent: true,
    envMapIntensity: 2.0,
    side: THREE.DoubleSide,
  })

  gemMesh = new THREE.Mesh(gemGeo, mat)
  gemMesh.castShadow = false
  scene.add(gemMesh)
}

// ─── Sparkle Particles ─────────────────────────────────────────────────────────
const sparkleCount = 200
const spPos = new Float32Array(sparkleCount * 3)
const spSizes = new Float32Array(sparkleCount)
const spLife  = new Float32Array(sparkleCount).fill(-1)

for (let i = 0; i < sparkleCount; i++) {
  const theta = Math.random() * Math.PI * 2
  const phi   = Math.acos(2 * Math.random() - 1)
  const r     = 1.5 + Math.random() * 1.5
  spPos[i*3]   = Math.sin(phi) * Math.cos(theta) * r
  spPos[i*3+1] = Math.sin(phi) * Math.sin(theta) * r
  spPos[i*3+2] = Math.cos(phi) * r
  spLife[i]    = Math.random()
  spSizes[i]   = 0.02 + Math.random() * 0.06
}

const spGeo = new THREE.BufferGeometry()
spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3))
spGeo.setAttribute('size',     new THREE.BufferAttribute(spSizes, 1))

const spMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.06,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
})

const sparkles = new THREE.Points(spGeo, spMat)
scene.add(sparkles)

// ─── Controls ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 3
controls.maxDistance = 15

let currentParams = { ior: 2.4, dispersion: 0.06, transmission: 0.95, roughness: 0.02, spin: 0.5 }

function bindSlider(sliderId, valId, param, fmt) {
  const slider = document.getElementById(sliderId)
  const label  = document.getElementById(valId)
  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value)
    currentParams[param] = v
    label.textContent = fmt(v)
    if (gemMesh) {
      gemMesh.material[param] = v
      gemMesh.material.needsUpdate = true
    }
  })
}
bindSlider('iorSlider',   'iorVal',   'ior',         v => v.toFixed(2))
bindSlider('dispSlider',  'dispVal',  'dispersion',  v => v.toFixed(3))
bindSlider('transSlider', 'transVal', 'transmission', v => v.toFixed(2))
bindSlider('roughSlider', 'roughVal', 'roughness',    v => v.toFixed(3))
bindSlider('spinSlider',  'spinVal',  'spin',         v => v.toFixed(2))

// Click to regenerate
renderer.domElement.addEventListener('click', () => {
  rebuildGem()
})
window.addEventListener('keydown', e => {
  if (e.code === 'Space') currentParams.spin = 0
  if (e.code === 'Enter')  rebuildGem()
})

// ─── Animate ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
let isSpinning = true

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const elapsed = clock.elapsedTime

  if (gemMesh && isSpinning) {
    gemMesh.rotation.y += currentParams.spin * delta
    gemMesh.rotation.x = Math.sin(elapsed * 0.3) * 0.15

    // Pulse transmission based on rotation
    gemMesh.material.thickness = 1.5 + Math.sin(elapsed * 2) * 0.3
    gemMesh.material.needsUpdate = true
  }

  // Sparkle particles
  for (let i = 0; i < sparkleCount; i++) {
    if (spLife[i] < 0) {
      // Respawn
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 1.3 + Math.random() * 2
      spPos[i*3]   = Math.sin(phi) * Math.cos(theta) * r
      spPos[i*3+1] = Math.sin(phi) * Math.sin(theta) * r
      spPos[i*3+2] = Math.cos(phi) * r
      spLife[i]    = 0.3 + Math.random() * 0.8
      spSizes[i]   = 0.02 + Math.random() * 0.08
    } else {
      spLife[i] -= delta
      spSizes[i] = Math.max(0, spSizes[i] * 0.98)
    }
  }
  spGeo.attributes.position.needsUpdate = true
  spGeo.attributes.size.needsUpdate = true

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene

rebuildGem()
animate()