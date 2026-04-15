// 2984. Waterfall Cascade
// 瀑布级联仿真 - GPU 粒子水流 + 水花溅射 + 体积雾气

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { Water } from 'three/addons/objects/Water.js'
import { Sky } from 'three/addons/objects/Sky.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 3000)
camera.position.set(0, 20, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.9
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1
controls.target.set(0, 5, 0)

// Sky
const sky = new Sky()
sky.scale.setScalar(10000)
scene.add(sky)
const skyUniforms = sky.material.uniforms
skyUniforms['turbidity'].value = 8
skyUniforms['rayleigh'].value = 1.5
skyUniforms['mieCoefficient'].value = 0.005
skyUniforms['mieDirectionalG'].value = 0.8
const sun = new THREE.Vector3()
sun.setFromElevation(25, 200)
skyUniforms['sunPosition'].value.copy(sun)

// Water plane at bottom
const waterGeo = new THREE.PlaneGeometry(200, 200, 1, 1)
const water = new Water(waterGeo, {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: new THREE.TextureLoader().load('https://unpkg.com/three@0.160.0/examples/textures/waternormals.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping }),
  sunDirection: new THREE.Vector3(),
  sunColor: 0xfff0dd,
  waterColor: 0x001e3c,
  distortionScale: 2,
  fog: scene.fog !== undefined,
})
water.rotation.x = -Math.PI / 2
water.position.y = -1
scene.add(water)

// Cliff walls
function createCliff(x, z, width, height, depth) {
  const geo = new THREE.BoxGeometry(width, height, depth)
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.95, flatShading: true })
  const cliff = new THREE.Mesh(geo, mat)
  cliff.position.set(x, height / 2, z)
  cliff.castShadow = true
  cliff.receiveShadow = true
  scene.add(cliff)
  return cliff
}

createCliff(-12, 0, 8, 30, 20)
createCliff(12, 0, 8, 30, 20)

// Platforms (tiers)
const tiers = [
  { y: 2, width: 20, depth: 6, x: 0 },
  { y: 9, width: 14, depth: 5, x: 0 },
  { y: 16, width: 10, depth: 4, x: 0 },
]

const tierMeshes = []
for (const t of tiers) {
  const geo = new THREE.BoxGeometry(t.width, 1, t.depth)
  const mat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.9, flatShading: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(t.x, t.y, 0)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  tierMeshes.push(mesh)

  // Edge glow (emissive strip)
  const edgeGeo = new THREE.BoxGeometry(t.width + 0.2, 0.1, t.depth + 0.2)
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.6 })
  const edge = new THREE.Mesh(edgeGeo, edgeMat)
  edge.position.set(t.x, t.y + 0.56, 0)
  scene.add(edge)
}

// Lighting
const ambient = new THREE.AmbientLight(0x87ceeb, 0.5)
scene.add(ambient)
const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.5)
dirLight.position.set(50, 80, 50)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(2048, 2048)
scene.add(dirLight)

// Particle system: falling water
const PARTICLE_COUNT = 8000
const positions = new Float32Array(PARTICLE_COUNT * 3)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
const lifetimes = new Float32Array(PARTICLE_COUNT)
const sizes = new Float32Array(PARTICLE_COUNT)
const alphas = new Float32Array(PARTICLE_COUNT)

// Initialize particles
for (let i = 0; i < PARTICLE_COUNT; i++) {
  resetParticle(i)
}

function resetParticle(i) {
  // Spread across waterfall tiers
  const tier = Math.floor(Math.random() * tiers.length)
  const t = tiers[tier]
  const spread = t.width * 0.6
  positions[i * 3] = (Math.random() - 0.5) * spread
  positions[i * 3 + 1] = t.y + Math.random() * 2
  positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5

  // Initial velocity (downward)
  velocities[i * 3] = (Math.random() - 0.5) * 1.5
  velocities[i * 3 + 1] = -8 - Math.random() * 8
  velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5

  lifetimes[i] = 0.5 + Math.random() * 2.0
  sizes[i] = 0.2 + Math.random() * 0.4
  alphas[i] = 0.6 + Math.random() * 0.4
}

const particleGeo = new THREE.BufferGeometry()
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
particleGeo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))

