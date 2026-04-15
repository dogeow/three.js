import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ═══════════════════════════════════════════════════════════════
// VERTEX SHADER
// ═══════════════════════════════════════════════════════════════
const vertexShader = /* glsl */`
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ═══════════════════════════════════════════════════════════════
// FRAGMENT SHADER — Raymarching Volumetric Clouds
// ═══════════════════════════════════════════════════════════════
const fragmentShader = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform float uCloudCoverage;
  uniform float uCloudSpeed;
  uniform float uSunElevation;
  uniform float uCloudDensity;
  uniform vec3  uCameraPos;
  uniform vec3  uSunDir;

  varying vec3 vWorldPos;

  // ── Hash & Noise ─────────────────────────────────────────────
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y
      ),
      mix(
        mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y
      ),
      f.z
    );
  }

  // ── FBM (Fractal Brownian Motion) ───────────────────────────
  float fbm(vec3 p, int octaves) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 8; i++) {
      if (i >= octaves) break;
      val += amp * noise(p * freq);
      freq *= 2.1;
      amp  *= 0.5;
    }
    return val;
  }

  // ── Cloud Density Field ──────────────────────────────────────
  float cloudDensity(vec3 p) {
    // Animate clouds
    vec3 q = p + vec3(uTime * uCloudSpeed * 0.08,
                      uTime * uCloudSpeed * 0.02,
                      uTime * uCloudSpeed * 0.05);

    // Large-scale shape using 5-octave FBM
    float d = fbm(q * 0.28, 5);

    // Detail turbulence (higher frequency, fewer octaves)
    float detail = fbm(q * 0.9 + vec3(0.0, uTime * 0.04, 0.0), 3) * 0.35;

    d += detail;

    // Remap: cloud coverage controls the threshold
    // Higher coverage = more filled clouds, lower = wispy
    float coverage = uCloudCoverage;
    float threshold = mix(0.85, 0.45, coverage);
    float densityScale = mix(0.0, 1.8, uCloudDensity);

    d = (d - threshold) * densityScale;
    return clamp(d, 0.0, 1.0);
  }

  // ── Beer-Lambert Light Extinction ───────────────────────────
  float beerLambert(float density, float stepLen) {
    return exp(-density * stepLen * 2.8);
  }

  // ── Henyey-Greenstein Phase Function ─────────────────────────
  float henyeyGreenstein(float cosTheta, float g) {
    float g2 = g * g;
    float denom = 1.0 + g2 - 2.0 * g * cosTheta;
    return (1.0 - g2) / (4.0 * 3.14159265 * pow(denom, 1.5));
  }

  // ── Raymarch ────────────────────────────────────────────────
  vec4 raymarchClouds(vec3 rayOrigin, vec3 rayDir, vec3 cloudMin, vec3 cloudMax) {
    const int MAX_STEPS = 80;
    float stepSize = 28.0 / float(MAX_STEPS);

    // AABB ray-box intersection
    vec3 tMin = (cloudMin - rayOrigin) / rayDir;
    vec3 tMax = (cloudMax - rayOrigin) / rayDir;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar  = min(min(t2.x, t2.y), t2.z);

    if (tNear > tFar || tFar < 0.0) return vec4(0.0);

    float t = max(tNear, 0.0);
    float stepLen = stepSize;

    float transmittance = 1.0;
    vec3 scatteredLight = vec3(0.0);

    // Sunlight color (warm)
    vec3 sunColor = mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 0.95, 0.8), uSunElevation);

    // Phase for forward scattering
    float cosTheta = dot(rayDir, uSunDir);
    float phase = mix(henyeyGreenstein(cosTheta, 0.7), henyeyGreenstein(cosTheta, -0.2), 0.5);

    // Secondary light (sky ambient) - blue tint
    vec3 ambientSky = vec3(0.55, 0.7, 1.0);
    vec3 ambientGround = vec3(0.4, 0.35, 0.3);

    for (int i = 0; i < MAX_STEPS; i++) {
      if (t > tFar || transmittance < 0.01) break;

      vec3 pos = rayOrigin + rayDir * t;
      float density = cloudDensity(pos);

      if (density > 0.001) {
        // Light contribution at this sample
        float lightDensity = 0.0;
        // Simple shadow ray toward sun (4 steps)
        float lt = 0.0;
        for (int j = 0; j < 4; j++) {
          lt += 6.0;
          lightDensity += cloudDensity(pos + uSunDir * lt) * 6.0;
        }
        float sunTrans = exp(-lightDensity * 0.9);

        // Ambient occlusion proxy: sample below
        float groundDensity = 0.0;
        float gt = 0.0;
        for (int k = 0; k < 4; k++) {
          gt += 6.0;
          groundDensity += cloudDensity(pos - vec3(0.0, gt, 0.0)) * 6.0;
        }
        float groundShadow = exp(-groundDensity * 0.4);

        vec3 ambient = mix(ambientGround, ambientSky, clamp(pos.y * 0.05 + 0.5, 0.0, 1.0));

        // Silver lining: edges facing sun get bright
        float silverLining = pow(clamp(dot(rayDir, -uSunDir), 0.0, 1.0), 4.0) * 0.6;

        vec3 luminance = ambient * groundShadow * 0.25
                       + sunColor * phase * sunTrans * 1.4
                       + sunColor * silverLining * sunTrans * 0.5;

        float extinction = beerLambert(density, stepLen);
        float sampleTrans = exp(-density * stepLen * 2.8);
        vec3 sampleLight = luminance * density * stepLen;

        scatteredLight += transmittance * sampleLight;
        transmittance  *= sampleTrans;
      }

      t += stepLen;
    }

    return vec4(scatteredLight, 1.0 - transmittance);
  }

  // ── Sky Gradient ─────────────────────────────────────────────
  vec3 skyColor(vec3 dir) {
    float y = clamp(dir.y, 0.0, 1.0);
    float sunDot = dot(dir, uSunDir);
    float sunGlow = pow(max(sunDot, 0.0), 64.0);

    vec3 zenith  = vec3(0.08, 0.2, 0.55);
    vec3 horizon = vec3(0.65, 0.78, 0.95);
    vec3 ground  = vec3(0.42, 0.44, 0.50);

    vec3 sky;
    if (y < 0.0) {
      sky = mix(ground, horizon, pow(1.0 + y, 3.0));
    } else {
      sky = mix(horizon, zenith, pow(y, 0.45));
    }

    // Sun disk + glow
    sky += vec3(1.0, 0.9, 0.7) * sunGlow * 0.7;
    sky += vec3(1.0, 0.6, 0.2) * pow(max(sunDot, 0.0), 8.0) * 0.15;

    return sky;
  }

  // ═══════════════════════════════════════════════════════════
  void main() {
    vec3 rayDir = normalize(vWorldPos - uCameraPos);

    // Cloud volume AABB (centered, large box)
    vec3 cloudMin = vec3(-150.0, 8.0, -150.0);
    vec3 cloudMax = vec3( 150.0, 90.0,  150.0);

    vec4 clouds = raymarchClouds(uCameraPos, rayDir, cloudMin, cloudMax);
    vec3 sky = skyColor(rayDir);

    // Composite: clouds over sky
    vec3 finalColor = mix(sky, clouds.rgb, clouds.a);

    // Slight tone mapping
    finalColor = finalColor / (finalColor + 1.0);
    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ═══════════════════════════════════════════════════════════════
// SCENE SETUP
// ═══════════════════════════════════════════════════════════════
const W = window.innerWidth, H = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);
camera.position.set(0, 25, 130);
camera.lookAt(0, 30, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minDistance = 20;
controls.maxDistance = 400;

// ═══════════════════════════════════════════════════════════════
// SKYBOX / BACKGROUND SPHERE
// ═══════════════════════════════════════════════════════════════
{
  const skyGeo = new THREE.SphereGeometry(800, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uSunDir;
      varying vec3 vDir;

      void main() {
        float y = clamp(vDir.y, 0.0, 1.0);
        vec3 zenith  = vec3(0.08, 0.2, 0.55);
        vec3 horizon = vec3(0.65, 0.78, 0.95);
        vec3 sky = mix(horizon, zenith, pow(y, 0.45));

        float sunDot = dot(vDir, uSunDir);
        sky += vec3(1.0, 0.9, 0.7) * pow(max(sunDot, 0.0), 64.0) * 0.6;

        gl_FragColor = vec4(sky, 1.0);
      }
    `
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
}

