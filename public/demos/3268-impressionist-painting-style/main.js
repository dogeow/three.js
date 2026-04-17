// 3268. Impressionist Painting Style
// NPR post-processing - turn 3D scene into impressionist oil painting with visible brush strokes
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x8b7355)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 8, 25)
camera.lookAt(0, 2, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.4

// Impressionist Shader
const ImpressionistShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    uBrushSize: { value: 4.0 },
    uPaintThreshold: { value: 0.03 },
    uColorVariation: { value: 0.15 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uBrushSize;
    uniform float uPaintThreshold;
    uniform float uColorVariation;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 texel = 1.0 / uResolution;

      // Brush stroke direction - radial from center
      vec2 fromCenter = uv - 0.5;
      float angle = atan(fromCenter.y, fromCenter.x);
      vec2 brushDir = vec2(cos(angle), sin(angle));

      // Layered brush strokes at different scales
      float brush = 0.0;
      vec3 accumColor = vec3(0.0);
      float totalWeight = 0.0;

      for (int layer = 0; layer < 3; layer++) {
        float layerScale = 1.0 + float(layer) * 1.5;
        float bs = uBrushSize * layerScale * texel.x;

        // Sample with offset along brush direction
        for (int s = -2; s <= 2; s++) {
          float offset = float(s) * bs * 0.5;
          vec2 sampleUv = uv + brushDir * offset;
          sampleUv += vec2(hash(sampleUv * 50.0 + float(layer) * 100.0) - 0.5,
                          hash(sampleUv * 70.0 + float(layer) * 200.0) - 0.5) * bs * 0.3;
          sampleUv = clamp(sampleUv, 0.001, 0.999);
          vec3 col = texture2D(tDiffuse, sampleUv).rgb;

          // Slight color variation per stroke
          float hVar = (hash(sampleUv * 30.0 + uTime * 0.1) - 0.5) * uColorVariation;
          vec3 hsv = rgb2hsv(col);
          hsv.x = fract(hsv.x + hVar);
          col = hsv2rgb(hsv);

          float weight = 1.0 - abs(float(s)) / 3.0;
          accumColor += col * weight;
          totalWeight += weight;
        }
      }

      accumColor /= totalWeight;

      // Mix with original based on edge detection
      vec3 original = texture2D(tDiffuse, uv).rgb;
      float lumCenter = dot(original, vec3(0.299, 0.587, 0.114));
      float lumRight = dot(texture2D(tDiffuse, uv + vec2(texel.x * 2.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float lumUp = dot(texture2D(tDiffuse, uv + vec2(0.0, texel.y * 2.0)).rgb, vec3(0.299, 0.587, 0.114));
      float edge = abs(lumRight - lumCenter) + abs(lumUp - lumCenter);

      vec3 finalColor = mix(accumColor, original, smoothstep(uPaintThreshold, uPaintThreshold * 3.0, edge));

      // Warm impressionist palette shift
      vec3 warmShift = vec3(1.05, 1.0, 0.92);
      finalColor *= warmShift;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
}

// Scene content - Monet-like water lilies and pond
// Water surface
const waterGeo = new THREE.PlaneGeometry(60, 60, 64, 64)
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x336688,
  roughness: 0.1,
  metalness: 0.3,
  transparent: true,
  opacity: 0.9,
})
const water = new THREE.Mesh(waterGeo, waterMat)
water.rotation.x = -Math.PI / 2
water.position.y = 0
scene.add(water)

// Lily pads
const lilyMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8, side: THREE.DoubleSide })
const lilyFlowerMat = new THREE.MeshStandardMaterial({ color: 0xffaacc, roughness: 0.6, emissive: 0x331122 })

const lilyPads = []
for (let i = 0; i < 18; i++) {
  const angle = Math.random() * Math.PI * 2
  const r = 2 + Math.random() * 14
  const lilyGeo = new THREE.CircleGeometry(0.5 + Math.random() * 0.5, 12)
  const lily = new THREE.Mesh(lilyGeo, lilyMat.clone())
  lily.rotation.x = -Math.PI / 2
  lily.position.set(Math.cos(angle) * r, 0.05, Math.sin(angle) * r)
  lily.rotation.z = Math.random() * Math.PI * 2
  lilyPads.push(lily)
  scene.add(lily)

  // Flower on some pads
  if (Math.random() > 0.5) {
    const flowerGeo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 8, 8)
    const flowerColor = Math.random() > 0.5 ? 0xffaacc : 0xffffaa
    const flower = new THREE.Mesh(flowerGeo, new THREE.MeshStandardMaterial({ color: flowerColor, roughness: 0.5, emissive: 0x221111 }))
    flower.position.copy(lily.position)
    flower.position.y += 0.2
    scene.add(flower)
  }
}

