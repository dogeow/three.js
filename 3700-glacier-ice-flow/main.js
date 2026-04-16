/**
 * 3700. Glacier Ice Flow
 * Ice glacier flow simulation with plastic deformation, crevasses, and melt
 * 
 * Science: Glaciers flow under their own weight through plastic deformation of ice
 * (glen's flow law) and basal sliding. Surface crevasses form in zones of tension.
 * Flow velocity: v = (2A/5) * (ρg sin α)^n * h^n (where n≈3 for Glen's flow law)
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0f18)
scene.fog = new THREE.FogExp(0x0a0f18, 100, 400)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 800)
camera.position.set(40, 35, 80)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI * 0.85

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.5, 0.7)
composer.addPass(bloom)

// Lights
scene.add(new THREE.AmbientLight(0x334466, 0.6))
const sun = new THREE.DirectionalLight(0x88bbff, 1.0)
sun.position.set(50, 80, 60)
scene.add(sun)
const fill = new THREE.DirectionalLight(0x446688, 0.3)
fill.position.set(-30, 20, -40)
scene.add(fill)

// ─── Mountain valley terrain ─────────────────────────────────────────────────
const TERRAIN_W = 160
const TERRAIN_D = 200
const TERRAIN_RES = 100
const valleyGeo = new THREE.PlaneGeometry(TERRAIN_W, TERRAIN_D, TERRAIN_RES * 2, TERRAIN_RES * 2)
valleyGeo.rotateX(-Math.PI / 2)

// Build valley shape
const tPos = valleyGeo.attributes.position
const origT = new Float32Array(tPos.count * 3)
for (let i = 0; i < tPos.count; i++) {
  const x = tPos.getX(i)
  const z = tPos.getZ(i)
  origT[i * 3] = x
  origT[i * 3 + 1] = tPos.getY(i)
  origT[i * 3 + 2] = z
  
  // U-shaped glacial valley (parabolic cross-section)
  const normalizedX = x / (TERRAIN_W / 2)
  const valleyDepth = 15 * (1 - normalizedX * normalizedX)
  
  // Longitudinal slope (higher at back, lower at front)
  const slope = (z + TERRAIN_D / 2) / TERRAIN_D * 12
  
  tPos.setY(i, -valleyDepth - slope)
}

valleyGeo.computeVertexNormals()

const valleyMat = new THREE.MeshStandardMaterial({
  color: 0x4a5568,
  roughness: 0.9,
  metalness: 0.1
})
const valley = new THREE.Mesh(valleyGeo, valleyMat)
scene.add(valley)

// Rock walls (mountain sides)
const wallGeo = new THREE.PlaneGeometry(TERRAIN_W * 1.5, TERRAIN_D, 40, 60)
wallGeo.rotateX(-Math.PI / 2)
const wPos = wallGeo.attributes.position
for (let i = 0; i < wPos.count; i++) {
  const x = wPos.getX(i)
  const z = wPos.getZ(i)
  const wallH = 30 + Math.sin(x * 0.05) * 10 + Math.sin(z * 0.08) * 8
  wPos.setY(i, wallH)
}
wallGeo.computeVertexNormals()
const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.95, metalness: 0.05 })

// Left and right walls
const leftWall = new THREE.Mesh(wallGeo, wallMat)
leftWall.position.set(-TERRAIN_W / 2 - 30, 0, 0)
scene.add(leftWall)

const rightWall = new THREE.Mesh(wallGeo, wallMat)
rightWall.position.set(TERRAIN_W / 2 + 30, 0, 0)
scene.add(rightWall)

// ─── Glacier body ─────────────────────────────────────────────────────────────
const GLACIER_LEN = 150
const GLACIER_W = 50
const GLACIER_RES = 80
const glacierGeo = new THREE.PlaneGeometry(GLACIER_W, GLACIER_LEN, GLACIER_RES, GLACIER_RES * 2)
glacierGeo.rotateX(-Math.PI / 2)

const gPos = glacierGeo.attributes.position
const glacierOrig = new Float32Array(gPos.count * 3)
const glacierVel = new Float32Array(gPos.count * 3) // flow velocity

for (let i = 0; i < gPos.count; i++) {
  const x = gPos.getX(i)
  const z = gPos.getZ(i)
  glacierOrig[i * 3] = x
  glacierOrig[i * 3 + 1] = gPos.getY(i)
  glacierOrig[i * 3 + 2] = z
  glacierVel[i * 3] = 0
  glacierVel[i * 3 + 1] = 0
  glacierVel[i * 3 + 2] = 0
}

// Glacier shader with crevasse detection
const glacierShader = {
  uniforms: {
    uTime: { value: 0 },
    uFlowSpeed: { value: 1.0 }
  },
  vertexShader: `
    varying vec3 vWorld;
    varying vec3 vNormal;
    varying float vCrevasse;
    varying float vZ;
    uniform float uTime;
    
    float hash(float n) { return fract(sin(n) * 43758.5453); }
    float noise2(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i.x + i.y * 57.0), hash(i.x+1.0 + i.y*57.0), f.x),
                 mix(hash(i.x + (i.y+1.0)*57.0), hash(i.x+1.0+(i.y+1.0)*57.0), f.x), f.y);
    }
    
    void main() {
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      vNormal = normalMatrix * normal;
      vZ = position.z;
      
      // Crevasse pattern (tension zones near edges and where flow accelerates)
      float edgeDist = abs(position.x) / ${(GLACIER_W/2).toFixed(1)};
      float crevasse1 = noise2(vec2(position.x * 0.3, position.z * 0.15 + uTime * 0.1));
      float crevasse2 = noise2(vec2(position.x * 0.5 - 2.0, position.z * 0.08));
      float crevasse = (crevasse1 * crevasse2) * edgeDist * 1.5;
      crevasse = pow(crevasse, 0.6);
      vCrevasse = crevasse;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vWorld;
    varying vec3 vNormal;
    varying float vCrevasse;
    varying float vZ;
    uniform float uTime;
    
    void main() {
      // Ice colors: blue-deep to white surface
      vec3 deepIce = vec3(0.1, 0.3, 0.6);
      vec3 surfaceIce = vec3(0.85, 0.92, 0.98);
      vec3 crevasseBlue = vec3(0.05, 0.15, 0.4);
      
      // Base ice color (deeper at center of glacier, whiter at surface)
      float depth = vZ / ${GLACIER_LEN.toFixed(1)}; // 0 = top, 1 = end
      vec3 iceColor = mix(surfaceIce, deepIce, depth * 0.5);
      
      // Crevasse: deep blue cracks
      if (vCrevasse > 0.25) {
        float t = smoothstep(0.25, 0.6, vCrevasse);
        iceColor = mix(iceColor, crevasseBlue, t);
      }
      
      // Simple lighting
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float diff = max(0.0, dot(vNormal, lightDir)) * 0.6 + 0.4;
      iceColor *= diff;
      
      // Specular (snow/ice shine)
      vec3 viewDir = normalize(cameraPosition - vWorld);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(0.0, dot(vNormal, halfDir)), 32.0) * 0.4;
      iceColor += vec3(spec);
      
      // Fresnel edge glow
      float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.0);
      iceColor += fresnel * vec3(0.2, 0.4, 0.8) * 0.3;
      
      gl_FragColor = vec4(iceColor, 0.95);
    }
  `
}

const glacierMat = new THREE.ShaderMaterial({
  uniforms: glacierShader.uniforms,
  vertexShader: glacierShader.vertexShader,
  fragmentShader: glacierShader.fragmentShader,
  transparent: true,
  side: THREE.DoubleSide
})

const glacier = new THREE.Mesh(glacierGeo, glacierMat)
glacier.position.set(0, 0.3, 0)
scene.add(glacier)

// Ice particles (calving/ice falling)
const ICE_COUNT = 2000
const iceGeo = new THREE.BufferGeometry()
const icePos = new Float32Array(ICE_COUNT * 3)
const iceVel = new Float32Array(ICE_COUNT * 3)
const iceSize = new Float32Array(ICE_COUNT)
const iceLife = new Float32Array(ICE_COUNT)
const iceMaxLife = new Float32Array(ICE_COUNT)

for (let i = 0; i < ICE_COUNT; i++) {
  resetIceParticle(i)
  iceMaxLife[i] = 3 + Math.random() * 5
}

function resetIceParticle(i) {
  // Spawn at glacier front
  icePos[i * 3] = (Math.random() - 0.5) * GLACIER_W * 0.8
  icePos[i * 3 + 1] = Math.random() * 3
  icePos[i * 3 + 2] = -GLACIER_LEN / 2 + Math.random() * 10
  
  iceVel[i * 3] = (Math.random() - 0.5) * 2
  iceVel[i * 3 + 1] = -1 - Math.random() * 3
  iceVel[i * 3 + 2] = -2 - Math.random() * 5
  
  iceSize[i] = 0.3 + Math.random() * 0.8
  iceLife[i] = iceMaxLife[i] // Start at max life (inactive)
}

iceGeo.setAttribute('position', new THREE.BufferAttribute(icePos, 3))
const iceMat = new THREE.PointsMaterial({
  color: 0xaaddff,
  size: 0.5,
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.6,
  depthWrite: false
})
const iceParticles = new THREE.Points(iceGeo, iceMat)
scene.add(iceParticles)

// ─── Melt water streams ──────────────────────────────────────────────────────
const STREAM_SEGS = 50
const streamPoints = []
for (let s = 0; s < 4; s++) {
  const pts = []
  const sx = (s - 1.5) * 8 + (Math.random() - 0.5) * 4
  for (let j = 0; j < STREAM_SEGS; j++) {
    const t = j / STREAM_SEGS
    pts.push(new THREE.Vector3(
      sx + Math.sin(j * 0.5) * 2,
      -8 - j * 0.15,
      -GLACIER_LEN / 2 - j * 0.8 + (Math.random() - 0.5) * 0.5
    ))
  }
  streamPoints.push(pts)
}

const streamMat = new THREE.LineBasicMaterial({ color: 0x4488bb, transparent: true, opacity: 0.6 })
for (const pts of streamPoints) {
  const sGeo = new THREE.BufferGeometry().setFromPoints(pts)
  scene.add(new THREE.Line(sGeo, streamMat))
}

// ─── Snow particles ──────────────────────────────────────────────────────────
const SNOW_COUNT = 500
const snowGeo = new THREE.BufferGeometry()
const snowPos = new Float32Array(SNOW_COUNT * 3)
const snowVel = new Float32Array(SNOW_COUNT * 3)

for (let i = 0; i < SNOW_COUNT; i++) {
  snowPos[i * 3] = (Math.random() - 0.5) * TERRAIN_W
  snowPos[i * 3 + 1] = 20 + Math.random() * 40
  snowPos[i * 3 + 2] = (Math.random() - 0.5) * TERRAIN_D
  snowVel[i * 3] = 0
  snowVel[i * 3 + 1] = -1 - Math.random()
  snowVel[i * 3 + 2] = 0
}

snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3))
const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.7 })
const snow = new THREE.Points(snowGeo, snowMat)
scene.add(snow)

// ─── Animation ────────────────────────────────────────────────────────────────
let simTime = 0
let lastTime = 0

function animate(time) {
  requestAnimationFrame(animate)
  const dt = Math.min(0.05, (time - lastTime) / 1000)
  lastTime = time
  simTime += dt
  
  // Glacier flow: vertices slide down valley (z direction)
  // Using simple velocity field: faster in center, slower at margins
  const flowSpeed = 1.2 * dt * 60
  const gAttr = glacierGeo.attributes.position
  for (let i = 0; i < gAttr.count; i++) {
    const x = glacierOrig[i * 3]
    const z = glacierOrig[i * 3 + 2]
    
    // Velocity: max at center, lower near margins
    const margin = Math.abs(x) / (GLACIER_W / 2)
    const vel = flowSpeed * (1 - margin * margin) * (1 + z / GLACIER_LEN)
    
    // Displace z (flow direction)
    let newZ = gAttr.getZ(i) - vel
    // Wrap around (loop the glacier)
    if (newZ < -GLACIER_LEN / 2) {
      newZ = GLACIER_LEN / 2
    }
    gAttr.setZ(i, newZ)
  }
  gAttr.needsUpdate = true
  
  // Update shader
  glacierMat.uniforms.uTime.value = simTime
  glacierMat.uniforms.uFlowSpeed.value = flowSpeed
  
  // Ice particles
  const iPos = iceGeo.attributes.position.array
  for (let i = 0; i < ICE_COUNT; i++) {
    iceLife[i] += dt
    if (iceLife[i] > iceMaxLife[i]) {
      // Respawn
      resetIceParticle(i)
      iceLife[i] = 0
      continue
    }
    
    // Gravity
    iceVel[i * 3 + 1] -= 9.8 * dt
    // Air resistance
    iceVel[i * 3] *= 0.99
    iceVel[i * 3 + 1] *= 0.99
    iceVel[i * 3 + 2] *= 0.99
    
    iPos[i * 3] += iceVel[i * 3] * dt
    iPos[i * 3 + 1] += iceVel[i * 3 + 1] * dt
    iPos[i * 3 + 2] += iceVel[i * 3 + 2] * dt
    
    // Reset when below ground
    if (iPos[i * 3 + 1] < -12) {
      resetIceParticle(i)
      iceLife[i] = 0
    }
  }
  iceGeo.attributes.position.needsUpdate = true
  
  // Snow
  const sPos = snowGeo.attributes.position.array
  for (let i = 0; i < SNOW_COUNT; i++) {
    sPos[i * 3] += Math.sin(simTime + i) * 0.02
    sPos[i * 3 + 1] += snowVel[i * 3 + 1] * dt
    sPos[i * 3 + 2] += 0.01
    
    if (sPos[i * 3 + 1] < 0) {
      sPos[i * 3 + 1] = 30 + Math.random() * 30
      sPos[i * 3] = (Math.random() - 0.5) * TERRAIN_W
      sPos[i * 3 + 2] = (Math.random() - 0.5) * TERRAIN_D
    }
  }
  snowGeo.attributes.position.needsUpdate = true
  
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

console.log('3700 Glacier Ice Flow — plastic deformation, crevasses, calving ice')
