// 3214 - Rayleigh-Plateau Jet Instability
// Surface tension causes a liquid jet to break into droplets
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000510)
scene.add(new THREE.AmbientLight(0x223366, 0.5))
const dir = new THREE.DirectionalLight(0x4499ff, 1.0)
dir.position.set(0, 10, 0)
scene.add(dir)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 0, 20)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false

const params = { jetRadius: 0.8, wavelength: 2.2, amplitude: 0.25, velocity: 2.5 }

const N = 400
const W = 14, H = 28
const pos = new Float32Array(N * 3)
const col = new Float32Array(N * 3)
const pdata = []

for (let i = 0; i < N; i++) {
  const theta = Math.random() * Math.PI * 2
  const r = Math.random() * params.jetRadius
  const x = Math.cos(theta) * r
  const z = Math.sin(theta) * r
  const y = Math.random() * H - H / 2
  pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z
  pdata.push({ vx: 0, vy: -params.velocity, vz: 0, initR: r, phase: Math.random() * Math.PI * 2 })
  col[i * 3] = 0.2; col[i * 3 + 1] = 0.6; col[i * 3 + 2] = 1.0
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
const mat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.9 })
scene.add(new THREE.Points(geo, mat))

// Nozzle
const nozzle = new THREE.Mesh(
  new THREE.TorusGeometry(params.jetRadius * 1.5, 0.12, 12, 32),
  new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8, roughness: 0.2 })
)
nozzle.rotation.x = Math.PI / 2
nozzle.position.y = H / 2 + 0.5
scene.add(nozzle)

// Pool
const pool = new THREE.Mesh(
  new THREE.CylinderGeometry(3, 3, 0.3, 32),
  new THREE.MeshStandardMaterial({ color: 0x112244, metalness: 0.3 })
)
pool.position.y = -H / 2 - 0.2
scene.add(pool)

const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:16px;left:16px;color:#4499ff;font-family:monospace;font-size:13px;background:rgba(0,5,16,0.85);padding:12px;border-radius:8px;line-height:1.8'
info.innerHTML = '<b>Rayleigh-Plateau Jet</b><br>Liquid jet breaks into drops<br>Surface tension instability<br>Drag to orbit'
document.body.appendChild(info)

let time = 0
function animate() {
  requestAnimationFrame(animate)
  time += 0.016
  const k = (2 * Math.PI) / params.wavelength

  for (let i = 0; i < N; i++) {
    let px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2]
    const pd = pdata[i]

    // Move down
    py += pd.vy * 0.05
    pd.vy -= 0.001 // slight gravity

    // Rayleigh-Plateau perturbation on radius
    const r0 = Math.sqrt(px * px + pz * pz)
    if (py > -H / 2 + 2) {
      // Perturbation grows exponentially with distance from nozzle
      const dist = (py + H / 2)
      const amp = params.amplitude * Math.exp(dist * 0.08) * Math.sin(k * dist + pd.phase)
      const targetR = params.jetRadius + amp
      if (r0 > targetR) {
        const sc = targetR / r0
        px *= sc; pz *= sc
      }
    }

    // Reset particle when it falls below pool
    if (py < -H / 2) {
      const theta = Math.random() * Math.PI * 2
      const r = Math.random() * params.jetRadius
      px = Math.cos(theta) * r
      pz = Math.sin(theta) * r
      py = H / 2
      pd.vy = -params.velocity
      pd.phase = Math.random() * Math.PI * 2
    }

    pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz

    // Color by height
    const t = (py + H / 2) / H
    col[i * 3] = 0.1 + t * 0.3
    col[i * 3 + 1] = 0.5 + t * 0.3
    col[i * 3 + 2] = 1.0
  }

  geo.attributes.position.needsUpdate = true
  geo.attributes.color.needsUpdate = true
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
