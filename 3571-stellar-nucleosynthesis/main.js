// 3571. Stellar Nucleosynthesis - Nuclear fusion in stars
// type: physics-particles
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000008)
scene.fog = new THREE.FogExp2(0x000008, 0.003)

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000)
camera.position.set(0, 40, 80)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.5, 0.4, 0.85)
composer.addPass(bloom)

// Core star
const coreGeo = new THREE.SphereGeometry(8, 64, 64)
const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
const core = new THREE.Mesh(coreGeo, coreMat)
scene.add(core)

// Core glow
const glowGeo = new THREE.SphereGeometry(10, 32, 32)
const glowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 })
const glow = new THREE.Mesh(glowGeo, glowMat)
scene.add(glow)

// Element colors: H=blue, He=cyan, C=green, O=red, Fe=white
const elementColors = { H: 0x4488ff, He: 0x44ffff, C: 0x44ff44, O: 0xff4444, Fe: 0xffffff }
const elementMasses = { H: 1, He: 4, C: 12, O: 16, Fe: 56 }

class FusionParticle {
  constructor(type, position, velocity) {
    this.type = type
    this.mass = elementMasses[type]
    const geo = new THREE.SphereGeometry(0.5 + this.mass * 0.05, 8, 8)
    const mat = new THREE.MeshBasicMaterial({ color: elementColors[type] })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.copy(position)
    this.velocity = velocity.clone()
    this.energy = 0
    scene.add(this.mesh)
  }
  update(dt) {
    // Gravitational pull toward core
    const toCore = core.position.clone().sub(this.mesh.position)
    const dist = toCore.length()
    if (dist < 12) {
      this.energy += dt * (50 / dist)
      if (this.energy > 20 && Math.random() < 0.01) this.fuse()
    }
    toCore.normalize().multiplyScalar(50 * dt / Math.max(dist * 0.5, 1))
    this.velocity.add(toCore)
    this.velocity.multiplyScalar(0.99)
    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt))
    // Energy glow
    this.mesh.material.color.setHSL(0.1 - this.energy * 0.005, 1, 0.5 + Math.min(this.energy * 0.02, 0.4))
  }
  fuse() {
    this.energy = 0
    const types = ['H', 'He', 'C', 'O', 'Fe']
    const idx = types.indexOf(this.type)
    if (idx < types.length - 1) {
      this.type = types[idx + 1]
      this.mass = elementMasses[this.type]
      this.mesh.material.color.set(elementColors[this.type])
      this.mesh.scale.setScalar(0.5 + this.mass * 0.05)
    }
  }
  dispose() {
    scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}

const particles = []
const N = 300
for (let i = 0; i < N; i++) {
  const type = i < N * 0.7 ? 'H' : i < N * 0.9 ? 'He' : 'C'
  const pos = new THREE.Vector3((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200)
  const vel = new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)
  particles.push(new FusionParticle(type, pos, vel))
}

// Legend
const legendData = [
  { label: 'H - Hydrogen', color: 0x4488ff },
  { label: 'He - Helium', color: 0x44ffff },
  { label: 'C - Carbon', color: 0x44ff44 },
  { label: 'O - Oxygen', color: 0xff4444 },
  { label: 'Fe - Iron', color: 0xffffff },
]
const div = document.createElement('div')
div.style.cssText = 'position:fixed;top:16px;left:16px;color:#fff;font:12px monospace;background:rgba(0,0,0,0.7);padding:12px;border-radius:8px;line-height:1.8'
legendData.forEach(({ label, color }) => {
  const el = document.createElement('div')
  el.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:#${color.toString(16).padStart(6,'0')};border-radius:50%;margin-right:8px"></span>${label}`
  div.appendChild(el)
})
document.body.appendChild(div)

let last = performance.now()
function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  particles.forEach(p => p.update(dt))
  glow.scale.setScalar(1 + Math.sin(now * 0.003) * 0.1)
  controls.update()
  composer.render()
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
