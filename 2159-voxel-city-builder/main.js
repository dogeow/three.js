// ============================================================
// 2159. 体素城市构建器 — Enhanced Edition
// ============================================================
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19.1/dist/lil-gui.esm.min.js'

// ─── Scene ───────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x060d1a)
scene.fog = new THREE.FogExp2(0x071525, 0.007)

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200)
camera.position.set(55, 90, 90)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.35, 0.82)
composer.addPass(bloomPass)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.04
controls.maxPolarAngle = Math.PI / 2.08
controls.minDistance = 15
controls.maxDistance = 280
controls.autoRotate = true
controls.autoRotateSpeed = 0.4
controls.target.set(0, 8, 0)

// ─── Parameters ───────────────────────────────────────────────────
const P = {
  bloomStrength: 0.45,
  waveSpeed: 1.0,
  autoRotate: true,
  dayNight: 0.0,
}

// ─── Lighting ────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x1a2840, 0.5)
scene.add(ambient)

const sun = new THREE.DirectionalLight(0xfff4e0, 1.2)
sun.position.set(60, 120, 60)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 500;
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -150;
scene.add(sun)

const moon = new THREE.DirectionalLight(0x4466aa, 0.3)
moon.position.set(-60, 100, -60)
scene.add(moon)

const fillLight = new THREE.PointLight(0x4488ff, 1.0, 150)
fillLight.position.set(-40, 30, -40)
scene.add(fillLight)

// 城市光效
const cityLights = []
const LIGHT_COLORS = [0xff6622, 0x22aaff, 0xff4488, 0x44ffcc, 0xffcc22]
for (let i = 0; i < 25; i++) {
  const col = LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)]
  const pl = new THREE.PointLight(col, 1.5, 30)
  const x = (Math.random() - 0.5) * 100
  const z = (Math.random() - 0.5) * 100
  pl.position.set(x, 2 + Math.random() * 14, z)
  pl.userData = { phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.5, base: 1.2 + Math.random() * 0.8 }
  scene.add(pl)
  cityLights.push(pl)

  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: col }))
  glow.position.copy(pl.position)
  scene.add(glow)
  pl.userData.glow = glow
}

// ─── Materials ────────────────────────────────────────────────────
const CONCRETES = [0x3a3f52, 0x4a5268, 0x2e3440, 0x515a6a]
const glassMats = []
const concreteMats = []

CONCRETES.forEach(c => concreteMats.push(new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.25 })))
for (let i = 0; i < 5; i++) {
  glassMats.push(new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.55 + i * 0.04, 0.6, 0.55),
    roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.78,
    emissive: new THREE.Color(0x112233), emissiveIntensity: 0.4,
  }))
}

const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.9 })
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111520, roughness: 0.95, metalness: 0.1 })

// ─── City Generation ───────────────────────────────────────────────
const buildings = []
const GRID = 22, STEP = 2.4

for (let xi = -GRID; xi < GRID; xi++) {
  for (let zi = -GRID; zi < GRID; zi++) {
    if (Math.random() > 0.58) continue

    const wx = xi * STEP, wz = zi * STEP
    const dc = Math.sqrt(xi * xi + zi * zi)
    const baseH = Math.max(1.5, (GRID * 0.55 - dc) * 0.5 + Math.random() * 8)
    const h = Math.round(baseH * 0.5) * 2

    const useGlass = Math.random() > 0.78 && h > 5
    const mat = useGlass
      ? glassMats[Math.floor(Math.random() * glassMats.length)]
      : concreteMats[Math.floor(Math.random() * concreteMats.length)]

    const geo = new THREE.BoxGeometry(STEP * 0.82, h, STEP * 0.82)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(wx, h / 2, wz)
    mesh.castShadow = true
    mesh.receiveShadow = true

    const phase = Math.random() * Math.PI * 2
    const freq = 0.3 + Math.random() * 0.5
    mesh.userData = { h, phase, freq, useGlass }

    if (useGlass) {
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(STEP * 0.75, h * 0.9, STEP * 0.75))
      const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x4499ff, transparent: true, opacity: 0.3 }))
      edgeLine.position.copy(mesh.position)
      scene.add(edgeLine)
      mesh.userData.edge = edgeLine
    }

    scene.add(mesh)
    buildings.push(mesh)

    // Roof detail
    if (Math.random() > 0.6 && h > 5) {
      const rGeo = new THREE.BoxGeometry(STEP * 0.5, 0.5 + Math.random(), STEP * 0.5)
      const roof = new THREE.Mesh(rGeo, roofMat)
      roof.position.set(wx, h + 0.3, wz)
      roof.castShadow = true
      scene.add(roof)

      if (Math.random() > 0.5) {
        const ant = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 5), new THREE.MeshBasicMaterial({ color: 0xff3344 }))
        ant.position.set(wx + (Math.random() - 0.5) * STEP * 0.3, h + 1.0, wz)
        scene.add(ant)
      }
    }
  }
}

