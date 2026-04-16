// 3897. Stellar Nursery: Gas Collapse & Feedback
// 恒星托儿所：分子云塌缩与反馈
// type: physics | astrophysics | particle-sim
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000008)
scene.fog = new THREE.FogExp2(0x000008, 0.004)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 40, 120)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

// ── Lighting ──────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x112244, 0.8)
scene.add(ambient)
const pointLight = new THREE.PointLight(0xffaa44, 2, 80)
pointLight.position.set(0, 0, 0)
scene.add(pointLight)

// ── Nebula background shader ──────────────────────────────────────────────────
const nebulaGeo = new THREE.SphereGeometry(600, 32, 32)
const nebulaMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vPos;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float noise(vec3 p) {
      vec3 i = floor(p); vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                     mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                     mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float v = 0.0, a = 0.5;
      for(int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
      return v;
    }
    void main() {
      vec3 dir = normalize(vPos);
      float t = uTime * 0.05;
      float n = fbm(dir * 3.0 + t);
      float n2 = fbm(dir * 6.0 - t * 0.7);
      vec3 col1 = vec3(0.15, 0.05, 0.3); // dark purple
      vec3 col2 = vec3(0.0, 0.1, 0.4);  // deep blue
      vec3 col3 = vec3(0.3, 0.1, 0.5);  // pink-purple
      vec3 col = mix(col1, col2, n);
      col = mix(col, col3, n2 * 0.5);
      float density = pow(n * n2, 1.5) * 3.0;
      gl_FragColor = vec4(col * density, density * 0.8);
    }
  `
})
const nebula = new THREE.Mesh(nebulaGeo, nebulaMat)
scene.add(nebula)

// ── Protostellar core ─────────────────────────────────────────────────────────
const coreGeo = new THREE.SphereGeometry(2, 32, 32)
const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff4e0 })
const core = new THREE.Mesh(coreGeo, coreMat)
scene.add(core)

// Core glow (sprite)
const spriteMat = new THREE.SpriteMaterial({
  map: (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.3, 'rgba(255,180,80,0.6)');
    g.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })(),
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false
})
const coreGlow = new THREE.Sprite(spriteMat)
coreGlow.scale.set(20, 20, 1)
scene.add(coreGlow)

// ── Gas cloud particle system ─────────────────────────────────────────────────
const N_PARTICLES = 6000
const positions = new Float32Array(N_PARTICLES * 3)
const velocities = new Float32Array(N_PARTICLES * 3)
const colors = new Float32Array(N_PARTICLES * 3)
const sizes = new Float32Array(N_PARTICLES)
const rArr = new Float32Array(N_PARTICLES)
const thetaArr = new Float32Array(N_PARTICLES)
const zArr = new Float32Array(N_PARTICLES)
const initialR = new Float32Array(N_PARTICLES)

for (let i = 0; i < N_PARTICLES; i++) {
  rArr[i] = 10 + Math.random() * 35
  thetaArr[i] = Math.random() * Math.PI * 2
  zArr[i] = (Math.random() - 0.5) * 20
  positions[i * 3] = rArr[i] * Math.cos(thetaArr[i])
  positions[i * 3 + 1] = zArr[i]
  positions[i * 3 + 2] = rArr[i] * Math.sin(thetaArr[i])
  initialR[i] = rArr[i]

  // Color: cold molecular cloud blue/purple
  const hue = 0.6 + Math.random() * 0.3
  const col = new THREE.Color().setHSL(hue, 0.8, 0.15 + Math.random() * 0.15)
  colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b
  sizes[i] = 0.3 + Math.random() * 0.8
  velocities[i * 3] = 0; velocities[i * 3 + 1] = 0; velocities[i * 3 + 2] = 0
}

const pGeo = new THREE.BufferGeometry()
pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
pGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

const pMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if(d > 0.5) discard;
      float alpha = 1.0 - smoothstep(0.2, 0.5, d);
      gl_FragColor = vec4(vColor, alpha * 0.7);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true
})

const particles = new THREE.Points(pGeo, pMat)
scene.add(particles)

// ── Accretion disk (torus) ────────────────────────────────────────────────────
const diskGeo = new THREE.TorusGeometry(12, 5, 3, 64)
const diskMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  side: THREE.DoubleSide,
  transparent: true,
  vertexShader: `
    varying vec3 vPos;
    varying vec2 vUv;
    void main() {
      vPos = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vPos;
    varying vec2 vUv;
    void main() {
      float angle = atan(vPos.z, vPos.x) + uTime * 0.3;
      float r = length(vPos.xz) / 17.0;
      float spiral = sin(angle * 4.0 + r * 20.0 - uTime * 2.0) * 0.5 + 0.5;
      vec3 hot = vec3(1.0, 0.7, 0.2);
      vec3 cold = vec3(0.4, 0.2, 0.6);
      vec3 col = mix(cold, hot, spiral * r);
      float alpha = (1.0 - r) * 0.6;
      gl_FragColor = vec4(col, alpha);
    }
  `
})
const disk = new THREE.Mesh(diskGeo, diskMat)
disk.rotation.x = Math.PI / 2.5
scene.add(disk)

// ── Outflow jets ──────────────────────────────────────────────────────────────
const jetGeo = new THREE.CylinderGeometry(0.2, 1.5, 30, 8, 1, true)
const jetMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float pulse = sin(vUv.y * 15.0 - uTime * 5.0) * 0.5 + 0.5;
      vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(0.8, 0.9, 1.0), pulse);
      float alpha = pulse * (1.0 - vUv.y) * 0.4;
      gl_FragColor = vec4(col, alpha);
    }
  `
})
const jetUp = new THREE.Mesh(jetGeo, jetMat)
jetUp.position.y = 18
scene.add(jetUp)
const jetDown = new THREE.Mesh(jetGeo, jetMat.clone())
jetDown.position.y = -18
jetDown.rotation.z = Math.PI
scene.add(jetDown)

