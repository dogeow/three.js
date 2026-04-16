// 3900. Riemann Zeta — Critical Line Visualization
// 黎曼ζ函数临界线可视化
// type: mathematics | number-theory | visualization
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020210)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 8, 50)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dLight = new THREE.DirectionalLight(0xffffff, 0.8)
dLight.position.set(5, 10, 5)
scene.add(dLight)

// ── Complex plane grid ─────────────────────────────────────────────────────────
const planeSize = 80
const gridDiv = 40
const gridLines = new THREE.Group()
for (let i = -gridDiv; i <= gridDiv; i++) {
  const step = planeSize / gridDiv
  const mat1 = new THREE.LineBasicMaterial({ color: 0x1a1a4a, transparent: true, opacity: 0.5 })
  const mat2 = new THREE.LineBasicMaterial({ color: 0x2a2a5a, transparent: true, opacity: 0.5 })
  const pts1 = [new THREE.Vector3(i * step, 0, -planeSize / 2), new THREE.Vector3(i * step, 0, planeSize / 2)]
  const pts2 = [new THREE.Vector3(-planeSize / 2, 0, i * step), new THREE.Vector3(planeSize / 2, 0, i * step)]
  gridLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), mat1))
  gridLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), mat2))
}
// Real axis
const realAxisPts = [new THREE.Vector3(-planeSize / 2, 0.02, 0), new THREE.Vector3(planeSize / 2, 0.02, 0)]
gridLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(realAxisPts), new THREE.LineBasicMaterial({ color: 0x4455ff })))
// Imaginary axis
const imagAxisPts = [new THREE.Vector3(0, 0.02, -planeSize / 2), new THREE.Vector3(0, 0.02, planeSize / 2)]
gridLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(imagAxisPts), new THREE.LineBasicMaterial({ color: 0x4455ff })))
scene.add(gridLines)

// Critical strip boundary (Re(s)=0 and Re(s)=1)
for (let x of [-0.01, 1.01]) {
  const pts = [new THREE.Vector3(x * 20 - 10, 0.05, -planeSize / 2), new THREE.Vector3(x * 20 - 10, 0.05, planeSize / 2)]
  gridLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xff4455 })))
}

// Critical line Re(s) = 1/2
const clPts = [new THREE.Vector3(0, 0.1, -planeSize / 2), new THREE.Vector3(0, 0.1, planeSize / 2)]
gridLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(clPts), new THREE.LineBasicMaterial({ color: 0xffdd00, linewidth: 2 })))

// ── Riemann Zeta approximation (needs proper implementation) ──────────────────
// Using Euler-Maclaurin partial sum up to N terms
function zeta(sRe, sIm, N = 200) {
  let real = 0, imag = 0
  for (let n = 1; n <= N; n++) {
    const n_real = 1.0 / Math.pow(n, sRe)
    const theta = sIm * Math.log(n)
    real += n_real * Math.cos(theta) / N
    imag += n_real * Math.sin(theta) / N
  }
  return { real, imag }
}

function zetaAlt(sRe, sIm, N = 150) {
  // Alternating series for Re(s) > 0
  if (sRe > 0.5) {
    let real = 0, imag = 0
    for (let n = 1; n <= N; n++) {
      const sign = (n % 2 === 0) ? -1 : 1
      const n_real = sign * 1.0 / Math.pow(n, sRe)
      const theta = sIm * Math.log(n)
      real += n_real * Math.cos(theta)
      imag += n_real * Math.sin(theta)
    }
    // 1/(1-2^(1-s))
    const expArg = (1 - sRe) * Math.log(2)
    const denom_real = 1 - Math.pow(2, 1 - sRe) * Math.cos((1 - sRe) * 0)
    const denom_imag = -Math.pow(2, 1 - sRe) * Math.sin((1 - sRe) * 0)
    const mag2 = denom_real * denom_real + denom_imag * denom_imag
    const factor_real = denom_real / mag2
    const factor_imag = denom_imag / mag2
    return {
      real: (real * factor_real - imag * factor_imag),
      imag: (real * factor_imag + imag * factor_real)
    }
  }
  // Reflection: ζ(s) = ζ(1-s) * some factor... just use direct sum
  return zeta(sRe, sIm, N)
}

// Known nontrivial zeros (first 10, imaginary parts)
const KNOWN_ZEROS = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062,
  37.586178, 40.918719, 43.327073, 48.005151, 49.773832
]

