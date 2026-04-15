// 2144. 着色器水面
// 着色器实现的流体水面 - 增强版
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1525)

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 1000)
camera.position.set(0, 18, 35)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minDistance = 10
controls.maxDistance = 100
controls.maxPolarAngle = Math.PI / 2.1

// 鼠标
const mouse = new THREE.Vector2()
const targetMouse = new THREE.Vector2()
window.addEventListener('mousemove', (e) => {
  targetMouse.x = (e.clientX / innerWidth) * 2 - 1
  targetMouse.y = -(e.clientY / innerHeight) * 2 + 1
})

// 水面着色器
const waterShader = {
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uCameraPos: { value: camera.position.clone() }
  },
  vertexShader: `
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // 多层波浪
      float wave1 = sin(pos.x * 0.3 + uTime * 0.8) * 0.4;
      float wave2 = sin(pos.z * 0.4 + uTime * 1.2) * 0.3;
      float wave3 = sin((pos.x + pos.z) * 0.2 + uTime * 0.6) * 0.5;
      float wave4 = cos(pos.x * 0.5 - pos.z * 0.3 + uTime * 1.0) * 0.2;
      pos.y += wave1 + wave2 + wave3 + wave4;
      
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;
      
      // 计算法线
      float eps = 0.5;
      float hL = sin((pos.x - eps) * 0.3 + uTime * 0.8) * 0.4 + sin(pos.z * 0.4 + uTime * 1.2) * 0.3;
      float hR = sin((pos.x + eps) * 0.3 + uTime * 0.8) * 0.4 + sin(pos.z * 0.4 + uTime * 1.2) * 0.3;
      float hD = sin(pos.x * 0.3 + uTime * 0.8) * 0.4 + sin((pos.z - eps) * 0.4 + uTime * 1.2) * 0.3;
      float hU = sin(pos.x * 0.3 + uTime * 0.8) * 0.4 + sin((pos.z + eps) * 0.4 + uTime * 1.2) * 0.3;
      vNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
      
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform vec3 uCameraPos;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    #define PI 3.14159265359
    
    // 噪声函数
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }
    
    float fbm(vec2 p) {
      float f = 0.0;
      f += 0.500 * noise(p); p *= 2.02;
      f += 0.250 * noise(p); p *= 2.03;
      f += 0.125 * noise(p); p *= 2.01;
      f += 0.063 * noise(p);
      return f;
    }
    
    void main() {
      vec3 viewDir = normalize(uCameraPos - vWorldPos);
      vec3 normal = normalize(vNormal);
      
      // 菲涅尔
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
      fresnel = mix(0.1, 1.0, fresnel);
      
      // 水的深度颜色
      vec3 deepColor = vec3(0.02, 0.08, 0.15);
      vec3 shallowColor = vec3(0.1, 0.3, 0.4);
      
      // 焦散
      vec2 causticUV = vWorldPos.xz * 0.15;
      float caustic = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 p1 = causticUV + vec2(sin(uTime * 0.5 + fi), cos(uTime * 0.3 + fi * 1.5)) * 2.0;
        vec2 p2 = causticUV + vec2(cos(uTime * 0.4 + fi * 2.0), sin(uTime * 0.6 + fi)) * 2.0;
        caustic += sin(length(p1) * 8.0 + uTime) * 0.3 + 0.5;
        caustic += sin(length(p2) * 6.0 + uTime * 1.3) * 0.3 + 0.5;
      }
      caustic = caustic / 6.0;
      
      // 泡沫
      float foam = smoothstep(0.6, 0.9, fbm(vWorldPos.xz * 0.3 + uTime * 0.2));
      foam *= smoothstep(0.0, 0.3, normal.y);
      
      // 反射（简化环境）
      vec3 reflectDir = reflect(-viewDir, normal);
      vec3 skyColor = mix(vec3(0.3, 0.5, 0.7), vec3(0.1, 0.2, 0.4), reflectDir.y * 0.5 + 0.5);
      
      // 合成水面颜色
      float depth = fbm(vWorldPos.xz * 0.05 + uTime * 0.1) * 0.5 + 0.5;
      vec3 waterColor = mix(deepColor, shallowColor, depth);
      waterColor += caustic * vec3(0.05, 0.1, 0.15);
      
      // 混合反射和水色
      vec3 finalColor = mix(waterColor, skyColor, fresnel * 0.7);
      
      // 高光
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float spec = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 64.0);
      finalColor += spec * vec3(0.8, 0.9, 1.0) * 0.5;
      
      // 泡沫颜色
      finalColor = mix(finalColor, vec3(0.9, 0.95, 1.0), foam * 0.5);
      
      // 焦散光斑
      finalColor += vec3(0.02, 0.05, 0.08) * caustic;
      
      // 距离雾
      float dist = length(vWorldPos - uCameraPos);
      float fog = 1.0 - exp(-dist * 0.015);
      finalColor = mix(finalColor, vec3(0.05, 0.1, 0.2), fog);
      
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `
}

