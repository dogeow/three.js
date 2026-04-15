// 2173. 粒子漩涡 — Enhanced Edition
// 粒子漩涡系统 + 引力场交互 + 多层旋臂
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000005)
scene.fog = new THREE.FogExp2(0x000005, 0.012)

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 30, 60)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxDistance = 200
controls.minDistance = 10

// ─── Particle Arm Class ─────────────────────────────────────────────────────
class VortexArm {
  constructor(count, color, speed, radius, spiralFactor, ySpread) {
    this.count = count
    this.speed = speed
    this.spiralFactor = spiralFactor
    this.ySpread = ySpread
    this.positions = new Float32Array(count * 3)
    this.colors = new Float32Array(count * 3)
    this.phases = new Float32Array(count)
    this.sizes = new Float32Array(count)

    const baseColor = new THREE.Color(color)

    for (let i = 0; i < count; i++) {
      this.phases[i] = Math.random() * Math.PI * 2
      const t = i / count
      const theta = t * Math.PI * 16 + this.phases[i]
      const r = t * radius
      this.positions[i * 3] = Math.cos(theta) * r
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * ySpread
      this.positions[i * 3 + 2] = Math.sin(theta) * r

      const variation = new THREE.Color(baseColor).offsetHSL(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.3
      )
      this.colors[i * 3] = variation.r
      this.colors[i * 3 + 1] = variation.g
      this.colors[i * 3 + 2] = variation.b
      this.sizes[i] = 0.05 + Math.random() * 0.25
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 1.0 } },
      vertexShader: `
        attribute float size;
        attribute color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uAlpha;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          vAlpha = uAlpha * (1.0 - length(position) / 60.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float a = (1.0 - d * 2.0);
          gl_FragColor = vec4(vColor * 1.5, a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    })

    this.points = new THREE.Points(geo, this.mat)
  }

  update(t) {
    const pos = this.points.geometry.attributes.position
    for (let i = 0; i < this.count; i++) {
      const t_norm = i / this.count
      const theta = t_norm * Math.PI * 16 + this.phases[i] + t * this.speed
      const r = t_norm * 55
      pos.array[i * 3] = Math.cos(theta) * r
      pos.array[i * 3 + 1] = Math.sin(t * 0.3 + this.phases[i]) * this.ySpread * 0.5
      pos.array[i * 3 + 2] = Math.sin(theta) * r
    }
    pos.needsUpdate = true
    this.mat.uniforms.uTime.value = t
  }
}

// Create 4 spiral arms
const arms = [
  new VortexArm(3000, 0x4488ff, 0.3, 55, 1.0, 8),
  new VortexArm(3000, 0xff4488, 0.25, 55, 1.0, 8),
  new VortexArm(3000, 0x44ff88, 0.35, 55, 1.0, 8),
  new VortexArm(3000, 0xffcc44, 0.28, 55, 1.0, 8),
]
arms.forEach(a => scene.add(a.points))

// ─── Central Core ────────────────────────────────────────────────────────────
const coreGeo = new THREE.SphereGeometry(2, 32, 32)
const coreMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPos;
    uniform float uTime;
    void main() {
      vNormal = normal;
      vPos = position;
      vec3 pos = position + normal * sin(uTime * 3.0 + position.x * 5.0) * 0.1;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPos;
    uniform float uTime;
    void main() {
      float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0,0,1))), 3.0);
      vec3 col = mix(vec3(0.0, 0.1, 0.8), vec3(0.1, 0.5, 1.0), fresnel);
      col += vec3(1.0, 0.8, 0.4) * (0.5 + 0.5 * sin(uTime * 4.0));
      gl_FragColor = vec4(col, 0.9);
    }
  `,
  transparent: true
})
const core = new THREE.Mesh(coreGeo, coreMat)
scene.add(core)

// Core glow ring
const glowRingGeo = new THREE.TorusGeometry(3, 0.5, 8, 64)
const glowRingMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.4 })
const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat)
glowRing.rotation.x = Math.PI / 2
scene.add(glowRing)

// ─── Mouse Gravity Interaction ───────────────────────────────────────────────
const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const mouseWorld = new THREE.Vector3()
let gravityActive = false

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
})

window.addEventListener('mousedown', () => { gravityActive = true })
window.addEventListener('mouseup', () => { gravityActive = false })

// ─── Ambient Dust Particles ───────────────────────────────────────────────────
const dustCount = 2000
const dustPos = new Float32Array(dustCount * 3)
for (let i = 0; i < dustCount; i++) {
  const theta = Math.random() * Math.PI * 2
  const r = 30 + Math.random() * 50
  dustPos[i * 3] = Math.cos(theta) * r
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 20
  dustPos[i * 3 + 2] = Math.sin(theta) * r
}
const dustGeo = new THREE.BufferGeometry()
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0x334455, size: 0.15, transparent: true, opacity: 0.3, sizeAttenuation: true
}))
scene.add(dust)

// ─── Lights ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x111122, 1.0))
const coreLight = new THREE.PointLight(0x4488ff, 5, 30)
scene.add(coreLight)

// ─── Animation ──────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // Update arms
  arms.forEach((arm, i) => {
    arm.update(t)
    arm.mat.uniforms.uAlpha.value = 0.6 + Math.sin(t * 0.5 + i) * 0.2
  })

  // Core animation
  core.rotation.y = t * 0.4
  core.rotation.x = t * 0.2
  coreMat.uniforms.uTime.value = t

  // Glow ring
  glowRing.rotation.z = t * 0.5
  glowRing.scale.setScalar(1 + Math.sin(t * 2) * 0.1)
  glowRingMat.opacity = 0.3 + Math.sin(t * 3) * 0.15

  // Core light pulse
  coreLight.intensity = 4 + Math.sin(t * 4) * 2

  // Dust slow rotation
  dust.rotation.y = t * 0.02

  // Camera subtle drift
  camera.position.y = 30 + Math.sin(t * 0.1) * 5

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})