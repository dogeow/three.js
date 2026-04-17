import * as THREE from 'three';
    import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
    import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
    import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

    // ─────────────────────────────────────────────────────────────────────────
    // RENDERER + SCENE + CAMERA
    // ─────────────────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 10000);
    camera.position.set(0, 8, 28);

    // ─────────────────────────────────────────────────────────────────────────
    // POST-PROCESSING
    // ─────────────────────────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.8,   // strength
      0.4,   // radius
      0.2    // threshold
    );
    composer.addPass(bloomPass);

    // ── Gravitational Lensing Shader Pass ────────────────────────────────────
    // Distorts background UV coordinates based on proximity to black hole screen pos
    const lensingShader = {
      uniforms: {
        tDiffuse:      { value: null },
        resolution:   { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        blackHolePos:  { value: new THREE.Vector2(0.5, 0.5) },
        lensStrength: { value: 0.08 },
        schwarzschildR:{ value: 1.0 },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        uniform sampler2D tDiffuse;
        uniform vec2      resolution;
        uniform vec2      blackHolePos;   // NDC position of black hole
        uniform float     lensStrength;
        uniform float     schwarzschildR;

        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;

          // Convert UV → screen-space offset from black hole
          vec2 screenCenter = blackHolePos;                     // 0..1
          vec2 offset        = (uv - screenCenter) * resolution; // pixel offset
          float dist         = length(offset);

          // Schwarzschild radius in screen pixels (approximate)
          float ssPixels = schwarzschildR * 120.0;

          // Event horizon: pure black inside
          if (dist < ssPixels * 0.9) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }

          // Gravitational deflection: α ∝ 1/b  (inverse impact parameter)
          // We warp UV toward/around the black hole
          float bend = lensStrength * ssPixels * ssPixels / max(dist * dist, 1.0);
          // Tangential deflection (light orbits tangentially near BH)
          vec2 tangent = vec2(-offset.y, offset.x) / max(dist, 0.001);
          vec2 deflection = normalize(offset) * bend + tangent * bend * 0.25;

          vec2 lensedUV = clamp(uv + deflection / resolution, 0.0, 1.0);
          vec4 col = texture2D(tDiffuse, lensedUV);

          // Faint photon ring glow at ~1.5 × Schwarzschild radius
          float photonRing = exp(-pow((dist - ssPixels * 1.5) / (ssPixels * 0.3), 2.0));
          col.rgb += vec3(0.3, 0.6, 1.0) * photonRing * 0.6;

          // Vignette near event horizon
          float evVignette = smoothstep(ssPixels * 0.9, ssPixels * 2.5, dist);
          col.rgb *= mix(0.2, 1.0, evVignette);

          gl_FragColor = col;
        }
      `
    };

    const lensingPass = new ShaderPass(lensingShader);
    composer.addPass(lensingPass);

    // ─────────────────────────────────────────────────────────────────────────
    // ORBIT CONTROLS
    // ─────────────────────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance   = 5;
    controls.maxDistance    = 80;
    controls.target.set(0, 0, 0);

    // ─────────────────────────────────────────────────────────────────────────
    // PARAMETERS
    // ─────────────────────────────────────────────────────────────────────────
    const params = {
      blackHoleMass:       1.0,    // multiplier on visual Schwarzschild radius
      diskBrightness:     2.5,
      lensingIntensity:   0.08,
      animationSpeed:     1.0,
      bloomStrength:      1.8,
      bloomRadius:        0.4,
      bloomThreshold:     0.2,
      starCount:          8000,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // STARFIELD BACKGROUND
    // ─────────────────────────────────────────────────────────────────────────
    function buildStarfield(count) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors    = new Float32Array(count * 3);
      const sizes     = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        // Spherical distribution at large radius
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 400 + Math.random() * 400;
        positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Star colors — slight blue/white/yellow tint variety
        const t = Math.random();
        if (t < 0.6) {
          colors[i * 3] = 0.85 + Math.random() * 0.15;
          colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
          colors[i * 3 + 2] = 1.0;
        } else if (t < 0.8) {
          colors[i * 3] = 1.0;
          colors[i * 3 + 1] = 0.9;
          colors[i * 3 + 2] = 0.7;
        } else {
          colors[i * 3] = 0.6;
          colors[i * 3 + 1] = 0.8;
          colors[i * 3 + 2] = 1.0;
        }

        sizes[i] = Math.random() * 1.8 + 0.4;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('size',    new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.PointsMaterial({
        size:            1.2,
        vertexColors:    true,
        sizeAttenuation: false,
        transparent:     true,
        opacity:         0.9,
        blending:        THREE.AdditiveBlending,
        depthWrite:      false,
      });

      return new THREE.Points(geo, mat);
    }

    const stars = buildStarfield(params.starCount);
    scene.add(stars);

    // ─────────────────────────────────────────────────────────────────────────
    // BLACK HOLE — EVENT HORIZON SPHERE
    // ─────────────────────────────────────────────────────────────────────────
    const BH_RADIUS = 1.5 * params.blackHoleMass;

    const eventHorizonGeo = new THREE.SphereGeometry(BH_RADIUS, 64, 64);
    const eventHorizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eventHorizon = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
    scene.add(eventHorizon);

    // ─────────────────────────────────────────────────────────────────────────
    // PHOTON SPHERE GLOW — thin glowing shell at 1.5 × Schwarzschild radius
    // ─────────────────────────────────────────────────────────────────────────
    const photonSphereGeo = new THREE.SphereGeometry(BH_RADIUS * 1.5, 64, 64);
    const photonSphereMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const photonSphere = new THREE.Mesh(photonSphereGeo, photonSphereMat);
    scene.add(photonSphere);

    // ─────────────────────────────────────────────────────────────────────────
    // ACCRETION DISK
    // The disk is built as a flat ring with vertex color variation to simulate
    // Doppler shift: blue (approaching side) vs red (receding side).
    // ─────────────────────────────────────────────────────────────────────────
    function buildAccretionDisk(innerR, outerR, segments, rings) {
      const geo = new THREE.BufferGeometry();
      const positions = [];
      const colors    = [];
      const indices   = [];
      const uvs       = [];

      for (let ring = 0; ring < rings; ring++) {
        const t0   = ring / rings;
        const t1   = (ring + 1) / rings;
        const r0   = innerR + (outerR - innerR) * t0;
        const r1   = innerR + (outerR - innerR) * t1;

        for (let seg = 0; seg < segments; seg++) {
          const a0 = (seg / segments) * Math.PI * 2;
          const a1 = ((seg + 1) / segments) * Math.PI * 2;

          const vBase = positions.length / 3;

          positions.push(
            r0 * Math.cos(a0), 0, r0 * Math.sin(a0),
            r0 * Math.cos(a1), 0, r0 * Math.sin(a1),
            r1 * Math.cos(a1), 0, r1 * Math.sin(a1),
            r1 * Math.cos(a0), 0, r1 * Math.sin(a0),
          );

          // Doppler-based color: blue approaching (x>0), red receding (x<0)
          const cosA0 = Math.cos(a0);
          const cosA1 = Math.cos(a1);
          const cosMid = (cosA0 + cosA1) * 0.5;

          // Temperature gradient: hotter (white-blue) near inner edge
          const temp = 1.0 - t0; // 1 = inner (hot), 0 = outer (cool)

          const r = 0.1 + 0.9 * temp + Math.abs(cosMid) * 0.2;
          const g = 0.05 + 0.6 * temp + (cosMid > 0 ? 0.4 : 0.0) * temp;
          const b = 0.8 + 0.2 * temp - (cosMid > 0 ? 0.0 : 0.5) * temp;

          for (let k = 0; k < 4; k++) {
            colors.push(
              Math.min(r + Math.random() * 0.15, 1.0),
              Math.min(g + Math.random() * 0.1,  1.0),
              Math.min(b + Math.random() * 0.15, 1.0),
            );
          }

          // UVs
          uvs.push(t0, seg / segments,   t0, (seg + 1) / segments,
                   t1, (seg + 1) / segments, t1, seg / segments);

          // Quad
          indices.push(vBase, vBase + 1, vBase + 2,  vBase, vBase + 2, vBase + 3);
        }
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
      geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      const mat = new THREE.MeshBasicMaterial({
        vertexColors:  true,
        side:          THREE.DoubleSide,
        transparent:   true,
        opacity:       0.92,
        blending:      THREE.AdditiveBlending,
        depthWrite:   false,
      });

      return new THREE.Mesh(geo, mat);
    }

    const DISK_INNER = BH_RADIUS * 1.8;   // ISCO ≈ 3 × Rs → visual scale
    const DISK_OUTER = BH_RADIUS * 6.0;
    const disk = buildAccretionDisk(DISK_INNER, DISK_OUTER, 256, 80);
    scene.add(disk);

    // ─────────────────────────────────────────────────────────────────────────
    // POLAR JET STREAMS (relativistic jets along rotation axis)
    // ─────────────────────────────────────────────────────────────────────────
    function buildJet(length, radius, color) {
      const geo = new THREE.CylinderGeometry(radius * 0.1, radius, length, 32, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      return mesh;
    }

    const jetUp   = buildJet(14, 0.3, 0x88aaff);
    jetUp.position.y = 7;
    scene.add(jetUp);

    const jetDown = buildJet(14, 0.3, 0x88aaff);
    jetDown.position.y = -7;
    jetDown.rotation.z = Math.PI;
    scene.add(jetDown);

    // ─────────────────────────────────────────────────────────────────────────
    // AMBIENT NEBULA CLOUDS (large faint shells for depth)
    // ─────────────────────────────────────────────────────────────────────────
    function buildNebulaShell(r, color, opacity) {
      const geo = new THREE.SphereGeometry(r, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return new THREE.Mesh(geo, mat);
    }

    const nebula1 = buildNebulaShell(22, 0x1133aa, 0.04);
    const nebula2 = buildNebulaShell(30, 0x220844, 0.04);
    const nebula3 = buildNebulaShell(38, 0x110822, 0.03);
    scene.add(nebula1, nebula2, nebula3);

    // ─────────────────────────────────────────────────────────────────────────
    // GUI
    // ─────────────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: '⬡ Black Hole Controls', width: 260 });
    gui.domElement.style.setProperty('font-family', "'Courier New', monospace");

    gui.add(params, 'blackHoleMass',   0.3, 3.0, 0.01).name('Black Hole Mass').onChange(updateScale);
    gui.add(params, 'diskBrightness',  0.1, 5.0, 0.1).name('Disk Brightness');
    gui.add(params, 'lensingIntensity',0.0, 0.3, 0.001).name('Lensing Intensity').onChange(v => {
      lensingPass.uniforms.lensStrength.value = v;
    });
    gui.add(params, 'animationSpeed',  0.0, 3.0, 0.05).name('Anim Speed');

    const bloomFolder = gui.addFolder('Bloom');
    bloomFolder.add(params, 'bloomStrength',  0.0, 4.0, 0.1).name('Strength').onChange(v => {
      bloomPass.strength = v;
    });
    bloomFolder.add(params, 'bloomRadius',    0.0, 1.0, 0.05).name('Radius').onChange(v => {
      bloomPass.radius = v;
    });
    bloomFolder.add(params, 'bloomThreshold', 0.0, 1.0, 0.05).name('Threshold').onChange(v => {
      bloomPass.threshold = v;
    });
    bloomFolder.close();

    const starFolder = gui.addFolder('Starfield');
    starFolder.add(params, 'starCount', 1000, 15000, 500).name('Star Count').onChange(rebuildStars);
    starFolder.close();

    function rebuildStars() {
      scene.remove(stars);
      const s = buildStarfield(params.starCount);
      scene.add(s);
      // keep ref for next rebuild
      window._stars = stars = s;
    }

    function updateScale() {
      const m = params.blackHoleMass;
      const scale = m / 1.0;

      eventHorizon.scale.setScalar(scale);
      photonSphere.scale.setScalar(scale);

      disk.scale.setScalar(scale);

      jetUp.scale.setScalar(scale);
      jetDown.scale.setScalar(scale);

      nebula1.scale.setScalar(scale);
      nebula2.scale.setScalar(scale);
      nebula3.scale.setScalar(scale);

      lensingPass.uniforms.schwarzschildR.value = BH_RADIUS * scale;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROJECT BLACK HOLE TO SCREEN SPACE each frame
    // ─────────────────────────────────────────────────────────────────────────
    const bhWorldPos = new THREE.Vector3(0, 0, 0);
    const bhScreenNDC = new THREE.Vector3();

    function updateLensingUniforms() {
      bhWorldPos.set(0, 0, 0);
      bhWorldPos.project(camera);
      // NDC → 0..1 UV space
      lensingPass.uniforms.blackHolePos.value.set(
        (bhWorldPos.x + 1) * 0.5,
        (bhWorldPos.y + 1) * 0.5,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANIMATION LOOP
    // ─────────────────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const speed   = params.animationSpeed;

      controls.update();
      updateLensingUniforms();

      // Rotate disk over time
      disk.rotation.y += 0.004 * speed;
      // Differential rotation: inner ring faster
      disk.rotation.x  = Math.sin(elapsed * 0.1 * speed) * 0.06;

      // Photon sphere pulse
      photonSphereMat.opacity = 0.05 + 0.04 * Math.sin(elapsed * 1.5 * speed);

      // Jet flicker
      jetUp.material.opacity   = 0.12 + 0.08 * Math.sin(elapsed * 3.0 * speed);
      jetDown.material.opacity  = 0.12 + 0.08 * Math.sin(elapsed * 3.0 * speed + 1.0);

      // Nebula slow drift
      nebula1.rotation.y = elapsed * 0.02 * speed;
      nebula2.rotation.x = elapsed * 0.015 * speed;
      nebula3.rotation.z = elapsed * 0.01 * speed;

      // Disk brightness
      disk.material.opacity = Math.min(1.0, params.diskBrightness * 0.5);

      composer.render();
    }

    animate();

    // ─────────────────────────────────────────────────────────────────────────
    // RESIZE
    // ─────────────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      lensingPass.uniforms.resolution.value.set(w, h);
      bloomPass.resolution.set(w, h);
    });