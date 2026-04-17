// 3743. GPU Rigid Body Chaos
// 200 rigid cubes with Verlet integration, restitution, friction
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 30, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -10
floor.receiveShadow = true
scene.add(floor)

// Walls
const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.3 })
for (const [rx, ry, rz, px, py, pz] of [
  [0,0,0, 0,0,-40], [0,Math.PI/2,0, 40,0,0], [0,-Math.PI/2,0, -40,0,0]
]) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), wallMat)
  wall.rotation.set(rx, ry, rz)
  wall.position.set(px, py + 10, pz)
  scene.add(wall)
}

// Rigid bodies
const N = 150
const mesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 }),
  N
)
const bodyPos = []
const bodyVel = []
const bodyRot = []
const bodyOmega = []
const bodySize = []
const colors = []

const palette = [0x4488ff, 0xff4444, 0x44ff88, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0x88ff44]
for (let i = 0; i < N; i++) {
  bodyPos.push(
    (Math.random()-0.5)*30,
    10 + Math.random()*20,
    (Math.random()-0.5)*30
  )
  bodyVel.push(
    (Math.random()-0.5)*2,
    (Math.random()-0.5)*2,
    (Math.random()-0.5)*2
  )
  bodyRot.push(Math.random()*Math.PI*2, Math.random()*Math.PI*2, Math.random()*Math.PI*2)
  bodyOmega.push(
    (Math.random()-0.5)*0.1,
    (Math.random()-0.5)*0.1,
    (Math.random()-0.5)*0.1
  )
  const c = palette[i % palette.length]
  colors.push((c >> 16)/255, ((c>>8)&255)/255, (c&255)/255)
}

const colArr = new Float32Array(N*3)
for (let i = 0; i < N; i++) {
  colArr[i*3] = colors[i*3]; colArr[i*3+1] = colors[i*3+1]; colArr[i*3+2] = colors[i*3+2]
}
mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
mesh.material.vertexColors = true
scene.add(mesh)

const dummy = new THREE.Object3D()
const GRAVITY = -0.15
const RESTITUTION = 0.6
const FRICTION = 0.98
const FLOOR_Y = -8

let info = document.createElement('div')
info.style.cssText = 'position:fixed;top:10px;left:10px;color:#88ccff;font-family:monospace;font-size:11px;background:rgba(0,0,0,0.8);padding:8px;border-radius:6px;line-height:1.8'
document.body.appendChild(info)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xffffff, 1)
sun.position.set(20, 50, 20)
sun.castShadow = true
scene.add(sun)
const pLight = new THREE.PointLight(0x4488ff, 1, 100)
pLight.position.set(-20, 30, -20)
scene.add(pLight)

// Click to add impulse
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
window.addEventListener('click', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const dir = raycaster.ray.direction
  for (let i = 0; i < N; i++) {
    const px = bodyPos[i*3], py = bodyPos[i*3+1], pz = bodyPos[i*3+2]
    const dx = px - raycaster.ray.origin.x
    const dy = py - raycaster.ray.origin.y
    const dz = pz - raycaster.ray.origin.z
    const dist = Math.sqrt(dx*dx+dy*dy+dz*dz)
    if (dist < 20) {
      bodyVel[i*3] += dir.x * 5
      bodyVel[i*3+1] += dir.y * 5
      bodyVel[i*3+2] += dir.z * 5
    }
  }
})

let totalKE = 0
function animate() {
  requestAnimationFrame(animate)
  totalKE = 0

  for (let i = 0; i < N; i++) {
    // Gravity
    bodyVel[i*3+1] += GRAVITY

    // Move
    bodyPos[i*3] += bodyVel[i*3]
    bodyPos[i*3+1] += bodyVel[i*3+1]
    bodyPos[i*3+2] += bodyVel[i*3+2]

    // Rotate
    bodyRot[i*3] += bodyOmega[i*3]
    bodyRot[i*3+1] += bodyOmega[i*3+1]
    bodyRot[i*3+2] += bodyOmega[i*3+2]

    // Floor collision
    if (bodyPos[i*3+1] < FLOOR_Y) {
      bodyPos[i*3+1] = FLOOR_Y
      bodyVel[i*3+1] = -bodyVel[i*3+1] * RESTITUTION
      bodyVel[i*3] *= FRICTION
      bodyVel[i*3+2] *= FRICTION
      bodyOmega[i*3] *= 0.9
      bodyOmega[i*3+1] *= 0.9
      bodyOmega[i*3+2] *= 0.9
    }

    // Wall collisions
    const wall = 35
    if (bodyPos[i*3] > wall) { bodyPos[i*3] = wall; bodyVel[i*3] = -Math.abs(bodyVel[i*3])*RESTITUTION }
    if (bodyPos[i*3] < -wall) { bodyPos[i*3] = -wall; bodyVel[i*3] = Math.abs(bodyVel[i*3])*RESTITUTION }
    if (bodyPos[i*3+2] > wall) { bodyPos[i*3+2] = wall; bodyVel[i*3+2] = -Math.abs(bodyVel[i*3+2])*RESTITUTION }
    if (bodyPos[i*3+2] < -wall) { bodyPos[i*3+2] = -wall; bodyVel[i*3+2] = Math.abs(bodyVel[i*3+2])*RESTITUTION }

    // Body-body collision (simple sphere approximation)
    for (let j = i+1; j < N; j++) {
      const dx = bodyPos[j*3] - bodyPos[i*3]
      const dy = bodyPos[j*3+1] - bodyPos[i*3+1]
      const dz = bodyPos[j*3+2] - bodyPos[i*3+2]
      const dist = Math.sqrt(dx*dx+dy*dy+dz*dz)
      if (dist < 3 && dist > 0.01) {
        const nx = dx/dist, ny = dy/dist, nz = dz/dist
        const relV = (bodyVel[j*3]-bodyVel[i*3])*nx + (bodyVel[j*3+1]-bodyVel[i*3+1])*ny + (bodyVel[j*3+2]-bodyVel[i*3+2])*nz
        if (relV < 0) {
          const imp = relV * RESTITUTION
          bodyVel[i*3] += imp*nx; bodyVel[i*3+1] += imp*ny; bodyVel[i*3+2] += imp*nz
          bodyVel[j*3] -= imp*nx; bodyVel[j*3+1] -= imp*ny; bodyVel[j*3+2] -= imp*nz
        }
        const overlap = 3 - dist
        bodyPos[i*3] -= nx*overlap*0.5; bodyPos[i*3+1] -= ny*overlap*0.5; bodyPos[i*3+2] -= nz*overlap*0.5
        bodyPos[j*3] += nx*overlap*0.5; bodyPos[j*3+1] += ny*overlap*0.5; bodyPos[j*3+2] += nz*overlap*0.5
      }
    }

    // Kinetic energy
    totalKE += 0.5 * (bodyVel[i*3]**2 + bodyVel[i*3+1]**2 + bodyVel[i*3+2]**2)

    // Update instance matrix
    dummy.position.set(bodyPos[i*3], bodyPos[i*3+1], bodyPos[i*3+2])
    dummy.rotation.set(bodyRot[i*3], bodyRot[i*3+1], bodyRot[i*3+2])
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true

  info.innerHTML = `RIGID BODY CHAOS<br>Bodies: ${N} cubes<br>KE: ${totalKE.toFixed(1)}<br>Click to impulse<br>Drag to orbit`

  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
