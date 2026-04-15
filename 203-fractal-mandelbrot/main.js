import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

    // ─── Debug vars (exposed to window) ───────────────────────────────────────
    window._debug = {
      lastFrameTime: 0,
      frameCount: 0,
      fps: 0,
    };

    // ─── Scene setup ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.015);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 500);
    camera.position.set(0, 1.8, 2.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.minDistance = 0.5;
    controls.maxDistance = 10;

    // ─── Lights ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x334466, 0.5));
    const dirLight = new THREE.DirectionalLight(0x8899ff, 0.8);
    dirLight.position.set(2, 4, 2);
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x4477ff, 1.0, 20);
    pointLight.position.set(-1, 2, 1);
    scene.add(pointLight);

    // ─── Params ────────────────────────────────────────────────────────────────
    const params = {
      maxIterations: 150,
      zoom: 1.0,
      colorScheme: 'Blue Fire',
    };

    const COLOR_SCHEMES = {
      'Blue Fire': [
        new THREE.Color(0x050520),
        new THREE.Color(0x0a1a6e),
        new THREE.Color(0x1a3acc),
        new THREE.Color(0x4488ff),
        new THREE.Color(0x88ccff),
        new THREE.Color(0xffffff),
        new THREE.Color(0xffee55),
      ],
      'Ember': [
        new THREE.Color(0x0a0005),
        new THREE.Color(0x3a0010),
        new THREE.Color(0x8b0020),
        new THREE.Color(0xe03030),
        new THREE.Color(0xff7700),
        new THREE.Color(0xffee55),
        new THREE.Color(0xffffff),
      ],
      'Aurora': [
        new THREE.Color(0x001015),
        new THREE.Color(0x003040),
        new THREE.Color(0x006655),
        new THREE.Color(0x00cc88),
        new THREE.Color(0x55ffaa),
        new THREE.Color(0xaaffcc),
        new THREE.Color(0xffffff),
      ],
    };

    // ─── Shader ─────────────────────────────────────────────────────────────────
    const vertexShader = /* glsl */`
      precision highp float;

      uniform float uMaxIterations;
      uniform float uZoom;
      uniform vec2  uCenter;

      varying float vIterations;
      varying float vNormalized;
      varying vec2  vUv;

      // Mandelbrot iteration — returns normalized iteration count [0,1]
      float mandelbrot(vec2 c) {
        vec2 z = vec2(0.0);
        float iter = 0.0;
        const float B = 256.0;
        for (float i = 0.0; i < 1000.0; i++) {
          if (i >= uMaxIterations) break;
          z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
          if (dot(z, z) > B * B) {
            // Smooth iteration count for anti-aliased boundary
            float mu = i - log2(log2(dot(z,z))) + 4.0;
            return mu / uMaxIterations;
          }
          iter = i;
        }
        return -1.0; // inside set
      }

      void main() {
        vec2 uv = uv;

        // Map UV to complex plane
        float scale = 3.5 / uZoom;
        vec2 c = (uv - 0.5) * scale - uCenter;

        float m = mandelbrot(c);

        vUv = uv;
        vIterations = m < 0.0 ? uMaxIterations : m * uMaxIterations;
        vNormalized = m < 0.0 ? 1.0 : m;

        // Displace Z: height based on iteration count
        float height = (m < 0.0) ? 0.05 : pow(m, 0.55) * 1.8;
        vec3 pos = position;
        pos.z = height;

        // Flip so high values rise toward camera
        pos.z *= -1.0;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = /* glsl */`
      precision highp float;

      uniform vec3  uColor0;
      uniform vec3  uColor1;
      uniform vec3  uColor2;
      uniform vec3  uColor3;
      uniform vec3  uColor4;
      uniform vec3  uColor5;
      uniform vec3  uColor6;
      uniform float uSpecular;

      varying float vIterations;
      varying float vNormalized;
      varying vec2  vUv;

      vec3 palette(float t) {
        t = clamp(t, 0.0, 1.0);
        if (t < 0.143) return mix(uColor0, uColor1, t / 0.143);
        if (t < 0.286) return mix(uColor1, uColor2, (t - 0.143) / 0.143);
        if (t < 0.429) return mix(uColor2, uColor3, (t - 0.286) / 0.143);
        if (t < 0.571) return mix(uColor3, uColor4, (t - 0.429) / 0.143);
        if (t < 0.714) return mix(uColor4, uColor5, (t - 0.571) / 0.143);
        if (t < 0.857) return mix(uColor5, uColor6, (t - 0.714) / 0.143);
        return uColor6;
      }

      void main() {
        float t = vNormalized;

        // Inside set — deep dark
        if (vIterations >= 999.0) {
          gl_FragColor = vec4(uColor0 * 0.3, 1.0);
          return;
        }

        vec3 col = palette(t);

        // Simple lighting
        vec3 normal = normalize(vec3(0.0, 0.0, 1.0));
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
        float diff = max(dot(normal, lightDir), 0.0) * 0.6 + 0.4;
        float spec = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 16.0) * uSpecular;
        col = col * diff + spec;

        // Slight edge glow
        float rim = 1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0)));
        col += rim * col * 0.15;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    // ─── Build color uniforms from scheme ───────────────────────────────────────
    function buildColorUniforms(schemeName) {
      const scheme = COLOR_SCHEMES[schemeName];
      const names = ['uColor0','uColor1','uColor2','uColor3','uColor4','uColor5','uColor6'];
      const uniforms = {};
      scheme.forEach((c, i) => { uniforms[names[i]] = { value: c.clone() }; });
      return uniforms;
    }

    const colorUniforms = buildColorUniforms(params.colorScheme);

    const uniforms = {
      uMaxIterations: { value: params.maxIterations },
      uZoom:          { value: params.zoom },
      uCenter:        { value: new THREE.Vector2(-0.5, 0.0) },
      uSpecular:      { value: 0.3 },
      ...colorUniforms,
    };

    // ─── Geometry + Mesh ───────────────────────────────────────────────────────
    const geo = new THREE.PlaneGeometry(2, 2, 400, 400);
    // PlaneGeometry default: vertices at z=0, width along X, height along Y
    // We'll use UV mapping for complex plane

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // ─── Grid helper (decorative) ──────────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(4, 20, 0x112244, 0x080820);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // ─── GUI ────────────────────────────────────────────────────────────────────
    const gui = new GUI();
    gui.add(params, 'maxIterations', 50, 500, 1).name('迭代次数').onChange(v => {
      uniforms.uMaxIterations.value = v;
    });
    gui.add(params, 'zoom', 0.1, 10, 0.05).name('缩放').onChange(v => {
      uniforms.uZoom.value = v;
    });
    gui.add(params, 'colorScheme', Object.keys(COLOR_SCHEMES)).name('配色方案').onChange(v => {
      const newColors = buildColorUniforms(v);
      Object.assign(uniforms, newColors);
      // Replace old color uniforms with new ones
      for (const key in newColors) {
        uniforms[key] = newColors[key];
      }
    });

    // ─── Resize ─────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── Animation loop ─────────────────────────────────────────────────────────
    let lastTime = performance.now();
    let frameCount = 0;

    function animate() {
      requestAnimationFrame(animate);

      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        window._debug.fps = frameCount;
        window._debug.frameCount = frameCount;
        frameCount = 0;
        lastTime = now;
      }

      controls.update();
      renderer.render(scene, camera);

      window._debug.lastFrameTime = now;
    }

    animate();