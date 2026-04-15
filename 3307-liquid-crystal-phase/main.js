// 3307. Liquid Crystal Nematic Phase - Molecular orientation field
// type: physics
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const N = 40   // grid size
const SCALE = 1.2

let scene, camera, renderer, controls
let director = []     // director field [cos(theta), sin(theta)]
let arrows = []
let arrowGroup
let time = 0
let paused = false

// Maier-Saupe mean-field order parameter S (0=disordered, 1=perfect)
let S = 0.75
let temp = 0.3   // temperature (0-1, higher = more disordered)

function IX(x, y) { return y * N + x }

function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050508)
  scene.fog = new THREE.FogExp2(0x050508, 0.04)

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
  camera.position.set(0, 40, 60)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(innerWidth, innerHeight)
  document.body.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.3

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.3))
  const pt = new THREE.PointLight(0xff88cc, 1.5, 80)
  pt.position.set(20, 30, 20)
  scene.add(pt)
  const pt2 = new THREE.PointLight(0x88ccff, 1.0, 80)
  pt2.position.set(-20, 20, -20)
  scene.add(pt2)

  arrowGroup = new THREE.Group()
  scene.add(arrowGroup)

  // Initialize director field with slight random perturbation
  director = new Float32Array(N * N * 2)
  const baseAngle = Math.PI / 4
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = IX(x, y)
      // Add defects - vortex patterns
      const cx = x - N / 2, cy = y - N / 2
      const r = Math.sqrt(cx * cx + cy * cy)
      const angleNoise = (Math.random() - 0.5) * 1.5 * (1 - temp * 1.2)
      let angle
      if (r < 3) {
        // Point defect at center
        angle = Math.atan2(cy, cx) + angleNoise
      } else {
        angle = baseAngle + angleNoise + Math.sin(cx * 0.3) * 0.3 + Math.cos(cy * 0.4) * 0.2
      }
      director[i * 2] = Math.cos(angle)
      director[i * 2 + 1] = Math.sin(angle)
    }
  }

  // Create arrow meshes
  createArrows()
  createDefectMarkers()
  createDomainBoundaries()

  setupGUI()
  setupEvents()
  animate()
}

function createArrows() {
  arrowGroup.clear()
  arrows = []

  const arrowGeo = new THREE.ConeGeometry(0.15, 0.6, 6)
  const shaftGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6)

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = IX(x, y)
      const dx = director[i * 2]
      const dy = director[i * 2 + 1]
      const angle = Math.atan2(dy, dx)

      const group = new THREE.Group()

      // Shaft
      const shaft = new THREE.Mesh(shaftGeo,
        new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }))
      shaft.rotation.z = angle - Math.PI / 2
      shaft.position.x = Math.cos(angle) * 0.2
      shaft.position.y = Math.sin(angle) * 0.2
      group.add(shaft)

      // Head
      const head = new THREE.Mesh(arrowGeo,
        new THREE.MeshPhongMaterial({
          color: new THREE.Color().setHSL((angle + Math.PI) / (2 * Math.PI), 0.8, 0.6),
          emissive: new THREE.Color().setHSL((angle + Math.PI) / (2 * Math.PI), 0.8, 0.2),
          transparent: true,
          opacity: 0.9
        }))
      head.rotation.z = angle - Math.PI / 2
      head.position.x = Math.cos(angle) * 0.5
      head.position.y = Math.sin(angle) * 0.5
      group.add(head)

      const wx = (x - N / 2) * SCALE
      const wz = (y - N / 2) * SCALE
      group.position.set(wx, 0, wz)
      group.userData = { gridX: x, gridY: y }
      arrowGroup.add(group)
      arrows.push(group)
    }
  }
}

function createDefectMarkers() {
  // Mark topological defects
  const defectGeo = new THREE.SphereGeometry(0.4, 16, 16)
  const defects = findDefects()
  for (const [x, y, charge] of defects) {
    const mat = new THREE.MeshStandardMaterial({
      color: charge > 0 ? 0xff4444 : 0x4444ff,
      emissive: charge > 0 ? 0xff2222 : 0x2222ff,
      transparent: true,
      opacity: 0.7
    })
    const marker = new THREE.Mesh(defectGeo, mat)
    marker.position.set((x - N / 2) * SCALE, 0.3, (y - N / 2) * SCALE)
    scene.add(marker)
  }
}

function findDefects() {
  const defects = []
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      let winding = 0
      const dirs = [
        [IX(x, y), IX(x+1, y), IX(x+1, y+1), IX(x, y+1), IX(x-1, y+1), IX(x-1, y), IX(x-1, y-1), IX(x, y-1), IX(x+1, y-1)]
      ]
      const i = IX(x, y)
      const angles = dirs[0].map(ci => Math.atan2(director[ci*2+1], director[ci*2]))
      for (let a = 0; a < 8; a++) {
        let dAngle = angles[(a + 1) % 8] - angles[a]
        while (dAngle > Math.PI) dAngle -= 2 * Math.PI
        while (dAngle < -Math.PI) dAngle += 2 * Math.PI
        winding += dAngle
      }
      const charge = winding / (2 * Math.PI)
      if (Math.abs(charge) > 0.3) {
        defects.push([x, y, Math.round(charge)])
      }
    }
  }
  return defects
}

