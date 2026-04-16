// 3577. Origami Rigid Fold Physics - Miura fold and rigid origami mechanics
// type: physics-simulation
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0f0f18)

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 500)
camera.position.set(20, 25, 35)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Origami sheet made of rigid panels connected by folds
class RigidOrigami {
  constructor() {
    this.group = new THREE.Group()
    this.panels = []
    this.folds = []
    this.foldAngle = 0
    scene.add(this.group)
  }
  
  createMiuraSheet(cols, rows, size) {
    // Clear existing
    while (this.group.children.length) this.group.remove(this.group.children[0])
    this.panels = []
    
    const halfW = cols * size * 0.5
    const halfH = rows * size * 0.5
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Each panel is a parallelogram
        const geo = new THREE.BufferGeometry()
        // Diamond shape vertices
        const hw = size * 0.48
        const hh = size * 0.48
        const x0 = c * size - halfW + (r % 2) * size * 0.5
        const z0 = r * size * 0.866 - halfH
        
        const verts = new Float32Array([
          x0 - hw*0.5, 0, z0,
          x0 + hw*0.5, 0, z0 + hh*0.3,
          x0 + hw*0.5, 0, z0 + hh*1.3,
          x0 - hw*0.5, 0, z0 + hh*1.0
        ])
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
        geo.setIndex([0,1,2, 0,2,3])
        geo.computeVertexNormals()
        
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL((c + r) * 0.1, 0.4, 0.5),
          metalness: 0.1, roughness: 0.6, side: THREE.DoubleSide
        })
        const mesh = new THREE.Mesh(geo, mat)
        
        this.panels.push({
          mesh,
          baseX: x0, baseZ: z0,
          col: c, row: r,
          verts: verts.slice()
        })
        this.group.add(mesh)
      }
    }
    
    // Fold lines
    const foldMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    for (let r = 0; r <= rows; r++) {
      const pts = []
      for (let c = 0; c <= cols; c++) {
        const x = c * size - halfW + (r % 2) * size * 0.5 - size * 0.5
        const z = r * size * 0.866 - halfH
        pts.push(new THREE.Vector3(x, 0.01, z))
      }
      const foldGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const foldLine = new THREE.Line(foldGeo, foldMat)
      this.group.add(foldLine)
    }
  }
  
  setFoldAngle(theta) {
    this.foldAngle = theta
    const cosT = Math.cos(theta)
    const sinT = Math.sin(theta)
    
    for (const panel of this.panels) {
      // Mountain/valley fold based on position
      const isMountain = (panel.col + panel.row) % 2 === 0
      const sign = isMountain ? 1 : -1
      const foldFactor = sign * sinT * 0.5
      
      const pos = panel.mesh.position
      const v = panel.verts
      const newVerts = []
      
      // Apply fold transformation to each vertex
      for (let i = 0; i < 4; i++) {
        const vx = v[i*3]
        const vz = v[i*3+2]
        const foldDist = (vz + panel.baseZ) * foldFactor
        newVerts.push(vx, foldDist, vz)
      }
      
      const geo = panel.mesh.geometry
      geo.attributes.position.array.set(newVerts)
      geo.attributes.position.needsUpdate = true
      geo.computeVertexNormals()
    }
  }
  
  dispose() {
    scene.remove(this.group)
  }
}

const origami = new RigidOrigami()
origami.createMiuraSheet(8, 6, 3)

const params = { foldAngle: 0, cols: 8, rows: 6, size: 3, regenerated: 0 }
const gui = new GUI()
gui.add(params, 'foldAngle', 0, Math.PI/2, 0.01).name('Fold Angle θ').onChange(v => origami.setFoldAngle(v))
gui.add(params, 'cols', 3, 12, 1).name('Columns').onChange(() => { origami.createMiuraSheet(params.cols, params.rows, params.size); origami.setFoldAngle(params.foldAngle) })
gui.add(params, 'rows', 3, 10, 1).name('Rows').onChange(() => { origami.createMiuraSheet(params.cols, params.rows, params.size); origami.setFoldAngle(params.foldAngle) })
gui.add(params, 'size', 1, 5, 0.5).name('Panel Size')

// Ground
const groundGeo = new THREE.PlaneGeometry(100, 100)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x15151f })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.5
scene.add(ground)

scene.add(new THREE.AmbientLight(0x8888aa, 0.4))
const keyLight = new THREE.DirectionalLight(0xffffff, 0.9)
keyLight.position.set(10, 30, 15)
scene.add(keyLight)
const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3)
fillLight.position.set(-10, 10, -10)
scene.add(fillLight)

const info = document.createElement('div')
info.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#888;font:12px monospace;text-align:center;background:rgba(0,0,0,0.7);padding:10px 20px;border-radius:6px'
info.textContent = 'Miura-fold rigid origami — folds flat without bending panels'
document.body.appendChild(info)

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
