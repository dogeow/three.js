// 2954. Procedural Tree L-System
// L系统程序化树木生成 — 递归分形树，点击生成新树
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)
scene.fog = new THREE.FogExpExp2(0x87ceeb, 0.01)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 15, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 地面
const groundGeo = new THREE.PlaneGeometry(200, 200, 20, 20)
// 添加地形起伏
const pos = groundGeo.attributes.position
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i)
  const h = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5 + Math.sin(x * 0.3) * 0.3
  pos.setY(i, h)
}
groundGeo.computeVertexNormals()
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a5f0b, roughness: 1.0 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// 天空（渐变球）
const skyGeo = new THREE.SphereGeometry(300, 16, 8)
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {},
  vertexShader: `varying vec3 vWorld; void main() { vWorld = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    varying vec3 vWorld;
    void main() {
      float t = clamp(vWorld.y / 200.0, 0.0, 1.0);
      vec3 sky = mix(vec3(0.9, 0.95, 1.0), vec3(0.4, 0.7, 1.0), t);
      gl_FragColor = vec4(sky, 1.0);
    }`
})
scene.add(new THREE.Mesh(skyGeo, skyMat))

scene.add(new THREE.AmbientLight(0x8899bb, 0.8))
const sun = new THREE.DirectionalLight(0xffeecc, 1.5)
sun.position.set(50, 80, 30)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 200
sun.shadow.camera.left = -50
sun.shadow.camera.right = 50
sun.shadow.camera.top = 50
sun.shadow.camera.bottom = -50
scene.add(sun)

// 参数
const params = {
  iterations: 5,
  lengthScale: 3.0,
  branchAngle: 0.4,
  thickness: 0.15,
  leaves: true,
  randomness: 0.2,
  groundHeight: 0,
  regenerate: generateTree
}

let treeGroup = null
const lSystems = [
  { name: '经典分形', axiom: 'F', rules: { F: 'FF+[+F-F-F]-[-F+F+F]' }, angle: 25 },
  { name: '分叉树', axiom: 'X', rules: { X: 'F[+X]F[-X]+X', F: 'FF' }, angle: 20 },
  { name: '榕树', axiom: 'X', rules: { X: 'F[+X][-X]FX', F: 'FF' }, angle: 30 },
  { name: '棕榈', axiom: 'X', rules: { X: 'F[+X]F[-X]+X', F: 'F[++F]F' }, angle: 15 },
  { name: '灌木', axiom: 'X', rules: { X: '[-X][+X]FX', F: 'FF' }, angle: 40 },
]

let currentLSys = lSystems[0]

// Turtle graphics interpreter
function interpretLSystem(ls, iters, scale, angle, rand) {
  let state = ls.axiom
  for (let i = 0; i < iters; i++) {
    let next = ''
    for (const ch of state) {
      if (ls.rules[ch]) {
        next += ls.rules[ch]
      } else {
        next += ch
      }
    }
    state = next
    if (state.length > 200000) break  // 安全限制
  }
  return state
}

function buildTreeMesh(ls, iters, lengthScale, branchAngle, thickness, rand) {
  if (treeGroup) {
    scene.remove(treeGroup)
    treeGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose()
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose())
        else c.material.dispose()
      }
    })
  }
  treeGroup = new THREE.Group()

  const segments = interpretLSystem(ls, iters, lengthScale, branchAngle, rand)

  // 存储所有线段
  const positions = []
  const colors = []
  let stack = []
  let pos = new THREE.Vector3(0, params.groundHeight, 0)
  let dir = new THREE.Vector3(0, 1, 0)
  let thickness_current = thickness

  const leafMeshes = []
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 })
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.85 })
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8, side: THREE.DoubleSide })

  const MAX_SEGMENTS = 15000
  let segCount = 0

  for (const cmd of segments) {
    if (segCount > MAX_SEGMENTS) break
    switch (cmd) {
      case 'F': {
        const delta = dir.clone().multiplyScalar(lengthScale * (1 + (Math.random() - 0.5) * rand))
        const newPos = pos.clone().add(delta)
        const t = Math.min(thickness_current / thickness, 1.0)
        const col = new THREE.Color().setHSL(0.08, 0.4, 0.15 + t * 0.1)

        positions.push(pos.x, pos.y, pos.z, newPos.x, newPos.y, newPos.z)
        colors.push(col.r, col.g, col.b, col.r * 0.8, col.g * 0.8, col.b * 0.8)

        // 叶子
        if (params.leaves && Math.random() < 0.15 && ls.name !== '棕榈') {
          const leafGeo = new THREE.PlaneGeometry(0.8 + Math.random() * 0.8, 0.5 + Math.random() * 0.5)
          const leaf = new THREE.Mesh(leafGeo, leafMat.clone())
          leaf.position.copy(newPos)
          leaf.lookAt(newPos.clone().add(dir))
          leaf.material.color.setHSL(0.25 + Math.random() * 0.1, 0.6, 0.3)
          leaf.castShadow = true
          treeGroup.add(leaf)
        }

        pos = newPos
        thickness_current *= 0.7
        segCount++
        break
      }
      case '+': {
        const a = (branchAngle + (Math.random() - 0.5) * rand * 0.3) * Math.PI / 180
        dir.applyAxisAngle(new THREE.Vector3(Math.random(), 0, Math.random() - 0.5).normalize(), a)
        break
      }
      case '-': {
        const a = -(branchAngle + (Math.random() - 0.5) * rand * 0.3) * Math.PI / 180
        dir.applyAxisAngle(new THREE.Vector3(Math.random(), 0, Math.random() - 0.5).normalize(), a)
        break
      }
      case '[':
        stack.push({ pos: pos.clone(), dir: dir.clone(), thickness: thickness_current })
        break
      case ']':
        if (stack.length > 0) {
          const s = stack.pop()
          pos = s.pos
          dir = s.dir
          thickness_current = s.thickness
        }
        break
    }
  }

  // 创建线段几何
  if (positions.length > 0) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 1 })
    const lines = new THREE.LineSegments(geo, mat)
    treeGroup.add(lines)
  }

  scene.add(treeGroup)
}

function generateTree() {
  buildTreeMesh(
    currentLSys,
    params.iterations,
    params.lengthScale,
    currentLSys.angle,
    params.thickness * 10,
    params.randomness
  )
}

// 初始树
generateTree()

// GUI
const gui = new GUI()
gui.add(params, 'iterations', 1, 7, 1).name('递归深度').onChange(generateTree)
gui.add(params, 'lengthScale', 1, 6, 0.1).name('枝长').onChange(generateTree)
gui.add(params, 'randomness', 0, 0.5, 0.02).name('随机度').onChange(generateTree)
gui.add(params, 'leaves').name('有叶子').onChange(generateTree)
gui.add(currentLSys, 'name', lSystems.map(s => s.name)).name('L系统类型').onChange(v => {
  currentLSys = lSystems.find(s => s.name === v)
  generateTree()
})
gui.add(params, 'regenerate').name('生成新树')

// 点击也重新生成
window.addEventListener('click', () => { generateTree() })

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  // 缓慢风动效果
  if (treeGroup) {
    const t = clock.getElapsedTime()
    treeGroup.rotation.y = Math.sin(t * 0.1) * 0.02
  }
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
