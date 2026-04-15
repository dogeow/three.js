// 2675. Soft Body Cloth Sim
// 软体布料模拟
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 5, 20)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const W = 20, H = 20
const particles = [], constraints = []
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = { x: (x - W/2) * 0.5, y: 5, z: (y - H/2) * 0.5,
                 ox: (x - W/2) * 0.5, oy: 5, oz: (y - H/2) * 0.5, pinned: y === 0 }
    particles.push(p)
  }
}
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (x < W-1) constraints.push([i, i+1, 0.5])
    if (y < H-1) constraints.push([i, i+W, 0.5])
  }
}

const posArr = new Float32Array(W * H * 3)
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
const indices = []
for (let y = 0; y < H-1; y++) {
  for (let x = 0; x < W-1; x++) {
    const a = y*W+x, b=a+1, c=a+W, d=c+1
    indices.push(a,b,c, b,d,c)
  }
}
geo.setIndex(indices)
const cloth = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0xff4444, side: THREE.DoubleSide }))
cloth.visible = false
scene.add(cloth)
scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })))

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
scene.add(Object.assign(new THREE.DirectionalLight(0xffffff, 1), { position: new THREE.Vector3(10,20,10) }))
scene.add(new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshPhongMaterial({ color: 0x4488ff })))

const gravity = -0.001
function updateCloth() {
  for (const p of particles) {
    if (p.pinned) continue
    const vx=(p.x-p.ox)*0.99, vy=(p.y-p.oy)*0.99+gravity, vz=(p.z-p.oz)*0.99
    p.ox=p.x; p.oy=p.y; p.oz=p.z
    p.x+=vx; p.y+=vy; p.z+=vz
    const dx=p.x, dy=p.y-0, dz=p.z, d=Math.sqrt(dx*dx+dy*dy+dz*dz)
    if (d < 2.1) { const m=2.1/d; p.x=dx*m; p.y=dy*m; p.z=dz*m }
  }
  for (let iter=0; iter<5; iter++) {
    for (const [a,b,rest] of constraints) {
      const pa=particles[a], pb=particles[b]
      const dx=pb.x-pa.x, dy=pb.y-pa.y, dz=pb.z-pa.z
      const dist=Math.sqrt(dx*dx+dy*dy+dz*dz)
      const diff=(dist-rest)/dist*0.5
      if(!pa.pinned){pa.x+=dx*diff;pa.y+=dy*diff;pa.z+=dz*diff}
      if(!pb.pinned){pb.x-=dx*diff;pb.y-=dy*diff;pb.z-=dz*diff}
    }
  }
  for (let i=0; i<particles.length; i++) {
    posArr[i*3]=particles[i].x; posArr[i*3+1]=particles[i].y; posArr[i*3+2]=particles[i].z
  }
  geo.attributes.position.needsUpdate = true
  geo.computeVertexNormals()
}

function animate() {
  requestAnimationFrame(animate)
  updateCloth()
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