function createDomainBoundaries() {
  // Draw domain walls where director changes rapidly
  const points = []
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const i = IX(x, y)
      const dx = director[i * 2]
      const dy = director[i * 2 + 1]
      const nx = director[IX(x+1, y) * 2]
      const ny = director[IX(x+1, y) * 2 + 1]
      const change = 1 - (dx * nx + dy * ny)  // 1 - dot product
      if (change > 0.4) {
        points.push(new THREE.Vector3((x - N/2) * SCALE, 0.05, (y - N/2) * SCALE))
      }
    }
  }
  if (points.length > 0) {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.PointsMaterial({ color: 0x00ffaa, size: 0.2, transparent: true, opacity: 0.5 })
    scene.add(new THREE.Points(geo, mat))
  }
}

function evolveDirector() {
  const newDir = new Float32Array(director)

  for (let y = 2; y < N - 2; y++) {
    for (let x = 2; x < N - 2; x++) {
      const i = IX(x, y)

      // Elastic constants (one-constant approximation)
      const laplacianX = director[(x+1 + y*N)*2] + director[(x-1 + y*N)*2] +
                          director[(x + (y+1)*N)*2] + director[(x + (y-1)*N)*2] - 4 * director[i*2]
      const laplacianY = director[(x+1 + y*N)*2+1] + director[(x-1 + y*N)*2+1] +
                          director[(x + (y+1)*N)*2+1] + director[(x + (y-1)*N)*2+1] - 4 * director[i*2+1]

      // Mean-field torque (tends to align with neighbors)
      const neighborAvgX = (director[(x+1+y*N)*2] + director[(x-1+y*N)*2] +
                              director[(x+(y+1)*N)*2] + director[(x+(y-1)*N)*2]) / 4
      const neighborAvgY = (director[(x+1+y*N)*2+1] + director[(x-1+y*N)*2+1] +
                              director[(x+(y+1)*N)*2+1] + director[(x+(y-1)*N)*2+1]) / 4

      // Add random thermal fluctuations
      const thermalX = (Math.random() - 0.5) * temp * 0.1
      const thermalY = (Math.random() - 0.5) * temp * 0.1

      newDir[i*2] = director[i*2] + 0.02 * (neighborAvgX - director[i*2] * S * 0.5) + laplacianX * 0.03 + thermalX
      newDir[i*2+1] = director[i*2+1] + 0.02 * (neighborAvgY - director[i*2+1] * S * 0.5) + laplacianY * 0.03 + thermalY

      // Renormalize
      const len = Math.sqrt(newDir[i*2]**2 + newDir[i*2+1]**2)
      if (len > 0.001) {
        newDir[i*2] /= len
        newDir[i*2+1] /= len
      }
    }
  }

  director.set(newDir)

  // Update arrow orientations
  for (const arrow of arrows) {
    const gx = arrow.userData.gridX, gy = arrow.userData.gridY
    const i = IX(gx, gy)
    const dx = director[i * 2]
    const dy = director[i * 2 + 1]
    const angle = Math.atan2(dy, dx)
    const wx = (gx - N / 2) * SCALE
    const wz = (gy - N / 2) * SCALE

    arrow.children.forEach(child => {
      if (child.geometry.type === 'ConeGeometry') {
        child.rotation.z = angle - Math.PI / 2
        child.position.x = Math.cos(angle) * 0.5
        child.position.y = Math.sin(angle) * 0.5
        child.material.color.setHSL((angle + Math.PI) / (2 * Math.PI), 0.8, 0.6)
        child.material.emissive.setHSL((angle + Math.PI) / (2 * Math.PI), 0.8, 0.2)
      } else {
        child.rotation.z = angle - Math.PI / 2
        child.position.x = Math.cos(angle) * 0.2
        child.position.y = Math.sin(angle) * 0.2
      }
    })
  }
}

function setupGUI() {
  const gui = new GUI()
  gui.add({ S }, 'S', 0, 1).name('Order Parameter S').onChange(v => { S = v })
  gui.add({ temp }, 'temp', 0, 1).name('Temperature').onChange(v => { temp = v })
  gui.add({ paused }, 'paused').name('Pause')
}

function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })
  window.addEventListener('click', e => {
    // Perturb director field at click point
    const rect = renderer.domElement.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
    const wx = nx * N * SCALE * 0.5
    const wz = ny * N * SCALE * 0.5
    const gx = Math.floor(wx / SCALE + N / 2)
    const gy = Math.floor(wz / SCALE + N / 2)
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const xi = gx + dx, yi = gy + dy
        if (xi > 0 && xi < N - 1 && yi > 0 && yi < N - 1) {
          const i = IX(xi, yi)
          const angle = Math.atan2(director[i*2+1], director[i*2]) + (Math.random() - 0.5) * 1.5
          director[i*2] = Math.cos(angle)
          director[i*2+1] = Math.sin(angle)
        }
      }
    }
  })
}

function animate() {
  requestAnimationFrame(animate)
  if (!paused) {
    for (let s = 0; s < 2; s++) evolveDirector()
    time += 0.016
  }
  controls.update()
  renderer.render(scene, camera)
}

init()
