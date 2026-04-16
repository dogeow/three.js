// 3564. Procedural Organic Sculpture
// 程序化有机雕塑 - 参数化光滑曲面 + 噪声位移 + 细分
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)
scene.fog = new THREE.FogExp2(0x050508, 0.015)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 5, 30)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

// 参数控制
const params = {
  noiseScale: 2.5,
  noiseStrength: 1.8,
  baseRadius: 5,
  detail: 64,
  color1: '#6644ff',
  color2: '#ff4488',
  morphSpeed: 0.3,
  sculptureType: 0 // 0=球, 1=圆环, 2=双环, 3=心形
}

// 简单噪声
function noise3D(x, y, z) {
  return Math.sin(x * 1.2 + y * 0.8) * Math.cos(y * 1.5 + z * 0.7) * Math.sin(z * 1.3 + x * 0.9)
}

function fbm(x, y, z, octaves = 4) {
  let val = 0, amp = 1, freq = 1, maxVal = 0
  for (let i = 0; i < octaves; i++) {
    val += noise3D(x * freq, y * freq, z * freq) * amp
    maxVal += amp
    amp *= 0.5
    freq *= 2.1
  }
  return val / maxVal
}

// 生成有机几何体
function createOrganicGeo(type, radius, detail, time) {
  const geo = new THREE.SphereGeometry(radius, detail, detail)
  const pos = geo.attributes.position
  const count = pos.count

  for (let i = 0; i < count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)

    if (type === 0) {
      // 有机球
      const noise = fbm(x / 3, y / 3, z / 3 + time * 0.1, 5) * params.noiseStrength
      const len = Math.sqrt(x * x + y * y + z * z) + noise
      pos.setXYZ(i, x / Math.sqrt(x * x + y * y + z * z) * len,
                    y / Math.sqrt(x * x + y * y + z * z) * len,
                    z / Math.sqrt(x * x + y * y + z * z) * len)
    } else if (type === 1) {
      // 有机环
      const phi = Math.atan2(z, x)
      const r = Math.sqrt(x * x + z * z)
      const noise = fbm(phi * 2 + time * 0.2, y / 2, 0, 4) * params.noiseStrength
      const newR = (r - radius) + noise
      pos.setXYZ(i, Math.cos(phi) * (radius + newR), y + noise * 0.5, Math.sin(phi) * (radius + newR))
    } else if (type === 2) {
      // 双环
      const phi = Math.atan2(z, x)
      const d1 = Math.sqrt((x - radius * 0.7) ** 2 + y ** 2 + z ** 2)
      const d2 = Math.sqrt((x + radius * 0.7) ** 2 + y ** 2 + z ** 2)
      const noise = fbm(phi * 3 + time * 0.15, (d1 - d2) * 0.5, 0, 4) * params.noiseStrength
      const blend = Math.tanh((d1 - d2) * 0.5) * 0.5 + 0.5
      const r1 = (d1 - 2.5) + noise
      const r2 = (d2 - 2.5) + noise
      const finalR = r1 * blend + r2 * (1 - blend)
      pos.setXYZ(i, Math.cos(phi) * (radius * 0.4 + finalR * 0.5),
                    y * 0.5 + noise,
                    Math.sin(phi) * (radius * 0.4 + finalR * 0.5))
    } else if (type === 3) {
      // 有机心形（简化）
      const theta = Math.atan2(z, x)
      const phi = Math.acos(y / Math.sqrt(x*x+y*y+z*z))
      const noise = fbm(theta + time * 0.2, phi + time * 0.1, 0, 4) * params.noiseStrength
      const h = (1 - Math.abs(Math.sin(theta))) * Math.cos(theta) * 2
      const squeeze = 1 - 0.5 * (y / radius) ** 2
      const newR = radius * squeeze + noise
      pos.setXYZ(i, x * newR / Math.max(Math.sqrt(x*x+z*z), 0.01) * 0.8,
                    y * 0.8 + noise * 0.3,
                    z * newR / Math.max(Math.sqrt(x*x+z*z), 0.01) * 0.8)
    }
  }
  geo.computeVertexNormals()
  return geo
}

// 创建雕塑
const sculptureGroup = new THREE.Group()
scene.add(sculptureGroup)

