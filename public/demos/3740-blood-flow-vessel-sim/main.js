// 3740. Blood Flow in Vessel
// Pulsatile blood flow with RBC particles, shear stress visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d0015)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 8, 25)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Vessel tube - curved path
const path3d = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-20, 0, 0),
  new THREE.Vector3(-12, 4, 3),
  new THREE.Vector3(-4, 1, 5),
  new THREE.Vector3(4, -2, 2),
  new THREE.Vector3(12, 2, -3),
  new THREE.Vector3(20, 0, 0),
])

const vesselGeo = new THREE.TubeGeometry(path3d, 128, 2.5, 24, false)
const vesselMat = new THREE.MeshPhysicalMaterial({
  color: 0x880033, roughness: 0.3, metalness: 0.1,
  transparent: true, opacity: 0.25, side: THREE.DoubleSide,
})
scene.add(new THREE.Mesh(vesselGeo, vesselMat))

// RBC instanced mesh
const RBC_COUNT = 200
const rbcMesh = new THREE.InstancedMesh(
  new THREE.TorusGeometry(0.35, 0.12, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.4, metalness: 0.1 }),
  RBC_COUNT
)

const rbcData = []
const dummy = new THREE.Object3D()
for (let i = 0; i < RBC_COUNT; i++) {
  const t = Math.random()
  const pt = path3d.getPoint(t)
  const tan = path3d.getTangent(t)
  const right = new THREE.Vector3(0, 1, 0).cross(tan).normalize()
  const up = tan.clone().cross(right).normalize()
  const offset = new THREE.Vector3(
    (Math.random()-0.5)*3*Math.sqrt(Math.random()),
    (Math.random()-0.5)*3*Math.sqrt(Math.random()),
    (Math.random()-0.5)*3*Math.sqrt(Math.random())
  )
  rbcData.push({
    t, speed: 0.8 + Math.random()*0.6,
    offset, phase: Math.random()*Math.PI*2,
    roll: Math.random()*Math.PI*2
  })
  dummy.position.copy(pt).add(offset)
  dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0)
  dummy.scale.setScalar(0.5 + Math.random()*0.5)
  dummy.updateMatrix()
  rbcMesh.setMatrixAt(i, dummy.matrix)
}
scene.add(rbcMesh)

// Plasma glow particles
const plasmaCount = 800
const plasmaPos = new Float32Array(plasmaCount * 3)
for (let i = 0; i < plasmaCount; i++) {
  const t = Math.random()
  const pt = path3d.getPoint(t)
  plasmaPos[i*3] = pt.x + (Math.random()-0.5)*4
  plasmaPos[i*3+1] = pt.y + (Math.random()-0.5)*4
  plasmaPos[i*3+2] = pt.z + (Math.random()-0.5)*4
}
const plasmaGeo = new THREE.BufferGeometry()
plasmaGeo.setAttribute('position', new THREE.BufferAttribute(plasmaPos, 3))
scene.add(new THREE.Points(plasmaGeo, new THREE.PointsMaterial({
  color: 0xff3366, size: 0.07, transparent: true, opacity: 0.4
})))

// HUD
let info = document.createElement('div')
info.style.cssText = 'position:fixed;top:10px;left:10px;color:#ff6688;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.75);padding:10px;border-radius:8px;line-height:1.8'
document.body.appendChild(info)

scene.add(new THREE.AmbientLight(0x330022, 1))
const pLight1 = new THREE.PointLight(0xff2244, 3, 30)
pLight1.position.set(0, 5, 5)
scene.add(pLight1)
const pLight2 = new THREE.PointLight(0x4422ff, 2, 30)
pLight2.position.set(0, -3, -5)
scene.add(pLight2)

let time = 0
function animate() {
  requestAnimationFrame(animate)
  time += 0.02
  const pulse = 1 + 0.35 * Math.abs(Math.sin(time * 2))

  for (let i = 0; i < RBC_COUNT; i++) {
    const rd = rbcData[i]
    rd.t += rd.speed * pulse * 0.003
    if (rd.t > 1) {
      rd.t = 0
      rd.offset.set(
        (Math.random()-0.5)*3*Math.sqrt(Math.random()),
        (Math.random()-0.5)*3*Math.sqrt(Math.random()),
        (Math.random()-0.5)*3*Math.sqrt(Math.random())
      )
    }
    const pt = path3d.getPoint(rd.t)
    const tan = path3d.getTangent(rd.t)
    const right = new THREE.Vector3(0, 1, 0).cross(tan).normalize()
    dummy.position.copy(pt).add(rd.offset.clone().applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), tan)
    ))
    rd.roll += 0.015
    dummy.rotation.setFromQuaternion(
      new THREE.Quaternion().setFromAxisAngle(tan, rd.roll)
    )
    dummy.updateMatrix()
    rbcMesh.setMatrixAt(i, dummy.matrix)
  }
  rbcMesh.instanceMatrix.needsUpdate = true

  // Update plasma
  const pp = plasmaGeo.attributes.position
  for (let i = 0; i < plasmaCount; i++) {
    pp.array[i*3] += 0.05
    const t = (pp.array[i*3] + 20) / 40
    if (t > 1) {
      pp.array[i*3] = -20
      pp.array[i*3+1] += (Math.random()-0.5)*0.5
      pp.array[i*3+2] += (Math.random()-0.5)*0.5
    }
  }
  pp.needsUpdate = true

  info.innerHTML = `BLOOD FLOW SIMULATION<br>RBC Count: ${RBC_COUNT}<br>Heart Rate: ${(60+Math.sin(time*2)*20).toFixed(0)} BPM<br>Flow Velocity: ${(pulse*3).toFixed(1)} mL/s<br>Shear Rate: ${(pulse*200).toFixed(0)} s^-1`

  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
