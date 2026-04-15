// 3364. Parametric Sail Aerodynamics — Bernoulli principle flow visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'

const scene = new THREE.Scene()

// Sky gradient background
scene.background = new THREE.Color(0x87ceeb)
scene.fog = new THREE.FogExp2(0xadd8e6, 0.006)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(12, 6, 18)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 5, 0)

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const sun = new THREE.DirectionalLight(0xffffcc, 1.2)
sun.position.set(30, 50, 20)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
scene.add(sun)

// Water (Gerstner waves)
const waterGeo = new THREE.PlaneGeometry(200, 200, 80, 80)
const waterMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uWindAngle: { value: 0.5 } },
  vertexShader: `
    uniform float uTime;
    uniform float uWindAngle;
    varying vec2 vUv;
    varying float vWave;
    vec3 gerstner(vec3 p, float A, float k, float w, float Q, float dir) {
      float ph = k * (p.x * cos(dir) + p.z * sin(dir)) - w * uTime;
      return vec3(Q * A * cos(ph), A * sin(ph), Q * A * cos(ph));
    }
    void main() {
      vUv = uv;
      vec3 p = position;
      vec3 w1 = gerstner(p, 0.4, 0.5, 1.5, 0.5, uWindAngle);
      vec3 w2 = gerstner(p, 0.2, 1.0, 2.0, 0.3, uWindAngle + 0.5);
      p += w1 + w2;
      vWave = (w1.y + w2.y + 0.6) / 1.2;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: `
    varying float vWave;
    void main() {
      vec3 deep = vec3(0.0, 0.15, 0.4);
      vec3 shallow = vec3(0.1, 0.5, 0.7);
      gl_FragColor = vec4(mix(deep, shallow, vWave), 1.0);
    }
  `
})
const water = new THREE.Mesh(waterGeo, waterMat)
water.rotation.x = -Math.PI / 2
water.position.y = -2
water.receiveShadow = true
scene.add(water)

// Boat hull
const hullGeo = new THREE.BoxGeometry(3, 1.5, 8)
const hullMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
const hull = new THREE.Mesh(hullGeo, hullMat)
hull.position.y = -1
hull.castShadow = true
scene.add(hull)

// Mast
const mastGeo = new THREE.CylinderGeometry(0.08, 0.1, 14, 8)
const mastMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.7 })
const mast = new THREE.Mesh(mastGeo, mastMat)
mast.position.set(0, 6, 0)
mast.castShadow = true
scene.add(mast)

// Sail — will be rebuilt on param change
let sailMesh = null
let streamlines = []
const params = { camber: 0.25, draft: 0.15, windAngle: 30, windSpeed: 1.0 }

function buildSailGeometry(camber, draft) {
  const geo = new THREE.BufferGeometry()
  const W = 7, H = 12
  const segsX = 20, segsY = 30
  const verts = [], indices = [], uvs = [], norms = []

  for (let y = 0; y <= segsY; y++) {
    for (let x = 0; x <= segsX; x++) {
      const u = x / segsX, v = y / segsY
      // Sail shape: curved like an airfoil
      const cx = camber * Math.sin(v * Math.PI)  // camber along height
      const dz = draft * Math.sin(u * Math.PI) * Math.sin(v * Math.PI)  // billow
      const px = (u - 0.5) * W + cx
      const py = v * H
      const pz = dz * 2
      verts.push(px, py, pz)
      uvs.push(u, v)
    }
  }

  for (let y = 0; y < segsY; y++) {
    for (let x = 0; x < segsX; x++) {
      const a = y * (segsX + 1) + x
      const b = a + 1
      const c = a + (segsX + 1)
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function rebuildSail() {
  if (sailMesh) { scene.remove(sailMesh); sailMesh.geometry.dispose(); }
  const sailGeo = buildSailGeometry(params.camber, params.draft)
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e7,
    side: THREE.DoubleSide,
    roughness: 0.6,
    transparent: true,
    opacity: 0.85
  })
  sailMesh = new THREE.Mesh(sailGeo, sailMat)
  sailMesh.castShadow = true
  // Position: left edge at x=0, so shift by -W/2
  sailMesh.position.set(-3.5, 0, 0)
  scene.add(sailMesh)
}
rebuildSail()

// Streamlines (potential flow around flat plate approximation)
// Simplified: deflected straight lines around sail area
const streamlineGroup = new THREE.Group()
scene.add(streamlineGroup)

function windRadToScene(angleDeg) {
  // angleDeg is wind angle relative to boat heading (sail is at x=0)
  // Convert to scene coords
  const rad = angleDeg * Math.PI / 180
  return rad
}

function buildStreamlines(windAngleDeg, windSpeed) {
  // Clear old
  while (streamlineGroup.children.length > 0) {
    const c = streamlineGroup.children[0]
    streamlineGroup.remove(c)
    if (c.geometry) c.geometry.dispose()
    if (c.material) c.material.dispose()
  }
  streamlines = []

  const NUM = 28
  const matSpeed = new LineMaterial({ color: 0xffffff, linewidth: 2, transparent: true, opacity: 0.6 })
  const matLow = new LineMaterial({ color: 0xff4400, linewidth: 2, transparent: true, opacity: 0.7 })
  const matHigh = new LineMaterial({ color: 0x0088ff, linewidth: 2, transparent: true, opacity: 0.7 })

  for (let i = 0; i < NUM; i++) {
    // Starting positions: range from left side of scene
    const t = i / (NUM - 1)
    const yStart = t * 14 + 1  // vertical spread through sail height
    const xStart = -25
    const zStart = (Math.random() - 0.5) * 12

    const pts = []
    const SPEED = windSpeed * 0.3
    const STEPS = 120
    const dx = Math.cos(windRadToScene(windAngleDeg)) * SPEED
    const dz = Math.sin(windRadToScene(windAngleDeg)) * SPEED

    let px = xStart, py = yStart, pz = zStart
    const sailLeft = -3.5, sailRight = 3.5, sailTop = 12, sailBot = 0
    let speedFactor = 1.0
    let deflectZ = 0

    for (let s = 0; s < STEPS; s++) {
      pts.push(px, py, pz + deflectZ)
      px += dx * 0.2

      // Approaching sail: speed up above/below sail (low pressure)
      if (px < sailRight && px > sailLeft - 5 && py > sailBot && py < sailTop) {
        // In sail's vertical range — deflect around
        const sailMidX = 0
        const distFromSail = Math.abs(px - sailMidX)
        const localSpeed = 1 + params.camber * 3 * (1 - distFromSail / 5)
        px += dx * 0.2 * localSpeed

        // Deflect in z when close to sail
        if (px > sailLeft && px < sailRight) {
          const sailFrac = (py - sailBot) / (sailTop - sailBot)
          deflectZ = (sailFrac - 0.5) * params.draft * 8
          speedFactor = 1.5
        } else {
          deflectZ *= 0.95
          speedFactor = Math.max(speedFactor * 0.99, 1.0)
        }
      } else {
        deflectZ *= 0.97
        speedFactor = Math.max(speedFactor * 0.99, 1.0)
      }

      if (px > 25) break
    }

    if (pts.length < 6) continue

    const geo = new LineGeometry()
    geo.setPositions(pts)
    // Color by speed
    const mat = speedFactor > 1.3 ? matLow.clone() : matHigh.clone()
    mat.opacity = 0.4 + speedFactor * 0.2
    const line = new Line2(geo, mat)
    line.computeLineDistances()
    streamlineGroup.add(line)
    streamlines.push({ line, pts, speed: speedFactor, age: Math.random() * 100 })
  }
}

buildStreamlines(params.windAngle, params.windSpeed)

function animateStreamlines(dt) {
  const windRad = windRadToScene(params.windAngle)
  const speed = params.windSpeed * 0.3

  for (const sl of streamlines) {
    sl.age += dt * speed * 10
    const offset = (sl.age % 1) * 0.2

    // Shift positions
    const positions = sl.line.geometry.attributes.instanceStart
    if (positions) {
      const arr = positions.array
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += Math.cos(windRad) * dt * speed
        if (arr[i] > 25) arr[i] -= 50
      }
      positions.needsUpdate = true
    }
  }
}

// Labels for pressure
function makeLabel3D(text, pos, color) {
  const div = document.createElement('div')
  div.textContent = text
  div.style.cssText = `position:absolute;color:${color};font-size:13px;font-weight:bold;text-shadow:0 0 6px ${color};pointer-events:none`
  document.body.appendChild(div)
  return { div, pos }
}
const labels = [
  makeLabel3D('LOW ↑', new THREE.Vector3(0, 8, 3), '#ff6622'),
  makeLabel3D('PRESSURE', new THREE.Vector3(0, 8, 3.5), '#ff6622'),
]

function updateLabels() {
  for (const { div, pos } of labels) {
    const v = pos.clone().project(camera)
    div.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'
    div.style.top = ((-v.y + 1) / 2 * innerHeight) + 'px'
  }
}

// GUI
const gui = new GUI()
gui.add(params, 'camber', 0, 0.6, 0.01).name('Camber (Curvature)').onChange(() => { rebuildSail(); buildStreamlines(params.windAngle, params.windSpeed) })
gui.add(params, 'draft', 0, 0.5, 0.01).name('Draft (Billow)').onChange(() => { rebuildSail(); buildStreamlines(params.windAngle, params.windSpeed) })
gui.add(params, 'windAngle', 0, 80, 1).name('Wind Angle (°)').onChange(() => { buildStreamlines(params.windAngle, params.windSpeed) })
gui.add(params, 'windSpeed', 0.2, 3, 0.1).name('Wind Speed').onChange(() => { buildStreamlines(params.windAngle, params.windSpeed) })

const clock = new THREE.Clock()
let frame = 0
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  waterMat.uniforms.uTime.value = clock.getElapsedTime()
  waterMat.uniforms.uWindAngle.value = windRadToScene(params.windAngle)

  animateStreamlines(dt)
  if (frame % 5 === 0) updateLabels()
  frame++
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
