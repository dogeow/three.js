import * as THREE from 'three';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    const SIM_RES = 256;

    // ── Renderer ────────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    document.body.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 4, 3);
    camera.lookAt(0, 0, 0);

    // ── Main Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080f);
    scene.fog = new THREE.FogExp2(0x08080f, 0.08);

    // Lights
    scene.add(new THREE.AmbientLight(0x1a2a44, 2.0));
    scene.add(new THREE.HemisphereLight(0x4466aa, 0x112233, 1.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(4, 6, 4);
    scene.add(dirLight);
    const ptLight = new THREE.PointLight(0x4488ff, 1.2, 12);
    ptLight.position.set(-3, 3, -2);
    scene.add(ptLight);

    // Grid
    const grid = new THREE.GridHelper(8, 40, 0x223355, 0x112233);
    scene.add(grid);

    // ── Fluid Simulation ────────────────────────────────────────────────────────
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const simScene = new THREE.Scene();
    const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    simScene.add(simQuad);

    function makeRT(w, h) {
      return new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false,
      });
    }

    const velRT   = [makeRT(SIM_RES, SIM_RES), makeRT(SIM_RES, SIM_RES)];
    const pressRT = [makeRT(SIM_RES, SIM_RES), makeRT(SIM_RES, SIM_RES)];
    const divRT   = makeRT(SIM_RES, SIM_RES);
    const dyeRT   = [makeRT(SIM_RES, SIM_RES), makeRT(SIM_RES, SIM_RES)];
    let velIdx = 0, pressIdx = 0, dyeIdx = 0;

    const texelSize = new THREE.Vector2(1 / SIM_RES, 1 / SIM_RES);

    function renderPass(mat, target) {
      simQuad.material = mat;
      renderer.setRenderTarget(target);
      renderer.render(simScene, simCamera);
      renderer.setRenderTarget(null);
    }

    // ── Simulation Shaders ──────────────────────────────────────────────────────
    const VS = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    const FS_advect = `
      precision highp float;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform float uDt;
      uniform float uDissipation;
      uniform vec2 uTexelSize;
      varying vec2 vUv;
      void main() {
        vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize * float(${SIM_RES});
        gl_FragColor = uDissipation * texture2D(uSource, coord);
      }
    `;

    const FS_divergence = `
      precision highp float;
      uniform sampler2D uVelocity;
      uniform vec2 uTexelSize;
      varying vec2 vUv;
      void main() {
        float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
        float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
        float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
        float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `;

    const FS_pressure = `
      precision highp float;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      uniform vec2 uTexelSize;
      varying vec2 vUv;
      void main() {
        float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
        float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
        float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
        float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
        float C = texture2D(uPressure, vUv).x;
        float div = texture2D(uDivergence, vUv).x;
        float p = (L + R + B + T - div) * 0.25;
        gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
      }
    `;

    const FS_gradSubtract = `
      precision highp float;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      uniform vec2 uTexelSize;
      varying vec2 vUv;
      void main() {
        float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
        float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
        float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
        float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        vel -= 0.5 * vec2(R - L, T - B);
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
    `;

    const FS_splatVelocity = `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uPoint;
      uniform vec2 uVelocity;
      uniform float uRadius;
      uniform float uAspect;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - uPoint;
        p.x *= uAspect;
        float d = length(p);
        float f = smoothstep(uRadius, 0.0, d);
        vec4 col = texture2D(uTexture, vUv);
        col.xy += uVelocity * f * 12.0;
        col.xy = clamp(col.xy, vec2(-8.0), vec2(8.0));
        gl_FragColor = col;
      }
    `;

    const FS_splatDye = `
      precision highp float;
      uniform sampler2D uDye;
      uniform vec2 uPoint;
      uniform vec3 uColor;
      uniform float uRadius;
      uniform float uAspect;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - uPoint;
        p.x *= uAspect;
        float d = length(p);
        float f = smoothstep(uRadius, 0.0, d);
        vec4 col = texture2D(uDye, vUv);
        col.rgb += uColor * f * 1.2;
        gl_FragColor = col;
      }
    `;

    // ── Simulation Materials ────────────────────────────────────────────────────
    const advectMat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS_advect,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        uDt: { value: 0.016 },
        uDissipation: { value: 0.998 },
        uTexelSize: { value: texelSize },
      },
    });

    const divMat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS_divergence,
      uniforms: { uVelocity: { value: null }, uTexelSize: { value: texelSize } },
    });

    const pressMat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS_pressure,
      uniforms: {
        uPressure: { value: null },
        uDivergence: { value: null },
        uTexelSize: { value: texelSize },
      },
    });

    const gradSubMat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS_gradSubtract,
      uniforms: {
        uPressure: { value: null },
        uVelocity: { value: null },
        uTexelSize: { value: texelSize },
      },
    });

    const splatVelMat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS_splatVelocity,
      uniforms: {
        uTexture: { value: null },
        uPoint: { value: new THREE.Vector2() },
        uVelocity: { value: new THREE.Vector2() },
        uRadius: { value: 0.003 },
        uAspect: { value: 1.0 },
      },
    });

    const splatDyeMat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS_splatDye,
      uniforms: {
        uDye: { value: null },
        uPoint: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Vector3(1, 1, 1) },
        uRadius: { value: 0.005 },
        uAspect: { value: 1.0 },
      },
    });

    // ── Display Plane ───────────────────────────────────────────────────────────
    const DISP_RES = 80;
    const planeGeo = new THREE.PlaneGeometry(4, 4, DISP_RES, DISP_RES);

    const displayMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */`
        varying vec2 vUv;
        varying float vDye;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec3 pos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        uniform sampler2D uDyeTex;
        uniform sampler2D uVelTex;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        vec3 palette(float t) {
          return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t));
        }

        void main() {
          vec4 dye = texture2D(uDyeTex, vUv);
          float lum = dot(dye.rgb, vec3(0.299, 0.587, 0.114));

          // Base dark surface — always visible
          vec3 baseCol = vec3(0.06, 0.07, 0.12);

          // Dye color with palette mapping
          float hue = lum * 0.5 + vUv.x * 0.3 + uTime * 0.05;
          vec3 dyeCol = palette(hue) * dye.rgb * 1.8;

          // Blend dye onto surface
          float blend = clamp(lum * 3.0, 0.0, 1.0);
          vec3 col = mix(baseCol, dyeCol, blend);

          // Speed glow
          vec2 vel = texture2D(uVelTex, vUv).xy;
          float speed = length(vel);
          col += vec3(0.15, 0.4, 0.8) * speed * 0.8;

          // Grid lines on surface
          vec2 gridUv = fract(vUv * float(${DISP_RES}));
          float line = step(0.92, max(gridUv.x, gridUv.y));
          col = mix(col, col + 0.04, line * (1.0 - blend * 0.5));

          // Edge glow
          float edge = 1.0 - min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
          col += vec3(0.05, 0.1, 0.2) * smoothstep(0.0, 0.15, edge);

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `,
      uniforms: {
        uDyeTex: { value: dyeRT[0].texture },
        uVelTex: { value: velRT[0].texture },
        uTime: { value: 0 },
      },
    });

    const plane = new THREE.Mesh(planeGeo, displayMat);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // ── Mouse / Touch Interaction ────────────────────────────────────────────────
    const pointer = new THREE.Vector2(-10, -10);
    const prevPointer = new THREE.Vector2(-10, -10);
    const pointerVel = new THREE.Vector2();
    let isDown = false;

    const interactPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    interactPlane.rotation.x = -Math.PI / 2;
    scene.add(interactPlane);

    const raycaster = new THREE.Raycaster();

    function updatePointer(e) {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = raycaster.intersectObject(interactPlane);
      if (hits.length > 0) {
        const pt = hits[0].point;
        // Map world X,Z to UV — plane covers [-2,2] in X and Z
        const newX = THREE.MathUtils.clamp((-pt.x + 2) / 4, 0.02, 0.98); // flip X so drag right = fluid right
        const newY = THREE.MathUtils.clamp((pt.z + 2) / 4, 0.02, 0.98);
        if (isDown) {
          pointerVel.set(newX - pointer.x, newY - pointer.y);
        }
        pointer.set(newX, newY);
      }
      prevPointer.copy(pointer);
    }

    renderer.domElement.addEventListener('pointerdown', (e) => { isDown = true; updatePointer(e); });
    renderer.domElement.addEventListener('pointerup', () => { isDown = false; });
    renderer.domElement.addEventListener('pointermove', (e) => { if (isDown) updatePointer(e); });

    // ── Splat Functions ─────────────────────────────────────────────────────────
    function splatVelocity(x, y, vx, vy) {
      splatVelMat.uniforms.uTexture.value = velRT[velIdx].texture;
      splatVelMat.uniforms.uPoint.value.set(x, y);
      splatVelMat.uniforms.uVelocity.value.set(vx * 5, vy * 5);
      splatVelMat.uniforms.uAspect.value = 1.0;
      renderPass(splatVelMat, velRT[1 - velIdx]);
      velIdx = 1 - velIdx;
    }

    function splatDye(x, y, r, g, b, radius) {
      splatDyeMat.uniforms.uDye.value = dyeRT[dyeIdx].texture;
      splatDyeMat.uniforms.uPoint.value.set(x, y);
      splatDyeMat.uniforms.uColor.value.set(r, g, b);
      splatDyeMat.uniforms.uRadius.value = radius;
      splatDyeMat.uniforms.uAspect.value = 1.0;
      renderPass(splatDyeMat, dyeRT[1 - dyeIdx]);
      dyeIdx = 1 - dyeIdx;
    }

    function autoSplat() {
      const colors = [
        [1, 0.1, 0.2], [0.1, 0.8, 0.3], [0.1, 0.3, 1.0],
        [1, 0.5, 0.1], [0.8, 0.1, 0.9], [0.1, 0.9, 0.9],
        [1, 0.9, 0.1], [1, 0.3, 0.7], [0.2, 0.6, 1.0],
      ];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const x = 0.15 + Math.random() * 0.7;
      const y = 0.15 + Math.random() * 0.7;
      splatDye(x, y, c[0], c[1], c[2], 0.006);
      splatVelocity(x, y, (Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.04);
    }

    // Initial splashes
    for (let i = 0; i < 15; i++) autoSplat();

    // ── Simulation Step ─────────────────────────────────────────────────────────
    const params = {
      dissipation: 0.997,
      pressureIterations: 24,
      splatRadius: 0.005,
      autoSplatInterval: 2.0,
    };

    function stepSimulation() {
      // Advect velocity
      advectMat.uniforms.uVelocity.value = velRT[velIdx].texture;
      advectMat.uniforms.uSource.value = velRT[velIdx].texture;
      advectMat.uniforms.uDissipation.value = params.dissipation;
      renderPass(advectMat, velRT[1 - velIdx]);
      velIdx = 1 - velIdx;

      // Advect dye
      advectMat.uniforms.uVelocity.value = velRT[velIdx].texture;
      advectMat.uniforms.uSource.value = dyeRT[dyeIdx].texture;
      advectMat.uniforms.uDissipation.value = 0.996;
      renderPass(advectMat, dyeRT[1 - dyeIdx]);
      dyeIdx = 1 - dyeIdx;

      // Compute divergence (store in divRT)
      divMat.uniforms.uVelocity.value = velRT[velIdx].texture;
      renderPass(divMat, divRT);

      // Pressure solve
      for (let i = 0; i < params.pressureIterations; i++) {
        pressMat.uniforms.uPressure.value = pressRT[pressIdx].texture;
        pressMat.uniforms.uDivergence.value = divRT.texture;
        renderPass(pressMat, pressRT[1 - pressIdx]);
        pressIdx = 1 - pressIdx;
      }

      // Gradient subtract
      gradSubMat.uniforms.uPressure.value = pressRT[pressIdx].texture;
      gradSubMat.uniforms.uVelocity.value = velRT[velIdx].texture;
      renderPass(gradSubMat, velRT[1 - velIdx]);
      velIdx = 1 - velIdx;

      // Mouse splat
      if (isDown) {
        splatVelocity(pointer.x, pointer.y, pointerVel.x, pointerVel.y);
        const c = colorOptions[currentColorIdx];
        splatDye(pointer.x, pointer.y, c.r, c.g, c.b, params.splatRadius);
        pointerVel.multiplyScalar(0);
      }
    }

    // ── Color Options ────────────────────────────────────────────────────────────
    const colorOptions = [
      { r: 0.9, g: 0.1, b: 0.2, name: '红 Red' },
      { r: 0.1, g: 0.8, b: 0.3, name: '绿 Green' },
      { r: 0.1, g: 0.3, b: 0.9, name: '蓝 Blue' },
      { r: 1.0, g: 0.5, b: 0.1, name: '橙 Orange' },
      { r: 0.8, g: 0.1, b: 0.9, name: '紫 Purple' },
      { r: 0.1, g: 0.9, b: 0.9, name: '青 Cyan' },
      { r: 1.0, g: 0.9, b: 0.1, name: '黄 Yellow' },
      { r: 1.0, g: 0.3, b: 0.7, name: '粉 Pink' },
    ];
    let currentColorIdx = 0;

    // ── GUI ─────────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: '流体控制 Fluid Controls' });
    gui.add(params, 'dissipation', 0.98, 0.999).name('衰减 Dissipation');
    gui.add(params, 'pressureIterations', 1, 50).name('压力迭代 Pressure');
    gui.add(params, 'splatRadius', 0.002, 0.02).name('溅射半径 Radius');
    gui.add(params, 'autoSplatInterval', 0.5, 6).name('自动染色间隔');
    gui.add({ idx: 0 }, 'idx', { Red: 0, Green: 1, Blue: 2, Orange: 3, Purple: 4, Cyan: 5, Yellow: 6, Pink: 7 })
      .name('染料颜色').onChange(v => { currentColorIdx = parseInt(v); });

    // ── Resize ──────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Animation Loop ──────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let autoSplatTimer = 0;

    function animate() {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();


      // Auto splat
      autoSplatTimer += dt;
      if (autoSplatTimer > params.autoSplatInterval) {
        autoSplatTimer = 0;
        autoSplat();
      }

      stepSimulation();

      // Update display uniforms
      displayMat.uniforms.uDyeTex.value = dyeRT[dyeIdx].texture;
      displayMat.uniforms.uVelTex.value = velRT[velIdx].texture;
      displayMat.uniforms.uTime.value = t;

      renderer.clear();
      renderer.render(scene, camera);
    }

    animate();