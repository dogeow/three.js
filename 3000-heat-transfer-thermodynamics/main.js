// 3000. Heat Transfer Thermodynamics
// Heat Transfer Thermodynamics
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0a)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 18, 25)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const light = new THREE.DirectionalLight(0xffffff, 0.8)
light.position.set(10, 20, 10)
scene.add(light)

// Simulation parameters
const GRID = 40
const CELL_SIZE = 1
const diffusivity = 0.2
const ambientTemp = 20
const heatRate = 200

// Temperature field: current and next
let temp = new Float32Array(GRID * GRID)
let tempNext = new Float32Array(GRID * GRID)
let sources = [] // {x, y, temp, radius}

// Initialize with ambient
for (let i = 0; i < GRID * GRID; i++) temp[i] = ambientTemp

// Create geometry for the plate
const plateGeo = new THREE.PlaneGeometry(GRID * CELL_SIZE, GRID * CELL_SIZE, GRID - 1, GRID - 1)
const platePos = plateGeo.attributes.position
plateGeo.setAttribute('temperature', new THREE.BufferAttribute(new Float32Array(GRID * GRID), 1))

const plateMat = new THREE.ShaderMaterial({
  uniforms: {
    uTemperatures: { value: null },
    uMinTemp: { value: 0 },
    uMaxTemp: { value: 100 }
  },
  vertexShader: `
    attribute float temperature;
    varying float vTemp;
    varying vec3 vNormal;
    varying vec2 vUv;
    void main() {
      vTemp = temperature;
      vUv = uv;
      vNormal = normalMatrix * normal;
      vec3 pos = position;
      pos.z += (temperature - 20.0) * 0.05;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uMinTemp;
    uniform float uMaxTemp;
    varying float vTemp;
    varying vec3 vNormal;
    varying vec2 vUv;

    vec3 heatColor(float t) {
      t = clamp((t - uMinTemp) / (uMaxTemp - uMinTemp), 0.0, 1.0);
      vec3 blue = vec3(0.0, 0.0, 0.6);
      vec3 cyan = vec3(0.0, 0.8, 0.8);
      vec3 green = vec3(0.1, 0.8, 0.1);
      vec3 yellow = vec3(1.0, 0.9, 0.0);
      vec3 orange = vec3(1.0, 0.4, 0.0);
      vec3 red = vec3(1.0, 0.1, 0.0);
      if (t < 0.2) return mix(blue, cyan, t / 0.2);
      if (t < 0.4) return mix(cyan, green, (t - 0.2) / 0.2);
      if (t < 0.6) return mix(green, yellow, (t - 0.4) / 0.2);
      if (t < 0.8) return mix(yellow, orange, (t - 0.6) / 0.2);
      return mix(orange, red, (t - 0.8) / 0.2);
    }

    void main() {
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
      float diff = max(dot(normalize(vNormal), lightDir), 0.0) * 0.6 + 0.4;
      vec3 col = heatColor(vTemp) * diff;
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

const plateMesh = new THREE.Mesh(plateGeo, plateMat)
plateMesh.rotation.x = -Math.PI / 2
plateMesh.position.y = 0
scene.add(plateMesh)

// Heat source indicators
const sourceGeo = new THREE.CircleGeometry(1.2, 32)
const sourceMats = []

function createSource(x, y, tempVal) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 })
  const mesh = new THREE.Mesh(sourceGeo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(
    (x - GRID / 2) * CELL_SIZE,
    0.05,
    (y - GRID / 2) * CELL_SIZE
  )
  scene.add(mesh)
  sources.push({ x, y, temp: tempVal, radius: 2, mesh })
}

// Add default heat sources
createSource(5, GRID / 2, 100)   // Hot source left
createSource(GRID - 5, GRID / 2, 30) // Cool source right
createSource(GRID / 2, 5, 80)     // Hot source top

// Side rails
const railGeo = new THREE.BoxGeometry(GRID * CELL_SIZE + 2, 1, 1)
const railMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
for (const z of [-0.5, GRID * CELL_SIZE + 0.5]) {
  const rail = new THREE.Mesh(railGeo, railMat)
  rail.position.set(0, 0.5, z)
  scene.add(rail)
}
const railGeo2 = new THREE.BoxGeometry(1, 1, GRID * CELL_SIZE + 2)
for (const x of [-0.5, GRID * CELL_SIZE + 0.5]) {
  const rail = new THREE.Mesh(railGeo2, railMat)
  rail.position.set(x, 0.5, GRID * CELL_SIZE / 2)
  scene.add(rail)
}

// Temperature update (heat equation: ∂T/∂t = α∇²T)
function updateTemperature(dt) {
  const dx2 = CELL_SIZE * CELL_SIZE
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const idx = y * GRID + x
      const laplacian = (
        temp[idx - 1] + temp[idx + 1] +
        temp[idx - GRID] + temp[idx + GRID] -
        4 * temp[idx]
      ) / dx2
      tempNext[idx] = temp[idx] + diffusivity * laplacian * dt
    }
  }

  // Apply heat sources
  for (const src of sources) {
    for (let dy = -src.radius; dy <= src.radius; dy++) {
      for (let dx = -src.radius; dx <= src.radius; dx++) {
        const sx = src.x + dx, sy = src.y + dy
        if (sx >= 0 && sx < GRID && sy >= 0 && sy < GRID) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= src.radius) {
            const factor = 1 - dist / src.radius
            const idx = sy * GRID + sx
            tempNext[idx] = tempNext[idx] * (1 - factor) + src.temp * factor
          }
        }
      }
    }
  }

  // Boundary: insulated
  for (let i = 0; i < GRID; i++) {
    tempNext[i] = tempNext[GRID + i]
    tempNext[(GRID - 1) * GRID + i] = tempNext[(GRID - 2) * GRID + i]
    tempNext[i * GRID] = tempNext[i * GRID + 1]
    tempNext[i * GRID + GRID - 1] = tempNext[i * GRID + GRID - 2]
  }

  // Swap
  const tmp = temp; temp = tempNext; tempNext = tmp

  // Update geometry
  const posAttr = plateGeo.attributes.position
  const tempAttr = plateGeo.attributes.temperature
  let maxTemp = 0, minTemp = Infinity
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const gi = y * GRID + x
      const pi = y * GRID + x
      const t = temp[gi]
      posAttr.setZ(pi, (t - ambientTemp) * 0.03)
      tempAttr.setX(pi, t)
      if (t > maxTemp) maxTemp = t
      if (t < minTemp) minTemp = t
    }
  }
  posAttr.needsUpdate = true
  tempAttr.needsUpdate = true
  plateGeo.computeVertexNormals()
  plateMat.uniforms.uMinTemp.value = minTemp
  plateMat.uniforms.uMaxTemp.value = maxTemp
}

// Temperature readout at cursor
const infoDiv = document.createElement('div')
infoDiv.style.cssText = 'position:fixed;bottom:20px;left:20px;color:#fff;font:14px monospace;background:rgba(0,0,0,0.7);padding:8px;border-radius:4px'
document.body.appendChild(infoDiv)

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('mousemove', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(plateMesh)
  if (hits.length > 0) {
    const uv = hits[0].uv
    const gx = Math.floor(uv.x * GRID)
    const gy = Math.floor((1 - uv.y) * GRID)
    if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) {
      const t = temp[gy * GRID + gx]
      infoDiv.textContent = `Position: (${gx}, ${gy})  Temperature: ${t.toFixed(1)}°C`
    }
  }
})

// Add new heat source on click
window.addEventListener('click', e => {
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(plateMesh)
  if (hits.length > 0) {
    const uv = hits[0].uv
    const gx = Math.floor(uv.x * GRID)
    const gy = Math.floor((1 - uv.y) * GRID)
    if (gx >= 2 && gx < GRID - 2 && gy >= 2 && gy < GRID - 2) {
      createSource(gx, gy, 90)
    }
  }
})

// Info
const info2 = document.createElement('div')
info2.style.cssText = 'position:fixed;top:20px;left:20px;color:#ff8800;font:14px monospace'
info2.textContent = 'Click to add heat source | Hover for temp readout'
document.body.appendChild(info2)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  updateTemperature(dt)
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
