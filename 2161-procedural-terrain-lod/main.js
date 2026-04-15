// 2161. Procedural Terrain LOD — Enhanced Edition
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Water } from 'three/addons/objects/Water.js'
import { Sky } from 'three/addons/objects/Sky.js'

// ── Scene ───────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1628)
scene.fog = new THREE.FogExp2(0x0a1628, 0.006)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000)
camera.position.set(0, 40, 90)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.5
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.04
controls.maxPolarAngle = Math.PI / 2.1
controls.minDistance = 20
controls.maxDistance = 200

// ── Sky ─────────────────────────────────────────────────────────
const sky = new Sky()
sky.scale.setScalar(10000)
scene.add(sky)
const su = sky.material.uniforms
su.turbidity.value = 8; su.rayleigh.value = 2
su.mieCoefficient.value = 0.005; su.mieDirectionalG.value = 0.8
const sunVec = new THREE.Vector3()
const phi = THREE.MathUtils.degToRad(80), theta = THREE.MathUtils.degToRad(210)
sunVec.setFromSphericalCoords(1, phi, theta)
su.sunPosition.value.copy(sunVec)

// ── Lights ──────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 0.6))
const sunLight = new THREE.DirectionalLight(0xffddaa, 2.5)
sunLight.position.copy(sunVec).multiplyScalar(500)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.left = -120; sunLight.shadow.camera.right = 120
sunLight.shadow.camera.top = 120; sunLight.shadow.camera.bottom = -120
sunLight.shadow.bias = -0.0005
scene.add(sunLight)
scene.add(new THREE.HemisphereLight(0x4488bb, 0x223311, 0.5))

// ── Terrain ─────────────────────────────────────────────────────
function fbm(x, z, oct = 5) {
  let val = 0, amp = 1, freq = 1, max = 0
  for (let o = 0; o < oct; o++) {
    const nx = x * freq, nz = z * freq
    val += (Math.sin(nx * 0.8 + nz * 0.6) * Math.cos(nz * 0.7 - nx * 0.4) +
            Math.sin(nx * 1.3) * Math.cos(nz * 1.1)) * amp * 0.5
    max += amp; amp *= 0.45; freq *= 2.1
  }
  return val / max
}

const terrainMeshes = []
const LOD = [
  { seg: 128, y: 0.00, col: 0x1a3d2a, rough: 0.9,  metal: 0.0 },
  { seg: 64,  y: 0.05, col: 0x1e5033, rough: 0.85, metal: 0.05 },
  { seg: 32,  y: 0.10, col: 0x226638, rough: 0.8,  metal: 0.05 },
  { seg: 16,  y: 0.15, col: 0x2a7a40, rough: 0.75, metal: 0.08 },
]
LOD.forEach(({ seg, y, col, rough, metal }) => {
  const geo = new THREE.PlaneGeometry(120, 120, seg, seg)
  const pos = geo.attributes.position
  for (let j = 0; j < pos.count; j++) {
    const px = pos.getX(j), py = pos.getY(j)
    const h = fbm(px * 0.04, py * 0.04) * 18 + fbm(px * 0.12, py * 0.12) * 4
    pos.setZ(j, h)
  }
  geo.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal, flatShading: false })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = y
  mesh.receiveShadow = true; mesh.castShadow = true
  scene.add(mesh); terrainMeshes.push(mesh)
})

// ── Water ────────────────────────────────────────────────────────
const waterGeo = new THREE.PlaneGeometry(400, 400)
const water = new Water(waterGeo, {
  textureWidth: 512, textureHeight: 512,
  waterNormals: new THREE.TextureLoader().load(
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg',
    t => { t.wrapS = t.wrapT = THREE.RepeatWrapping }),
  sunDirection: sunVec.clone().normalize(),
  sunColor: 0xffffcc, waterColor: 0x001133, distortionScale: 2, fog: false,
})
water.rotation.x = -Math.PI / 2; water.position.y = -0.5
scene.add(water)

// ── Stars ───────────────────────────────────────────────────────
const sPos = new Float32Array(3000 * 3)
for (let i = 0; i < sPos.length; i++) sPos[i] = (Math.random() - 0.5) * 3000
const starGeo = new THREE.BufferGeometry()
starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 })))

// ── Mouse / Raycaster ───────────────────────────────────────────
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2(-10, -10)
const marker = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff4400 }))
marker.visible = false; scene.add(marker)
const ripples = []

window.addEventListener('mousemove', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
})
window.addEventListener('click', e => {
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(terrainMeshes)
  if (hits.length > 0) {
    const p = hits[0].point
    marker.position.set(p.x, 0.3, p.y); marker.visible = true
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 1, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    )
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.2, p.y); ring.userData.age = 0
    scene.add(ring); ripples.push(ring)
    if (ripples.length > 12) { scene.remove(ripples.shift()) }
  }
})

// ── Animation Loop ───────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  controls.update()
  water.material.uniforms.time.value = t * 0.4

  // Animate sun orbit
  const angle = t * 0.05
  const dynSun = new THREE.Vector3(Math.cos(angle) * 500, Math.sin(angle * 0.3 + 1) * 300 + 200, Math.sin(angle) * 500)
  sunLight.position.copy(dynSun)
  su.sunPosition.value.copy(dynSun).normalize()

  // Hover marker
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(terrainMeshes)
  if (hits.length > 0) {
    const p = hits[0].point; marker.position.set(p.x, 0.3, p.y); marker.visible = true
    renderer.domElement.style.cursor = 'crosshair'
  } else {
    renderer.domElement.style.cursor = 'default'
  }

  // Ripple animation
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]; r.userData.age += 0.025
    const s = 1 + r.userData.age * 4
    r.scale.set(s, s, s); r.material.opacity = Math.max(0, 0.8 - r.userData.age * 1.5)
    if (r.material.opacity <= 0) { scene.remove(r); ripples.splice(i, 1) }
  }

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
