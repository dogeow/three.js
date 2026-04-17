import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000308)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 1, 6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// ============ Hologram ShaderMaterial ============
const hologramMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x66e8ff) },
    uFresnelPower: { value: 2.5 }
  },
  transparent: true,
  side: THREE.DoubleSide,
  // 关键：depthWrite = false + 加法混合，让全息体能相互叠加、透出背后
  depthWrite: false,
  blending: THREE.AdditiveBlending,

  vertexShader: /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    void main() {
      // 世界空间法线和视线方向 —— Fresnel 要用
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vNormal = normalize(mat3(modelMatrix) * normal);
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uFresnelPower;

    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    // 轻量伪噪声
    float hash(float n) { return fract(sin(n) * 43758.5453); }

    void main() {
      // ===== Fresnel 边缘发光 =====
      float fresnel = 1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
      fresnel = pow(fresnel, uFresnelPower);

      // ===== 水平扫描线（基于世界 y 坐标）=====
      float scan = sin(vWorldPos.y * 40.0 - uTime * 3.0) * 0.5 + 0.5;
      scan = smoothstep(0.4, 0.8, scan);

      // ===== 闪烁：按时间 + 高度做随机抖动 =====
      float glitch = hash(floor(vWorldPos.y * 20.0) + floor(uTime * 8.0));
      glitch = glitch > 0.9 ? 0.5 : 1.0;

      // 合成亮度：边缘强 + 扫描线辅助 + 闪烁
      float intensity = fresnel * 1.5 + scan * 0.25;
      intensity *= glitch;

      // alpha 跟随亮度，让内部半透明，边缘实
      gl_FragColor = vec4(uColor * intensity, intensity);
    }
  `
})

// ============ 几个全息体 ============
const objects = []

const geometries = [
  new THREE.IcosahedronGeometry(0.8, 0),
  new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16),
  new THREE.ConeGeometry(0.7, 1.4, 32),
  new THREE.OctahedronGeometry(0.8, 0),
  new THREE.SphereGeometry(0.7, 32, 32)
]

geometries.forEach((geo, i) => {
  const mesh = new THREE.Mesh(geo, hologramMaterial)
  const angle = (i / geometries.length) * Math.PI * 2
  mesh.position.set(Math.cos(angle) * 2.5, 0.5, Math.sin(angle) * 2.5)
  scene.add(mesh)
  objects.push(mesh)
})

// 中心主体：独立一个大的
const center = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.9, 0.3, 200, 32),
  hologramMaterial
)
center.position.y = 1.5
scene.add(center)

// 底座网格地面
const grid = new THREE.GridHelper(20, 40, 0x0088aa, 0x003355)
grid.position.y = -1
scene.add(grid)

// ============ 用 Bloom 放大发光效果 ============
const composer = new EffectComposer(renderer)
composer.setPixelRatio(devicePixelRatio)
composer.setSize(innerWidth, innerHeight)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.2, 0.6, 0.0))
composer.addPass(new OutputPass())

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  hologramMaterial.uniforms.uTime.value = t

  objects.forEach((m, i) => {
    m.rotation.x += 0.008
    m.rotation.y += 0.012
  })
  center.rotation.y = t * 0.5

  controls.update()
  composer.render()
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})