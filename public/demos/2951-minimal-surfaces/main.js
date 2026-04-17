// 2951. Minimal Surfaces
// 极小曲面可视化 — Schwarz P / Gyroid / Schwarz D 隐式曲面
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(20, 15, 30)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0x6666aa, 0.8))
const dir = new THREE.DirectionalLight(0xffffff, 1.5)
dir.position.set(10, 20, 10)
scene.add(dir)
const point1 = new THREE.PointLight(0x4488ff, 2, 80)
point1.position.set(-15, 10, 5)
scene.add(point1)
const point2 = new THREE.PointLight(0xff8844, 1.5, 80)
point2.position.set(15, -10, -5)
scene.add(point2)

// 参数
const params = {
  surface: 'Gyroid',
  scale: 4.0,
  resolution: 80,
  threshold: 0.0,
  wireframe: false,
  autoRotate: true,
  color1: '#4488ff',
  color2: '#ff8844'
}

let currentMesh = null

// 隐式曲面定义
function gyroid(p, scale) {
  return Math.sin(p.x * scale) * Math.cos(p.y * scale) +
         Math.sin(p.y * scale) * Math.cos(p.z * scale) +
         Math.sin(p.z * scale) * Math.cos(p.x * scale)
}

function schwarzP(p, scale) {
  const x = p.x * scale, y = p.y * scale, z = p.z * scale
  return Math.cos(x) + Math.cos(y) + Math.cos(z)
}

function schwarzD(p, scale) {
  const x = p.x * scale, y = p.y * scale, z = p.z * scale
  return Math.cos(x) * Math.cos(y) * Math.cos(z) -
         Math.sin(x) * Math.sin(y) * Math.sin(z)
}

function neovius(p, scale) {
  const x = p.x * scale, y = p.y * scale, z = p.z * scale
  return 3 * (Math.cos(x) + Math.cos(y) + Math.cos(z)) + 4 * Math.cos(x) * Math.cos(y) * Math.cos(z)
}

function schwarzH(p, scale) {
  const x = p.x * scale, y = p.y * scale
  return Math.cos(x) + Math.cos(y)
}

// Marching Cubes 表
const RES = params.resolution
const BOUNDS = 12

function buildSurface() {
  if (currentMesh) {
    scene.remove(currentMesh)
    currentMesh.geometry.dispose()
    if (currentMesh.material.dispose) currentMesh.material.dispose()
  }

  const sdf = (p) => {
    switch (params.surface) {
      case 'Gyroid': return gyroid(p, params.scale * 0.3)
      case 'SchwarzP': return schwarzP(p, params.scale * 0.25)
      case 'SchwarzD': return schwarzD(p, params.scale * 0.25)
      case 'Neovius': return neovius(p, params.scale * 0.15)
      case 'SchwarzH': return schwarzH(p, params.scale * 0.3)
      default: return gyroid(p, params.scale * 0.3)
    }
  }

  const positions = []
  const normals = []
  const step = BOUNDS * 2 / RES

  function lerp(a, b, t) { return a + t * (b - a) }

  for (let ix = 0; ix < RES; ix++) {
    for (let iy = 0; iy < RES; iy++) {
      for (let iz = 0; iz < RES; iz++) {
        const x0 = -BOUNDS + ix * step, x1 = x0 + step
        const y0 = -BOUNDS + iy * step, y1 = y0 + step
        const z0 = -BOUNDS + iz * step, z1 = z0 + step

        const v000 = sdf({ x: x0, y: y0, z: z0 })
        const v100 = sdf({ x: x1, y: y0, z: z0 })
        const v010 = sdf({ x: x0, y: y1, z: z0 })
        const v110 = sdf({ x: x1, y: y1, z: z0 })
        const v001 = sdf({ x: x0, y: y0, z: z1 })
        const v101 = sdf({ x: x1, y: y0, z: z1 })
        const v011 = sdf({ x: x0, y: y1, z: z1 })
        const v111 = sdf({ x: x1, y: y1, z: z1 })

        const thresh = params.threshold

        // 简化：仅检测简单穿越
        const vertices = []
        const mid = (a, b, va, vb) => {
          if (Math.abs(va - thresh) < 0.001 || Math.abs(vb - thresh) < 0.001) return null
          const t = (thresh - va) / (vb - va)
          return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) }
        }

        const pts = [
          { x: x0, y: y0, z: z0 }, { x: x1, y: y0, z: z0 },
          { x: x1, y: y1, z: z0 }, { x: x0, y: y1, z: z0 },
          { x: x0, y: y0, z: z1 }, { x: x1, y: y0, z: z1 },
          { x: x1, y: y1, z: z1 }, { x: x0, y: y1, z: z1 }
        ]
        const vals = [v000, v100, v110, v010, v001, v101, v111, v011]

        // 检查每个边
        const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
        for (const [a, b] of edges) {
          const va = vals[a] - thresh, vb = vals[b] - thresh
          if (va * vb < 0) {
            const m = mid(pts[a], pts[b], vals[a], vals[b])
            if (m) vertices.push(m)
          }
        }

        if (vertices.length >= 3) {
          for (let vi = 1; vi < vertices.length - 1; vi++) {
            const v1 = vertices[0], v2 = vertices[vi], v3 = vertices[vi + 1]
            positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z)
            const e1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z }
            const e2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z }
            const n = {
              x: e1.y * e2.z - e1.z * e2.y,
              y: e1.z * e2.x - e1.x * e2.z,
              z: e1.x * e2.y - e1.y * e2.x
            }
            const nl = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z) || 1
            normals.push(n.x / nl, n.y / nl, n.z / nl, n.x / nl, n.y / nl, n.z / nl, n.x / nl, n.y / nl, n.z / nl)
          }
        }
      }
    }
  }

  if (positions.length === 0) {
    buildFallbackMesh()
    return
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))

  const c1 = new THREE.Color(params.color1)
  const c2 = new THREE.Color(params.color2)

  const mat = new THREE.MeshPhysicalMaterial({
    color: c1.lerp(c2, 0.5),
    metalness: 0.3,
    roughness: 0.2,
    wireframe: params.wireframe,
    side: THREE.DoubleSide,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9
  })

  currentMesh = new THREE.Mesh(geo, mat)
  scene.add(currentMesh)
}

function buildFallbackMesh() {
  // Fallback: simple parametric gyroid surface
  const geo = new THREE.SphereGeometry(8, 32, 32)
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x4488ff,
    metalness: 0.2,
    roughness: 0.3,
    wireframe: params.wireframe,
    side: THREE.DoubleSide
  })
  currentMesh = new THREE.Mesh(geo, mat)
  scene.add(currentMesh)
}

buildSurface()

// GUI
const gui = new GUI()
gui.add(params, 'surface', ['Gyroid', 'SchwarzP', 'SchwarzD', 'Neovius', 'SchwarzH']).name('曲面类型').onChange(buildSurface)
gui.add(params, 'scale', 1, 12, 0.5).name('缩放').onChange(buildSurface)
gui.add(params, 'wireframe').name('线框模式').onChange(buildSurface)
gui.addColor(params, 'color1').name('颜色1').onChange(buildSurface)
gui.addColor(params, 'color2').name('颜色2').onChange(buildSurface)
gui.add(params, 'autoRotate').name('自动旋转')

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  if (params.autoRotate && currentMesh) {
    currentMesh.rotation.y = t * 0.1
    currentMesh.rotation.x = Math.sin(t * 0.05) * 0.1
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
