// 2168. Fluid Shader Water — Enhanced Edition
// 着色器实现的流体水面 + 鼠标交互 + 焦散效果
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Water } from 'three/addons/objects/Water.js'
import { Sky } from 'three/addons/objects/Sky.js'

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.85
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x001122)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 20000)
camera.position.set(0, 30, 60)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 10, 0)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2 - 0.05

// ─── Sky ────────────────────────────────────────────────────────────────────
const sky = new Sky()
sky.scale.setScalar(10000)
scene.add(sky)

const sun = new THREE.Vector3()
const phi = THREE.MathUtils.degToRad(75)
const theta = THREE.MathUtils.degToRad(180)
sun.setFromSphericalCoords(1, phi, theta)
sky.material.uniforms['sunPosition'].value.copy(sun)

// ─── Water ──────────────────────────────────────────────────────────────────
const waterGeometry = new THREE.PlaneGeometry(500, 500, 128, 128)
const water = new Water(waterGeometry, {
  textureWidth: 1024,
  textureHeight: 1024,
  waterNormals: new THREE.TextureLoader().load(
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg',
    (tex) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping }
  ),
  sunDirection: sun,
  sunColor: 0xffeedd,
  waterColor: 0x001133,
  distortionScale: 3.5,
  fog: scene.fog !== undefined,
  alpha: 1.0
})
water.rotation.x = -Math.PI / 2
water.position.y = 0
scene.add(water)

// ─── Floating Islands / Rocks ────────────────────────────────────────────────
const rockGeo = new THREE.DodecahedronGeometry(3, 1)
const rockMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.9, flatShading: true })

const islands = []
const islandData = [
  { x: 20, z: 15, s: 3, y: 1 },
  { x: -18, z: -20, s: 2, y: 0.5 },
  { x: 30, z: -10, s: 4, y: 1.5 },
  { x: -25, z: 25, s: 2.5, y: 0.8 },
  { x: 5, z: -35, s: 3.5, y: 1.2 },
]

islandData.forEach((d, idx) => {
  const mesh = new THREE.Mesh(rockGeo, rockMat)
  mesh.position.set(d.x, d.y, d.z)
  mesh.scale.setScalar(d.s)
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
  mesh.userData.baseY = d.y
  mesh.userData.phase = idx * 1.3
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  islands.push(mesh)

  // Lighthouse on one island
  if (idx === 2) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    )
    pole.position.set(d.x, d.y + d.s * 3 + 4, d.z)
    scene.add(pole)

    const light = new THREE.PointLight(0xffcc44, 5, 30)
    light.position.set(d.x, d.y + d.s * 3 + 8, d.z)
    scene.add(light)
  }
})

// ─── Underwater Caustic Floor ─────────────────────────────────────────────────
const floorGeo = new THREE.PlaneGeometry(500, 500, 1, 1)
const floorMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    float caustic(vec2 p, float t) {
      float c = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 q = p + vec2(sin(t * 0.4 + fi * 1.7), cos(t * 0.3 + fi * 2.1)) * 2.0;
        c += 0.5 + 0.5 * sin(length(q) * 8.0 - t * 2.0 + fi);
      }
      return c / 3.0;
    }
    void main() {
      vec2 uv = (vUv - 0.5) * 20.0;
      float c = caustic(uv, uTime);
      vec3 col = mix(vec3(0.0, 0.05, 0.15), vec3(0.0, 0.4, 0.6), c);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.DoubleSide
})
const floor = new THREE.Mesh(floorGeo, floorMat)
floor.rotation.x = -Math.PI / 2
floor.position.y = -8
scene.add(floor)

// ─── Boat ────────────────────────────────────────────────────────────────────
const boatGroup = new THREE.Group()
const hull = new THREE.Mesh(
  new THREE.BoxGeometry(4, 1.5, 8),
  new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
)
const mast = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 10, 8),
  new THREE.MeshStandardMaterial({ color: 0xccaa77, roughness: 0.6 })
)
mast.position.y = 5.5
boatGroup.add(hull, mast)
boatGroup.position.set(-5, 1.5, -10)
scene.add(boatGroup)

// Sail
const sailGeo = new THREE.PlaneGeometry(4, 8)
const sailMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9, side: THREE.DoubleSide })
const sail = new THREE.Mesh(sailGeo, sailMat)
sail.position.set(0, 5, 0)
sail.rotation.y = Math.PI / 6
boatGroup.add(sail)

// ─── Mouse Interaction ───────────────────────────────────────────────────────
const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
let mouseWorld = new THREE.Vector3()

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  raycaster.ray.intersectPlane(plane, mouseWorld)
})

window.addEventListener('click', () => {
  // Move boat toward mouse click position
  const target = mouseWorld.clone()
  boatGroup.userData.targetX = target.x
  boatGroup.userData.targetZ = target.z
  boatGroup.userData.moving = true
})

// ─── Lights ─────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x112244, 0.8))
const dirLight = new THREE.DirectionalLight(0xffeedd, 1.5)
dirLight.position.set(50, 100, 50)
dirLight.castShadow = true
scene.add(dirLight)

// ─── Animation ──────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  water.material.uniforms['time'].value = t * 0.5
  floorMat.uniforms.uTime.value = t

  // Bob islands
  islands.forEach((isl) => {
    isl.position.y = isl.userData.baseY + Math.sin(t * 0.6 + isl.userData.phase) * 0.5
    isl.rotation.y += 0.002
  })

  // Animate boat
  if (boatGroup.userData.moving) {
    const tx = boatGroup.userData.targetX
    const tz = boatGroup.userData.targetZ
    boatGroup.position.x += (tx - boatGroup.position.x) * 0.02
    boatGroup.position.z += (tz - boatGroup.position.z) * 0.02
    const dx = tx - boatGroup.position.x, dz = tz - boatGroup.position.z
    boatGroup.rotation.y = Math.atan2(dx, dz)
    if (Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5) boatGroup.userData.moving = false
  }

  // Bob boat on water
  boatGroup.position.y = 1.5 + Math.sin(t * 1.2) * 0.4
  boatGroup.rotation.z = Math.sin(t * 0.8) * 0.05
  boatGroup.rotation.x = Math.sin(t * 0.6) * 0.03

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
