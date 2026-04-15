import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://unpkg.com/lil-gui@0.19.2/dist/lil-gui.esm.js';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ─── Scene / Camera ───────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
camera.position.z = 1;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ─── Settings ────────────────────────────────────────────────────────────────
const simRes = 256;
const dyeRes = 512;
const dt = 0.016;
const pressureIterations = 20;
const curlStrength = 30;

const params = {
  viscosity: 0.0001,
  dyeDissipation: 0.997,
  velocityDissipation: 0.99,
  pressure: 0.8,
  curl: curlStrength,
  splatRadius: 0.25,
  splatForce: 6000,
};

// ─── Render Targets ───────────────────────────────────────────────────────────
const rtOpts = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping,
};

const simW = simRes, simH = simRes;
const dyeW = dyeRes, dyeH = dyeRes;

const velocityRT  = [new THREE.WebGLRenderTarget(simW, simH, rtOpts),
                     new THREE.WebGLRenderTarget(simW, simH, rtOpts)];
const pressureRT  = [new THREE.WebGLRenderTarget(simW, simH, rtOpts),
                     new THREE.WebGLRenderTarget(simW, simH, rtOpts)];
const divergenceRT = new THREE.WebGLRenderTarget(simW, simH, rtOpts);
const curlRT      = new THREE.WebGLRenderTarget(simW, simH, rtOpts);
const dyeRT       = [new THREE.WebGLRenderTarget(dyeW, dyeH, rtOpts),
                     new THREE.WebGLRenderTarget(dyeW, dyeH, rtOpts)];

let velIdx = 0, dyeIdx = 0, pressIdx = 0;

// ─── Shared Geometry / Material ─────────────────────────────────────────────
const quadGeo = new THREE.PlaneGeometry(2, 2);
const blitMat = new THREE.ShaderMaterial({ depthWrite: false, depthTest: false });

const simScene  = new THREE.Scene();
const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const simMesh   = new THREE.Mesh(quadGeo, blitMat);
simScene.add(simMesh);

// ─── GLSL Utilities ──────────────────────────────────────────────────────────
const linearize = (c) => c * c;
const delinearize = (c) => Math.sqrt(c);

const FS_BLOCK = `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2      uTexelSize;
  uniform float     u_dt;
  uniform float     u_dissipation;

  vec4 bilat(vec2 uv) {
    vec4 c = texture2D(uTexture, uv);
    // decode back from half-float rgba
    return vec4(c.rg * 2.0 - 1.0, c.b * 2.0 - 1.0, 1.0) * c.a;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy * uTexelSize;
    gl_FragColor = bilat(uv);
  }
`;

// ─── Advection Shader ────────────────────────────────────────────────────────
const advectShader = `
  precision highp float;

  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2      uTexelSize;
  uniform float     u_dt;
  uniform float     u_dissipation;
  uniform float     u_rho;

  void main() {
    vec2 uv = gl_FragCoord.xy * uTexelSize;
    vec2 vel = texture2D(uVelocity, uv).xy;
    vec2 prev = uv - vel * u_dt * u_rho;
    gl_FragColor = vec4(texture2D(uSource, prev).rgb * u_dissipation, 1.0);
  }
`;

// ─── Splat Shader ─────────────────────────────────────────────────────────────
const splatShader = `
  precision highp float;

  uniform sampler2D uTarget;
  uniform vec2      uTexelSize;
  uniform vec2      uPoint;
  uniform vec3      uColor;
  uniform float     uRadius;
  uniform float     uForce;

  void main() {
    vec2 uv = gl_FragCoord.xy * uTexelSize;
    vec2 d = uv - uPoint;
    float s = exp(-dot(d, d) / uRadius);
    vec2 vel = uColor.xy * uForce * s;
    vec4 base = texture2D(uTarget, uv);
    // encode velocity in rg channels, color in b with alpha as weight
    gl_FragColor = vec4(
      base.rg + vel * 0.5 + 0.5,
      clamp(base.b + s * uColor.b, 0.0, 1.0),
      clamp(base.a + s, 0.0, 1.0)
    );
  }
`;

