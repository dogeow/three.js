import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
    import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

    // ── Vertex Shader ──────────────────────────────────────────────────────────
    const vertexShader = /* glsl */`
      precision highp float;

      uniform float uTime;
      uniform float uGravity;
      uniform float uWind;
      uniform float uBurstProgress;

      attribute vec3  aOffset;
      attribute vec3  aVelocity;
      attribute vec4  aColor;
      attribute float aSize;
      attribute float aRotSpeed;
      attribute float aPhase;

      varying vec2  vUv;
      varying vec4  vColor;
      varying float vAlpha;

      void main() {
        vUv   = uv;
        vColor = aColor;

        // ── physics on the GPU ──────────────────────────────────────────────
        float t        = uTime + aPhase * 6.2832;
        float fallTime = uTime * 0.4 + aPhase * 3.0;

        // gravity + initial velocity → position
        float y = aOffset.y
                - uGravity * fallTime * fallTime * 0.5
                + aVelocity.y * fallTime;

        // wind (stronger at top, sinusoidal in time)
        float windX = uWind * (1.0 - clamp(y / 60.0, 0.0, 1.0))
                    * sin(t * 0.7 + aPhase * 6.28) * 4.0;
        float windZ = uWind * (1.0 - clamp(y / 60.0, 0.0, 1.0))
                    * cos(t * 0.5 + aPhase * 4.0) * 2.0;

        float x = aOffset.x + aVelocity.x * fallTime * 0.3 + windX;
        float z = aOffset.z + aVelocity.z * fallTime * 0.3 + windZ;

        // ── flutter: rapid oscillating horizontal nudge ────────────────────
        float flutter = sin(t * 5.0 + aPhase * 20.0) * 0.08;
        x += flutter;
        z += cos(t * 4.3 + aPhase * 15.0) * 0.05;

        // ── burst: push from above ──────────────────────────────────────────
        if (uBurstProgress < 1.0) {
          float bp = uBurstProgress;
          float topY = mix(40.0, 55.0, fract(aPhase * 7.3));
          y = mix(topY, y, bp);
          x = mix(fract(aPhase * 31.7) * 60.0 - 30.0, x, bp);
          z = mix(fract(aPhase * 17.3) * 60.0 - 30.0, z, bp);
        }

        // wrap vertically so particles never disappear
        y = mod(y + 60.0, 120.0) - 60.0;

        // ── angular rotation in shader (2-D sprite rotation via scale) ─────
        float angle = uTime * aRotSpeed * 2.0 + aPhase * 6.28;
        float ca    = cos(angle);
        float sa    = sin(angle);
        mat2  rot   = mat2(ca, -sa, sa, ca);

        // ── instance transform ─────────────────────────────────────────────
        vec2 rotatedPos = rot * position.xy * aSize;
        vec3 worldPos   = vec3(x + rotatedPos.x, y, z + rotatedPos.y);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);

        // size attenuation
        gl_PointSize = aSize * 220.0 / gl_Position.z;

        // fade near floor / ceiling
        vAlpha = 0.55 + 0.45 * sin(t * 1.3 + aPhase * 3.14);
      }
    `;

    // ── Fragment Shader ────────────────────────────────────────────────────────
    const fragmentShader = /* glsl */`
      precision highp float;

      varying vec2  vUv;
      varying vec4  vColor;
      varying float vAlpha;

      void main() {
        // rectangular mask (discard corners)
        vec2 p = vUv * 2.0 - 1.0;
        if (abs(p.x) > 1.0 || abs(p.y) > 1.0) discard;

        gl_FragColor = vec4(vColor.rgb, vAlpha * vColor.a);
      }
    `;

    // ── Setup ───────────────────────────────────────────────────────────────────
    const W = window.innerWidth, H = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x020408);
    document.body.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x020408, 0.006);

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 500);
    camera.position.set(0, 25, 75);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.85;

    // ── Post-processing ─────────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(W, H), 0.85, 0.4, 0.2
    );
    composer.addPass(bloomPass);

    // ── Confetti Geometry (InstancedMesh) ───────────────────────────────────────
    const N = 6000;

    const geo = new THREE.PlaneGeometry(1, 1, 1, 1);

    // per-instance attributes
    const offsets    = new Float32Array(N * 3);
    const velocities = new Float32Array(N * 3);
    const colors     = new Float32Array(N * 4);
    const sizes      = new Float32Array(N);
    const rotSpeeds  = new Float32Array(N);
    const phases     = new Float32Array(N);

    const confettiColors = [
      0xff3b5c, 0xff9f43, 0xffeb3b, 0x4caf50,
      0x00bcd4, 0x2196f3, 0x9c27b0, 0xff80ab,
      0x76ff03, 0x00e5ff, 0xff6e40, 0xe040fb,
    ];

    for (let i = 0; i < N; i++) {
      offsets[i * 3]     = (Math.random() - 0.5) * 60;
      offsets[i * 3 + 1] = Math.random() * 120 - 60;
      offsets[i * 3 + 2] = (Math.random() - 0.5) * 60;

      velocities[i * 3]     = (Math.random() - 0.5) * 4;
      velocities[i * 3 + 1] = -Math.random() * 3 - 1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 4;

      const c = new THREE.Color(confettiColors[i % confettiColors.length]);
      const bright = 0.8 + Math.random() * 0.2;
      colors[i * 4]     = c.r * bright;
      colors[i * 4 + 1] = c.g * bright;
      colors[i * 4 + 2] = c.b * bright;
      colors[i * 4 + 3] = 0.7 + Math.random() * 0.3;

      sizes[i]     = 0.25 + Math.random() * 0.55;
      rotSpeeds[i] = (Math.random() - 0.5) * 4;
      phases[i]    = Math.random();
    }

    geo.setAttribute('aOffset',    new THREE.InstancedBufferAttribute(offsets,    3));
    geo.setAttribute('aVelocity',   new THREE.InstancedBufferAttribute(velocities, 3));
    geo.setAttribute('aColor',      new THREE.InstancedBufferAttribute(colors,     4));
    geo.setAttribute('aSize',       new THREE.InstancedBufferAttribute(sizes,      1));
    geo.setAttribute('aRotSpeed',   new THREE.InstancedBufferAttribute(rotSpeeds,  1));
    geo.setAttribute('aPhase',      new THREE.InstancedBufferAttribute(phases,     1));

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime:          { value: 0 },
        uGravity:       { value: 4.5 },
        uWind:          { value: 1.8 },
        uBurstProgress: { value: 1.0 },
      },
      transparent:  true,
      depthWrite:   false,
      blending:     THREE.AdditiveBlending,
      side:         THREE.DoubleSide,
    });

    const mesh = new THREE.InstancedMesh(geo, mat, N);
    // dummy identity matrix per instance (transform done in shader)
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) mesh.setMatrixAt(i, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);

    // ── GUI ─────────────────────────────────────────────────────────────────────
    const params = {
      gravity:      4.5,
      wind:         1.8,
      particleCount: 6000,
      confettiSize: 0.4,
      burst:        false,
    };

    const gui = new GUI({ title: '🎊 Confetti Controls', width: 240 });
    gui.add(params, 'gravity',      0, 20, 0.1).name('Gravity').onChange(v => mat.uniforms.uGravity.value = v);
    gui.add(params, 'wind',         0,  8, 0.1).name('Wind').onChange(v => mat.uniforms.uWind.value = v);
    gui.add(params, 'confettiSize', 0.1, 1.5, 0.05).name('Size').onChange(v => {
      for (let i = 0; i < N; i++) sizes[i] = v * (0.6 + Math.random() * 0.8);
      geo.attributes.aSize.needsUpdate = true;
    });
    gui.add(params, 'burst').name('🔥 Burst (click canvas)');
    gui.add({ reset: () => {
      mat.uniforms.uGravity.value = 4.5;
      mat.uniforms.uWind.value    = 1.8;
      params.gravity = 4.5;
      params.wind    = 1.8;
      gui.controllersRecursive().forEach(c => c.updateDisplay());
    }}).name('↺ Reset').close();

    // ── Burst Animation ─────────────────────────────────────────────────────────
    let bursting = false;
    let burstStart = 0;

    function triggerBurst() {
      bursting    = true;
      burstStart   = performance.now();
      // randomise offsets/velocities for burst feel
      for (let i = 0; i < N; i++) {
        offsets[i * 3]     = (Math.random() - 0.5) * 60;
        offsets[i * 3 + 1] = 40 + Math.random() * 20;
        offsets[i * 3 + 2] = (Math.random() - 0.5) * 60;
        velocities[i * 3]     = (Math.random() - 0.5) * 8;
        velocities[i * 3 + 1] = -Math.random() * 2 - 4;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 8;
      }
      geo.attributes.aOffset.needsUpdate  = true;
      geo.attributes.aVelocity.needsUpdate = true;
    }

    window.addEventListener('click', triggerBurst);
    window.addEventListener('touchend', triggerBurst, { passive: true });

    // ── Resize ──────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    });

    // ── Animation Loop ──────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      mat.uniforms.uTime.value = elapsed;

      if (bursting) {
        const dur = 2.8; // seconds
        const progress = Math.min((performance.now() - burstStart) / 1000 / dur, 1.0);
        mat.uniforms.uBurstProgress.value = progress;
        if (progress >= 1.0) {
          bursting = false;
          mat.uniforms.uBurstProgress.value = 1.0;
        }
      }

      controls.update();
      composer.render();
    }

    animate();