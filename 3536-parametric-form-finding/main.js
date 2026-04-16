// 3536. Parametric Form Finding
// Parametric Form Finding — structural optimization via forces
// type: parametric-form
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111827)
scene.fog = new THREE.FogExp2(0x111827, 0.015)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 40, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Parametric surface: monkey saddle variant
const p = {
  a: 3.0, b: 2.0, c: 1.5, n: 3, m: 2, scale: 12, heightScale: 4,
  wireframe: false, animSpeed: 0.3, colorMode: 0
}

function parametricSurface(u, v) {
  const theta = u * Math.PI * 2
  const phi = v * Math.PI
  const r = p.scale * (
    Math.cos(p.n * theta) * Math.cos(p.m * phi) * p.a +
    Math.sin(p.n * theta) * Math.sin(p.m * phi) * p.b +
    (v - 0.5) * p.c
  )
  const x = r * Math.sin(phi)
  const y = r * Math.cos(phi) * p.heightScale * (v - 0.5)
  const z = r * Math.cos(phi) * Math.cos(theta)
  return new THREE.Vector3(x, y, z)
}

const SEG_U = 80, SEG_V = 40
const positions = new Float32Array((SEG_U + 1) * (SEG_V + 1) * 3)
const normals = new Float32Array((SEG_U + 1) * (SEG_V + 1) * 3)
const uvs = new Float32Array((SEG_U + 1) * (SEG_V + 1) * 2)
const colors = new Float32Array((SEG_U + 1) * (SEG_V + 1) * 3)
const indices = []

function buildGeometry(time) {
  let idx = 0
  for (let j = 0; j <= SEG_V; j++) {
    for (let i = 0; i <= SEG_U; i++) {
      const u = i / SEG_U
      const v = j / SEG_V
      const offset = (u - 0.5) * (v - 0.5) * Math.sin(time * p.animSpeed)
      const pnt = parametricSurface(u + offset * 0.1, v + offset * 0.05)
      positions[idx * 3] = pnt.x
      positions[idx * 3 + 1] = pnt.y
      positions[idx * 3 + 2] = pnt.z

      // Height-based coloring
      const h = (pnt.y / p.scale) * 0.5 + 0.5
      if (p.colorMode === 0) {
        colors[idx * 3] = 0.2 + h * 0.8
        colors[idx * 3 + 1] = 0.4 + h * 0.4
        colors[idx * 3 + 2] = 0.8 + h * 0.2
      } else if (p.colorMode === 1) {
        const t = (Math.sin(u * 10 + time) * 0.5 + 0.5) * (Math.sin(v * 8 + time * 0.7) * 0.5 + 0.5)
        colors[idx * 3] = t; colors[idx * 3 + 1] = 1 - t * 0.3; colors[idx * 3 + 2] = 1 - t
      } else {
        const n1 = Math.sin(u * 15 + time * 0.5)
        const n2 = Math.cos(v * 12 - time * 0.3)
        colors[idx * 3] = n1 * 0.5 + 0.5; colors[idx * 3 + 1] = n2 * 0.5 + 0.5; colors[idx * 3 + 2] = (n1 * n2) * 0.5 + 0.5
      }

      uvs[idx * 2] = u; uvs[idx * 2 + 1] = v
      idx++
    }
  }
  indices.length = 0
  for (let j = 0; j < SEG_V; j++) {
    for (let i = 0; i < SEG_U; i++) {
      const a = j * (SEG_U + 1) + i
      const b = a + 1
      const c = a + SEG_U + 1
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
}

buildGeometry(0)

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
geo.setIndex(indices)
geo.computeVertexNormals()

const mat = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide
})
const wireMat = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true, transparent: true, opacity: 0.3 })
const surfMesh = new THREE.Mesh(geo, mat)
const wireMesh = new THREE.Mesh(geo, wireMat)
scene.add(surfMesh)
scene.add(wireMesh)

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x1a1a2e })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -p.scale * p.heightScale * 0.6
ground.receiveShadow = true
scene.add(ground)

// Grid
const grid = new THREE.GridHelper(200, 40, 0x333355, 0x222244)
grid.position.y = ground.position.y + 0.05
scene.add(grid)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xffffff, 1)
sun.position.set(30, 60, 30)
sun.castShadow = true
scene.add(sun)

const gui = new GUI()
gui.add(p, 'n', 1, 8, 1).name('N (radial)').onChange(() => buildGeometry(0))
gui.add(p, 'm', 1, 8, 1).name('M (vertical)').onChange(() => buildGeometry(0))
gui.add(p, 'scale', 1, 20).name('Scale').onChange(() => buildGeometry(0))
gui.add(p, 'heightScale', 0.1, 8).name('Height Scale').onChange(() => buildGeometry(0))
gui.add(p, 'animSpeed', 0, 2).name('Anim Speed')
gui.add(p, 'wireframe').name('Wireframe').onChange(v => { wireMesh.visible = v })
gui.add(p, 'colorMode', { 'Height': 0, 'Animated': 1, 'Noise': 2 }).name('Color')

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  buildGeometry(t)
  geo.attributes.position.needsUpdate = true
  geo.attributes.color.needsUpdate = true
  geo.computeVertexNormals()
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