// 水面
const waterGeo = new THREE.PlaneGeometry(100, 100, 128, 128)
waterGeo.rotateX(-Math.PI / 2)
const waterMat = new THREE.ShaderMaterial(waterShader)
const water = new THREE.Mesh(waterGeo, waterMat)
scene.add(water)

// 海底
const seabedGeo = new THREE.PlaneGeometry(200, 200)
seabedGeo.rotateX(-Math.PI / 2)
const seabedMat = new THREE.MeshStandardMaterial({
  color: 0x0a1525,
  roughness: 1.0
})
const seabed = new THREE.Mesh(seabedGeo, seabedMat)
seabed.position.y = -5
scene.add(seabed)

// 环境元素 - 水下植物
const plantGroup = new THREE.Group()
for (let i = 0; i < 30; i++) {
  const plantGeo = new THREE.ConeGeometry(0.2 + Math.random() * 0.3, 2 + Math.random() * 3, 6)
  const plantMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.6, 0.3),
    transparent: true,
    opacity: 0.7
  })
  const plant = new THREE.Mesh(plantGeo, plantMat)
  const angle = Math.random() * Math.PI * 2
  const radius = 10 + Math.random() * 35
  plant.position.set(
    Math.cos(angle) * radius,
    -3 + Math.random() * 2,
    Math.sin(angle) * radius
  )
  plant.rotation.x = Math.PI + (Math.random() - 0.5) * 0.3
  plant.rotation.z = (Math.random() - 0.5) * 0.3
  plantGroup.add(plant)
}
scene.add(plantGroup)

// 灯光
scene.add(new THREE.AmbientLight(0x334466, 0.5))
const sun = new THREE.DirectionalLight(0x88aacc, 0.8)
sun.position.set(50, 100, 50)
scene.add(sun)
const underwaterLight = new THREE.PointLight(0x0066aa, 0.3, 50)
underwaterLight.position.set(0, -2, 0)
scene.add(underwaterLight)

// 鱼群
const fishGeo = new THREE.ConeGeometry(0.3, 1, 4)
fishGeo.rotateX(Math.PI / 2)
const fishMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.7 })
const fishes = []
for (let i = 0; i < 20; i++) {
  const fish = new THREE.Mesh(fishGeo, fishMat)
  fish.position.set(
    (Math.random() - 0.5) * 60,
    Math.random() * 8 - 2,
    (Math.random() - 0.5) * 60
  )
  fish.scale.setScalar(0.5 + Math.random() * 0.5)
  fishes.push(fish)
  scene.add(fish)
}

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  mouse.lerp(targetMouse, 0.05)
  
  waterMat.uniforms.uTime.value = t
  waterMat.uniforms.uMouse.value.lerp(mouse, 0.1)
  waterMat.uniforms.uCameraPos.value.copy(camera.position)
  
  // 植物摇曳
  plantGroup.children.forEach((plant, i) => {
    plant.rotation.x = Math.PI + Math.sin(t * 0.5 + i * 0.5) * 0.2
  })
  
  // 鱼群移动
  fishes.forEach((fish, i) => {
    fish.position.x += Math.sin(t * 0.5 + i) * 0.1
    fish.position.z += Math.cos(t * 0.3 + i * 0.7) * 0.1
    fish.rotation.y = Math.atan2(
      Math.cos(t * 0.5 + i),
      Math.sin(t * 0.3 + i * 0.7)
    )
    
    if (fish.position.x > 50) fish.position.x = -50
    if (fish.position.x < -50) fish.position.x = 50
    if (fish.position.z > 50) fish.position.z = -50
    if (fish.position.z < -50) fish.position.z = 50
  })
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  waterMat.uniforms.uResolution.value.set(innerWidth, innerHeight)
})