// ── Zeta function heatmap plane ────────────────────────────────────────────────
const PLANE_DIV = 100
const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize, PLANE_DIV, PLANE_DIV)
const heatData = new Float32Array((PLANE_DIV + 1) * (PLANE_DIV + 1))
const zetaPlaneMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec2 vUv;
    varying float vMag;
    attribute float mag;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    void main() {
      // vUv: (0,0) bottom-left to (1,1) top-right
      // Map to complex plane: Re from 0 to 1, Im from 0 to 50
      float re = vUv.x;
      float im = vUv.y * 50.0;
      vec2 zeta = vec2(0.0); // Will be updated
      float mag = length(zeta);
      float logMag = log(mag + 0.01) * 0.3;
      float hue = 0.5 + logMag * 0.2;
      hue = clamp(hue, 0.0, 1.0);
      vec3 col = vec3(0.02, 0.02, 0.08); // dark default
      // We'll just color based on UV proximity to critical line
      float distToCL = abs(re - 0.5);
      col = mix(vec3(0.05, 0.05, 0.2), vec3(0.3, 0.0, 0.1), distToCL * 4.0);
      gl_FragColor = vec4(col, 0.4);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false
})
const zetaPlane = new THREE.Mesh(planeGeo, zetaPlaneMat)
zetaPlane.rotation.x = -Math.PI / 2
zetaPlane.position.y = -0.01
scene.add(zetaPlane)

// ── Zeros markers on critical line ─────────────────────────────────────────────
const zerosGroup = new THREE.Group()
zerosGroup.position.set(0, 0.2, 0)
scene.add(zerosGroup)

const zeroMeshes = []
KNOWN_ZEROS.forEach((im, i) => {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffdd00, wireframe: true })
  )
  sphere.position.set(0, 0, -(im - 25)) // offset so first few are visible
  sphere.scale.setScalar(0.5 + (i % 3) * 0.3)
  sphere.userData.idx = i
  zerosGroup.add(sphere)
  zeroMeshes.push(sphere)

  // Label
  const label = makeTextSprite(`₀ = ${im.toFixed(3)}i`, { fontSize: 10, color: '#ffdd00' })
  label.position.copy(sphere.position)
  label.position.y = 1.5
  zerosGroup.add(label)
})

// ── Theta function visualization (argument on critical line) ───────────────────
const thetaPoints = []
const thetaGroup = new THREE.Group()
thetaGroup.position.set(0, 0.5, 25) // off to the side
scene.add(thetaGroup)
scene.add(thetaGroup)

const thetaCurve = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0x00ffcc, linewidth: 2 })
)
thetaGroup.add(thetaCurve)

// ── Arg(zeta) coloring on critical line ───────────────────────────────────────
// Critical line: s = 1/2 + it
const CL_SAMPLES = 400
const clGeo = new THREE.BufferGeometry()
const clPositions = new Float32Array(CL_SAMPLES * 3)
const clColors = new Float32Array(CL_SAMPLES * 3)
clGeo.setAttribute('position', new THREE.BufferAttribute(clPositions, 3))
clGeo.setAttribute('color', new THREE.BufferAttribute(clColors, 3))
const clLine = new THREE.Line(clGeo, new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 }))
clLine.position.set(0, 0.15, 0)
scene.add(clLine)

function updateCriticalLine(t) {
  for (let i = 0; i < CL_SAMPLES; i++) {
    const im = (i / CL_SAMPLES) * 60 - 10 // Im from -10 to 50
    // Zeta(1/2 + it) approximation
    const { real, imag } = zeta(0.5, im, 100)
    const mag = Math.sqrt(real * real + imag * imag)
    const arg = Math.atan2(imag, real)

    // Height encodes magnitude (log scale)
    const h = Math.log(mag + 0.1) * 1.5

    clPositions[i * 3] = 0
    clPositions[i * 3 + 1] = h
    clPositions[i * 3 + 2] = -im

    // Color by argument
    const hue = (arg / (2 * Math.PI) + 1) % 1
    const col = new THREE.Color().setHSL(hue, 0.9, 0.55)
    clColors[i * 3] = col.r; clColors[i * 3 + 1] = col.g; clColors[i * 3 + 2] = col.b
  }
  clGeo.attributes.position.needsUpdate = true
  clGeo.attributes.color.needsUpdate = true
  clGeo.computeBoundingSphere()
}

