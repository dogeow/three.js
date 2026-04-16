// 3899. Skipping Stone Hydrodynamics
// 打水漂：石块跳跃流体动力学
// type: physics | hydrodynamics | simulation
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 15, 60)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// ── Sky ───────────────────────────────────────────────────────────────────────
const skyGeo = new THREE.SphereGeometry(400, 32, 32)
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  vertexShader: `varying vec3 vWorld; void main(){ vWorld = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    varying vec3 vWorld;
    void main() {
      float h = normalize(vWorld).y;
      vec3 sky = mix(vec3(0.6, 0.8, 1.0), vec3(0.2, 0.4, 0.9), max(0.0, h));
      vec3 sun = vec3(1.0, 0.95, 0.8);
      vec3 dir = normalize(vWorld);
      vec3 sunDir = normalize(vec3(1.0, 0.6, 0.5));
      float s = pow(max(0.0, dot(dir, sunDir)), 64.0);
      sky += sun * s * 2.0;
      gl_FragColor = vec4(sky, 1.0);
    }
  `
})
scene.add(new THREE.Mesh(skyGeo, skyMat))

// ── Lighting ──────────────────────────────────────────────────────────────────
const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2)
sunLight.position.set(30, 50, 20)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(1024, 1024)
sunLight.shadow.camera.near = 1
sunLight.shadow.camera.far = 200
sunLight.shadow.camera.left = -60; sunLight.shadow.camera.right = 60
sunLight.shadow.camera.top = 60; sunLight.shadow.camera.bottom = -60
scene.add(sunLight)
scene.add(new THREE.AmbientLight(0x88aacc, 0.6))

// ── Water surface (wave simulation) ─────────────────────────────────────────────
const WATER_SIZE = 256
const waterScene = new THREE.Scene()
const waterCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

const heightMap = new Float32Array(WATER_SIZE * WATER_SIZE)
const velocityMap = new Float32Array(WATER_SIZE * WATER_SIZE)
const waveTexData = new Uint8Array(WATER_SIZE * WATER_SIZE * 4)

const heightTex = new THREE.DataTexture(heightMap, WATER_SIZE, WATER_SIZE, THREE.RedFormat, THREE.FloatType)
heightTex.needsUpdate = true

