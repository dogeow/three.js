import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000010)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(4, 4, 6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// ============ 自定义着色器 ============
// Vertex Shader: 对每个顶点运行一次，决定顶点在屏幕上的位置
// Fragment Shader: 对每个像素运行一次，决定该像素的颜色

const vertexShader = /* glsl */`
  uniform float uTime;
  varying float vHeight;   // varying: 顶点->片元 之间传值
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // position 是 Three.js 自动注入的「顶点局部坐标」
    vec3 p = position;

    // 用 sin/cos 组合出水波纹
    float wave = sin(p.x * 2.0 + uTime * 2.0) * 0.3
               + cos(p.z * 2.5 + uTime * 1.5) * 0.2;
    p.y += wave;
    vHeight = wave;

    // projectionMatrix * modelViewMatrix 是 Three.js 自动注入的变换矩阵
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const fragmentShader = /* glsl */`
  uniform float uTime;
  varying float vHeight;
  varying vec2 vUv;

  void main() {
    // 按波高做颜色渐变：低谷=深蓝，波峰=青白
    vec3 low  = vec3(0.05, 0.2, 0.6);
    vec3 high = vec3(0.6, 0.95, 1.0);
    float t = smoothstep(-0.3, 0.5, vHeight);
    vec3 color = mix(low, high, t);

    // 加一点时间驱动的发光条纹
    float stripe = sin(vUv.x * 30.0 + uTime * 3.0) * 0.05;
    color += stripe;

    gl_FragColor = vec4(color, 1.0);
  }
`

const geometry = new THREE.PlaneGeometry(6, 6, 128, 128) // 高密度分段才能表现波纹
geometry.rotateX(-Math.PI / 2)

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 } // 每帧更新
  },
  side: THREE.DoubleSide
})

const water = new THREE.Mesh(geometry, material)
scene.add(water)

// 轴辅助
scene.add(new THREE.AxesHelper(2))

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  material.uniforms.uTime.value = clock.getElapsedTime()
  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})