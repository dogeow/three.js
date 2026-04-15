import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Scene setup - underwater
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x021520)
scene.fog = new THREE.FogExp2(0x021e2e, 0.025)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300)
camera.position.set(0, 10, 50)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.9
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI * 0.85
controls.minPolarAngle = Math.PI * 0.1

// Lighting - underwater caustics simulation
const ambient = new THREE.AmbientLight(0x103344, 0.8)
scene.add(ambient)

const dirLight = new THREE.DirectionalLight(0x88ccff, 0.8)
dirLight.position.set(10, 50, 10)
scene.add(dirLight)

// Ground/seabed
const groundGeo = new THREE.PlaneGeometry(200, 200, 60, 60)
const positions = groundGeo.attributes.position.array
for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i], z = positions[i + 2]
  positions[i + 1] = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 1.5 - 5
}
groundGeo.computeVertexNormals()
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x1a2a1a,
  roughness: 0.9,
  metalness: 0.0,
})
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Kelp strands data
const kelps = []

// Custom shader material for swaying kelp
const kelpVertexShader = `
  uniform float uTime;
  uniform float uWaveFreq;
  uniform float uWaveAmp;
  attribute float aSegmentHeight;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vHeight;

  void main() {
    vUv = uv;
    vHeight = aSegmentHeight;
    vec3 pos = position;

    // Sway based on height - more sway at top
    float sway = aSegmentHeight * aSegmentHeight;
    float phase = uTime * 1.5 + pos.x * 0.3 + pos.z * 0.2;
    pos.x += sin(phase) * sway * uWaveAmp;
    pos.z += cos(phase * 0.7) * sway * uWaveAmp * 0.6;
    // Secondary wave
    pos.x += sin(phase * 2.1 + 1.5) * sway * uWaveAmp * 0.3;

    // Current push from right
    float current = sin(uTime * 0.8 + pos.y * 0.2) * aSegmentHeight * uWaveAmp * 0.4;
    pos.x += current;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vNormal = normalMatrix * normal;
  }
`

const kelpFragmentShader = `
  uniform vec3 uColorBase;
  uniform vec3 uColorTip;
  varying vec2 vUv;
  varying float vHeight;

  void main() {
    // Gradient from base to tip
    float t = vHeight;
    vec3 color = mix(uColorBase, uColorTip, t);

    // Add some texture variation
    float pattern = sin(vHeight * 30.0) * 0.1 + 0.9;
    color *= pattern;

    // Edge darkening for tube depth
    float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
    color *= 0.7 + edge * 0.3;

    gl_FragColor = vec4(color, 1.0);
  }
`

function createKelp(x, z, height, segments) {
  const points = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const y = t * height
    // Slight curve at base
    const curve = Math.sin(t * Math.PI) * (0.3 + Math.random() * 0.5)
    points.push(new THREE.Vector3(x + curve, y - 5, z))
  }

  const curve = new THREE.CatmullRomCurve3(points)

  // Create tube geometry
  const tubeGeo = new THREE.TubeGeometry(curve, segments * 4, 0.15 + Math.random() * 0.1, 6, false)

  // Add segment height attribute for shader
  const posCount = tubeGeo.attributes.position.count
  const segHeights = new Float32Array(posCount)
  const tubePositions = tubeGeo.attributes.position.array

  // We need to compute segment height per vertex
  // This is an approximation using the y position
  for (let i = 0; i < posCount; i++) {
    const vy = tubePositions[i * 3 + 1]
    segHeights[i] = Math.max(0, Math.min(1, (vy + 5) / height))
  }
  tubeGeo.setAttribute('aSegmentHeight', new THREE.BufferAttribute(segHeights, 1))

  const hue = 0.28 + Math.random() * 0.06 // green range
  const sat = 0.6 + Math.random() * 0.2
  const baseColor = new THREE.Color().setHSL(hue, sat, 0.15)
  const tipColor = new THREE.Color().setHSL(hue + 0.05, sat, 0.4)

  const mat = new THREE.ShaderMaterial({
    vertexShader: kelpVertexShader,
    fragmentShader: kelpFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uWaveFreq: { value: 1.0 + Math.random() * 0.5 },
      uWaveAmp: { value: 0.3 + Math.random() * 0.4 },
      uColorBase: { value: baseColor },
      uColorTip: { value: tipColor },
    },
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(tubeGeo, mat)
  mesh.castShadow = true
  scene.add(mesh)

  // Kelp blade (flat leaf) at top
  if (Math.random() > 0.3) {
    const bladeGeo = new THREE.PlaneGeometry(0.8, 2.5, 3, 8)
    const bladePositions = bladeGeo.attributes.position.array
    for (let i = 0; i < bladePositions.length; i += 3) {
      bladePositions[i] *= 1 - Math.abs(bladePositions[i + 1]) / 2.5 * 0.7
    }
    bladeGeo.computeVertexNormals()

    const bladeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, sat, 0.35),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
    const blade = new THREE.Mesh(bladeGeo, bladeMat)
    blade.position.set(x, height - 5 + 1.5, z)
    blade.rotation.y = Math.random() * Math.PI
    scene.add(blade)

    return { mesh, blade, mat, height, x, z }
  }

  return { mesh, mat, height, x, z }
}