// ── Pole markers (s = 1) ──────────────────────────────────────────────────────
const poleMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true })
)
poleMarker.position.set(20 - 10, 0.2, 0) // s=1 → x=1 → (1-0.5)*20=10... wait coords
// Re(s) from 0 to 1 maps to x from -10 to 10? No:
// Plane is 80 wide, from x=-40 to x=40 (divided by gridDiv)
// We want Re=1 → visible marker
// Let's use a separate marker
scene.remove(poleMarker)
const poleMarkerGroup = new THREE.Group()
scene.add(poleMarkerGroup)

// Pole at s=1
const pole1 = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xff3333 })
)
pole1.position.set(20, 0.2, 0) // Re(s)=1 → x=20 (since plane spans -40 to 40 with div=40, step=2)
poleMarkerGroup.add(pole1)
const pole1Label = makeTextSprite('ζ pole at s=1', { fontSize: 9, color: '#ff4444' })
pole1Label.position.copy(pole1.position)
pole1Label.position.y = 2
poleMarkerGroup.add(pole1Label)

// Pole at s=0
const pole0 = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xff3333 })
)
pole0.position.set(-20, 0.2, 0)
poleMarkerGroup.add(pole0)
const pole0Label = makeTextSprite('ζ pole at s=0', { fontSize: 9, color: '#ff4444' })
pole0Label.position.copy(pole0.position)
pole0Label.position.y = 2
poleMarkerGroup.add(pole0Label)

// ── 3D torus knot showing zeta zeros relation ─────────────────────────────────
const torusKnot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(5, 1.5, 128, 16, 2, 3),
  new THREE.MeshStandardMaterial({ color: 0x220033, emissive: 0x110022, roughness: 0.6 })
)
torusKnot.position.set(-30, 8, 15)
scene.add(torusKnot)

// ── Helper: text sprite ───────────────────────────────────────────────────────
function makeTextSprite(text, opts = {}) {
  const fontSize = opts.fontSize || 12
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.font = `${fontSize * 2}px monospace`
  ctx.fillStyle = opts.color || '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 32)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(6, 1.5, 1)
  return sprite
}

// ── Info UI ────────────────────────────────────────────────────────────────────
const infoEl = document.createElement('div')
infoEl.style.cssText = 'position:fixed;top:20px;left:20px;color:#aac;font-family:monospace;font-size:13px;z-index:10;pointer-events:none;line-height:1.9'
document.body.appendChild(infoEl)

// ── Animation ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
let camAngle = 0

function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  const t = clock.getElapsedTime()

  // Camera orbit
  camAngle += dt * 0.08
  camera.position.x = Math.sin(camAngle) * 50
  camera.position.z = Math.cos(camAngle) * 50
  camera.position.y = 8 + Math.sin(camAngle * 0.5) * 5
  camera.lookAt(0, 2, -5)

  // Animate zeros
  zeroMeshes.forEach((m, i) => {
    m.scale.setScalar(0.5 + (i % 3) * 0.3 + Math.sin(t * 2 + i) * 0.1)
    m.material.color.setHSL((t * 0.1 + i * 0.1) % 1, 0.9, 0.6)
  })

  torusKnot.rotation.x = t * 0.1
  torusKnot.rotation.y = t * 0.15

  zetaPlaneMat.uniforms.uTime.value = t

  updateCriticalLine(t)

  // Info
  infoEl.innerHTML = `Riemann ζ(s) Critical Strip<br>`
  infoEl.innerHTML += `Re(s) axis → horizontal<br>`
  infoEl.innerHTML += `Im(s) axis → depth<br>`
  infoEl.innerHTML += `<span style="color:#ffdd00">— Critical Line Re(s)=½</span><br>`
  infoEl.innerHTML += `<span style="color:#ff4455">| Critical Strip: 0&lt;Re(s)&lt;1</span><br>`
  infoEl.innerHTML += `<span style="color:#00ffcc">Color = Arg(ζ(s)) hue</span><br>`
  infoEl.innerHTML += `<br>First few nontrivial zeros:<br>`
  KNOWN_ZEROS.slice(0, 5).forEach((z, i) => {
    infoEl.innerHTML += `  ½+${z.toFixed(5)}i<br>`
  })
  infoEl.innerHTML += `<br>[drag to rotate]`

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

// Simple drag to rotate
let isDragging = false, prevX = 0, prevY = 0
window.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY })
window.addEventListener('mouseup', () => { isDragging = false })
window.addEventListener('mousemove', e => {
  if (!isDragging) return
  const dx = (e.clientX - prevX) * 0.005
  const dy = (e.clientY - prevY) * 0.005
  camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), dx)
  camera.position.y += dy * 5
  camera.position.clampLength(30, 100)
  prevX = e.clientX; prevY = e.clientY
})
