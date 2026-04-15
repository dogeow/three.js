// 2220. 着色器万花筒
// 着色器万花筒效果
import * as THREE from 'three'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000)
camera.position.z = 5
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const geo = new THREE.PlaneGeometry(10, 10)
const mat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;
    vec2 kaleido(vec2 uv, float seg) {
      float a = atan(uv.y, uv.x), r = length(uv);
      a = mod(a, 6.28318 / seg); a = abs(a - 3.14159 / seg);
      return vec2(cos(a), sin(a)) * r;
    }
    void main() {
      vec2 uv = (vUv - 0.5) * 2.0;
      uv = kaleido(uv, 6.0);
      vec3 col = vec3(0.0);
      for (int i = 0; i < 3; i++) {
        float t = uTime * 0.5 + float(i) * 0.3;
        vec2 p = uv + vec2(sin(t + float(i)), cos(t * 1.3 + float(i))) * 0.5;
        col[i] += 0.5 + 0.5 * sin(length(p) * 10.0 - t * 3.0);
      }
      col *= 1.0 - length(uv) * 0.5;
      gl_FragColor = vec4(col, 1.0);
    }
  `
})
scene.add(new THREE.Mesh(geo, mat))
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
  mat.uniforms.uResolution.value.set(innerWidth, innerHeight)
})