const waveMat = new THREE.ShaderMaterial({
  uniforms: { uHeight: { value: heightTex }, uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D uHeight;
    uniform float uTime;
    varying vec2 vUv;
    vec3 getNormal(vec2 uv) {
      float eps = 1.0 / 256.0;
      float h = texture2D(uHeight, uv).r;
      float hx = texture2D(uHeight, uv + vec2(eps, 0.0)).r;
      float hy = texture2D(uHeight, uv + vec2(0.0, eps)).r;
      return normalize(vec3((h - hx) * 30.0, 1.0, (h - hy) * 30.0));
    }
    void main() {
      float h = texture2D(uHeight, vUv).r;
      vec3 normal = getNormal(vUv);
      vec3 lightDir = normalize(vec3(1.0, 0.6, 0.5));
      float diff = max(0.0, dot(normal, lightDir));
      vec3 viewDir = vec3(0.0, 1.0, 0.0);
      vec3 refl = reflect(-lightDir, normal);
      float spec = pow(max(0.0, dot(refl, viewDir)), 64.0);
      vec3 deepColor = vec3(0.02, 0.12, 0.35);
      vec3 shallowColor = vec3(0.1, 0.4, 0.55);
      vec3 col = mix(deepColor, shallowColor, h * 5.0 + 0.5);
      col += diff * 0.3 + spec * 0.6;
      // Foam on high peaks
      float foam = smoothstep(0.1, 0.2, h);
      col = mix(col, vec3(0.9, 0.95, 1.0), foam * 0.7);
      float alpha = 0.85 + h * 0.15;
      gl_FragColor = vec4(col, alpha);
    }
  `,
  transparent: true,
  depthWrite: false
})
const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), waveMat)
waterScene.add(waterMesh)

// Orthographic water plane in main scene
const waterGeo = new THREE.PlaneGeometry(120, 120, 128, 128)
const waterMainMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    void main() {
      vec3 pos = position;
      float h = 0.0;
      h += sin(pos.x * 0.3 + uTime * 1.5) * 0.3;
      h += sin(pos.y * 0.4 + uTime * 1.2) * 0.2;
      h += sin((pos.x + pos.y) * 0.2 + uTime * 0.8) * 0.25;
      h += sin(pos.x * 0.8 + pos.y * 0.6 + uTime * 2.5) * 0.1;
      pos.z = h;
      vPos = pos;
      vNormal = normalize(vec3(-cos(pos.x * 0.3 + uTime * 1.5) * 0.3 * 0.3, -cos(pos.y * 0.4 + uTime * 1.2) * 0.2 * 0.4, 1.0));
      vec4 mv = modelViewMatrix * vec4(pos, 1.0);
      vViewPos = mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    void main() {
      vec3 lightDir = normalize(vec3(1.0, 0.6, 0.5));
      float diff = max(0.0, dot(vNormal, lightDir));
      vec3 deep = vec3(0.02, 0.12, 0.35);
      vec3 shallow = vec3(0.15, 0.45, 0.55);
      float depth = (vPos.z + 1.0) / 2.0;
      vec3 col = mix(deep, shallow, depth);
      vec3 viewDir = normalize(-vViewPos);
      vec3 refl = reflect(-lightDir, vNormal);
      float spec = pow(max(0.0, dot(refl, viewDir)), 64.0);
      col = col * (0.4 + diff * 0.6) + vec3(1.0) * spec * 0.5;
      // Foam
      float foam = smoothstep(0.4, 0.6, vPos.z);
      col = mix(col, vec3(0.9, 0.95, 1.0), foam * 0.6);
      gl_FragColor = vec4(col, 0.88);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
})
const waterPlane = new THREE.Mesh(waterGeo, waterMainMat)
waterPlane.rotation.x = -Math.PI / 2
waterPlane.receiveShadow = true
scene.add(waterPlane)

// ── Stone (skipping rock) ──────────────────────────────────────────────────────
const stoneGeo = new THREE.DiscGeometry(0.6, 0.25, 16) // flat disc
const stoneMat = new THREE.MeshStandardMaterial({
  color: 0x8b7355, roughness: 0.7, metalness: 0.1
})
const stone = new THREE.Mesh(stoneGeo, stoneMat)
stone.castShadow = true
scene.add(stone)

// ── Splash particles ──────────────────────────────────────────────────────────
const MAX_SPLASH = 800
const splashPos = new Float32Array(MAX_SPLASH * 3)
const splashVel = new Float32Array(MAX_SPLASH * 3)
const splashLife = new Float32Array(MAX_SPLASH)
const splashActive = new Uint8Array(MAX_SPLASH)
const splashGeo = new THREE.BufferGeometry()
splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3))
splashGeo.setAttribute('life', new THREE.BufferAttribute(splashLife, 1))
const splashMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float life;
    varying float vLife;
    void main() {
      vLife = life;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = mix(0.0, 8.0 * life, life > 0.0 ? 1.0 : 0.0) * (200.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying float vLife;
    void main() {
      if(vLife <= 0.0) discard;
      float d = length(gl_PointCoord - 0.5);
      if(d > 0.5) discard;
      float alpha = (1.0 - d * 2.0) * vLife * 0.8;
      gl_FragColor = vec4(0.8, 0.9, 1.0, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
})
const splashParticles = new THREE.Points(splashGeo, splashMat)
scene.add(splashParticles)

let splashIdx = 0
function spawnSplash(x, y, z, vx, vy, vz) {
  const n = Math.floor(15 + Math.random() * 20)
  for (let i = 0; i < n; i++) {
    const si = splashIdx % MAX_SPLASH
    splashPos[si * 3] = x + (Math.random() - 0.5) * 0.5
    splashPos[si * 3 + 1] = y
    splashPos[si * 3 + 2] = z + (Math.random() - 0.5) * 0.5
    splashVel[si * 3] = vx * 0.3 + (Math.random() - 0.5) * 3
    splashVel[si * 3 + 1] = Math.random() * 4 + 1
    splashVel[si * 3 + 2] = vz * 0.3 + (Math.random() - 0.5) * 3
    splashLife[si] = 1.0
    splashActive[si] = 1
    splashIdx++
  }
}

function updateSplash(dt) {
  for (let i = 0; i < MAX_SPLASH; i++) {
    if (!splashActive[i]) continue
    splashLife[i] -= dt * 1.2
    if (splashLife[i] <= 0) { splashActive[i] = 0; splashPos[i * 3 + 1] = -100; continue }
    splashPos[i * 3] += splashVel[i * 3] * dt
    splashPos[i * 3 + 1] += splashVel[i * 3 + 1] * dt
    splashPos[i * 3 + 2] += splashVel[i * 3 + 2] * dt
    splashVel[i * 3 + 1] -= 9.8 * dt // gravity
  }
  splashGeo.attributes.position.needsUpdate = true
  splashGeo.attributes.life.needsUpdate = true
}

// ── Ripples (ring meshes) ─────────────────────────────────────────────────────
const ripples = []
function addRipple(x, z, radius, intensity) {
  const rGeo = new THREE.RingGeometry(0.05, 0.5, 32)
  const rMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 * intensity, side: THREE.DoubleSide })
  const r = new THREE.Mesh(rGeo, rMat)
  r.rotation.x = -Math.PI / 2
  r.position.set(x, 0.05, z)
  r.userData = { age: 0, maxAge: 2.5, initOpacity: 0.4 * intensity }
  scene.add(r)
  ripples.push(r)
}

function updateRipples(dt) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]
    r.userData.age += dt
    const t = r.userData.age / r.userData.maxAge
    const s = 1 + t * 12
    r.scale.setScalar(s)
    r.material.opacity = r.userData.initOpacity * (1 - t)
    if (t >= 1) { scene.remove(r); r.geometry.dispose(); r.material.dispose(); ripples.splice(i, 1) }
  }
}

// ── Stone physics state ────────────────────────────────────────────────────────
let stoneState = 'ready' // ready, flying, bouncing
let st_x = 0, st_y = 8, st_z = -30
let st_vx = 12, st_vy = 3, st_vz = 0
let st_angle = 0 // rotation around vertical
let st_rotX = 0  // tilt (angle of attack)
let bounceCount = 0
const MAX_BOUNCES = 15

const infoEl = document.createElement('div')
infoEl.style.cssText = 'position:fixed;top:20px;left:20px;color:#224;font-family:monospace;font-size:13px;z-index:10;pointer-events:none;line-height:1.8'
document.body.appendChild(infoEl)

const btn = document.createElement('button')
btn.textContent = '🚀 Throw Stone'
btn.style.cssText = 'position:fixed;top:20px;right:20px;padding:10px 20px;background:#2255aa;border:none;color:white;border-radius:6px;cursor:pointer;font-family:monospace;font-size:14px;z-index:10'
document.body.appendChild(btn)

function resetStone() {
  stoneState = 'ready'; bounceCount = 0
  st_x = 0; st_y = 8; st_z = -30
  st_vx = 12; st_vy = 3; st_vz = 0
  st_angle = 0; st_rotX = 0
  btn.textContent = '🚀 Throw Stone'
}

btn.addEventListener('click', () => {
  if (stoneState === 'ready') {
    stoneState = 'flying'; btn.textContent = '⏳ Flying...'
  } else if (stoneState === 'done') {
    resetStone()
  }
})

function updateStone(dt) {
  if (stoneState !== 'flying' && stoneState !== 'bouncing') return

  // Gravity
  st_vy -= 9.8 * dt
  st_x += st_vx * dt
  st_y += st_vy * dt
  st_z += st_vz * dt

  // Water wave disturbance at current position
  const wx = (st_x + 60) / 120
  const wz = (st_z + 60) / 120
  const waveDisturb = Math.sin(st_x * 0.3 + clock.getElapsedTime() * 1.5) * 0.3

  // Angle of attack tilt
  st_rotX = Math.atan2(st_vy, Math.sqrt(st_vx * st_vx + st_vz * st_vz)) * 0.1
  st_angle += 5 * dt

  // Collision with water surface (y ≈ 0)
  if (st_y <= 0.5 && st_vy < 0) {
    const impactV = Math.abs(st_vy)
    const horizontalV = Math.sqrt(st_vx * st_vx + st_vz * st_vz)

    if (impactV < 1.5 || bounceCount >= MAX_BOUNCES) {
      // Sink
      stoneState = 'done'
      btn.textContent = '🔄 Reset'
      st_y = -0.5
    } else {
      // Bounce
      stoneState = 'bouncing'
      bounceCount++
      st_vy = -st_vy * 0.45 // restitution
      st_vx *= 0.92
      st_vz *= 0.92
      st_y = 0.5

      // Spawn splash and ripples
      spawnSplash(st_x, 0, st_z, st_vx, st_vy, st_vz)
      addRipple(st_x, st_z, 0.1, Math.min(1, impactV / 5))
      addRipple(st_x, st_z, 0.05, Math.min(1, impactV / 5) * 0.6)

      setTimeout(() => { if (stoneState === 'bouncing') stoneState = 'flying' }, 100)
    }
  }

  // Out of bounds
  if (Math.abs(st_x) > 65 || Math.abs(st_z) > 65 || st_y < -5) {
    stoneState = 'done'; btn.textContent = '🔄 Reset'
  }

  stone.position.set(st_x, st_y, st_z)
  stone.rotation.x = st_rotX
  stone.rotation.z = st_angle
}

// ── Cannon UI ─────────────────────────────────────────────────────────────────
const canvas2d = document.createElement('canvas')
canvas2d.width = 200; canvas2d.height = 100
canvas2d.style.cssText = 'position:fixed;bottom:20px;left:20px;border:2px solid #4488cc;border-radius:8px;background:rgba(255,255,255,0.9);z-index:10;cursor:crosshair'
document.body.appendChild(canvas2d)
const ctx2d = canvas2d.getContext('2d')
ctx2d.font = '12px monospace'
ctx2d.fillStyle = '#224'
ctx2d.fillText('Click to aim & throw', 10, 25)
ctx2d.fillText('Angle → throw speed', 10, 45)
ctx2d.fillText('Bounces: ' + bounceCount, 10, 65)
ctx2d.fillText('Dist: -- m', 10, 85)

canvas2d.addEventListener('click', (e) => {
  const rect = canvas2d.getBoundingClientRect()
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top
  st_vx = 8 + cx * 0.15
  st_vy = 2 + cy * 0.08
  if (stoneState === 'ready') { stoneState = 'flying'; btn.textContent = '⏳ Flying...' }
})

// ── Animation ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.getElapsedTime()

  waterMainMat.uniforms.uTime.value = t
  waterPlane.geometry.attributes.position.needsUpdate = true

  updateStone(dt)
  updateSplash(dt)
  updateRipples(dt)

  // Camera follows stone
  if (stoneState === 'flying' || stoneState === 'bouncing') {
    const targetCam = new THREE.Vector3(st_x * 0.3, 15 + st_y * 0.3, st_z * 0.3 + 55)
    camera.position.lerp(targetCam, 0.03)
    camera.lookAt(st_x * 0.5, 0, st_z * 0.5)
  }

  // Info
  const dist = Math.sqrt(st_x * st_x + st_z * st_z)
  ctx2d.clearRect(0, 0, 200, 100)
  ctx2d.fillStyle = '#224'
  ctx2d.fillText('Bounces: ' + bounceCount + ' / ' + MAX_BOUNCES, 10, 25)
  ctx2d.fillText('Dist: ' + dist.toFixed(1) + ' m', 10, 45)
  ctx2d.fillText('Height: ' + Math.max(0, st_y).toFixed(1) + ' m', 10, 65)
  ctx2d.fillText('Speed: ' + Math.sqrt(st_vx*st_vx+st_vy*st_vy+st_vz*st_vz).toFixed(1) + ' m/s', 10, 85)

  infoEl.innerHTML = `Skipping Stone Sim<br>Bounces: <b>${bounceCount}</b><br>Dist: <b>${dist.toFixed(1)}m</b><br>Height: <b>${Math.max(0,st_y).toFixed(1)}m</b><br>[click canvas to aim]`

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
