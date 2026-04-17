// 3083 - Diffraction Grating Optics: multi-slit wave interference
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 8, 30)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
scene.add(new THREE.AmbientLight(0xffffff, 0.2))
const laser = new THREE.PointLight(0xff3300, 3, 60)
laser.position.set(-20, 0, 0)
scene.add(laser)
const gratingGeo = new THREE.PlaneGeometry(40, 12, 400, 1)
const gratingMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.1, side: THREE.DoubleSide })
const grating = new THREE.Mesh(gratingGeo, gratingMat)
grating.position.z = 0
grating.rotation.y = Math.PI / 2
scene.add(grating)
const lineGroup = new THREE.Group()
for (let i = -20; i <= 20; i++) {
  const lineGeo = new THREE.PlaneGeometry(0.05, 12)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  const line = new THREE.Mesh(lineGeo, lineMat)
  line.position.set(0, 0, i * 0.3)
  line.rotation.y = Math.PI / 2
  lineGroup.add(line)
}
scene.add(lineGroup)
const screenGeo = new THREE.PlaneGeometry(40, 12)
const screenCanvas = document.createElement('canvas')
screenCanvas.width = 1024; screenCanvas.height = 256
const screenCtx = screenCanvas.getContext('2d')
const screenTex = new THREE.CanvasTexture(screenCanvas)
const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, side: THREE.DoubleSide })
const screen = new THREE.Mesh(screenGeo, screenMat)
screen.position.set(20, 0, 0)
screen.rotation.y = Math.PI / 2
scene.add(screen)
const wavelength = 0.65
const numSlits = 41
const slitSpacing = 0.3
const slitPositions = Array.from({length: numSlits}, (_, i) => (i - (numSlits - 1) / 2) * slitSpacing)
function updateScreen() {
  const ctx = screenCtx
  ctx.fillStyle = '#050510'
  ctx.fillRect(0, 0, 1024, 256)
  const imgData = ctx.getImageData(0, 0, 1024, 256)
  const L = 40
  for (let px = 0; px < 1024; px++) {
    const screenX = (px / 1024 - 0.5) * 40
    let intensity = 0
    for (const sx of slitPositions) {
      const d = Math.sqrt(L * L + (screenX - sx) * (screenX - sx))
      const phase = (2 * Math.PI / wavelength) * d
      intensity += Math.cos(phase)
    }
    intensity = intensity * intensity / (numSlits * numSlits)
    const bright = Math.floor(intensity * 255)
    for (let py = 0; py < 256; py++) {
      const idx = (py * 1024 + px) * 4
      imgData.data[idx] = bright; imgData.data[idx + 1] = Math.floor(bright * 0.3); imgData.data[idx + 2] = 0; imgData.data[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)
  screenTex.needsUpdate = true
}
const beamGeo = new THREE.CylinderGeometry(0.1, 0.3, 40, 8, 1, true)
const beamMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
const beam = new THREE.Mesh(beamGeo, beamMat)
beam.rotation.z = Math.PI / 2
beam.position.x = 0
scene.add(beam)
updateScreen()
const info = document.createElement('div')
info.style.cssText = 'position:absolute;top:12px;left:12px;color:#ff6633;font:13px/1.6 monospace;pointer-events:none'
info.innerHTML = '<b>3083 - Diffraction Grating Optics</b><br>Wave interference: 41 slits, red laser 650nm<br>Rotate camera to view 3D diffraction'
document.body.appendChild(info)
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
