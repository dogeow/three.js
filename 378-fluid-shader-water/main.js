// 增强：Shader水面
import * as THREE from 'three'
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x001133)
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000)
camera.position.set(0, 8, 15)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
const geo = new THREE.PlaneGeometry(30, 30, 128, 128)
const mat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `uniform float uTime; varying float vH;
    void main() {
      vH = sin(position.x * 2.0 + uTime) * 0.3 + cos(position.y * 1.5 + uTime * 0.8) * 0.3;
      vec3 p = position; p.z += vH;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `varying float vH; uniform float uTime;
    void main() {
      vec3 deep = vec3(0.0, 0.1, 0.4);
      vec3 shallow = vec3(0.0, 0.6, 0.8);
      gl_FragColor = vec4(mix(deep, shallow, (vH + 0.5) * 0.5), 0.9);
    }`,
  transparent: true
})
const mesh = new THREE.Mesh(geo, mat)
mesh.rotation.x = -Math.PI / 2
scene.add(mesh)
scene.add(new THREE.DirectionalLight(0xffffff, 1))
const clock = new THREE.Clock()
function animate() { requestAnimationFrame(animate); mat.uniforms.uTime.value = clock.getElapsedTime(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight) })