/**
 * 3701. Ocean Thermal Circulation
 * Thermohaline circulation (global ocean conveyor belt)
 * 
 * Science: The ocean conveyor moves heat from equator to poles via:
 * - Surface currents (warm, shown blue→red)
 * - Deep water formation (cold, sinking in polar regions)
 * - Upwelling zones (nutrient-rich deep water rises)
 * Density differences (temperature + salinity) drive the circulation.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000810)
scene.fog = new THREE.FogExp2(0x000510, 0.003)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 60, 140)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.5, 0.7)
composer.addPass(bloom)

// ─── Earth ocean surface ─────────────────────────────────────────────────────
// Simplified flat ocean plane for circulation visualization
const oceanGeo = new THREE.PlaneGeometry(300, 150, 80, 40)
oceanGeo.rotateX(-Math.PI / 2)

const oceanShader = {
  uniforms: {
    uTime: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorld;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      // Ocean waves
      pos.y += sin(pos.x * 0.1 + uTime * 0.3) * 0.3
             + sin(pos.z * 0.15 + uTime * 0.2) * 0.2;
      vWorld = (modelMatrix * vec4(pos, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vWorld;
    uniform float uTime;
    
    void main() {
      // Latitude-based temperature (hotter at "equator" = center)
      float lat = abs(vUv.y - 0.5) * 2.0;
      float temp = 1.0 - lat; // 1 = warm equator, 0 = cold poles
      
      // Ocean depth color (deeper = darker blue)
      vec3 warmColor = vec3(0.05, 0.3, 0.5);
      vec3 coldColor = vec3(0.02, 0.08, 0.25);
      vec3 deepColor = vec3(0.01, 0.03, 0.12);
      
      vec3 color = mix(deepColor, mix(coldColor, warmColor, temp), 0.5);
      
      // Wave shimmer
      float shimmer = sin(vWorld.x * 0.3 + uTime * 0.5) * sin(vWorld.z * 0.2 + uTime * 0.3) * 0.03;
      color += shimmer;
      
      // Fresnel-like edge brightness
      float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
      color += vec3(0.0, 0.05, 0.1) * edge;
      
      gl_FragColor = vec4(color, 0.9);
    }
  `
}

const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanShader.uniforms,
  vertexShader: oceanShader.vertexShader,
  fragmentShader: oceanShader.fragmentShader,
  transparent: true,
  side: THREE.DoubleSide
})

const ocean = new THREE.Mesh(oceanGeo, oceanMat)
ocean.position.y = -5
scene.add(ocean)

// Ocean floor (for depth view)
const floorGeo = new THREE.PlaneGeometry(300, 150, 40, 20)
floorGeo.rotateX(-Math.PI / 2)
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 1 })
const floor = new THREE.Mesh(floorGeo, floorMat)
floor.position.y = -25
scene.add(floor)

// ─── Thermohaline circulation flow lines ──────────────────────────────────────
// A simplified global conveyor: surface warm (red/orange) → deep cold (blue) → upwelling (cyan)
// Flow path: equator → pole → sink → deep return → upwelling → equator

const FLOW_POINTS = 200
const CONVEYOR_PATHS = 5

// Build circulation path points
function buildConveyorPath(offset) {
  const path = []
  const phase = offset * Math.PI * 2 / CONVEYOR_PATHS
  
  for (let i = 0; i < FLOW_POINTS; i++) {
    const t = i / FLOW_POINTS
    
    // Surface: equator → pole (z direction, varying x for longitude)
    // Then sink (y decreases)
    // Then deep return: pole → equator (z negative, y deep)
    // Then upwell (y increases)
    
    let x, y, z
    
    if (t < 0.2) {
      // Equator surface current (westward)
      const s = t / 0.2
      x = -80 + s * 160 + Math.sin(phase) * 20
      y = -4 + Math.sin(s * Math.PI) * 2
      z = 0 + (s - 0.5) * 80
    } else if (t < 0.4) {
      // Poleward surface current
      const s = (t - 0.2) / 0.2
      x = 80 + Math.cos(phase) * 20 - s * 30
      y = -3 + s * 2
      z = -40 + s * 80
    } else if (t < 0.5) {
      // Sinking at poles
      const s = (t - 0.4) / 0.1
      x = 50 + Math.cos(phase) * 20
      y = -1 - s * 18
      z = 40
    } else if (t < 0.7) {
      // Deep return (equatorward)
      const s = (t - 0.5) / 0.2
      x = 50 + Math.cos(phase) * 20 - s * 100
      y = -19
      z = 40 - s * 80
    } else if (t < 0.85) {
      // Upwelling zones (specific locations)
      const s = (t - 0.7) / 0.15
      x = -50 + Math.cos(phase) * 30 + s * 30
      y = -19 + s * 14
      z = -40 + s * 30
    } else {
      // Completion of upwelling → equatorial rise
      const s = (t - 0.85) / 0.15
      x = -20 + s * 60
      y = -5 + s * 2
      z = -10 - s * 10
    }
    
    path.push(new THREE.Vector3(x, y, z))
  }
  return path
}

const conveyorMeshes = []
const conveyorData = []

for (let c = 0; c < CONVEYOR_PATHS; c++) {
  const path = buildConveyorPath(c / CONVEYOR_PATHS)
  
  // Create tube along path
  const curve = new THREE.CatmullRomCurve3(path)
  const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.4 + c * 0.1, 6, false)
  
  // Color: warm surface (red/orange) → cold deep (blue)
  // We'll color by vertex position (y coordinate)
  const colors = new Float32Array(tubeGeo.attributes.position.count * 3)
  const tubePos = tubeGeo.attributes.position
  
  for (let i = 0; i < tubePos.count; i++) {
    const y = tubePos.getY(i)
    const t = THREE.MathUtils.clamp((y + 20) / 20, 0, 1) // -20 → 0 mapped to 0 → 1
    
    // Warm: rgb(255, 100, 30) at y=-20 (deep/cold)
    // Cold: rgb(30, 80, 200) at y=0 (surface/warm)
    // Actually inverted: cold = blue, warm = orange-red
    const cold = new THREE.Color(0x1a50c8)
    const warm = new THREE.Color(0xff6420)
    const mid = new THREE.Color(0x1a8855)
    
    let col
    if (t < 0.5) {
      col = cold.clone().lerp(mid, t * 2)
    } else {
      col = mid.clone().lerp(warm, (t - 0.5) * 2)
    }
    
    colors[i * 3] = col.r
    colors[i * 3 + 1] = col.g
    colors[i * 3 + 2] = col.b
  }
  
  tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  
  const tubeMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    emissive: new THREE.Color(0x224466),
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.5,
    transparent: true,
    opacity: 0.85
  })
  
  const tube = new THREE.Mesh(tubeGeo, tubeMat)
  scene.add(tube)
  conveyorMeshes.push(tube)
  
  conveyorData.push({ path, curve, phase: c * Math.PI * 2 / CONVEYOR_PATHS })
}

// ─── Surface current arrows (instanced) ─────────────────────────────────────
const ARROW_COUNT = 120
const arrowGeo = new THREE.ConeGeometry(0.4, 2, 6)
arrowGeo.rotateX(Math.PI / 2)

const arrowInst = new THREE.InstancedMesh(arrowGeo, 
  new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.6 }),
  ARROW_COUNT
)
scene.add(arrowInst)

const arrowPositions = []
const arrowDirs = []
for (let i = 0; i < ARROW_COUNT; i++) {
  arrowPositions.push(new THREE.Vector3(
    (Math.random() - 0.5) * 200,
    -4 + Math.random() * 2,
    (Math.random() - 0.5) * 120
  ))
  arrowDirs.push(new THREE.Vector3(
    Math.random() - 0.5,
    0,
    Math.random() > 0.5 ? -1 : 1
  ))
}

// ─── Deep water particles ────────────────────────────────────────────────────
const PARTICLE_COUNT = 3000
const particleGeo = new THREE.BufferGeometry()
const particlePos = new Float32Array(PARTICLE_COUNT * 3)
const particleVel = new Float32Array(PARTICLE_COUNT * 3)
const particlePhase = new Float32Array(PARTICLE_COUNT)

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particlePhase[i] = Math.random()
  resetParticle(i)
}

function resetParticle(i) {
  // Random position along conveyor
  const pathIdx = Math.floor(Math.random() * CONVEYOR_PATHS)
  const t = Math.random()
  const path = conveyorData[pathIdx].path
  const pt = path[Math.floor(t * (path.length - 1))]
  
  particlePos[i * 3] = pt.x + (Math.random() - 0.5) * 10
  particlePos[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 3
  particlePos[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 10
  
  particleVel[i * 3] = (Math.random() - 0.5) * 0.5
  particleVel[i * 3 + 1] = (Math.random() - 0.5) * 0.1
  particleVel[i * 3 + 2] = (Math.random() - 0.5) * 0.5
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))

// Color by temperature (depth)
const particleColors = new Float32Array(PARTICLE_COUNT * 3)
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const y = particlePos[i * 3 + 1]
  const t = THREE.MathUtils.clamp((y + 20) / 20, 0, 1)
  const cold = new THREE.Color(0x1a50c8)
  const warm = new THREE.Color(0xff6420)
  const col = cold.clone().lerp(warm, t)
  particleColors[i * 3] = col.r
  particleColors[i * 3 + 1] = col.g
  particleColors[i * 3 + 2] = col.b
}
particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))

const particleMat = new THREE.PointsMaterial({
  size: 0.5,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.5,
  depthWrite: false
})
const particles = new THREE.Points(particleGeo, particleMat)
scene.add(particles)

// ─── Upwelling zones (glowing spots) ─────────────────────────────────────────
const UPWELL_ZONES = [
  { x: -30, z: -30 },
  { x: 20, z: 10 },
  { x: -50, z: 20 },
]
const upwellSprites = []
for (const zone of UPWELL_ZONES) {
  const upGeo = new THREE.CircleGeometry(5, 32)
  const upMat = new THREE.MeshBasicMaterial({
    color: 0x00ffaa,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  })
  const upwell = new THREE.Mesh(upGeo, upMat)
  upwell.rotation.x = -Math.PI / 2
  upwell.position.set(zone.x, -3, zone.z)
  scene.add(upwell)
  upwellSprites.push({ mesh: upwell, zone })
}

// ─── Polar sinking zones ─────────────────────────────────────────────────────
const SINK_ZONES = [
  { x: 50, z: 40 },
  { x: -60, z: 50 },
]
const sinkSprites = []
for (const zone of SINK_ZONES) {
  const sGeo = new THREE.CircleGeometry(4, 32)
  const sMat = new THREE.MeshBasicMaterial({
    color: 0x2244ff,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  })
  const sink = new THREE.Mesh(sGeo, sMat)
  sink.rotation.x = -Math.PI / 2
  sink.position.set(zone.x, -4, zone.z)
  scene.add(sink)
  sinkSprites.push({ mesh: sink, zone })
}

// ─── Labels ─────────────────────────────────────────────────────────────────
const labelDiv = document.createElement('div')
labelDiv.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#4488aa;font-family:Courier New;font-size:12px;text-align:center;pointer-events:none'
labelDiv.innerHTML = 'THERMOHALINE CIRCULATION | Blue=Cold/Deep | Orange=Warm/Surface | Green circles=Upwelling | Click=Add current pulse'
document.body.appendChild(labelDiv)

// ─── Input ──────────────────────────────────────────────────────────────────
window.addEventListener('click', () => {
  // Add a pulse of particles
  for (let i = 0; i < 50; i++) {
    const idx = Math.floor(Math.random() * PARTICLE_COUNT)
    resetParticle(idx)
    particleVel[idx * 3] = (Math.random() - 0.5) * 2
    particleVel[idx * 3 + 1] = (Math.random() - 0.5) * 0.5
    particleVel[idx * 3 + 2] = (Math.random() - 0.5) * 2
  }
  particleGeo.attributes.position.needsUpdate = true
  
  // Flash upwelling
  for (const u of upwellSprites) {
    u.mesh.material.opacity = 0.8
  }
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    for (const m of conveyorMeshes) {
      m.material.opacity = Math.min(1, m.material.opacity + 0.1)
    }
  }
  if (e.key === 'ArrowDown') {
    for (const m of conveyorMeshes) {
      m.material.opacity = Math.max(0.2, m.material.opacity - 0.1)
    }
  }
})

// ─── Animate ─────────────────────────────────────────────────────────────────
let simTime = 0
let lastTime = 0
const dummy = new THREE.Object3D()

function animate(time) {
  requestAnimationFrame(animate)
  const dt = Math.min(0.05, (time - lastTime) / 1000)
  lastTime = time
  simTime += dt
  
  // Update ocean shader
  oceanMat.uniforms.uTime.value = simTime
  
  // Flow particles along conveyor paths
  const pPos = particleGeo.attributes.position.array
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particlePhase[i] += dt * 0.3
    
    // Move along assigned conveyor
    const pathIdx = i % CONVEYOR_PATHS
    const curve = conveyorData[pathIdx].curve
    
    // Get position along curve
    const t = (particlePhase[i] + i * 0.001) % 1.0
    const pt = curve.getPoint(t)
    
    // Add some turbulence
    pPos[i * 3] = pt.x + Math.sin(simTime * 2 + i) * 0.5
    pPos[i * 3 + 1] = pt.y + Math.cos(simTime * 3 + i * 0.5) * 0.3
    pPos[i * 3 + 2] = pt.z + Math.sin(simTime * 1.5 + i * 0.7) * 0.5
  }
  particleGeo.attributes.position.needsUpdate = true
  
  // Update arrow instances
  for (let i = 0; i < ARROW_COUNT; i++) {
    const p = arrowPositions[i]
    dummy.position.set(p.x, p.y, p.z)
    dummy.lookAt(p.x + arrowDirs[i].x, p.y, p.z + arrowDirs[i].z)
    dummy.rotateX(Math.PI / 2)
    dummy.updateMatrix()
    arrowInst.setMatrixAt(i, dummy.matrix)
  }
  arrowInst.instanceMatrix.needsUpdate = true
  
  // Pulsing upwelling zones
  for (const u of upwellSprites) {
    u.mesh.scale.setScalar(1 + Math.sin(simTime * 2) * 0.2)
    u.mesh.material.opacity = Math.max(0.2, u.mesh.material.opacity - dt * 0.5)
  }
  
  // Pulsing sink zones
  for (const s of sinkSprites) {
    s.mesh.scale.setScalar(1 + Math.sin(simTime * 1.5 + 1) * 0.15)
  }
  
  // Conveyor tube pulsing
  for (let c = 0; c < conveyorMeshes.length; c++) {
    const pulse = 0.85 + Math.sin(simTime * 2 + c) * 0.1
    conveyorMeshes[c].material.emissiveIntensity = pulse * 0.4
  }
  
  controls.update()
  composer.render()
}
animate(0)

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

console.log('3701 Ocean Thermal Circulation — thermohaline conveyor belt, upwelling/sinking zones')
