// 3738. CNC Milling Simulation
// 3-axis CNC milling with material removal, chip particles, toolpath
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 500)
camera.position.set(25, 25, 25)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Grid floor
const grid = new THREE.GridHelper(40, 40, 0x333355, 0x222244)
scene.add(grid)

// Workpiece - tall block to be milled
const workpieceGeo = new THREE.BoxGeometry(12, 8, 12, 32, 32, 32)
const workpiecePos = workpieceGeo.attributes.position
for (let i = 0; i < workpiecePos.count; i++) {
  workpiecePos.setY(i, workpiecePos.getY(i) - 4)
  const x = workpiecePos.getX(i), y = workpiecePos.getY(i), z = workpiecePos.getZ(i)
  const dist = Math.sqrt(x*x + z*z)
  if (dist < 3 && y < 2) {
    workpiecePos.setY(i, y + (2 - dist) * 0.5)
  }
}
workpieceGeo.computeVertexNormals()
const workpiece = new THREE.Mesh(workpieceGeo,
  new THREE.MeshStandardMaterial({ color: 0xaa8833, roughness: 0.6, metalness: 0.3 }))
workpiece.castShadow = true
workpiece.receiveShadow = true
scene.add(workpiece)

// CNC spindle/tool
const toolGroup = new THREE.Group()
const toolShaft = new THREE.Mesh(
  new THREE.CylinderGeometry(0.2, 0.2, 6, 16),
  new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 }))
toolShaft.position.y = 3
toolGroup.add(toolShaft)
const toolBit = new THREE.Mesh(
  new THREE.ConeGeometry(0.6, 1.5, 16),
  new THREE.MeshStandardMaterial({ color: 0xff4400, metalness: 0.8 }))
toolBit.position.y = -0.75
toolGroup.add(toolBit)
toolGroup.position.set(0, 5, 0)
scene.add(toolGroup)

// Toolpath - helical circle
const toolpathPoints = []
for (let t = 0; t < Math.PI * 4; t += 0.05) {
  toolpathPoints.push(new THREE.Vector3(Math.cos(t) * 3, 1.5 - t * 0.05, Math.sin(t) * 3))
}
const tpGeo = new THREE.BufferGeometry().setFromPoints(toolpathPoints)
const tpLine = new THREE.Line(tpGeo, new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 2 }))
scene.add(tpLine)

// Chip particles
const chipGeo = new THREE.BufferGeometry()
const chipCount = 300
const chipPos = new Float32Array(chipCount * 3)
const chipVel = []
for (let i = 0; i < chipCount; i++) {
  chipPos[i*3] = (Math.random()-0.5)*4
  chipPos[i*3+1] = 1 + Math.random() * 2
  chipPos[i*3+2] = (Math.random()-0.5)*4
  chipVel.push({ vx: (Math.random()-0.5)*0.3, vy: Math.random()*0.2+0.1, vz: (Math.random()-0.5)*0.3 })
}
chipGeo.setAttribute('position', new THREE.BufferAttribute(chipPos, 3))
const chips = new THREE.Points(chipGeo, new THREE.PointsMaterial({ color: 0xffcc00, size: 0.12 }))
scene.add(chips)

// Info
let info = document.createElement('div')
info.style.cssText = 'position:fixed;top:10px;left:10px;color:#88ff88;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.7);padding:8px;border-radius:6px'
document.body.appendChild(info)

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xffffff, 1.2)
sun.position.set(15, 30, 20)
sun.castShadow = true
scene.add(sun)

let t = 0
function animate() {
  requestAnimationFrame(animate)
  t += 0.02
  const angle = t * 1.5
  const r = 3
  toolGroup.position.x = Math.cos(angle) * r
  toolGroup.position.z = Math.sin(angle) * r
  toolGroup.position.y = 5 - (t % (Math.PI*4)) * 0.3
  toolGroup.rotation.y = angle + Math.PI/2
  toolGroup.rotation.z = Math.sin(t * 8) * 0.05

  // Animate chips
  const cp = chipGeo.attributes.position
  for (let i = 0; i < chipCount; i++) {
    chipVel[i].vy -= 0.008
    cp.array[i*3] += chipVel[i].vx
    cp.array[i*3+1] += chipVel[i].vy
    cp.array[i*3+2] += chipVel[i].vz
    if (cp.array[i*3+1] < 0) {
      cp.array[i*3] = toolGroup.position.x + (Math.random()-0.5)*2
      cp.array[i*3+1] = toolGroup.position.y - 1
      cp.array[i*3+2] = toolGroup.position.z + (Math.random()-0.5)*2
      chipVel[i].vy = Math.random()*0.15+0.05
    }
  }
  cp.needsUpdate = true

  info.innerHTML = `CNC Milling Sim<br>Tool: Ball End Mill 6mm<br>Feed: 800mm/min<br>Spindle: 12000 RPM<br>Layer: ${((t%20)*0.5).toFixed(1)}mm`

  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