// ─── Divergence Shader ───────────────────────────────────────────────────────
const divergenceShader = `
  precision highp float;

  uniform sampler2D uVelocity;
  uniform vec2      uTexelSize;
  uniform float     u_half;

  void main() {
    vec2 uv = gl_FragCoord.xy * uTexelSize;
    float L = texture2D(uVelocity, uv - vec2(uTexelSize.x, 0.0)).r;
    float R = texture2D(uVelocity, uv + vec2(uTexelSize.x, 0.0)).r;
    float B = texture2D(uVelocity, uv - vec2(0.0, uTexelSize.y)).g;
    float T = texture2D(uVelocity, uv + vec2(0.0, uTexelSize.y)).g;
    float div = 0.5 * ((R - L) + (T - B));
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

// ─── Curl Shader ──────────────────────────────────────────────────────────────
const curlShader = `
  precision highp float;

  uniform sampler2D uVelocity;
  uniform vec2      uTexelSize;

  void main() {
    vec2 uv = gl_FragCoord.xy * uTexelSize;
    float L = texture2D(uVelocity, uv - vec2(uTexelSize.x, 0.0)).g;
    float R = texture2D(uVelocity, uv + vec2(uTexelSize.x, 0.0)).g;
    float B = texture2D(uVelocity, uv - vec2(0.0, uTexelSize.y)).r;
    float T = texture2D(uVelocity, uv + vec2(0.0, uTexelSize.y)).r;
    float curl = 0.5 * ((R - L) - (T - B));
    gl_FragColor = vec4(curl, 0.0, 0.0, 1.0);
  }
`;

// ─── Vorticity Shader ────────────────────────────────────────────────────────
const vorticityShader = `
  precision highp float;

  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform vec2      uTexelSize;
  uniform float     uCurlStrength;
  uniform float     u_dt;

  void main() {
    vec2 uv = gl_FragCoord.xy * uTexelSize;
    float L = texture2D(uCurl, uv - vec2(uTexelSize.x, 0.0)).r;
    float R = texture2D(uCurl, uv + vec2(uTexelSize.x, 0.0)).r;
    float B = texture2D(uCurl, uv - vec2(0.0, uTexelSize.y)).r;
    float T = texture2D(uCurl, uv + vec2(0.0, uTexelSize.y)).r;
    float C = texture2D(uCurl, uv).r;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force = force / (length(force) + 1e-5) * uCurlStrength * C;
    vec2 vel = texture2D(uVelocity, uv).rg * 2.0 - 1.0;
    vel += force * u_dt;
    gl_FragColor = vec4(vel * 0.5 + 0.5, 0.0, 1.0);
  }
`;

// ─── Pressure Jacobi ────────────────────────────────────────────────────────
const pressureShader = `
  precision highp float;

  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2      uTexelSize;
  uniform float     uAlpha;
  uniform float     uHalf;

  void main() {
    vec2 uv = gl_FragCoord.xy * uTexelSize;
    float L = texture2D(uPressure, uv - vec2(uTexelSize.x, 0.0)).r;
    float R = texture2D(uPressure, uv + vec2(uTexelSize.x, 0.0)).r;
    float B = texture2D(uPressure, uv - vec2(0.0, uTexelSize.y)).r;
    float T = texture2D(uPressure, uv + vec2(0.0, uTexelSize.y)).r;
    float div = texture2D(uDivergence, uv).r;
    float p = (L + R + B + T - div * uAlpha) * 0.25;
    gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
  }
`;

// ─── Gradient Subtract ───────────────────────────────────────────────────────
const gradientSubtractShader = `
  precision highp float;

  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2       uTexelSize;
  uniform float      uHalf;

  void main() {
    vec2 uv = gl_FragCoord.xy * uTexelSize;
    float L = texture2D(uPressure, uv - vec2(uTexelSize.x, 0.0)).r;
    float R = texture2D(uPressure, uv + vec2(uTexelSize.x, 0.0)).r;
    float B = texture2D(uPressure, uv - vec2(0.0, uTexelSize.y)).r;
    float T = texture2D(uPressure, uv + vec2(0.0, uTexelSize.y)).r;
    vec2 vel = texture2D(uVelocity, uv).rg * 2.0 - 1.0;
    vel -= vec2(R - L, T - B) * 0.5;
    gl_FragColor = vec4(vel * 0.5 + 0.5, 0.0, 1.0);
  }
`;

// ─── Display Shader ───────────────────────────────────────────────────────────
const displayShader = `
  precision highp float;

  uniform sampler2D uDye;
  uniform sampler2D uVelocity;

  void main() {
    vec2 uv = gl_FragCoord.xy * 0.5 + 0.5;
    vec4 dye = texture2D(uDye, uv);
    vec4 vel = texture2D(uVelocity, uv);
    vec2 v = vel.rg * 2.0 - 1.0;
    float speed = length(v) * 0.5;
    // velocity heatmap
    vec3 vColor = vec3(speed, speed * 0.4, 1.0 - speed) * 1.5;
    // dye as colorful density
    vec3 dColor = dye.bbb * 2.0;
    // blend
    vec3 col = mix(vColor, dColor, smoothstep(0.0, 0.3, dye.b));
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Shader Compilation Helper ───────────────────────────────────────────────
function makeShader(fragSrc, uniforms) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: fragSrc,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  return mat;
}

