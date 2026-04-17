import * as THREE from 'three';
    import { OrbitControls }    from 'three/addons/controls/OrbitControls.js';
    import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';

    // ─────────────────────────────────────────────
    //  Scene / Camera / Renderer
    // ─────────────────────────────────────────────
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    // ─────────────────────────────────────────────
    //  Post-processing: UnrealBloomPass
    // ─────────────────────────────────────────────
    const composer    = new EffectComposer(renderer);
    const renderPass  = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      1.5,   // strength
      0.4,   // radius
      0.85   // threshold
    );
    composer.addPass(bloomPass);

    // ─────────────────────────────────────────────
    //  OrbitControls
    // ─────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 200;

    // ─────────────────────────────────────────────
    //  Particle buffers
    // ─────────────────────────────────────────────
    const COUNT = 12000;  // total particles

    // Pre-allocated arrays for position updates (avoids per-frame GC pressure)
    const positions  = new Float32Array(COUNT * 3);
    const colors     = new Float32Array(COUNT * 3);
    const sizes      = new Float32Array(COUNT);

    // Per-particle runtime data
    const particleData = [];

    // ─────────────────────────────────────────────
    //  Build geometry & material
    // ─────────────────────────────────────────────
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    // Custom shader material for variable point sizes + additive glow
    const material = new THREE.ShaderMaterial({
      uniforms: {},   // no uniforms needed with built-in size attribute
      vertexShader: /* glsl */`
        attribute float size;
        attribute vec3  color;
        varying   vec3  vColor;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Scale point size by distance so particles don't disappear in depth
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position  = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vColor;

        void main() {
          // Soft circular point with bright core
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.2, 0.5, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
      vertexColors: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ─────────────────────────────────────────────
    //  Initialise particle data
    // ─────────────────────────────────────────────
    const BASS_MODE = 0;
    const MID_MODE  = 1;
    const TREBLE_MODE = 2;

    function initParticle(i) {
      // Assign each particle to one of three frequency modes
      const mode = i % 3;

      // Random spherical distribution on init
      const theta  = Math.random() * Math.PI * 2;
      const phi    = Math.acos(2 * Math.random() - 1);
      const radius = 20 + Math.random() * 30;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      // Base colour per mode: bass=red/orange, mid=cyan/green, treble=violet/white
      let r, g, b;
      if (mode === BASS_MODE) {
        r = 0.9; g = 0.3; b = 0.1;
      } else if (mode === MID_MODE) {
        r = 0.1; g = 0.8; b = 0.6;
      } else {
        r = 0.6; g = 0.4; b = 1.0;
      }

      // Store persistent state for each particle
      const pd = {
        mode,
        theta,
        phi,
        radius,
        x, y, z,
        r, g, b,
        // Bass: ring pulse
        bassPhase:  Math.random() * Math.PI * 2,
        bassSpeed:  0.5 + Math.random() * 1.5,
        // Mid: figure-8 orbit
        midT:       Math.random() * Math.PI * 2,
        midSpeed:   0.3 + Math.random() * 1.0,
        midAmp:     5 + Math.random() * 15,
        midAxisY:   (Math.random() - 0.5) * 0.8,
        // Treble: spark burst
        trebleVel:  new THREE.Vector3(),
        trebleLife: Math.random(),
        trebleDecay: 0.005 + Math.random() * 0.015,
      };

      particleData[i] = pd;
      sizes[i] = 1.5 + Math.random() * 2.5;
      updateParticleColor(i);
    }

    function updateParticleColor(i) {
      const pd = particleData[i];
      colors[i * 3]     = pd.r;
      colors[i * 3 + 1] = pd.g;
      colors[i * 3 + 2] = pd.b;
    }

    // Initialise all particles
    for (let i = 0; i < COUNT; i++) {
      initParticle(i);
      positions[i * 3]     = particleData[i].x;
      positions[i * 3 + 1] = particleData[i].y;
      positions[i * 3 + 2] = particleData[i].z;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate    = true;
    geometry.attributes.size.needsUpdate     = true;

    // ─────────────────────────────────────────────
    //  Web Audio API
    // ─────────────────────────────────────────────
    let audioCtx   = null;
    let analyser   = null;
    let freqData   = null;   // Uint8Array — frequency bins
    let timeData   = null;   // Uint8Array — time-domain waveform
    let isPlaying  = false;

    function getAudioContext() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return audioCtx;
    }

    // Returns bass / mid / treble averages from current FFT frame
    function getFFTLevels() {
      if (!analyser || !freqData) return { bass: 0, mid: 0, treble: 0 };

      analyser.getByteFrequencyData(freqData);
      const len    = freqData.length;
      const bassEnd  = Math.floor(len * 0.1);        // 0–10%  → bass
      const midEnd   = Math.floor(len * 0.5);        // 10–50% → mid
      // treble = 50–100%

      let bassSum = 0, midSum = 0, trebleSum = 0;
      for (let i = 0;       i < bassEnd; i++) bassSum   += freqData[i];
      for (let i = bassEnd; i < midEnd;  i++) midSum    += freqData[i];
      for (let i = midEnd;  i < len;     i++) trebleSum += freqData[i];

      return {
        bass:   bassSum   / (bassEnd            * 255),
        mid:    midSum    / ((midEnd - bassEnd) * 255),
        treble: trebleSum / ((len - midEnd)     * 255),
      };
    }

    // ─────────────────────────────────────────────
    //  Load audio file
    // ─────────────────────────────────────────────
    const loadBtn  = document.getElementById('loadBtn');
    const fileInput = document.getElementById('fileInput');

    loadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      // Stop any previous source
      if (isPlaying) {
        // nothing to stop — handled by garbage-collecting the old source node
      }

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Set up analyser
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);

      // Connect: source → analyser → destination (speakers)
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop   = true;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      source.start(0);
      isPlaying = true;

      loadBtn.textContent = '🔊 Playing — reload another?';
    });

    // ─────────────────────────────────────────────
    //  Demo oscillator (used when no audio is loaded)
    // ─────────────────────────────────────────────
    let demoOscActive = false;
    let demoOsc, demoGain, demoLFO, demoLFOGain;

    function startDemoOscillator() {
      if (demoOscActive) return;
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);

      // Bass oscillator
      demoOsc = ctx.createOscillator();
      demoOsc.type = 'sine';
      demoOsc.frequency.value = 80;

      // LFO to modulate bass amplitude (simulates pulsing beat)
      demoLFO = ctx.createOscillator();
      demoLFO.frequency.value = 2.0; // 2 Hz pulse
      demoLFOGain = ctx.createGain();
      demoLFOGain.gain.value = 0.6;

      demoGain = ctx.createGain();
      demoGain.gain.value = 0.4;

      demoLFO.connect(demoLFOGain);
      demoLFOGain.connect(demoGain.gain);
      demoOsc.connect(demoGain);
      demoGain.connect(analyser);
      analyser.connect(ctx.destination);

      demoOsc.start();
      demoLFO.start();
      demoOscActive = true;
      loadBtn.textContent = '🔊 Demo Oscillator Active';
    }

    // Auto-start demo oscillator so something is visible immediately
    startDemoOscillator();

    // ─────────────────────────────────────────────
    //  Particle update functions per frequency band
    // ─────────────────────────────────────────────

    // Bass — pulsing concentric rings
    function updateBass(i, pd, fft, t) {
      // Vary ring radius based on bass energy + time phase
      pd.bassPhase += pd.bassSpeed * (0.05 + fft.bass * 0.3);
      const pulseR = pd.radius + Math.sin(pd.bassPhase) * (2 + fft.bass * 18);

      // Slowly rotate the ring around Y-axis
      pd.theta += 0.005 + fft.bass * 0.04;

      pd.x = pulseR * Math.sin(pd.phi) * Math.cos(pd.theta);
      pd.y = pulseR * Math.cos(pd.phi) * (0.5 + fft.bass * 2);
      pd.z = pulseR * Math.sin(pd.phi) * Math.sin(pd.theta);

      // Colour intensity modulated by bass
      const brightness = 0.4 + fft.bass * 1.6;
      pd.r = Math.min(1.0, brightness * 0.9);
      pd.g = Math.min(1.0, brightness * 0.3);
      pd.b = Math.min(1.0, brightness * 0.1);
      sizes[i] = (1.5 + fft.bass * 4.0) * (1.0 + Math.sin(pd.bassPhase * 2) * 0.3);
    }

    // Mid — figure-8 (Lemniscate) orbit
    function updateMid(i, pd, fft, t) {
      pd.midT += pd.midSpeed * (0.03 + fft.mid * 0.15);

      // Standard figure-8 (lemniscate of Bernoulli) parametrisation
      const a   = pd.midAmp * (1 + fft.mid * 1.2);
      const cosT = Math.cos(pd.midT);
      const denom = 1 + Math.sin(pd.midT) * Math.sin(pd.midT);

      // Centre the orbit at a default radius so particles don't all collapse to origin
      const baseR = pd.radius * 0.5;
      pd.x = baseR + a * cosT / denom;
      pd.z = baseR + a * cosT * Math.sin(pd.midT) / denom;
      pd.y = a * Math.sin(pd.midT * 2) * pd.midAxisY * (0.5 + fft.mid);

      // Colour: cyan-green family, brightens with mid energy
      const bright = 0.3 + fft.mid * 1.8;
      pd.r = Math.min(1.0, bright * 0.1);
      pd.g = Math.min(1.0, bright * 0.85);
      pd.b = Math.min(1.0, bright * 0.65);
      sizes[i] = (1.2 + fft.mid * 3.5);
    }

    // Treble — fast spark bursts radiating outward
    function updateTreble(i, pd, fft, t) {
      pd.trebleLife -= pd.trebleDecay;

      if (pd.trebleLife <= 0) {
        // Burst: pick a random outward direction from origin
        const dirTheta = Math.random() * Math.PI * 2;
        const dirPhi   = Math.acos(2 * Math.random() - 1);
        const speed    = 0.3 + fft.treble * 1.8 + Math.random() * 0.8;

        pd.trebleVel.set(
          speed * Math.sin(dirPhi) * Math.cos(dirTheta),
          speed * Math.sin(dirPhi) * Math.sin(dirTheta),
          speed * Math.cos(dirPhi)
        );

        pd.trebleLife = 0.3 + Math.random() * 0.5;
        pd.x = (Math.random() - 0.5) * 5;
        pd.y = (Math.random() - 0.5) * 5;
        pd.z = (Math.random() - 0.5) * 5;
      }

      // Integrate position with treble velocity, damp slightly each frame
      const drag = 0.96;
      pd.x += pd.trebleVel.x * fft.treble;
      pd.y += pd.trebleVel.y * fft.treble;
      pd.z += pd.trebleVel.z * fft.treble;
      pd.trebleVel.multiplyScalar(drag);

      // Colour: violet-white sparks
      const bright = 0.5 + pd.trebleLife * 1.5 + fft.treble * 1.5;
      pd.r = Math.min(1.0, bright * 0.65);
      pd.g = Math.min(1.0, bright * 0.40);
      pd.b = Math.min(1.0, bright * 1.00);
      sizes[i] = (0.8 + fft.treble * 3.0) * Math.max(0.2, pd.trebleLife);
    }

    // ─────────────────────────────────────────────
    //  Animation loop
    // ─────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const t   = clock.getElapsedTime();
      const fft = getFFTLevels();

      // Update each particle
      for (let i = 0; i < COUNT; i++) {
        const pd = particleData[i];
        if      (pd.mode === BASS_MODE)   updateBass(i, pd, fft, t);
        else if (pd.mode === MID_MODE)    updateMid(i, pd, fft, t);
        else                              updateTreble(i, pd, fft, t);

        positions[i * 3]     = pd.x;
        positions[i * 3 + 1] = pd.y;
        positions[i * 3 + 2] = pd.z;

        colors[i * 3]     = pd.r;
        colors[i * 3 + 1] = pd.g;
        colors[i * 3 + 2] = pd.b;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate    = true;
      geometry.attributes.size.needsUpdate     = true;

      controls.update();
      composer.render();
    }

    animate();

    // ─────────────────────────────────────────────
    //  Auto-resize handler
    // ─────────────────────────────────────────────
    window.addEventListener('resize', () => {
      const w = innerWidth, h = innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    });