// ── UI Controls ───────────────────────────────────────────────────────────────
let collapseProgress = 0
let accelRate = 0.0003
const progressEl = document.createElement('div')
progressEl.style.cssText = 'position:fixed;top:20px;left:20px;color:#aac;font-family:monospace;font-size:13px;z-index:10;pointer-events:none'
document.body.appendChild(progressEl)

const btn = document.createElement('button')
btn.textContent = '▶ Trigger Collapse'
btn.style.cssText = 'position:fixed;top:20px;right:20px;padding:8px 16px;background:#1a1a2e;border:1px solid #4a4a8a;color:#aaf;border-radius:4px;cursor:pointer;font-family:monospace;font-size:13px;z-index:10'
document.body.appendChild(btn)

let collapsing = false
btn.addEventListener('click', () => { collapsing = true; btn.textContent = '⏳ Collapsing...' })
window.COLLAPSE = () => { collapsing = true }
window.RESET = () => {
  collapsing = false
  collapseProgress = 0
  btn.textContent = '▶ Trigger Collapse'
  for (let i = 0; i < N_PARTICLES; i++) {
    rArr[i] = initialR[i]
    thetaArr[i] = Math.random() * Math.PI * 2
    zArr[i] = (Math.random() - 0.5) * 20
    positions[i * 3] = rArr[i] * Math.cos(thetaArr[i])
    positions[i * 3 + 1] = zArr[i]
    positions[i * 3 + 2] = rArr[i] * Math.sin(thetaArr[i])
    velocities[i * 3] = velocities[i * 3 + 1] = velocities[i * 3 + 2] = 0
  }
  pGeo.attributes.position.needsUpdate = true
}

// ── Physics Update ────────────────────────────────────────────────────────────
function updatePhysics(dt) {
  if (!collapsing) return
  collapseProgress = Math.min(1, collapseProgress + dt * 0.08)
  const G = 0.0008
  const coreMass = collapseProgress * 50 + 1

  for (let i = 0; i < N_PARTICLES; i++) {
    const px = positions[i * 3], py = positions[i * 3 + 1], pz = positions[i * 3 + 2]
    const r = Math.sqrt(px * px + py * py + pz * pz)
    if (r < 0.5) continue

    // Gravity toward center
    const Fg = G * coreMass / (r * r + 0.5)
    const ax = -px / r * Fg
    const ay = -py / r * Fg
    const az = -pz / r * Fg

    // Turbulent pressure (decreases as collapse progresses)
    const turb = 0.002 * (1 - collapseProgress * 0.8)
    const tx = (Math.random() - 0.5) * turb
    const ty = (Math.random() - 0.5) * turb
    const tz = (Math.random() - 0.5) * turb

    velocities[i * 3] += (ax + tx) * dt * 60
    velocities[i * 3 + 1] += (ay + ty) * dt * 60
    velocities[i * 3 + 2] += (az + tz) * dt * 60

    // Damping
    velocities[i * 3] *= 0.995
    velocities[i * 3 + 1] *= 0.995
    velocities[i * 3 + 2] *= 0.995

    positions[i * 3] += velocities[i * 3] * dt
    positions[i * 3 + 1] += velocities[i * 3 + 1] * dt
    positions[i * 3 + 2] += velocities[i * 3 + 2] * dt

    // Color shift: blue→orange as gas heats up near core
    const heat = Math.max(0, 1 - r / 15) * collapseProgress
    const coldCol = new THREE.Color().setHSL(0.65, 0.7, 0.2)
    const hotCol = new THREE.Color().setHSL(0.08, 0.9, 0.55)
    const blended = coldCol.lerp(hotCol, heat)
    colors[i * 3] = blended.r; colors[i * 3 + 1] = blended.g; colors[i * 3 + 2] = blended.b
  }
  pGeo.attributes.position.needsUpdate = true
  pGeo.attributes.color.needsUpdate = true

  // Core growth
  const s = 1 + collapseProgress * 3
  core.scale.setScalar(s)
  coreGlow.scale.setScalar(20 + collapseProgress * 30)
  pointLight.intensity = 0.5 + collapseProgress * 4

  // Disk appearance
  disk.material.uniforms.uTime.value = clock.getElapsedTime()
}

// ── Animation Loop ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.getElapsedTime()

  nebulaMat.uniforms.uTime.value = t
  diskMat.uniforms.uTime.value = t
  jetMat.uniforms.uTime.value = t
  jetUp.rotation.y = t * 0.3
  jetDown.rotation.y = -t * 0.3
  pMat.uniforms.uTime.value = t

  updatePhysics(dt)

  // Camera slow orbit
  camera.position.x = Math.sin(t * 0.05) * 120
  camera.position.z = Math.cos(t * 0.05) * 120
  camera.lookAt(0, 0, 0)

  progressEl.innerHTML = `Collapse: ${(collapseProgress * 100).toFixed(1)}%<br>Star Mass: ${(1 + collapseProgress * 50).toFixed(1)} M☉<br>Particles: ${N_PARTICLES}`

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
