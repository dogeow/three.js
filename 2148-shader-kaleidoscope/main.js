// 2148. Shader Kaleidoscope
// 着色器万花筒效果 - 增强版
import * as THREE from 'three'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000)
camera.position.z = 5
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

// 鼠标跟踪
const mouse = new THREE.Vector2()
const targetMouse = new THREE.Vector2()

window.addEventListener('mousemove', (e) => {
  targetMouse.x = (e.clientX / innerWidth) * 2 - 1
  targetMouse.y = -(e.clientY / innerHeight) * 2 + 1
})

// 万花筒着色器
const kaleidoscopeShader = {
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uSegments: { value: 6.0 },
    uColorShift: { value: 0.0 }
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
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uSegments;
    uniform float uColorShift;
    varying vec2 vUv;
    
    #define PI 3.14159265359
    #define TAU 6.28318530718
    
    vec2 kaleido(vec2 uv, float segments) {
      float angle = atan(uv.y, uv.x);
      float r = length(uv);
      float segmentAngle = TAU / segments;
      angle = mod(angle, segmentAngle);
      angle = abs(angle - segmentAngle * 0.5);
      return vec2(cos(angle), sin(angle)) * r;
    }
    
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float fbm(vec2 p) {
      float f = 0.0;
      f += 0.5000 * noise(p); p *= 2.02;
      f += 0.2500 * noise(p); p *= 2.03;
      f += 0.1250 * noise(p); p *= 2.01;
      f += 0.0625 * noise(p);
      return f;
    }
    
    void main() {
      vec2 uv = (vUv - 0.5) * 2.0;
      uv.x *= uResolution.x / uResolution.y;
      
      // 动态分段数
      float segs = uSegments + sin(uTime * 0.3) * 2.0;
      vec2 kuv = kaleido(uv, segs);
      
      // 鼠标影响
      kuv += uMouse * 0.5;
      
      // 多层图案
      vec3 col = vec3(0.0);
      
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float t = uTime * (0.4 + fi * 0.1) + uColorShift;
        
        // 旋转的图案
        vec2 p1 = kuv + vec2(sin(t + fi), cos(t * 1.3 + fi)) * 0.4;
        vec2 p2 = kuv + vec2(cos(t * 0.7 + fi * 2.0), sin(t + fi * 1.5)) * 0.3;
        
        float pattern1 = sin(length(p1) * (8.0 + fi * 2.0) - t * 3.0);
        float pattern2 = sin(length(p2) * (6.0 + fi * 1.5) - t * 2.0);
        
        // 分形图案
        float fractal = fbm(kuv * (2.0 + fi) + t * 0.2);
        
        // 颜色混合
        float hue = fract(fi * 0.15 + uTime * 0.05);
        vec3 patternColor = vec3(
          0.5 + 0.5 * sin(hue * TAU),
          0.5 + 0.5 * sin(hue * TAU + 2.094),
          0.5 + 0.5 * sin(hue * TAU + 4.188)
        );
        
        col[i] += (pattern1 * 0.5 + 0.5) * 0.3;
        col[i] += (pattern2 * 0.5 + 0.5) * 0.25;
        col[i] += fractal * 0.35;
      }
      
      // 边缘衰减
      float edge = 1.0 - smoothstep(0.8, 1.5, length(uv));
      col *= edge;
      
      // 辉光效果
      col += vec3(0.1, 0.05, 0.15) * (1.0 - edge);
      
      // 色调映射
      col = pow(col, vec3(0.85));
      col *= 1.3;
      
      gl_FragColor = vec4(col, 1.0);
    }
  `
}

const geo = new THREE.PlaneGeometry(12, 12)
const mat = new THREE.ShaderMaterial(kaleidoscopeShader)
const mesh = new THREE.Mesh(geo, mat)
scene.add(mesh)

// 全屏背景
const bgGeo = new THREE.PlaneGeometry(30, 30)
const bgMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv - 0.5;
      float d = length(uv);
      vec3 col = mix(vec3(0.02, 0.01, 0.05), vec3(0.0), d * 2.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  depthWrite: false
})
const bg = new THREE.Mesh(bgGeo, bgMat)
bg.position.z = -5
scene.add(bg)

const clock = new THREE.Clock()
let colorShiftTime = 0

window.addEventListener('click', () => {
  colorShiftTime = clock.getElapsedTime()
})

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  // 平滑鼠标
  mouse.lerp(targetMouse, 0.05)
  
  mat.uniforms.uTime.value = t
  mat.uniforms.uMouse.value.lerp(mouse, 0.1)
  mat.uniforms.uColorShift.value = (t - colorShiftTime) * 0.3
  
  bgMat.uniforms.uTime.value = t
  
  // 动态调整视角
  camera.position.x = Math.sin(t * 0.1) * 0.5
  camera.position.y = Math.cos(t * 0.08) * 0.3
  camera.lookAt(0, 0, 0)
  
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  mat.uniforms.uResolution.value.set(innerWidth, innerHeight)
})
