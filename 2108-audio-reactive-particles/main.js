// 2108. 音频响应粒子
// 音频响应粒子系统
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.015)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

// 粒子系统参数
const count = 8000
const positions = new Float32Array(count * 3)
const velocities = new Float32Array(count * 3)
const colors = new Float32Array(count * 3)
const sizes = new Float32Array(count)
const phases = new Float32Array(count)
const orbits = new Float32Array(count)

// 初始化粒子
for (let i = 0; i < count; i++) {
  const radius = 5 + Math.random() * 45
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  
  positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
  positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
  positions[i * 3 + 2] = radius * Math.cos(phi)
  
  const speed = 0.02 + Math.random() * 0.08
  velocities[i * 3] = (Math.random() - 0.5) * speed
  velocities[i * 3 + 1] = (Math.random() - 0.5) * speed
  velocities[i * 3 + 2] = (Math.random() - 0.5) * speed
  
  // 颜色 - 渐变调色板
  const colorPhase = Math.random()
  if (colorPhase < 0.25) {
    colors[i * 3] = 0.1; colors[i * 3 + 1] = 0.4; colors[i * 3 + 2] = 1.0
  } else if (colorPhase < 0.5) {
    colors[i * 3] = 0.6; colors[i * 3 + 1] = 0.2; colors[i * 3 + 2] = 1.0
  } else if (colorPhase < 0.75) {
    colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.3; colors[i * 3 + 2] = 0.5
  } else {
    colors[i * 3] = 0.2; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.9
  }
  
  sizes[i] = 0.1 + Math.random() * 0.4
  phases[i] = Math.random() * Math.PI * 2
  orbits[i] = 0.5 + Math.random() * 1.5
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

// 自定义粒子着色器
const particleMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uAudioLow: { value: 0 },
    uAudioMid: { value: 0 },
    uAudioHigh: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() }
  },
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uTime;
    uniform float uAudioLow;
    uniform float uAudioMid;
    uniform float uAudioHigh;
    
    void main() {
      vColor = color;
      
      vec3 pos = position;
      float dist = length(pos);
      
      // 音频响应 - 低音影响粒子膨胀
      float scale = 1.0 + uAudioLow * 0.5 * sin(pos.x * 0.1 + uTime);
      
      // 中音影响粒子位置扰动
      pos.x += sin(pos.y * 2.0 + uTime * 0.5) * uAudioMid * 3.0;
      pos.y += cos(pos.z * 2.0 + uTime * 0.7) * uAudioMid * 3.0;
      pos.z += sin(pos.x * 2.0 + uTime * 0.3) * uAudioMid * 3.0;
      
      // 高音影响粒子透明度和闪烁
      vAlpha = 0.6 + uAudioHigh * 0.4 + sin(uTime * 5.0 + pos.x + pos.y) * 0.1;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * scale * uPixelRatio * (30.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uTime;
    uniform float uAudioHigh;
    
    void main() {
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      
      // 圆形粒子
      if (dist > 0.5) discard;
      
      // 发光效果
      float glow = 1.0 - smoothstep(0.0, 0.5, dist);
      glow = pow(glow, 1.5);
      
      // 闪烁
      float flicker = 0.9 + 0.1 * sin(uTime * 10.0 + vColor.r * 100.0);
      
      vec3 finalColor = vColor * (1.0 + uAudioHigh * 0.5);
      gl_FragColor = vec4(finalColor * flicker, glow * vAlpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})

const particles = new THREE.Points(geo, particleMat)
scene.add(particles)

// 音频模拟（如果没有真实音频输入，使用程序生成）
class AudioSimulator {
  constructor() {
    this.low = 0
    this.mid = 0
    this.high = 0
    this.targetLow = 0
    this.targetMid = 0
    this.targetHigh = 0
  }
  
  update(time) {
    // 模拟音频频谱
    this.targetLow = 0.3 + 0.3 * Math.sin(time * 0.5) + 0.2 * Math.sin(time * 1.3)
    this.targetMid = 0.2 + 0.25 * Math.sin(time * 0.8 + 1) + 0.15 * Math.sin(time * 2.1)
    this.targetHigh = 0.1 + 0.2 * Math.sin(time * 1.5 + 2) + 0.1 * Math.sin(time * 3.2)
    
    this.low += (this.targetLow - this.low) * 0.1
    this.mid += (this.targetMid - this.mid) * 0.15
    this.high += (this.targetHigh - this.high) * 0.2
  }
}

const audioSim = new AudioSimulator()

// 鼠标交互
const mouse = new THREE.Vector2()
const mouseSphere = new THREE.Mesh(
  new THREE.SphereGeometry(2, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 })
)
scene.add(mouseSphere)

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  
  // 更新鼠标球位置
  const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5)
  vector.unproject(camera)
  const dir = vector.sub(camera.position).normalize()
  const distance = -camera.position.z / dir.z
  const pos = camera.position.clone().add(dir.multiplyScalar(distance * 2))
  mouseSphere.position.copy(pos)
})

