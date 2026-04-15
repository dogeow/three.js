// 2150. SDF Spheres
// 有符号距离场球体 - 增强版
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020208)

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 5, 25)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minDistance = 10
controls.maxDistance = 80

// 鼠标
const mouse = new THREE.Vector2()
window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
})

// 全屏着色器平面
const quadGeo = new THREE.PlaneGeometry(2, 2)
const quadMat = new THREE.ShaderMaterial({
  uniforms: {
    uCamPos: { value: camera.position.clone() },
    uCamMatrix: { value: camera.matrixWorld.clone() },
    uCamProjInv: { value: camera.projectionMatrixInverse.clone() },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    uMouse: { value: new THREE.Vector2(0, 0) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uCamPos;
    uniform mat4 uCamMatrix;
    uniform mat4 uCamProjInv;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    varying vec2 vUv;
    
    #define MAX_STEPS 120
    #define MAX_DIST 80.0
    #define SURF_DIST 0.001
    #define PI 3.14159265359
    
    // 平滑最小值
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }
    
    // 有符号距离函数
    float sdSphere(vec3 p, float r) {
      return length(p) - r;
    }
    
    float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }
    
    float sdTorus(vec3 p, vec2 t) {
      vec2 q = vec2(length(p.xz) - t.x, p.y);
      return length(q) - t.y;
    }
    
    // 场景
    float sceneSDF(vec3 p) {
      float t = uTime * 0.4;
      
      // 动态球体1
      vec3 s1Pos = vec3(sin(t) * 4.0, cos(t * 0.7) * 2.0, sin(t * 1.3) * 3.0);
      float s1 = sdSphere(p - s1Pos, 2.5);
      
      // 动态球体2
      vec3 s2Pos = vec3(cos(t * 0.8) * 3.0, sin(t * 1.1) * 3.0, cos(t * 0.6) * 4.0);
      float s2 = sdSphere(p - s2Pos, 1.8);
      
      // 环形
      vec3 torusPos = p - vec3(0.0, sin(t * 0.5) * 2.0, 0.0);
      float torus = sdTorus(torusPos, vec2(5.0 + sin(t) * 1.0, 0.4));
      
      // 中心盒
      float box = sdBox(p - vec3(0.0, 0.0, 0.0), vec3(1.5 + sin(t * 2) * 0.3));
      
      // 地面
      float ground = p.y + 5.0;
      
      // 组合
      float d = smin(s1, s2, 1.5);
      d = smin(d, torus, 0.8);
      d = smin(d, box, 1.0);
      d = min(d, ground);
      
      return d;
    }
    
    // 法线计算
    vec3 calcNormal(vec3 p) {
      const float eps = 0.001;
      return normalize(vec3(
        sceneSDF(p + vec3(eps, 0, 0)) - sceneSDF(p - vec3(eps, 0, 0)),
        sceneSDF(p + vec3(0, eps, 0)) - sceneSDF(p - vec3(0, eps, 0)),
        sceneSDF(p + vec3(0, 0, eps)) - sceneSDF(p - vec3(0, 0, eps))
      ));
    }
    
    // 软阴影
    float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
      float res = 1.0;
      float t = mint;
      for (int i = 0; i < 24; i++) {
        if (t > maxt) break;
        float h = sceneSDF(ro + rd * t);
        if (h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t += h;
      }
      return res;
    }
    
    // AO
    float calcAO(vec3 p, vec3 n) {
      float occ = 0.0;
      float sca = 1.0;
      for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.12 * float(i);
        float d = sceneSDF(p + h * n);
        occ += (h - d) * sca;
        sca *= 0.95;
      }
      return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
    }
    
    // 材质
    vec3 getMaterial(vec3 p, vec3 n) {
      float t = uTime * 0.3;
      float pattern = sin(p.x * 3.0 + t) * sin(p.y * 3.0 + t) * sin(p.z * 3.0 + t);
      pattern = pattern * 0.5 + 0.5;
      
      vec3 col1 = vec3(0.1, 0.4, 0.8);
      vec3 col2 = vec3(0.8, 0.2, 0.4);
      vec3 col3 = vec3(0.2, 0.8, 0.5);
      
      vec3 matCol = mix(col1, col2, smoothstep(-0.3, 0.3, pattern));
      matCol = mix(matCol, col3, smoothstep(0.0, 0.8, length(p) / 10.0));
      
      return matCol;
    }
    
    void main() {
      vec2 uv = (vUv - 0.5) * 2.0;
      uv.x *= uResolution.x / uResolution.y;
      
      // 鼠标影响
      vec3 ro = uCamPos;
      vec3 rd = normalize(vec3(uv, -1.8));
      
      // 旋转视角
      float angle = uTime * 0.1 + uMouse.x * 0.5;
      mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      rd.xz = rot * rd.xz;
      
      // 光线步进
      float t = 0.0;
      vec3 col = vec3(0.0);
      
      for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);
        if (d < SURF_DIST || t > MAX_DIST) break;
        t += d * 0.8;
      }
      
      if (t < MAX_DIST) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        vec3 matCol = getMaterial(p, n);
        
        // 光照
        vec3 lightPos = vec3(10.0, 15.0, 10.0);
        vec3 lightDir = normalize(lightPos - p);
        
        float diff = max(dot(n, lightDir), 0.0);
        float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);
        float ao = calcAO(p, n);
        float shadow = softShadow(p + n * 0.01, lightDir, 0.02, 20.0, 8.0);
        
        // 环境光
        vec3 ambient = vec3(0.05, 0.08, 0.15);
        
        col = matCol * (ambient + diff * shadow * vec3(1.0, 0.95, 0.9)) 
            + spec * shadow * vec3(0.5, 0.6, 0.8) * 0.5;
        col *= ao;
        
        // 距离雾
        float fog = 1.0 - exp(-t * 0.04);
        col = mix(col, vec3(0.01, 0.01, 0.03), fog);
      } else {
        // 背景渐变
        col = mix(vec3(0.02, 0.01, 0.05), vec3(0.0), length(uv) * 0.5);
        
        // 星空
        float stars = fract(sin(dot(uv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
        if (stars > 0.995) col += (stars - 0.995) * 200.0;
      }
      
      // 色调映射
      col = col / (col + vec3(1.0));
      col = pow(col, vec3(0.85));
      
      // 辉光
      col += vec3(0.02, 0.01, 0.04);
      
      gl_FragColor = vec4(col, 1.0);
    }
  `
})
const quad = new THREE.Mesh(quadGeo, quadMat)
scene.add(quad)

// 辅助：显示核心球体（参考）
const helperGeo = new THREE.IcosahedronGeometry(1, 2)
const helperMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, opacity: 0.1 })
const helper = new THREE.Mesh(helperGeo, helperMat)
helper.position.set(0, 0, 0)
scene.add(helper)

// 辅助线环
const ringGeo = new THREE.TorusGeometry(5, 0.05, 8, 64)
const ringMat = new THREE.MeshBasicMaterial({ color: 0x4400ff, opacity: 0.2, transparent: true })
const ringHelper = new THREE.Mesh(ringGeo, ringMat)
ringHelper.rotation.x = Math.PI / 2
scene.add(ringHelper)

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  // 更新uniforms
  quadMat.uniforms.uCamPos.value.copy(camera.position)
  quadMat.uniforms.uCamMatrix.value.copy(camera.matrixWorld)
  quadMat.uniforms.uTime.value = t
  quadMat.uniforms.uMouse.value.lerp(mouse, 0.1)
  
  // 辅助物体动画
  helper.rotation.y = t * 0.5
  ringHelper.rotation.z = t * 0.2
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  quadMat.uniforms.uResolution.value.set(innerWidth, innerHeight)
})
