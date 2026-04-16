// 4259. Optical Flow Block Matching Motion
// 光流与块匹配：运动向量场的实时可视化
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a14)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 模拟视频帧的平面
const FRAME_W = 64, FRAME_H = 48
const frameGeo = new THREE.PlaneGeometry(50, 38)
const frameMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vUv; uniform float uTime;
    float rand(vec2 co) { return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      // 模拟运动物体：旋转的棋盘格
      vec2 center = vec2(0.5 + sin(uTime * 0.7) * 0.15, 0.5 + cos(uTime * 0.5) * 0.1);
      vec2 rel = uv - center;
      float angle = uTime * 0.8;
      float c = cos(angle), s = sin(angle);
      rel = vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c);
      rel += center;
      float scale = 8.0;
      vec2 grid = floor(rel * scale);
      float checker = mod(grid.x + grid.y, 2.0);
      // 背景散斑
      float noise = rand(floor(uv * 120.0) + vec2(uTime * 0.1)) * 0.15;
      vec3 lightGray = vec3(0.55) + noise;
      vec3 darkGray = vec3(0.15) + noise * 0.3;
      vec3 col = mix(lightGray, darkGray, checker);
      // 边缘暗角
      float r = length(uv - 0.5) * 2.0;
      col *= 1.0 - r * r * 0.3;
      gl_FragColor = vec4(col, 1.0);
    }`
})
const frameMesh = new THREE.Mesh(frameGeo, frameMat)
frameMesh.position.z = -5
scene.add(frameMesh)

// 光流向线
const GRID_X = 24, GRID_Y = 18
const flowGeo = new THREE.BufferGeometry()
const flowPositions = new Float32Array(GRID_X * GRID_Y * 6)
const flowColors = new Float32Array(GRID_X * GRID_Y * 6)
const flowLine = new THREE.LineSegments(flowGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }))
scene.add(flowLine)

// 速度场可视化箭头（用简化的线段）
const arrowGeos = []
const arrowMats = []
for (let j = 0; j < GRID_Y; j++) {
  for (let i = 0; i < GRID_X; i++) {
    const geo = new THREE.BufferGeometry()
    const pts = new Float32Array([0, 0, 0, 1, 0, 0])
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.8 })
    const line = new THREE.Line(geo, mat)
    const x = (i / (GRID_X - 1) - 0.5) * 48
    const y = (j / (GRID_Y - 1) - 0.5) * 36
    line.position.set(x, y, -4)
    scene.add(line)
    arrowGeos.push(geo)
    arrowMats.push(mat)
  }
}

const clock = new THREE.Clock()

// Lucas-Kanade 光流计算（简化版）
function computeFlow(t) {
  const dx = Math.sin(t * 0.7) * 15 // 物体x方向速度
  const dy = Math.cos(t * 0.5) * 8  // 物体y方向速度

  for (let j = 0; j < GRID_Y; j++) {
    for (let i = 0; i < GRID_X; i++) {
      const idx = j * GRID_X + i

      // 相对于中心的坐标
      const cx = (i / (GRID_X - 1) - 0.5) * 48
      const cy = (j / (GRID_Y - 1) - 0.5) * 36

      // 物体中心的屏幕坐标
      const objX = Math.sin(t * 0.7) * 7.5
      const objY = Math.cos(t * 0.5) * 3.8

      // 到物体的距离决定影响权重
      const distX = cx - objX
      const distY = cy - objY
      const dist = Math.sqrt(distX * distX + distY * distY)

      // 速度场：物体附近速度大，远离则小
      const influence = Math.max(0, 1.0 - dist / 20)
      const speed = 4.0 * influence

      // 方向：从物体中心向外
      const angle = Math.atan2(distY, distX)
      const vx = Math.cos(angle) * speed + dx * influence * 0.1
      const vy = Math.sin(angle) * speed + dy * influence * 0.1

      const geo = arrowGeos[idx]
      const p = geo.attributes.position.array
      const len = Math.sqrt(vx * vx + vy * vy)
      const nx = len > 0 ? vx / len : 0
      const ny = len > 0 ? vy / len : 0
      p[0] = 0; p[1] = 0; p[2] = 0
      p[3] = nx * len * 0.5; p[4] = ny * len * 0.5; p[5] = 0
      geo.attributes.position.needsUpdate = true

      // 颜色编码速度大小
      const hue = Math.min(len / 6.0, 1.0)
      const col = new THREE.Color().setHSL(0.35 + hue * 0.2, 0.9, 0.5 + hue * 0.3)
      arrowMats[idx].color = col
    }
  }
}

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  frameMat.uniforms.uTime.value = t
  computeFlow(t)

  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
