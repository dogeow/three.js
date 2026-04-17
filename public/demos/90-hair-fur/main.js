import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x0a0a0f)
document.body.appendChild(renderer.domElement)

// ─── Scene & Camera ─────────────────────────────────────────────────────────
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 2, 8)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.minDistance = 2
controls.maxDistance = 20

// ─── Lighting ───────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)

const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.8)
keyLight.position.set(5, 8, 5)
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0xc0d8ff, 0.6)
fillLight.position.set(-5, 3, -3)
scene.add(fillLight)

const rimLight = new THREE.DirectionalLight(0xffe8c0, 0.5)
rimLight.position.set(0, -3, -6)
scene.add(rimLight)

// ─── Ground Plane ───────────────────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(30, 30)
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x111118,
  roughness: 0.9,
  metalness: 0.1,
})
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -1.5
scene.add(ground)

// ─── Fur Texture ─────────────────────────────────────────────────────────────
function createFurTexture(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, size, size)

  const strandCount = 2400
  for (let i = 0; i < strandCount; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 0.6 + Math.random() * 2.8
    const brightness = 80 + Math.random() * 175
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

const furTexture = createFurTexture(256)

// ─── Fur Shader ─────────────────────────────────────────────────────────────
const shellVS = `
  uniform float uShellIndex;
  uniform float uShellCount;
  uniform float uFurLength;
  uniform float uTime;
  uniform vec3 uWind;
  uniform vec3 uGravity;
  varying vec2 vUv;
  varying float vShell;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  void main() {
    vUv = uv;
    vShell = uShellIndex / (uShellCount - 1.0);
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;

    // Displace along normal
    vec3 N = normalize(normal);
    float displacement = vShell * uFurLength;

    // Gravity effect (tips droop slightly)
    vec3 grav = uGravity * vShell * vShell * 0.3;

    // Wind effect (stronger at tips, with wave)
    float wave = sin(uTime * 2.5 + position.y * 4.0 + position.x * 2.0) * 0.08
               + sin(uTime * 1.3 + position.z * 3.0) * 0.05;
    vec3 wind = uWind * vShell * vShell + vec3(wave, 0.0, wave * 0.5);

    pos += N * displacement;
    pos += grav;
    pos += wind;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vViewPos = mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`

const shellFS = `
  uniform sampler2D uFurTexture;
  uniform float uFurDensity;
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform float uShellCount;
  uniform float uAmbient;
  varying vec2 vUv;
  varying float vShell;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  void main() {
    float noise = texture2D(uFurTexture, vUv * uFurDensity).r;

    // Density threshold: near base = dense, near tip = sparse
    float threshold = mix(0.15, 0.85, vShell);

    if (noise < threshold) discard;

    // Color gradient root → tip
    vec3 color = mix(uBaseColor, uTipColor, pow(vShell, 0.7));

    // Simple diffuse lighting
    vec3 lightDir = normalize(vec3(1.0, 1.5, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float wrap = max(dot(vNormal, lightDir) * 0.5 + 0.5, 0.0);

    float light = uAmbient + (1.0 - uAmbient) * mix(diff, wrap, 0.5);

    // Rim light (view-dependent)
    vec3 viewDir = normalize(-vViewPos);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 3.0) * 0.3;

    color *= light;
    color += rim * uTipColor * 0.5;

    // Alpha: more transparent at tips, denser near root
    float alpha = smoothstep(threshold, threshold + 0.15, noise);
    alpha *= mix(1.0, 0.3, vShell);
    alpha = max(alpha, 0.35); // minimum opacity so base isn't see-through

    gl_FragColor = vec4(color, alpha);
  }
`

// ─── Shared Parameters ───────────────────────────────────────────────────────
const params = {
  furLength: 0.28,
  furDensity: 48.0,
  windStrength: 1.2,
  windX: 1.0,
  windY: 0.0,
  windZ: 0.4,
  gravityX: 0.0,
  gravityY: -0.5,
  gravityZ: 0.0,
  baseColor: '#4a3020',
  tipColor: '#d4a060',
  shellCount: 36,
  showSphere: true,
  showBox: true,
  sphereRotSpeed: 0.3,
  boxRotSpeed: 0.2,
}

// ─── Shell Group ─────────────────────────────────────────────────────────────
class FurShell {
  constructor(geometry, position, name) {
    this.group = new THREE.Group()
    this.group.position.copy(position)
    this.group.name = name
    this.meshes = []
    this.baseGeo = geometry
    this.time = 0

    this._buildShells()
    scene.add(this.group)
  }

  _buildShells() {
    // Remove old shells
    for (const m of this.meshes) {
      this.group.remove(m)
      m.material.dispose()
    }
    this.meshes = []

    const count = params.shellCount

    for (let i = 0; i < count; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uShellIndex: { value: i },
          uShellCount: { value: count },
          uFurLength: { value: params.furLength },
          uFurDensity: { value: params.furDensity },
          uTime: { value: 0 },
          uWind: { value: new THREE.Vector3() },
          uGravity: { value: new THREE.Vector3() },
          uBaseColor: { value: new THREE.Color(params.baseColor) },
          uTipColor: { value: new THREE.Color(params.tipColor) },
          uAmbient: { value: 0.35 },
          uFurTexture: { value: furTexture },
        },
        vertexShader: shellVS,
        fragmentShader: shellFS,
        transparent: true,
        depthWrite: true,
        side: THREE.FrontSide,
      })

      const mesh = new THREE.Mesh(this.baseGeo, mat)
      this.group.add(mesh)
      this.meshes.push(mesh)
    }
  }

  update(dt, time) {
    this.time += dt
    const wind = new THREE.Vector3(
      params.windX * params.windStrength,
      params.windY * params.windStrength,
      params.windZ * params.windStrength
    )
    const gravity = new THREE.Vector3(params.gravityX, params.gravityY, params.gravityZ)
    const baseColor = new THREE.Color(params.baseColor)
    const tipColor = new THREE.Color(params.tipColor)

    for (const mesh of this.meshes) {
      mesh.material.uniforms.uTime.value = time
      mesh.material.uniforms.uWind.value.copy(wind)
      mesh.material.uniforms.uGravity.value.copy(gravity)
      mesh.material.uniforms.uBaseColor.value.copy(baseColor)
      mesh.material.uniforms.uTipColor.value.copy(tipColor)
      mesh.material.uniforms.uFurLength.value = params.furLength
      mesh.material.uniforms.uFurDensity.value = params.furDensity
    }
  }

  setVisible(v) {
    this.group.visible = v
  }
}

