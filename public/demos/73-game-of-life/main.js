import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    // ── Config ────────────────────────────────────────────────────────────────
    const GRID = 256;
    const CELL_SIZE = 0.1;
    const WORLD_SIZE = GRID * CELL_SIZE;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 16, 16);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0, 0);

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.012);

    // Lights
    scene.add(new THREE.AmbientLight(0x112233, 1.5));
    scene.add(new THREE.HemisphereLight(0x224466, 0x081020, 1.0));
    const ptLight = new THREE.PointLight(0x44ffcc, 80, 30);
    ptLight.position.set(0, 8, 0);
    scene.add(ptLight);

    // ── GPU Simulation (ping-pong) ────────────────────────────────────────────
    const simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const simScene = new THREE.Scene();
    const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    simScene.add(simQuad);

    function makeRT() {
      return new THREE.WebGLRenderTarget(GRID, GRID, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.UnsignedByteType,
        depthBuffer: false,
        stencilBuffer: false,
      });
    }

    const simRT = [makeRT(), makeRT()];
    let simIdx = 0;

    // ── Init texture (random seed) ───────────────────────────────────────────
    function buildInitTex() {
      const data = new Uint8Array(GRID * GRID * 4);
      for (let i = 0; i < GRID * GRID; i++) {
        const alive = Math.random() < 0.3 ? 1 : 0;
        // RGB = color tint, A = alive flag
        data[i * 4 + 0] = alive ? (80 + Math.random() * 175) : 0;   // R (cell color)
        data[i * 4 + 1] = alive ? (180 + Math.random() * 75) : 0;  // G
        data[i * 4 + 2] = alive ? (60 + Math.random() * 60) : 0;     // B
        data[i * 4 + 3] = alive;                                      // A (alive flag)
      }
      const tex = new THREE.DataTexture(data, GRID, GRID, THREE.RGBAFormat);
      tex.needsUpdate = true;
      return tex;
    }

    // Inject texture for mouse seeding
    function buildInjectTex(x, y, r, g, b) {
      const data = new Uint8Array(GRID * GRID * 4);
      const cx = Math.floor(x * GRID);
      const cy = Math.floor(y * GRID);
      const radius = 2;
      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          const px = (cx + i + GRID) % GRID;
          const py = (cy + j + GRID) % GRID;
          const idx = (py * GRID + px) * 4;
          const d = Math.sqrt(i * i + j * j);
          if (d <= radius) {
            data[idx + 0] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 1;
          }
        }
      }
      const tex = new THREE.DataTexture(data, GRID, GRID, THREE.RGBAFormat);
      tex.needsUpdate = true;
      return tex;
    }

    // ── Simulation Shaders ───────────────────────────────────────────────────
    const simVert = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    const lifeFrag = `
      precision highp float;
      uniform sampler2D uState;
      uniform sampler2D uInject;
      uniform vec2 uInjectPos;
      uniform float uInjectRadius;
      uniform bool uDoInject;
      varying vec2 vUv;

      void main() {
        vec4 current = texture2D(uState, vUv);

        // Inject cells from mouse (additive)
        if (uDoInject) {
          float d = distance(vUv, uInjectPos);
          if (d < uInjectRadius) {
            vec4 inj = texture2D(uInject, vUv);
            if (inj.a > 0.5) {
              gl_FragColor = vec4(inj.rgb, 1.0);
              return;
            }
          }
        }

        // Count alive neighbors (toroidal wrap)
        int neighbors = 0;
        float nx = 1.0 / float(${GRID});
        float ny = 1.0 / float(${GRID});

        #define ALIVE(ox, oy) step(0.5, texture2D(uState, fract(vUv + vec2(float(ox) * nx, float(oy) * ny))).a)

        neighbors += int(ALIVE(-1, -1));
        neighbors += int(ALIVE( 0, -1));
        neighbors += int(ALIVE( 1, -1));
        neighbors += int(ALIVE(-1,  0));
        neighbors += int(ALIVE( 1,  0));
        neighbors += int(ALIVE(-1,  1));
        neighbors += int(ALIVE( 0,  1));
        neighbors += int(ALIVE( 1,  1));

        bool alive = current.a > 0.5;

        // Conway's rules
        if (alive) {
          // Survive with 2 or 3 neighbors
          if (neighbors == 2 || neighbors == 3) {
            // Age the cell slightly (dim over time)
            vec3 aged = current.rgb * 0.998;
            gl_FragColor = vec4(aged, 1.0);
          } else {
            // Die — fade out
            gl_FragColor = vec4(current.rgb * 0.5, 0.0);
          }
        } else {
          // Birth if exactly 3 neighbors
          if (neighbors == 3) {
            // Newborn — bright
            float hue = fract(vUv.x + vUv.y);
            vec3 newborn = vec3(0.3, 1.0, 0.7);
            gl_FragColor = vec4(newborn, 1.0);
          } else {
            // Stay dead — keep previous color but clear alpha
            gl_FragColor = vec4(current.rgb * 0.98, 0.0);
          }
        }
      }
    `;

    const displayVert = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;

    const displayFrag = `
      precision highp float;
      uniform sampler2D uLifeTex;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      void main() {
        vec4 cell = texture2D(uLifeTex, vUv);
        float alive = cell.a;

        // Base dark plane
        vec3 baseCol = vec3(0.03, 0.03, 0.06);

        // Cell color (bright alive cells)
        vec3 cellCol = cell.rgb;
        float brightness = alive;

        // Mix: dead plane is dark, alive cells glow
        vec3 col = mix(baseCol, cellCol * 0.8, brightness);

        // Simple lighting
        vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
        float diff = max(dot(vNormal, lightDir), 0.0) * 0.6 + 0.4;
        col *= diff;

        // Top glow (alive cells brighter)
        col += cellCol * brightness * 0.3;

        // Grid lines (subtle)
        vec2 grid = fract(vUv * float(${GRID}));
        float line = step(0.95, max(grid.x, grid.y)) * (1.0 - brightness);
        col += vec3(0.02) * line;

        // Glow at cell centers (alive)
        float glow = alive * 0.4;
        col += vec3(0.0, 0.5, 0.3) * glow;

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;

    // ── Materials ──────────────────────────────────────────────────────────────
    const initTex = buildInitTex();

    const lifeMat = new THREE.ShaderMaterial({
      vertexShader: simVert,
      fragmentShader: lifeFrag,
      uniforms: {
        uState: { value: null },
        uInject: { value: initTex },
        uInjectPos: { value: new THREE.Vector2(-1, -1) },
        uInjectRadius: { value: 0.01 },
        uDoInject: { value: false },
      },
    });

    const planeGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, GRID - 1, GRID - 1);
    planeGeo.rotateX(-Math.PI / 2);

    const displayMat = new THREE.ShaderMaterial({
      vertexShader: displayVert,
      fragmentShader: displayFrag,
      uniforms: {
        uLifeTex: { value: simRT[0].texture },
        uTime: { value: 0 },
      },
      side: THREE.DoubleSide,
    });

    const lifePlane = new THREE.Mesh(planeGeo, displayMat);
    lifePlane.position.y = 0;
    scene.add(lifePlane);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x003322,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wireMesh = new THREE.Mesh(planeGeo, wireMat);
    wireMesh.position.y = 0;
    scene.add(wireMesh);

    // Border ring
    const ringGeo = new THREE.TorusGeometry(WORLD_SIZE * 0.72, 0.05, 8, 120);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.5,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    scene.add(ring);

    // ── Simulation step ─────────────────────────────────────────────────────
    function stepLife() {
      lifeMat.uniforms.uState.value = simRT[simIdx].texture;
      lifeMat.uniforms.uInject.value = initTex; // default empty inject
      lifeMat.uniforms.uDoInject.value = false;

      simQuad.material = lifeMat;
      renderer.setRenderTarget(simRT[1 - simIdx]);
      renderer.render(simScene, simCam);
      renderer.setRenderTarget(null);

      simIdx = 1 - simIdx;

      // Update display
      displayMat.uniforms.uLifeTex.value = simRT[simIdx].texture;
    }

    // ── Click injection (immediate, separate from simulation step) ─────────────
    const injectMat = new THREE.ShaderMaterial({
      vertexShader: simVert,
      fragmentShader: lifeFrag,
      uniforms: {
        uState: { value: null },
        uInject: { value: initTex },
        uInjectPos: { value: new THREE.Vector2(-1, -1) },
        uInjectRadius: { value: 0.012 },
        uDoInject: { value: false },
      },
    });

    function doInject(clientX, clientY, r, g, b) {
      const uv = screenToLife(clientX, clientY);
      if (!uv) return;
      const tex = buildInjectTex(uv.x, uv.y, r, g, b);
      injectMat.uniforms.uState.value = simRT[simIdx].texture;
      injectMat.uniforms.uInject.value = tex;
      injectMat.uniforms.uInjectPos.value.copy(uv);
      injectMat.uniforms.uInjectRadius.value = 0.015;
      injectMat.uniforms.uDoInject.value = true;
      simQuad.material = injectMat;
      renderer.setRenderTarget(simRT[1 - simIdx]);
      renderer.render(simScene, simCam);
      renderer.setRenderTarget(null);
      simIdx = 1 - simIdx;
      displayMat.uniforms.uLifeTex.value = simRT[simIdx].texture;
      tex.dispose();
    }

    // ── Mouse Interaction ───────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    let injectPos = new THREE.Vector2(-1, -1);

    function screenToLife(clientX, clientY) {
      mouseNDC.set(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1,
      );
      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObject(lifePlane);
      if (hits.length > 0) {
        const uv = hits[0].uv;
        return uv;
      }
      return null;
    }

    let isInjecting = false;

    renderer.domElement.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return; // right click handled separately
      isInjecting = true;
      const r = 80 + Math.random() * 175;
      const g = 180 + Math.random() * 75;
      const b = 60 + Math.random() * 60;
      doInject(e.clientX, e.clientY, r, g, b);
    });

    renderer.domElement.addEventListener('pointerup', () => { isInjecting = false; });
    renderer.domElement.addEventListener('pointermove', (e) => {
      if (isInjecting) {
        const r = 80 + Math.random() * 175;
        const g = 180 + Math.random() * 75;
        const b = 60 + Math.random() * 60;
        doInject(e.clientX, e.clientY, r, g, b);
      }
    });

    renderer.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      doInject(e.clientX, e.clientY, 0, 0, 0); // inject black = kill cells
    });

    // ── GUI ─────────────────────────────────────────────────────────────────
    const params = {
      speed: 3,
      reset: () => {
        simIdx = 0;
        const data = new Uint8Array(GRID * GRID * 4);
        for (let i = 0; i < GRID * GRID; i++) {
          const alive = Math.random() < 0.3 ? 1 : 0;
          data[i * 4 + 0] = alive ? (80 + Math.random() * 175) : 0;
          data[i * 4 + 1] = alive ? (180 + Math.random() * 75) : 0;
          data[i * 4 + 2] = alive ? (60 + Math.random() * 60) : 0;
          data[i * 4 + 3] = alive;
        }
        const tex = new THREE.DataTexture(data, GRID, GRID, THREE.RGBAFormat);
        tex.needsUpdate = true;

        lifeMat.uniforms.uState.value = null;
        simQuad.material = lifeMat;
        renderer.setRenderTarget(simRT[0]);
        renderer.setRenderTarget(simRT[1]);
        // Re-init both RTs by running sim twice
        lifeMat.uniforms.uState.value = tex;
        lifeMat.uniforms.uDoInject.value = false;
        renderer.setRenderTarget(simRT[0]);
        renderer.render(simScene, simCam);
        renderer.setRenderTarget(simRT[1]);
        renderer.render(simScene, simCam);
        renderer.setRenderTarget(null);
        simIdx = 0;
        displayMat.uniforms.uLifeTex.value = simRT[0].texture;
      },
      seed: () => {
        simIdx = 0;
        lifeMat.uniforms.uState.value = initTex;
        lifeMat.uniforms.uDoInject.value = false;
        simQuad.material = lifeMat;
        renderer.setRenderTarget(simRT[0]);
        renderer.render(simScene, simCam);
        renderer.setRenderTarget(null);
        displayMat.uniforms.uLifeTex.value = simRT[0].texture;
      },
    };

    const gui = new GUI({ title: '生命游戏 Life Controls' });
    gui.add(params, 'speed', 1, 12, 1).name('速度 Speed');
    gui.add(params, 'reset').name('重置 Reset');
    gui.add(params, 'seed').name('重新播种 Seed');
    gui.add({ wireframe: false }, 'wireframe').name('网格 Wireframe').onChange(v => {
      wireMesh.visible = v;
    });

    // ── Resize ───────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Init sim ────────────────────────────────────────────────────────────
    // Seed both RTs with initial state
    lifeMat.uniforms.uState.value = initTex;
    lifeMat.uniforms.uDoInject.value = false;
    simQuad.material = lifeMat;
    renderer.setRenderTarget(simRT[0]);
    renderer.render(simScene, simCam);
    renderer.setRenderTarget(simRT[1]);
    renderer.render(simScene, simCam);
    renderer.setRenderTarget(null);
    displayMat.uniforms.uLifeTex.value = simRT[0].texture;

    // ── Animate ─────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let frame = 0;
    let lastReset = 0;

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

      controls.update();

      // Run simulation at target speed
      frame++;
      const interval = Math.max(1, Math.round(12 / params.speed));
      if (frame % interval === 0) {
        stepLife();
      }

      displayMat.uniforms.uTime.value = t;

      // Auto-reset every 30s if stuck
      if (t - lastReset > 30) {
        lastReset = t;
        params.seed();
      }

      // Animate ring
      ring.rotation.z = t * 0.2;
      ptLight.intensity = 60 + Math.sin(t * 2) * 20;

      renderer.render(scene, camera);
    }

    animate();