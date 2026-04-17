// 2931. Pyroclastic Flow
// Volcanic eruption with pyroclastic density current simulation
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0508)
scene.fog = new THREE.FogExp2(0x1a0808, 0.008)

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 30, 80)
camera.lookAt(0, 5, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)

// Lighting - volcanic red/orange
scene.add(new THREE.AmbientLight(0x1a0505, 0.4))
const eruptionLight = new THREE.PointLight(0xff4400, 5, 60)
eruptionLight.position.set(0, 8, 0)
eruptionLight.castShadow = true
scene.add(eruptionLight)
const rimLight = new THREE.DirectionalLight(0xff6622, 0.8)
rimLight.position.set(-20, 40, 30)
scene.add(rimLight)

// Volcano cone
const volcanoGeo = new THREE.ConeGeometry(20, 30, 32, 8, true)
const volcanoMat = new THREE.MeshStandardMaterial({
  color: 0x2a1a10,
  roughness: 1.0,
  flatShading: true
})
const volcano = new THREE.Mesh(volcanoGeo, volcanoMat)
volcano.position.y = 5
volcano.castShadow = true
volcano.receiveShadow = true
scene.add(volcano)

// Crater opening
const craterGeo = new THREE.CylinderGeometry(4, 3, 3, 16)
const craterMat = new THREE.MeshStandardMaterial({ color: 0x0a0000, emissive: 0x330000, emissiveIntensity: 0.5 })
const crater = new THREE.Mesh(craterGeo, craterMat)
crater.position.y = 20.5
scene.add(crater)

// Lava glow inside crater
const lavaGeo = new THREE.CircleGeometry(3.5, 32)
const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff6600 })
const lava = new THREE.Mesh(lavaGeo, lavaMat)
lava.rotation.x = -Math.PI/2
lava.position.y = 19
scene.add(lava)

// Ground / terrain
const groundGeo = new THREE.PlaneGeometry(300, 300, 60, 60)
const positions = groundGeo.attributes.position
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i)
  const z = positions.getZ(i)
  const dist = Math.sqrt(x*x + z*z)
  let y = 0
  if (dist < 25) y = Math.max(0, (dist - 25) * 0.8 + Math.random() * 2)
  else y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5
  positions.setY(i, y)
}
groundGeo.computeVertexNormals()
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a0f0a, roughness: 1 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI/2
ground.receiveShadow = true
scene.add(ground)

// Pyroclastic particle system
const PARTICLE_COUNT = 8000
const particleGeo = new THREE.BufferGeometry()
const pPositions = new Float32Array(PARTICLE_COUNT * 3)
const pVelocities = new Float32Array(PARTICLE_COUNT * 3)
const pColors = new Float32Array(PARTICLE_COUNT * 3)
const pSizes = new Float32Array(PARTICLE_COUNT)
const pAges = new Float32Array(PARTICLE_COUNT)
const pMaxAges = new Float32Array(PARTICLE_COUNT)

function resetParticle(i) {
  const angle = Math.random() * Math.PI * 2
  const r = Math.random() * 3
  pPositions[i*3] = Math.cos(angle) * r
  pPositions[i*3+1] = 20 + Math.random() * 3
  pPositions[i*3+2] = Math.sin(angle) * r

  // Explosive eruption velocity
  const speed = 1 + Math.random() * 3
  const spread = Math.random() * 0.8
  pVelocities[i*3] = Math.cos(angle) * spread * speed * 0.5
  pVelocities[i*3+1] = speed * (0.3 + Math.random() * 0.4)
  pVelocities[i*3+2] = Math.sin(angle) * spread * speed * 0.5

  // Color: hot orange/yellow -> dark ash gray
  const t = Math.random()
  pColors[i*3] = 0.9 + t * 0.1
  pColors[i*3+1] = 0.3 + t * 0.5
  pColors[i*3+2] = 0.0 + t * 0.1

  pSizes[i] = 0.5 + Math.random() * 1.5
  pAges[i] = 0
  pMaxAges[i] = 200 + Math.random() * 300
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  resetParticle(i)
  pAges[i] = Math.random() * pMaxAges[i] // stagger initial
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3))
particleGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1))

