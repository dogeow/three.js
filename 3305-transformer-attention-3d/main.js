// 3305. Transformer Attention 3D Visualization
// type: visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'

// 6 token sequence
const TOKENS = ['The', 'cat', 'sat', 'on', 'the', 'mat']
const N = TOKENS.length
const EMBED_DIM = 8

let scene, camera, renderer, controls
let tokenMeshes = []
let attentionLines = []
let attentionWeights = []
let lineGroup
let layerGroups = []
let time = 0

function softmax(arr) {
  const max = Math.max(...arr)
  const exps = arr.map(x => Math.exp(x - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(x => x / sum)
}

function dotProduct(a, b) {
  return a.reduce((s, v, i) => s + v * b[i], 0)
}

function generateAttention(layerIdx) {
  const weights = []
  for (let i = 0; i < N; i++) {
    const row = []
    for (let j = 0; j < N; j++) {
      if (i === j) {
        row.push(0.8 + Math.sin(layerIdx * 0.5) * 0.15)
      } else {
        const base = 1.0 / Math.abs(i - j) * 0.5
        const noise = Math.sin(i * 3.1 + j * 2.7 + layerIdx * 1.3) * 0.3
        row.push(Math.max(0, base + noise))
      }
    }
    // softmax over row
    const sm = softmax(row)
    // inject some layer-specific patterns
    if (layerIdx === 0) {
      sm[Math.min(i + 1, N - 1)] += 0.2
    } else if (layerIdx === 1) {
      sm[N - 1] += 0.3
    } else {
      sm[Math.floor(N / 2)] += 0.25
    }
    const total = sm.reduce((a, b) => a + b, 0)
    row.push(sm[0] / total, sm[1] / total, sm[2] / total, sm[3] / total, sm[4] / total, sm[5] / total)
    weights.push(sm.map(v => v / total))
  }
  return weights
}

function sinusoidalPositionalEncoding(i) {
  const enc = []
  for (let d = 0; d < EMBED_DIM; d++) {
    const freq = Math.pow(10000, (2 * Math.floor(d / 2)) / EMBED_DIM)
    enc.push(Math.sin(i / freq * Math.PI))
  }
  return enc
}

function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050510)
  scene.fog = new THREE.FogExp2(0x050510, 0.025)

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
  camera.position.set(0, 5, 30)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(innerWidth, innerHeight)
  document.body.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.5

  // Ambient light
  scene.add(new THREE.AmbientLight(0x6644aa, 0.8))
  const pt = new THREE.PointLight(0xa44dff, 2, 60)
  pt.position.set(0, 15, 10)
  scene.add(pt)

  lineGroup = new THREE.Group()
  scene.add(lineGroup)

  // Token positions (vertical arrangement for each layer)
  const layers = 3
  for (let layer = 0; layer < layers; layer++) {
    const layerGroup = new THREE.Group()
    layerGroup.position.y = (layers - 1 - layer) * 8 - 8
    scene.add(layerGroup)

    const positions = []
    for (let i = 0; i < N; i++) {
      const x = (i - (N - 1) / 2) * 4
      positions.push(new THREE.Vector3(x, 0, 0))
    }

    // Create token spheres
    for (let i = 0; i < N; i++) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 32, 32),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.7 + i * 0.05, 0.8, 0.5),
          emissive: new THREE.Color().setHSL(0.7 + i * 0.05, 0.8, 0.15),
          roughness: 0.3,
          metalness: 0.5
        })
      )
      sphere.position.copy(positions[i])
      sphere.userData.tokenIdx = i
      layerGroup.add(sphere)
    }

    // Embedding vectors as small line segments
    for (let i = 0; i < N; i++) {
      const enc = sinusoidalPositionalEncoding(i)
      for (let d = 0; d < EMBED_DIM; d++) {
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, Math.abs(enc[d]) * 1.5, 6),
          new THREE.MeshStandardMaterial({
            color: enc[d] > 0 ? 0x44ffaa : 0xff4466,
            emissive: enc[d] > 0 ? 0x22aa55 : 0x882233,
            transparent: true,
            opacity: 0.7
          })
        )
        bar.position.set(positions[i].x + (d - EMBED_DIM/2) * 0.25, -2, 0)
        bar.rotation.z = enc[d] > 0 ? 0 : Math.PI
        layerGroup.add(bar)
      }
    }

    // Attention lines
    const weights = generateAttention(layer)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xaa44ff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    })

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const w = weights[i][j]
        if (w < 0.05 || i === j) continue
        const opacity = Math.min(0.7, w * 2)
        const mat = lineMat.clone()
        mat.opacity = opacity
        const points = [positions[i].clone(), positions[j].clone()]
        points[0].z = 0.5
        points[1].z = 0.5
        const geo = new THREE.BufferGeometry().setFromPoints(points)
        const line = new THREE.Line(geo, mat)
        line.userData.weight = w
        line.userData.from = i
        line.userData.to = j
        lineGroup.add(line)
        attentionLines.push(line)
      }
    }

    // Layer label
    const layerLabel = createTextSprite(`Layer ${layer + 1}`, {
      fontSize: 24,
      color: '#aa88ff'
    })
    layerLabel.position.set(-(N * 2), 2, 0)
    layerGroup.add(layerLabel)

    layerGroups.push(layerGroup)
  }

  // Token labels (only on bottom layer)
  const labelGroup = layerGroups[layers - 1]
  for (let i = 0; i < N; i++) {
    const x = (i - (N - 1) / 2) * 4
    const label = createTextSprite(TOKENS[i], {
      fontSize: 20,
      color: `hsl(${270 + i * 15}, 80%, 70%)`
    })
    label.position.set(x, -3.5, 0)
    labelGroup.add(label)
  }

  setupEvents()
  animate()
}

function createTextSprite(text, opts = {}) {
  const fontSize = opts.fontSize || 24
  const color = opts.color || '#ffffff'
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.font = `${fontSize}px monospace`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 32)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(4, 1, 1)
  return sprite
}

function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })
  window.addEventListener('click', () => {
    // Toggle auto-rotate on click
    controls.autoRotate = !controls.autoRotate
  })
}

function animate() {
  requestAnimationFrame(animate)
  time += 0.016

  // Pulse attention lines
  for (const line of attentionLines) {
    const w = line.userData.weight
    const pulse = 0.5 + 0.5 * Math.sin(time * 2 + line.userData.from * 0.5)
    line.material.opacity = Math.min(0.6, w * 1.5) * pulse + 0.1
  }

  // Rotate token spheres
  layerGroups.forEach((lg, li) => {
    lg.children.forEach((child, ci) => {
      if (child instanceof THREE.Mesh && child.geometry.type === 'SphereGeometry') {
        child.rotation.y = time * 0.5 + ci * 0.3 + li * 0.2
        const scale = 1 + 0.1 * Math.sin(time * 3 + ci * 0.5)
        child.scale.setScalar(scale)
      }
    })
  })

  controls.update()
  renderer.render(scene, camera)
}

init()
