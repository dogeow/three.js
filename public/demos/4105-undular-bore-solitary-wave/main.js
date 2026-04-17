// Undular Bore Solitary Wave
// A wave packet of solitary waves (KdV solitons) propagating in a shallow channel
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x001122)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 40, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Channel geometry
const CH = 40   // channel length (x)
const CW = 24   // channel width (z)
const SEG = 120 // segments along length

const W0 = 5    // base water depth (amplitude of flat water)
const N_SOLITONS = 5

class Soliton {
  constructor(x0, a0, c0) {
    this.x0 = x0   // initial position
    this.a = a0    // amplitude
    this.c = c0    // speed
    this.x = x0
    this.mesh = null
  }
}

// Create solitary wave surfaces (using PlaneGeometry, vertices displaced by soliton profile)
const solitons = []
for (let i = 0; i < N_SOLITONS; i++) {
  solitons.push(new Soliton(
    -CH / 2 + i * (CH / N_SOLITONS) * 0.3,
    2 + Math.random() * 3,
    4 + Math.random() * 2
  ))
}

// Water surface mesh
const waterGeo = new THREE.PlaneGeometry(CH, CW, SEG, 32)
waterGeo.rotateX(-Math.PI / 2)

const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSolitonX: { value: new Float32Array(N_SOLITONS) },
    uSolitonA: { value: new Float32Array(N_SOLITONS) },
    uCW: { value: CW }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uSolitonX[${N_SOLITONS}];
    uniform float uSolitonA[${N_SOLITONS}];
    uniform float uCW;
    varying float vHeight;
    varying vec2 vXZ;

    float solitonProfile(float x, float x0, float a) {
      float sech = 2.0 / (exp(x - x0) + exp(-(x - x0)));
      return a * sech * sech;
    }

    void main() {
      float h = 0.0;
      for (int i = 0; i < ${N_SOLITONS}; i++) {
        h += solitonProfile(position.x, uSolitonX[i], uSolitonA[i]);
      }
      // Small ripples on top
      float x = position.x;
      float z = position.z;
      float ripple = sin(x * 2.0 - uTime * 4.0) * 0.08 + sin(z * 3.0 + uTime * 2.0) * 0.05;
      h += ripple;

      vHeight = h;
      vXZ = vec2(position.x, position.z);

      vec3 pos = position;
      pos.y = h;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying float vHeight;
    varying vec2 vXZ;
    void main() {
      float h = vHeight;
      // Water color based on depth
      vec3 deep = vec3(0.0, 0.15, 0.4);
      vec3 shallow = vec3(0.0, 0.5, 0.7);
      vec3 foam = vec3(0.8, 0.9, 1.0);
      float t = clamp(h / 8.0, 0.0, 1.0);
      vec3 col = mix(deep, shallow, t);
      col = mix(col, foam, smoothstep(4.0, 7.0, h));
      gl_FragColor = vec4(col, 0.92);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
})

const waterMesh = new THREE.Mesh(waterGeo, waterMat)
waterMesh.position.x = 0
scene.add(waterMesh)

// Channel walls
const wallMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.9, side: THREE.DoubleSide })
const wallL = new THREE.Mesh(new THREE.PlaneGeometry(CH, 12), wallMat)
wallL.position.set(0, -2, CW / 2)
scene.add(wallL)
const wallR = new THREE.Mesh(new THREE.PlaneGeometry(CH, 12), wallMat)
wallR.rotation.y = Math.PI
wallR.position.set(0, -2, -CW / 2)
scene.add(wallR)

// Bottom
const bottomGeo = new THREE.PlaneGeometry(CH, CW)
bottomGeo.rotateX(-Math.PI / 2)
const bottomMesh = new THREE.Mesh(bottomGeo, new THREE.MeshStandardMaterial({ color: 0x334455 }))
bottomMesh.position.y = -6
scene.add(bottomMesh)

