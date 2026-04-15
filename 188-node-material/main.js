import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// =============================================================================
// GLSL Vertex Shader
// =============================================================================
const vertexShader = /* glsl */`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// =============================================================================
// GLSL Fragment Shader - Procedural Patterns
// =============================================================================
const fragmentShader = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform int   uPattern;      // 0=checkerboard, 1=rings, 2=brick
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  uniform float uScale;
  uniform float uSpeed;
  uniform float uThickness;    // ring thickness / brick mortar

  varying vec2 vUv;

  // -------------------------------------------------------------------
  // Pattern 0: Checkerboard
  // -------------------------------------------------------------------
  float checkerboard(vec2 uv, float scale) {
    vec2 g = floor(uv * scale);
    return mod(g.x + g.y, 2.0);
  }

  // -------------------------------------------------------------------
  // Pattern 1: Concentric Rings
  // -------------------------------------------------------------------
  float concentricRings(vec2 uv, float scale, float thickness) {
    float d = length(uv - 0.5) * scale;
    float rings = mod(d + uTime * uSpeed, 1.0);
    // Smooth the ring edge slightly
    float ringEdge = smoothstep(thickness, thickness + 0.05, rings)
                   * smoothstep(1.0, 1.0 - thickness - 0.05, rings);
    // Return 0 or 1 based on which half of the period we're in
    float halfPeriod = 0.5;
    return step(halfPeriod, rings);
  }

  // -------------------------------------------------------------------
  // Pattern 2: Brick Pattern
  // -------------------------------------------------------------------
  float brickPattern(vec2 uv, float scale, float thickness) {
    // Scale up UV
    vec2 p = uv * scale;

    // Offset every other row by 0.5 for brick staggering
    float row = floor(p.y);
    if (mod(row, 2.0) > 0.5) {
      p.x += 0.5;
    }

    // Brick cell coordinates
    vec2 brick = fract(p);

    // Mortar lines (thin lines at edges)
    float mortarX = smoothstep(0.0, thickness, brick.x)
                  * smoothstep(1.0, 1.0 - thickness, brick.x);
    float mortarY = smoothstep(0.0, thickness, brick.y)
                  * smoothstep(1.0, 1.0 - thickness, brick.y);

    // Inside brick = 1.0, mortar = 0.0
    float isBrick = mortarX * mortarY;

    // Subtle animated highlight sweep
    float sweep = sin(p.x * 3.14159 + uTime * uSpeed) * 0.04;

    return clamp(isBrick + sweep, 0.0, 1.0);
  }

  // -------------------------------------------------------------------
  // Main
  // -------------------------------------------------------------------
  void main() {
    vec2 uv = vUv;

    // Tile / mirror UV for visual variety
    vec2 tiledUv = fract(uv * 2.0);

    float patternValue = 0.0;

    if (uPattern == 0) {
      // Checkerboard
      patternValue = checkerboard(uv, uScale);
      // Add subtle time-based color shimmer
      float shimmer = sin(uv.x * 20.0 + uTime * uSpeed) * sin(uv.y * 20.0 - uTime * uSpeed * 0.7) * 0.05;
      patternValue = clamp(patternValue + shimmer, 0.0, 1.0);
    } else if (uPattern == 1) {
      // Concentric Rings
      patternValue = concentricRings(uv, uScale, uThickness);
    } else if (uPattern == 2) {
      // Brick
      patternValue = brickPattern(uv, uScale, uThickness);
    }

    // Mix the two colors based on pattern
    vec3 finalColor = mix(uColor1, uColor2, patternValue);

    // Add a subtle vignette
    float vignette = 1.0 - smoothstep(0.4, 0.9, length(uv - 0.5));
    finalColor *= mix(0.7, 1.0, vignette);

    // Gamma-ish correction
    finalColor = pow(finalColor, vec3(0.95));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// =============================================================================
// Scene Setup
// =============================================================================
const scene    = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);

const camera   = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 2.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance   = 1.5;
controls.maxDistance   = 6;

// =============================================================================
// Uniforms & Material
// =============================================================================
const uniforms = {
  uTime:       { value: 0 },
  uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
  uPattern:    { value: 0 },
  uColor1:     { value: new THREE.Color(0x7dd3fc) },   // cyan-ish
  uColor2:     { value: new THREE.Color(0x0c0c1e) },   // near black
  uScale:      { value: 8.0 },
  uSpeed:      { value: 0.5 },
  uThickness:  { value: 0.08 },
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide,
});

// =============================================================================
// Plane Mesh
// =============================================================================
const geometry = new THREE.PlaneGeometry(4, 4, 1, 1);
const mesh     = new THREE.Mesh(geometry, material);
scene.add(mesh);

// =============================================================================
// lil-gui Controls
// =============================================================================
const gui = new GUI({ title: '🎨 程序化材质编辑器' });

const patternNames = ['棋盘格 Checkerboard', '同心圆 Concentric Rings', '砖块 Brick Pattern'];
const patternNameEl = document.getElementById('pattern-name');

const patternFolder = gui.addFolder('图案 Pattern');
patternFolder.add(uniforms.uPattern, 'value', { 0: patternNames[0], 1: patternNames[1], 2: patternNames[2] })
  .name('类型')
  .onChange(v => {
    patternNameEl.textContent = patternNames[v];
  });

const colorFolder = gui.addFolder('颜色 Colors');
colorFolder.addColor(uniforms.uColor1, 'value').name('颜色 A');
colorFolder.addColor(uniforms.uColor2, 'value').name('颜色 B');

const paramFolder = gui.addFolder('参数 Parameters');
paramFolder.add(uniforms.uScale,     'value', 1, 24, 0.5).name('缩放 Scale');
paramFolder.add(uniforms.uSpeed,     'value', 0, 3,  0.05).name('速度 Speed');
paramFolder.add(uniforms.uThickness, 'value', 0.01, 0.25, 0.01).name('线宽 Thickness');

patternFolder.open();
colorFolder.open();
paramFolder.open();

// =============================================================================
// Animation Loop
// =============================================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  uniforms.uTime.value = clock.getElapsedTime();

  controls.update();
  renderer.render(scene, camera);
}

animate();

// =============================================================================
// Resize Handler
// =============================================================================
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  uniforms.uResolution.value.set(innerWidth, innerHeight);
});