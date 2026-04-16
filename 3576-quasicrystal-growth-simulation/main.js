// 3576. Quasicrystal Growth Simulation - Aperiodic tilings (Penrose-style)
// type: mathematics-geometry
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x08080f)

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 40, 50)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 0, 0)

// Golden ratio
const phi = (1 + Math.sqrt(5)) / 2
const tau = 2 * Math.PI

// Penrose rhombus tiles (thick and thin)
class QuasicrystalRenderer {
  constructor() {
    this.group = new THREE.Group()
    this.mats = {
      thick: new THREE.MeshStandardMaterial({ color: 0xff6644, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide }),
      thin: new THREE.MeshStandardMaterial({ color: 0x44aaff, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide })
    }
    scene.add(this.group)
  }
  
  clear() {
    while (this.group.children.length) {
      const c = this.group.children[0]
      c.geometry.dispose()
      this.group.remove(c)
    }
  }
  
  // Draw a rhombus given center, angle, half-diagonals d1,d2, thickness
  addRhombus(cx, cy, angle, d1, d2, type) {
    const h = d2 * 0.5
    const w = d1
    const vertices = [
      -w/2, 0, -h,  w/2, 0, -h,
       w/2, 0,  h, -w/2, 0,  h
    ]
    const indices = [0,1,2, 0,2,3]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, this.mats[type])
    mesh.position.set(cx, 0, cy)
    mesh.rotation.y = angle
    this.group.add(mesh)
  }
  
  generatePenrose(order) {
    this.clear()
    // Deflate-based Penrose generation (simplified version)
    // Using inflation rules for rhombus tiles
    const tiles = this.createInitialRhombusSet()
    
    for (let iter = 0; iter < order; iter++) {
      const newTiles = []
      for (const tile of tiles) {
        const children = this.inflateTile(tile)
        newTiles.push(...children)
      }
      tiles.length = 0
      tiles.push(...newTiles)
    }
    
    for (const tile of tiles) {
      this.addRhombus(tile.x, tile.y, tile.angle, tile.d1, tile.d2, tile.type)
    }
  }
  
  createInitialSun() {
    const tiles = []
    const R = 15
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 72) * Math.PI / 180
      const a2 = ((i + 1) * 72) * Math.PI / 180
      const a3 = ((i + 0.5) * 72) * Math.PI / 180
      tiles.push({
        type: 'thick', x: 0, y: 0,
        angle: a3,
        d1: R, d2: R * phi,
        a1: a1, a2: a2
      })
    }
    return tiles
  }
  
  inflateTile(tile) {
    const children = []
    if (tile.type === 'thick') {
      // Inflate thick rhombus -> 2 thick + 1 thin
      const newR = tile.d2 / phi
      for (let i = 0; i < 2; i++) {
        const offset = (i - 0.5) * newR * 0.9
        children.push({
          type: 'thick', x: tile.x + offset, y: tile.y,
          angle: tile.angle + (i === 0 ? 0.4 : -0.4),
          d1: newR, d2: newR * phi
        })
      }
      children.push({
        type: 'thin', x: tile.x, y: tile.y,
        angle: tile.angle,
        d1: newR * phi, d2: newR
      })
    } else {
      // Inflate thin rhombus -> 1 thick + 1 thin
      const newR = tile.d1 / phi
      children.push({
        type: 'thick', x: tile.x, y: tile.y,
        angle: tile.angle + 0.6,
        d1: newR * phi, d2: newR * phi * phi
      })
      children.push({
        type: 'thin', x: tile.x, y: tile.y,
        angle: tile.angle - 0.4,
        d1: newR * phi, d2: newR
      })
    }
    return children
  }
}

const qr = new QuasicrystalRenderer()
qr.generatePenrose(4)

const params = { order: 4, autoRotate: true, wireframe: false }
const gui = new GUI()
gui.add(params, 'order', 1, 5, 1).name('Inflation Order').onChange(v => qr.generatePenrose(v))
gui.add(params, 'autoRotate').name('Auto Rotate')
gui.add(qr.mats.thick, 'wireframe').name('Wireframe')

// Ground
const groundGeo = new THREE.PlaneGeometry(100, 100)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.1
scene.add(ground)

scene.add(new THREE.AmbientLight(0x6666aa, 0.5))
const keyLight = new THREE.DirectionalLight(0xffffff, 1)
keyLight.position.set(10, 30, 20)
scene.add(keyLight)

const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:16px;left:16px;color:#aaa;font:11px monospace;background:rgba(0,0,0,0.7);padding:10px;border-radius:6px;line-height:1.6'
info.innerHTML = 'Aperiodic tiling with golden ratio φ = (1+√5)/2<br>No translational symmetry, 5-fold rotational symmetry'
document.body.appendChild(info)

function animate() {
  requestAnimationFrame(animate)
  if (params.autoRotate) qr.group.rotation.y += 0.002
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
