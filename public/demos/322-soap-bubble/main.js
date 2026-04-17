import * as THREE from 'three';
    import { OrbitControls }    from 'three/addons/controls/OrbitControls.js';
    import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
    import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
    import GUI from 'https://unpkg.com/lil-gui@0.19.2/dist/lil-gui.esm.js';

    /* ─────────────────────────────────────────────
       SCENE SETUP
    ───────────────────────────────────────────── */
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    /* ── Post-processing (bloom) ── */
    const composer    = new EffectComposer(renderer);
    const renderPass  = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.35, 0.82
    );
    composer.addPass(bloomPass);

    /* ── Orbit controls ── */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    /* ─────────────────────────────────────────────
       ENVIRONMENT MAP  (procedural gradient cubemap)
    ───────────────────────────────────────────── */
    function buildGradientCubemap(size = 128) {
      const canvas  = document.createElement('canvas');
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const faces = [];
      const gradients = [
        // px — warm right
        ['#ffaa44', '#220033'],
        // nx — cool left
        ['#4466ff', '#110022'],
        // py — bright top
        ['#ffffff', '#aaddff'],
        // ny — dark bottom
        ['#222233', '#000011'],
        // pz — front
        ['#66aaff', '#220044'],
        // nz — back
        ['#ff8844', '#002211'],
      ];

      for (const [c0, c1] of gradients) {
        const g = ctx.createLinearGradient(0, 0, size, size);
        g.addColorStop(0, c0);
        g.addColorStop(1, c1);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(canvas);
        faces.push(tex);
      }

      const cubeTex = new THREE.CubeTexture([
        faces[0].image, faces[1].image,   // ±x
        faces[2].image, faces[3].image,   // ±y
        faces[4].image, faces[5].image    // ±z
      ]);
      cubeTex.needsUpdate = true;
      return cubeTex;
    }

    const envMap = buildGradientCubemap(256);
    scene.background = new THREE.Color(0x050510);

    /* ─────────────────────────────────────────────
       SHADERS — Thin-film interference
    ───────────────────────────────────────────── */
    const bubbleVert = /* glsl */`
      precision highp float;

      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos  = worldPos.xyz;
        vNormal    = normalize(normalMatrix * normal);
        vViewDir   = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const bubbleFrag = /* glsl */`
      precision highp float;

      uniform float uTime;
      uniform float uFilmThickness;  // nm
      uniform float uIOR;

      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;

      /* ── Thin-film interference ──
         Simulates the optical path difference for a thin film:
           OPD = 2 * n * d * cos(θ_t)
         where n = IOR, d = film thickness, θ_t = transmitted angle.
         We use Snell's law: sin(θ_i) = n * sin(θ_t)
      ── */
      vec3 thinFilm(float cosThetaI, float thickness, float n) {
        float sinTi = sqrt(max(0.0, 1.0 - cosThetaI * cosThetaI));
        float sinTt = sinTi / n;
        float cosTt = sqrt(max(0.0, 1.0 - sinTt * sinTt));

        float opd = 2.0 * n * thickness * cosTt;

        // RGB wavelengths (nm) — approximate peak sensitivities
        float lamR = 680.0;
        float lamG = 540.0;
        float lamB = 450.0;

        // Phase = 2π * OPD / λ
        float phiR = opd / lamR;
        float phiG = opd / lamG;
        float phiB = opd / lamB;

        // Interference intensity (reflectance)
        float iR = 0.5 + 0.5 * cos(phiR * 6.28318);
        float iG = 0.5 + 0.5 * cos(phiG * 6.28318);
        float iB = 0.5 + 0.5 * cos(phiB * 6.28318);

        return vec3(iR, iG, iB);
      }

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vViewDir);

        float NdotV = abs(dot(N, V));
        float fresnel = pow(1.0 - NdotV, 3.5);

        // Animated film thickness — slowly drifting over time
        float thickness = uFilmThickness + 40.0 * sin(uTime * 0.25)
                        + 20.0 * sin(uTime * 0.13);

        vec3 irid = thinFilm(NdotV, thickness, uIOR);

        // Base soap film: silvery with iridescent tint
        vec3 base = vec3(0.88, 0.92, 0.96);
        vec3 color = mix(base, irid, 0.8);

        // Fresnel edge — brighter, more reflective at grazing angles
        color += fresnel * 0.35;

        // Very subtle specular highlight
        vec3 R = reflect(-V, N);
        float spec = pow(max(dot(R, vec3(0.577)), 0.0), 48.0);
        color += spec * 0.25;

        gl_FragColor = vec4(color, 0.65);
      }
    `;

    /* ─────────────────────────────────────────────
       BUBBLE CLASS
    ───────────────────────────────────────────── */
    class Bubble {
      constructor(position = new THREE.Vector3(0, 0, 0), size = 1.3) {
        this.size      = size;
        this.alive     = true;
        this.popping   = false;
        this.popT      = 0;       // 0→1 over popAnimDuration
        this.spawnTime = performance.now();

        // Mesh
        this.uniforms = {
          uTime:           { value: 0 },
          uFilmThickness:  { value: 300 },
          uIOR:            { value: 1.33 },
        };

        const geo = new THREE.IcosahedronGeometry(size, 24);
        const mat = new THREE.ShaderMaterial({
          vertexShader:   bubbleVert,
          fragmentShader: bubbleFrag,
          uniforms:       this.uniforms,
          transparent:    true,
          side:           THREE.DoubleSide,
          depthWrite:     false,
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);

        // Attach a invisible hit sphere (slightly larger for easy clicking)
        this.hitMesh = new THREE.Mesh(
          new THREE.SphereGeometry(size * 1.15, 12, 12),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        this.hitMesh.position.copy(position);
        this.hitMesh.userData.bubble = this;

        scene.add(this.mesh);
        scene.add(this.hitMesh);
      }

      update(dt, elapsed) {
        this.uniforms.uTime.value = elapsed;

        if (this.popping) {
          this.popT += dt / params.popAnimDuration;
          const t = Math.min(this.popT, 1.0);
          const eased = 1 - Math.pow(1 - t, 3);

          const burst = 1.0 + eased * params.popScaleBurst;
          const fade  = 1.0 - eased;
          this.mesh.scale.setScalar(burst);
          this.mesh.material.uniforms = this.uniforms; // no-op, keep ref
          this.mesh.material.opacity  = fade * 0.65;

          if (t >= 1.0) this._die();
        }
      }

      pop() {
        if (this.popping || !this.alive) return;
        this.popping = true;
        spawnParticles(this.mesh.position.clone(), this.size);
      }

      _die() {
        this.alive = false;
        scene.remove(this.mesh);
        scene.remove(this.hitMesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        bubbles.delete(this);
      }
    }

    /* ─────────────────────────────────────────────
       PARTICLE SYSTEM  (pop explosion)
    ───────────────────────────────────────────── */
    const PARTICLE_COUNT = 80;

    class ParticleSystem {
      constructor() {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(PARTICLE_COUNT * 3);
        const col = new Float32Array(PARTICLE_COUNT * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

        const mat = new THREE.PointsMaterial({
          size: 0.06,
          vertexColors: true,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        this.points  = new THREE.Points(geo, mat);
        this.velocities = [];
        this.lifetimes  = [];
        this.maxLife    = 1.4;
        this.alive       = false;
        scene.add(this.points);
      }

      emit(origin, bubbleSize) {
        const pos = this.points.geometry.attributes.position.array;
        const col = this.points.geometry.attributes.color.array;
        this.velocities = [];
        this.lifetimes  = [];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          pos[i3]     = origin.x;
          pos[i3 + 1] = origin.y;
          pos[i3 + 2] = origin.z;

          // Random direction on sphere, speed proportional to bubble size
          const dir  = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          ).normalize().multiplyScalar(bubbleSize * 1.5 + Math.random() * bubbleSize);
          this.velocities.push(dir);

          // Random iridescent color
          const irid = new THREE.Color().setHSL(Math.random(), 0.9, 0.6);
          col[i3]     = irid.r;
          col[i3 + 1] = irid.g;
          col[i3 + 2] = irid.b;

          this.lifetimes.push(0);
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.geometry.attributes.color.needsUpdate    = true;
        this.points.material.opacity = 1;
        this.alive = true;
      }

      update(dt) {
        if (!this.alive) return;
        const pos = this.points.geometry.attributes.position.array;
        let anyAlive = false;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          if (this.lifetimes[i] >= this.maxLife) continue;
          anyAlive = true;
          this.lifetimes[i] += dt;

          const i3 = i * 3;
          const v  = this.velocities[i];
          v.y -= 1.8 * dt; // gentle gravity
          pos[i3]     += v.x * dt;
          pos[i3 + 1] += v.y * dt;
          pos[i3 + 2] += v.z * dt;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        const t = this.lifetimes.reduce((a, l) => Math.max(a, l), 0) / this.maxLife;
        this.points.material.opacity = 1 - Math.pow(t, 2);

        if (!anyAlive) this.alive = false;
      }
    }

    const particleSystems = Array.from({ length: 4 }, () => new ParticleSystem());
    let   particleIdx = 0;

    function spawnParticles(origin, bubbleSize) {
      const ps = particleSystems[particleIdx % particleSystems.length];
      ps.emit(origin, bubbleSize);
      particleIdx++;
    }

    /* ─────────────────────────────────────────────
       BUBBLE MANAGEMENT
    ───────────────────────────────────────────── */
    const bubbles = new Set();

    function addBubble(pos) {
      const b = new Bubble(
        pos || new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ),
        params.bubbleSize
      );
      // Sync GUI params into new bubble's uniforms
      b.uniforms.uFilmThickness.value = params.filmThickness;
      b.uniforms.uIOR.value            = params.IOR;
      bubbles.add(b);
      return b;
    }

    // Seed scene with one bubble
    addBubble();

    /* ─────────────────────────────────────────────
       RAYCASTER — click / double-click
    ───────────────────────────────────────────── */
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();
    let   lastTap   = 0;

    function onPointerDown(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(
        Array.from(bubbles).map(b => b.hitMesh)
      );

      const now = performance.now();
      const dt  = now - lastTap;
      lastTap   = now;

      if (hits.length > 0) {
        const bubble = hits[0].object.userData.bubble;
        if (dt < 300) {
          // Double-click: spawn new bubble near clicked one
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          );
          addBubble(bubble.mesh.position.clone().add(offset));
        } else {
          bubble.pop();
        }
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    /* ─────────────────────────────────────────────
       GUI
    ───────────────────────────────────────────── */
    const params = {
      filmThickness:   300,   // nm
      IOR:             1.33,  // water / soap
      popAnimDuration: 0.55,  // seconds
      popScaleBurst:   2.8,   // multiplier
      bubbleSize:      1.3,
    };

    const gui = new GUI({ title: 'Soap Bubble Controls' });

    gui.add(params, 'filmThickness', 50, 800, 1).name('Film Thickness (nm)').onChange(v => {
      bubbles.forEach(b => { b.uniforms.uFilmThickness.value = v; });
    });

    gui.add(params, 'IOR', 1.0, 2.0, 0.01).name('IOR').onChange(v => {
      bubbles.forEach(b => { b.uniforms.uIOR.value = v; });
    });

    gui.add(params, 'popAnimDuration', 0.1, 2.0, 0.05).name('Pop Duration (s)');
    gui.add(params, 'popScaleBurst',  0.5, 6.0, 0.1).name('Pop Scale Burst');
    gui.add(params, 'bubbleSize', 0.4, 3.0, 0.05).name('Bubble Size');

    gui.add({
      spawnBubble: () => addBubble()
    }, 'spawnBubble').name('Spawn Bubble');

    /* ─────────────────────────────────────────────
       RESIZE
    ───────────────────────────────────────────── */
    function onResize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      composer.setSize(innerWidth, innerHeight);
    }
    window.addEventListener('resize', onResize);

    /* ─────────────────────────────────────────────
       ANIMATION LOOP
    ───────────────────────────────────────────── */
    let lastTime = performance.now();

    function animate() {
      requestAnimationFrame(animate);

      const now     = performance.now();
      const dt     = Math.min((now - lastTime) / 1000, 0.05);
      const elapsed = now / 1000;
      lastTime     = now;

      controls.update();

      // Update bubbles
      for (const b of bubbles) b.update(dt, elapsed);

      // Update particle systems
      for (const ps of particleSystems) ps.update(dt);

      composer.render();
    }

    animate();