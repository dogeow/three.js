// 2170. 音频响应粒子 — Enhanced Edition
// 音频响应粒子系统 + Web Audio + 鼠标交互
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.015)

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 50)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

// ─── Web Audio Setup ─────────────────────────────────────────────────────────
let audioCtx, analyser, dataArray, audioReady = false

function initAudio() {
  if (audioReady) return
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 256
  dataArray = new Uint8Array(analyser.frequencyBinCount)

  // 创建振荡器-based synthetic audio for demo
  const osc1 = audioCtx.createOscillator()
  const osc2 = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc1.type = 'sine'; osc1.frequency.value = 220
  osc2.type = 'triangle'; osc2.frequency.value = 330
  gain.gain.value = 0.05
  osc1.connect(gain); osc2.connect(gain)
  gain.connect(analyser); analyser.connect(audioCtx.destination)
  osc1.start(); osc2.start()
  audioReady = true
  document.getElementById('hint').textContent = 'Click to toggle audio'
}

window.addEventListener('click', initAudio, { once: true })

// ─── Particle System ────────────────────────────────────────────────────────
const PARTICLE_COUNT = 8000
const positions = new Float32Array(PARTICLE_COUNT * 3)
const colors = new Float32Array(PARTICLE_COUNT * 3)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
const sizes = new Float32Array(PARTICLE_COUNT)
const phases = new Float32Array(PARTICLE_COUNT)

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = 5 + Math.random() * 40
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
  positions[i * 3 + 2] = r * Math.cos(phi)
  velocities[i * 3] = (Math.random() - 0.5) * 0.05
  velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05
  velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05
  const hue = Math.random()
  const col = new THREE.Color().setHSL(hue, 0.8, 0.6)
  colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b
  sizes[i] = 0.1 + Math.random() * 0.5
  phases[i] = Math.random() * Math.PI * 2
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

const particleMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAudioLevel: { value: 0 } },
  vertexShader: `
    attribute float size;
    attribute color;
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uTime;
    uniform float uAudioLevel;
    void main() {
      vColor = color;
      vec3 pos = position;
      float wave = sin(uTime * 2.0 + position.x * 0.3) * uAudioLevel * 3.0;
      pos += normal * wave;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + uAudioLevel);
      gl_Position = projectionMatrix * mvPosition;
      vAlpha = 0.6 + uAudioLevel * 0.4;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      if (d > 0.5) discard;
      float alpha = (1.0 - d * 2.0) * vAlpha;
      gl_FragColor = vec4(vColor * 1.5, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true
})

const particles = new THREE.Points(geo, particleMat)
scene.add(particles)

// ─── Central Orb ─────────────────────────────────────────────────────────────
const orbGeo = new THREE.IcosahedronGeometry(3, 3)
const orbMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAudioLevel: { value: 0 } },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPos;
    uniform float uTime;
    uniform float uAudioLevel;
    void main() {
      vNormal = normal;
      vPos = position;
      vec3 pos = position + normal * sin(uTime * 3.0 + position.x * 5.0) * uAudioLevel * 0.5;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPos;
    uniform float uTime;
    uniform float uAudioLevel;
    void main() {
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.0);
      vec3 col = mix(vec3(0.1, 0.0, 0.5), vec3(0.5, 0.0, 1.0), fresnel);
      col += vec3(0.0, 0.8, 1.0) * uAudioLevel;
      gl_FragColor = vec4(col, 0.8);
    }
  `,
  transparent: true,
  wireframe: false
})
const orb = new THREE.Mesh(orbGeo, orbMat)
scene.add(orb)

// Wireframe overlay
const orbWire = new THREE.Mesh(orbGeo, new THREE.MeshBasicMaterial({ color: 0x4488ff, wireframe: true, transparent: true, opacity: 0.3 }))
orb.add(orbWire)

// ─── Mouse Interaction ───────────────────────────────────────────────────────
const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
let mouseActive = false
let mousePos3D = new THREE.Vector3()

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  raycaster.ray.intersectPlane(plane, mousePos3D)
  mouseActive = true
})

// ─── Ring Geometry ───────────────────────────────────────────────────────────
const ringGeo = new THREE.TorusGeometry(8, 0.1, 8, 64)
const ringMat = new THREE.MeshBasicMaterial({ color: 0x33aaff, transparent: true, opacity: 0.5 })
const rings = []
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(ringGeo, ringMat.clone())
  ring.rotation.x = Math.PI / 2 + (i * Math.PI / 4)
  ring.scale.setScalar(1 + i * 0.5)
  scene.add(ring)
  rings.push(ring)
}

// ─── Lights ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x111133, 1.0))
const pointLight = new THREE.PointLight(0x4488ff, 3, 50)
scene.add(pointLight)

// ─── Animation ──────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
let audioLevel = 0, targetAudio = 0

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  if (analyser) {
    analyser.getByteFrequencyData(dataArray)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
    targetAudio = sum / dataArray.length / 255
  }
  audioLevel += (targetAudio - audioLevel) * 0.1

  const pos = geo.attributes.position

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2

    // Wave expansion driven by audio
    const dist = Math.sqrt(pos.array[ix] ** 2 + pos.array[iy] ** 2 + pos.array[iz] ** 2)
    const wave = Math.sin(t * 1.5 + phases[i]) * audioLevel * 2.0

    pos.array[ix] += velocities[ix] * (1 + audioLevel * 5)
    pos.array[iy] += velocities[iy] * (1 + audioLevel * 5)
    pos.array[iz] += velocities[iz] * (1 + audioLevel * 5)

    // Boundary wrap
    const bound = 50
    if (pos.array[ix] > bound) pos.array[ix] = -bound
    if (pos.array[ix] < -bound) pos.array[ix] = bound
    if (pos.array[iy] > bound) pos.array[iy] = -bound
    if (pos.array[iy] < -bound) pos.array[iy] = bound
    if (pos.array[iz] > bound) pos.array[iz] = -bound
    if (pos.array[iz] < -bound) pos.array[iz] = bound

    // Color pulse with audio
    const hue = (phases[i] / (Math.PI * 2) + t * 0.05 + audioLevel) % 1
    const col = new THREE.Color().setHSL(hue, 0.8, 0.5 + audioLevel * 0.3)
    geo.attributes.color.array[ix] = col.r
    geo.attributes.color.array[iy] = col.g
    geo.attributes.color.array[iz] = col.b
  }
  pos.needsUpdate = true
  geo.attributes.color.needsUpdate = true

  // Orb animation
  orb.rotation.y = t * 0.3
  orb.rotation.x = t * 0.2
  orbMat.uniforms.uTime.value = t
  orbMat.uniforms.uAudioLevel.value = audioLevel

  // Rings animation
  rings.forEach((r, i) => {
    r.rotation.z = t * (0.2 + i * 0.1) + audioLevel * 2
    r.material.opacity = 0.3 + audioLevel * 0.5
    r.scale.setScalar(1.2 + i * 0.4 + audioLevel * Math.sin(t * 3 + i) * 0.3)
  })

  // Point light follows audio
  pointLight.intensity = 2 + audioLevel * 10
  pointLight.color.setHSL(0.6 + audioLevel * 0.2, 1, 0.5)

  particleMat.uniforms.uTime.value = t
  particleMat.uniforms.uAudioLevel.value = audioLevel

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
