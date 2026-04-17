import * as THREE from 'three';
    import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
    import { Sky }             from 'three/addons/objects/Sky.js';
    import GUI                 from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

    /* ─────────────────────────────────────────────────
       Scene Setup
    ───────────────────────────────────────────────── */
    const canvas   = document.createElement('canvas');
    document.body.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 200000);
    camera.position.set(0, 10, 5000);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.05;
    controls.minDistance    = 1000;
    controls.maxDistance    = 20000;
    controls.target.set(0, 0, 0);

    /* ─────────────────────────────────────────────────
       Sky Object (Three.js built-in atmospheric sky)
       Uses Preetham's model for Rayleigh / Mie scattering
    ───────────────────────────────────────────────── */
    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    /**
     * The sky shader uses the following key uniforms:
     *   turbidity        — atmospheric haze (clear sky ≈ 3–10)
     *   rayleigh         — sky blue scattering strength (clear sky ≈ 0.5)
     *   mieCoefficient   — sun halo size (clear sky ≈ 0.005)
     *   mieDirectionalG  — Mie scattering anisotropy (0–1, more forward → 0.8)
     *   sunPosition      — THREE.Vector3, direction toward the sun
     */
    const sunPos = new THREE.Vector3();

    /* ─────────────────────────────────────────────────
       GUI Parameters (driven by lil-gui)
    ───────────────────────────────────────────────── */
    const params = {
      // Sun position in spherical coords
      azimuthDeg:   180,   // degrees
      elevationDeg: 85,   // degrees above horizon

      // Atmospheric
      turbidity:       3.0,  // [1, 20]
      rayleigh:        0.5,  // [0, 4]
      mieCoefficient:  0.005,
      mieDirectionalG: 0.8,  // [0, 1]

      // Tone mapping exposure
      exposure: 1.0,
    };

    /* ─────────────────────────────────────────────────
       Sync sun direction from azimuth/elevation
    ───────────────────────────────────────────────── */
    function updateSun() {
      const phi   = THREE.MathUtils.degToRad(90 - params.elevationDeg);
      const theta = THREE.MathUtils.degToRad(params.azimuthDeg);
      sunPos.setFromSphericalCoords(1, phi, theta);
      skyUniforms['sunPosition'].value.copy(sunPos);
    }

    /* ─────────────────────────────────────────────────
       Apply atmosphere params to sky uniforms
    ───────────────────────────────────────────────── */
    function applyAtmosphereParams() {
      skyUniforms['turbidity'].value        = params.turbidity;
      skyUniforms['rayleigh'].value         = params.rayleigh;
      skyUniforms['mieCoefficient'].value   = params.mieCoefficient;
      skyUniforms['mieDirectionalG'].value = params.mieDirectionalG;
      renderer.toneMappingExposure          = params.exposure;
    }

    /* ─────────────────────────────────────────────────
       Presets
    ───────────────────────────────────────────────── */
    const presets = {
      dawn:  { azimuthDeg: 180,  elevationDeg: 5,  turbidity: 8,  rayleigh: 2.5, mieCoefficient: 0.03, mieDirectionalG: 0.95, exposure: 0.7  },
      noon:  { azimuthDeg: 180,  elevationDeg: 85, turbidity: 3,  rayleigh: 0.5, mieCoefficient: 0.005, mieDirectionalG: 0.8, exposure: 1.0 },
      dusk:  { azimuthDeg: 0,    elevationDeg: 5,   turbidity: 8,  rayleigh: 2.5, mieCoefficient: 0.03, mieDirectionalG: 0.95, exposure: 0.7  },
      night: { azimuthDeg: 180,  elevationDeg: -10, turbidity: 1, rayleigh: 0.1, mieCoefficient: 0.001, mieDirectionalG: 0.5, exposure: 0.3 },
    };

    function applyPreset(name) {
      const p = presets[name];
      if (!p) return;
      Object.assign(params, p);
      updateSun();
      applyAtmosphereParams();
      // Update lil-gui widgets to reflect new values
      gui.controllers.forEach(c => c.updateDisplay());
    }

    /* ─────────────────────────────────────────────────
       lil-gui Setup
    ───────────────────────────────────────────────── */
    const gui = new GUI({ title: 'Atmosphere', width: 230 });

    // Sun folder
    const sunFolder = gui.addFolder('Sun Position');
    sunFolder.add(params, 'azimuthDeg', 0, 360, 0.1).name('Azimuth (°)')
      .onChange(updateSun);
    sunFolder.add(params, 'elevationDeg', -20, 90, 0.1).name('Elevation (°)')
      .onChange(updateSun);
    sunFolder.open();

    // Atmosphere folder
    const atmFolder = gui.addFolder('Atmosphere');
    atmFolder.add(params, 'turbidity', 1, 20, 0.1).name('Turbidity')
      .onChange(applyAtmosphereParams);
    atmFolder.add(params, 'rayleigh', 0, 4, 0.01).name('Rayleigh')
      .onChange(applyAtmosphereParams);
    atmFolder.add(params, 'mieCoefficient', 0.001, 0.1, 0.001).name('Mie Coeff.')
      .onChange(applyAtmosphereParams);
    atmFolder.add(params, 'mieDirectionalG', 0, 1, 0.01).name('Mie Anisotropy')
      .onChange(applyAtmosphereParams);
    atmFolder.open();

    // Renderer folder
    const renFolder = gui.addFolder('Renderer');
    renFolder.add(params, 'exposure', 0.1, 2.0, 0.01).name('Exposure')
      .onChange(applyAtmosphereParams);

    /* ─────────────────────────────────────────────────
       Preset Button Wiring
    ───────────────────────────────────────────────── */
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyPreset(btn.dataset.preset);
      });
    });

    // Activate noon by default
    document.querySelector('[data-preset="noon"]').classList.add('active');
    applyPreset('noon');

    /* ─────────────────────────────────────────────────
       Resize Handler
    ───────────────────────────────────────────────── */
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    /* ─────────────────────────────────────────────────
       Render Loop
    ───────────────────────────────────────────────── */
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();