// 4253. Liquid Crystal Nematic Display Sim
// 向列相液晶分子排列与偏振光可视化
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

// 液晶分子网格
const NX = 30, NY = 20
const molecules = []
const group = new THREE.Group()

// 每个分子用线段表示方向
for (let j = 0; j < NY; j++) {
  for (let i = 0; i < NX; i++) {
    // 初始：随机指向，但有微弱对齐倾向
    const baseAngle = Math.random() * Math.PI
    const initAngle = baseAngle + (Math.random() - 0.5) * 0.8
    const x = (i - NX / 2) * 2.5
    const y = (j - NY / 2) * 2.5

    // 分子颜色随方向变化
    const hue = ((initAngle / Math.PI) % 1)
    const color = new THREE.Color().setHSL(hue, 0.8, 0.55)

    const lineGeo = new THREE.BufferGeometry()
    const pts = new Float32Array([0, -1, 0, 0, 1, 0])
    lineGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
    const line = new THREE.Line(lineGeo, lineMat)
    line.position.set(x, y, 0)
    line.rotation.z = initAngle
    group.add(line)
    molecules.push({ line, angle: initAngle, baseAngle, x, y, i, j })
  }
}
scene.add(group)

// 偏振光效果：用彩色渐变背景模拟光穿过液晶
const bgGeo = new THREE.PlaneGeometry(80, 55)
const bgMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; varying vec2 vUv;
    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      // 随时间变化的光场
      float r = length(uv);
      float angle = atan(uv.y, uv.x);
      vec3 col = vec3(0.0);
      float t = uTime * 0.3;
      col.r = 0.5 + 0.5 * sin(angle * 3.0 + t);
      col.g = 0.5 + 0.5 * sin(angle * 3.0 + t + 2.094);
      col.b = 0.5 + 0.5 * sin(angle * 3.0 + t + 4.189);
      // 径向渐变暗角
      col *= 1.0 - r * 0.3;
      gl_FragColor = vec4(col, 0.12);
    }`,
  transparent: true,
  depthWrite: false
})
const bg = new THREE.Mesh(bgGeo, bgMat)
bg.position.z = -2
scene.add(bg)

// 点击应用外部场扰动
window.addEventListener('click', e => {
  const mx = (e.clientX / innerWidth * 2 - 1) * 20
  const my = -(e.clientY / innerHeight * 2 - 1) * 14
  for (const mol of molecules) {
    const dx = mx - mol.x, dy = my - mol.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 5) {
      mol.angle += (Math.random() - 0.5) * Math.PI * 0.5
    }
  }
})

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  bgMat.uniforms.uTime.value = t

  // Frank弹性系数：分子趋向于邻居的平均方向
  const K = 0.08
  for (let iter = 0; iter < 2; iter++) {
    for (const mol of molecules) {
      let sumSin = 0, sumCos = 0, cnt = 0
      for (const other of molecules) {
        if (other === mol) continue
        const dx = other.x - mol.x, dy = other.y - mol.y
        if (Math.abs(dx) < 3.5 && Math.abs(dy) < 3.5) {
          sumSin += Math.sin(2 * other.angle)
          sumCos += Math.cos(2 * other.angle)
          cnt++
        }
      }
      if (cnt > 0) {
        const target = 0.5 * Math.atan2(sumSin / cnt, sumCos / cnt)
        mol.angle += (target - mol.angle) * K
      }
      // 热波动
      mol.angle += (Math.random() - 0.5) * 0.005
      mol.line.rotation.z = mol.angle
      // 颜色随方向
      const hue = ((mol.angle / Math.PI) % 1 + 1) % 1
      mol.line.material.color.setHSL(hue, 0.8, 0.55)
    }
  }

  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
