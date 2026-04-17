// 4257. Acoustic Hologram 3d Sound Field
// 声全息3D：超声波场干涉图样与全息重建
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 30, 70)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const sun = new THREE.DirectionalLight(0xffffff, 0.6)
sun.position.set(20, 40, 20)
scene.add(sun)

// 参数
const NX = 30, NY = 20
const spacing = 2.5 // 换能器间距
const wavelength = 4.0
const k = (2 * Math.PI) / wavelength

// 声源阵列：点源网格
const sources = []
for (let j = 0; j < NY; j++) {
  for (let i = 0; i < NX; i++) {
    const x = (i - NX / 2) * spacing
    const y = (j - NY / 2) * spacing
    const phase = (i / NX) * Math.PI * 2 // 线性相位扫描
    sources.push({ x, y, z: 0, phase })
  }
}

// 采样平面：在z=30处测量声压
const SZ = 40, SY = 30
const pressureData = new Float32Array(SZ * SY)
const planeGeo = new THREE.PlaneGeometry(SZ * spacing * 0.8, SY * spacing * 0.8, SZ - 1, SY - 1)
const planeMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; varying float vP;
    attribute float pressure;
    void main() {
      vUv = uv;
      vP = pressure;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `varying vec2 vUv; varying float vP; uniform float uTime;
    void main() {
      float p = vP;
      float intensity = clamp(p * 2.0, 0.0, 1.0);
      vec3 cold = vec3(0.0, 0.1, 0.4);
      vec3 warm = vec3(0.8, 0.4, 0.0);
      vec3 hot = vec3(1.0, 0.8, 0.0);
      vec3 col = p < 0.5 ? mix(cold, warm, p * 2.0) : mix(warm, hot, (p - 0.5) * 2.0);
      col *= intensity;
      gl_FragColor = vec4(col, 0.85);
    }`,
  transparent: true,
  side: THREE.DoubleSide
})

const posArr = planeGeo.attributes.position
const presArr = new Float32Array(posArr.count)
planeGeo.setAttribute('pressure', new THREE.BufferAttribute(presArr, 1))
const plane = new THREE.Mesh(planeGeo, planeMat)
plane.position.set(0, 0, 30)
plane.rotation.x = 0
scene.add(plane)

// 计算声压场
function computePressure(t) {
  const pArr = planeGeo.attributes.position.array
  const pres = planeGeo.attributes.pressure.array

  for (let j = 0; j < SY; j++) {
    for (let i = 0; i < SZ; i++) {
      const idx = j * SZ + i
      const px = (i / (SZ - 1) - 0.5) * SZ * spacing * 0.8
      const py = (j / (SY - 1) - 0.5) * SY * spacing * 0.8

      let pressure = 0
      for (const src of sources) {
        const dx = px - src.x, dy = py - src.y, dz = 30 - src.z
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz)
        pressure += Math.cos(k * r - t * 3.0 + src.phase) / (r + 0.1) * 15
      }
      pressureData[idx] = pressure

      // 映射到平面顶点
      const vi = j * SZ + i
      pres[vi] = (pressure + 15) / 30
    }
  }
  planeGeo.attributes.pressure.needsUpdate = true
}

// 声源可视化
for (const src of sources) {
  const geo = new THREE.SphereGeometry(0.3, 8, 8)
  const mat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(src.x, src.y, src.z)
  scene.add(mesh)
}

const clock = new THREE.Clock()
let frameCount = 0

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  frameCount++
  if (frameCount % 2 === 0) computePressure(t)

  planeMat.uniforms.uTime.value = t
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
