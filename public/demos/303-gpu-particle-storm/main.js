import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
    import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

    // ─── Perlin Noise 3D ──────────────────────────────────────────────────────
    const _perm = new Uint8Array(512);
    const _grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    (function seedNoise() {
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
      }
      for (let i = 0; i < 512; i++) _perm[i] = p[i & 255];
    })();

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function dot3(g, x, y, z) { return g[0]*x + g[1]*y + g[2]*z; }

    function noise3(x, y, z) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = _perm[X]+Y, AA = _perm[A]+Z, AB = _perm[A+1]+Z;
      const B = _perm[X+1]+Y, BA = _perm[B]+Z, BB = _perm[B+1]+Z;
      return lerp(
        lerp(
          lerp(dot3(_grad3[_perm[AA] % 12], x, y, z), dot3(_grad3[_perm[BA] % 12], x-1, y, z), u),
          lerp(dot3(_grad3[_perm[AB] % 12], x, y-1, z), dot3(_grad3[_perm[BB] % 12], x-1, y-1, z), u),
          v
        ),
        lerp(
          lerp(dot3(_grad3[_perm[AA+1] % 12], x, y, z-1), dot3(_grad3[_perm[BA+1] % 12], x-1, y, z-1), u),
          lerp(dot3(_grad3[_perm[AB+1] % 12], x, y-1, z-1), dot3(_grad3[_perm[BB+1] % 12], x-1, y-1, z-1), u),
          v
        ),
        w
      );
    }

    // ─── FBM (Fractal Brownian Motion) ──────────────────────────────────────
    function fbm(x, y, z, octaves = 4) {
      let val = 0, amp = 0.5, freq = 1, max = 0;
      for (let i = 0; i < octaves; i++) {
        val += noise3(x * freq, y * freq, z * freq) * amp;
        max += amp;
        amp *= 0.5;
        freq *= 2.0;
      }
      return val / max;
    }

    // ─── Config ──────────────────────────────────────────────────────────────
    const PARAMS = {
      particleCount: 200000,
      turbulenceScale: 1.2,
      flowSpeed: 0.6,
      attractorStrength: 1.8,
      attractorRadius: 12.0,
      bloomStrength: 1.4,
      bloomRadius: 0.5,
      bloomThreshold: 0.15,
      stormBurst: false,
      colorShift: 0.0,
    };

    // ─── Scene Setup ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 40);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 200;
    controls.minDistance = 5;

    // ─── Post Processing ─────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      PARAMS.bloomStrength, PARAMS.bloomRadius, PARAMS.bloomThreshold
    );
    composer.addPass(bloomPass);

    // ─── Stars Background ────────────────────────────────────────────────────
    function createStars(count = 8000) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 180 + Math.random() * 120;
        pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i*3+2] = r * Math.cos(phi);
        const brightness = 0.3 + Math.random() * 0.7;
        const tint = Math.random();
        if (tint < 0.3) { col[i*3]=brightness*0.7; col[i*3+1]=brightness*0.8; col[i*3+2]=brightness; }
        else if (tint < 0.6) { col[i*3]=brightness; col[i*3+1]=brightness*0.9; col[i*3+2]=brightness*0.7; }
        else { col[i*3]=brightness*0.8; col[i*3+1]=brightness*0.85; col[i*3+2]=brightness; }
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.35,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
      });
      return new THREE.Points(geo, mat);
    }
    scene.add(createStars());

    // ─── Particle System ──────────────────────────────────────────────────────
    let N = PARAMS.particleCount;

    const positions   = new Float32Array(N * 3);
    const velocities  = new Float32Array(N * 3);
    const colors      = new Float32Array(N * 3);
    const sizes       = new Float32Array(N);
    const speeds      = new Float32Array(N);

    function randomInSphere(radius) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = Math.cbrt(Math.random()) * radius;
      return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)];
    }

    function initParticles() {
      for (let i = 0; i < N; i++) {
        const [x, y, z] = randomInSphere(18);
        positions[i*3]   = x;
        positions[i*3+1] = y;
        positions[i*3+2] = z;
        velocities[i*3]  = (Math.random() - 0.5) * 0.01;
        velocities[i*3+1]= (Math.random() - 0.5) * 0.01;
        velocities[i*3+2]= (Math.random() - 0.5) * 0.01;
        colors[i*3]  = 0.0; colors[i*3+1] = 0.4; colors[i*3+2] = 1.0;
        sizes[i]     = 0.5 + Math.random() * 1.5;
        speeds[i]    = 0.0;
      }
    }
    initParticles();

    // Sphere geometry for instanced rendering
    const sphereGeo = new THREE.SphereGeometry(1, 6, 6);
    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = length(mvPosition.xyz);
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 30.0);
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = smoothstep(80.0, 10.0, dist);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          float circle = 1.0 - smoothstep(0.3, 0.5, d);
          float glow   = exp(-d * 5.0) * 0.6;
          float alpha  = (circle + glow) * vAlpha;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor * (1.0 + glow * 1.5), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Use Points with custom shader for best performance with 200k particles
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlePoints);

    // ─── Color Mapping ───────────────────────────────────────────────────────
    // blue(0) → cyan → green → yellow → red(1)
    function speedToColor(speed, colorArr, idx) {
      const t = Math.min(speed / 3.0, 1.0);
      let r, g, b;
      if (t < 0.25) {
        const s = t / 0.25;
        r = 0.0; g = s * 0.7; b = 1.0;
      } else if (t < 0.5) {
        const s = (t - 0.25) / 0.25;
        r = 0.0; g = 0.7 + s * 0.3; b = 1.0 - s;
      } else if (t < 0.75) {
        const s = (t - 0.5) / 0.25;
        r = s; g = 1.0; b = 0.0;
      } else {
        const s = (t - 0.75) / 0.25;
        r = 1.0; g = 1.0 - s * 0.7; b = 0.0;
      }
      // Apply color shift
      const shift = PARAMS.colorShift * 0.3;
      r = Math.min(1, Math.max(0, r + shift));
      g = Math.min(1, Math.max(0, g - shift * 0.5));
      b = Math.min(1, Math.max(0, b - shift));
      colorArr[idx]   = r;
      colorArr[idx+1] = g;
      colorArr[idx+2] = b;
    }

    // ─── Mouse / Force Field ──────────────────────────────────────────────────
    const mouse = new THREE.Vector2(9999, 9999);
    const mouseWorld = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const attractPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    let mouseDown = false;
    let rightMouseDown = false;

    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(attractPlane, mouseWorld);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) mouseDown = true;
      if (e.button === 2) rightMouseDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) mouseDown = false;
      if (e.button === 2) rightMouseDown = false;
    });
    window.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); PARAMS.stormBurst = true; }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') PARAMS.stormBurst = false;
    });

    // ─── GUI ──────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: '🌪 Particle Storm' });
    gui.add(PARAMS, 'particleCount', 10000, 400000, 1000).name('Particle Count').onChange(() => {
      rebuildParticles();
    });
    gui.add(PARAMS, 'turbulenceScale', 0.1, 5.0).name('Turbulence Scale');
    gui.add(PARAMS, 'flowSpeed', 0.05, 3.0).name('Flow Speed');
    gui.add(PARAMS, 'attractorStrength', 0.0, 5.0).name('Attractor Strength');
    gui.add(PARAMS, 'attractorRadius', 2.0, 30.0).name('Attractor Radius');
    gui.add(PARAMS, 'bloomStrength', 0.0, 3.0).name('Bloom Strength').onChange(v => {
      bloomPass.strength = v;
    });
    gui.add(PARAMS, 'bloomRadius', 0.1, 1.5).name('Bloom Radius').onChange(v => {
      bloomPass.radius = v;
    });
    gui.add(PARAMS, 'bloomThreshold', 0.0, 1.0).name('Bloom Threshold').onChange(v => {
      bloomPass.threshold = v;
    });
    gui.add(PARAMS, 'colorShift', -1.0, 1.0).name('Color Shift');
    gui.add(PARAMS, 'stormBurst').name('Storm Burst (Space)');

    function rebuildParticles() {
      N = PARAMS.particleCount;
      for (let i = 0; i < N; i++) {
        const [x, y, z] = randomInSphere(18);
        positions[i*3]   = x;
        positions[i*3+1] = y;
        positions[i*3+2] = z;
        velocities[i*3]  = (Math.random() - 0.5) * 0.01;
        velocities[i*3+1]= (Math.random() - 0.5) * 0.01;
        velocities[i*3+2]= (Math.random() - 0.5) * 0.01;
        speeds[i] = 0;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
      particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      particleGeo.attributes.position.needsUpdate = true;
    }

    // ─── Animation Loop ───────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let frameCount = 0, fpsTime = 0;

    function animate() {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const time  = clock.getElapsedTime();

      controls.update();

      // FPS counter
      frameCount++;
      fpsTime += delta;
      if (fpsTime >= 0.5) {
        document.getElementById('fps').textContent = `FPS: ${Math.round(frameCount / fpsTime)}`;
        document.getElementById('particles').textContent = `Particles: ${N.toLocaleString()}`;
        frameCount = 0; fpsTime = 0;
      }

      particleMat.uniforms.uTime.value = time;

      // Storm burst force
      const burstMult = PARAMS.stormBurst ? 4.0 : 1.0;

      // Update each particle
      const ts = PARAMS.turbulenceScale;
      const fs = PARAMS.flowSpeed * burstMult;
      const as = PARAMS.attractorStrength;
      const ar = PARAMS.attractorRadius;

      for (let i = 0; i < N; i++) {
        const px = positions[i*3];
        const py = positions[i*3+1];
        const pz = positions[i*3+2];

        // Sample noise field at 4 octaves for turbulence
        const nx = fbm(px * 0.05 * ts + time * 0.08, py * 0.05 * ts, pz * 0.05 * ts, 4);
        const ny = fbm(px * 0.05 * ts, py * 0.05 * ts + time * 0.08 + 7.3, pz * 0.05 * ts, 4);
        const nz = fbm(px * 0.05 * ts, py * 0.05 * ts, pz * 0.05 * ts + time * 0.08 + 14.7, 4);

        // Flow direction (curl-like from noise gradient)
        const cUrlX = fbm(px * 0.04 * ts + 2.1, py * 0.04 * ts + time * 0.05, pz * 0.04 * ts) - nx;
        const cUrlY = fbm(px * 0.04 * ts, py * 0.04 * ts + 2.1, pz * 0.04 * ts + time * 0.05 + 3.7) - ny;
        const cUrlZ = fbm(px * 0.04 * ts + time * 0.05 + 7.1, py * 0.04 * ts, pz * 0.04 * ts + 2.1) - nz;

        let vx = velocities[i*3]   + (nx * 0.08 + cUrlX * 0.05) * fs;
        let vy = velocities[i*3+1] + (ny * 0.08 + cUrlY * 0.05) * fs;
        let vz = velocities[i*3+2] + (nz * 0.08 + cUrlZ * 0.05) * fs;

        // Mouse attractor / repulsor
        if (as > 0) {
          const dx = mouseWorld.x - px;
          const dy = mouseWorld.y - py;
          const dz = mouseWorld.z - pz;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.01;
          const strength = as / (1.0 + dist * dist * 0.05);
          const dir = (mouseDown ? -1 : rightMouseDown ? 1 : 0);
          const sign = (dist < ar) ? -1 : 1; // attract inside radius, repel outside
          const finalSign = dir !== 0 ? -dir : sign;
          vx += (dx / dist) * strength * 0.1 * finalSign;
          vy += (dy / dist) * strength * 0.1 * finalSign;
          vz += (dz / dist) * strength * 0.1 * finalSign;
        }

        // Damping
        const damp = 0.97;
        vx *= damp; vy *= damp; vz *= damp;

        // Speed clamp
        const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);
        const maxSpeed = 3.0 * burstMult;
        if (speed > maxSpeed) {
          vx = (vx / speed) * maxSpeed;
          vy = (vy / speed) * maxSpeed;
          vz = (vz / speed) * maxSpeed;
        }

        velocities[i*3]   = vx;
        velocities[i*3+1]= vy;
        velocities[i*3+2]= vz;

        positions[i*3]   = px + vx;
        positions[i*3+1] = py + vy;
        positions[i*3+2] = pz + vz;

        // Wrap particles back into spawn sphere if they drift too far
        const distFromCenter = Math.sqrt(px*px + py*py + pz*pz);
        if (distFromCenter > 50) {
          const [nx2, ny2, nz2] = randomInSphere(15);
          positions[i*3]   = nx2;
          positions[i*3+1] = ny2;
          positions[i*3+2] = nz2;
          velocities[i*3]  = 0; velocities[i*3+1] = 0; velocities[i*3+2] = 0;
        }

        speeds[i] = speed;
        speedToColor(speed, colors, i * 3);
      }

      particleGeo.attributes.position.needsUpdate = true;
      particleGeo.attributes.aColor.needsUpdate = true;

      composer.render();
    }

    animate();

    // ─── Resize ───────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    });