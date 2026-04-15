// 2094. 着色器万花筒
// 着色器万花筒效果 - 增强版
// 特性：8对称轴 + 丰富色彩 + 动态变化 + 全屏渲染
import * as THREE from 'three'

// ============================================================
// 场景初始化
// ============================================================
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // 限制像素比，防止性能问题
document.body.appendChild(renderer.domElement)

// ============================================================
// 万花筒着色器
// ============================================================
const kaleidoMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },                          // 动画时间
    uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    uKaleidoSegments: { value: 8.0 },             // 万花筒对称轴数量（6-8）
    uColorShift: { value: 0.0 },                  // 色彩偏移量
    uIntensity: { value: 1.0 },                   // 整体亮度
    uSpeed: { value: 1.0 },                       // 动画速度
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uKaleidoSegments;
    uniform float uColorShift;
    uniform float uIntensity;
    uniform float uSpeed;
    varying vec2 vUv;

    // 常量定义
    #define PI 3.14159265359
    #define TAU 6.28318530718

    // ------------------------------------------------------------
    // 万花筒坐标变换
    // 将笛卡尔坐标转换为万花筒对称坐标
    // segments: 对称轴数量
    // ------------------------------------------------------------
    vec2 kaleido(vec2 uv, float segments) {
      float angle = atan(uv.y, uv.x);
      float radius = length(uv);
      // 将角度折叠到单个对称扇区内
      float segmentAngle = TAU / segments;
      angle = mod(angle, segmentAngle);
      // 以对称轴为中心镜像
      angle = abs(angle - segmentAngle * 0.5);
      return vec2(cos(angle), sin(angle)) * radius;
    }

    // ------------------------------------------------------------
    // 分形噪声函数 - 生成有机纹理
    // ------------------------------------------------------------
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f); // smoothstep插值
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // ------------------------------------------------------------
    // 色彩调色板 - 丰富的渐变色彩
    // ------------------------------------------------------------
    vec3 palette(float t, float shift) {
      // 基础色相循环
      t += shift;
      vec3 a = vec3(0.5, 0.5, 0.5);   // 基础亮度
      vec3 b = vec3(0.5, 0.5, 0.5);   // 振幅
      vec3 c = vec3(1.0, 1.0, 1.0);   // 频率
      vec3 d = vec3(0.0, 0.33, 0.67); // 相位偏移 - 产生彩虹色
      return a + b * cos(TAU * (c * t + d));
    }

    // ------------------------------------------------------------
    // 主着色函数
    // ------------------------------------------------------------
    void main() {
      // 坐标归一化 (-1 到 1 范围，保持宽高比)
      vec2 uv = (vUv - 0.5) * 2.0;
      float aspect = uResolution.x / uResolution.y;
      uv.x *= aspect;

      // 应用万花筒变换
      vec2 kUv = kaleido(uv, uKaleidoSegments);

      // 时间相关变量
      float t = uTime * uSpeed;

      // ----------------
      // 背景渐变层
      // ----------------
      vec3 bgColor = palette(length(kUv) * 0.3 + t * 0.1, uColorShift * 0.5);
      bgColor *= 0.3;

      // ----------------
      // 动态圆形层 1 - 脉冲环
      // ----------------
      float dist1 = length(kUv);
      float ring1 = sin(dist1 * 8.0 - t * 2.0) * 0.5 + 0.5;
      ring1 *= smoothstep(1.5, 0.0, dist1); // 衰减到边缘
      vec3 color1 = palette(dist1 * 0.5 + t * 0.2, uColorShift);
      vec3 layer1 = color1 * ring1 * 0.6;

      // ----------------
      // 动态圆形层 2 - 内圈旋转
      // ----------------
      vec2 rotUv = kUv;
      float c = cos(t * 0.7), s = sin(t * 0.7);
      rotUv = mat2(c, -s, s, c) * rotUv; // 2D旋转矩阵
      float dist2 = length(rotUv);
      float ring2 = sin(dist2 * 12.0 + t * 3.0) * 0.5 + 0.5;
      ring2 *= smoothstep(0.8, 0.0, dist2);
      vec3 color2 = palette(dist2 * 0.8 - t * 0.15, uColorShift + 0.3);
      vec3 layer2 = color2 * ring2 * 0.5;

      // ----------------
      // 噪波纹理层 - 有机动态纹理
      // ----------------
      vec2 noiseUv = kUv * 3.0;
      noiseUv += vec2(t * 0.3, t * 0.2); // 随时间漂移
      float n = smoothNoise(noiseUv * 2.0);
      n += smoothNoise(noiseUv * 4.0) * 0.5;  // 叠加高频
      n += smoothNoise(noiseUv * 8.0) * 0.25; // 叠加超高频
      n = n / 1.75; // 归一化
      vec3 noiseColor = palette(n + t * 0.1, uColorShift + 0.6);
      vec3 noiseLayer = noiseColor * n * 0.4;

      // ----------------
      // 射线光栅层
      // ----------------
      float angle = atan(kUv.y, kUv.x);
      float rays = abs(sin(angle * 12.0 + t * 1.5));
      rays = pow(rays, 3.0); // 锐化射线
      rays *= smoothstep(1.2, 0.2, dist1); // 从中心向外衰减
      vec3 rayColor = palette(angle * 0.5 + t * 0.1, uColorShift + 0.9);
      vec3 rayLayer = rayColor * rays * 0.3;

      // ----------------
      // 中心光晕
      // ----------------
      float glow = 1.0 / (1.0 + dist1 * dist1 * 8.0);
      glow *= 0.5 + 0.5 * sin(t * 2.0); // 呼吸效果
      vec3 glowColor = palette(t * 0.05, uColorShift);
      vec3 glowLayer = glowColor * glow * 0.6;

      // ----------------
      // 色彩混合
      // ----------------
      vec3 finalColor = bgColor;
      finalColor += layer1;
      finalColor += layer2;
      finalColor += noiseLayer;
      finalColor += rayLayer;
      finalColor += glowLayer;

      // 边缘暗角 - 增加深度感
      float vignette = 1.0 - length(uv) * 0.3;
      vignette = clamp(vignette, 0.0, 1.0);
      finalColor *= vignette;

      // 应用整体强度
      finalColor *= uIntensity;

      // 色调映射 - 防止过曝
      finalColor = finalColor / (1.0 + finalColor);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
})

