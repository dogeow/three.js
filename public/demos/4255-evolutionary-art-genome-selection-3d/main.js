// 4255. Evolutionary Art Genome Selection 3d
// 演化艺术：基因组选择驱动的3D形态进化
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080808)
scene.fog = new THREE.FogExp2(0x080808, 0.012)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 30, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xffeedd, 1.0)
sun.position.set(30, 50, 30)
scene.add(sun)

// 基因组参数
const POP = 8
const GENOME_LEN = 12

function randomGenome() {
  return Array.from({ length: GENOME_LEN }, () => Math.random())
}

function fitness(genome) {
  // 适应度：基于形态复杂度、对称性、多样性
  const sym = Math.abs(genome[0] - genome[6]) + Math.abs(genome[1] - genome[7])
  const complexity = genome.slice(2, 6).reduce((a, b) => a + b, 0) / 4
  const variety = Math.abs(genome[4] - genome[8]) + Math.abs(genome[5] - genome[9])
  return sym * 0.4 + complexity * 0.3 + variety * 0.3
}

function crossover(a, b) {
  const c = [...a]
  for (let i = 0; i < GENOME_LEN; i++) {
    if (Math.random() < 0.4) c[i] = b[i]
    if (Math.random() < 0.05) c[i] = Math.random()
  }
  return c
}

let generation = 0
let population = Array.from({ length: POP }, randomGenome)
let fitnesses = population.map(fitness)
let displayedIdx = 0

const meshes = []

function buildMesh(genome) {
  // 清除旧mesh
  for (const m of meshes) scene.remove(m)
  meshes.length = 0

  const group = new THREE.Group()

  // 基因解释
  const symmetry = genome[0] // 2/4/8重对称
  const segs = Math.floor(genome[1] * 8) + 3
  const radius = genome[2] * 3 + 1
  const height = genome[3] * 5 + 2
  const twist = (genome[4] - 0.5) * Math.PI
  const branches = Math.floor(genome[5] * 5) + 1
  const curve = genome[6] * 2 - 1
  const colorH = genome[7]
  const colorS = 0.6 + genome[8] * 0.4
  const colorL = 0.3 + genome[9] * 0.4
  const wireframe = genome[10] > 0.6
  const segments = Math.floor(genome[11] * 20) + 8

  const color = new THREE.Color().setHSL(colorH, colorS, colorL)
  const mat = wireframe
    ? new THREE.MeshBasicMaterial({ color, wireframe: true })
    : new THREE.MeshPhongMaterial({ color, shininess: 80 })

  const symCount = Math.floor(symmetry * 6) + 2

  for (let s = 0; s < symCount; s++) {
    const angle = (s / symCount) * Math.PI * 2
    const segGroup = new THREE.Group()

    // 主体形状
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const r = radius * (1 - t * 0.7) * (1 + Math.sin(t * Math.PI * 3) * 0.2)
      const y = t * height
      shape.lineTo(Math.cos(t * twist) * r, y)
    }

    const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 }
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.y = angle
    segGroup.add(mesh)

    // 分支
    for (let b = 0; b < branches; b++) {
      const bt = 0.3 + (b / branches) * 0.5
      const bh = height * bt
      const br = radius * (1 - bt * 0.6) * 0.4
      const bAngle = (curve * Math.PI) + b * 0.4
      const bGeo = new THREE.CylinderGeometry(br * 0.5, br, bh, 6)
      const bMesh = new THREE.Mesh(bGeo, mat)
      bMesh.position.set(Math.cos(bAngle) * radius * 0.8, bh * 0.5, Math.sin(bAngle) * radius * 0.8)
      bMesh.rotation.z = bAngle * 0.3
      bMesh.rotation.x = bt * Math.PI * 0.3
      segGroup.add(bMesh)
    }

    group.add(segGroup)
  }

  scene.add(group)
  meshes.push(group)
}

// 显示适应度最高的
function selectAndDisplay() {
  const sorted = population.map((g, i) => ({ g, f: fitnesses[i], i }))
    .sort((a, b) => b.f - a.f)
  displayedIdx = sorted[0].i
  buildMesh(population[displayedIdx])
}

selectAndDisplay()

// UI
const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:20px;left:20px;color:#fff;font-family:monospace;font-size:13px;pointer-events:none;z-index:10;background:rgba(0,0,0,0.5);padding:10px;border-radius:8px;line-height:1.6;'
document.body.appendChild(info)

window.addEventListener('click', () => {
  // 进化一步
  const newPop = []
  const sorted = population.map((g, i) => ({ g, f: fitnesses[i] })).sort((a, b) => b.f - a.f)
  newPop.push(sorted[0].g) // 精英保留
  while (newPop.length < POP) {
    const p1 = sorted[Math.floor(Math.random() * 3)].g
    const p2 = sorted[Math.floor(Math.random() * 3)].g
    newPop.push(crossover(p1, p2))
  }
  population = newPop
  fitnesses = population.map(fitness)
  generation++
  selectAndDisplay()
})

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
  const f = fitnesses[displayedIdx]
  info.textContent = `Generation: ${generation} | Fitness: ${(f * 100).toFixed(1)}% | Click to evolve | Scroll: orbit | Top fitness: ${(Math.max(...fitnesses) * 100).toFixed(1)}%`
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
