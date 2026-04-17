// 3566 Raymarched SDF Fractal Art - Mandelbulb 3D Fractal
import * as THREE from 'three'
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 100)
camera.position.z = 4
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

// Mandelbulb SDF
function mandelbulb(p, power) {
  const z = p.clone()
  let dr = 1, r = 0
  for (let i = 0; i < 12; i++) {
    r = z.length()
    if (r > 2) break
    const theta = Math.acos(z.z / r), phi = Math.atan2(z.y, z.x)
    dr = Math.pow(r, power - 1) * power * dr + 1
    const zr = Math.pow(r, power)
    z.set(
      zr * Math.sin(theta * power) * Math.cos(phi * power),
      zr * Math.sin(theta * power) * Math.sin(phi * power),
      zr * Math.cos(theta * power)
    ).add(p)
  }
  return 0.5 * Math.log(r) * r / dr
}

const geo = new THREE.PlaneGeometry(2, 2)
const mat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: ,
  fragmentShader: 
})
const quad = new THREE.Mesh(geo, mat)
scene.add(quad)
const clock = new THREE.Clock()
function animate() { requestAnimationFrame(animate); mat.uniforms.uTime.value = clock.getElapsedTime(); renderer.render(scene, camera) }
animate()
window.addEventListener('resize', () => { camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight) })
