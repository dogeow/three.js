// 3363. Confocal Microscopy Volume — volumetric stack visualization
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm'

const SLICES = 32
const SLICE_RES = 128

// Generate synthetic volumetric data
// Two spherical "cells" at different depths, green fluorescent + blue structural
function generateVolume() {
  const data = new Uint8Array(SLICES * SLICE_RES * SLICE_RES * 4) // RGBA: R=green, G=blue, B=alpha, A unused
  
  // Cell 1: center at (0.5, 0.5, 0.3), radius 0.12
  // Cell 2: center at (-0.3, -0.2, 0.65), radius 0.1
  const cells = [
    { cx: 0.5, cy: 0.5, cz: 0.3, r: 0.12, g: 255, b: 50 },   // green cell
    { cx: -0.3, cy: -0.2, cz: 0.65, r: 0.1, g: 50, b: 255 }, // blue cell
    { cx: 0.2, cy: 0.1, cz: 0.5, r: 0.08, g: 255, b: 255 }, // bright cell
    { cx: -0.4, cy: 0.3, cz: 0.4, r: 0.06, g: 200, b: 100 }, // yellow cell
  ]
  
  for (let z = 0; z < SLICES; z++) {
    for (let y = 0; y < SLICE_RES; y++) {
      for (let x = 0; x < SLICE_RES; x++) {
        const u = x / SLICE_RES, v = y / SLICE_RES, w = z / SLICES
        const idx = (z * SLICE_RES * SLICE_RES + y * SLICE_RES + x) * 4
        let totalGreen = 0, totalBlue = 0
        
        for (const cell of cells) {
          const dx = u - cell.cx, dy = v - cell.cy, dz = w - cell.cz
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) / cell.r
          if (dist < 1) {
            const intensity = Math.pow(1 - dist, 2) * 255
            totalGreen = Math.max(totalGreen, (cell.g / 255) * intensity)
            totalBlue = Math.max(totalBlue, (cell.b / 255) * intensity)
          }
        }
        
        data[idx] = Math.min(255, totalGreen)     // R = green channel
        data[idx + 1] = Math.min(255, totalBlue) // G = blue channel  
        data[idx + 2] = 0                          // B
        data[idx + 3] = Math.min(255, totalGreen + totalBlue) // alpha for compositing
      }
    }
  }
  return data
}

const volumeData = generateVolume()

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 2.5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.0, 0.3, 0.5)
composer.addPass(bloom)

