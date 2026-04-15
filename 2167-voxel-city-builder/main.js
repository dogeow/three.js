// ============================================================
// 2167. Voxel City Builder — Professional Edition
// ============================================================
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19.1/dist/lil-gui.esm.min.js'

// ── Scene ────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x060d1a)
scene.fog = new THREE.FogExp2(0x071525, 0.007)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1200)
camera.position.set(55, 90, 90)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.35, 0.82)
composer.addPass(bloomPass)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.04
controls.maxPolarAngle = Math.PI / 2.08
controls.autoRotate = true
controls.autoRotateSpeed = 0.4
controls.target.set(0, 8, 0)

// ── Params ────────────────────────────────────────────────────────
const P = { bloomStrength: 0.45, dayNight: 0.0, autoRotate: true }

// ── Lights ────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x1a2840, 0.5))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.2)
sun.position.set(60, 120, 60)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { near: 1, far: 500, left: -150, right: 150, top: 150, bottom: -150 })
scene.add(sun)

// City glow lights
const cityLights = []
const LCOLS = [0xff7722, 0x22aaff, 0xff4488, 0x44ffcc]
for (let i = 0; i < 20; i++) {
  const pl = new THREE.PointLight(LCOLS[i % 4], 1.5, 30)
  pl.position.set((Math.random() - 0.5) * 100, 2 + Math.random() * 12, (Math.random() - 0.5) * 100)
  pl.userData = { phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.5, base: 1.2 + Math.random() * 0.8 }
  scene.add(pl)
  cityLights.push(pl)
}

// ── Materials ─────────────────────────────────────────────────────
const glassMats = [], concreteMats = []
;[0x3a3f52, 0x4a5268, 0x2e3440, 0x515a6a].forEach(c => concreteMats.push(new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.25 })))
for (let i = 0; i < 5; i++) {
  glassMats.push(new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.55 + i * 0.04, 0.6, 0.55),
    roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.78,
    emissive: new THREE.Color(0x112233), emissiveIntensity: 0.4,
  }))
}
const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.9 })

// ── City Generation ────────────────────────────────────────────────
const buildings = [], GRID = 22, STEP = 2.4

for (let xi = -GRID; xi < GRID; xi++) {
  for (let zi = -GRID; zi < GRID; zi++) {
    if (Math.random() > 0.58) continue
    const wx = xi * STEP, wz = zi * STEP
    const dc = Math.sqrt(xi * xi + zi * zi)
    const h = Math.round(Math.max(1.5, (GRID * 0.55 - dc) * 0.5 + Math.random() * 8) * 0.5) * 2
    const useGlass = Math.random() > 0.78 && h > 5
    const mat = useGlass ? glassMats[Math.floor(Math.random() * glassMats.length)] : concreteMats[Math.floor(Math.random() * concreteMats.length)]
    const geo = new THREE.BoxGeometry(STEP * 0.82, h, STEP * 0.82)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(wx, h / 2, wz)
    mesh.castShadow = true; mesh.receiveShadow = true
    mesh.userData = { h, phase: Math.random() * Math.PI * 2, freq: 0.3 + Math.random() * 0.5, useGlass }
    scene.add(mesh); buildings.push(mesh)
    if (useGlass) {
      const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(STEP * 0.75, h * 0.9, STEP * 0.75))
      const el = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x4499ff, transparent: true, opacity: 0.3 }))
      el.position.set(wx, h / 2, wz); scene.add(el); mesh.userData.edge = el
    }
    if (Math.random() > 0.6 && h > 5) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(STEP * 0.5, 0.5 + Math.random(), STEP * 0.5), roofMat)
      r.position.set(wx, h + 0.3, wz); r.castShadow = true; scene.add(r)
    }
  }
}

// ── Ground ───────────────────────────────────────────────────────
const ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID * STEP * 3, GRID * STEP * 3), new THREE.MeshStandardMaterial({ color: 0x111520, roughness: 0.95 }))
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
scene.add(new THREE.GridHelper(GRID * STEP * 3, 40, 0x334466, 0x1a2233))

// ── Stars ────────────────────────────────────────────────────────
const sg = new THREE.BufferGeometry(), sp = new Float32Array(3000 * 3)
for (let i = 0; i < 3000; i++) {
  const r = 350 + Math.random() * 200, t = Math.random() * 6.28, p = Math.acos(2 * Math.random() - 1)
  sp[i*3] = r * Math.sin(p) * Math.cos(t); sp[i*3+1] = Math.abs(r * Math.cos(p)); sp[i*3+2] = r * Math.sin(p) * Math.sin(t)
}
sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true })))

// ── Mouse Hover ───────────────────────────────────────────────────
const ray = new THREE.Raycaster(), m2 = new THREE.Vector2()
let hovered = null
window.addEventListener('mousemove', e => { m2.x = e.clientX / innerWidth * 2 - 1; m2.y = -(e.clientY / innerHeight) * 2 + 1 })
window.addEventListener('click', () => {
  ray.setFromCamera(m2, camera)
  const h = ray.intersectObjects(buildings.filter(b => b.userData.useGlass))
  if (h.length > 0) { h[0].object.material.emissiveIntensity = 2.5; setTimeout(() => { h[0].object.material.emissiveIntensity = 0.4 }, 300) }
})

// ── GUI ───────────────────────────────────────────────────────────
const gui = new GUI()
gui.add(P, 'bloomStrength', 0, 1.5, 0.01).name('辉光').onChange(v => { bloomPass.strength = v })
gui.add(P, 'dayNight', 0, 1, 0.01).name('昼夜').onChange(v => {
  sun.intensity = v * 1.2; scene.fog.color.set(0x071525).lerp(new THREE.Color(0x1a3040), v)
})
gui.add(P, 'autoRotate').name('自动旋转').onChange(v => { controls.autoRotate = v })

// ── Resize ────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight)
})

// ── Animation ────────────────────────────────────────────────────
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  buildings.forEach(b => {
    b.scale.y = 1 + Math.sin(t * b.userData.freq + b.userData.phase) * 0.0012
    if (b.userData.edge) { b.userData.edge.scale.y = b.scale.y; b.userData.edge.material.opacity = 0.2 + Math.sin(t * 2 + b.userData.phase) * 0.1 }
  })
  cityLights.forEach(l => { l.intensity = l.userData.base + Math.sin(t * l.userData.speed + l.userData.phase) * 0.7 })
  ray.setFromCamera(m2, camera)
  const hits = ray.intersectObjects(buildings.filter(b => b.userData.useGlass))
  if (hovered) { hovered.material.emissiveIntensity = 0.4; hovered = null }
  if (hits.length > 0) { hovered = hits[0].object; hovered.material.emissiveIntensity = 0.9; document.body.style.cursor = 'pointer' }
  else document.body.style.cursor = 'default'
  controls.update(); composer.render()
}
animate()