// End walls
const endL = new THREE.Mesh(new THREE.PlaneGeometry(CW, 12), wallMat)
endL.rotation.y = Math.PI / 2
endL.position.set(-CH / 2, -2, 0)
scene.add(endL)
const endR = new THREE.Mesh(new THREE.PlaneGeometry(CW, 12), wallMat)
endR.rotation.y = -Math.PI / 2
endR.position.set(CH / 2, -2, 0)
scene.add(endR)

// Wave probe particles
const PROBE_N = 300
const probePos = new Float32Array(PROBE_N * 3)
const probeCol = new Float32Array(PROBE_N * 3)
for (let i = 0; i < PROBE_N; i++) {
  probePos[i * 3]     = (Math.random() - 0.5) * CH
  probePos[i * 3 + 1] = Math.random() * 3 + 1
  probePos[i * 3 + 2] = (Math.random() - 0.5) * CW
  probeCol[i * 3]     = 0.3
  probeCol[i * 3 + 1] = 0.7
  probeCol[i * 3 + 2] = 1.0
}
const probeGeo = new THREE.BufferGeometry()
probeGeo.setAttribute('position', new THREE.BufferAttribute(probePos, 3))
probeGeo.setAttribute('color', new THREE.BufferAttribute(probeCol, 3))
const probeMat = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.7 })
const probes = new THREE.Points(probeGeo, probeMat)
scene.add(probes)

// Lights
scene.add(new THREE.AmbientLight(0x223344, 0.8))
const sun = new THREE.DirectionalLight(0x88ccff, 1.2)
sun.position.set(10, 30, 20)
scene.add(sun)
const ptLight = new THREE.PointLight(0x0088ff, 1.5, 60)
ptLight.position.set(0, 20, 0)
scene.add(ptLight)

// GUI
const params = {
  waveSpeed: 5.0,
  amplitude: 4.0,
  injectionX: -CH / 2 + 2
}
const gui = new GUI()
gui.add(params, 'waveSpeed', 0.5, 15).name('Wave Speed')
gui.add(params, 'amplitude', 1, 8).name('Amplitude')
gui.add(params, 'injectionX', -CH / 2, CH / 2).name('Injection Pos')

// Inject a new soliton at the left end
function injectSoliton() {
  const lastX = solitons.length > 0
    ? Math.min(...solitons.map(s => s.x))
    : -CH / 2
  const newSol = new Soliton(-CH / 2, params.amplitude + Math.random() * 2, params.waveSpeed)
  solitons.push(newSol)
  if (solitons.length > N_SOLITONS + 5) solitons.shift()
}
setInterval(injectSoliton, 4000)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // Update soliton positions
  for (const s of solitons) {
    s.x += params.waveSpeed * 0.016
    // Reset when off screen
    if (s.x > CH / 2 + 10) {
      s.x = -CH / 2 - Math.random() * 5
      s.a = params.amplitude + Math.random() * 2
    }
  }

  // Update shader uniforms
  const xs = waterMat.uniforms.uSolitonX.value
  const as = waterMat.uniforms.uSolitonA.value
  for (let i = 0; i < N_SOLITONS; i++) {
    if (i < solitons.length) {
      xs[i] = solitons[i].x
      as[i] = solitons[i].a
    } else {
      xs[i] = -999
      as[i] = 0
    }
  }
  waterMat.uniforms.uTime.value = t

  // Animate probes
  const pos = probeGeo.attributes.position.array
  for (let i = 0; i < PROBE_N; i++) {
    pos[i * 3] += (Math.random() - 0.5) * 0.2
    if (pos[i * 3] > CH / 2) pos[i * 3] = -CH / 2
    if (pos[i * 3] < -CH / 2) pos[i * 3] = CH / 2
    // Simple height from first soliton
    let h = 1
    for (const s of solitons) {
      const dx = pos[i * 3] - s.x
      const sech = 2 / (Math.exp(dx) + Math.exp(-dx))
      h += s.a * sech * sech
    }
    pos[i * 3 + 1] = h
  }
  probeGeo.attributes.position.needsUpdate = true

  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
