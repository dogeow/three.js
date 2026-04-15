// 3210 - Hatching NPR Sketch
// Cross-hatching shader: converts 3D scene to pen-and-ink sketch style
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

const HatchShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    uAngle: { value: 0 },
    uScale: { value: 3.0 },
    uDensity: { value: 0.5 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uAngle;
    uniform float uScale;
    uniform float uDensity;
    varying vec2 vUv;
    float hatch(vec2 p, float angle, float scale) {
      float c = cos(angle), s = sin(angle);
      vec2 r = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
      return smoothstep(0.4, 0.6, fract(r.x * scale));
    }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      vec2 px = vUv * uResolution;
      float h1 = hatch(px, uAngle, uScale);
      float h2 = hatch(px, uAngle + 0.5, uScale * 1.3);
      float h3 = hatch(px, uAngle + 1.0, uScale * 0.8);
      float ink = 1.0;
      if (lum < 0.85) ink *= h1;
      if (lum < 0.6)  ink *= h2;
      if (lum < 0.35) ink *= h3;
      if (lum < 0.15) ink = 0.0;
      gl_FragColor = vec4(vec3(ink), 1.0);
    }
  `
}

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf5f0e8)
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 3, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const dir = new THREE.DirectionalLight(0xffffff, 1.2)
dir.position.set(5, 10, 5)
scene.add(dir)

// Objects to sketch
const group = new THREE.Group()
scene.add(group)

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 32, 32),
  new THREE.MeshPhongMaterial({ color: 0xddaadd, shininess: 60 })
)
sphere.position.set(-2, 0, 0)
group.add(sphere)

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 1.8, 1.8),
  new THREE.MeshPhongMaterial({ color: 0xaaddaa, shininess: 40 })
)
cube.position.set(2, 0, 0)
group.add(cube)

const cone = new THREE.Mesh(
  new THREE.ConeGeometry(1, 2.5, 32),
  new THREE.MeshPhongMaterial({ color: 0xdddd88, shininess: 30 })
)
cone.position.set(0, -1.5, 1.5)
group.add(cone)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshPhongMaterial({ color: 0xcccccc })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -2
group.add(ground)

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const hatchPass = new ShaderPass(HatchShader)
hatchPass.uniforms.uResolution.value.set(innerWidth, innerHeight)
composer.addPass(hatchPass)

// GUI via dat.GUI-like controls
const params = { angle: 0.3, scale: 3.0, density: 0.5 }
const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:16px;left:16px;color:#333;font-family:monospace;font-size:13px;background:rgba(245,240,232,0.9);padding:12px;border-radius:8px;line-height:1.8'
info.innerHTML = '<b>Hatching NPR Sketch</b><br>Drag to orbit<br>Mouse wheel: zoom<br>Hatch angle, scale, density sliders'
document.body.appendChild(info)

const slAngle = document.createElement('input'); slAngle.type = 'range'; slAngle.min = 0; slAngle.max = 3.14; slAngle.step = 0.01; slAngle.value = 0.3
slAngle.style.cssText = 'width:120px;margin-left:8px'
slAngle.addEventListener('input', e => { hatchPass.uniforms.uAngle.value = parseFloat(e.target.value); info.innerHTML = '<b>Hatching NPR Sketch</b><br>Angle: ' + (hatchPass.uniforms.uAngle.value).toFixed(2) + '<br>Drag to orbit' })
const slScale = document.createElement('input'); slScale.type = 'range'; slScale.min = 1; slScale.max = 8; slScale.step = 0.1; slScale.value = 3.0
slScale.style.cssText = 'width:120px;margin-left:8px'
slScale.addEventListener('input', e => { hatchPass.uniforms.uScale.value = parseFloat(e.target.value) })
info.appendChild(document.createElement('br'))
info.appendChild(document.createTextNode('Angle: '))
info.appendChild(slAngle)
info.appendChild(document.createElement('br'))
info.appendChild(document.createTextNode('Scale: '))
info.appendChild(slScale)

let t = 0
function animate() {
  requestAnimationFrame(animate)
  t += 0.01
  group.rotation.y = Math.sin(t * 0.5) * 0.3
  controls.update()
  composer.render()
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  hatchPass.uniforms.uResolution.value.set(innerWidth, innerHeight)
})
