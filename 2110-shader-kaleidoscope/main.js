// 2110. Shader Kaleidoscope
// 着色器万花筒效果
import * as THREE from 'three'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000)
camera.position.z = 5
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

// 万花筒参数
let segments = 8
let symmetryOffset = 0

// 主着色器材质
const mainMat = new THREE.ShaderMaterial({
  uniforms: { 
    uTime: { value: 0 }, 
    uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    uSegments: { value: segments },
    uSymOffset: { value: symmetryOffset }
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
    uniform float uSegments;
    uniform float uSymOffset;
    varying vec2 vUv;
    
    #define PI 3.14159265359
    
    vec2 kaleido(vec2 uv, float segments, float offset) {
      float angle = atan(uv.y, uv.x) + offset;
      float radius = length(uv);
      float segmentAngle = PI * 2.0 / segments;
      angle = mod(angle, segmentAngle);
      angle = abs(angle - segmentAngle * 0.5);
      return vec2(cos(angle), sin(angle)) * radius;
    }
    
    float pattern(vec2 p, float t) {
      float result = 0.0;
      
      // 多层旋转图案
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float speed = 0.3 + fi * 0.1;
        float size = 1.0 + fi * 0.5;
        
        vec2 offset = vec2(
          sin(t * speed + fi * 1.7) * 0.5,
          cos(t * speed * 1.3 + fi * 2.3) * 0.5
        );
        
        float d = length(p - offset);
        result += sin(d * size * 10.0 - t * speed * 5.0) * 0.5 + 0.5;
        result *= 0.7;
      }
      
      // 网格扭曲
      vec2 grid = abs(fract(p * 3.0) - 0.5);
      float gridLine = smoothstep(0.45, 0.5, max(grid.x, grid.y));
      result = mix(result, 1.0, gridLine * 0.3);
      
      // 圆形波纹
      float ripple = sin(length(p) * 15.0 - t * 3.0) * 0.5 + 0.5;
      ripple = pow(ripple, 2.0);
      result = mix(result, ripple, 0.2);
      
      return result;
    }
    
    vec3 palette(float t) {
      vec3 a = vec3(0.5, 0.3, 0.4);
      vec3 b = vec3(0.5, 0.5, 0.4);
      vec3 c = vec3(1.0, 1.0, 0.8);
      vec3 d = vec3(0.0, 0.15, 0.3);
      return a + b * cos(PI * 2.0 * (c * t + d));
    }
    
    void main() {
      vec2 uv = (vUv - 0.5) * 2.0;
      uv.x *= uResolution.x / uResolution.y;
      
      // 应用万花筒变换
      vec2 kuv = kaleido(uv, uSegments, uSymOffset);
      
      // 生成图案
      float p = pattern(kuv * 2.0, uTime);
      
      // 颜色映射
      vec3 color1 = palette(p + uTime * 0.1);
      vec3 color2 = palette(p * 0.7 + 0.5 + uTime * 0.05);
      vec3 color3 = palette(p * 1.3 + 0.3 + uTime * 0.08);
      
      vec3 finalColor = mix(color1, color2, sin(p * PI + uTime) * 0.5 + 0.5);
      finalColor = mix(finalColor, color3, cos(p * PI * 0.5 + uTime * 0.5) * 0.5 + 0.5);
      
      // 边缘光晕
      float vignette =