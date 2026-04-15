// 2582. SDF Spheres
// 有符号距离场球体
import * as THREE from 'three'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.z = 20
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const geo = new THREE.PlaneGeometry(2, 2)
const mat = new THREE.ShaderMaterial({
  uniforms: { uCamPos: { value: camera.position }, uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform vec3 uCamPos;
    uniform float uTime;
    varying vec2 vUv;
    float sdSphere(vec3 p, float r) { return length(p) - r; }
    float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
    float scene(vec3 p) {
      float t = uTime * 0.5;
      float s1 = sdSphere(p - vec3(sin(t)*3.0, 0.0, 0.0), 2.0);
      float s2 = sdSphere(p - vec3(-sin(t)*3.0, cos(t)*2.0, sin(t)*1.5), 1.5);
      return min(s1, min(s2, sdBox(p - vec3(0.0, -2.0, 0.0), vec3(8.0, 0.1, 8.0))));
    }
    vec3 calcNormal(vec3 p) {
      const float eps = 0.001;
      return normalize(vec3(
        scene(p+vec3(eps,0,0)) - scene(p-vec3(eps,0,0)),
        scene(p+vec3(0,eps,0)) - scene(p-vec3(0,eps,0)),
        scene(p+vec3(0,0,eps)) - scene(p-vec3(0,0,eps))
      ));
    }
    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      uv.x *= innerWidth / innerHeight;
      vec3 ro = uCamPos, rd = normalize(vec3(uv, -1.5));
      float t = 0.0;
      for (int i = 0; i < 100; i++) { float d = scene(ro + rd * t); if (d < 0.001 || t > 100.0) break; t += d; }
      vec3 col = t < 100.0 ? calcNormal(ro + rd * t) * 0.5 + 0.5 : vec3(0.0);
      col *= vec3(0.0, 0.8, 1.0);
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
})
