// 增强：SDF Raymarching
import * as THREE from 'three'
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.z = 20
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const geo = new THREE.PlaneGeometry(2, 2)
const mat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform float uTime; varying vec2 vUv;
    float sdS(vec3 p, float r) { return length(p) - r; }
    float sdB(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }
    float scene(vec3 p) { float t = uTime * 0.5; return min(min(sdS(p - vec3(sin(t)*3.0,0,0), 2.0), sdS(p - vec3(-sin(t)*3.0,cos(t)*2.0,sin(t)*1.5), 1.5)), sdB(p - vec3(0,-2,0), vec3(8,0.1,8))); }
    vec3 calcN(vec3 p) { const float e = 0.001; return normalize(vec3(scene(p+vec3(e,0,0))-scene(p-vec3(e,0,0)), scene(p+vec3(0,e,0))-scene(p-vec3(0,e,0)), scene(p+vec3(0,0,e))-scene(p-vec3(0,0,e)))); }
    void main() {
      vec2 uv = vUv * 2.0 - 1.0; uv.x *= innerWidth / innerHeight;
      vec3 ro = vec3(0,5,20), rd = normalize(vec3(uv, -1.5));
      float t = 0.0;
      for (int i = 0; i < 100; i++) { float d = scene(ro + rd * t); if (d < 0.001 || t > 100.0) break; t += d; }
      vec3 col = t < 100.0 ? calcN(ro + rd * t) * 0.5 + 0.5 : vec3(0.0);
      col *= vec3(0.0, 0.8, 1.0);
      gl_FragColor = vec4(col, 1.0);
    }`
})
scene.add(new THREE.Mesh(geo, mat))
const clock = new THREE.Clock()
function animate() { requestAnimationFrame(animate); mat.uniforms.uTime.value = clock.getElapsedTime(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })