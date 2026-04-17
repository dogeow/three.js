// 3212 - 蜡烛 SSS 次表面散射
// 模拟半透明蜡烛材质的次表面散射效果（Subsurface Scattering）
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a0a05)
scene.add(new THREE.AmbientLight(0xff6633, 0.3))
const dir = new THREE.DirectionalLight(0xffaa77, 1.5)
dir.position.set(5, 8, 5)
scene.add(dir)
const back = new THREE.PointLight(0xff4400, 2.0, 30)
back.position.set(-4, 2, -4)
scene.add(back)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 5, 18)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// SSS ShaderMaterial
const sssMat = new THREE.ShaderMaterial({
  uniforms: {
    uLightPos: { value: dir.position },
    uLightColor: { value: new THREE.Color(0xffaa77) },
    uBackLightPos: { value: back.position },
    uBackLightColor: { value: new THREE.Color(0xff4400) },
    uSSSColor: { value: new THREE.Color(0xff8822) },
    uSSSStrength: { value: 0.8 },
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vViewDir = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform vec3 uLightPos;
    uniform vec3 uLightColor;
    uniform vec3 uBackLightPos;
    uniform vec3 uBackLightColor;
    uniform vec3 uSSSColor;
    uniform float uSSSStrength;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewDir;

    float sss(vec3 L, vec3 V, vec3 N, float power) {
      vec3 H = normalize(L + V * 0.2);
      return pow(max(0.0, dot(V, -H)), power) * max(0.0, dot(N, L));
    }

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewDir);

      // Front light
      vec3 L1 = normalize(uLightPos - vWorldPos);
      float diff1 = max(0.0, dot(N, L1));
      vec3 H1 = normalize(L1 + V);
      float spec1 = pow(max(0.0, dot(N, H1)), 64.0);
      float sss1 = sss(L1, V, N, 3.0);

      // Back light
      vec3 L2 = normalize(uBackLightPos - vWorldPos);
      float diff2 = max(0.0, dot(N, L2)) * 0.3;
      float sss2 = sss(L2, V, N, 2.0);

      // SSS wrap
      vec3 sssWrap = uSSSColor * (sss1 + sss2) * uSSSStrength;

      // Ambient
      vec3 ambient = vec3(0.08, 0.03, 0.02);

      // Fresnel rim
      float fresnel = pow(1.0 - max(0.0, dot(V, N)), 3.0);
      vec3 rim = vec3(1.0, 0.6, 0.3) * fresnel * 0.5;

      vec3 col = ambient
        + uLightColor * (diff1 * 0.5 + spec1 * 0.8)
        + uBackLightColor * diff2
        + sssWrap
        + rim;

      gl_FragColor = vec4(col, 1.0);
    }
  `
})

// Candle body
const candleGroup = new THREE.Group()
scene.add(candleGroup)
const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 5, 32), sssMat)
body.position.y = 0
candleGroup.add(body)

// Drip blobs
for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2
  const r = 1.3 + Math.random() * 0.3
  const h = 1 + Math.random() * 3
  const drip = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 12, 12), sssMat)
  drip.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r)
  drip.scale.y = 1.5 + Math.random()
  candleGroup.add(drip)
}

// Wick
const wickMat = new THREE.MeshBasicMaterial({ color: 0x222222 })
const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), wickMat)
wick.position.y = 2.75
candleGroup.add(wick)

// Flame glow
const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 })
const flame = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), flameMat)
flame.position.y = 3.0
flame.scale.y = 1.5
candleGroup.add(flame)

const info = document.createElement('div')
info.style.cssText = 'position:fixed;top:16px;left:16px;color:#ffaa77;font-family:"Segoe UI",system-ui,sans-serif;font-size:13px;line-height:1.7;background:rgba(26,10,5,0.88);padding:14px 18px;border-radius:10px;max-width:320px;backdrop-filter:blur(8px);border:1px solid rgba(255,136,34,0.2);box-shadow:0 4px 20px rgba(255,68,0,0.1)'
info.innerHTML = `
  <b style="font-size:15px;color:#ff8822;display:block;margin-bottom:6px;border-bottom:1px solid rgba(255,136,34,0.2);padding-bottom:6px">蜡烛 SSS 次表面散射</b>
  模拟半透明蜡烛材质的光线透射效果（<b style="color:#ff8822">Subsurface Scattering</b>），光线穿过蜡油产生柔和的内部光晕。
  <ul style="margin:6px 0 0;padding-left:16px;color:#cc9977">
    <li>自定义 GLSL 着色器实现次表面散射近似</li>
    <li>背面点光源模拟蜡烛内部透光</li>
    <li>菲涅尔边缘光增强半透明感</li>
    <li>烛芯 + 摇曳火焰动画</li>
  </ul>
  <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,136,34,0.15);font-size:12px;color:#aa7755">
    拖拽旋转视角 · 滚轮缩放
  </div>
`
document.body.appendChild(info)

let t = 0
function animate() {
  requestAnimationFrame(animate)
  t += 0.016
  sssMat.uniforms.uTime.value = t
  flame.material.opacity = 0.8 + 0.2 * Math.sin(t * 8)
  flame.scale.y = 1.5 + 0.3 * Math.sin(t * 6)
  flame.scale.x = flame.scale.z = 1 + 0.15 * Math.sin(t * 9)
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
