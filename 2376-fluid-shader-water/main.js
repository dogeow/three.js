// 2376. 着色器水面
// 着色器实现的流体水面
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x001133)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 8, 15)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const geo = new THREE.PlaneGeometry(30, 30, 128, 128)
const mat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float wave = sin(pos.x * 2.0 + uTime) * 0.3 + cos(pos.y * 1.5 + uTime * 0.8) * 0.3;
      pos.z += wave;
      vElevation = wave;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vElevation;
    void main() {
      vec3 deep = vec3(0.0, 0.1, 0.4);
      vec3 shallow = vec3(0.0, 0.6, 0.8);
      float t = (vElevation + 0.5) * 0.5;
      gl_FragColor = vec4(mix(deep, shallow, t), 0.9);
    }
  `,
  transparent: true
})
const mesh = new THREE.Mesh(geo, mat)
mesh.rotation.x = -Math.PI / 2
scene.add(mesh)

scene.add(new THREE.DirectionalLight(0xffffff, 1))

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  mat.uniforms.uTime.value = clock.getElapsedTime()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