// Volume box (rendered with raymarching shader)
const volumeGeo = new THREE.BoxGeometry(1, 1, 1)
const volumeMat = new THREE.ShaderMaterial({
  uniforms: {
    uData: { value: null },
    uSlice: { value: 0.5 },
    uMode: { value: 0.0 },  // 0=3D volume, 1=slice, 2=overlay
    uTime: { value: 0 }
  },
  vertexShader: `
    varying vec3 vWorldPos;
    varying vec3 vLocalPos;
    void main() {
      vLocalPos = position;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform sampler2D uData;
    uniform float uSlice;
    uniform float uMode;
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec3 vLocalPos;
    
    float getVoxel(vec3 p) {
      // p in [0,1]^3
      float z = p.z * float(${SLICES});
      int iz = int(z);
      float fz = fract(z);
      iz = clamp(iz, 0, ${SLICES - 1});
      int iz2 = clamp(iz + 1, 0, ${SLICES - 1});
      
      float sum = 0.0;
      for (int i = 0; i < 4; i++) {
        int zz = (i < 2) ? iz : iz2;
        float wf = (i < 2) ? (1.0 - fz) : fz;
        int py = int(p.y * float(${SLICE_RES}));
        int px = int(p.x * float(${SLICE_RES}));
        py = clamp(py, 0, ${SLICE_RES - 1});
        px = clamp(px, 0, ${SLICE_RES - 1});
        int idx = zz * ${SLICE_RES} * ${SLICE_RES} + py * ${SLICE_RES} + px;
        sum += float(texelFetch(uData, ivec2(px, py + zz * ${SLICE_RES}), 0).r) * wf;
      }
      return sum / 255.0;
    }
    
    void main() {
      vec3 p = vLocalPos * 0.5 + 0.5;
      
      if (uMode < 0.5) {
        // 3D Volume rendering — front-to-back compositing
        vec3 rd = normalize(vWorldPos - cameraPosition);
        float t = 0.0;
        float step = 0.02;
        vec4 col = vec4(0.0);
        
        for (int i = 0; i < 32; i++) {
          vec3 sp = p + rd * t;
          if (any(lessThan(sp, vec3(0.0))) || any(greaterThan(sp, vec3(1.0)))) break;
          float d = getVoxel(sp);
          if (d > 0.02) {
            vec4 sample = vec4(d * 0.3, d * 0.8, d * 0.3, d * 0.6);
            col.rgb += (1.0 - col.a) * sample.a * sample.rgb;
            col.a += (1.0 - col.a) * sample.a;
          }
          t += step;
          if (col.a > 0.95) break;
        }
        gl_FragColor = col;
      } else if (uMode < 1.5) {
        // Slice view
        float dz = abs(p.z - uSlice);
        float edge = smoothstep(0.0, 0.02, dz);
        float v = getVoxel(p);
        if (dz > 0.005) { gl_FragColor = vec4(0.0); return; }
        vec3 c = mix(vec3(0.1, 0.9, 0.3), vec3(0.2, 0.4, 1.0), v);
        gl_FragColor = vec4(c * (1.0 - edge * 0.5), 1.0 - edge);
      } else {
        // Overlay: slice plane + volume hint
        float dz = abs(p.z - uSlice);
        float v = getVoxel(p);
        if (dz < 0.01 && v > 0.01) {
          vec3 c = mix(vec3(0.1, 0.9, 0.3), vec3(0.2, 0.4, 1.0), v);
          gl_FragColor = vec4(c * 1.5, 0.9);
        } else {
          // faint volume behind
          if (v > 0.15) {
            gl_FragColor = vec4(v * 0.15, v * 0.4, v * 0.15, v * 0.2);
          } else {
            discard;
          }
        }
      }
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false
})

// Create a data texture — we need to use a 2D texture atlas approach since Data3DTexture isn't widely supported
// Use the first SLICE_RES * SLICES rows as the z-stack
const texData = new Uint8Array(SLICE_RES * SLICES * SLICE_RES * 4)
for (let z = 0; z < SLICES; z++) {
  for (let y = 0; y < SLICE_RES; y++) {
    for (let x = 0; x < SLICE_RES; x++) {
      const src = (z * SLICE_RES * SLICE_RES + y * SLICE_RES + x) * 4
      const dst = (z * SLICE_RES + y) * SLICE_RES * 4 + x * 4
      texData[dst] = volumeData[src]
      texData[dst + 1] = volumeData[src + 1]
      texData[dst + 2] = volumeData[src + 2]
      texData[dst + 3] = volumeData[src + 3]
    }
  }
}

const volumeTex = new THREE.DataTexture(texData, SLICE_RES, SLICE_RES * SLICES, THREE.RGBAFormat, THREE.UnsignedByteType)
volumeTex.needsUpdate = true
volumeMat.uniforms.uData.value = volumeTex

const volumeBox = new THREE.Mesh(volumeGeo, volumeMat)
scene.add(volumeBox)

// Slice plane indicator (highlight current z)
const slicePlaneGeo = new THREE.PlaneGeometry(1, 1)
const sliceMat = new THREE.MeshBasicMaterial({
  color: 0x44ff88,
  transparent: true,
  opacity: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false
})
const slicePlane = new THREE.Mesh(slicePlaneGeo, sliceMat)
scene.add(slicePlane)

// Boundary box wireframe
const bbox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
  new THREE.LineBasicMaterial({ color: 0x334455 })
)
scene.add(bbox)

// Scroll wheel to change slice
window.addEventListener('wheel', (e) => {
  if (params.viewMode === 1 || params.viewMode === 2) {
    params.sliceDepth = Math.max(0, Math.min(1, params.sliceDepth + e.deltaY * 0.001))
    volumeMat.uniforms.uSlice.value = params.sliceDepth
    slicePlane.position.z = (params.sliceDepth - 0.5)
  }
})

// Camera target position box
scene.add(new THREE.AmbientLight(0xffffff, 0.5))

// GUI
const params = { viewMode: 0, sliceDepth: 0.5, opacity: 0.7, bloomStrength: 1.0 }
const gui = new GUI()
gui.add(params, 'viewMode', { '3D Volume': 0, 'Slice': 1, 'Overlay': 2 }).name('View Mode').onChange(v => {
  volumeMat.uniforms.uMode.value = v
  sliceMat.opacity = (v === 1) ? 0.3 : 0.0
})
gui.add(params, 'sliceDepth', 0, 1, 0.01).name('Z Depth').onChange(v => {
  volumeMat.uniforms.uSlice.value = v
  slicePlane.position.z = (v - 0.5)
})
gui.add(params, 'opacity', 0.1, 1, 0.05).name('Volume Opacity').onChange(v => {
  volumeMat.opacity = v
})
gui.add(params, 'bloomStrength', 0, 3, 0.1).name('Glow').onChange(v => {
  bloom.strength = v
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  volumeMat.uniforms.uTime.value = clock.getElapsedTime()
  controls.update()
  composer.render()
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
