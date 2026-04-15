import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x08060c)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 0, 4)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

// Lights (used for normal shading)
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(5, 5, 5)
scene.add(dirLight)

// ─── Raymarching Cube ─────────────────────────────────────────────────────────
// We render SDF inside a bounding box using a custom shader
const CUBE_SIZE = 2.5

// Proxy geometry - the raymarched cube shell
const proxyGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)
const proxyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
  uniforms: {
    uVoxels: { value: [] },
    uResolution: { value: 128 },
    uTime: { value: 0 },
    uCamPos: { value: new THREE.Vector3() },
    uBrushRadius: { value: 0.5 },
    uSmoothness: { value: 0.3 },
    uOperation: { value: 0 },
  },
  vertexShader: `
    varying vec3 vWorldPos;
    varying vec3 vLocalPos;
    void main() {
      vLocalPos = position;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    varying vec3 vWorldPos;
    varying vec3 vLocalPos;
    uniform float uResolution;
    uniform float uTime;
    uniform vec3 uCamPos;
    uniform float uBrushRadius;
    uniform float uSmoothness;
    uniform int uOperation;

    // Max voxel count
    #define MAX_VOXELS 512
    uniform vec4 uVoxels[MAX_VOXELS]; // xyz=pos, w=type(0=add,1=sub,2=smooth)
    uniform int uVoxelCount;

    // SDF operations
    float sdSphere(vec3 p, float r) { return length(p) - r; }
    float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }

    float opUnion(float a, float b) { return min(a, b); }
    float opSub(float a, float b) { return max(a, -b); }
    float opSmooth(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    float sceneSDF(vec3 p) {
      float d = 1e10;
      for (int i = 0; i < MAX_VOXELS; i++) {
        if (i >= uVoxelCount) break;
        vec4 v = uVoxels[i];
        float sd;
        if (v.w < 0.5) {
          // Sphere
          sd = sdSphere(p - v.xyz, uBrushRadius);
        } else if (v.w < 1.5) {
          // Box
          sd = sdBox(p - v.xyz, vec3(uBrushRadius * 0.8));
        } else {
          // Smooth sphere
          sd = sdSphere(p - v.xyz, uBrushRadius);
        }

        if (v.w < 0.5) {
          d = opUnion(d, sd);
        } else if (v.w < 1.5) {
          d = opSub(d, sd);
        } else {
          d = opSmooth(d, sd, uSmoothness);
        }
      }
      // Clamp to bounding box
      float bbox = sdBox(p, vec3(${CUBE_SIZE.toFixed(1)} * 0.5));
      d = opUnion(d, bbox);
      return d;
    }

    vec3 calcNormal(vec3 p) {
      float e = 0.001;
      return normalize(vec3(
        sceneSDF(p + vec3(e,0,0)) - sceneSDF(p - vec3(e,0,0)),
        sceneSDF(p + vec3(0,e,0)) - sceneSDF(p - vec3(0,e,0)),
        sceneSDF(p + vec3(0,0,e)) - sceneSDF(p - vec3(0,0,e))
      ));
    }

    void main() {
      // Ray direction
      vec3 ro = uCamPos;
      vec3 rd = normalize(vWorldPos - uCamPos);

      // March
      float t = 0.0;
      float maxDist = 10.0;
      bool hit = false;
      float prevD = 1e10;
      for (int i = 0; i < 120; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);
        if (d < 0.001) { hit = true; break; }
        if (t > maxDist) break;
        t += max(d, 0.005);
        prevD = d;
      }

      if (!hit) discard;

      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p);

      // Lighting
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float diff = max(dot(n, lightDir), 0.0);
      float ambient = 0.2;

      // Base color gradient by height
      float h = (p.y / ${CUBE_SIZE.toFixed(1)} * 0.5 + 0.5);
      vec3 col1 = vec3(0.96, 0.45, 0.71); // pink
      vec3 col2 = vec3(0.55, 0.29, 0.95); // purple
      vec3 baseColor = mix(col1, col2, h);

      // Subsurface scatter hint
      float sss = max(0.0, -dot(n, lightDir)) * 0.3;
      baseColor += vec3(0.2, 0.1, 0.3) * sss;

      // Fresnel rim
      float fresnel = pow(1.0 - abs(dot(n, -rd)), 3.0);
      baseColor += vec3(0.4, 0.2, 0.5) * fresnel;

      vec3 col = baseColor * (diff + ambient);

      // AO hint
      float ao = 1.0;
      col *= ao;

      gl_FragColor = vec4(col, 1.0);
    }
  `
})

// For correct raycasting, we need the mesh on the front side too
const proxyMatFront = proxyMat.clone()
proxyMatFront.side = THREE.FrontSide

const proxyMesh = new THREE.Mesh(proxyGeo, proxyMatFront)
scene.add(proxyMesh)

// Voxel data
let voxels = [] // { pos: Vector3, type: 0|1|2 }
const MAX_VOXELS = 512

// Initial sphere
voxels.push({ pos: new THREE.Vector3(0, 0, 0), type: 0 })
updateVoxelUniforms()

function updateVoxelUniforms() {
  const arr = new Array(MAX_VOXELS).fill(null).map(() => new THREE.Vector4(0,0,0,0))
  voxels.forEach((v, i) => {
    arr[i] = new THREE.Vector4(v.pos.x, v.pos.y, v.pos.z, v.type)
  })
  proxyMat.uniforms.uVoxels.value = arr
  proxyMat.uniforms.uVoxelCount.value = voxels.length
  proxyMatFront.uniforms.uVoxels.value = arr
  proxyMatFront.uniforms.uVoxelCount.value = voxels.length
}

