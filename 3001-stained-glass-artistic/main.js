// 3001. Stained Glass Artistic
// Stained Glass Artistic
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a0a00)
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 0, 30)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

// Parameters
const COLS = 8
const ROWS = 6
const CELL_W = 5
const CELL_H = 5
const FRAME_THICKNESS = 0.35
const TOTAL_W = COLS * CELL_W + (COLS + 1) * FRAME_THICKNESS
const TOTAL_H = ROWS * CELL_H + (ROWS + 1) * FRAME_THICKNESS

// Stained glass color palette (rich jewel tones)
const PALETTE = [
  [0.9, 0.1, 0.1],   // deep red
  [0.1, 0.3, 0.8],   // cobalt blue
  [0.1, 0.6, 0.2],   // emerald green
  [0.9, 0.7, 0.1],   // amber/gold
  [0.6, 0.1, 0.6],   // deep purple
  [0.9, 0.4, 0.1],   // orange
  [0.1, 0.7, 0.7],   // teal
  [0.8, 0.1, 0.4],   // magenta
  [0.2, 0.8, 0.6],   // mint
  [0.7, 0.5, 0.1],   // ochre
]

// Generate lead matrix (which cells are part of the frame)
function generateLeadPattern() {
  const lead = Array(ROWS + 1).fill(null).map(() => Array(COLS + 1).fill(false))
  for (let r = 0; r <= ROWS; r++) {
    for (let c = 0; c <= COLS; c++) {
      // Always frame borders
      if (r === 0 || r === ROWS || c === 0 || c === COLS) {
        lead[r][c] = true
      } else {
        // Random interior leads with some structure
        lead[r][c] = Math.random() < 0.15
      }
    }
  }
  // Connect all leads horizontally
  for (let r = 0; r <= ROWS; r++) {
    let inRun = false
    for (let c = 0; c <= COLS; c++) {
      if (lead[r][c] || (Math.random() < 0.3 && r > 0 && r < ROWS)) {
        inRun = true
      } else if (inRun && c < COLS) {
        lead[r][c] = Math.random() < 0.4
      }
    }
  }
  return lead
}

const leadPattern = generateLeadPattern()

// Create one glass cell
function createGlassCell(row, col, color) {
  const group = new THREE.Group()
  const cx = (col - COLS / 2 + 0.5) * CELL_W
  const cy = (row - ROWS / 2 + 0.5) * CELL_H

  // Glass pane (slightly inset from frame)
  const inset = FRAME_THICKNESS * 0.4
  const glassGeo = new THREE.PlaneGeometry(CELL_W - inset * 2, CELL_H - inset * 2)
  const glassMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Vector3(...color) },
      uTime: { value: 0 },
      uLightDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
      uLightColor: { value: new THREE.Vector3(1.0, 0.95, 0.85) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec2 vUv;
      void main() {
        vNormal = normalMatrix * normal;
        vPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform vec3 uLightDir;
      uniform vec3 uLightColor;
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec2 vUv;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(-vPos);
        vec3 L = normalize(uLightDir);

        // Fresnel
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

        // Diffuse
        float diff = max(dot(N, L), 0.0);

        // Specular highlight
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 64.0);

        // Slight color variation within pane (simulate glass texture)
        vec2 uv2 = vUv * 2.0 - 1.0;
        float variation = sin(uv2.x * 10.0 + uTime * 0.5) * sin(uv2.y * 10.0) * 0.05;

        // Light transmission - backlit stained glass look
        vec3 transmitted = uColor * uLightColor * (0.5 + diff * 0.5);
        vec3 reflected = uColor * 0.3 + fresnel * vec3(1.0);

        vec3 col = mix(transmitted, reflected, fresnel * 0.5);
        col += spec * uLightColor * 0.3;
        col += variation;

        // Subtle transparency simulation
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.DoubleSide
  })

  const glass = new THREE.Mesh(glassGeo, glassMat)
  glass.position.set(cx, cy, 0)
  group.add(glass)
  group.userData.glassMat = glassMat

  return group
}

