import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'three/addons/libs/lil-gui.module.min.js'

// ============ 场景设置 ============
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

// 正交相机 + 全屏四边形模拟屏幕空间
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

// 透视相机（用于 OrbitControls 提供交互，位置会传入 shader）
const perspCamera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
perspCamera.position.set(0, 3, 8)
perspCamera.lookAt(0, 0, 0)

const controls = new OrbitControls(perspCamera, renderer.domElement)
controls.enableDamping = true
controls.maxDistance = 20
controls.minDistance = 2

// ============ GUI 参数 ============
const params = {
  animSpeed: 1.0,
  shadowSoftness: 8.0,
  shapeCount: 'medium',  // 'simple' | 'medium' | 'complex'
}

// ============ 着色器 ============
const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec3  uCameraPos;
  uniform mat4  uCameraMatrix;
  uniform float uAnimSpeed;
  uniform float uShadowSoftness;
  uniform int   uShapeMode;  // 0=simple, 1=medium, 2=complex

  varying vec2 vUv;

  // ---- SDF 基础函数 ----

  // 球体
  float sdSphere(vec3 p, float r) {
    return length(p) - r;
  }

  // 立方体
  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  // 环面（水平放置）
  float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }

  // 圆角立方体
  float sdRoundBox(vec3 p, vec3 b, float r) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) - r;
  }

  // 无限长圆柱体
  float sdCylinder(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }

  // ---- 布尔运算 & 平滑并集 ----

  // 普通并集
  float opUnion(float a, float b) {
    return min(a, b);
  }

  // 平滑并集（k 控制融合程度）
  float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
  }

  // ---- 场景 SDF ----

  float map(vec3 p) {
    float t = uTime * uAnimSpeed;

    // 地面
    float ground = p.y + 1.5;

    float d = ground;

    if (uShapeMode == 0) {
      // --- 简单场景：几个球 ---
      float s1 = sdSphere(p - vec3(sin(t) * 1.2, 0.0, 0.0), 0.8);
      float s2 = sdSphere(p - vec3(-sin(t) * 1.2, 0.5, 0.0), 0.6);
      float b1 = sdRoundBox(p - vec3(0.0, -0.5 + sin(t * 0.7) * 0.3, 0.0), vec3(0.5), 0.1);
      d = smin(smin(s1, s2, 0.5), b1, 0.5);

    } else if (uShapeMode == 1) {
      // --- 中等场景：球 + 立方体 + 环面 ---
      // 中心大球
      float core = sdSphere(p, 1.0);

      // 轨道小球
      vec3 sp = p;
      sp.xz = mat2(cos(t), -sin(t), sin(t), cos(t)) * p.xz;
      sp.y -= sin(t * 0.8) * 0.5;
      float orb = sdSphere(sp - vec3(2.0, 0.0, 0.0), 0.45);

      // 脉冲立方体
      float pulse = sin(t * 2.0) * 0.5 + 0.5;
      float cube = sdRoundBox(p - vec3(-1.5, sin(t) * 0.4, 0.0), vec3(0.5 + pulse * 0.15), 0.08);

      // 环面
      vec3 tp = p - vec3(0.0, 0.0, 0.0);
      tp.xz = mat2(cos(t * 0.6), -sin(t * 0.6), sin(t * 0.6), cos(t * 0.6)) * tp.xz;
      float torus = sdTorus(tp, vec2(1.8, 0.3));

      d = smin(smin(smin(core, orb, 0.4), cube, 0.5), torus, 0.6);
      d = smin(d, ground, 0.3);

    } else {
      // --- 复杂场景：大量物体 ---
      // 中心核心球
      float core = sdSphere(p, 0.9 + sin(t * 1.5) * 0.1);

      // 四个环绕球
      float orbitR = 2.2;
      for (int i = 0; i < 4; i++) {
        float ang = float(i) * 1.5708 + t * 0.8;
        vec3 op = vec3(cos(ang) * orbitR, sin(t + float(i)) * 0.6, sin(ang) * orbitR);
        float orb = sdSphere(p - op, 0.4);
        d = smin(d, orb, 0.45);
      }

      // 两个环面
      vec3 t1p = p - vec3(sin(t * 0.4) * 1.5, 0.0, cos(t * 0.3) * 1.5);
      t1p.xy = mat2(cos(t * 0.5), -sin(t * 0.5), sin(t * 0.5), cos(t * 0.5)) * t1p.xy;
      float tor1 = sdTorus(t1p, vec2(1.2, 0.25));
      d = smin(d, tor1, 0.5);

      vec3 t2p = p - vec3(-1.0, 0.5, -0.5);
      t2p.yz = mat2(cos(t * 0.3), -sin(t * 0.3), sin(t * 0.3), cos(t * 0.3)) * t2p.yz;
      float tor2 = sdTorus(t2p, vec2(0.9, 0.2));
      d = smin(d, tor2, 0.4);

      // 脉冲立方体
      float pulse = sin(t * 2.5) * 0.5 + 0.5;
      float cube = sdRoundBox(p - vec3(0.0, -0.6, 0.0), vec3(0.4 + pulse * 0.2), 0.1);
      d = smin(d, cube, 0.5);

      // 小圆柱装饰
      for (int i = 0; i < 3; i++) {
        float ang = float(i) * 2.0944 + t * 0.3;
        vec3 cp = p - vec3(cos(ang) * 3.0, -1.0, sin(ang) * 3.0);
        float cyl = sdCylinder(cp, 0.15, 0.8);
        d = smin(d, cyl, 0.3);
      }

      d = smin(d, ground, 0.3);
    }

    return d;
  }

  // ---- 法线计算（有限差分）----
  vec3 calcNormal(vec3 p) {
    const float eps = 0.001;
    return normalize(vec3(
      map(p + vec3(eps, 0.0, 0.0)) - map(p - vec3(eps, 0.0, 0.0)),
      map(p + vec3(0.0, eps, 0.0)) - map(p - vec3(0.0, eps, 0.0)),
      map(p + vec3(0.0, 0.0, eps)) - map(p - vec3(0.0, 0.0, eps))
    ));
  }

  // ---- 光线步进 ----
  float rayMarch(vec3 ro, vec3 rd, float tmin, float tmax) {
    float t = tmin;
    for (int i = 0; i < 128; i++) {
      float d = map(ro + rd * t);
      if (abs(d) < 0.0005 * t || t > tmax) break;
      t += d * 0.8; // 稍微保守一些避免跳变
    }
    return t;
  }

  // ---- 软阴影 ----
  float softShadow(vec3 ro, vec3 rd, float tmin, float tmax, float k) {
    float res = 1.0;
    float t = tmin;
    for (int i = 0; i < 64; i++) {
      if (t > tmax) break;
      float h = map(ro + rd * t);
      if (h < 0.0005) return 0.0;
      res = min(res, k * h / t);
      t += clamp(h, 0.01, 0.5);
    }
    return clamp(res, 0.0, 1.0);
  }

  // ---- 环境光遮蔽 ----
  float calcAO(vec3 p, vec3 n) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 5; i++) {
      float h = 0.01 + 0.12 * float(i);
      float d = map(p + h * n);
      occ += (h - d) * sca;
      sca *= 0.9;
    }
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
  }

  // ---- 主函数 ----
  void main() {
    // 计算射线方向（透视投影）
    vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / uResolution.y;

    // 从相机矩阵获取射线
    vec3 ro = uCameraPos;
    vec3 rd = normalize(mat3(uCameraMatrix) * vec3(uv, -1.0));

    // 天空背景色（调亮，避免角落黑屏）
    vec3 skyCol = mix(vec3(0.05, 0.08, 0.2), vec3(0.2, 0.3, 0.5), clamp(rd.y * 0.5 + 0.5, 0.0, 1.0));

    // 轻微雾效颜色
    vec3 fogCol = vec3(0.08, 0.12, 0.25);

    float t = rayMarch(ro, rd, 0.01, 60.0);

    vec3 col;
    if (t < 60.0) {
      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p);

      // 光源方向（主光源）
      vec3 lightDir = normalize(vec3(3.0, 6.0, 4.0));
      vec3 lightCol = vec3(1.0, 0.95, 0.85) * 1.5;

      // 填充光源
      vec3 fillDir = normalize(vec3(-2.0, 2.0, -3.0));
      vec3 fillCol = vec3(0.3, 0.4, 0.8) * 0.4;

      // 环境光
      vec3 ambient = vec3(0.1, 0.12, 0.2);

      // 漫反射
      float diff = max(dot(n, lightDir), 0.0);
      float fillDiff = max(dot(n, fillDir), 0.0);

      // 高光（Phong）
      vec3 viewDir = normalize(ro - p);
      vec3 halfVec = normalize(lightDir + viewDir);
      float spec = pow(max(dot(n, halfVec), 0.0), 64.0);
      float specFill = pow(max(dot(n, normalize(fillDir + viewDir)), 0.0), 32.0) * 0.3;

      // 软阴影
      float sha = softShadow(p + n * 0.005, lightDir, 0.01, 20.0, uShadowSoftness);

      // AO
      float ao = calcAO(p, n);

      // 材质颜色（根据位置做渐变）
      float matMix = sin(p.x * 2.0 + uTime) * 0.5 + 0.5;
      vec3 baseCol = mix(vec3(0.2, 0.6, 0.9), vec3(0.9, 0.5, 0.2), matMix * 0.3 + 0.1);

      // 地面特殊处理
      if (p.y < -1.4) {
        // 棋盘格地面
        float check = mod(floor(p.x * 2.0) + floor(p.z * 2.0), 2.0);
        baseCol = mix(vec3(0.15), vec3(0.3), check);
        // 加上一点渐变衰减
        float dist = length(p.xz);
        baseCol *= 1.0 / (1.0 + dist * 0.15);
      }

      // 组合光照
      vec3 diffuse  = lightCol * diff * sha + fillCol * fillDiff;
      vec3 specular = lightCol * (spec * sha + specFill);
      vec3 ambLight = ambient * ao;

      col = baseCol * (diffuse + ambLight) + specular;

      // 雾效
      float fog = 1.0 - exp(-t * t * 0.0015);
      col = mix(col, fogCol, fog);

    } else {
      col = skyCol;
      // 星空
      float star = step(0.998, fract(sin(dot(floor(rd.xy * 800.0), vec2(12.9898, 78.233))) * 43758.5453));
      col += star * 0.8;
    }

    // 色调映射 + gamma
    col = col / (col + 1.0);
    col = pow(col, vec3(0.4545));

    // 轻微暗角（极轻）
    // vec2 q = gl_FragCoord.xy / uResolution;
    // col *= 0.9 + 0.1 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.4);

    gl_FragColor = vec4(col, 1.0);
  }
