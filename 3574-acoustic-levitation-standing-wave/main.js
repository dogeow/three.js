// 3574. Acoustic Levitation - Standing wave particle trapping
// type: physics-waves
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 300)
camera.position.set(20, 15, 30)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 5, 0)

// Transducer at bottom
const transducerGeo = new THREE.CylinderGeometry(4, 4, 1, 32)
const transducerMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.8, roughness: 0.2 })
const transducer = new THREE.Mesh(transducerGeo, transducerMat)
transducer.position.y = 0.5
scene.add(transducer)

// Reflector at top
const reflectorGeo = new THREE.CylinderGeometry(3, 3, 0.5, 32)
const reflectorMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.9, roughness: 0.1 })
const reflector = new THREE.Mesh(reflectorGeo, reflectorMat)
reflector.position.y = 18
scene.add(reflector)

// Pressure field visualization
const fieldGeo = new THREE.PlaneGeometry(12, 18, 60, 90)
const fieldMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAmplitude: { value: 1.0 } },
  transparent: true,
  vertexShader: `
    varying vec2 vUv;
    varying float vPressure;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float k = 3.14159;
      vPressure = sin(pos.y * k * 2.0 - uTime * 8.0) * 0.5 + 0.5;
      pos.z += (vPressure - 0.5) * 1.5;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vPressure;
    uniform float uAmplitude;
    void main() {
      float p = vPressure * uAmplitude;
      vec3 col = mix(vec3(0,0,0.5), vec3(0,1,1), p);
      gl_FragColor = vec4(col, 0.15);
    }
  `,
  side: THREE.DoubleSide
})
const field = new THREE.Mesh(fieldGeo, fieldMat)
field.position.z = -4
scene.add(field)

class Particle {
  constructor() {
    const r = Math.random() * 2 + 0.3
    const geo = new THREE.SphereGeometry(r, 12, 12)
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
      transmission: 0.7, roughness: 0.2, ior: 1.5
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.reset()
    scene.add(this.mesh)
  }
  reset() {
    this.x = (Math.random() - 0.5) * 6
    this.z = (Math.random() - 0.5) * 6 - 4
    this.y = Math.random() * 16 + 1
    this.vy = 0
    this.baseY = this.y
  }
  update(t) {
    // Standing wave nodes
    const lambda = 1.0
    const node = Math.sin(this.y / lambda * Math.PI * 2 - t * 8)
    const force = node * 15
    this.vy += (force - this.vy * 2) * 0.02
    this.y += this.vy * 0.016
    // Keep in horizontal bounds
    const horizForce = -this.x * 0.5
    this.x += horizForce * 0.016
    this.z += -this.z * 0.3 * 0.016
    if (this.y < 1) this.y = 1
    if (this.y > 17) this.y = 17
    this.mesh.position.set(this.x, this.y, this.z)
  }
}

const particles = []
for (let i = 0; i < 25; i++) particles.push(new Particle())

scene.add(new THREE.AmbientLight(0x334455, 0.6))
const topLight = new THREE.PointLight(0x88ccff, 2, 30)
topLight.position.set(0, 17, 0)
scene.add(topLight)
const bottomLight = new THREE.PointLight(0xff8844, 2, 30)
bottomLight.position.set(0, 1, 0)
scene.add(bottomLight)

const gui = new GUI()
gui.add(fieldMat.uniforms.uAmplitude, 'value', 0.1, 2, 0.1).name('Wave Amplitude')

function animate() {
  requestAnimationFrame(animate)
  const t = performance.now() * 0.001
  fieldMat.uniforms.uTime.value = t
  particles.forEach(p => p.update(t))
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