// Create frame lead pieces
function createLead() {
  const leadGroup = new THREE.Group()
  const leadMat = new THREE.MeshStandardMaterial({
    color: 0x1a1005,
    roughness: 0.9,
    metalness: 0.1
  })

  // Horizontal leads
  for (let r = 0; r <= ROWS; r++) {
    const y = (r - ROWS / 2) * CELL_H - FRAME_THICKNESS / 2
    const geo = new THREE.BoxGeometry(TOTAL_W, FRAME_THICKNESS, FRAME_THICKNESS * 0.5)
    const mesh = new THREE.Mesh(geo, leadMat)
    mesh.position.set(0, y, 0)
    leadGroup.add(mesh)
  }

  // Vertical leads
  for (let c = 0; c <= COLS; c++) {
    const x = (c - COLS / 2) * CELL_W - FRAME_THICKNESS / 2
    const geo = new THREE.BoxGeometry(FRAME_THICKNESS, TOTAL_H, FRAME_THICKNESS * 0.5)
    const mesh = new THREE.Mesh(geo, leadMat)
    mesh.position.set(x, 0, 0)
    leadGroup.add(mesh)
  }

  return leadGroup
}

// Build the stained glass panel
const glassPanel = new THREE.Group()

// Background light panel
const bgGeo = new THREE.PlaneGeometry(TOTAL_W + 2, TOTAL_H + 2)
const bgMat = new THREE.MeshBasicMaterial({ color: 0x222200 })
const bg = new THREE.Mesh(bgGeo, bgMat)
bg.position.z = -0.5
glassPanel.add(bg)

// Light behind the panel
const lightPanel = new THREE.Mesh(
  new THREE.PlaneGeometry(TOTAL_W + 1, TOTAL_H + 1),
  new THREE.MeshBasicMaterial({ color: 0xfff8e0, side: THREE.BackSide })
)
lightPanel.position.z = -0.3
glassPanel.add(lightPanel)

// Glass cells
const glassCells = []
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const colorIdx = (r * COLS + c) % PALETTE.length
    const cell = createGlassCell(r, c, PALETTE[colorIdx])
    glassPanel.add(cell)
    glassCells.push(cell)
  }
}

// Lead framework
const leadGroup = createLead()
glassPanel.add(leadGroup)

scene.add(glassPanel)

// Ornamental arch at top
const archGeo = new THREE.TorusGeometry(TOTAL_W / 2 + 1, 0.8, 8, 32, Math.PI)
const archMat = new THREE.MeshStandardMaterial({
  color: 0x1a1005,
  roughness: 0.9,
  metalness: 0.1
})
const arch = new THREE.Mesh(archGeo, archMat)
arch.position.set(0, TOTAL_H / 2 + 0.8, 0)
arch.rotation.z = Math.PI
scene.add(arch)

// Scene lights
scene.add(new THREE.AmbientLight(0xfff0dd, 0.3))
const spotLight = new THREE.SpotLight(0xfff4e0, 3, 100, Math.PI / 4, 0.5)
spotLight.position.set(10, 20, 30)
scene.add(spotLight)
const spotLight2 = new THREE.SpotLight(0xc0e0ff, 1, 80, Math.PI / 5)
spotLight2.position.set(-15, 10, 20)
scene.add(spotLight2)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // Animate glass materials
  for (const cell of glassCells) {
    if (cell.userData.glassMat) {
      cell.userData.glassMat.uniforms.uTime.value = t
    }
  }

  // Subtle light color animation
  const r = 0.9 + Math.sin(t * 0.3) * 0.1
  const g = 0.85 + Math.sin(t * 0.5) * 0.1
  const b = 0.8 + Math.sin(t * 0.7) * 0.1
  lightPanel.material.color.setRGB(r, g, b)

  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
