// ============================================================
// 2090. 着色器水面 - 流体着色器水面
// 特性：多频波浪 + 颜色渐变 + 高光反射
// ============================================================

import * as THREE from 'three'

// ----------------------------------------------------------------
// 场景初始化
// ----------------------------------------------------------------
const scene = new THREE.Scene()
// 深蓝色背景，营造深海氛围
scene.background = new THREE.Color(0x001826)

// 透视相机，视角60度
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
// 相机位于水面上方俯视
camera.position.set(0, 12, 18)
camera.lookAt(0, 0, 0)

// WebGL渲染器，启用抗锯齿
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

// ----------------------------------------------------------------
// 创建水面几何体
// ----------------------------------------------------------------
const waterSize = 40                    // 水面宽度/深度（单位）
const segments = 160                     // 网格分段数，越高越平滑但越慢
const geo = new THREE.PlaneGeometry(waterSize, waterSize, segments, segments)

// ----------------------------------------------------------------
// 自定义着色器材质
// ----------------------------------------------------------------
const mat = new THREE.ShaderMaterial({
  // 可动态更新的 uniforms
  uniforms: {
    uTime:      { value: 0.0 },          // 动画时间
    uDeepColor: { value: new THREE.Color(0x003366) },   // 深水颜色
    uMidColor:  { value: new THREE.Color(0x006699) },   // 中间水颜色
    uShallowColor: { value: new THREE.Color(0x33cccc) }, // 浅水颜色
    uFoamColor: { value: new THREE.Color(0xeeffff) },   // 浪尖泡沫色
  },

  // --------------------------------------------------
  // 顶点着色器：计算波浪高度
  // --------------------------------------------------
  vertexShader: `
    // 由 JS 传入的时间 uniform
    uniform float uTime;

    // 传递给片元着色器的变量
    varying vec2  vUv;       // UV 坐标 [0,1]
    varying float vHeight;   // 波浪高度，用于颜色插值
    varying vec3  vNormal;   // 顶点的法线方向（用于高光）

    // ---- 多频波浪函数 ----
    // 采用 4 层不同频率/振幅/速度的正弦波叠加
    float waveHeight(vec2 pos) {
      float h = 0.0;

      // 第一层：大尺度慢波（远景波浪）
      h += sin(pos.x * 0.4 + uTime * 0.8) * 0.8
         + cos(pos.y * 0.3 + uTime * 0.6) * 0.5;

      // 第二层：中尺度中波
      h += sin(pos.x * 1.2 + pos.y * 0.9 + uTime * 1.2) * 0.35;

      // 第三层：小尺度快波（细节涟漪）
      h += sin(pos.x * 2.5 + uTime * 2.0) * 0.15
         + cos(pos.y * 2.0 - uTime * 1.8) * 0.12;

      // 第四层：细小波纹（噪点感）
      h += sin(pos.x * 5.0 + pos.y * 4.5 + uTime * 3.0) * 0.05;

      return h;
    }

    void main() {
      vUv = uv;

      vec3 pos = position;

      // 计算当前顶点的高度
      float h = waveHeight(pos.xy);
      pos.z += h;
      vHeight = h;

      // ----- 估算法线（用于高光计算）-----
      // 通过相邻点的高度差近似偏导数
      float eps = 0.1;
      float hx = waveHeight(pos.xy + vec2(eps, 0.0));
      float hy = waveHeight(pos.xy + vec2(0.0, eps));
      vec3 normal = normalize(vec3(h - hx, h - hy, eps * 2.0));
      vNormal = normal;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,

  // --------------------------------------------------
  // 片元着色器：水面着色
  // --------------------------------------------------
  fragmentShader: `
    // 从顶点着色器传来的插值变量
    varying vec2  vUv;
    varying float vHeight;
    varying vec3  vNormal;

    // JS 侧 uniforms
    uniform vec3  uDeepColor;
    uniform vec3  uMidColor;
    uniform vec3  uShallowColor;
    uniform vec3  uFoamColor;
    uniform float uTime;

    void main() {
      // ----- 高度归一化 -----
      // 波浪高度约在 [-2, 2] 范围，映射到 [0,1]
      float t = clamp((vHeight + 2.0) / 4.0, 0.0, 1.0);

      // ----- 颜色分层 -----
      // 高度 < 0.3  → 深水
      // 高度 0.3~0.6 → 中间过渡
      // 高度 0.6~0.8 → 浅水
      // 高度 > 0.8  → 浪尖泡沫
      vec3 color;
      if (t < 0.3) {
        color = mix(uDeepColor, uMidColor, t / 0.3);
      } else if (t < 0.6) {
        color = mix(uMidColor, uShallowColor, (t - 0.3) / 0.3);
      } else if (t < 0.8) {
        color = mix(uShallowColor, uFoamColor, (t - 0.6) / 0.2);
      } else {
        color = uFoamColor;
      }

      // ----- 高光反射（简化的菲涅尔效果）-----
      // 以视角方向和法线夹角模拟反射强度
      vec3 viewDir = vec3(0.0, 1.0, 0.5);       // 假定的视线方向
      float fresnel = pow(1.0 - max(dot(vNormal, normalize(viewDir)), 0.0), 3.0);
      // 在水的高光区域叠加白色
      color += vec3(1.0) * fresnel * 0.6 * (1.0 - t);

      // ----- 透明度 -----
      // 水面中心略透明，边缘略实
      float alpha = mix(0.7, 0.95, t);

      gl_FragColor = vec4(color, alpha);
    }
  `,

  // 水面半透明
  transparent: true,
  // 双面渲染（从上方和下方都能看到水面）
  side: THREE.DoubleSide
})

// ----------------------------------------------------------------
// 创建水面网格，旋转为水平
// ----------------------------------------------------------------
const mesh = new THREE.Mesh(geo, mat)
mesh.rotation.x = -Math.PI / 2        // Plane 默认朝上，旋转90°变为水平
scene.add(mesh)

// ----------------------------------------------------------------
// 添加光照
// ----------------------------------------------------------------
// 环境光：提供基础亮度
scene.add(new THREE.AmbientLight(0x334455, 0.6))

// 方向光：模拟太阳/月光
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
dirLight.position.set(5, 10, 5)
scene.add(dirLight)

// 点光源：水面高光点缀
const pointLight = new THREE.PointLight(0x88ddff, 0.8, 50)
pointLight.position.set(-5, 8, -5)
scene.add(pointLight)

// ----------------------------------------------------------------
// 动画循环
// ----------------------------------------------------------------
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  // 更新时间 uniform，驱动波浪动画
  mat.uniforms.uTime.value = clock.getElapsedTime()

  renderer.render(scene, camera)
}
animate()

// ----------------------------------------------------------------
// 窗口大小响应式
// ----------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})