// 创建全屏平面
const geometry = new THREE.PlaneGeometry(12, 12)
const mesh = new THREE.Mesh(geometry, kaleidoMaterial)
scene.add(mesh)

// ============================================================
// 动画循环
// ============================================================
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  const elapsed = clock.getElapsedTime()

  // 更新着色器时间uniform
  kaleidoMaterial.uniforms.uTime.value = elapsed

  // 动态更新色彩偏移 - 创造缓慢的色彩流转
  kaleidoMaterial.uniforms.uColorShift.value = elapsed * 0.05

  // 可选：动态调整对称轴数量（6-8之间缓慢变化）
  const segments = 7.0 + Math.sin(elapsed * 0.1) // 6-8之间变化
  kaleidoMaterial.uniforms.uKaleidoSegments.value = segments

  // 可选：动态调整强度（呼吸效果）
  kaleidoMaterial.uniforms.uIntensity.value = 0.9 + Math.sin(elapsed * 0.3) * 0.1

  renderer.render(scene, camera)
}

animate()

// ============================================================
// 响应式处理 - 窗口大小改变时重新调整
// ============================================================
window.addEventListener('resize', () => {
  // 更新相机宽高比
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()

  // 更新渲染器尺寸
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // 更新着色器分辨率uniform
  kaleidoMaterial.uniforms.uResolution.value.set(innerWidth, innerHeight)
})

// ============================================================
// 键盘交互 - 按 W 切换对称轴数量
// ============================================================
let autoShift = true // 自动色彩偏移开关
window.addEventListener('keydown', (e) => {
  if (e.key === 'w' || e.key === 'W') {
    // 切换对称轴
    const current = kaleidoMaterial.uniforms.uKaleidoSegments.value
    kaleidoMaterial.uniforms.uKaleidoSegments.value = current === 8.0 ? 6.0 : 8.0
  }
  if (e.key === 's' || e.key === 'S') {
    // 切换自动色彩偏移
    autoShift = !autoShift
  }
  if (e.key === 'ArrowUp') {
    // 增加动画速度
    kaleidoMaterial.uniforms.uSpeed.value += 0.2
  }
  if (e.key === 'ArrowDown') {
    // 减少动画速度
    kaleidoMaterial.uniforms.uSpeed.value = Math.max(0.1, kaleidoMaterial.uniforms.uSpeed.value - 0.2)
  }
})

console.log('万花筒着色器已启动')
console.log('按 W 切换对称轴数量（6/8）')
console.log('按 S 切换自动色彩偏移')
console.log('按 ↑/↓ 调整动画速度')