// 连接线效果
const lineCount = 100
const linePositions = new Float32Array(lineCount * 6)
const lineGeo = new THREE.BufferGeometry()
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
const lineMat = new THREE.LineBasicMaterial({ 
  color: 0x4488ff, 
  transparent: true, 
  opacity: 0.2 
})
const lines = new THREE.LineSegments(lineGeo, lineMat)
scene.add(lines)

// 灯光
scene.add(new THREE.AmbientLight(0x222244, 0.5))

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  // 更新音频模拟
  audioSim.update(t)
  
  // 更新着色器uniforms
  particleMat.uniforms.uTime.value = t
  particleMat.uniforms.uAudioLow.value = audioSim.low
  particleMat.uniforms.uAudioMid.value = audioSim.mid
  particleMat.uniforms.uAudioHigh.value = audioSim.high
  
  // 更新粒子位置
  const pos = geo.attributes.position
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    
    // 基于相位的轨道运动
    const phase = phases[i]
    const orbit = orbits[i]
    const orbitSpeed = 0.1 + audioSim.mid * 0.3
    
    const x = pos.array[i3]
    const y = pos.array[i3 + 1]
    const z = pos.array[i3 + 2]
    
    const angle = orbitSpeed * t + phase
    const radius = Math.sqrt(x * x + z * z)
    
    // 添加螺旋运动
    const newX = x * Math.cos(orbitSpeed * 0.01) - z * Math.sin(orbitSpeed * 0.01)
    const newZ = x * Math.sin(orbitSpeed * 0.01) + z * Math.cos(orbitSpeed * 0.01)
    
    // 音频影响的速度变化
    const audioBoost = 1 + audioSim.low * 2
    
    pos.array[i3] += velocities[i3] * audioBoost + (newX - x) * 0.01
    pos.array[i3 + 1] += velocities[i3 + 1] * audioBoost + Math.sin(angle + y * 0.1) * 0.02
    pos.array[i3 + 2] += velocities[i3 + 2] * audioBoost + (newZ - z) * 0.01
    
    // 边界反弹
    const maxDist = 50
    if (Math.abs(pos.array[i3]) > maxDist) velocities[i3] *= -1
    if (Math.abs(pos.array[i3 + 1]) > maxDist) velocities[i3 + 1] *= -1
    if (Math.abs(pos.array[i3 + 2]) > maxDist) velocities[i3 + 2] *= -1
  }
  pos.needsUpdate = true
  
  // 更新连接线
  const linePos = lineGeo.attributes.position
  let lineIndex = 0
  for (let i = 0; i < lineCount && lineIndex < count - 1; i += 10) {
    const i3 = i * 3
    const nextI = Math.min(i + 1, count - 1)
    const nextI3 = nextI * 3
    
    // 只在近距离粒子间画线
    const dx = pos.array[i3] - pos.array[nextI3]
    const dy = pos.array[i3 + 1] - pos.array[nextI3 + 1]
    const dz = pos.array[i3 + 2] - pos.array[nextI3 + 2]
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    
    if (dist < 8) {
      linePos.array[lineIndex * 6] = pos.array[i3]
      linePos.array[lineIndex * 6 + 1] = pos.array[i3 + 1]
      linePos.array[lineIndex * 6 + 2] = pos.array[i3 + 2]
      linePos.array[lineIndex * 6 + 3] = pos.array[nextI3]
      linePos.array[lineIndex * 6 + 4] = pos.array[nextI3 + 1]
      linePos.array[lineIndex * 6 + 5] = pos.array[nextI3 + 2]
      lineIndex++
    }
  }
  linePos.needsUpdate = true
  lineGeo.setDrawRange(0, lineIndex * 2)
  
  // 鼠标球缩放动画
  const scale = 1 + audioSim.mid * 0.5 + Math.sin(t * 3) * 0.1
  mouseSphere.scale.setScalar(scale)
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  particleMat.uniforms.uPixelRatio.value = renderer.getPixelRatio()
})
