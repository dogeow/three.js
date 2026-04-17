// 3087 - Holographic Interference Pattern
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 0, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const refLight = new THREE.PointLight(0xffaa00, 2, 100)
refLight.position.set(0, 30, -20); scene.add(refLight)
const objLight = new THREE.PointLight(0x00ffaa, 2, 100)
objLight.position.set(15, 0, 10); scene.add(objLight)
const refPos = new THREE.Vector3(0, 30, -20)
const objPos = new THREE.Vector3(15, 0, 10)
const holoCanvas = document.createElement('canvas')
holoCanvas.width = 512; holoCanvas.height = 512
const holoCtx = holoCanvas.getContext('2d')
const holoTex = new THREE.CanvasTexture(holoCanvas)
const holoMat = new THREE.MeshBasicMaterial({ map: holoTex, side: THREE.DoubleSide })
const holoPlate = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), holoMat)
holoPlate.position.z = 0; scene.add(holoPlate)
const reconCanvas = document.createElement('canvas')
reconCanvas.width = 512; reconCanvas.height = 512
const reconCtx = reconCanvas.getContext('2d')
const reconTex = new THREE.CanvasTexture(reconCanvas)
const reconMat = new THREE.MeshBasicMaterial({ map: reconTex, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
const reconPlate = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), reconMat)
reconPlate.position.z = 20; reconPlate.rotation.y = Math.PI / 6; scene.add(reconPlate)
function computeInterference(px, py) {
  const scale = 40 / 512
  const x = (px - 256) * scale, y = (py - 256) * scale
  const r1 = Math.sqrt((x - refPos.x)**2 + (y - refPos.y)**2 + refPos.z**2)
  const r2 = Math.sqrt((x - objPos.x)**2 + (y - objPos.y)**2 + objPos.z**2)
  const lambda = 0.5
  const I = 1 + Math.cos((2 * Math.PI / lambda) * (r2 - r1))
  return Math.floor(I * 128)
}
function updateHologram() {
  const ctx = holoCtx; const imgData = ctx.getImageData(0, 0, 512, 512)
  for (let py = 0; py < 512; py++) for (let px = 0; px < 512; px++) {
    const I = computeInterference(px, py), idx = (py * 512 + px) * 4
    imgData.data[idx] = I; imgData.data[idx+1] = Math.floor(I * 0.9); imgData.data[idx+2] = I; imgData.data[idx+3] = 255
  }
  ctx.putImageData(imgData, 0, 0); holoTex.needsUpdate = true
}
function updateReconstruction() {
  const ctx = reconCtx; ctx.clearRect(0, 0, 512, 512)
  const imgData = ctx.getImageData(0, 0, 512, 512)
  const t = performance.now() * 0.001
  for (let py = 0; py < 512; py++) for (let px = 0; px < 512; px++) {
    const I = computeInterference(px, py), angle = I / 256 * Math.PI + t * 0.5, idx = (py * 512 + px) * 4
    imgData.data[idx] = Math.floor(128 + 127 * Math.cos(angle)); imgData.data[idx+1] = Math.floor(128 + 127 * Math.cos(angle + 2.1)); imgData.data[idx+2] = Math.floor(128 + 127 * Math.cos(angle + 4.2)); imgData.data[idx+3] = Math.floor(I * 0.5)
  }
  ctx.putImageData(imgData, 0, 0); reconTex.needsUpdate = true
}
updateHologram()
const info = document.createElement('div')
info.style.cssText = 'position:absolute;top:12px;left:12px;color:#ffdd88;font:13px/1.6 monospace;pointer-events:none'
info.innerHTML = '<b>3087 - Holographic Interference</b><br>Front: interference pattern recording<br>Back: animated color reconstruction<br>Orange=reference beam, Green=object beam'
document.body.appendChild(info)
function animate() { requestAnimationFrame(animate); updateReconstruction(); controls.update(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