function blit(target, material) {
  simMesh.material = material;
  renderer.setRenderTarget(target);
  renderer.render(simScene, simCamera);
}

// ─── Simulation Passes ───────────────────────────────────────────────────────
let advectMat, splatMat, divMat, curlMat, vortMat, pressMat, gradMat, displayMat;

function initMaterials() {
  advectMat = makeShader(advectShader, {
    uVelocity:    { value: null },
    uSource:      { value: null },
    uTexelSize:   { value: new THREE.Vector2(1 / simW, 1 / simH) },
    u_dt:         { value: dt },
    u_dissipation:{ value: 1.0 },
    u_rho:        { value: 1.0 },
  });

  splatMat = makeShader(splatShader, {
    uTarget:    { value: null },
    uTexelSize: { value: new THREE.Vector2(1 / simW, 1 / simH) },
    uPoint:     { value: new THREE.Vector2() },
    uColor:     { value: new THREE.Vector3() },
    uRadius:    { value: 0.005 },
    uForce:     { value: 6000 },
  });

  divMat = makeShader(divergenceShader, {
    uVelocity:  { value: null },
    uTexelSize: { value: new THREE.Vector2(1 / simW, 1 / simH) },
    u_half:     { value: 0.5 },
  });

  curlMat = makeShader(curlShader, {
    uVelocity:  { value: null },
    uTexelSize: { value: new THREE.Vector2(1 / simW, 1 / simH) },
  });

  vortMat = makeShader(vorticityShader, {
    uVelocity:     { value: null },
    uCurl:         { value: null },
    uTexelSize:    { value: new THREE.Vector2(1 / simW, 1 / simH) },
    uCurlStrength: { value: params.curl },
    u_dt:          { value: dt },
  });

  pressMat = makeShader(pressureShader, {
    uPressure:   { value: null },
    uDivergence: { value: null },
    uTexelSize:  { value: new THREE.Vector2(1 / simW, 1 / simH) },
    uAlpha:      { value: 1.0 },
    uHalf:       { value: 0.5 },
  });

  gradMat = makeShader(gradientSubtractShader, {
    uPressure:  { value: null },
    uVelocity:  { value: null },
    uTexelSize: { value: new THREE.Vector2(1 / simW, 1 / simH) },
    uHalf:      { value: 0.5 },
  });

  displayMat = makeShader(displayShader, {
    uDye:      { value: null },
    uVelocity: { value: null },
  });
}

// ─── Simulation Step ──────────────────────────────────────────────────────────
function step(dt) {
  // 1. Advect velocity
  advectMat.uniforms.uVelocity.value = velocityRT[velIdx].texture;
  advectMat.uniforms.uSource.value   = velocityRT[velIdx].texture;
  advectMat.uniforms.u_dissipation.value = params.velocityDissipation;
  advectMat.uniforms.u_rho.value = 1.0;
  advectMat.uniforms.uTexelSize.value.set(1 / simW, 1 / simH);
  advectMat.uniforms.u_dt.value = dt;
  const nextVel = velocityRT[1 - velIdx];
  blit(nextVel, advectMat);
  velIdx = 1 - velIdx;

  // 2. Advect dye
  advectMat.uniforms.uVelocity.value = velocityRT[velIdx].texture;
  advectMat.uniforms.uSource.value  = dyeRT[dyeIdx].texture;
  advectMat.uniforms.u_dissipation.value = params.dyeDissipation;
  advectMat.uniforms.uTexelSize.value.set(1 / dyeW, 1 / dyeH);
  advectMat.uniforms.u_rho.value = 1.0;
  const nextDye = dyeRT[1 - dyeIdx];
  blit(nextDye, advectMat);
  dyeIdx = 1 - dyeIdx;

  // 3. Curl
  curlMat.uniforms.uVelocity.value = velocityRT[velIdx].texture;
  blit(curlRT, curlMat);

  // 4. Vorticity confinement
  vortMat.uniforms.uVelocity.value = velocityRT[velIdx].texture;
  vortMat.uniforms.uCurl.value     = curlRT.texture;
  vortMat.uniforms.uCurlStrength.value = params.curl;
  blit(nextVel, vortMat);
  velIdx = 1 - velIdx;

  // 5. Divergence
  divMat.uniforms.uVelocity.value = velocityRT[velIdx].texture;
  blit(divergenceRT, divMat);

  // 6. Pressure Jacobi (clear first)
  for (let i = 0; i < pressureIterations; i++) {
    pressMat.uniforms.uPressure.value  = pressureRT[pressIdx].texture;
    pressMat.uniforms.uDivergence.value = divergenceRT.texture;
    const nextPress = pressureRT[1 - pressIdx];
    blit(nextPress, pressMat);
    pressIdx = 1 - pressIdx;
  }

  // 7. Gradient subtract
  gradMat.uniforms.uPressure.value = pressureRT[pressIdx].texture;
  gradMat.uniforms.uVelocity.value = velocityRT[velIdx].texture;
  blit(nextVel, gradMat);
  velIdx = 1 - velIdx;
}

