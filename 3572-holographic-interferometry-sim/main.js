// 3572. Holographic Interferometry Simulation
// type: optics-wave
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 25, 40)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Two coherent point sources
class WaveSource {
  constructor(x, z, freq, phase) {
    this.x = x; this.z = z
    this.freq = freq
    this.phase = phase
  }
}

const params = { wavelength: 1.5, sourceSeparation: 8, viewMode: 'interference' }

const sources = [
  new WaveSource(-params.sourceSeparation/2, 0, 1, 0),
  new WaveSource(params.sourceSeparation/2, 0, 1, 0)
]

// Screen plane for visualization
const screenGeo = new THREE.PlaneGeometry(60, 40, 180, 120)
const screenMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uWavelength: { value: params.wavelength },
    uSep: { value: params.sourceSeparation },
    uMode: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uWavelength;
    uniform float uSep;
    uniform float uMode;
    varying vec2 vUv;
    
    void main() {
      float k = 6.28318 / uWavelength;
      float x = (vUv.x - 0.5) * 60.0;
      float y = (vUv.y - 0.5) * 40.0;
      
      float d1 = sqrt((x + uSep/2.0)*(x + uSep/2.0) + y*y);
      float d2 = sqrt((x - uSep/2.0)*(x - uSep/2.0) + y*y);
      
      float w1 = sin(k * d1 - uTime * 2.0);
      float w2 = sin(k * d2 - uTime * 2.0);
      
      float amp;
      vec3 col;
      
      if (uMode < 0.5) {
        // Interference pattern
        amp = w1 + w2;
        float t = amp * 0.5;
        col = vec3(0.5 + t * 0.5, 0.5, 0.5 - t * 0.5);
      } else {
        // Hologram recording
        float hologram = 0.5 + 0.25 * (w1*w1 + w2*w2) + 0.25 * cos(k*(d1-d2));
        col = vec3(hologram);
      }
      
      gl_FragColor = vec4(col, 1.0);
    }
  `
})
const screen = new THREE.Mesh(screenGeo, screenMat)
screen.position.z = -5
scene.add(screen)

// Source indicators
const sourceGeo = new THREE.SphereGeometry(0.5, 16, 16)
const sourceMat1 = new THREE.MeshBasicMaterial({ color: 0x00ffaa })
const sourceMat2 = new THREE.MeshBasicMaterial({ color: 0xff00aa })
const s1 = new THREE.Mesh(sourceGeo, sourceMat1)
const s2 = new THREE.Mesh(sourceGeo, sourceMat2)
s1.position.set(-params.sourceSeparation/2, 0, 0)
s2.position.set(params.sourceSeparation/2, 0, 0)
scene.add(s1, s2)

// Labels
const labelDiv = document.createElement('div')
labelDiv.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#888;font:13px monospace;text-align:center;background:rgba(0,0,0,0.7);padding:10px 20px;border-radius:6px'
labelDiv.textContent = 'Coherent Wave Interference → Holographic Recording'
document.body.appendChild(labelDiv)

const gui = new GUI()
gui.add(params, 'wavelength', 0.5, 4, 0.1).name('Wavelength').onChange(v => screenMat.uniforms.uWavelength.value = v)
gui.add(params, 'sourceSeparation', 2, 20, 0.5).name('Source Separation').onChange(v => {
  s1.position.x = -v/2; s2.position.x = v/2
  screenMat.uniforms.uSep.value = v
})
gui.add(params, 'viewMode', ['interference', 'hologram']).name('Mode').onChange(v => {
  screenMat.uniforms.uMode.value = v === 'hologram' ? 1 : 0
})

function animate() {
  requestAnimationFrame(animate)
  screenMat.uniforms.uTime.value = performance.now() * 0.001
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
