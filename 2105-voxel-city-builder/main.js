// 2105. Voxel City Builder — Enhanced (100-150 lines)
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// — Scene Setup —
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x060c18)
scene.fog = new THREE.FogExp2(0x060c18, 0.008)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(50, 65, 50)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.3, 0.8))

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// — Materials —
const buildingMats = [
  new THREE.MeshStandardMaterial({ color: 0x1a3a6c, metalness: 0.8, roughness: 0.3 }),
  new THREE.MeshStandardMaterial({ color: 0x2d5a87, metalness: 0.6, roughness: 0.4 }),
  new THREE.MeshStandardMaterial({ color: 0x112244, metalness: 0.9, roughness: 0.2 }),
  new THREE.MeshStandardMaterial({ color: 0x3a2a5c, metalness: 0.5, roughness: 0.4 }),
]
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x88ccff, emissive: 0x224488, emissiveIntensity: 0.4,
  transparent: true, opacity: 0.75, metalness: 0.9, roughness: 0.05
})
const lampMat = new THREE.MeshBasicMaterial({ color: 0xff2200 })

// — Ground & Grid —
scene.add(new THREE.AmbientLight(0x111133, 0.7))
const moon = new THREE.DirectionalLight(0x4466bb, 0.9)
moon.position.set(-40, 80, -40)
moon.castShadow = true
moon.shadow.mapSize.set(2048, 2048)
moon.shadow.camera.left = moon.shadow.camera.bottom = -80
moon.shadow.camera.right = moon.shadow.camera.top = 80
scene.add(moon)
scene.add(new THREE.PointLight(0x002244, 1.2, 120).add(new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: 0x002244 }))))

const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 1 }))
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true
scene.add(ground)
scene.add(new THREE.GridHelper(160, 40, 0x112244, 0x080e1a))

// — Stars —
const sGeo = new THREE.BufferGeometry()
const sp = []
for (let i = 0; i < 2000; i++) {
  const t2 = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1), r = 700 + Math.random() * 200
  sp.push(r * Math.sin(p) * Math.cos(t2), r * Math.sin(p) * Math.sin(t2), r * Math.cos(p))
}
sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2 })))

// — City Generation —
const city = new THREE.Group(); scene.add(city)
const occupied = new Set()
const buildings = []

function build(cx, cz, anim = true) {
  const k = `${Math.round(cx / 3)},${Math.round(cz / 3)}`
  if (occupied.has(k)) return; occupied.add(k)
  const h = 2 + Math.random() * 10, w = 2, d = 2
  const g = new THREE.Group(); g.position.set(cx, 0, cz)
  const mat = buildingMats[Math.floor(Math.random() * buildingMats.length)]
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true
  g.add(body)
  // windows
  for (let i = 0; i < Math.floor(h / 2); i++) {
    for (let s = 0; s < 4; s++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.55),
        glassMat.clone())
      const side = [[w / 2 + 0.01, 0, (s - 1) * (d / 3)], [-w / 2 - 0.01, 0, (s - 1) * (d / 3)],
        [0, 0, d / 2 + 0.01], [0, 0, -d / 2 - 0.01]][s]
      win.position.set(side[0], i * 2 + 1.2, side[2])
      win.rotation.y = s < 2 ? (s === 0 ? Math.PI / 2 : -Math.PI / 2) : (s === 2 ? Math.PI : 0)
      win.userData.base = 0.2 + Math.random() * 0.5
      g.add(win)
    }
  }
  // rooftop blink
  if (Math.random() > 0.5) {
    const bl = new THREE.PointLight(0xff2200, 2, 10); bl.position.y = h + 1.5
    g.add(bl); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.15), lampMat))
  }
  g.scale.set(anim ? 0.001 : 1, anim ? 0.001 : 1, anim ? 0.001 : 1)
  g.userData = { k, h, grow: anim, scale: anim ? 0.001 : 1 }
  city.add(g); buildings.push(g)
}

for (let x = -18; x < 18; x++) for (let z = -18; z < 18; z++)
  if (Math.random() > 0.4) build(x * 3, z * 3, false)

// — Raycasting / Interaction —
const ray = new THREE.Raycaster(), m = new THREE.Vector2()
const highlight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 2.2),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.12, side: THREE.BackSide }))
highlight.visible = false; scene.add(highlight)

window.addEventListener('mousemove', e => {
  m.x = (e.clientX / innerWidth) * 2 - 1; m.y = -(e.clientY / innerHeight) * 2 + 1
})
window.addEventListener('click', () => {
  ray.setFromCamera(m, camera)
  const hits = ray.intersectObjects(city.children.map(g => g.children[0]))
  if (hits.length > 0) { const b = hits[0].object.parent; occupied.delete(b.userData.k); explode(b.position, b.userData.h) }
  else { const pt = new THREE.Vector3(); ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pt); build(Math.round(pt.x / 3) * 3, Math.round(pt.z / 3) * 3) }
})

function explode(pos, h) {
  for (let i = 0; i < 20; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xff6600 }))
    p.position.copy(pos); p.position.y = h / 2
    p.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.5, (Math.random() - 0.5) * 0.4)
    p.userData.life = 1; p.name = 'fx'; scene.add(p)
  }
  buildings.splice(buildings.findIndex(b => b.position.equals(pos)), 1)
  city.remove(city.children.find(g => g.position.equals(pos)))
}

// — Animation Loop —
const clk = new THREE.Clock(); let t = 0
function anim() {
  requestAnimationFrame(anim)
  const dt = clk.getDelta(); t += dt
  controls.update()

  buildings.forEach(b => {
    // grow-in
    if (b.userData.grow && b.userData.scale < 1) {
      b.userData.scale = Math.min(1, b.userData.scale + dt * 2.5)
      b.scale.setScalar(b.userData.scale)
    }
    // window flicker
    b.children.forEach(c => { if (c.material?.emissiveIntensity !== undefined && c.userData.base) c.material.emissiveIntensity = c.userData.base * (0.7 + Math.sin(t * 6 + c.position.x * 8) * 0.3) })
    // blink lights
    const bl = b.children.find(c => c.isPointLight)
    if (bl) bl.intensity = 1 + Math.sin(t * 3 + b.position.x) * 1.5
  })

  // particles
  scene.children.filter(o => o.name === 'fx').forEach(p => {
    p.position.add(p.userData.v); p.userData.v.y -= 0.015; p.userData.life -= dt * 1.5; p.scale.setScalar(Math.max(0, p.userData.life))
    if (p.userData.life <= 0) scene.remove(p)
  })

  // hover highlight
  ray.setFromCamera(m, camera)
  const hits = ray.intersectObjects(city.children.map(g => g.children[0]))
  if (hits.length > 0) {
    const b = hits[0].object.parent; highlight.position.copy(b.position); highlight.position.y = b.userData.h / 2; highlight.visible = true
  } else { highlight.visible = false }

  composer.render()
}
anim()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight)
})