// 主体
let geo = createOrganicGeo(0, params.baseRadius, params.detail, 0)
const mat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(params.color1),
  metalness: 0.1,
  roughness: 0.2,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  transmission: 0.3,
  thickness: 2,
  side: THREE.DoubleSide
})
const mainMesh = new THREE.Mesh(geo, mat)
sculptureGroup.add(mainMesh)

// 线框覆盖
const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.05 })
const wireMesh = new THREE.Mesh(geo, wireMat)
sculptureGroup.add(wireMesh)

// 平台
const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(8, 9, 1, 32),
  new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.5, metalness: 0.5 })
)
platform.position.y = -8
platform.receiveShadow = true
scene.add(platform)

// 光源
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const light1 = new THREE.PointLight(0x6644ff, 3, 50)
light1.position.set(10, 10, 10)
scene.add(light1)
const light2 = new THREE.PointLight(0xff4488, 3, 50)
light2.position.set(-10, 5, -10)
scene.add(light2)
const light3 = new THREE.PointLight(0x44ffcc, 1, 30)
light3.position.set(0, -5, 15)
scene.add(light3)

// UI滑块
const ui = document.createElement('div')
ui.style.cssText = 'position:fixed;top:16px;left:16px;color:#aaa;font-family:monospace;font-size:11px;background:rgba(0,0,0,0.7);padding:12px;border-radius:8px;min-width:200px'
ui.innerHTML = `
  <div style="margin-bottom:8px;font-size:13px">🗿 Procedural Sculpture</div>
  <label>噪声强度: <span id="ns-val">${params.noiseStrength}</span></label><br>
  <input type="range" id="ns" min="0" max="5" step="0.1" value="${params.noiseStrength}" style="width:180px"><br>
  <label>基础半径: <span id="br-val">${params.baseRadius}</span></label><br>
  <input type="range" id="br" min="1" max="10" step="0.5" value="${params.baseRadius}" style="width:180px"><br>
  <label>形态类型: </label>
  <select id="type" style="background:#222;color:#aaa;border:none;margin-top:4px">
    <option value="0">有机球</option>
    <option value="1">有机环</option>
    <option value="2">双环融合</option>
    <option value="3">心形</option>
  </select><br><br>
  <button id="randomize" style="background:#6644ff;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer">随机形态</button>
`
document.body.appendChild(ui)

ui.querySelector('#ns').addEventListener('input', (e) => {
  params.noiseStrength = parseFloat(e.target.value)
  ui.querySelector('#ns-val').textContent = params.noiseStrength.toFixed(1)
})
ui.querySelector('#br').addEventListener('input', (e) => {
  params.baseRadius = parseFloat(e.target.value)
  ui.querySelector('#br-val').textContent = params.baseRadius.toFixed(1)
})
ui.querySelector('#type').addEventListener('change', (e) => {
  params.sculptureType = parseInt(e.target.value)
})
ui.querySelector('#randomize').addEventListener('click', () => {
  params.noiseStrength = 0.5 + Math.random() * 4
  params.baseRadius = 2 + Math.random() * 7
  ui.querySelector('#ns').value = params.noiseStrength
  ui.querySelector('#ns-val').textContent = params.noiseStrength.toFixed(1)
  ui.querySelector('#br').value = params.baseRadius
  ui.querySelector('#br-val').textContent = params.baseRadius.toFixed(1)
  const colors = ['#6644ff', '#ff4488', '#44ffaa', '#ffaa44', '#4488ff', '#ff6644']
  const c1 = colors[Math.floor(Math.random() * colors.length)]
  const c2 = colors[Math.floor(Math.random() * colors.length)]
  mat.color.set(c1)
  light1.color.set(c1)
  light2.color.set(c2)
})

let time = 0
function animate() {
  requestAnimationFrame(animate)
  time += 0.01

  // 更新几何体（每帧有点贵，但演示用）
  geo.dispose()
  const newGeo = createOrganicGeo(params.sculptureType, params.baseRadius, params.detail, time)
  mainMesh.geometry = newGeo
  wireMesh.geometry = newGeo
  geo = newGeo

  // 灯光动画
  light1.position.x = Math.sin(time * 0.5) * 15
  light1.position.z = Math.cos(time * 0.5) * 15
  light2.position.x = Math.cos(time * 0.3) * 12
  light2.position.z = Math.sin(time * 0.3) * 12

  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
