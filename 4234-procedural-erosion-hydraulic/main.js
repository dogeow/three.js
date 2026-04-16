// 4234. Procedural Erosion Hydraulic
// Hydraulic erosion simulation for procedural terrain generation
// type: simulation

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a2535)
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(60, 50, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0x8899bb, 0.5))
const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2)
dirLight.position.set(50, 80, 30)
dirLight.castShadow = true
scene.add(dirLight)
scene.add(new THREE.DirectionalLight(0x4488cc, 0.3))

const GRID = 128
const CELL = 1.0
const heights = new Float32Array((GRID+1)*(GRID+1))

function idx(x, z) { return z*(GRID+1)+x }

function hash(n) { return Math.abs(Math.sin(n) * 43758.5453) % 1 }
function noise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = x-ix, fz = z-iz
  const ux = fx*fx*(3-2*fx), uz = fz*fz*(3-2*fz)
  const a = hash(ix+iz*57), b = hash(ix+1+iz*57)
  const c = hash(ix+(iz+1)*57), d = hash(ix+1+(iz+1)*57)
  return (a*(1-ux)+b*ux)*(1-uz) + (c*(1-ux)+d*ux)*uz
}
function fbm(x, z, oct=6) {
  let v=0, a=0.5, f=1, mx=0
  for (let i=0;i<oct;i++) { v+=noise2(x*f,z*f)*a; mx+=a; a*=0.5; f*=2 }
  return v/mx
}

function generateTerrain() {
  for (let z=0; z<=GRID; z++)
  for (let x=0; x<=GRID; x++) {
    const nx = x/GRID*4-2, nz = z/GRID*4-2
    let h = fbm(nx, nz, 7) * 18
    const d = Math.sqrt(nx*nx+nz*nz)/Math.sqrt(8)*2
    const island = Math.max(0, 1 - Math.pow(d, 3)*0.8)
    h *= island
    heights[idx(x,z)] = h
  }
}
generateTerrain()

const terrainGeo = new THREE.PlaneGeometry(GRID*CELL, GRID*CELL, GRID, GRID)
terrainGeo.rotateX(-Math.PI/2)
const pos = terrainGeo.attributes.position
terrainGeo.computeVertexNormals()

function updateMesh() {
  for (let z=0; z<=GRID; z++)
  for (let x=0; x<=GRID; x++)
    pos.setY(idx(x,z), heights[idx(x,z)])
  pos.needsUpdate = true
  terrainGeo.computeVertexNormals()
}
updateMesh()

const terrainMat = new THREE.MeshStandardMaterial({
  color: 0x3d6b4f, roughness: 0.85, metalness: 0.05, flatShading: true
})
const terrain = new THREE.Mesh(terrainGeo, terrainMat)
terrain.receiveShadow = true
terrain.castShadow = true
scene.add(terrain)

const waterGeo = new THREE.PlaneGeometry(GRID*CELL, GRID*CELL)
waterGeo.rotateX(-Math.PI/2)
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x1a4a7a, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.3
})
const water = new THREE.Mesh(waterGeo, waterMat)
water.position.y = 1.5
scene.add(water)

const inertia = 0.05
const sedimentCapacity = 4.0
const deposition = 0.3
const erosion = 0.3
const evaporation = 0.01
const gravity = 4.0
const maxDropletLifetime = 30
const erosionRadius = 3
const erosionBrush = []
for (let dx=-erosionRadius; dx<=erosionRadius; dx++)
for (let dz=-erosionRadius; dz<=erosionRadius; dz++) {
  const dist = Math.sqrt(dx*dx+dz*dz)
  if (dist <= erosionRadius) erosionBrush.push({dx, dz, weight: Math.max(0, erosionRadius-dist)})
}

class Droplet {
  constructor() {
    this.x = Math.random() * GRID
    this.z = Math.random() * GRID
    this.dirX = 0; this.dirZ = 0
    this.speed = 1.0
    this.water = 1.0
    this.sediment = 0.0
    this.life = Math.floor(Math.random()*maxDropletLifetime)
  }
  getH(x, z) {
    const ix = Math.max(0,Math.min(GRID,Math.floor(x)))
    const iz = Math.max(0,Math.min(GRID,Math.floor(z)))
    const fx = x-ix, fz = z-iz
    const h00=heights[idx(ix,iz)], h10=heights[idx(ix+1,iz)]
    const h01=heights[idx(ix,iz+1)], h11=heights[idx(ix+1,iz+1)]
    return (h00*(1-fx)+h10*fx)*(1-fz) + (h01*(1-fx)+h11*fx)*fz
  }
  step() {
    const gx = this.getH(this.x+0.5,this.z) - this.getH(this.x-0.5,this.z)
    const gz = this.getH(this.x,this.z+0.5) - this.getH(this.x,this.z-0.5)
    this.dirX = this.dirX*inertia - gx*(1-inertia)
    this.dirZ = this.dirZ*inertia - gz*(1-inertia)
    const len = Math.sqrt(this.dirX*this.dirX+this.dirZ*this.dirZ)
    if (len > 0) { this.dirX /= len; this.dirZ /= len }
    const oldX=this.x, oldZ=this.z
    this.x += this.dirX; this.z += this.dirZ
    if (this.x<0||this.x>=GRID||this.z<0||this.z>=GRID) return false
    const newH = this.getH(this.x,this.z)
    const oldH = this.getH(oldX,oldZ)
    const dh = newH - oldH
    const capacity = Math.max(-dh*this.speed*sedimentCapacity, 0.001)
    if (this.sediment > capacity || dh > 0) {
      const deposit = dh > 0 ? Math.min(dh, this.sediment) : (this.sediment-capacity)*deposition
      this.sediment -= deposit
      const ci = idx(Math.max(0,Math.min(GRID,Math.floor((oldX+this.x)*0.5))), Math.max(0,Math.min(GRID,Math.floor((oldZ+this.z)*0.5))))
      heights[ci] += deposit / (CELL*CELL)
    } else {
      const erode = Math.min((capacity-this.sediment)*erosion, -dh)
      for (const b of erosionBrush) {
        const bx=Math.floor(this.x)+b.dx, bz=Math.floor(this.z)+b.dz
        if (bx<0||bx>GRID||bz<0||bz>GRID) continue
        heights[idx(bx,bz)] -= erode * b.weight / (CELL*CELL)
      }
      this.sediment += erode
    }
    this.speed = Math.sqrt(Math.max(0, this.speed*this.speed + dh*gravity))
    this.water *= (1-evaporation)
    this.life--
    return this.life > 0 && this.water > 0.001 && this.x>0&&this.x<GRID&&this.z>0&&this.z<GRID
  }
}

const drops = Array.from({length: 3000}, () => new Droplet())
let dropIdx = 0
const STEPS = 150

function erodeStep() {
  for (let s=0; s<STEPS; s++) {
    if (!drops[dropIdx].step()) drops[dropIdx] = new Droplet()
    dropIdx = (dropIdx + 1) % drops.length
  }
  updateMesh()
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  erodeStep()
  water.position.y = 1.0 + Math.sin(Date.now()*0.001)*0.3
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
