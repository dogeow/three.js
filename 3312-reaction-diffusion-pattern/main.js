// 3312. Reaction Diffusion Pattern
// Gray-Scott 反应扩散图灵斑图 (GPU计算 + 实时渲染)
// type: reaction-diffusion-pattern
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const SIZE = 256
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

// Ping-pong FBO
const rtOpts = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
  type: THREE.FloatType
}
let readRT = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts)
let writeRT = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts)

// 初始数据
const initData = new Float32Array(SIZE * SIZE * 4)
for (let i = 0; i < SIZE * SIZE; i++) {
  initData[i * 4] = 1     // A: 化学物质A (浓度1)
  initData[i * 4 + 1] = 0 // B: 化学物质B (浓度0)
  initData[i * 4 + 2] = 0
  initData[i * 4 + 3] = 1
}
const initTex = new THREE.DataTexture(initData, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType)
initTex.needsUpdate = true

// 计算着色器 - Gray-Scott
const computeMat = new THREE.ShaderMaterial({
  uniforms: {
    uPrev: { value: initTex },
    uSize: { value: SIZE },
    uDt: { value: 1.0 },
    uDA: { value: 0.4 },   // A扩散率
    uDB: { value: 0.2 },   // B扩散率
    uF: { value: 0.03 },   // feed rate
    uK: { value: 0.06 },  // kill rate
    uMouse: { value: new THREE.Vector2(-1, -1) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
  `,
  fragmentShader: `
    precision highp float;
    uniform sampler2D uPrev;
    uniform float uSize;
    uniform float uDt, uDA, uDB, uF, uK;
    uniform vec2 uMouse;
    varying vec2 vUv;
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      vec2 px = 1.0 / vec2(uSize);
      
      float a = texture2D(uPrev, uv).r;
      float b = texture2D(uPrev, uv).g;
      
      // 9点 Laplacian
      float lapA = (
        -a
        + texture2D(uPrev, uv + vec2(-px.x, 0)).r * 0.2
        + texture2D(uPrev, uv + vec2(px.x, 0)).r * 0.2
        + texture2D(uPrev, uv + vec2(0, -px.y)).r * 0.2
        + texture2D(uPrev, uv + vec2(0, px.y)).r * 0.2
        + texture2D(uPrev, uv + vec2(-px.x, -px.y)).r * 0.05
        + texture2D(uPrev, uv + vec2(px.x, -px.y)).r * 0.05
        + texture2D(uPrev, uv + vec2(-px.x, px.y)).r * 0.05
        + texture2D(uPrev, uv + vec2(px.x, px.y)).r * 0.05
      );
      float lapB = (
        -b
        + texture2D(uPrev, uv + vec2(-px.x, 0)).g * 0.2
        + texture2D(uPrev, uv + vec2(px.x, 0)).g * 0.2
        + texture2D(uPrev, uv + vec2(0, -px.y)).g * 0.2
        + texture2D(uPrev, uv + vec2(0, px.y)).g * 0.2
        + texture2D(uPrev, uv + vec2(-px.x, -px.y)).g * 0.05
        + texture2D(uPrev, uv + vec2(px.x, -px.y)).g * 0.05
        + texture2D(uPrev, uv + vec2(-px.x, px.y)).g * 0.05
        + texture2D(uPrev, uv + vec2(px.x, px.y)).g * 0.05
      );
      
      float reaction = a * b * b;
      float da = uDA * lapA - reaction + uF * (1.0 - a);
      float db = uDB * lapB + reaction - (uK + uF) * b;
      
      // 鼠标注入B
      if (uMouse.x > 0.0) {
        float d = length(uv - uMouse);
        if (d < 0.05) { b = 1.0; a = 0.0; }
      }
      
      // 随机种子点
      float r = rand(uv + fract(a * 3.7 + b * 2.3));
      if (r > 0.999) { b = 1.0; a = 0.0; }
      
      a += da * uDt;
      b += db * uDt;
      a = clamp(a, 0.0, 1.0);
      b = clamp(b, 0.0, 1.0);
      
      gl_FragColor = vec4(a, b, 0.0, 1.0);
    }
  `
})

// 显示着色器
const displayMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: readRT.texture } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
  fragmentShader: `
    precision highp float;
    uniform sampler2D uTex;
    varying vec2 vUv;
    void main() {
      float a = texture2D(uTex, vUv).r;
      float b = texture2D(uTex, vUv).g;
      float v = b;
      // 图灵配色：深海蓝绿
      vec3 c0 = vec3(0.0, 0.02, 0.05);   // 无色
      vec3 c1 = vec3(0.0, 0.3, 0.4);    // 青绿
      vec3 c2 = vec3(0.8, 0.6, 0.1);    // 金黄
      vec3 c3 = vec3(0.9, 0.2, 0.0);    // 橙红
      vec3 col;
      if (v < 0.33) col = mix(c0, c1, v / 0.33);
      else if (v < 0.66) col = mix(c1, c2, (v - 0.33) / 0.33);
      else col = mix(c2, c3, (v - 0.66) / 0.34);
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), computeMat)
const quadDisplay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMat)
const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

// 鼠标
let mouseNDC = new THREE.Vector2(-1, -1)
window.addEventListener('mousemove', e => {
  mouseNDC.set(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1
  )
})
window.addEventListener('click', e => {
  mouseNDC.set(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1
  )
})

// 参数 GUI (简化版)
let f = 0.03, k = 0.06
const label = document.createElement('div')
label.style.cssText = 'position:fixed;top:10px;left:10px;color:#8f8;font-family:monospace;font-size:13px;z-index:10;pointer-events:none'
label.innerHTML = 'Click to inject B · Scroll to change F/K'
document.body.appendChild(label)

window.addEventListener('wheel', e => {
  const dir = e.deltaY > 0 ? 1 : -1
  if (e.shiftKey) { k = Math.max(0.05, Math.min(0.07, k + dir * 0.001)); }
  else { f = Math.max(0.01, Math.min(0.06, f + dir * 0.001)); }
  computeMat.uniforms.uF.value = f
  computeMat.uniforms.uK.value = k
  label.innerHTML = `F=${f.toFixed(4)} K=${k.toFixed(4)} | Shift+scroll=K | Click inject B`
})

let frame = 0
function animate() {
  requestAnimationFrame(animate)
  frame++
  
  // 每帧计算 1 次
  computeMat.uniforms.uPrev.value = readRT.texture
  computeMat.uniforms.uMouse.value.copy(mouseNDC)
  
  renderer.setRenderTarget(writeRT)
  renderer.render(quad, camera)
  
  // 交换
  const tmp = readRT; readRT = writeRT; writeRT = tmp
  
  // 显示
  displayMat.uniforms.uTex.value = readRT.texture
  renderer.setRenderTarget(null)
  renderer.render(quadDisplay, orthoCamera)
}
animate()

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
})
