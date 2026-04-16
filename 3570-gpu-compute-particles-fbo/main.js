// 3570 GPU Compute Particles FBO - FBO Ping-Pong 粒子系统
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const W = 512, H = 512
const COUNT = W * H

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000)
camera.position.set(0, 0, 400)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 粒子渲染场景
const particleScene = new THREE.Scene()
const particleCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

// 粒子位置/速度 FBO
const posTarget = [
  new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, format: THREE.RGBAFormat }),
  new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, format: THREE.RGBAFormat })
]
// pos: xyz=position, w=lifetime
// vel: xyz=velocity, w=age

// 计算 Pass 材质
const computeMat = new THREE.ShaderMaterial({
  uniforms: {
    uPosTex: { value: null },
    uVelTex: { value: null },
    uTime: { value: 0 },
    uDelta: { value: 0 }
  },
  vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D uPosTex;
    uniform sampler2D uVelTex;
    uniform float uTime;
    uniform float uDelta;
    varying vec2 vUv;
    void main() {
      vec4 pos = texture2D(uPosTex, vUv);
      vec4 vel = texture2D(uVelTex, vUv);
      pos.xyz += vel.xyz * uDelta;
      vel.xyz += vec3(0.0, -0.0003, 0.0) * uDelta;
      vel.xyz += normalize(pos.xyz) * 0.0001 * uDelta;
      // 边界重置
      if (length(pos.xyz) > 100.0 || pos.w <= 0.0) {
        float r1 = fract(sin(dot(vUv + uTime, vec2(127.1, 311.7))) * 43758.5453);
        float r2 = fract(sin(dot(vUv + uTime * 1.3, vec2(269.5, 183.3))) * 43758.5453);
        float r3 = fract(sin(dot(vUv + uTime * 0.7, vec2(419.2, 371.9))) * 43758.5453);
        pos.xyz = vec3((r1-0.5)*60.0, (r2-0.5)*60.0, (r3-0.5)*60.0);
        vel.xyz = vec3((r1-0.5)*0.5, abs(r2-0.5)*0.3, (r3-0.5)*0.5) * 0.02;
        pos.w = 1.0;
      }
      gl_FragColor = pos;
    }
  `
})

const velMat = new THREE.ShaderMaterial({
  uniforms: {
    uPosTex: { value: null },
    uVelTex: { value: null },
    uTime: { value: 0 },
    uDelta: { value: 0 }
  },
  vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D uPosTex;
    uniform sampler2D uVelTex;
    uniform float uTime;
    uniform float uDelta;
    varying vec2 vUv;
    void main() {
      vec4 vel = texture2D(uVelTex, vUv);
      vec4 pos = texture2D(uPosTex, vUv);
      // 简单速度阻尼
      vel.xyz *= (1.0 - 0.001 * uDelta);
      // 引力场
      vec3 toCenter = -normalize(pos.xyz) * 0.0002;
      vel.xyz += toCenter * uDelta;
      // 随机扰动
      float noise = fract(sin(dot(vUv + uTime, vec2(127.1, 311.7))) * 43758.5453);
      vel.xyz += (vec3(noise, fract(noise*1.3), fract(noise*2.7)) - 0.5) * 0.0001 * uDelta;
      if (length(pos.xyz) > 100.0) vel.xyz *= -0.5;
      gl_FragColor = vel;
    }
  `
})

// 初始化 FBO 数据
const initData = new Float32Array(W * H * 4)
for (let i = 0; i < COUNT; i++) {
  const r1 = (i / COUNT)
  const r2 = ((i * 127) % COUNT) / COUNT
  const r3 = ((i * 311) % COUNT) / COUNT
  initData[i*4+0] = (r1 - 0.5) * 100
  initData[i*4+1] = (r2 - 0.5) * 100
  initData[i*4+2] = (r3 - 0.5) * 100
  initData[i*4+3] = 1.0  // lifetime
}
const initVel = new Float32Array(W * H * 4)
for (let i = 0; i < COUNT; i++) {
  const r1 = (i * 17) % COUNT / COUNT
  const r2 = (i * 37) % COUNT / COUNT
  const r3 = (i * 71) % COUNT / COUNT
  initVel[i*4+0] = (r1 - 0.5) * 0.5
  initVel[i*4+1] = abs(r2 - 0.5) * 0.3
  initVel[i*4+2] = (r3 - 0.5) * 0.5
  initVel[i*4+3] = 0
}

const initPosTex = new THREE.DataTexture(initData, W, H, THREE.RGBAFormat, THREE.FloatType)
initPosTex.needsUpdate = true
const initVelTex = new THREE.DataTexture(initVel, W, H, THREE.RGBAFormat, THREE.FloatType)
initVelTex.needsUpdate = true

// 粒子显示
const particleGeo = new THREE.BufferGeometry()
const positions = new Float32Array(COUNT * 3)
const uvs = new Float32Array(COUNT * 2)
for (let i = 0; i < COUNT; i++) {
  const x = (i % W) / W * 2 - 1
  const y = Math.floor(i / W) / H * 2 - 1
  uvs[i*2] = (i % W) / W
  uvs[i*2+1] = Math.floor(i / W) / H
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
particleGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

const particleMat = new THREE.ShaderMaterial({
  uniforms: { uPosTex: { value: null }, uTime: { value: 0 } },
  vertexShader: `
    uniform sampler2D uPosTex;
    attribute vec2 uv;
    varying float vAlpha;
    void main() {
      vec4 pos = texture2D(uPosTex, uv);
      vAlpha = smoothstep(100.0, 0.0, length(pos.xyz));
      vec4 mvPos = modelViewMatrix * vec4(pos.xyz, 1.0);
      gl_PointSize = 1.5 * (300.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      gl_FragColor = vec4(0.3, 0.6, 1.0, vAlpha * (1.0 - d * 2.0) * 0.8);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})

const particlePoints = new THREE.Points(particleGeo, particleMat)
scene.add(particlePoints)

// 场景光
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
scene.add(new THREE.PointLight(0x4488ff, 2, 200))

let current = 0
let lastTime = performance.now()
const clock = new THREE.Clock()

// 初始化 FBO
renderer.setRenderTarget(posTarget[0])
renderer.render(new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial({
  uniforms: { uTex: { value: initPosTex } },
  vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D uTex; void main() { gl_FragColor = texture2D(uTex, gl_FragCoord.xy / vec2(512.0)); }'
})), new THREE.Camera())

function compute() {
  const dt = clock.getDelta()
  computeMat.uniforms.uPosTex.value = posTarget[current].texture
  computeMat.uniforms.uVelTex.value = posTarget[1 - current] ? posTarget[current].texture : initVelTex
  computeMat.uniforms.uTime.value = clock.getElapsedTime()
  computeMat.uniforms.uDelta.value = dt * 60
  velMat.uniforms.uPosTex.value = posTarget[current].texture
  velMat.uniforms.uVelTex.value = posTarget[1 - current] ? posTarget[current].texture : initVelTex
  velMat.uniforms.uTime.value = clock.getElapsedTime()
  velMat.uniforms.uDelta.value = dt * 60

  // 简化：直接在粒子更新时使用 ping-pong
  particleMat.uniforms.uPosTex.value = posTarget[current].texture
}

function animate() {
  requestAnimationFrame(animate)
  compute()
  controls.update()
  renderer.setRenderTarget(null)
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
