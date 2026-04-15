// 2935. Rain On Glass
// Rain drops on window with glass distortion and droplet trails
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0e14)

// Rain scene background
const bgGeo = new THREE.PlaneGeometry(100, 100)
const bgMat = new THREE.MeshBasicMaterial({ color: 0x0a0e14 })
const bg = new THREE.Mesh(bgGeo, bgMat)
bg.position.z = -20
scene.add(bg)

// Background city lights
const lightPositions = []
for (let i = 0; i < 80; i++) {
  const w = Math.random() > 0.5
  const geo = w ? new THREE.PlaneGeometry(Math.random() * 3 + 1, Math.random() * 5 + 2)
                : new THREE.PlaneGeometry(Math.random() * 5 + 2, Math.random() * 1.5 + 0.5)
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color().setHSL(Math.random() * 0.15 + 0.05, 0.8, 0.4 + Math.random() * 0.4),
    transparent: true,
    opacity: 0.3 + Math.random() * 0.5,
    side: THREE.DoubleSide
  })
  const m = new THREE.Mesh(geo, mat)
  m.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 30 + 5, -19)
  m.rotation.z = (Math.random() - 0.5) * 0.3
  scene.add(m)
}

// Camera setup
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100)
camera.position.set(0, 0, 5)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)
camera.position.z = 5

// Glass plane with rain drop shader
const glassGeo = new THREE.PlaneGeometry(16, 10)
const glassMat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    drops: { value: [] },
    dropCount: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 drops[80];
    uniform int dropCount;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float dropShape(vec2 uv, vec2 center, float size) {
      vec2 d = uv - center;
      d.y *= 2.0;
      return smoothstep(size, size * 0.3, length(d));
    }

    // Lens distortion from raindrop
    vec2 lensDistort(vec2 uv, vec2 center, float strength) {
      vec2 delta = uv - center;
      float dist = length(delta);
      return uv + delta * strength / (dist + 0.3);
    }

    void main() {
      vec2 uv = vUv;

      // Background blur / wet glass tint
      vec3 col = vec3(0.02, 0.04, 0.06);

      // City lights (simplified bokeh from background)
      for (int i = 0; i < 20; i++) {
        float fi = float(i);
        vec2 lp = vec2(
          fract(sin(fi * 12.9898) * 43758.5453),
          fract(sin(fi * 78.233) * 43758.5453)
        );
        lp = lp * 2.0 - 1.0;
        lp.x *= 16.0/10.0;
        float d = length(uv - lp);
        vec3 lightCol = mix(vec3(1.0, 0.6, 0.2), vec3(0.3, 0.5, 1.0), fract(fi * 0.37));
        col += lightCol * 0.03 / (d * 20.0 + 0.01);
      }

      // Rain streaks (vertical trails)
      for (int i = 0; i < 60; i++) {
        float fi = float(i);
        float x = fract(sin(fi * 127.1) * 43758.5453) * 2.0 - 1.0;
        x *= 0.9;
        float speed = 0.1 + fract(sin(fi * 311.7) * 43758.5453) * 0.15;
        float phase = fract(sin(fi * 78.233) * 43758.5453);
        float y = fract(time * speed + phase) * 2.0 - 0.5;
        float width = 0.003 + fract(sin(fi * 43.1) * 12345.0) * 0.004;
        float streakLen = 0.08 + fract(sin(fi * 17.3) * 54321.0) * 0.12;
        float dx = abs(uv.x - x);
        float dy = uv.y - y;
        if (dy > 0.0 && dy < streakLen && dx < width) {
          float alpha = (1.0 - dy / streakLen) * 0.25;
          col += vec3(0.5, 0.6, 0.8) * alpha;
        }
      }

      // Individual raindrops with lens distortion
      for (int i = 0; i < 80; i++) {
        if (i >= dropCount) break;
        vec2 dropPos = drops[i].xy;
        float dropSize = drops[i].z;
        float dist = dropShape(uv, dropPos, dropSize);
        // Lens effect
        uv = lensDistort(uv, dropPos, -dropSize * 0.5);
        // Highlight on drop edge
        float edge = smoothstep(dropSize * 0.5, dropSize * 0.9, length(uv - dropPos)) -
                     smoothstep(dropSize * 0.9, dropSize * 1.2, length(uv - dropPos));
        col += vec3(0.6, 0.7, 0.9) * dist * 0.15;
        col += vec3(0.4, 0.5, 0.7) * edge * 0.3;
      }

      // Wet glass overall tint
      col = mix(col, col * 1.2, 0.2);

      // Condensation fog
      float fog = hash(uv * 500.0 + time * 0.1) * 0.03;
      col += vec3(fog);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.FrontSide
})

const glass = new THREE.Mesh(glassGeo, glassMat)
glass.position.z = 0.1
scene.add(glass)

// Raindrop physics
const MAX_DROPS = 80
const drops = []
const dropEntities = []

class Drop {
  constructor() {
    this.x = (Math.random() - 0.5) * 1.6
    this.y = (Math.random() - 0.5) * 1.5
    this.size = 0.01 + Math.random() * 0.02
    this.speed = 0.003 + Math.random() * 0.005
    this.wobble = Math.random() * Math.PI * 2
    this.wobbleSpeed = 1 + Math.random() * 2
    this.active = true
  }

  update(dt) {
    this.y -= this.speed
    this.x += Math.sin(this.wobble) * 0.001
    this.wobble += this.wobbleSpeed * dt

    if (this.y < -0.8) {
      this.y = 0.8
      this.x = (Math.random() - 0.5) * 1.6
      this.size = 0.008 + Math.random() * 0.015
      this.speed = 0.003 + Math.random() * 0.005
    }
  }
}

for (let i = 0; i < MAX_DROPS; i++) {
  const d = new Drop()
  d.y = (Math.random() - 0.5) * 2
  drops.push(d)
}

let time = 0
function animate() {
  requestAnimationFrame(animate)
  time += 0.016

  drops.forEach(d => d.update(0.016))

  const dropData = drops.map(d => new THREE.Vector3(d.x, d.y, d.size))
  while (dropData.length < MAX_DROPS) {
    dropData.push(new THREE.Vector3(999, 999, 0))
  }
  glassMat.uniforms.time.value = time
  glassMat.uniforms.drops.value = dropData.slice(0, MAX_DROPS)
  glassMat.uniforms.dropCount.value = drops.length

  camera.lookAt(0, 0, 0)
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