// ─── Controls ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }

let sculptMode = 'add' // add | sub | smooth
let brushRadius = 0.5
let smoothness = 0.3

document.getElementById('modeAdd').addEventListener('click', () => {
  sculptMode = 'add'
  proxyMat.uniforms.uOperation.value = 0
  proxyMatFront.uniforms.uOperation.value = 0
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('modeAdd').classList.add('active')
})
document.getElementById('modeSub').addEventListener('click', () => {
  sculptMode = 'sub'
  proxyMat.uniforms.uOperation.value = 1
  proxyMatFront.uniforms.uOperation.value = 1
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('modeSub').classList.add('active')
})
document.getElementById('modeSmooth').addEventListener('click', () => {
  sculptMode = 'smooth'
  proxyMat.uniforms.uOperation.value = 2
  proxyMatFront.uniforms.uOperation.value = 2
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('modeSmooth').classList.add('active')
})

document.getElementById('rSlider').addEventListener('input', e => {
  brushRadius = parseFloat(e.target.value)
  document.getElementById('rVal').textContent = brushRadius.toFixed(1)
  proxyMat.uniforms.uBrushRadius.value = brushRadius
  proxyMatFront.uniforms.uBrushRadius.value = brushRadius
})
document.getElementById('sSlider').addEventListener('input', e => {
  smoothness = parseFloat(e.target.value)
  document.getElementById('sVal').textContent = smoothness.toFixed(2)
  proxyMat.uniforms.uSmoothness.value = smoothness
  proxyMatFront.uniforms.uSmoothness.value = smoothness
})

document.getElementById('resetBtn').addEventListener('click', () => {
  voxels = []
  proxyMat.uniforms.uVoxelCount.value = 0
  proxyMatFront.uniforms.uVoxelCount.value = 0
})
document.getElementById('sphereBtn').addEventListener('click', () => {
  if (voxels.length < MAX_VOXELS) {
    voxels.push({ pos: new THREE.Vector3(
      (Math.random()-0.5)*0.8,
      (Math.random()-0.5)*0.8,
      (Math.random()-0.5)*0.8
    ), type: 0 })
    updateVoxelUniforms()
  }
})
document.getElementById('boxBtn').addEventListener('click', () => {
  if (voxels.length < MAX_VOXELS) {
    voxels.push({ pos: new THREE.Vector3(
      (Math.random()-0.5)*0.8,
      (Math.random()-0.5)*0.8,
      (Math.random()-0.5)*0.8
    ), type: 1 })
    updateVoxelUniforms()
  }
})

// Raycasting for sculpting
const raycaster = new THREE.Raycaster()
const boxGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)
const boxCenter = new THREE.Vector3()

renderer.domElement.addEventListener('click', e => {
  const ndc = new THREE.Vector2(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1
  )
  raycaster.setFromCamera(ndc, camera)

  // Intersect the bounding box
  const target = new THREE.Vector3()
  const hit = raycaster.ray.intersectBox(
    new THREE.Box3(boxCenter.clone().subScalar(CUBE_SIZE/2), boxCenter.clone().addScalar(CUBE_SIZE/2)),
    target
  )

  if (hit && voxels.length < MAX_VOXELS) {
    // Snap to a grid within the cube
    const gridSize = 0.2
    const snapped = new THREE.Vector3(
      Math.round(target.x / gridSize) * gridSize,
      Math.round(target.y / gridSize) * gridSize,
      Math.round(target.z / gridSize) * gridSize
    )
    // Clamp to cube
    const half = CUBE_SIZE / 2 - brushRadius
    snapped.clamp(new THREE.Vector3(-half,-half,-half), new THREE.Vector3(half,half,half))

    let type = sculptMode === 'add' ? 0 : sculptMode === 'sub' ? 1 : 2
    voxels.push({ pos: snapped.clone(), type })
    updateVoxelUniforms()
  }
})

// ─── Brush cursor visualization ────────────────────────────────────────────────
const brushCursor = new THREE.Mesh(
  new THREE.TorusGeometry(0.5, 0.02, 8, 32),
  new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.6 })
)
brushCursor.visible = false
scene.add(brushCursor)

renderer.domElement.addEventListener('mousemove', e => {
  const ndc = new THREE.Vector2(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1
  )
  raycaster.setFromCamera(ndc, camera)
  const target = new THREE.Vector3()
  const hit = raycaster.ray.intersectBox(
    new THREE.Box3(boxCenter.clone().subScalar(CUBE_SIZE/2), boxCenter.clone().addScalar(CUBE_SIZE/2)),
    target
  )
  if (hit) {
    brushCursor.visible = true
    brushCursor.position.copy(target)
    brushCursor.scale.setScalar(brushRadius / 0.5)
  } else {
    brushCursor.visible = false
  }
})

// ─── Animate ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.elapsedTime

  proxyMat.uniforms.uTime.value = elapsed
  proxyMat.uniforms.uCamPos.value.copy(camera.position)
  proxyMatFront.uniforms.uTime.value = elapsed
  proxyMatFront.uniforms.uCamPos.value.copy(camera.position)

  // Pulse brush cursor
  brushCursor.material.opacity = 0.4 + Math.sin(elapsed * 4) * 0.2

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera
window.renderer = renderer
window.controls = controls
window.voxels = voxels

animate()