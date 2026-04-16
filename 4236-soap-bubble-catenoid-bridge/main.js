// 4236. Soap Bubble Catenoid Bridge
// Minimal surface: soap film connecting two rings (catenoid topology)
// type: physics-visualization

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 5, 28)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

scene.add(new THREE.AmbientLight(0x334466, 0.8))
const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.5)
keyLight.position.set(10, 20, 15)
scene.add(keyLight)
const fillLight = new THREE.DirectionalLight(0x4466ff, 0.8)
fillLight.position.set(-15, 5, -10)
scene.add(fillLight)
const rimLight = new THREE.DirectionalLight(0xff88cc, 0.4)
rimLight.position.set(0, -10, 5)
scene.add(rimLight)

// Catenoid parameters
const SEGS = 80
const RINGS = 60
const RING_RADIUS = 8.0
const NECK_RADIUS = 1.2
const HEIGHT = 14.0
const a = 1.8 // scale parameter for catenoid

// Catenoid surface: x = a * cosh(z/a) * cos(theta), y = a * cosh(z/a) * sin(theta), z = z
function catenoidPoint(theta, z) {
  const r = a * Math.cosh(z / a)
  const x = r * Math.cos(theta)
  const y = r * Math.sin(theta)
  return { x, y, z }
}

function buildSurface(neckScale) {
  const geo = new THREE.BufferGeometry()
  const verts = []
  const norms = []
  const uvs = []
  const indices = []

  for (let ri = 0; ri <= RINGS; ri++) {
    const z = (ri / RINGS - 0.5) * HEIGHT
    for (let si = 0; si <= SEGS; si++) {
      const theta = (si / SEGS) * Math.PI * 2
      const r = a * Math.cosh(z / a) * neckScale
      const x = r * Math.cos(theta)
      const y = r * Math.sin(theta)
      verts.push(x, y, z)
      uvs.push(si / SEGS, ri / RINGS)
      // Normal: n = (cos(theta), sin(theta), -sinh(z/a))
      const nx = Math.cos(theta) / Math.cosh(z / a)
      const ny = Math.sin(theta) / Math.cosh(z / a)
      const nz = -Math.sinh(z / a) / Math.cosh(z / a)
      const nl = Math.sqrt(nx*nx+ny*ny+nz*nz)
      norms.push(nx/nl, ny/nl, nz/nl)
    }
  }

  for (let ri = 0; ri < RINGS; ri++) {
    for (let si = 0; si < SEGS; si++) {
      const a = ri * (SEGS+1) + si
      const b = a + 1
      const c = a + (SEGS+1)
      const d = c + 1
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

// Soap film shader material
const soapMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uThickness: { value: 0.3 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying vec2 vUv;
    void main() {
      vNormal = normalMatrix * normal;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewPos = -mvPos.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uThickness;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying vec2 vUv;
    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewPos);
      float cosTheta = dot(N, V);
      float fresnel = pow(1.0 - abs(cosTheta), 3.0);
      float thickness = uThickness;
      // Thin film interference colors
      float phase = 2.0 * 3.14159 * thickness / 0.5;
      float r = 0.5 + 0.5 * cos(phase + 0.0);
      float g = 0.5 + 0.5 * cos(phase + 2.094);
      float b = 0.5 + 0.5 * cos(phase + 4.189);
      vec3 filmColor = vec3(r, g, b);
      vec3 reflection = vec3(1.0, 0.98, 0.95) * fresnel * 0.8;
      float alpha = 0.15 + fresnel * 0.7;
      gl_FragColor = vec4(filmColor + reflection, alpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false
})

let surfaceMesh = new THREE.Mesh(buildSurface(1.0), soapMat)
scene.add(surfaceMesh)

// Ring frames
function makeRing(y, radius, color, thickness=0.15) {
  const ringGeo = new THREE.TorusGeometry(radius, thickness, 16, 64)
  const ringMat = new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.2 })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.y = y
  ring.rotation.x = Math.PI / 2
  ring.castShadow = true
  scene.add(ring)
  return ring
}

const topRing = makeRing(HEIGHT/2, RING_RADIUS, 0xcc8844)
const bottomRing = makeRing(-HEIGHT/2, RING_RADIUS, 0xcc8844)
makeRing(HEIGHT/2, NECK_RADIUS, 0x8866cc, 0.1)
makeRing(-HEIGHT/2, NECK_RADIUS, 0x8866cc, 0.1)

// Support rods connecting rings
function makeRod(y1, y2, r) {
  const pts = [
    new THREE.Vector3(r, y1, 0),
    new THREE.Vector3(r, y2, 0)
  ]
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color: 0x998866, opacity: 0.5, transparent: true })
  scene.add(new THREE.Line(geo, mat))
  // And rotated versions
  for (let a = 1; a < 6; a++) {
    const angle = a * Math.PI / 3
    const pts2 = [
      new THREE.Vector3(r * Math.cos(angle), y1, r * Math.sin(angle)),
      new THREE.Vector3(r * Math.cos(angle), y2, r * Math.sin(angle))
    ]
    const geo2 = new THREE.BufferGeometry().setFromPoints(pts2)
    scene.add(new THREE.Line(geo2, mat))
  }
}
makeRod(HEIGHT/2, -HEIGHT/2, RING_RADIUS)

// Ground plane for reference
const groundGeo = new THREE.PlaneGeometry(40, 40)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x080810, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -HEIGHT/2 - 3
ground.receiveShadow = true
scene.add(ground)

// Info text
const infoEl = document.createElement('div')
infoEl.style.cssText = 'position:fixed;top:16px;left:16px;color:#aaf;font-family:monospace;font-size:12px;pointer-events:none;line-height:1.7'
document.body.appendChild(infoEl)

// Parameters control
const params = {
  neckScale: 1.0,
  thickness: 0.3,
  autoRotate: true
}
let neckScale = 1.0

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  const t = Date.now() * 0.001
  soapMat.uniforms.uTime.value = t
  soapMat.uniforms.uThickness.value = params.thickness

  // Slowly change neck radius for visual interest
  neckScale = 0.8 + 0.4 * Math.sin(t * 0.3)
  surfaceMesh.geometry.dispose()
  surfaceMesh.geometry = buildSurface(neckScale)

  infoEl.innerHTML = `Soap Film Catenoid Bridge<br>` +
    `Minimal surface connecting two rings<br>` +
    `x = a·cosh(z/a)·cos(theta)<br>` +
    `y = a·cosh(z/a)·sin(theta)<br>` +
    `Thin film interference: ${(params.thickness).toFixed(2)}<br>` +
    `Auto-rotating. Drag to orbit.`

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