// Generate initial kelp forest
function generateForest(count) {
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 70
    const z = (Math.random() - 0.5) * 70
    const height = 8 + Math.random() * 14
    const segments = Math.floor(8 + Math.random() * 8)
    kelps.push(createKelp(x, z, height, segments))
  }
}

generateForest(55)

// Click to add kelp
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('click', (e) => {
  if (kelps.length > 100) return
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(ground)
  if (intersects.length > 0) {
    const p = intersects[0].point
    const height = 8 + Math.random() * 14
    const segments = Math.floor(8 + Math.random() * 8)
    kelps.push(createKelp(p.x, p.z, height, segments))
  }
})

// Floating particles (marine snow)
const particleCount = 1500
const particleGeo = new THREE.BufferGeometry()
const particlePositions = new Float32Array(particleCount * 3)
for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 100
  particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 40
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 100
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
const particleMat = new THREE.PointsMaterial({
  color: 0xaaccdd,
  size: 0.15,
  transparent: true,
  opacity: 0.4,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
})
const particles = new THREE.Points(particleGeo, particleMat)
scene.add(particles)

// Light rays from above
const rayGeo = new THREE.CylinderGeometry(0.1, 2, 50, 5, 1, true)
const rayMat = new THREE.MeshBasicMaterial({
  color: 0x3366aa,
  transparent: true,
  opacity: 0.03,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
})
for (let i = 0; i < 12; i++) {
  const ray = new THREE.Mesh(rayGeo, rayMat)
  ray.position.set((Math.random() - 0.5) * 60, 20, (Math.random() - 0.5) * 60)
  ray.rotation.x = -0.1
  ray.rotation.z = (Math.random() - 0.5) * 0.3
  scene.add(ray)
}

// GUI
const gui = { kelpCount: 55, waveAmp: 0.5 }
import('https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm').then(({ GUI }) => {
  const panel = new GUI({ title: '🌿 Kelp Forest' })
  panel.add(gui, 'waveAmp', 0.0, 2.0).name('Wave Amplitude').onChange(v => {
    for (const k of kelps) {
      if (k.mat.uniforms) k.mat.uniforms.uWaveAmp.value = v
    }
  })
})

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()
  const dt = clock.getDelta()

  // Update kelp uniforms
  for (const k of kelps) {
    if (k.mat.uniforms) {
      k.mat.uniforms.uTime.value = elapsed
    }
    if (k.blade) {
      k.blade.rotation.z = Math.sin(elapsed * 1.5 + k.x) * 0.3
    }
  }

  // Animate particles - drift upward slowly
  const positions = particleGeo.attributes.position.array
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 1] += 0.005
    positions[i * 3] += Math.sin(elapsed + i) * 0.002
    if (positions[i * 3 + 1] > 20) positions[i * 3 + 1] = -20
  }
  particleGeo.attributes.position.needsUpdate = true

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
