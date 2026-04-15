// 3304. Lattice Boltzmann D2Q9 Fluid Simulation
// type: physics
import * as THREE from 'three'

const NX = 200, NY = 100
// D2Q9 directions: 0=center, 1-4=cardinal, 5-8=diagonal
const EX = [0, 1, 0, -1, 0, 1, -1, -1, 1]
const EY = [0, 0, 1, 0, -1, 1, 1, -1, -1]
const WT = [4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36]
const OMEGA = 0.998
const RHO0 = 1.0
const U0 = 0.07

let f0, fNew, rho, ux, uy, obstacles
let scene, camera, renderer, mesh, mat, texData
let paused = false
let stepCount = 0

function IX(x, y) { return y * NX + x }

function init() {
  f0 = new Float32Array(NX * NY * 9)
  fNew = new Float32Array(NX * NY * 9)
  rho = new Float32Array(NX * NY)
  ux = new Float32Array(NX * NY)
  uy = new Float32Array(NX * NY)
  obstacles = new Uint8Array(NX * NY)

  // Init equilibrium
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = IX(x, y)
      rho[i] = RHO0
      ux[i] = U0
      uy[i] = 0
      for (let d = 0; d < 9; d++) {
        const eu = EX[d] * ux[i] + EY[d] * uy[i]
        const u2 = ux[i] * ux[i] + uy[i] * uy[i]
        f0[i * 9 + d] = WT[d] * rho[i] * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * u2)
      }
    }
  }

  // Cylinder obstacle
  const cx = Math.floor(NX * 0.5), cy = Math.floor(NY * 0.5), cr = 5
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < cr * cr) {
        obstacles[IX(x, y)] = 1
      }
    }
  }

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020208)

  camera = new THREE.OrthographicCamera(-NX/2 * 0.12, NX/2 * 0.12, NY/2 * 0.12, -NY/2 * 0.12, 0.1, 100)
  camera.position.z = 10

  renderer = new THREE.WebGLRenderer({ antialias: false })
  renderer.setSize(innerWidth, innerHeight)
  document.body.appendChild(renderer.domElement)

  texData = new Uint8Array(NX * NY * 4)
  const tex = new THREE.DataTexture(texData, NX, NY, THREE.RGBAFormat)
  tex.needsUpdate = true
  mat = new THREE.MeshBasicMaterial({ map: tex })
  mesh = new THREE.Mesh(new THREE.PlaneGeometry(NX * 0.12, NY * 0.12), mat)
  scene.add(mesh)

  setupEvents()
  animate()
}

function lbStep() {
  // Collision
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = IX(x, y)
      if (obstacles[i]) {
        for (let d = 0; d < 9; d++) fNew[i * 9 + d] = f0[i * 9 + (8 - d)]
        continue
      }
      const u2 = ux[i] * ux[i] + uy[i] * uy[i]
      for (let d = 0; d < 9; d++) {
        const eu = EX[d] * ux[i] + EY[d] * uy[i]
        const feq = WT[d] * rho[i] * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * u2)
        fNew[i * 9 + d] = f0[i * 9 + d] + OMEGA * (feq - f0[i * 9 + d])
      }
    }
  }

  // Swap buffers
  const tmp = f0; f0 = fNew; fNew = tmp

  // Streaming + boundaries
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = IX(x, y)
      for (let d = 0; d < 9; d++) {
        const xn = (x - EX[d] + NX) % NX
        const yn = Math.max(0, Math.min(NY - 1, y - EY[d]))
        fNew[i * 9 + d] = f0[IX(xn, yn) * 9 + d]
      }
    }
  }

  // Inlet (left) - Dirichlet
  for (let y = 0; y < NY; y++) {
    const i = IX(0, y)
    rho[i] = RHO0
    ux[i] = U0
    uy[i] = 0
    const u2 = U0 * U0
    for (let d = 0; d < 9; d++) {
      const eu = EX[d] * U0
      fNew[i * 9 + d] = WT[d] * RHO0 * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * u2)
    }
  }
  // Outlet (right) - extrapolation
  for (let y = 0; y < NY; y++) {
    for (let d = 0; d < 9; d++) {
      fNew[IX(NX-1, y) * 9 + d] = fNew[IX(NX-2, y) * 9 + d]
    }
  }
  // Top/bottom walls - bounce-back
  for (let x = 0; x < NX; x++) {
    for (let d = 0; d < 9; d++) {
      fNew[IX(x, 0) * 9 + d] = f0[IX(x, 0) * 9 + (8 - d)]
      fNew[IX(x, NY-1) * 9 + d] = f0[IX(x, NY-1) * 9 + (8 - d)]
    }
  }

  // Macroscopic
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = IX(x, y)
      rho[i] = 0; ux[i] = 0; uy[i] = 0
      for (let d = 0; d < 9; d++) {
        rho[i] += fNew[i * 9 + d]
        ux[i] += fNew[i * 9 + d] * EX[d]
        uy[i] += fNew[i * 9 + d] * EY[d]
      }
      if (rho[i] > 1e-6) { ux[i] /= rho[i]; uy[i] /= rho[i] }
    }
  }
}

function updateTexture() {
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = IX(x, y)
      const idx = i * 4
      if (obstacles[i]) {
        texData[idx] = 80; texData[idx+1] = 80; texData[idx+2] = 100; texData[idx+3] = 255
      } else {
        const vel = Math.sqrt(ux[i] * ux[i] + uy[i] * uy[i])
        const n = Math.min(255, Math.floor(vel * 600))
        texData[idx] = Math.min(255, n * 2)
        texData[idx+1] = Math.min(255, n)
        texData[idx+2] = 255 - Math.min(255, n >> 1)
        texData[idx+3] = 255
      }
    }
  }
  mat.map.image.data.set(texData)
  mat.map.needsUpdate = true
}

function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    renderer.setSize(innerWidth, innerHeight)
  })
  window.addEventListener('keydown', e => { if (e.code === 'Space') paused = !paused })
  window.addEventListener('click', e => {
    const rect = renderer.domElement.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
    const cx2 = Math.floor((nx * 0.5 + 0.5) * NX)
    const cy2 = Math.floor((ny * 0.5 + 0.5) * NY)
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const xi = cx2 + dx, yi = cy2 + dy
      if (xi > 1 && xi < NX-2 && yi > 1 && yi < NY-2) obstacles[IX(xi, yi)] ^= 1
    }
  })
}

function animate() {
  requestAnimationFrame(animate)
  if (!paused) {
    for (let s = 0; s < 5; s++) lbStep()
    stepCount++
    if (stepCount % 2 === 0) updateTexture()
  }
  renderer.render(scene, camera)
}

init()
