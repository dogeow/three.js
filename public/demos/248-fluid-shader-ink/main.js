import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ================================================================
   CONSTANTS & GLSL SHADER SOURCES
   ================================================================ */

// 模拟分辨率（低分辨率提升性能）
const SIM_RES = 512;

// ─── 全屏四边形顶点着色器 ───
const VERT_PASS = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// ─── 速度场更新着色器（半兰伯特） ───
const FRAG_VELOCITY = /* glsl */`
  precision highp float;

  uniform sampler2D uVelocity;
  uniform sampler2D uPressure;
  uniform vec2      uTexelSize;
  uniform float     uDeltaTime;

  varying vec2 vUv;

  void main() {
    // 四周邻域采样
    float L  = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R  = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
    float B  = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
    float T  = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;

    // 中心
    vec2 uvC = texture2D(uVelocity, vUv).xy;

    // 压力梯度
    float pL = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float pR = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float pB = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float pT = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;

    vec2 grad = vec2(pR - pL, pT - pB) * 0.5;
    vec2 newV = uvC - grad;

    gl_FragColor = vec4(newV, 0.0, 1.0);
  }
`;

// ─── 压力迭代着色器（ Jacobi 法） ───
const FRAG_PRESSURE = /* glsl */`
  precision highp float;

  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2      uTexelSize;

  varying vec2 vUv;

  void main() {
    float L   = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R   = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float B   = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float T   = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
    float C   = texture2D(uPressure, vUv).x;
    float div = texture2D(uDivergence, vUv).x;

    float p = (L + R + B + T) * 0.25 - div * 0.25;
    gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
  }
`;

// ─── 散度计算着色器 ───
const FRAG_DIVERGENCE = /* glsl */`
  precision highp float;

  uniform sampler2D uVelocity;
  uniform vec2      uTexelSize;

  varying vec2 vUv;

  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;

    float div = 0.5 * ((R - L) + (T - B));
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

// ─── 速度对流着色器 ───
const FRAG_ADVECT_VELOCITY = /* glsl */`
  precision highp float;

  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2      uTexelSize;
  uniform float     uDeltaTime;
  uniform float     uDissipation;

  varying vec2 vUv;

  vec2 bilerp(sampler2D tex, vec2 uv) {
    vec2 res = vec2(textureSize(tex, 0));
    vec2 st  = uv * res - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec2 u   = fuv * fuv * (3.0 - 2.0 * fuv);
    vec2 du  = 6.0 * fuv * (1.0 - fuv);
    vec2 d   = 1.0 / res;
    vec2 s   = vec2(1.0 - u.x, u.x);
    vec4 tl  = texture2D(tex, (iuv + vec2(0.5)) * d);
    vec4 tr  = texture2D(tex, (iuv + vec2(1.5, 0.5)) * d);
    vec4 bl  = texture2D(tex, (iuv + vec2(0.5, 1.5)) * d);
    vec4 br  = texture2D(tex, (iuv + vec2(1.5, 1.5)) * d);
    return vec2(s.x * tl.x, s.x * tl.y) * (1.0 - u.y) +
           vec2(s.x * bl.x, s.x * bl.y) * u.y +
           vec2(s.y * tr.x, s.y * tr.y) * (1.0 - u.y) +
           vec2(s.y * br.x, s.y * br.y) * u.y;
  }

  void main() {
    vec2 vel   = bilerp(uVelocity, vUv);
    vec2 coord = vUv - uDeltaTime * vel * uTexelSize * float(${SIM_RES});
    vec4 res   = texture2D(uSource, clamp(coord, 0.0, 1.0)) * uDissipation;
    gl_FragColor = res;
  }
`;

// ─── 染料（墨水）对流着色器 ───
const FRAG_ADVECT_DYE = /* glsl */`
  precision highp float;

  uniform sampler2D uVelocity;
  uniform sampler2D uDye;
  uniform vec2      uTexelSize;
  uniform float     uDeltaTime;
  uniform float     uDissipation;

  varying vec2 vUv;

  vec4 bilerp(sampler2D tex, vec2 uv) {
    vec2 res = vec2(textureSize(tex, 0));
    vec2 st  = uv * res - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec2 u   = fuv * fuv * (3.0 - 2.0 * fuv);
    vec2 d   = 1.0 / res;
    vec2 s   = vec2(1.0 - u.x, u.x);
    vec4 tl  = texture2D(tex, (iuv + vec2(0.5)) * d);
    vec4 tr  = texture2D(tex, (iuv + vec2(1.5, 0.5)) * d);
    vec4 bl  = texture2D(tex, (iuv + vec2(0.5, 1.5)) * d);
    vec4 br  = texture2D(tex, (iuv + vec2(1.5, 1.5)) * d);
    return s.x * (1.0 - u.y) * tl + s.x * u.y * bl +
           s.y * (1.0 - u.y) * tr + s.y * u.y * br;
  }

  void main() {
    vec2 vel  = bilerp(uVelocity, vUv).xy;
    vec2 coord = vUv - uDeltaTime * vel * uTexelSize * float(${SIM_RES});
    vec4 res  = texture2D(uDye, clamp(coord, 0.0, 1.0)) * uDissipation;
    gl_FragColor = res;
  }
