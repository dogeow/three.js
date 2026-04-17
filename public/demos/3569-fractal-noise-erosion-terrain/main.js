// 3569 Fractal Noise Erosion Terrain - 热力侵蚀地形模拟
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 50, 100)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const SEGS = 128
const SIZE = 120
const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS)
const pos = geo.attributes.position

// FBM 噪声
function hash(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n) }
function smoothstep(a, b, t) { t = t * t * (3 - 2 * t); return a + (b - a) * t }
function vn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  return smoothstep(hash(ix,iy), hash(ix+1,iy), fx) * (1-smoothstep(hash(ix,iy+1), hash(ix+1,iy+1), fx)) +
         smoothstep(hash(ix,iy+1), hash(ix+1,iy+1), fx) * smoothstep(hash(ix,iy), hash(ix+1,iy), fx)
}
function fbm(x, y, oct) {
  let val = 0, amp = 0.5, freq = 1
  for (let i = 0; i < oct; i++) { val += vn(x*freq, y*freq)*amp; amp *= 0.5; freq *= 2.1 }
  return val
}

// 初始化高度
const heights = new Float32Array((SEGS+1)*(SEGS+1))
for (let iy = 0; iy <= SEGS; iy++) for (let ix = 0; ix <= SEGS; ix++) {
  const nx = ix / SEGS * 3, ny = iy / SEGS * 3
  let h = fbm(nx, ny, 6) * 25 - 8
  // 边缘渐降
  const ex = Math.abs(ix/SEGS*2-1), ey = Math.abs(iy/SEGS*2-1)
  h *= Math.max(0, 1 - Math.pow(Math.max(ex, ey), 2))
  heights[iy*(SEGS+1)+ix] = h
}

// 热力侵蚀
function erode(iterations) {
  const K = 0.01, slope_max = 0.05
  for (let iter = 0; iter < iterations; iter++) {
    for (let iy = 1; iy < SEGS; iy++) for (let ix = 1; ix < SEGS; ix++) {
      const i = iy*(SEGS+1)+ix
      const h = heights[i]
      const dirs = [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
      let maxDrop = 0, steepest = null
      for (const [dx,dy] of dirs) {
        const j = (iy+dy)*(SEGS+1)+(ix+dx)
        const drop = h - heights[j]
        if (drop > maxDrop) { maxDrop = drop; steepest = [dx,dy,j] }
      }
      if (steepest && maxDrop > slope_max) {
        const [,,j] = steepest
        const amount = K * maxDrop
        heights[i] -= amount
        heights[j] += amount
      }
    }
  }
}

let eroded = false
function applyHeights() {
  for (let i = 0; i < pos.count; i++) {
    const ix = i % (SEGS+1), iy = Math.floor(i / (SEGS+1))
    pos.setZ(i, heights[iy*(SEGS+1)+ix])
  }
  geo.computeVertexNormals()
}
applyHeights()

// 高度着色
function heightColor(h) {
  if (h < -3) return new THREE.Color(0x1a4a7a)
  if (h < 0) return new THREE.Color(0x2a6a9a)
  if (h < 3) return new THREE.Color(0x3a8a3a)
  if (h < 8) return new THREE.Color(0x5a9a5a)
  if (h < 14) return new THREE.Color(0x8a7a5a)
  if (h < 20) return new THREE.Color(0xaa9a8a)
  return new THREE.Color(0xeeeeee)
}

// 根据高度计算顶点颜色
const colors = new Float32Array(pos.count * 3)
for (let i = 0; i < pos.count; i++) {
  const c = heightColor(pos.getZ(i))
  colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b
}
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0, flatShading: false })
const terrain = new THREE.Mesh(geo, mat)
terrain.castShadow = true
terrain.receiveShadow = true
scene.add(terrain)

// 水
const waterGeo = new THREE.PlaneGeometry(SIZE, SIZE, 1, 1)
waterGeo.rotateX(-Math.PI/2)
const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x2266aa, transparent: true, opacity: 0.7 }))
water.position.y = -3
scene.add(water)

// 灯光
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xfff5e0, 1.2)
sun.position.set(60, 80, 60); sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
scene.add(sun)
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a6a3a, 0.4)
scene.add(hemi)

const ui = document.createElement('div')
ui.style.cssText = 'position:fixed;top:16px;left:16px;color:#fff;font:13px monospace;background:rgba(0,0,0,0.6);padding:12px;border-radius:8px'
ui.innerHTML = 'Fractal Noise Erosion Terrain<br>Erosion: <button id=erodeBtn>Run 50 iterations</button><br>Toggle wireframe: W'
document.body.appendChild(ui)
let wireOn = false
document.getElementById('erodeBtn').onclick = () => {
  erode(50)
  applyHeights()
  for (let i = 0; i < pos.count; i++) {
    const c = heightColor(pos.getZ(i))
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b
  }
  geo.attributes.color.needsUpdate = true
}
window.addEventListener('keydown', e => {
  if (e.code === 'KeyW') {
    wireOn = !wireOn
    mat.wireframe = wireOn
  }
})

function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight) })
