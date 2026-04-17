// 3085 - Epidemic Spread SIR Model
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 60, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const light = new THREE.DirectionalLight(0xffffff, 0.8)
light.position.set(20, 40, 20); scene.add(light)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 }))
ground.rotation.x = -Math.PI / 2; scene.add(ground)
const N = 300
const agents = []
const mats = {
  S: new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.6 }),
  I: new THREE.MeshStandardMaterial({ color: 0xff2222, roughness: 0.4, emissive: 0x440000 }),
  R: new THREE.MeshStandardMaterial({ color: 0x22cc44, roughness: 0.7 })
}
const geo = new THREE.SphereGeometry(0.5, 8, 6)
let S = N - 5, I = 5, Rcount = 0
for (let i = 0; i < N; i++) {
  const mesh = new THREE.Mesh(geo, i < 5 ? mats.I : mats.S)
  mesh.position.set((Math.random() - 0.5) * 76, 0.5, (Math.random() - 0.5) * 76)
  scene.add(mesh)
  agents.push({ mesh, state: i < 5 ? 'I' : 'S', vx: (Math.random() - 0.5) * 0.1, vz: (Math.random() - 0.5) * 0.1, infectedAt: i < 5 ? performance.now() : 0 })
}
const statsDiv = document.createElement('div')
statsDiv.style.cssText = 'position:absolute;top:50px;left:12px;color:#aaa;font:13px/1.8 monospace;pointer-events:none'
document.body.appendChild(statsDiv)
const chartCanvas = document.createElement('canvas')
chartCanvas.width = 280; chartCanvas.height = 110
chartCanvas.style.cssText = 'position:absolute;top:12px;right:12px;opacity:0.85;border:1px solid #333;border-radius:4px'
document.body.appendChild(chartCanvas)
const chartCtx = chartCanvas.getContext('2d')
const hS = [S], hI = [I], hR = [Rcount]
const INFECT_RADIUS = 2.5
const RECOVER_TIME = 6000

function sirMeaningHtml() {
  return 'S = <span style="color:#4488ff">Susceptible 易感者</span><br>I = <span style="color:#ff2222">Infected 感染者</span><br>R = <span style="color:#22cc44">Recovered 康复/移除者</span>'
}

function updateChart() {
  const ctx = chartCtx; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 280, 110)
  const len = hS.length
  ;[['#4488ff', hS], ['#ff2222', hI], ['#22cc44', hR]].forEach(([c, d]) => {
    ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath()
    d.forEach((v, i) => { const x = i / len * 280; const y = 100 - v / N * 90; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
    ctx.stroke()
  })
  ctx.fillStyle = '#888'; ctx.font = '10px monospace'; ctx.fillText('S: 易感  I: 感染  R: 康复/移除', 4, 108)
}
function update() {
  const now = performance.now()
  for (const a of agents) {
    a.mesh.position.x += a.vx; a.mesh.position.z += a.vz
    if (Math.abs(a.mesh.position.x) > 38) { a.vx *= -1; a.mesh.position.x = Math.sign(a.mesh.position.x) * 38 }
    if (Math.abs(a.mesh.position.z) > 38) { a.vz *= -1; a.mesh.position.z = Math.sign(a.mesh.position.z) * 38 }
    a.vx += (Math.random() - 0.5) * 0.006; a.vz += (Math.random() - 0.5) * 0.006
    a.vx = Math.max(-0.15, Math.min(0.15, a.vx)); a.vz = Math.max(-0.15, Math.min(0.15, a.vz))
  }
  const infected = agents.filter(a => a.state === 'I')
  for (const inf of infected) {
    if (now - inf.infectedAt > RECOVER_TIME) { inf.state = 'R'; inf.mesh.material = mats.R; Rcount++; I-- }
    for (const other of agents) {
      if (other.state !== 'S') continue
      const dx = inf.mesh.position.x - other.mesh.position.x, dz = inf.mesh.position.z - other.mesh.position.z
      if (Math.sqrt(dx*dx+dz*dz) < INFECT_RADIUS && Math.random() < 0.04) {
        other.state = 'I'; other.mesh.material = mats.I; other.infectedAt = now; S--; I++
      }
    }
  }
  hS.push(S); hI.push(I); hR.push(Rcount)
  if (hS.length > 280) { hS.shift(); hI.shift(); hR.shift() }
  statsDiv.innerHTML = '<b>3085 - SIR Epidemic</b><br>' + sirMeaningHtml() + '<br><br>S: <b style="color:#4488ff">'+S+'</b><br>I: <b style="color:#ff2222">'+I+'</b><br>R: <b style="color:#22cc44">'+Rcount+'</b><br><br>点击地面可增加局部感染'
  updateChart()
}
const raycaster = new THREE.Raycaster()
renderer.domElement.addEventListener('click', (e) => {
  const rect = renderer.domElement.getBoundingClientRect()
  raycaster.setFromCamera({ x: (e.clientX - rect.left) / rect.width * 2 - 1, y: -(e.clientY - rect.top) / rect.height * 2 + 1 }, camera)
  const hits = raycaster.intersectObject(ground)
  if (hits.length > 0) {
    const p = hits[0].point
    for (const a of agents) {
      if (a.state === 'S' && a.mesh.position.distanceTo(p) < 12) {
        a.state = 'I'; a.mesh.material = mats.I; a.infectedAt = performance.now(); S--; I++
      }
    }
  }
})
function animate() { requestAnimationFrame(animate); update(); controls.update(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