const particleMat = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 } },
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      float alpha = 1.0 - smoothstep(0.3, 1.0, d);
      gl_FragColor = vec4(vColor, alpha * 0.8);
    }
  `,
  transparent: true,
  vertexColors: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
})

const particles = new THREE.Points(particleGeo, particleMat)
scene.add(particles)

// Ash cloud (large soft particles)
const ASH_COUNT = 2000
const ashGeo = new THREE.BufferGeometry()
const ashPos = new Float32Array(ASH_COUNT * 3)
const ashSizes = new Float32Array(ASH_COUNT)

for (let i = 0; i < ASH_COUNT; i++) {
  const angle = Math.random() * Math.PI * 2
  const r = 5 + Math.random() * 40
  ashPos[i*3] = Math.cos(angle) * r
  ashPos[i*3+1] = 5 + Math.random() * 25
  ashPos[i*3+2] = Math.sin(angle) * r
  ashSizes[i] = 2 + Math.random() * 5
}

ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3))
ashGeo.setAttribute('size', new THREE.BufferAttribute(ashSizes, 1))

const ashMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float size;
    varying float vY;
    void main() {
      vY = position.y;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (400.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vY;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      float alpha = (1.0 - d) * 0.15;
      vec3 col = mix(vec3(0.15, 0.1, 0.08), vec3(0.4, 0.25, 0.15), vY / 30.0);
      gl_FragColor = vec4(col, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending
})

const ashCloud = new THREE.Points(ashGeo, ashMat)
scene.add(ashCloud)

let time = 0
function animate() {
  requestAnimationFrame(animate)
  time += 0.016

  // Flicker eruption light
  eruptionLight.intensity = 4 + Math.sin(time * 15) * 1.5 + Math.random() * 0.5
  lava.material.color.setHSL(0.05 + Math.sin(time * 3) * 0.02, 1, 0.5)

  const pos = particleGeo.attributes.position.array
  const vel = pVelocities
  const col = particleGeo.attributes.color.array

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pAges[i]++
    if (pAges[i] > pMaxAges[i]) {
      resetParticle(i)
      continue
    }
    const t = pAges[i] / pMaxAges[i]

    // Gravity + buoyancy + drag
    vel[i*3+1] -= 0.04 // gravity
    vel[i*3] *= 0.99   // horizontal drag
    vel[i*3+2] *= 0.99

    pos[i*3] += vel[i*3]
    pos[i*3+1] += vel[i*3+1]
    pos[i*3+2] += vel[i*3+2]

    // Cool down color: orange -> dark gray
    col[i*3] = 0.9 * (1 - t) + 0.1 * t
    col[i*3+1] = 0.4 * (1 - t) + 0.08 * t
    col[i*3+2] = 0.0 * (1 - t) + 0.05 * t
  }

  particleGeo.attributes.position.needsUpdate = true
  particleGeo.attributes.color.needsUpdate = true

  // Animate ash
  const ashPosArr = ashGeo.attributes.position.array
  for (let i = 0; i < ASH_COUNT; i++) {
    ashPosArr[i*3] += Math.sin(time + i) * 0.03
    ashPosArr[i*3+1] -= 0.02
    ashPosArr[i*3+2] += Math.cos(time + i * 0.7) * 0.03
    if (ashPosArr[i*3+1] < 0) {
      const angle = Math.random() * Math.PI * 2
      const r = 5 + Math.random() * 40
      ashPosArr[i*3] = Math.cos(angle) * r
      ashPosArr[i*3+1] = 20 + Math.random() * 10
      ashPosArr[i*3+2] = Math.sin(angle) * r
    }
  }
  ashGeo.attributes.position.needsUpdate = true

  camera.lookAt(0, 10, 0)
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
