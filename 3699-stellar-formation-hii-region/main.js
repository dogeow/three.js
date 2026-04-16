/**
 * 3699. Stellar Formation HII Region
 * Strömgren sphere: Hot O-star UV ionizes surrounding hydrogen
 * 
 * Science: A hot massive star emits UV photons that ionize hydrogen
 * within the Strömgren radius: r_s = (3 * Q / 4π α_B n²)^(1/3)
 * where Q = photon emission rate, α_B = recombination coeff, n = density
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000005)
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000)
camera.position.set(0, 40, 120)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.3
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.2, 0.5, 0.6)
composer.addPass(bloom)

// ─── Background star field ───────────────────────────────────────────────────
const starCount = 3000
const starGeo = new THREE.BufferGeometry()
const starPos = new Float32Array(starCount * 3)
for (let i = 0; i < starCount * 3; i++) {
  starPos[i] = (Math.random() - 0.5) * 3000
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true })
scene.add(new THREE.Points(starGeo, starMat))

// ─── Molecular cloud (neutral hydrogen) ─────────────────────────────────────
const CLOUD_SIZE = 100
const CLOUD_RES = 48
const cloudGeo = new THREE.BoxGeometry(CLOUD_SIZE, CLOUD_SIZE, CLOUD_SIZE, CLOUD_RES, CLOUD_RES, CLOUD_RES)

// Displace vertices with noise for clumpy cloud
const cPos = cloudGeo.attributes.position
const cloudOrig = new Float32Array(cPos.count * 3)
for (let i = 0; i < cPos.count; i++) {
  cloudOrig[i * 3] = cPos.getX(i)
  cloudOrig[i * 3 + 1] = cPos.getY(i)
  cloudOrig[i * 3 + 2] = cPos.getZ(i)
}

// Custom shader for HII region
const cloudShader = {
  uniforms: {
    uTime: { value: 0 },
    uIonRadius: { value: 15.0 },
    uStarPos: { value: new THREE.Vector3(0, 0, 0) }
  },
  vertexShader: `
    varying vec3 vWorld;
    varying vec3 vLocal;
    uniform float uTime;
    void main() {
      vLocal = position;
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      // Subtle turbulence
      vec3 p = position;
      float turb = sin(p.x * 0.1 + uTime * 0.1) * sin(p.y * 0.15 + uTime * 0.08) * 2.0;
      p += normalize(p) * turb;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vWorld;
    varying vec3 vLocal;
    uniform float uTime;
    uniform float uIonRadius;
    uniform vec3 uStarPos;
    
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    
    float noise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
            mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
            mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
    }
    
    void main() {
      float dist = length(vWorld - uStarPos);
      
      // Ionization front
      float ionFrac = smoothstep(uIonRadius + 5.0, uIonRadius - 5.0, dist);
      
      // Clumpy density
      float density = noise3(vLocal * 0.08 + uTime * 0.02) * 0.7 + 0.3;
      float clump = noise3(vLocal * 0.15 + vec3(uTime * 0.01)) * 0.5 + 0.5;
      density *= clump;
      
      // HII region (ionized): blue-white glow
      vec3 ionizedColor = vec3(0.15, 0.4, 1.0) * 2.5 * density;
      // HII edge: pink/magenta
      vec3 edgeColor = vec3(0.8, 0.2, 0.6) * 2.0;
      // Neutral cloud: dark brown/orange
      vec3 neutralColor = vec3(0.3, 0.15, 0.05) * density * 0.8;
      
      // Blend: ionized → edge → neutral
      vec3 color;
      if (ionFrac > 0.5) {
        color = mix(edgeColor, ionizedColor, (ionFrac - 0.5) * 2.0);
      } else {
        color = mix(neutralColor, edgeColor, ionFrac * 2.0);
      }
      
      // Edge glow (frontier)
      float edgeGlow = exp(-abs(dist - uIonRadius) * 0.15) * 0.8;
      color += vec3(0.3, 0.5, 1.0) * edgeGlow;
      
      // Fade at cloud boundary
      float cloudEdge = length(vLocal) / (${(CLOUD_SIZE/2).toFixed(1)});
      float alpha = (1.0 - smoothstep(0.7, 1.0, cloudEdge)) * 0.85;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
}

const cloudMat = new THREE.ShaderMaterial({
  uniforms: cloudShader.uniforms,
  vertexShader: cloudShader.vertexShader,
  fragmentShader: cloudShader.fragmentShader,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false
})

const cloud = new THREE.Mesh(cloudGeo, cloudMat)
scene.add(cloud)

// ─── Central O-star ──────────────────────────────────────────────────────────
const starGeo = new THREE.SphereGeometry(1.5, 32, 32)
const starMat = new THREE.MeshBasicMaterial({ color: 0xaaddff })
const centralStar = new THREE.Mesh(starGeo, starMat)
scene.add(centralStar)

// Star glow (sprite)
const glowCanvas = document.createElement('canvas')
glowCanvas.width = glowCanvas.height = 128
const gctx = glowCanvas.getContext('2d')
const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64)
grad.addColorStop(0, 'rgba(200,220,255,1)')
grad.addColorStop(0.3, 'rgba(100,150,255,0.6)')
grad.addColorStop(1, 'rgba(0,0,50,0)')
gctx.fillStyle = grad
gctx.fillRect(0, 0, 128, 128)
const glowTex = new THREE.CanvasTexture(glowCanvas)

const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true })
const starGlow = new THREE.Sprite(glowMat)
starGlow.scale.setScalar(40)
scene.add(starGlow)

// Star corona (sprite layer)
const coronaMat = new THREE.SpriteMaterial({ 
  map: glowTex, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.5 
})
const corona = new THREE.Sprite(coronaMat)
corona.scale.setScalar(80)
scene.add(corona)

// ─── Stellar wind particles ──────────────────────────────────────────────────
const WIND_COUNT = 3000
const windGeo = new THREE.BufferGeometry()
const windPos = new Float32Array(WIND_COUNT * 3)
const windVel = new Float32Array(WIND_COUNT * 3)
const windLife = new Float32Array(WIND_COUNT)
const windMaxLife = new Float32Array(WIND_COUNT)

const windColors = new Float32Array(WIND_COUNT * 3)

for (let i = 0; i < WIND_COUNT; i++) {
  resetWindParticle(i)
  windMaxLife[i] = 1.5 + Math.random() * 2.0
}

function resetWindParticle(i) {
  // Spawn in random direction from star
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = 1.5 + Math.random() * 3
  
  windPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r
  windPos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r
  windPos[i * 3 + 2] = Math.cos(phi) * r
  
  const speed = 8 + Math.random() * 15
  windVel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
  windVel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
  windVel[i * 3 + 2] = Math.cos(phi) * speed
  
  windLife[i] = 0
  
  // Color: blue-white near star, redder as it cools
  windColors[i * 3] = 0.7; windColors[i * 3 + 1] = 0.85; windColors[i * 3 + 2] = 1.0
}

windGeo.setAttribute('position', new THREE.BufferAttribute(windPos, 3))
windGeo.setAttribute('color', new THREE.BufferAttribute(windColors, 3))

const windMat = new THREE.PointsMaterial({
  size: 0.6,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.7,
  depthWrite: false
})

const windParticles = new THREE.Points(windGeo, windMat)
scene.add(windParticles)

// ─── HII region expansion ────────────────────────────────────────────────────
// Strömgren radius based on star luminosity (scaled)
let ionRadius = 15.0
const STROMGREN_MIN = 12.0
const STROMGREN_MAX = 25.0

// UI element
const rDisplay = document.getElementById('r')

// ─── Input ───────────────────────────────────────────────────────────────────
window.addEventListener('click', (e) => {
  // Add another star cluster (just flash for visual effect)
  const flash = new THREE.PointLight(0x4488ff, 5, 50)
  flash.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30)
  scene.add(flash)
  setTimeout(() => scene.remove(flash), 300)
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    ionRadius = Math.min(STROMGREN_MAX, ionRadius + 2)
  }
  if (e.key === 'ArrowDown') {
    ionRadius = Math.max(STROMGREN_MIN, ionRadius - 2)
  }
})

// ─── Animate ─────────────────────────────────────────────────────────────────
let simTime = 0
let lastTime = 0

function animate(time) {
  requestAnimationFrame(animate)
  const dt = Math.min(0.05, (time - lastTime) / 1000)
  lastTime = time
  simTime += dt
  
  // Slowly expand Strömgren sphere (photoevaporation)
  if (ionRadius < STROMGREN_MAX) {
    ionRadius += dt * 0.3
  }
  
  // Update shader uniforms
  cloudMat.uniforms.uTime.value = simTime
  cloudMat.uniforms.uIonRadius.value = ionRadius
  
  // Pulsing star
  const pulse = 1.0 + Math.sin(simTime * 3) * 0.1 + Math.sin(simTime * 7) * 0.05
  centralStar.scale.setScalar(pulse)
  starGlow.scale.setScalar(40 * pulse)
  corona.scale.setScalar(80 * pulse)
  starMat.color.setHSL(0.6 + Math.sin(simTime * 0.5) * 0.02, 0.5, 0.85)
  
  // Wind particles
  const wPos = windGeo.attributes.position.array
  const wCol = windGeo.attributes.color.array
  for (let i = 0; i < WIND_COUNT; i++) {
    windLife[i] += dt
    if (windLife[i] > windMaxLife[i]) {
      resetWindParticle(i)
      continue
    }
    
    const t = windLife[i] / windMaxLife[i]
    
    // Move particle
    wPos[i * 3] += windVel[i * 3] * dt
    wPos[i * 3 + 1] += windVel[i * 3 + 1] * dt
    wPos[i * 3 + 2] += windVel[i * 3 + 2] * dt
    
    // Decelerate
    windVel[i * 3] *= 0.995
    windVel[i * 3 + 1] *= 0.995
    windVel[i * 3 + 2] *= 0.995
    
    // Cool down color (blue → orange as it moves outward)
    const cool = Math.min(1, t * 1.5)
    wCol[i * 3] = 0.7 + cool * 0.3
    wCol[i * 3 + 1] = 0.85 - cool * 0.5
    wCol[i * 3 + 2] = 1.0 - cool * 0.8
    
    // Fade
    windMat.opacity = 0.7 * (1 - t * t)
  }
  windGeo.attributes.position.needsUpdate = true
  windGeo.attributes.color.needsUpdate = true
  
  // Slowly rotate cloud for better view
  cloud.rotation.y += 0.0002
  cloud.rotation.x += 0.0001
  
  rDisplay.textContent = ionRadius.toFixed(1)
  
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

console.log('3699 Stellar Formation HII Region — Strömgren sphere, O-star UV ionization')
