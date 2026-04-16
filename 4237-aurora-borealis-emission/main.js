// 4237. Aurora Borealis Emission
// Charged particle precipitation in magnetic field
// type: particle-simulation

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x010208)
scene.fog = new THREE.FogExp2(0x010208, 0.008)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 8, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI * 0.85

// Stars background
const starCount = 3000
const starGeo = new THREE.BufferGeometry()
const starPos = new Float32Array(starCount * 3)
for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = 400 + Math.random() * 100
  starPos[i*3] = r * Math.sin(phi) * Math.cos(theta)
  starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
  starPos[i*3+2] = r * Math.cos(phi)
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true })
const stars = new THREE.Points(starGeo, starMat)
scene.add(stars)

// Ground / horizon
const groundGeo = new THREE.PlaneGeometry(500, 500)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x050a08, roughness: 1.0 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -2
scene.add(ground)

// Magnetic field: B points generally northward with curvature
const B0 = new THREE.Vector3(0, 1, 0)
const dipoleMoment = new THREE.Vector3(0, 50, 0)

function magneticField(pos) {
  // Simplified: dipole field centered below ground
  const r = pos.clone().add(new THREE.Vector3(0, 10, 0))
  const rLen = r.length()
  if (rLen < 0.1) return new THREE.Vector3(0, 1, 0)
  const rHat = r.clone().normalize()
  const B = dipoleMoment.clone().sub(rHat.clone().multiplyScalar(dipoleMoment.dot(rHat))).divideScalar(rLen*rLen*rLen)
  B.multiplyScalar(15)
  B.y = Math.max(0.2, B.y)
  return B
}

// Particle system - electrons following magnetic field lines
const PARTICLE_COUNT = 8000
const auroraGeo = new THREE.BufferGeometry()
const positions = new Float32Array(PARTICLE_COUNT * 3)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
const colors = new Float32Array(PARTICLE_COUNT * 3)
const lifetimes = new Float32Array(PARTICLE_COUNT)
const ages = new Float32Array(PARTICLE_COUNT)

function resetParticle(i) {
  // Spawn at high altitude, random x,z
  const x = (Math.random() - 0.5) * 120
  const z = (Math.random() - 0.5) * 120
  positions[i*3] = x
  positions[i*3+1] = 40 + Math.random() * 30
  positions[i*3+2] = z
  velocities[i*3] = 0
  velocities[i*3+1] = -0.05 - Math.random() * 0.1
  velocities[i*3+2] = 0
  // Aurora colors: green (oxygen 557.7nm), red (oxygen 630nm), blue (nitrogen)
  const colorType = Math.random()
  if (colorType < 0.7) {
    // Green
    colors[i*3] = 0.1; colors[i*3+1] = 1.0; colors[i*3+2] = 0.3
  } else if (colorType < 0.9) {
    // Red/pink
    colors[i*3] = 1.0; colors[i*3+1] = 0.3; colors[i*3+2] = 0.4
  } else {
    // Blue
    colors[i*3] = 0.3; colors[i*3+1] = 0.5; colors[i*3+2] = 1.0
  }
  lifetimes[i] = 100 + Math.random() * 200
  ages[i] = 0
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  resetParticle(i)
  ages[i] = Math.random() * lifetimes[i]
}

auroraGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
auroraGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const auroraMat = new THREE.PointsMaterial({
  size: 0.6,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true
})
const auroraParticles = new THREE.Points(auroraGeo, auroraMat)
scene.add(auroraParticles)

// Magnetic field line visualization
const fieldLines = []
function traceFieldLine(start, steps, dt) {
  const pts = [start.clone()]
  let p = start.clone()
  for (let i = 0; i < steps; i++) {
    const B = magneticField(p)
    if (B.length() < 0.001) break
    const dir = B.clone().normalize()
    p = p.clone().add(dir.multiplyScalar(dt))
    pts.push(p.clone())
    if (p.y < -2) break
  }
  return pts
}

