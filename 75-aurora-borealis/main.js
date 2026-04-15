import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    // ═══════════════════════════════════════════════════════════════
    //  SHADERS
    // ═══════════════════════════════════════════════════════════════

    const AURORA_VERT = /* glsl */`
      uniform float uTime;
      uniform float uNoiseScale;
      uniform float uWaveAmplitude;
      uniform float uIntensity;

      varying vec2 vUv;
      varying float vNoise;
      varying float vY;

      // Hash
      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      // Gradient noise
      float gradientNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
              dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
          mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
              dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      // FBM
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 6; i++) {
          v += a * gradientNoise(p);
          p = rot * p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vUv = uv;
        vY = position.y;

        vec3 pos = position;

        // FBM horizontal displacement
        float noise = fbm(vec2(pos.x * uNoiseScale, uTime * 0.25));
        vNoise = noise;
        pos.x += noise * uWaveAmplitude;

        // Vertical wave along the ribbon
        pos.x += sin(pos.y * 1.8 + uTime * 0.6) * 0.4;
        // Secondary ripple
        pos.x += sin(pos.y * 4.5 + uTime * 1.2) * 0.15;

        // Subtle breathing scale
        float breathe = 1.0 + sin(uTime * 0.3) * 0.03;
        pos.y *= breathe;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const AURORA_FRAG = /* glsl */`
      uniform vec3 uColorLow;
      uniform vec3 uColorHigh;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uIntensity;
      uniform int uColorScheme; // 0=green, 1=cyan, 2=mixed, 3=pink

      varying vec2 vUv;
      varying float vNoise;
      varying float vY;

      void main() {
        float t = smoothstep(0.0, 1.0, vUv.y);

        // Color schemes
        vec3 lowColor;
        vec3 highColor;

        if (uColorScheme == 0) {
          // Green aurora
          lowColor = vec3(0.05, 0.5, 0.15);
          highColor = vec3(0.1, 0.8, 0.5);
        } else if (uColorScheme == 1) {
          // Cyan aurora
          lowColor = vec3(0.0, 0.4, 0.6);
          highColor = vec3(0.2, 0.7, 0.9);
        } else if (uColorScheme == 2) {
          // Mixed green-cyan-purple
          lowColor = vec3(0.0, 0.5, 0.3);
          highColor = vec3(0.3, 0.1, 0.7);
        } else {
          // Pink-magenta
          lowColor = vec3(0.5, 0.05, 0.3);
          highColor = vec3(0.9, 0.2, 0.6);
        }

        vec3 color = mix(uColorLow, uColorHigh, t);
        if (uColorScheme == 2) {
          color = mix(lowColor, highColor, t);
        } else if (uColorScheme == 3) {
          color = mix(lowColor, highColor, t);
        } else {
          color = mix(lowColor, highColor, t);
        }

        // Vertical curtain fade (sin shape)
        float vertFade = sin(vUv.y * 3.14159);
        vertFade = pow(vertFade, 0.7);

        // Horizontal shimmer
        float shimmer = 0.5 + 0.5 * sin(vUv.x * 18.0 + uTime * 1.5 + vNoise * 10.0);
        shimmer = pow(shimmer, 2.0);

        // FBM variation
        float noiseFade = 0.6 + 0.4 * (vNoise * 0.5 + 0.5);

        // Pulsing intensity
        float pulse = 0.85 + 0.15 * sin(uTime * 0.4 + vUv.x * 5.0);

        float alpha = uOpacity * vertFade * (0.4 + 0.6 * shimmer) * noiseFade * pulse;
        alpha *= uIntensity;

        // Inner glow
        color += color * 0.6;
        // Extra hot spots
        color += vec3(0.1, 0.3, 0.2) * shimmer * 0.4;

        gl_FragColor = vec4(color, alpha);
      }
    `;

    const STAR_VERT = /* glsl */`
      attribute float aSize;
      attribute float aBrightness;
      varying float vBrightness;
      uniform float uTime;

      void main() {
        vBrightness = aBrightness;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `;

    const STAR_FRAG = /* glsl */`
      varying float vBrightness;
      uniform float uTime;

      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;

        // Soft glow
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        glow = pow(glow, 1.8);

        // Twinkle
        float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + vBrightness * 100.0);

        float alpha = glow * vBrightness * twinkle;
        vec3 color = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.95, 0.8), vBrightness);

        gl_FragColor = vec4(color, alpha);
      }
    `;

    const GROUND_VERT = /* glsl */`
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const GROUND_FRAG = /* glsl */`
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        // Snow/ice base
        vec3 snowColor = vec3(0.85, 0.9, 0.95);
        vec3 iceColor = vec3(0.6, 0.75, 0.85);

        float pattern = hash(floor(vUv * 50.0));
        vec3 baseColor = mix(iceColor, snowColor, pattern);

        // Fresnel-like edge glow from aurora reflection
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0))), 3.0);
        vec3 auroraReflect = vec3(0.05, 0.3, 0.15) * fresnel * 0.4;

        gl_FragColor = vec4(baseColor + auroraReflect, 1.0);
      }
    `;

    const MOUNTAIN_VERT = /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const MOUNTAIN_FRAG = /* glsl */`
      varying vec2 vUv;
      uniform vec3 uColor;
      void main() {
        float fade = 1.0 - vUv.y * 0.5;
        gl_FragColor = vec4(uColor * fade, fade * 0.9);
      }
    `;

    // ═══════════════════════════════════════════════════════════════
    //  SCENE SETUP
    // ═══════════════════════════════════════════════════════════════

    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020510);
    scene.fog = new THREE.FogExp2(0x020510, 0.008);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 15);
    camera.lookAt(0, 20, -30);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 15, -20);
    controls.maxPolarAngle = Math.PI * 0.7;
    controls.minDistance = 5;
    controls.maxDistance = 60;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const clock = new THREE.Clock();

    // ═══════════════════════════════════════════════════════════════
    //  SKY BACKGROUND GRADIENT
    // ═══════════════════════════════════════════════════════════════

    const skyGeo = new THREE.SphereGeometry(400, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vWorldPos;
        void main() {
          float t = clamp(vWorldPos.y / 300.0, 0.0, 1.0);
          vec3 bottomColor = vec3(0.005, 0.01, 0.03);
          vec3 midColor = vec3(0.008, 0.015, 0.05);
          vec3 topColor = vec3(0.01, 0.005, 0.02);
          vec3 color = mix(bottomColor, midColor, smoothstep(0.0, 0.4, t));
          color = mix(color, topColor, smoothstep(0.4, 1.0, t));
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // ═══════════════════════════════════════════════════════════════
    //  STARS
    // ═══════════════════════════════════════════════════════════════

    const STAR_COUNT = 4000;
    const starPositions = new Float32Array(STAR_COUNT * 3);
    const starSizes = new Float32Array(STAR_COUNT);
    const starBrightness = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      // Distribute in upper hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5 + 0.1; // Upper hemisphere only
      const r = 350 + Math.random() * 30;

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      starSizes[i] = 0.5 + Math.random() * 2.5;
      starBrightness[i] = 0.2 + Math.random() * 0.8;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    starGeo.setAttribute('aBrightness', new THREE.BufferAttribute(starBrightness, 1));

    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ═══════════════════════════════════════════════════════════════
    //  AURORA CURTAINS
    // ═══════════════════════════════════════════════════════════════

    const auroraUniforms = [];

    const curtainConfigs = [
      // x, y, z, width, height, rotY, rotZ, opacity, zOrder
      { x: -40, y: 25, z: -80, w: 100, h: 60, ry: 0.3, rz: 0.1, opacity: 0.35, scale: 1.0 },
      { x: 30, y: 30, z: -70, w: 120, h: 70, ry: -0.2, rz: -0.08, opacity: 0.4, scale: 1.2 },
      { x: -20, y: 20, z: -60, w: 90, h: 55, ry: 0.15, rz: 0.05, opacity: 0.3, scale: 0.9 },
      { x: 10, y: 35, z: -90, w: 110, h: 80, ry: -0.1, rz: -0.12, opacity: 0.45, scale: 1.1 },
      { x: -60, y: 22, z: -50, w: 80, h: 50, ry: 0.5, rz: 0.15, opacity: 0.25, scale: 0.8 },
      { x: 50, y: 28, z: -75, w: 95, h: 65, ry: -0.35, rz: 0.1, opacity: 0.38, scale: 1.0 },
      { x: 0, y: 40, z: -100, w: 130, h: 85, ry: 0.05, rz: -0.05, opacity: 0.3, scale: 1.3 },
      { x: -30, y: 18, z: -55, w: 70, h: 45, ry: 0.2, rz: 0.2, opacity: 0.22, scale: 0.7 },
    ];

    curtainConfigs.forEach((cfg, idx) => {
      const geo = new THREE.PlaneGeometry(cfg.w, cfg.h, 64, 48);

      const uniforms = {
        uTime: { value: 0 },
        uNoiseScale: { value: 0.02 + Math.random() * 0.02 },
        uWaveAmplitude: { value: 4 + Math.random() * 3 },
        uColorLow: { value: new THREE.Color(0.05, 0.5, 0.15) },
        uColorHigh: { value: new THREE.Color(0.1, 0.8, 0.5) },
        uOpacity: { value: cfg.opacity },
        uIntensity: { value: 1.0 },
        uColorScheme: { value: 2 } // mixed
      };

      auroraUniforms.push(uniforms);

      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: AURORA_VERT,
        fragmentShader: AURORA_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      mesh.rotation.y = cfg.ry;
      mesh.rotation.z = cfg.rz;
      mesh.scale.setScalar(cfg.scale);
      mesh.renderOrder = idx;
      scene.add(mesh);
    });

    // Secondary inner glow layers
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(150, 80, 48, 32);
      const uniforms = {
        uTime: { value: 0 },
        uNoiseScale: { value: 0.015 },
        uWaveAmplitude: { value: 6 },
        uColorLow: { value: new THREE.Color(0.0, 0.3, 0.2) },
        uColorHigh: { value: new THREE.Color(0.05, 0.15, 0.3) },
        uOpacity: { value: 0.12 },
        uIntensity: { value: 1.0 },
        uColorScheme: { value: 1 }
      };
      auroraUniforms.push(uniforms);

      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: AURORA_VERT,
        fragmentShader: AURORA_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((i - 1.5) * 30, 30, -70 - i * 8);
      mesh.rotation.y = (i - 1.5) * 0.1;
      mesh.renderOrder = 20;
      scene.add(mesh);
    }

    // ═══════════════════════════════════════════════════════════════
    //  MOUNTAINS
    // ═══════════════════════════════════════════════════════════════

    const mountainData = [
      { x: -80, z: -40, w: 60, h: 25, color: new THREE.Color(0.03, 0.04, 0.08) },
      { x: -40, z: -35, w: 45, h: 18, color: new THREE.Color(0.025, 0.035, 0.07) },
      { x: -10, z: -38, w: 55, h: 22, color: new THREE.Color(0.02, 0.03, 0.06) },
      { x: 25, z: -32, w: 50, h: 20, color: new THREE.Color(0.03, 0.04, 0.08) },
      { x: 55, z: -36, w: 65, h: 28, color: new THREE.Color(0.025, 0.035, 0.07) },
      { x: 90, z: -40, w: 50, h: 20, color: new THREE.Color(0.02, 0.03, 0.06) },
      { x: -100, z: -45, w: 70, h: 30, color: new THREE.Color(0.015, 0.02, 0.04) },
      { x: 110, z: -42, w: 60, h: 24, color: new THREE.Color(0.015, 0.02, 0.04) },
    ];

    mountainData.forEach(m => {
      const shape = new THREE.Shape();
      shape.moveTo(-m.w / 2, 0);
      shape.lineTo(0, m.h);
      shape.lineTo(m.w / 2, 0);
      shape.closePath();

      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: m.color } },
        vertexShader: MOUNTAIN_VERT,
        fragmentShader: MOUNTAIN_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(m.x, 0, m.z);
      mesh.rotation.y = Math.random() * 0.3 - 0.15;
      scene.add(mesh);
    });

    // ═══════════════════════════════════════════════════════════════
    //  GROUND
    // ═══════════════════════════════════════════════════════════════

    const groundGeo = new THREE.PlaneGeometry(600, 600, 80, 80);
    const groundMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: GROUND_VERT,
      fragmentShader: GROUND_FRAG
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // ═══════════════════════════════════════════════════════════════
    //  DUST PARTICLES
    // ═══════════════════════════════════════════════════════════════

    const DUST_COUNT = 800;
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustSpeeds = new Float32Array(DUST_COUNT);
    const dustSizes = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 200;
      dustPositions[i * 3 + 1] = Math.random() * 60 + 2;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 200 - 20;
      dustSpeeds[i] = 0.5 + Math.random() * 1.5;
      dustSizes[i] = 0.3 + Math.random() * 0.8;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));

    const dustMat = new THREE.PointsMaterial({
      color: 0x88ffcc,
      size: 0.5,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ═══════════════════════════════════════════════════════════════
    //  GUI
    // ═══════════════════════════════════════════════════════════════

    const params = {
      auroraIntensity: 1.0,
      waveSpeed: 1.0,
      waveAmplitude: 1.0,
      colorScheme: 'mixed',
      showStars: true,
      showGround: true,
      dustOpacity: 0.4
    };

    const gui = new GUI({ title: 'Aurora Controls' });
    gui.domElement.style.fontFamily = '"Courier New", monospace';

    gui.add(params, 'auroraIntensity', 0.5, 2.0).name('Aurora Intensity').onChange(v => {
      auroraUniforms.forEach(u => { u.uIntensity.value = v; });
    });

    gui.add(params, 'waveSpeed', 0.1, 2.0).name('Wave Speed').onChange(v => {
      auroraUniforms.forEach((u, i) => {
        u.uTime.value *= (v / (auroraUniforms[i > 7 ? 0 : i] ? 1 : 1));
      });
    });

    gui.add(params, 'waveAmplitude', 0.1, 2.0).name('Wave Amplitude').onChange(v => {
      curtainConfigs.forEach((cfg, i) => {
        if (auroraUniforms[i]) {
          auroraUniforms[i].uWaveAmplitude.value = (4 + Math.random() * 3) * v;
        }
      });
    });

    gui.add(params, 'colorScheme', ['green', 'cyan', 'mixed', 'pink'])
      .name('Color Scheme')
      .onChange(v => {
        const map = { green: 0, cyan: 1, mixed: 2, pink: 3 };
        auroraUniforms.forEach(u => { u.uColorScheme.value = map[v]; });
      });

    gui.add(params, 'showStars').name('Show Stars').onChange(v => {
      stars.visible = v;
    });

    gui.add(params, 'showGround').name('Show Ground').onChange(v => {
      ground.visible = v;
    });

    gui.add(params, 'dustOpacity', 0, 1).name('Dust Opacity').onChange(v => {
      dustMat.opacity = v;
    });

    // ═══════════════════════════════════════════════════════════════
    //  RESIZE
    // ═══════════════════════════════════════════════════════════════

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ═══════════════════════════════════════════════════════════════
    //  ANIMATION LOOP
    // ═══════════════════════════════════════════════════════════════

    function animate() {
      requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta ? 0.016 : 0.016;

      // Update aurora uniforms
      auroraUniforms.forEach((u, i) => {
        const speedMult = params.waveSpeed;
        u.uTime.value = elapsed * speedMult;
      });

      // Update star twinkle
      starMat.uniforms.uTime.value = elapsed;

      // Animate dust particles
      const dustPos = dustGeo.attributes.position.array;
      for (let i = 0; i < DUST_COUNT; i++) {
        dustPos[i * 3 + 1] += dustSpeeds[i] * 0.02;
        dustPos[i * 3] += Math.sin(elapsed * 0.5 + i) * 0.01;
        if (dustPos[i * 3 + 1] > 65) {
          dustPos[i * 3 + 1] = 2;
          dustPos[i * 3] = (Math.random() - 0.5) * 200;
          dustPos[i * 3 + 2] = (Math.random() - 0.5) * 200 - 20;
        }
      }
      dustGeo.attributes.position.needsUpdate = true;

      // Subtle star movement
      stars.rotation.y = elapsed * 0.005;
      stars.rotation.x = Math.sin(elapsed * 0.02) * 0.02;

      controls.update();
      renderer.render(scene, camera);
    }

    animate();