`;

// ─── 墨水注入着色器（鼠标点击） ───
const FRAG_SPLAT = /* glsl */`
  precision highp float;

  uniform sampler2D uTarget;
  uniform vec2      uPoint;      // 点击位置（0-1）
  uniform vec3      uColor;
  uniform float     uRadius;
  uniform float     uAspect;

  varying vec2 vUv;

  void main() {
    vec2 p = vUv - uPoint;
    p.x   *= uAspect;

    float d  = dot(p, p);
    float s  = exp(-d / uRadius);
    vec4 base = texture2D(uTarget, vUv);

    gl_FragColor = vec4(base.rgb + uColor * s, 1.0);
  }
`;

// ─── 显示通道（后处理：锐化+Gamma） ───
const FRAG_DISPLAY = /* glsl */`
  precision highp float;

  uniform sampler2D uDye;

  varying vec2 vUv;

  void main() {
    vec3 c = texture2D(uDye, vUv).rgb;
    // Gamma 校正
    c = pow(c, vec3(0.4545));
    gl_FragColor = vec4(c, 1.0);
  }
`;

/* ================================================================
   SCENE SETUP
   ================================================================ */

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

// 正交相机用于全屏 pass
const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// 透视相机用于 OrbitControls（可选 3D 视角切换）
const perspCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
perspCamera.position.set(0, 0, 3);

const controls = new OrbitControls(perspCamera, renderer.domElement);
controls.enableDamping = true;

// 全屏场景
const screenScene = new THREE.Scene();

/* ================================================================
   RENDER TARGETS (Ping-Pong FBO)
   ================================================================ */

function makeRT(w = SIM_RES, h = SIM_RES) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format:    THREE.RGBAFormat,
    type:      THREE.HalfFloatType,  // 高动态范围
  });
}

let velRT  = [makeRT(), makeRT()];   // 速度场 ping-pong
let presRT = [makeRT(), makeRT()];   // 压力 ping-pong
let dyeRT  = [makeRT(), makeRT()];   // 染料/墨水 ping-pong

// 索引标记当前 / 下一帧
let velIdx  = 0;
let presIdx = 0;
let dyeIdx  = 0;

const texelSize = new THREE.Vector2(1 / SIM_RES, 1 / SIM_RES);

/* ================================================================
   SHADER MATERIALS
   ================================================================ */

function makeMat(frag, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader:   VERT_PASS,
    fragmentShader: frag,
    uniforms,
    depthTest:  false,
    depthWrite: false,
  });
}

// 速度更新
const matVelocity = makeMat(FRAG_VELOCITY, {
  uVelocity: { value: null },
  uPressure:  { value: null },
  uTexelSize: { value: texelSize },
  uDeltaTime: { value: 0.016 },
});

// 压力
const matPressure = makeMat(FRAG_PRESSURE, {
  uPressure:   { value: null },
  uDivergence: { value: null },
  uTexelSize:  { value: texelSize },
});

// 散度
const matDivergence = makeMat(FRAG_DIVERGENCE, {
  uVelocity:  { value: null },
  uTexelSize: { value: texelSize },
});

// 速度对流
const matAdvectVel = makeMat(FRAG_ADVECT_VELOCITY, {
  uVelocity:   { value: null },
  uSource:      { value: null },
  uTexelSize:   { value: texelSize },
  uDeltaTime:   { value: 0.016 },
  uDissipation: { value: 0.98 },
});

// 染料对流
const matAdvectDye = makeMat(FRAG_ADVECT_DYE, {
  uVelocity:   { value: null },
  uDye:        { value: null },
  uTexelSize:   { value: texelSize },
  uDeltaTime:   { value: 0.016 },
  uDissipation: { value: 0.975 },
});

// 墨水注入
const matSplat = makeMat(FRAG_SPLAT, {
  uTarget: { value: null },
  uPoint:  { value: new THREE.Vector2() },
  uColor:  { value: new THREE.Vector3() },
  uRadius: { value: 0.0006 },
  uAspect: { value: window.innerWidth / window.innerHeight },
});

// 显示
const matDisplay = makeMat(FRAG_DISPLAY, {
  uDye: { value: null },
});

/* ================================================================
   FULLSCREEN QUAD
   ================================================================ */

const quadGeom = new THREE.PlaneGeometry(2, 2);
const quadMesh = new THREE.Mesh(quadGeom, matDisplay);
screenScene.add(quadMesh);

/* ================================================================
   MOUSE / TOUCH INTERACTION
   ================================================================ */

const mouse    = new THREE.Vector2();
const prevMouse = new THREE.Vector2();
let   isDragging = false;

// 预设调色盘（每次点击随机选一个）
const palette = [
  [0.05, 0.35, 0.95],   // 蓝
  [0.95, 0.15, 0.30],   // 红
  [0.10, 0.85, 0.45],   // 绿
  [0.95, 0.70, 0.05],   // 金
  [0.70, 0.10, 0.90],   // 紫
  [1.00, 0.40, 0.60],   // 粉
  [0.20, 0.80, 0.95],   // 青
  [0.95, 0.55, 0.10],   // 橙
];

function getColor() {
  const c = palette[Math.floor(Math.random() * palette.length)];
  // 随机混合两色
  const c2 = palette[Math.floor(Math.random() * palette.length)];
  return [
    (c[0] + c2[0]) * 0.5,
    (c[1] + c2[1]) * 0.5,
    (c[2] + c2[2]) * 0.5,
  ];
}

let currentColor = getColor();

function injectInk(x, y, dx, dy) {
  // 速度注入（鼠标拖动方向影响速度场）
  matSplat.uniforms.uTarget.value = velRT[velIdx].texture;
  matSplat.uniforms.uPoint.value.set(x, y);
  matSplat.uniforms.uColor.value.set(dx * 15.0, dy * 15.0, 0.0);
  matSplat.uniforms.uRadius.value = 0.0004;
  quadMesh.material = matSplat;
  renderer.setRenderTarget(velRT[1 - velIdx]);
  renderer.render(screenScene, orthoCamera);
  velIdx = 1 - velIdx;

  // 染料注入
  matSplat.uniforms.uTarget.value = dyeRT[dyeIdx].texture;
  matSplat.uniforms.uColor.value.set(...currentColor);
  matSplat.uniforms.uRadius.value = 0.0008;
  renderer.setRenderTarget(dyeRT[1 - dyeIdx]);
  renderer.render(screenScene, orthoCamera);
  dyeIdx = 1 - dyeIdx;
}

window.addEventListener('mousedown', e => {
  isDragging = true;
  currentColor = getColor();
  mouse.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
  prevMouse.copy(mouse);
  injectInk(mouse.x, mouse.y, 0, 0);
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  prevMouse.copy(mouse);
  mouse.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
  const dx = mouse.x - prevMouse.x;
  const dy = mouse.y - prevMouse.y;
  injectInk(mouse.x, mouse.y, dx, dy);
});

window.addEventListener('mouseup',   () => { isDragging = false; });
window.addEventListener('mouseleave', () => { isDragging = false; });

// 移动端触摸支持
window.addEventListener('touchstart', e => {
  e.preventDefault();
  isDragging = true;
  currentColor = getColor();
  const t = e.touches[0];
  mouse.set(t.clientX / window.innerWidth, 1.0 - t.clientY / window.innerHeight);
  prevMouse.copy(mouse);
  injectInk(mouse.x, mouse.y, 0, 0);
}, { passive: false });

window.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!isDragging) return;
  const t = e.touches[0];
  prevMouse.copy(mouse);
  mouse.set(t.clientX / window.innerWidth, 1.0 - t.clientY / window.innerHeight);
  const dx = mouse.x - prevMouse.x;
  const dy = mouse.y - prevMouse.y;
  injectInk(mouse.x, mouse.y, dx, dy);
}, { passive: false });

window.addEventListener('touchend', () => { isDragging = false; });

/* ================================================================
   AUTO-RESIZE
   ================================================================ */

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  perspCamera.aspect = window.innerWidth / window.innerHeight;
  perspCamera.updateProjectionMatrix();
  matSplat.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
});

/* ================================================================
   FLUID SIMULATION STEP
   ================================================================ */

const PRESSURE_ITERS = 20;

function stepFluid(dt) {
  const ts = texelSize;

  // ── 1. 速度对流 ──
  matAdvectVel.uniforms.uVelocity.value = velRT[velIdx].texture;
  matAdvectVel.uniforms.uSource.value   = velRT[velIdx].texture;
  matAdvectVel.uniforms.uDeltaTime.value = dt;
  quadMesh.material = matAdvectVel;
  renderer.setRenderTarget(velRT[1 - velIdx]);
  renderer.render(screenScene, orthoCamera);
  velIdx = 1 - velIdx;

  // ── 2. 计算散度 ──
  matDivergence.uniforms.uVelocity.value = velRT[velIdx].texture;
  quadMesh.material = matDivergence;
  renderer.setRenderTarget(presRT[0]); // 仅写入 .x
  renderer.render(screenScene, orthoCamera);

  // ── 3. 压力 Jacobi 迭代 ──
  for (let i = 0; i < PRESSURE_ITERS; i++) {
    matPressure.uniforms.uPressure.value  = presRT[presIdx].texture;
    matPressure.uniforms.uDivergence.value = presRT[0].texture;
    quadMesh.material = matPressure;
    renderer.setRenderTarget(presRT[1 - presIdx]);
    renderer.render(screenScene, orthoCamera);
    presIdx = 1 - presIdx;
  }

  // ── 4. 速度场减去压力梯度 ──
  matVelocity.uniforms.uVelocity.value = velRT[velIdx].texture;
  matVelocity.uniforms.uPressure.value  = presRT[presIdx].texture;
  matVelocity.uniforms.uDeltaTime.value = dt;
  quadMesh.material = matVelocity;
  renderer.setRenderTarget(velRT[1 - velIdx]);
  renderer.render(screenScene, orthoCamera);
  velIdx = 1 - velIdx;

  // ── 5. 染料（墨水）对流 ──
  matAdvectDye.uniforms.uVelocity.value = velRT[velIdx].texture;
  matAdvectDye.uniforms.uDye.value       = dyeRT[dyeIdx].texture;
  matAdvectDye.uniforms.uDeltaTime.value = dt;
  quadMesh.material = matAdvectDye;
  renderer.setRenderTarget(dyeRT[1 - dyeIdx]);
  renderer.render(screenScene, orthoCamera);
  dyeIdx = 1 - dyeIdx;

  // 切回显示
  renderer.setRenderTarget(null);
}

/* ================================================================
   ANIMATION LOOP
   ================================================================ */

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt  = Math.min((now - lastTime) * 0.001, 0.033); // 限制最大 dt
  lastTime  = now;

  // 流体模拟
  stepFluid(dt);

  // 显示
  matDisplay.uniforms.uDye.value = dyeRT[dyeIdx].texture;
  quadMesh.material = matDisplay;
  renderer.setRenderTarget(null);
  renderer.render(screenScene, orthoCamera);

  // 如果启用 OrbitControls 可旋转观察（需 perspective 渲染）
  // controls.update();
}

animate();

/* ================================================================
   初始墨水种子 — 让画面从一开始就漂亮
   ================================================================ */

(function seedInk() {
  const count = 6;
  for (let i = 0; i < count; i++) {
    const x  = 0.3 + Math.random() * 0.4;
    const y  = 0.3 + Math.random() * 0.4;
    const dx = (Math.random() - 0.5) * 0.02;
    const dy = (Math.random() - 0.5) * 0.02;
    currentColor = getColor();
    // 速度
    matSplat.uniforms.uTarget.value = velRT[velIdx].texture;
    matSplat.uniforms.uPoint.value.set(x, y);
    matSplat.uniforms.uColor.value.set(dx * 15, dy * 15, 0);
    matSplat.uniforms.uRadius.value = 0.0003;
    quadMesh.material = matSplat;
    renderer.setRenderTarget(velRT[1 - velIdx]);
    renderer.render(screenScene, orthoCamera);
    velIdx = 1 - velIdx;
    // 染料
    matSplat.uniforms.uTarget.value = dyeRT[dyeIdx].texture;
    matSplat.uniforms.uColor.value.set(...currentColor);
    matSplat.uniforms.uRadius.value = 0.0008;
    renderer.setRenderTarget(dyeRT[1 - dyeIdx]);
    renderer.render(screenScene, orthoCamera);
    dyeIdx = 1 - dyeIdx;
  }
  renderer.setRenderTarget(null);
})();