// ─── Splat on Click / Drag ────────────────────────────────────────────────────
const mouse = { x: 0, y: 0, prevX: 0, prevY: 0, down: false };
const neonColors = [
  [1.0, 0.15, 0.8],  // hot pink
  [0.1, 0.9, 1.0],   // cyan
  [1.0, 0.6, 0.0],   // orange
  [0.5, 0.0, 1.0],   // purple
  [0.1, 1.0, 0.4],   // green
];

let colorIdx = 0;
let lastSplatTime = 0;

function splat(x, y, dx, dy, col) {
  // velocity splat
  splatMat.uniforms.uTarget.value    = velocityRT[velIdx].texture;
  splatMat.uniforms.uTexelSize.value.set(1 / simW, 1 / simH);
  splatMat.uniforms.uPoint.value.set(x, y);
  splatMat.uniforms.uColor.value.set(dx * params.splatForce, dy * params.splatForce, 0.0);
  splatMat.uniforms.uRadius.value    = params.splatRadius * 0.005;
  splatMat.uniforms.uForce.value     = 1.0;
  blit(velocityRT[1 - velIdx], splatMat);
  velIdx = 1 - velIdx;

  // dye splat
  splatMat.uniforms.uTarget.value    = dyeRT[dyeIdx].texture;
  splatMat.uniforms.uTexelSize.value.set(1 / dyeW, 1 / dyeH);
  splatMat.uniforms.uColor.value.set(col[0] * params.splatForce * 0.0005,
                                     col[1] * params.splatForce * 0.0005,
                                     col[2]);
  splatMat.uniforms.uRadius.value    = params.splatRadius * 0.01;
  blit(dyeRT[1 - dyeIdx], splatMat);
  dyeIdx = 1 - dyeIdx;
}

function getPointerUV(e) {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = -(e.clientY / window.innerHeight) * 2 + 1;
  return [x * 0.5 + 0.5, y * 0.5 + 0.5];
}

window.addEventListener('mousedown', (e) => {
  mouse.down = true;
  [mouse.x, mouse.y] = getPointerUV(e);
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
});

window.addEventListener('mousemove', (e) => {
  if (!mouse.down) return;
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
  [mouse.x, mouse.y] = getPointerUV(e);
  const dx = mouse.x - mouse.prevX;
  const dy = mouse.y - mouse.prevY;
  const col = neonColors[colorIdx % neonColors.length];
  splat(mouse.x, mouse.y, dx * params.splatForce * 20, dy * params.splatForce * 20, col);
});

window.addEventListener('mouseup', () => {
  mouse.down = false;
  colorIdx++;
});

window.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  [mouse.x, mouse.y] = getPointerUV(t);
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
  mouse.down = true;
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
  [mouse.x, mouse.y] = getPointerUV(t);
  const dx = mouse.x - mouse.prevX;
  const dy = mouse.y - mouse.prevY;
  const col = neonColors[colorIdx % neonColors.length];
  splat(mouse.x, mouse.y, dx * params.splatForce * 20, dy * params.splatForce * 20, col);
}, { passive: false });

window.addEventListener('touchend', () => {
  mouse.down = false;
  colorIdx++;
});

// ─── GUI ─────────────────────────────────────────────────────────────────────
const gui = new GUI();
gui.add(params, 'viscosity',        0.0,   0.01, 0.0001).name('Viscosity');
gui.add(params, 'dyeDissipation',   0.9,   1.0,  0.001 ).name('Dye Dissipation');
gui.add(params, 'velocityDissipation', 0.9, 1.0, 0.001 ).name('Vel Dissipation');
gui.add(params, 'pressure',         0.1,   2.0,  0.1   ).name('Pressure');
gui.add(params, 'curl',             0.0,   60.0, 1.0   ).name('Curl');
gui.add(params, 'splatRadius',      0.01,  2.0,  0.01  ).name('Splat Radius');

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
initMaterials();

// ─── Render Loop ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function render() {
  requestAnimationFrame(render);
  controls.update();

  const delta = Math.min(clock.getDelta(), 0.033);
  step(delta * 60); // scale to frame units

  // Final display
  displayMat.uniforms.uDye.value      = dyeRT[dyeIdx].texture;
  displayMat.uniforms.uVelocity.value = velocityRT[velIdx].texture;
  blit(null, displayMat); // render to screen
}

render();