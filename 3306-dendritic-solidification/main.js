// 3306. Dendritic Solidification - Metal solidification with Stefan condition
// type: physics
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const GRID = 120
const CELL = 1.0
const T_MELT = 0.0      // melting temperature
const T_INI = 1.0       // initial superheated liquid
const T_COLD = -1.0     // cold boundary
const ALPHA = 0.15      // thermal diffusivity
const LATENT = 0.1      // latent heat
const DT = 0.02

let scene, camera, renderer, controls
let temp = [], solid = []
let tempTex, mesh, geo
let time = 0
let paused = false
let meltFrac = 0

function IX(x, y) { return y * GRID + x }

function init() {
  temp = new Float32Array(GRID * GRID)
  solid = new Float32Array(GRID * GRID)

  // Initialize: superheated liquid everywhere except cold bottom
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = IX(x, y)
      const distFromBottom = y / GRID
      temp[i] = T_INI * (1 - distFromBottom * 0.3)
      solid[i] = 0
    }
  }

  // Seed crystal at bottom center
  const seedX = Math.floor(GRID * 0.5)
  const seedY = 0
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const xi = seedX + dx, yi = seedY + dy
      if (xi >= 0 && xi < GRID && yi >= 0 && yi < GRID) {
        temp[IX(xi, yi)] = T_MELT - 0.1
        solid[IX(xi, yi)] = 1
      }
    }
  }

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080808)

  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
  camera.position.set(0, 30, 90)
  camera.lookAt(0, 20, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(innerWidth, innerHeight)
  document.body.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // Temperature texture
  const texData = new Uint8Array(GRID * GRID * 4)
  const tex = new THREE.DataTexture(texData, GRID, GRID, THREE.RGBAFormat)
  tex.needsUpdate = true
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tempTex = tex

  geo = new THREE.PlaneGeometry(GRID * CELL, GRID * CELL)
  mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(GRID * CELL / 2, 0, GRID * CELL / 2)
  scene.add(mesh)

  // Grid helper
  const grid = new THREE.GridHelper(GRID * CELL, 30, 0x222222, 0x111111)
  grid.position.y = -0.1
  scene.add(grid)

  // Axis labels (approximate)
  const axesMat = new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.5 })
  const xAxis = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5, 0, 0), new THREE.Vector3(GRID * CELL + 5, 0, 0)])
  const yAxis = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(GRID * CELL / 2, -5, 0), new THREE.Vector3(GRID * CELL / 2, GRID * CELL + 5, 0)])
  scene.add(new THREE.Line(xAxis, axesMat))
  scene.add(new THREE.Line(yAxis, axesMat))

  // Directional light
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const sun = new THREE.DirectionalLight(0xffeedd, 0.8)
  sun.position.set(50, 100, 50)
  scene.add(sun)

  // Edge glow for solid region
  const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(GRID * CELL, 1, GRID * CELL))
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.3 })
  scene.add(new THREE.LineSegments(edgeGeo, edgeMat))

  setupGUI()
  setupEvents()
  animate()
}

function updateTempTexture() {
  const data = tempTex.image.data
  let totalMelt = 0
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = IX(x, y)
      const t = temp[i]
      const s = solid[i]
      totalMelt += s

      let r, g, b
      if (s > 0.5) {
        // Solid metal - silvery
        const dendriteIntensity = s + 0.1 * Math.sin(x * 0.5) * Math.cos(y * 0.7)
        r = Math.floor(Math.min(255, 180 + dendriteIntensity * 40))
        g = Math.floor(Math.min(255, 170 + dendriteIntensity * 30))
        b = Math.floor(Math.min(255, 160 + dendriteIntensity * 20))
      } else {
        // Liquid: hot=red/orange, cold=blue
        const heat = Math.max(0, (T_INI - t) / (T_INI - T_COLD))
        r = Math.floor(255 * Math.pow(heat, 0.5))
        g = Math.floor(60 * heat)
        b = Math.floor(200 * (1 - heat * 0.7))
      }

      const idx = i * 4
      data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 255
    }
  }
  meltFrac = totalMelt / (GRID * GRID)
  tempTex.needsUpdate = true
}

function thermalStep() {
  const newTemp = new Float32Array(temp)
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const i = IX(x, y)
      if (solid[i] > 0.5) {
        // Solid - maintain at melt temp, release latent heat
        newTemp[i] = T_MELT
        continue
      }
      // Laplace operator
      const laplacian = (
        temp[IX(x+1, y)] + temp[IX(x-1, y)] +
        temp[IX(x, y+1)] + temp[IX(x, y-1)] -
        4 * temp[i]
      )
      newTemp[i] = temp[i] + ALPHA * laplacian
    }
  }

  // Boundary: cold at bottom
  for (let x = 0; x < GRID; x++) {
    newTemp[IX(x, 0)] = T_COLD
    newTemp[IX(x, 1)] = T_COLD * 0.8
  }
  // Adiabatic top and sides
  for (let y = 0; y < GRID; y++) {
    newTemp[IX(0, y)] = newTemp[IX(1, y)]
    newTemp[IX(GRID-1, y)] = newTemp[IX(GRID-2, y)]
  }
  newTemp[IX(GRID/2, GRID-1)] = T_INI

  temp.set(newTemp)

  // Solidification front
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const i = IX(x, y)
      if (solid[i] > 0.5) continue
      if (temp[i] < T_MELT) {
        // Phase change - check neighbors
        const hasSolidNeighbor =
          solid[IX(x+1,y)] > 0.5 || solid[IX(x-1,y)] > 0.5 ||
          solid[IX(x,y+1)] > 0.5 || solid[IX(x,y-1)] > 0.5
        if (hasSolidNeighbor) {
          solid[i] = 1
          temp[i] = T_MELT
        }
      }
    }
  }

  // Dendritic branching - stochastic
  for (let y = 2; y < GRID - 2; y++) {
    for (let x = 2; x < GRID - 2; x++) {
      const i = IX(x, y)
      if (solid[i] > 0.5) continue
      // Undercooling-driven growth
      const undercool = T_MELT - temp[i]
      if (undercool > 0.05) {
        const neighbors = [
          [IX(x+1,y), IX(x-1,y)],
          [IX(x,y+1), IX(x,y-1)],
          [IX(x+1,y+1), IX(x-1,y-1)],
          [IX(x+1,y-1), IX(x-1,y+1)]
        ]
        for (const [ni1, ni2] of neighbors) {
          if (solid[ni1] > 0.5 && solid[ni2] < 0.5 && Math.random() < 0.03 * undercool) {
            solid[ni2] = 1
            temp[ni2] = T_MELT
          }
        }
      }
    }
  }
}

function setupGUI() {
  const gui = new GUI()
  gui.add({ alpha: ALPHA }, 'alpha', 0.01, 0.5).name('Thermal Diffusivity').onChange(v => { window._alpha = v })
  gui.add({ latent: LATENT }, 'latent', 0, 0.5).name('Latent Heat').onChange(v => { window._latent = v })
  gui.add({ paused }, 'paused').name('Pause')
}

function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') paused = !paused
  })
}

function animate() {
  requestAnimationFrame(animate)
  if (!paused) {
    for (let s = 0; s < 3; s++) thermalStep()
    time += DT * 3
    updateTempTexture()
  }
  controls.update()
  renderer.render(scene, camera)
}

updateTempTexture()
init()
