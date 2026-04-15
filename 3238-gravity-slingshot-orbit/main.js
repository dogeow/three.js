// 3238. Gravity Slingshot Orbit
// 重力弹弓轨道 - 航天器借力行星引力加速的轨道转移可视化
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020210)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 80, 100)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// Stars background
const starGeo = new THREE.BufferGeometry()
const starCount = 3000
const starPos = new Float32Array(starCount * 3)
for (let i = 0; i < starCount * 3; i++) {
  starPos[i] = (Math.random() - 0.5) * 2000
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 })))

const params = {
  planetRadius: 8,
  planetMass: 1000,
  spacecraftSpeed: 0.8,
  trajectoryType: 'slingshot',
  showOrbit: true,
  showVelocity: true,
  scale: 1,
  animSpeed: 1
}

// Sun
const sunGeo = new THREE.SphereGeometry(6, 32, 32)
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 })
const sun = new THREE.Mesh(sunGeo, sunMat)
sun.position.set(-50, 0, 0)
scene.add(sun)

// Sun glow
const glowGeo = new THREE.SphereGeometry(8, 32, 32)
const glowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 })
scene.add(new THREE.Mesh(glowGeo, glowMat)).position.copy(sun.position)

// Sun corona sprite
const sunLight = new THREE.PointLight(0xffdd88, 2, 200)
sunLight.position.copy(sun.position)
scene.add(sunLight)

// Planet
const planetGeo = new THREE.SphereGeometry(params.planetRadius, 32, 32)
const planetMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, metalness: 0.2, roughness: 0.6 })
const planet = new THREE.Mesh(planetGeo, planetMat)
planet.position.set(20, 0, 0)
scene.add(planet)

// Atmosphere glow
const atmGeo = new THREE.SphereGeometry(params.planetRadius * 1.15, 32, 32)
const atmMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, side: THREE.BackSide })
planet.add(new THREE.Mesh(atmGeo, atmMat))

// Planet orbit ring
const orbitGeo = new THREE.RingGeometry(params.planetRadius + 0.1, params.planetRadius + 0.3, 64)
const orbitMat = new THREE.MeshBasicMaterial({ color: 0x334466, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
const orbitRing = new THREE.Mesh(orbitGeo, orbitMat)
orbitRing.rotation.x = Math.PI / 2
orbitRing.position.copy(planet.position)
scene.add(orbitRing)

// Spacecraft
const scGeo = new THREE.ConeGeometry(0.8, 3, 8)
const scMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff4400, emissiveIntensity: 0.5 })
const spacecraft = new THREE.Mesh(scGeo, scMat)
spacecraft.rotation.z = Math.PI / 2
scene.add(spacecraft)

// Trail
const MAX_TRAIL = 500
const trailPositions = new Float32Array(MAX_TRAIL * 3)
const trailColors = new Float32Array(MAX_TRAIL * 3)
const trailGeo = new THREE.BufferGeometry()
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3))
const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 })
const trail = new THREE.Line(trailGeo, trailMat)
scene.add(trail)

let trailIndex = 0
const trailHistory = []

// Physics state
let spacecraftAngle = Math.PI
let spacecraftDist = 70
let spacecraftTheta = 0
let planetAngle = 0
let dt = 0.016

// Orbital velocity vectors
const sunMass = 5000
const G = 0.5

function gravForce(pos, target, mass) {
  const dx = target.x - pos.x
  const dy = pos.y - target.y  // y-up
  const dist = Math.sqrt(dx * dx + dy * dy)
  const force = G * mass / (dist * dist)
  return { fx: force * dx / dist, fy: force * dy / dist }
}

function updateSpacecraft(dt) {
  const sp = spacecraft.position
  const pl = planet.position
  
  // Gravity from sun
  const sunF = gravForce(sp, sun.position, sunMass)
  // Gravity from planet
  const planetF = gravForce(sp, pl, params.planetMass * 100)
  
  // Velocity update
  spacecraftTheta += sunF.fx * dt * params.animSpeed
  const speed = params.spacecraftSpeed * params.animSpeed
  
  sp.x += Math.cos(spacecraftTheta) * speed
  sp.y += Math.sin(spacecraftTheta) * speed
  
  // Slingshot effect near planet
  const dx = sp.x - pl.x
  const dy = sp.y - pl.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < params.planetRadius * 3) {
    // Bend trajectory
    const bend = (params.planetRadius * 3 - dist) * 0.02 * params.animSpeed
    spacecraftTheta += bend * Math.sign(dx)
  }
  
  spacecraft.position.set(
    pl.x + Math.cos(spacecraftTheta) * spacecraftDist * 0.5,
    pl.y + Math.sin(spacecraftTheta) * spacecraftDist * 0.3,
    Math.sin(spacecraftTheta * 3) * 5
  )
  spacecraft.lookAt(pl)
  
  // Trail
  if (trailHistory.length >= MAX_TRAIL) trailHistory.shift()
  trailHistory.push(spacecraft.position.clone())
  
  for (let i = 0; i < trailHistory.length; i++) {
    trailPositions[i * 3] = trailHistory[i].x
    trailPositions[i * 3 + 1] = trailHistory[i].y
    trailPositions[i * 3 + 2] = trailHistory[i].z
    const t = i / trailHistory.length
    trailColors[i * 3] = t
    trailColors[i * 3 + 1] = t * 0.5
    trailColors[i * 3 + 2] = 1 - t
  }
  trailGeo.attributes.position.needsUpdate = true
  trailGeo.attributes.color.needsUpdate = true
  trailGeo.setDrawRange(0, trailHistory.length)
}

function updatePlanet(dt) {
  planetAngle += 0.002 * params.animSpeed
  planet.position.x = Math.cos(planetAngle) * 20
  planet.position.y = Math.sin(planetAngle) * 8
  planet.rotation.y += 0.01 * params.animSpeed
  orbitRing.position.copy(planet.position)
}

function animate() {
  requestAnimationFrame(animate)
  updatePlanet(dt)
  updateSpacecraft(dt)
  sun.rotation.y += 0.002 * params.animSpeed
  controls.update()
  renderer.render(scene, camera)
}
animate()

const gui = new GUI()
gui.add(params, 'spacecraftSpeed', 0.1, 3, 0.1).name('飞船速度')
gui.add(params, 'planetRadius', 2, 20, 0.5).name('行星半径')
gui.add(params, 'planetMass', 100, 5000, 100).name('行星质量')
gui.add(params, 'scale', 0.1, 2, 0.1).name('场景缩放')
gui.add(params, 'animSpeed', 0.1, 5, 0.1).name('动画速度')
gui.add(params, 'showOrbit').name('显示行星轨道')
gui.add(params, 'showVelocity').name('显示速度矢量')

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