// ─── Ground ──────────────────────────────────────────────────────
const ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID * STEP * 3, GRID * STEP * 3), groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const grid = new THREE.GridHelper(GRID * STEP * 3, 40, 0x334466, 0x1a2233)
grid.position.y = 0.01
scene.add(grid)

// ─── Stars ──────────────────────────────────────────────────────
const starGeo = new THREE.BufferGeometry()
const sCount = 3000
const sPos = new Float32Array(sCount * 3)
for (let i = 0; i < sCount; i++) {
  const r = 350 + Math.random() * 200, t = Math.random() * Math.PI * 2
  const p = Math.acos(2 * Math.random() - 1)
  sPos[i*3]   = r * Math.sin(p) * Math.cos(t)
  sPos[i*3+1] = Math.abs(r * Math.cos(p))
  sPos[i*3+2] = r * Math.sin(p) * Math.sin(t)
}
starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.8 })))

// ─── Dust Particles ──────────────────────────────────────────────
const DUST = 300
const dustGeo = new THREE.BufferGeometry()
const dustPos = new Float32Array(DUST * 3)
const dustVel = []
for (let i = 0; i < DUST; i++) {
  dustPos[i*3]   = (Math.random() - 0.5) * 120
  dustPos[i*3+1] = Math.random() * 35 + 2
  dustPos[i*3+2] = (Math.random() - 0.5) * 120
  dustVel.push({ x: (Math.random() - 0.5) * 0.04, y: 0.015 + Math.random() * 0.02, z: (Math.random() - 0.5) * 0.04 })
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
const dustParticles = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xff8844, size: 0.25, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }))
scene.add(dustParticles)

// ─── Mouse Hover ─────────────────────────────────────────────────
const raycaster = new THREE.Raycaster()
const mouse2 = new THREE.Vector2()
let hovered = null

window.addEventListener('mousemove', e => {
  mouse2.x = e.clientX / window.innerWidth * 2 - 1
  mouse2.y = -(e.clientY / window.innerHeight) * 2 + 1
})

window.addEventListener('click', () => {
  raycaster.setFromCamera(mouse2, camera)
  const hits = raycaster.intersectObjects(buildings.filter(b => b.userData.useGlass))
  if (hits.length > 0) {
    const b = hits[0].object
    b.material.emissiveIntensity = 2.5
    setTimeout(() => { b.material.emissiveIntensity = b.userData.useGlass ? 0.4 : 0 }, 300)
  }
})

// ─── GUI ────────────────────────────────────────────────────────
const gui = new GUI()
gui.add(P, 'bloomStrength', 0, 1.5, 0.01).name('辉光强度').onChange(v => { bloomPass.strength = v })
gui.add(P, 'dayNight', 0, 1, 0.01).name('昼夜').onChange(v => {
  ambient.intensity = 0.2 + v * 0.6
  sun.intensity = v * 1.2
  moon.intensity = (1 - v) * 0.3
})
gui.add(P, 'autoRotate').name('自动旋转').onChange(v => { controls.autoRotate = v })

// ─── Resize ──────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// ─── Animation Loop ───────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // Building breathing + edge glow
  buildings.forEach(b => {
    const pulse = 1 + Math.sin(t * b.userData.freq + b.userData.phase) * 0.0012
    b.scale.y = pulse
    if (b.userData.edge) {
      b.userData.edge.scale.y = pulse
      b.userData.edge.material.opacity = 0.2 + Math.sin(t * 2 + b.userData.phase) * 0.1
    }
  })

  // City light flicker
  cityLights.forEach(l => {
    l.intensity = l.userData.base + Math.sin(t * l.userData.speed + l.userData.phase) * 0.7
    if (l.userData.glow) {
      l.userData.glow.material.color.set(
        l.color.clone().lerp(new THREE.Color(0xffffff), Math.sin(t * l.userData.speed * 2 + l.userData.phase) * 0.5 + 0.5).getHex()
      )
    }
  })

  // Dust rising
  const dp = dustGeo.attributes.position.array
  for (let i = 0; i < DUST; i++) {
    dp[i*3]   += dustVel[i].x
    dp[i*3+1] += dustVel[i].y
    dp[i*3+2] += dustVel[i].z
    if (dp[i*3+1] > 40) {
      dp[i*3]   = (Math.random() - 0.5) * 120
      dp[i*3+1] = 2
      dp[i*3+2] = (Math.random() - 0.5) * 120
    }
  }
  dustGeo.attributes.position.needsUpdate = true

  // Hover highlight
  raycaster.setFromCamera(mouse2, camera)
  const hits = raycaster.intersectObjects(buildings.filter(b => b.userData.useGlass))

  if (hovered && hovered.userData.useGlass) {
    hovered.material.emissiveIntensity = hovered.userData.phase ? 0.4 : 0
    hovered = null
  }
  if (hits.length > 0) {
    hovered = hits[0].object
    hovered.material.emissiveIntensity = 0.9
    document.body.style.cursor = 'pointer'
  } else {
    document.body.style.cursor = 'default'
  }

  fillLight.intensity = 0.7 + Math.sin(t * 0.7) * 0.25

  controls.update()
  composer.render()
}

animate()
