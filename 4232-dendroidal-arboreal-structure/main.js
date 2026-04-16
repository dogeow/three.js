// 4232. Dendroidal Arboreal Structure
// Tree growth via space colonization algorithm
// type: simulation

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x08090a)
scene.fog = new THREE.FogExp2(0x08090a, 0.015)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 15, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI * 0.85
controls.minDistance = 5
controls.maxDistance = 120

scene.add(new THREE.AmbientLight(0x334455, 0.6))
const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.8)
sunLight.position.set(30, 60, 20)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.near = 1
sunLight.shadow.camera.far = 200
sunLight.shadow.camera.left = -60
sunLight.shadow.camera.right = 60
sunLight.shadow.camera.top = 80
sunLight.shadow.camera.bottom = -20
scene.add(sunLight)
const rimLight = new THREE.DirectionalLight(0x4488ff, 0.5)
rimLight.position.set(-20, 10, -30)
scene.add(rimLight)

const killDist = 3.5
const influenceDist = 12.0
const stepSize = 0.8
const attractorCount = 180
const iterationsPerFrame = 3

const groundGeo = new THREE.PlaneGeometry(200, 200)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 1.0 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.1
ground.receiveShadow = true
scene.add(ground)

const attractors = []
const attractorGroup = new THREE.Group()
scene.add(attractorGroup)

function initAttractors() {
  attractors.length = 0
  attractorGroup.clear()
  for (let i = 0; i < attractorCount; i++) {
    const theta = Math.random() * Math.PI * 2
    const r = 5 + Math.random() * 18
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
    const y = 8 + Math.random() * 20
    attractors.push(new THREE.Vector3(x, y, z))
    const dotGeo = new THREE.SphereGeometry(0.15, 6, 6)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.5 })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.set(x, y, z)
    attractorGroup.add(dot)
  }
}
initAttractors()

class Branch {
  constructor(pos, dir, depth, parentIdx) {
    this.pos = pos.clone()
    this.dir = dir.clone().normalize()
    this.depth = depth
    this.parentIdx = parentIdx
    this.children = []
    this.grown = false
    this.length = 0
    this.maxLength = 6.0 - depth * 0.5
  }
  grow() {
    if (this.grown) return
    const inc = this.dir.clone().multiplyScalar(stepSize)
    this.pos.add(inc)
    this.length += stepSize
    if (this.length >= this.maxLength) this.grown = true
  }
}

const branches = []
const trunkDir = new THREE.Vector3(0, 1, 0).add(new THREE.Vector3((Math.random()-0.5)*0.1, 0, (Math.random()-0.5)*0.1))
branches.push(new Branch(new THREE.Vector3(0, 0, 0), trunkDir, 0, -1))

const cellSize = influenceDist
const attractorCells = new Map()

function cellKey(p) {
  return Math.floor(p.x/cellSize)+','+Math.floor(p.y/cellSize)+','+Math.floor(p.z/cellSize)
}

function nearbyAttractors(pos) {
  const result = []
  const cx = Math.floor(pos.x/cellSize)
  const cy = Math.floor(pos.y/cellSize)
  const cz = Math.floor(pos.z/cellSize)
  for (let dx = -1; dx <= 1; dx++)
  for (let dy = -1; dy <= 1; dy++)
  for (let dz = -1; dz <= 1; dz++) {
    const key = (cx+dx)+','+(cy+dy)+','+(cz+dz)
    const cell = attractorCells.get(key)
    if (cell) for (const a of cell) result.push(a)
  }
  return result
}

function rebuildAttractorHash() {
  attractorCells.clear()
  for (const a of attractors) {
    const key = cellKey(a)
    if (!attractorCells.has(key)) attractorCells.set(key, [])
    attractorCells.get(key).push(a)
  }
}
rebuildAttractorHash()

let activeBranches = [0]
const branchMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9, metalness: 0.0 })
const tipMat = new THREE.MeshStandardMaterial({ color: 0x88cc44, roughness: 0.7, emissive: 0x224400, emissiveIntensity: 0.3 })
const branchMeshes = []
const tipMeshes = []

function updateGeometry() {
  for (const m of branchMeshes) { scene.remove(m); m.geometry.dispose() }
  for (const m of tipMeshes) { scene.remove(m); m.geometry.dispose() }
  branchMeshes.length = 0
  tipMeshes.length = 0
  for (let i = 0; i < branches.length; i++) {
    const b = branches[i]
    if (b.length < 0.01) continue
    const thickness = Math.max(0.08, 0.55 - b.depth * 0.08)
    const geo = new THREE.CylinderGeometry(thickness * 0.6, thickness, b.length, 6)
    const up = new THREE.Vector3(0, 1, 0)
    const quat = new THREE.Quaternion().setFromUnitVectors(up, b.dir)
    const pos = b.pos.clone().addScaledVector(b.dir, -b.length * 0.5)
    geo.applyQuaternion(quat)
    geo.translate(pos.x, pos.y, pos.z)
    const mesh = new THREE.Mesh(geo, branchMat)
    mesh.castShadow = true
    scene.add(mesh)
    branchMeshes.push(mesh)
    if (b.grown && b.depth >= 3) {
      const tGeo = new THREE.SphereGeometry(0.2 + Math.random() * 0.15, 6, 6)
      const tMesh = new THREE.Mesh(tGeo, tipMat)
      tMesh.position.copy(b.pos)
      scene.add(tMesh)
      tipMeshes.push(tMesh)
    }
  }
}

let done = false

function iterate() {
  if (done) return
  for (let iter = 0; iter < iterationsPerFrame; iter++) {
    for (let ai = attractors.length - 1; ai >= 0; ai--) {
      const a = attractors[ai]
      for (const bi of activeBranches) {
        if (a.distanceTo(branches[bi].pos) < killDist) {
          attractorGroup.remove(attractorGroup.children[ai])
          attractors.splice(ai, 1)
          break
        }
      }
    }
    if (attractors.length === 0) { done = true; return }
    rebuildAttractorHash()
    const newActive = []
    for (const bi of activeBranches) {
      const b = branches[bi]
      if (b.grown) continue
      const nearby = nearbyAttractors(b.pos)
      if (nearby.length === 0) { b.grown = true; continue }
      let avgDir = new THREE.Vector3()
      for (const a of nearby) {
        const d = a.clone().sub(b.pos)
        const dist = d.length()
        if (dist > 0) { d.normalize(); avgDir.add(d.divideScalar(dist * dist)) }
      }
      if (avgDir.length() > 0.001) {
        avgDir.normalize()
        const influence = Math.min(nearby.length / 5, 1.0)
        b.dir.lerp(avgDir, 0.3 * influence)
        b.dir.normalize()
        b.grow()
        newActive.push(bi)
        if (b.grown && b.depth < 7 && Math.random() < 0.85) {
          const newDepth = b.depth + 1
          const spread = 0.4 + Math.random() * 0.3
          const angle = Math.random() * Math.PI * 2
          const newDir = b.dir.clone()
          newDir.x += Math.cos(angle) * spread
          newDir.z += Math.sin(angle) * spread
          newDir.y += (Math.random() - 0.3) * spread
          newDir.normalize()
          const nb = new Branch(b.pos.clone(), newDir, newDepth, bi)
          branches.push(nb)
          newActive.push(branches.length - 1)
          b.children.push(branches.length - 1)
        }
      }
    }
    activeBranches = newActive
    if (activeBranches.length === 0) { done = true; return }
  }
  updateGeometry()
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  if (!done) iterate()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