// ─── Create Fur Objects ──────────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(1, 64, 64)
const sphereFur = new FurShell(sphereGeo, new THREE.Vector3(-2.2, 0, 0), 'sphere')

const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5)
const boxFur = new FurShell(boxGeo, new THREE.Vector3(2.2, 0, 0), 'box')

// Small torus knot for variety
const knotGeo = new THREE.TorusKnotGeometry(0.7, 0.25, 128, 32)
const knotFur = new FurShell(knotGeo, new THREE.Vector3(0, 0, -3.5), 'knot')

// ─── GUI ─────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: '毛发参数 Controls' })

gui.add(params, 'shellCount', 8, 64, 1).name('Shell 层数').onChange(() => {
  sphereFur._buildShells()
  boxFur._buildShells()
  knotFur._buildShells()
})

gui.add(params, 'furLength', 0.05, 0.6, 0.01).name('Fur Length 长度')
gui.add(params, 'furDensity', 10, 120, 1).name('Fur Density 密度')

const windF = gui.addFolder('Wind 风力')
windF.add(params, 'windStrength', 0, 4, 0.05).name('Strength 强度')
windF.add(params, 'windX', -2, 2, 0.05).name('X Direction X方向')
windF.add(params, 'windY', -2, 2, 0.05).name('Y Direction Y方向')
windF.add(params, 'windZ', -2, 2, 0.05).name('Z Direction Z方向')
windF.open()

const gravF = gui.addFolder('Gravity 重力')
gravF.add(params, 'gravityX', -2, 2, 0.05).name('X')
gravF.add(params, 'gravityY', -2, 2, 0.05).name('Y')
gravF.add(params, 'gravityZ', -2, 2, 0.05).name('Z')
gravF.open()

const colorF = gui.addFolder('Color 颜色')
colorF.addColor(params, 'baseColor').name('Base Color 根部')
colorF.addColor(params, 'tipColor').name('Tip Color 尖部')
colorF.open()

const showF = gui.addFolder('Show 显示')
showF.add(params, 'showSphere').name('Sphere 球体').onChange(v => sphereFur.setVisible(v))
showF.add(params, 'showBox').name('Box 立方体').onChange(v => boxFur.setVisible(v))
showF.open()

// ─── Animation Loop ──────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  const time = clock.getElapsedTime()

  controls.update()

  sphereFur.group.position.y = Math.sin(time * 0.8) * 0.15
  sphereFur.group.rotation.y += dt * params.sphereRotSpeed

  boxFur.group.position.y = Math.sin(time * 0.6 + 1) * 0.1
  boxFur.group.rotation.y += dt * params.boxRotSpeed
  boxFur.group.rotation.x = Math.sin(time * 0.4) * 0.2

  knotFur.group.position.y = Math.sin(time * 0.5 + 2) * 0.12
  knotFur.group.rotation.y += dt * 0.15
  knotFur.group.rotation.x += dt * 0.1

  sphereFur.update(dt, time)
  boxFur.update(dt, time)
  knotFur.update(dt, time)

  renderer.render(scene, camera)
}

animate()

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})