// ═══════════════════════════════════════════════════════════════
// CLOUD VOLUME — Large BoxGeometry with Raymarching Shader
// ═══════════════════════════════════════════════════════════════
const params = {
  cloudCoverage: 0.55,
  cloudSpeed:    0.60,
  sunElevation:  0.65,
  cloudDensity:  0.70,
};

const sunDir = new THREE.Vector3(0.4, 1.0, 0.3).normalize();

function updateSunDir() {
  sunDir.set(
    Math.sin(params.sunElevation * Math.PI * 0.5) * 0.5,
    Math.cos(params.sunElevation * Math.PI * 0.5),
    0.3
  ).normalize();
}
updateSunDir();

const cloudUniforms = {
  uTime:          { value: 0 },
  uCloudCoverage: { value: params.cloudCoverage },
  uCloudSpeed:    { value: params.cloudSpeed },
  uSunElevation:  { value: params.sunElevation },
  uCloudDensity:  { value: params.cloudDensity },
  uCameraPos:     { value: new THREE.Vector3() },
  uSunDir:        { value: sunDir.clone() },
};

const cloudMat = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: cloudUniforms,
  transparent: true,
  depthWrite: false,
  side: THREE.FrontSide,
  blending: THREE.NormalBlending,
});

const cloudBox = new THREE.Mesh(
  new THREE.BoxGeometry(300, 100, 300),
  cloudMat
);
cloudBox.position.y = 50;
scene.add(cloudBox);

// ═══════════════════════════════════════════════════════════════
// GROUND PLANE (reference)
// ═══════════════════════════════════════════════════════════════
{
  const geo = new THREE.PlaneGeometry(600, 600, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0x3a4a3a });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -2;
  scene.add(mesh);
}

// ═══════════════════════════════════════════════════════════════
// GUI
// ═══════════════════════════════════════════════════════════════
const gui = new GUI({ title: 'Cloud Controls' });
gui.add(params, 'cloudCoverage', 0, 1, 0.01).name('Coverage').onChange(v => {
  cloudUniforms.uCloudCoverage.value = v;
});
gui.add(params, 'cloudSpeed', 0, 2, 0.01).name('Speed').onChange(v => {
  cloudUniforms.uCloudSpeed.value = v;
});
gui.add(params, 'sunElevation', 0.05, 1, 0.01).name('Sun Elevation').onChange(v => {
  cloudUniforms.uSunElevation.value = v;
  updateSunDir();
  cloudUniforms.uSunDir.value.copy(sunDir);
});
gui.add(params, 'cloudDensity', 0, 1, 0.01).name('Density').onChange(v => {
  cloudUniforms.uCloudDensity.value = v;
});

// ═══════════════════════════════════════════════════════════════
// RESIZE
// ═══════════════════════════════════════════════════════════════
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Hide loading
document.getElementById('loading').style.display = 'none';

// ═══════════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();
  cloudUniforms.uTime.value = t;
  cloudUniforms.uCameraPos.value.copy(camera.position);

  controls.update();
  renderer.render(scene, camera);
}

animate();