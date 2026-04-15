// 3313. Wood Grain Shader
// 程序化木纹着色器 - GLSL年轮纹理 + 点击切割原木
// type: wood-grain-shader
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1008)
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 6, 12)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 光照
scene.add(new THREE.AmbientLight(0xfff0dd, 0.4))
const sun = new THREE.DirectionalLight(0xffeedd, 1.2)
sun.position.set(5, 10, 5)
sun.castShadow = true
scene.add(sun)
const fillLight = new THREE.PointLight(0xffaa66, 0.5, 30)
fillLight.position.set(-5, 3, -5)
scene.add(fillLight)

// 木纹着色器
const woodMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uNoiseSeed: { value: 0.0 }
  },
  vertexShader: `
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    void main() {
      vPos = position;
      vNormal = normalMatrix * normal;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform float uTime;
    uniform float uNoiseSeed;
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1 + uNoiseSeed, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
                 mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p *= 2.0; a *= 0.5;
      }
      return v;
    }
    
    // 年轮图案
    float woodGrain(vec2 uv, float scale) {
      // 距离中心的半径 + 噪声扰动
      float r = length(uv) * scale;
      float angle = atan(uv.y, uv.x);
      // 添加扰动
      float warp = fbm(uv * 3.0 + uNoiseSeed) * 2.0;
      r += warp;
      // 年轮纹理
      float rings = sin(r * 8.0) * 0.5 + 0.5;
      rings = smoothstep(0.3, 0.7, rings);
      // 纵向纹理
      float grain = fbm(vec2(uv.y * 30.0 + uNoiseSeed, uv.x * 2.0)) * 0.3;
      return mix(rings, 1.0 - rings, grain);
    }
    
    // 年轮截面配色
    vec3 woodColor(float t, float r) {
      vec3 dark  = vec3(0.15, 0.07, 0.02);
      vec3 mid   = vec3(0.45, 0.22, 0.07);
      vec3 light = vec3(0.72, 0.50, 0.22);
      vec3 pale  = vec3(0.85, 0.70, 0.45);
      float ring = smoothstep(0.0, 0.5, t) * smoothstep(1.0, 0.5, t);
      vec3 col = mix(dark, mid, smoothstep(0.0, 0.3, t));
      col = mix(col, light, smoothstep(0.3, 0.7, t));
      col = mix(col, pale, ring * 0.3);
      // 髓心暗区
      col = mix(col, dark * 0.5, smoothstep(0.3, 0.0, r));
      return col;
    }
    
    void main() {
      vec3 n = normalize(vNormal);
      // 端面(横截面) vs 侧面
      float endGrain = abs(dot(n, vec3(0.0, 1.0, 0.0)));
      
      float t = woodGrain(vPos.xz * 0.5, 3.0);
      float r = length(vPos.xz) / 2.5;
      vec3 baseCol = woodColor(t, r);
      
      // 侧面木纹
      float sideGrain = 0.0;
      if (endGrain < 0.8) {
        vec2 suv = vec2(vPos.y * 2.0, atan(n.z, n.x));
        sideGrain = woodGrain(suv, 4.0);
        vec3 sDark  = vec3(0.25, 0.12, 0.03);
        vec3 sLight = vec3(0.55, 0.35, 0.12);
        baseCol = mix(sDark, sLight, sideGrain);
      }
      
      // Phong 光照
      vec3 lightDir = normalize(vec3(5.0, 10.0, 5.0) - vPos);
      float diff = max(dot(n, lightDir), 0.0);
      float spec = pow(max(dot(reflect(-lightDir, n), normalize(-vPos)), 0.0), 32.0);
      vec3 col = baseCol * (0.3 + 0.7 * diff) + spec * 0.15;
      
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

// 创建原木
function makeLog(radius, height, segs) {
  const geo = new THREE.CylinderGeometry(radius, radius, height, segs, 8)
  return new THREE.Mesh(geo, woodMat)
}

const log1 = makeLog(2.5, 10, 32)
log1.position.set(0, 5, 0)
log1.castShadow = true
scene.add(log1)

// 地面
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x2a1a08, roughness: 1.0 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// 切割动画
const cutPlanes = []
window.addEventListener('click', e => {
  if (e.shiftKey) return
  const mat = woodMat.clone()
  mat.uniforms.uNoiseSeed.value = Math.random() * 100
  
  const r = 0.5 + Math.random() * 1.5
  const log = makeLog(r, 6 + Math.random() * 4, 24)
  log.position.set((Math.random() - 0.5) * 8, r, (Math.random() - 0.5) * 8)
  log.rotation.z = (Math.random() - 0.5) * 0.3
  log.castShadow = true
  scene.add(log)
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  woodMat.uniforms.uTime.value = clock.getElapsedTime()
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