const particleMat = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: `
    attribute float size;
    attribute float alpha;
    varying float vAlpha;
    varying float vY;
    void main() {
      vAlpha = alpha;
      vY = position.y;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying float vY;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      vec3 col = mix(vec3(0.6, 0.8, 1.0), vec3(0.9, 0.95, 1.0), vY * 0.05);
      gl_FragColor = vec4(col, vAlpha * (1.0 - d));
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})

const particles = new THREE.Points(particleGeo, particleMat)
scene.add(particles)

// Splash particles at bottom
const SPLASH_COUNT = 2000
const splashPos = new Float32Array(SPLASH_COUNT * 3)
const splashVel = new Float32Array(SPLASH_COUNT * 3)
const splashLife = new Float32Array(SPLASH_COUNT)

for (let i = 0; i < SPLASH_COUNT; i++) resetSplash(i)

function resetSplash(i) {
  splashPos[i*3] = (Math.random() - 0.5) * 10
  splashPos[i*3+1] = 0
  splashPos[i*3+2] = (Math.random() - 0.5) * 3
  splashVel[i*3] = (Math.random() - 0.5) * 6
  splashVel[i*3+1] = 3 + Math.random() * 6
  splashVel[i*3+2] = (Math.random() - 0.5) * 3
  splashLife[i] = Math.random()
}

const splashGeo = new THREE.BufferGeometry()
splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3))
const splashMat = new THREE.ShaderMaterial({
  vertexShader: `
    varying float vY;
    void main() {
      vY = position.y;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = 3.0 * (200.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vY;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      gl_FragColor = vec4(0.7, 0.9, 1.0, 0.8 * (1.0 - vY / 8.0));
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})
const splashParticles = new THREE.Points(splashGeo, splashMat)
scene.add(splashParticles)

// Mist volume (large transparent sphere at base)
const mistGeo = new THREE.SphereGeometry(12, 16, 16)
const mistMat = new THREE.MeshBasicMaterial({
  color: 0xaaccff,
  transparent: true,
  opacity: 0.08,
  side: THREE.BackSide,
  depthWrite: false,
})
const mist = new THREE.Mesh(mistGeo, mistMat)
mist.position.set(0, 1, 2)
scene.add(mist)

// GUI
const gui = new GUI()
const params = {
  flowSpeed: 1.0,
  particleCount: 8000,
  mistOpacity: 0.08,
  bloomStrength: 0.5,
}

gui.add(params, 'flowSpeed', 0.1, 3).name('Flow Speed')
gui.add(params, 'mistOpacity', 0, 0.3).name('Mist').onChange(v => { mistMat.opacity = v })
gui.add(params, 'bloomStrength', 0, 1.5).name('Bloom').onChange(v => { bloomPass.strength = v })

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.4, 0.7)
composer.addPass(bloomPass)

// Post-processing
const clock = new THREE.Clock()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.getElapsedTime()

  // Water animation
  water.material.uniforms['time'].value += dt * params.flowSpeed

  // Update waterfall particles
  const posAttr = particleGeo.attributes.position
  const alphaAttr = particleGeo.attributes.alpha

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    lifetimes[i] -= dt
    if (lifetimes[i] <= 0) {
      resetParticle(i)
      lifetimes[i] = 0.5 + Math.random() * 2.0
    } else {
      // Gravity + turbulence
      velocities[i*3] += (Math.random() - 0.5) * 3 * dt * params.flowSpeed
      velocities[i*3+1] += -20 * dt
      velocities[i*3+2] += (Math.random() - 0.5) * 0.5 * dt

      // Clamp X velocity (waterfall channel)
      velocities[i*3] = Math.max(-3, Math.min(3, velocities[i*3]))

      positions[i*3] += velocities[i*3] * dt * params.flowSpeed
      positions[i*3+1] += velocities[i*3+1] * dt * params.flowSpeed
      positions[i*3+2] += velocities[i*3+2] * dt * params.flowSpeed

      // Fade near bottom
      const lifeRatio = lifetimes[i] / 2.0
      alphaAttr.array[i] = Math.min(lifeRatio, 1.0) * 0.8

      // Reset if below ground
      if (positions[i*3+1] < -0.5) resetParticle(i)
    }
  }
  posAttr.needsUpdate = true
  alphaAttr.needsUpdate = true

  // Update splash
  const sPos = splashGeo.attributes.position
  for (let i = 0; i < SPLASH_COUNT; i++) {
    splashLife[i] -= dt * 2
    if (splashLife[i] <= 0) {
      resetSplash(i)
    } else {
      splashPos[i*3] += splashVel[i*3] * dt
      splashPos[i*3+1] += splashVel[i*3+1] * dt
      splashPos[i*3+2] += splashVel[i*3+2] * dt
      splashVel[i*3+1] -= 12 * dt
      if (splashPos[i*3+1] < 0) {
        splashPos[i*3+1] = 0
        splashVel[i*3+1] = -splashVel[i*3+1] * 0.3
      }
    }
  }
  sPos.needsUpdate = true

  // Mist pulse
  mist.scale.setScalar(1 + Math.sin(t * 1.5) * 0.05)
  mist.rotation.y = t * 0.2

  controls.update()
  composer.render()
}

animate()
