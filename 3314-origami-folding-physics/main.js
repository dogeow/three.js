// 3314. Origami Folding Physics
// 折纸折叠动画 - CatmullRom曲线 + 顶点动画实现折痕
// type: origami-folding-physics
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d1117)
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 8, 16)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new THREE.OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
dirLight.position.set(5, 10, 5)
scene.add(dirLight)
const fillLight = new THREE.PointLight(0x88aaff, 0.5, 50)
fillLight.position.set(-5, 5, -5)
scene.add(fillLight)

// 纸张参数
const W = 8, H = 8
const NX = 20, NY = 20
const DX = W / NX, DY = H / NY

// 创建折纸几何体 (每格两个三角形)
// 折痕曲线: 沿对角线折叠
function createOrigamiGeo() {
  const positions = []
  const normals = []
  const uvs = []
  const indices = []

  for (let j = 0; j <= NY; j++) {
    for (let i = 0; i <= NX; i++) {
      const x = (i / NX - 0.5) * W
      const y = (j / NY - 0.5) * H
      const uvx = i / NX, uvy = j / NY

      // 折痕: 沿 x=y 这条对角线, 折起一侧
      // 折叠角度随时间变化
      const distToDiag = Math.abs(x - y) / Math.sqrt(2)
      const foldStrength = Math.max(0, 1 - distToDiag / 2.5)
      
      // 折起高度
      let z = 0
      if (x > y) {
        z = foldStrength * 3.0
      }
      // 轻微波浪起伏
      z += Math.sin(uvx * Math.PI * 4) * 0.05 + Math.sin(uvy * Math.PI * 4) * 0.05

      positions.push(x, z, y)
      normals.push(0, 1, 0)
      uvs.push(uvx, uvy)
    }
  }

  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i
      const b = a + 1
      const c = a + (NX + 1)
      const d = c + 1
      indices.push(a, b, c)
      indices.push(b, d, c)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

// 折纸材质
const origamiMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uFoldAngle: { value: 0 },
    uLightDir: { value: new THREE.Vector3(1, 2, 1).normalize() }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uFoldAngle;
    varying vec3 vNormal;
    varying vec3 vPos;
    varying vec2 vUv;
    
    void main() {
      vec3 pos = position;
      float i = uv.x; float j = uv.y;
      float x = (i - 0.5) * 8.0;
      float y = (j - 0.5) * 8.0;
      
      // 折痕沿 x=y 对角线
      float distDiag = abs(x - y) / 1.4142;
      float fold = smoothstep(0.0, 3.0, distDiag);
      float side = sign(x - y + 0.001);
      
      // 折叠高度
      float foldH = side * fold * uFoldAngle * 4.0;
      pos.y = foldH;
      
      // 折痕处法线突变
      vec3 n = vec3(0.0, 1.0, 0.0);
      if (distDiag < 0.5) {
        float crease = 1.0 - distDiag / 0.5;
        n = mix(vec3(-side, 0.0, side) * 0.707, vec3(0,1,0), crease);
      }
      
      vNormal = normalMatrix * n;
      vPos = (modelMatrix * vec4(pos, 1.0)).xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uLightDir;
    varying vec3 vNormal;
    varying vec3 vPos;
    varying vec2 vUv;
    
    void main() {
      vec3 n = normalize(vNormal);
      float diff = max(dot(n, uLightDir), 0.0);
      
      // 折纸风格双色
      float side = step(0.5, fract((vUv.x - vUv.y) * 4.0 + 0.25));
      vec3 col1 = vec3(0.95, 0.95, 0.92); // 白色面
      vec3 col2 = vec3(0.85, 0.82, 0.78); // 灰色面
      vec3 col = mix(col1, col2, side);
      
      // 边缘线
      float edgeX = smoothstep(0.02, 0.0, min(vUv.x, 1.0 - vUv.x));
      float edgeY = smoothstep(0.02, 0.0, min(vUv.y, 1.0 - vUv.y));
      float edge = max(edgeX, edgeY);
      col = mix(col, vec3(0.3, 0.3, 0.35), edge * 0.5);
      
      // 折痕暗线
      float diag = abs(fract((vUv.x - vUv.y) * 8.0) - 0.5);
      col = mix(col, col * 0.85, smoothstep(0.08, 0.0, diag) * step(0.5, vUv.x));
      
      col *= (0.3 + 0.7 * diff);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.DoubleSide
})

const origami = new THREE.Mesh(createOrigamiGeo(), origamiMat)
scene.add(origami)

// 折痕线
const creaseGeo = new THREE.BufferGeometry()
const creasePos = []
for (let t = 0; t <= 1; t += 0.01) {
  creasePos.push((t - 0.5) * 8, 0, (t - 0.5) * 8)
}
creaseGeo.setAttribute('position', new THREE.Float32BufferAttribute(creasePos, 3))
const creaseLine = new THREE.Line(creaseGeo, new THREE.LineBasicMaterial({ color: 0xff4400 }))
scene.add(creaseLine)

// 折叠动画状态机
let phase = 0 // 0: flat, 1: folding, 2: folded, 3: unfolding
let foldT = 0
const FOLD_SPEED = 0.5

// 地面网格
const grid = new THREE.GridHelper(20, 20, 0x334422, 0x223311)
scene.add(grid)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  const t = clock.getElapsedTime()
  
  origamiMat.uniforms.uTime.value = t
  
  // 折叠动画循环
  if (phase === 0 && t > 1.0) phase = 1
  if (phase === 1) {
    foldT = Math.min(1, foldT + dt * FOLD_SPEED)
    origamiMat.uniforms.uFoldAngle.value = foldT
    creaseLine.position.y = foldT * 2.0
    if (foldT >= 1) { phase = 2; setTimeout(() => phase = 3, 1500) }
  }
  if (phase === 3) {
    foldT = Math.max(0, foldT - dt * FOLD_SPEED)
    origamiMat.uniforms.uFoldAngle.value = foldT
    creaseLine.position.y = foldT * 2.0
    if (foldT <= 0) { phase = 0 }
  }
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