// Trees in background
const treeMat = new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 0.9 })
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 })
for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2
  const r = 22 + Math.random() * 5
  const treeGroup = new THREE.Group()
  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 8)
  const trunk = new THREE.Mesh(trunkGeo, trunkMat)
  trunk.position.y = 2
  treeGroup.add(trunk)
  // Foliage
  const foliageGeo = new THREE.SphereGeometry(2 + Math.random(), 8, 8)
  const foliage = new THREE.Mesh(foliageGeo, treeMat.clone())
  foliage.position.y = 5
  treeGroup.add(foliage)
  treeGroup.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r)
  treeGroup.rotation.y = Math.random() * Math.PI
  scene.add(treeGroup)
}

// Weeping willow branches
const willowMat = new THREE.MeshStandardMaterial({ color: 0x557755, roughness: 0.8, side: THREE.DoubleSide })
for (let i = 0; i < 6; i++) {
  const angle = Math.random() * Math.PI * 2
  const r = 16 + Math.random() * 4
  const willowGeo = new THREE.PlaneGeometry(0.3, 4, 1, 8)
  const willow = new THREE.Mesh(willowGeo, willowMat.clone())
  willow.position.set(Math.cos(angle) * r, 4, Math.sin(angle) * r)
  willow.rotation.x = Math.PI * 0.1
  willow.rotation.y = Math.random() * Math.PI
  willow.rotation.z = Math.PI * 0.05
  scene.add(willow)
}

// Bridge
const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 })
const bridgeGeo = new THREE.TorusGeometry(5, 0.4, 8, 24, Math.PI)
const bridge = new THREE.Mesh(bridgeGeo, bridgeMat)
bridge.position.set(-8, 3, 0)
bridge.rotation.z = Math.PI
bridge.rotation.y = Math.PI / 2
scene.add(bridge)

// Lighting
const ambientLight = new THREE.AmbientLight(0xffeecc, 0.6)
scene.add(ambientLight)
const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2)
sunLight.position.set(10, 20, 10)
scene.add(sunLight)
const fillLight = new THREE.PointLight(0xaaccff, 0.4, 50)
fillLight.position.set(-10, 10, -10)
scene.add(fillLight)

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const impressionistPass = new ShaderPass(ImpressionistShader)
composer.addPass(impressionistPass)

// lil-gui controls
const gui = document.createElement('div')
gui.style.cssText = 'position:fixed;top:10px;left:10px;z-index:100;'
document.body.appendChild(gui)

function makeSlider(label, min, max, val, cb) {
  const div = document.createElement('div')
  div.style.cssText = 'margin:4px 0;color:#fff;font-family:monospace;font-size:12px;'
  div.innerHTML = `<label>${label}: <span>${val.toFixed(1)}</span></label><br>`
  const input = document.createElement('input')
  input.type = 'range'
  input.min = min; input.max = max; input.step = 0.1; input.value = val
  input.style.cssText = 'width:120px'
  input.oninput = () => { div.querySelector('span').textContent = parseFloat(input.value).toFixed(1); cb(parseFloat(input.value)) }
  div.appendChild(input)
  gui.appendChild(div)
}

makeSlider('Brush Size', 1, 10, 4.0, v => impressionistPass.uniforms.uBrushSize.value = v)
makeSlider('Paint Threshold', 0.01, 0.15, 0.03, v => impressionistPass.uniforms.uPaintThreshold.value = v)
makeSlider('Color Variation', 0, 0.4, 0.15, v => impressionistPass.uniforms.uColorVariation.value = v)

function animate() {
  requestAnimationFrame(animate)
  const time = performance.now() / 1000
  impressionistPass.uniforms.uTime.value = time

  // Water ripple
  const pos = water.geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const y = Math.sin(x * 0.3 + time * 0.8) * 0.15 + Math.sin(z * 0.4 + time * 0.6) * 0.1
    pos.setY(i, y)
  }
  pos.needsUpdate = true
  water.geometry.computeVertexNormals()

  // Gentle lily movement
  lilyPads.forEach((lily, i) => {
    lily.position.y = 0.05 + Math.sin(time * 0.5 + i) * 0.03
    lily.rotation.z += 0.001
  })

  controls.update()
  composer.render()
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  impressionistPass.uniforms.uResolution.value.set(innerWidth, innerHeight)
})
