// 2934. Liquid Metal Morph
// Noise-driven morphing with metallic PBR and surface tension
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100)
camera.position.set(0, 0, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)

scene.add(new THREE.AmbientLight(0x111122, 1.0))
const keyLight = new THREE.DirectionalLight(0xffffff, 2.0)
keyLight.position.set(5, 8, 5)
scene.add(keyLight)
const fillLight = new THREE.DirectionalLight(0x4466ff, 1.0)
fillLight.position.set(-5, -2, 3)
scene.add(fillLight)
const rimLight = new THREE.DirectionalLight(0xff4488, 0.8)
rimLight.position.set(0, -5, -5)
scene.add(rimLight)

// Environment map for reflections (procedural)
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256)
const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget)
scene.add(cubeCamera)

// Main blob geometry with vertex animation
const SEG = 128
const blobGeo = new THREE.SphereGeometry(2, SEG, SEG)
const origPositions = blobGeo.attributes.position.array.slice()
const origNormals = blobGeo.attributes.normal.array.slice()
const noiseOffsets = new Float32Array(origPositions.length / 3)

for (let i = 0; i < noiseOffsets.length; i++) {
  noiseOffsets[i] = Math.random() * 100
}

// Custom shader for liquid metal
const blobMat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    envMap: { value: cubeRenderTarget.texture }
  },
  vertexShader: `
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewPos;

    // Simplex noise functions
    vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289v4(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289v4(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289v3(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec3 pos = position;
      float n1 = snoise(pos * 0.8 + time * 0.3);
      float n2 = snoise(pos * 1.5 + time * 0.5 + 10.0);
      float n3 = snoise(pos * 2.5 - time * 0.4 + 20.0);
      float displacement = n1 * 0.35 + n2 * 0.15 + n3 * 0.08;

      vec3 newPos = pos + normal * displacement;
      vNormal = normalMatrix * normalize(newPos);
      vec4 mvPos = modelViewMatrix * vec4(newPos, 1.0);
      vViewPos = -mvPos.xyz;
      vWorldPos = (modelMatrix * vec4(newPos, 1.0)).xyz;
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    uniform samplerCube envMap;
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewPos;

    void main() {
      vec3 viewDir = normalize(vViewPos);
      vec3 normal = normalize(vNormal);

      // Fresnel
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);

      // Environment reflection
      vec3 reflectDir = reflect(-viewDir, normal);
      vec4 envColor = textureCube(envMap, reflectDir);

      // Metallic base color - chrome/silver with iridescent tint
      vec3 baseColor = vec3(0.85, 0.88, 0.92);
      float iri = sin(dot(normal, viewDir) * 6.28 + time) * 0.5 + 0.5;
      baseColor += vec3(iri * 0.05, iri * 0.02, iri * 0.08);

      // Specular highlight
      vec3 lightDir = normalize(vec3(5.0, 8.0, 5.0));
      float spec = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 128.0);

      vec3 color = mix(baseColor, envColor.rgb, fresnel * 0.6 + 0.3);
      color += vec3(1.0, 0.95, 0.9) * spec * 2.0;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.FrontSide
})

const blob = new THREE.Mesh(blobGeo, blobMat)
scene.add(blob)

// Background environment spheres
const envGeo = new THREE.SphereGeometry(40, 16, 16)
const envMat = new THREE.MeshBasicMaterial({
  side: THREE.BackSide,
  color: 0x0a0a15
})
scene.add(new THREE.Mesh(envGeo, envMat))

// Floating reflective spheres
const floatSpheres = []
for (let i = 0; i < 6; i++) {
  const r = 0.1 + Math.random() * 0.3
  const sGeo = new THREE.SphereGeometry(r, 16, 16)
  const sMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.3, 0.5),
    metalness: 0.9,
    roughness: 0.1,
    envMap: cubeRenderTarget.texture
  })
  const s = new THREE.Mesh(sGeo, sMat)
  s.userData = {
    theta: Math.random() * Math.PI * 2,
    phi: Math.random() * Math.PI,
    radius: 4 + Math.random() * 3,
    speed: 0.2 + Math.random() * 0.3
  }
  scene.add(s)
  floatSpheres.push(s)
}

let time = 0
function animate() {
  requestAnimationFrame(animate)
  time += 0.016

  blobMat.uniforms.time.value = time

  // Animate floating spheres
  floatSpheres.forEach(s => {
    const d = s.userData
    d.theta += d.speed * 0.01
    s.position.set(
      Math.sin(d.theta) * Math.cos(d.phi) * d.radius,
      Math.sin(d.phi) * d.radius * 0.5 + Math.sin(time * d.speed + d.theta) * 0.3,
      Math.cos(d.theta) * Math.cos(d.phi) * d.radius
    )
  })

  // Slow rotation of main blob
  blob.rotation.y = time * 0.1
  blob.rotation.x = Math.sin(time * 0.07) * 0.2

  cubeCamera.position.copy(blob.position)
  cubeCamera.update(renderer, scene)

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
