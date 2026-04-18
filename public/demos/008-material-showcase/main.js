// 008. Material Showcase — 四种材质对比演示
// MeshBasicMaterial：不收光照影响 | MeshLambertMaterial：漫反射
// MeshPhongMaterial：镜面高光 | MeshStandardMaterial：PBR 材质
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b0f17)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 4.5, 16)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.target.set(0, 1.6, 0)

const info = document.createElement('div')
info.style.cssText = [
  'position:fixed',
  'top:12px',
  'left:12px',
  'padding:10px 14px',
  'border-radius:10px',
  'background:rgba(0,0,0,0.38)',
  'backdrop-filter:blur(10px)',
  'border:1px solid rgba(255,255,255,0.08)',
  'color:#eef4ff',
  'font:13px/1.6 -apple-system, BlinkMacSystemFont, sans-serif',
  'z-index:10',
  'pointer-events:none',
].join(';')
info.innerHTML = '固定相同几何体与相同灯光，只替换材质类型。拖动观察光照与高光差异。'
document.body.appendChild(info)

const legend = document.createElement('div')
legend.style.cssText = [
  'position:fixed',
  'left:50%',
  'bottom:14px',
  'transform:translateX(-50%)',
  'display:grid',
  'grid-template-columns:repeat(4, minmax(150px, 1fr))',
  'gap:10px',
  'width:min(860px, calc(100vw - 24px))',
  'color:#d5e7ff',
  'font:12px/1.45 -apple-system, BlinkMacSystemFont, sans-serif',
  'pointer-events:none',
].join(';')
legend.innerHTML = [
  '<span style="padding:8px 10px;border-radius:10px;background:rgba(8,12,20,.52);border:1px solid rgba(255,255,255,.08)"><strong>Basic</strong><br>不受光照</span>',
  '<span style="padding:8px 10px;border-radius:10px;background:rgba(8,12,20,.52);border:1px solid rgba(255,255,255,.08)"><strong>Lambert</strong><br>漫反射</span>',
  '<span style="padding:8px 10px;border-radius:10px;background:rgba(8,12,20,.52);border:1px solid rgba(255,255,255,.08)"><strong>Phong</strong><br>高光明显</span>',
  '<span style="padding:8px 10px;border-radius:10px;background:rgba(8,12,20,.52);border:1px solid rgba(255,255,255,.08)"><strong>Standard</strong><br>PBR 粗糙/金属</span>',
].join('')
document.body.appendChild(legend)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(26, 10),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.96, metalness: 0.04 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const grid = new THREE.GridHelper(26, 26, 0x22324a, 0x111a28)
grid.position.y = 0.01
scene.add(grid)

// 四种材质对比
// 注意：MeshBasicMaterial 不受光照影响，其他三种需要光照才能可见
const materials = [
  {
    mat: new THREE.MeshBasicMaterial({ color: 0x7dd3fc }),
    title: 'MeshBasicMaterial',
    desc: '完全不受光照影响，始终显示指定颜色。常用于调试或不需要光照效果的场景（如 2D UI）。',
    pos: [-7.5, 0, 0],
  },
  {
    mat: new THREE.MeshLambertMaterial({ color: 0x7dd3fc }),
    title: 'MeshLambertMaterial',
    desc: '兰伯特漫反射模型，计算简单，适合不需要高光的场景。性能好但光照效果较平淡。',
    pos: [-2.5, 0, 0],
  },
  {
    mat: new THREE.MeshPhongMaterial({
      color: 0x7dd3fc,
      shininess: 80,        // 高光强度（值越大高光越集中）
    }),
    title: 'MeshPhongMaterial',
    desc: '包含镜面高光，可以做出金属、塑料质感。shininess 控制高光锐度。',
    pos: [2.5, 0, 0],
  },
  {
    mat: new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.3,       // 粗糙度：0=完全光滑高反，1=完全粗糙
      metalness: 0.6,       // 金属度：0=非金属，1=金属
    }),
    title: 'MeshStandardMaterial',
    desc: 'PBR（基于物理的渲染）材质。roughness + metalness 两个参数即可覆盖大多数真实材质。推荐优先使用。',
    pos: [7.5, 0, 0],
  },
]

const showcaseItems = []
const sharedSphere = new THREE.SphereGeometry(1.15, 48, 32)
const sharedKnot = new THREE.TorusKnotGeometry(0.72, 0.22, 160, 24)

materials.forEach(({ mat, pos }) => {
  const group = new THREE.Group()
  group.position.set(pos[0], 0, pos[2])

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.45, 0.42, 36),
    new THREE.MeshStandardMaterial({ color: 0x263244, roughness: 0.92, metalness: 0.08 })
  )
  pedestal.position.y = 0.21
  pedestal.receiveShadow = true
  group.add(pedestal)

  const sphere = new THREE.Mesh(sharedSphere, mat.clone())
  sphere.position.y = 1.85
  sphere.castShadow = true
  sphere.receiveShadow = true
  group.add(sphere)

  const knot = new THREE.Mesh(sharedKnot, mat.clone())
  knot.position.y = 4.15
  knot.castShadow = true
  knot.receiveShadow = true
  group.add(knot)

  scene.add(group)
  showcaseItems.push({ sphere, knot })
})

// 光照（Basic 不受影响，其他三种都需要光照才能可见）
const ambient = new THREE.AmbientLight(0xffffff, 0.28)
scene.add(ambient)

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(6, 10, 8)
dirLight.castShadow = true
scene.add(dirLight)

const pointLight = new THREE.PointLight(0x9cc4ff, 14, 50, 2)
pointLight.position.set(-10, 6, 4)
scene.add(pointLight)

const pointLightMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xb9d4ff })
)
scene.add(pointLightMarker)

const hemi = new THREE.HemisphereLight(0x203860, 0x10131b, 0.5)
scene.add(hemi)

function animate() {
  requestAnimationFrame(animate)
  const time = performance.now() * 0.001

  showcaseItems.forEach(({ sphere, knot }, index) => {
    sphere.rotation.y = time * 0.55 + index * 0.25
    knot.rotation.x = time * 0.45 + index * 0.15
    knot.rotation.y = time * 0.8 + index * 0.2
  })

  pointLight.position.set(Math.sin(time) * 8, 6 + Math.sin(time * 1.6) * 1.5, Math.cos(time) * 6)
  pointLightMarker.position.copy(pointLight.position)

  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
