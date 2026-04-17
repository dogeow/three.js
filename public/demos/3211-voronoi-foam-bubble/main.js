// 3211 - Voronoi Foam Bubble
// Wet foam structure: soap bubbles with Plateau-Rayleigh borders
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d1117)
scene.add(new THREE.AmbientLight(0x8899ff, 0.5))
const dir = new THREE.DirectionalLight(0xffffff, 1.2)
dir.position.set(5, 10, 5)
scene.add(dir)
const point = new THREE.PointLight(0x6699ff, 1.5, 50)
point.position.set(-3, 4, 3)
scene.add(point)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 8, 25)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Generate Voronoi sites
const sites = []
const N = 32
for (let i = 0; i < N; i++) {
  sites.push({
    x: (Math.random() - 0.5) * 18,
    y: (Math.random() - 0.5) * 12 + 4,
    z: (Math.random() - 0.5) * 18,
    r: 0.4 + Math.random() * 0.8
  })
}

// Weierenstrass / Plateau border: render edges where 3 cells meet
// Use particle system at edge points (Jansen approximation)
const edgeGroup = new THREE.Group()
scene.add(edgeGroup)

// Render cells as transparent spheres
const cellGroup = new THREE.Group()
scene.add(cellGroup)
sites.forEach((s, i) => {
  const geo = new THREE.SphereGeometry(s.r, 16, 16)
  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color().setHSL(i / N * 0.6 + 0.5, 0.5, 0.55),
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    shininess: 100,
    specular: 0xffffff
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(s.x, s.y, s.z)
  cellGroup.add(mesh)
})

// Edge mesh approximation: connect site pairs that share a border
// Simplified: draw tubes at midpoints between close sites
function buildEdges() {
  while (edgeGroup.children.length) edgeGroup.remove(edgeGroup.children[0])
  const tubeMat = new THREE.MeshPhongMaterial({ color: 0xaaccff, transparent: true, opacity: 0.6, shininess: 80 })
  for (let i = 0; i < sites.length; i++) {
    for (let j = i + 1; j < sites.length; j++) {
      const s1 = sites[i], s2 = sites[j]
      const dx = s2.x - s1.x, dy = s2.y - s1.y, dz = s2.z - s1.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const r1 = s1.r, r2 = s2.r
      // If spheres just touch (within tolerance), draw edge at tangent
      if (Math.abs(dist - (r1 + r2)) < 0.4) {
        const mid = new THREE.Vector3((s1.x + s2.x) / 2, (s1.y + s2.y) / 2, (s1.z + s2.z) / 2)
        const dir2 = new THREE.Vector3(dx / dist, dy / dist, dz / dist)
        const perp = new THREE.Vector3(-dir2.z, 0, dir2.x).normalize()
        const curve = new THREE.QuadraticBezierCurve3(
          mid.clone().addScaledVector(perp, 0.5),
          mid,
          mid.clone().addScaledVector(perp, -0.5)
        )
        const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.06, 6, false)
        edgeGroup.add(new THREE.Mesh(tubeGeo, tubeMat))
      }
    }
  }
}
buildEdges()

// Info
const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:16px;left:16px;color:#aaccff;font-family:monospace;font-size:13px;background:rgba(13,17,23,0.85);padding:12px;border-radius:8px;line-height:1.8'
info.innerHTML = '<b>Voronoi Foam Bubble</b><br>Soap film Plateau borders<br>Drag to orbit'
document.body.appendChild(info)

let t = 0
function animate() {
  requestAnimationFrame(animate)
  t += 0.008
  // Gentle drift
  cellGroup.children.forEach((m, i) => {
    m.position.y = sites[i].y + Math.sin(t + i) * 0.15
    m.material.opacity = 0.2 + 0.08 * Math.sin(t * 1.3 + i)
  })
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
