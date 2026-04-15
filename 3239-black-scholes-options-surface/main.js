// 3239. Black-Scholes Options Surface
// Black-Scholes期权定价曲面 - 隐含波动率微笑的3D可视化
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
camera.position.set(60, 40, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(20, 40, 20)
scene.add(dirLight)

const params = {
  spotPriceMin: 80,
  spotPriceMax: 120,
  strikePrice: 100,
  volatilityMin: 0.05,
  volatilityMax: 0.50,
  riskFreeRate: 0.05,
  timeToExpiry: 1.0,
  optionType: 'call',
  resolution: 60,
  colorScheme: 'thermal'
}

// Black-Scholes CDF
function normCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1.0 + sign * y)
}

function blackScholes(S, K, T, r, sigma, type) {
  if (T <= 0 || sigma <= 0) return Math.max(0, type === 'call' ? S - K : K - S)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T))
  const d2 = d1 - sigma * Math.sqrt(T)
  if (type === 'call') {
    return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2)
  } else {
    return K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1)
  }
}

const COLORS = {
  thermal: (t) => new THREE.Color().setHSL(0.1 - t * 0.1, 1, 0.4 + t * 0.3),
  ocean: (t) => new THREE.Color().setHSL(0.55 + t * 0.15, 0.8, 0.3 + t * 0.4),
  plasma: (t) => new THREE.Color().setHSL(0.8 - t * 0.8, 1, 0.4 + t * 0.3),
  viridis: (t) => new THREE.Color().setHSL(0.75 - t * 0.7, 0.9, 0.5 + t * 0.2)
}

let surfaceMesh, wireMesh, gridHelper

function buildSurface() {
  const RES = params.resolution
  const geo = new THREE.BufferGeometry()
  
  const S_MIN = params.spotPriceMin
  const S_MAX = params.spotPriceMax
  const V_MIN = params.volatilityMin
  const V_MAX = params.volatilityMax
  
  const vertices = []
  const colors = []
  const indices = []
  
  const colorFn = COLORS[params.colorScheme] || COLORS.thermal
  
  for (let i = 0; i <= RES; i++) {
    for (let j = 0; j <= RES; j++) {
      const S = S_MIN + (S_MAX - S_MIN) * i / RES
      const sigma = V_MIN + (V_MAX - V_MIN) * j / RES
      const price = blackScholes(S, params.strikePrice, params.timeToExpiry, params.riskFreeRate, sigma, params.optionType)
      const x = (S - 100) * 2
      const y = price * 2
      const z = (sigma - 0.25) * 40
      vertices.push(x, y, z)
      
      const t = (price - 0) / 40
      const c = colorFn(Math.min(1, Math.max(0, t)))
      colors.push(c.r, c.g, c.b)
    }
  }
  
  for (let i = 0; i < RES; i++) {
    for (let j = 0; j < RES; j++) {
      const a = i * (RES + 1) + j
      const b = a + 1
      const c = a + (RES + 1)
      const d = c + 1
      indices.push(a, b, d, a, d, c)
    }
  }
  
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  
  if (surfaceMesh) {
    scene.remove(surfaceMesh)
    surfaceMesh.geometry.dispose()
    surfaceMesh.material.dispose()
  }
  
  surfaceMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.1,
    roughness: 0.3,
    side: THREE.DoubleSide
  }))
  scene.add(surfaceMesh)
  
  // Wireframe
  if (wireMesh) {
    scene.remove(wireMesh)
    wireMesh.geometry.dispose()
    wireMesh.material.dispose()
  }
  wireMesh = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0x4488ff, opacity: 0.1, transparent: true }))
  scene.add(wireMesh)
  
  // Axis labels plane
  if (gridHelper) scene.remove(gridHelper)
  gridHelper = new THREE.GridHelper(80, 20, 0x222244, 0x111122)
  gridHelper.position.y = -2
  scene.add(gridHelper)
  
  // Strike price indicator line
  const strikeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -2, -40),
    new THREE.Vector3(0, 40, 40)
  ])
  scene.add(new THREE.Line(strikeGeo, new THREE.LineBasicMaterial({ color: 0xff4400, opacity: 0.5, transparent: true })))
}

buildSurface()

// Current price dot
const dotGeo = new THREE.SphereGeometry(0.8, 16, 16)
const dotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff4400, emissiveIntensity: 1 })
const priceDot = new THREE.Mesh(dotGeo, dotMat)
scene.add(priceDot)

function updateDot() {
  const S = params.strikePrice
  const sigma = (params.volatilityMin + params.volatilityMax) / 2
  const price = blackScholes(S, params.strikePrice, params.timeToExpiry, params.riskFreeRate, sigma, params.optionType)
  priceDot.position.set(
    (S - 100) * 2,
    price * 2,
    (sigma - 0.25) * 40
  )
}
updateDot()

const gui = new GUI()
gui.add(params, 'spotPriceMin', 50, 99, 1).name('标的价格最小').onChange(buildSurface)
gui.add(params, 'spotPriceMax', 101, 150, 1).name('标的价格最大').onChange(buildSurface)
gui.add(params, 'strikePrice', 80, 120, 1).name('行权价').onChange(() => { buildSurface(); updateDot() })
gui.add(params, 'volatilityMin', 0.01, 0.2, 0.01).name('波动率最小').onChange(buildSurface)
gui.add(params, 'volatilityMax', 0.2, 0.8, 0.01).name('波动率最大').onChange(buildSurface)
gui.add(params, 'riskFreeRate', 0, 0.2, 0.01).name('无风险利率').onChange(buildSurface)
gui.add(params, 'timeToExpiry', 0.1, 3, 0.1).name('到期时间(年)').onChange(() => { buildSurface(); updateDot() })
gui.add(params, 'optionType', { Call: 'call', Put: 'put' }).name('期权类型').onChange(() => { buildSurface(); updateDot() })
gui.add(params, 'colorScheme', Object.keys(COLORS)).name('配色').onChange(buildSurface)

function animate() {
  requestAnimationFrame(animate)
  surfaceMesh.rotation.y += 0.002
  wireMesh.rotation.y = surfaceMesh.rotation.y
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