`

// ============ 全屏几何体 ============
const geo = new THREE.PlaneGeometry(2, 2)
const mat = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime:          { value: 0 },
    uResolution:    { value: new THREE.Vector2(innerWidth, innerHeight) },
    uCameraPos:     { value: new THREE.Vector3() },
    uCameraMatrix:  { value: new THREE.Matrix4() },
    uAnimSpeed:     { value: params.animSpeed },
    uShadowSoftness:{ value: params.shadowSoftness },
    uShapeMode:     { value: 1 },
  },
  depthTest: false,
  depthWrite: false,
})

const quad = new THREE.Mesh(geo, mat)
const scene = new THREE.Scene()
scene.add(quad)

// ============ GUI ============
const gui = new GUI()
gui.add(params, 'animSpeed', 0, 3, 0.1).name('动画速度')
gui.add(params, 'shadowSoftness', 1, 32, 0.5).name('阴影柔度')
gui.add(params, 'shapeCount', { '简洁': 'simple', '中等': 'medium', '复杂': 'complex' })
  .name('场景规模')
  .onChange(v => {
    mat.uniforms.uShapeMode.value = v === 'simple' ? 0 : v === 'medium' ? 1 : 2
  })

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  controls.update()

  const elapsed = clock.getElapsedTime()
  mat.uniforms.uTime.value = elapsed
  mat.uniforms.uAnimSpeed.value = params.animSpeed
  mat.uniforms.uShadowSoftness.value = params.shadowSoftness
  mat.uniforms.uResolution.value.set(innerWidth, innerHeight)

  // 将透视相机位置和矩阵传入 shader
  perspCamera.updateMatrixWorld()
  mat.uniforms.uCameraPos.value.copy(perspCamera.position)
  mat.uniforms.uCameraMatrix.value.copy(perspCamera.matrixWorld)

  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  perspCamera.aspect = innerWidth / innerHeight
  perspCamera.updateProjectionMatrix()
  mat.uniforms.uResolution.value.set(innerWidth, innerHeight)
})