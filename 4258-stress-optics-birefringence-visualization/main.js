// 4258. Stress Optics Birefringence Visualization
// 应力光学效应：光弹性材料的应力双折射可视化
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080810)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 20, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 透明应力体
const W = 20, H = 12
const bodyGeo = new THREE.BoxGeometry(W, H, 2, W * 2, H * 2, 2)
const bodyMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uLoad: { value: 0.5 } },
  vertexShader: `varying vec3 vPos; varying vec3 vN;
    void main() {
      vPos = position;
      vN = normalMatrix * normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `varying vec3 vPos; varying vec3 vN; uniform float uTime; uniform float uLoad;
    void main() {
      // 应力分布（简化：中心集中载荷）
      float sigma_x = vPos.x * (0.5 - vPos.y / float(${H}));
      float sigma_y = -vPos.y * 0.5;
      float tau_xy = vPos.x * 0.2 * sin(uTime * 0.5);

      // 主应力
      float sigma_avg = (sigma_x + sigma_y) * 0.5;
      float diff = sqrt((sigma_x - sigma_y) * (sigma_x - sigma_y) * 0.25 + tau_xy * tau_xy);
      float sigma1 = sigma_avg + diff;
      float sigma2 = sigma_avg - diff;

      // 应力光学定律：相位差 ∝ (sigma1 - sigma2) * 厚度
      float delta = abs(sigma1 - sigma2) * 0.3;
      vec3 slow = vec3(1.0, 0.0, 0.0);
      vec3 fast = vec3(0.0, 0.0, 1.0);
      vec3 col;
      float phase = delta * 6.28318 + uTime;

      // 干涉色：应力光学表
      float t = mod(delta * 3.0, 1.0);
      if (delta < 0.17) col = mix(slow, vec3(1.0, 1.0, 0.0), t * 6.0);
      else if (delta < 0.33) col = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.3, 0.0), (t - 0.17) * 6.0);
      else if (delta < 0.5) col = mix(vec3(1.0, 0.3, 0.0), vec3(0.8, 0.0, 0.0), (t - 0.33) * 6.0);
      else if (delta < 0.67) col = mix(vec3(0.8, 0.0, 0.0), vec3(0.5, 0.8, 0.3), (t - 0.5) * 6.0);
      else col = mix(vec3(0.5, 0.8, 0.3), fast, (t - 0.67) * 3.0);

      // 边缘暗纹（等倾线效果）
      float edge = pow(abs(dot(normalize(vN), vec3(0.0, 0.0, 1.0))), 2.0);
      col *= 0.3 + edge * 0.7;

      gl_FragColor = vec4(col, 0.7);
    }`,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false
})

const body = new THREE.Mesh(bodyGeo, bodyMat)
scene.add(body)

// 加载指示器
const loadGeo = new THREE.BoxGeometry(W * 1.1, 0.5, 2)
const loadMat = new THREE.MeshBasicMaterial({ color: 0xff4444 })
const loadBar = new THREE.Mesh(loadGeo, loadMat)
loadBar.position.y = H / 2 + 1
scene.add(loadBar)

// 支座
const supportGeo = new THREE.BoxGeometry(W * 1.2, 1, 3)
const supportMat = new THREE.MeshStandardMaterial({ color: 0x444444 })
scene.add(new THREE.Mesh(supportGeo, supportMat))

// 等色线
const isoGeo = new THREE.BufferGeometry()
const isoPositions = []
for (let y = -H / 2; y <= H / 2; y += 0.5) {
  for (let x = -W / 2; x <= W / 2; x += 0.1) {
    const sigma_x = x * (0.5 - y / H)
    const sigma_y = -y * 0.5
    const delta = Math.abs(sigma_x - sigma_y) * 0.3
    if (Math.abs(delta - Math.round(delta / 0.17) * 0.17) < 0.02) {
      isoPositions.push(x, y, 1.1)
    }
  }
}
isoGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(isoPositions), 3))
scene.add(new THREE.Points(isoGeo, new THREE.PointsMaterial({ color: 0xffff00, size: 0.15 })))

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
scene.add(Object.assign(new THREE.DirectionalLight(0xffffff, 0.8), { position: new THREE.Vector3(20, 30, 20) }))

const clock = new THREE.Clock()
let loadDir = 1
let loadVal = 0.3

window.addEventListener('click', () => { loadDir *= -1 })

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  loadVal += loadDir * 0.002
  loadVal = Math.max(0.05, Math.min(0.95, loadVal))
  bodyMat.uniforms.uLoad.value = loadVal
  bodyMat.uniforms.uTime.value = t

  loadBar.position.y = H / 2 + 1 + loadVal * 3
  loadBar.scale.y = 0.5 + loadVal * 2

  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
