import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    /* ═══════════════════════════════════════════════════
       SPHERICAL HARMONICS — Y_lm(θ, φ)
       Real-valued form using associated Legendre polynomials.
       We use the real form:
         Y_lm = N_lm · P_l^m(cosθ) · cos(mφ)   for m ≥ 0
         Y_lm = N_lm · P_l^|m|(cosθ) · sin(|m|φ) for m < 0
       where N_lm = sqrt( (2l+1)(l-m)! / 4π(l+m)! )
    ═══════════════════════════════════════════════════ */

    // ── Factorial ──
    function factorial(n) {
      if (n <= 1) return 1;
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    }

    // ── Associated Legendre Polynomial P_l^m(x) ──
    // Using Rodrigues formula: P_l^m(x) = (-1)^m · (1-x²)^(m/2) · d^m/dx^m [P_l(x)]
    // where P_l(x) is the Legendre polynomial via Rodrigues formula.
    function legendreP(l, m, x) {
      if (m < 0) {
        // P_l^{-m} = (-1)^m · (l-m)!/(l+m)! · P_l^m
        const sign = (m % 2 === 0) ? 1 : -1;
        return sign * factorial(l - Math.abs(m)) / factorial(l + Math.abs(m)) * legendreP(l, Math.abs(m), x);
      }
      if (m === 0 && l === 0) return 1;
      if (m === 0) {
        // P_l(x) via recurrence: (l+1)P_{l+1} = (2l+1)xP_l - lP_{l-1}
        if (l === 0) return 1;
        let p0 = 1, p1 = x;
        for (let ll = 1; ll < l; ll++) {
          const p2 = ((2 * ll + 1) * x * p1 - ll * p0) / (ll + 1);
          p0 = p1; p1 = p2;
        }
        return p1;
      }
      // P_l^m for m > 0 using recurrence from P_l^0
      // P_l^m = (2m-1)(1-x²)^0.5 P_{l-1}^{m-1} + (l+m-1)(l-m+1)/(2m-1) P_{l-2}^{m}
      // Simplified: use Rodrigues on P_l
      const s = Math.sqrt(Math.max(0, 1 - x * x)); // sin(θ)
      if (s === 0) return 0;
      // Compute (1-x²)^(m/2) factor
      const sPowM = Math.pow(s, m);
      // Derivative of order m of P_l via finite difference on Rodrigues
      // P_l(x) = (1/2^l·l!)·d^l/dx^l[(x²-1)^l]
      // We use direct formula for first few l,m and general recurrence
      // For general use, build from P_l^0 and the m-recurrence
      // d/dx P_l^m = l·x/(x²-1)·P_l^m - (l+m)√(1-x²)/(x²-1)·P_{l-1}^m ... complicated
      // Use standard recurrence for P_l^m:
      // (l-m+1)P_{l+1}^m = (2l+1)xP_l^m - (l+m)P_{l-1}^m   [m-recurrence]
      // This gives P_l^m for all m from P_l^0 by applying m times.
      // Instead we use explicit formula from Wikipedia:
      // P_l^m(x) = (-1)^m·2^l·(1-x²)^(m/2)·∑_{k=m}^l (k!/(l-k)!(k-m)!)·x^(l-k)
      // Simplified: use the standard recurrence relation
      let pmm = sPowM; // P_m^m = (-1)^m·(2m-1)!!·sin^m(θ), simplified to sin^m for our case
      if (l === m) return pmm;
      // P_{m+1}^m = x·(2m+1)·P_m^m
      let pmm1 = x * (2 * m + 1) * pmm;
      if (l === m + 1) return pmm1;
      // General recurrence: (l+1)P_{l+1}^m = (2l+1)xP_l^m - (l+1-m)P_l^m-1 ... 
      // Use: (l-m)P_l^m = x(2l-1)P_{l-1}^m - (l+m-1)P_{l-2}^m
      let plm2 = pmm, plm1 = pmm1;
      for (let ll = m + 2; ll <= l; ll++) {
        const plm = (x * (2 * ll - 1) * plm1 - (ll + m - 1) * plm2) / (ll - m);
        plm2 = plm1; plm1 = plm;
      }
      return plm1;
    }

    // ── Real spherical harmonic Y_lm(θ, φ) ──
    // θ = polar angle [0, π], φ = azimuthal angle [0, 2π]
    function Ylm(l, m, theta, phi) {
      const absM = Math.abs(m);
      const norm = Math.sqrt((2 * l + 1) * factorial(l - absM) / (4 * Math.PI * factorial(l + absM)));
      const P = legendreP(l, absM, Math.cos(theta));
      if (m === 0) return norm * P;
      if (m > 0) return norm * Math.sqrt(2) * P * Math.cos(absM * phi);
      return norm * Math.sqrt(2) * P * Math.sin(absM * phi);
    }

    /* ═══════════════════════════════════════════════════
       SCENE SETUP
    ═══════════════════════════════════════════════════ */

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    /* ═══════════════════════════════════════════════════
       MESH
       SphereGeometry with ~130k vertices for smooth deformation.
    ═══════════════════════════════════════════════════ */

    // Store original vertex positions
    const SPHERE_SEGS = 128;
    const geometry = new THREE.SphereGeometry(1.0, SPHERE_SEGS, SPHERE_SEGS);
    const positions = geometry.attributes.position;
    const vertexCount = positions.count;

    // Keep original positions as reference (deep copy)
    const origPos = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount * 3; i++) origPos[i] = positions.getX(i / 3 | 0); // need per-vertex
    // Actually copy properly:
    for (let i = 0; i < vertexCount; i++) {
      origPos[i * 3 + 0] = positions.getX(i);
      origPos[i * 3 + 1] = positions.getY(i);
      origPos[i * 3 + 2] = positions.getZ(i);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x7ec8e3,
      metalness: 0.25,
      roughness: 0.45,
      wireframe: false,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x334455, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x445566, 0.6);
    backLight.position.set(-3, -2, -3);
    scene.add(backLight);

    /* ═══════════════════════════════════════════════════
       HARMONIC MODE STATE
       We track the "target" coefficient set by sliders
       and smoothly lerp toward them each frame.
    ═══════════════════════════════════════════════════ */

    // Slider coefficients: { l: { m: targetValue } }
    const coeff = {
      2: { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 },
      3: { '-3': 0, '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0, '3': 0 },
      4: { '-4': 0, '-3': 0, '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0 },
    };

    // Smooth (lerped) coefficients
    const coeffSmooth = JSON.parse(JSON.stringify(coeff));
    const LERP_SPEED = 0.08;

    /* ═══════════════════════════════════════════════════
       FORMULA DISPLAY — show active Y_lm with non-zero coeff
    ═══════════════════════════════════════════════════ */

    const formulaText = document.getElementById('formula-text');

    function buildFormula() {
      // Collect non-zero modes
      const lines = [];
      for (const l of [2, 3, 4]) {
        for (const mStr of Object.keys(coeff[l])) {
          const v = coeff[l][mStr];
          if (Math.abs(v) > 0.001) {
            const m = parseInt(mStr);
            const sign = v > 0 ? '+' : '';
            lines.push(`  ${sign}${v.toFixed(2)} · Y_${l}^{m}(θ,φ)`);
          }
        }
      }
      if (lines.length === 0) {
        formulaText.textContent = `Y_lm(θ,φ) = N·P_l^m(cosθ)·e^(imφ)\n\n(l=2,3,4; m=-l..+l)\n\n  All modes zero — drag sliders.`;
      } else {
        formulaText.textContent = `R(θ,φ) = 1 + Σ c_lm·Y_lm(θ,φ)\n\nActive modes:\n${lines.join('\n')}`;
      }
    }

    /* ═══════════════════════════════════════════════════
       DEFORMATION FUNCTION
       Apply spherical harmonic displacement along radius.
    ═══════════════════════════════════════════════════ */

    function applyDeformation() {
      const pos = geometry.attributes.position;
      const θs = new Float32Array(vertexCount); // polar
      const φs = new Float32Array(vertexCount); // azimuthal

      for (let i = 0; i < vertexCount; i++) {
        const ox = origPos[i * 3 + 0];
        const oy = origPos[i * 3 + 1];
        const oz = origPos[i * 3 + 2];

        const r = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const theta = Math.acos(Math.max(-1, Math.min(1, oz / r))); // [0, π]
        const phi = Math.atan2(oy, ox); // [-π, π]

        θs[i] = theta;
        φs[i] = phi;

        // Accumulate displacement from each harmonic
        let disp = 0;
        for (const l of [2, 3, 4]) {
          for (const mStr of Object.keys(coeffSmooth[l])) {
            const m = parseInt(mStr);
            disp += coeffSmooth[l][mStr] * Ylm(l, m, theta, phi);
          }
        }

        const newR = r + disp * 0.45; // scale factor for visible deformation
        const sinT = Math.sin(theta);
        pos.setXYZ(i, Math.cos(phi) * sinT * newR, Math.sin(phi) * sinT * newR, Math.cos(theta) * newR);
      }

      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    /* ═══════════════════════════════════════════════════
       SLIDER BINDINGS
    ═══════════════════════════════════════════════════ */

    for (const l of [2, 3, 4]) {
      const mRange = [];
      for (let m = -l; m <= l; m++) mRange.push(m);
      for (const m of mRange) {
        const key = String(m);
        const slider = document.getElementById(`sl_${l}_${key}`);
        const valEl = document.getElementById(`v_${l}_${key}`);
        if (!slider) continue;
        slider.addEventListener('input', () => {
          coeff[l][key] = parseFloat(slider.value);
          valEl.textContent = parseFloat(slider.value).toFixed(2);
          buildFormula();
        });
      }
    }

    /* ═══════════════════════════════════════════════════
       WIREFRAME TOGGLE
    ═══════════════════════════════════════════════════ */

    let wireframeOn = false;
    const wfBtn = document.getElementById('wf-btn');
    wfBtn.addEventListener('click', () => {
      wireframeOn = !wireframeOn;
      material.wireframe = wireframeOn;
      wfBtn.classList.toggle('active', wireframeOn);
    });

    /* ═══════════════════════════════════════════════════
       RESET
    ═══════════════════════════════════════════════════ */

    document.getElementById('reset-btn').addEventListener('click', () => {
      for (const l of [2, 3, 4]) {
        for (const key of Object.keys(coeff[l])) {
          coeff[l][key] = 0;
          const slider = document.getElementById(`sl_${l}_${key}`);
          const valEl = document.getElementById(`v_${l}_${key}`);
          if (slider) slider.value = 0;
          if (valEl) valEl.textContent = '0.00';
        }
      }
      buildFormula();
    });

    /* ═══════════════════════════════════════════════════
       AUTO-RESIZE
    ═══════════════════════════════════════════════════ */

    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    /* ═══════════════════════════════════════════════════
       ANIMATION LOOP
    ═══════════════════════════════════════════════════ */

    function lerp(a, b, t) { return a + (b - a) * t; }

    function animate() {
      requestAnimationFrame(animate);

      // Smooth lerp of coefficients
      for (const l of [2, 3, 4]) {
        for (const key of Object.keys(coeffSmooth[l])) {
          coeffSmooth[l][key] = lerp(coeffSmooth[l][key], coeff[l][key], LERP_SPEED);
        }
      }

      applyDeformation();
      controls.update();
      renderer.render(scene, camera);
    }

    buildFormula();
    animate();