for (let i = 0; i < 12; i++) {
  const x = -60 + i * 10
  const linePts = traceFieldLine(new THREE.Vector3(x, 60, 0), 200, 0.5)
  if (linePts.length > 2) {
    const geo = new THREE.BufferGeometry().setFromPoints(linePts)
    const mat = new THREE.LineBasicMaterial({ color: 0x224466, opacity: 0.3, transparent: true })
    const line = new THREE.Line(geo, mat)
    scene.add(line)
    fieldLines.push(line)
  }
}

// Lighting
scene.add(new THREE.AmbientLight(0x112233, 0.4))

const sunLight = new THREE.DirectionalLight(0x8888ff, 0.3)
sunLight.position.set(50, 100, 50)
scene.add(sunLight)

// Glow shader for aurora curtain
const curtainVert = `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const curtainFrag = `
  uniform float uTime;
  uniform float uHeight;
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    float h = clamp(vPos.y / uHeight, 0.0, 1.0);
    float wave = sin(vUv.x * 30.0 + uTime * 2.0) * 0.5 + 0.5;
    wave *= sin(vUv.x * 7.0 - uTime * 1.3) * 0.5 + 0.5;
    float intensity = wave * (1.0 - h * h) * 0.8;
    vec3 green = vec3(0.1, 1.0, 0.3);
    vec3 red = vec3(1.0, 0.2, 0.4);
    vec3 blue = vec3(0.2, 0.4, 1.0);
    vec3 col = mix(green, red, sin(vUv.x * 5.0 + uTime) * 0.5 + 0.5);
    col = mix(col, blue, sin(vUv.x * 12.0 - uTime * 1.7) * 0.5 + 0.5);
    float alpha = intensity * 0.6;
    gl_FragColor = vec4(col * intensity * 2.0, alpha);
  }
`

// Aurora curtain mesh
const curtainGeo = new THREE.PlaneGeometry(120, 40, 120, 40)
const curtainMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uHeight: { value: 40.0 } },
  vertexShader: curtainVert,
  fragmentShader: curtainFrag,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide
})
const curtain = new THREE.Mesh(curtainGeo, curtainMat)
curtain.position.set(0, 20, -30)
scene.add(curtain)

// Info
const infoEl = document.createElement('div')
infoEl.style.cssText = 'position:fixed;top:16px;left:16px;color:#aef;font-family:monospace;font-size:12px;pointer-events:none;line-height:1.7'
document.body.appendChild(infoEl)

let t = 0
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  t += 0.016

  curtainMat.uniforms.uTime.value = t

  // Update particles
  const pos = auroraGeo.attributes.position.array
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    ages[i]++
    if (ages[i] > lifetimes[i] || positions[i*3+1] < -2) {
      resetParticle(i)
    }
    // Follow magnetic field
    const px = pos[i*3], py = pos[i*3+1], pz = pos[i*3+2]
    const B = magneticField(new THREE.Vector3(px, py, pz))
    const BLen = B.length()
    if (BLen > 0) {
      const sp = 0.15 + (1.0 - ages[i]/lifetimes[i]) * 0.1
      velocities[i*3] += B.x / BLen * sp
      velocities[i*3+1] += B.y / BLen * sp - 0.02 // gravity
      velocities[i*3+2] += B.z / BLen * sp
    }
    // Damping
    velocities[i*3] *= 0.98
    velocities[i*3+1] *= 0.98
    velocities[i*3+2] *= 0.98
    pos[i*3] += velocities[i*3]
    pos[i*3+1] += velocities[i*3+1]
    pos[i*3+2] += velocities[i*3+2]
    // Keep in bounds horizontally
    if (pos[i*3+1] < -1) resetParticle(i)
  }
  auroraGeo.attributes.position.needsUpdate = true

  infoEl.innerHTML = `Aurora Borealis Simulation<br>` +
    `Charged particles in magnetic dipole field<br>` +
    `Green: Oxygen 557.7nm | Red: Oxygen 630nm | Blue: Nitrogen<br>` +
    `Particle count: ${PARTICLE_COUNT.toLocaleString()}<br>` +
    `Drag to orbit, scroll to zoom`

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
