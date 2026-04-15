import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // ─── Scene Setup ───────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.018);

    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 3, 0);
    controls.update();

    // ─── Lighting ───────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xa0c4ff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x4060ff, 1.5, 40);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // ─── Grid Ground ───────────────────────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(60, 40, 0x1a1a3a, 0x0f0f1a);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x080810,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // ─── Waveform Ribbon Geometry ──────────────────────────────────────────────
    const WAVEFORM_POINTS = 512;
    const WAVEFORM_WIDTH = 30;

    const waveformPositions = new Float32Array(WAVEFORM_POINTS * 2 * 3);
    const waveformNormals = new Float32Array(WAVEFORM_POINTS * 2 * 3);
    const waveformUvs = new Float32Array(WAVEFORM_POINTS * 2 * 2);
    const waveformIndices = [];

    for (let i = 0; i < WAVEFORM_POINTS; i++) {
      const t = i / (WAVEFORM_POINTS - 1);
      // top vertex
      waveformPositions[i * 6 + 0] = (t - 0.5) * WAVEFORM_WIDTH;
      waveformPositions[i * 6 + 1] = 0;
      waveformPositions[i * 6 + 2] = 0;
      // bottom vertex
      waveformPositions[i * 6 + 3] = (t - 0.5) * WAVEFORM_WIDTH;
      waveformPositions[i * 6 + 4] = -0.5;
      waveformPositions[i * 6 + 5] = 0;

      waveformNormals[i * 6 + 0] = 0; waveformNormals[i * 6 + 1] = 1; waveformNormals[i * 6 + 2] = 0;
      waveformNormals[i * 6 + 3] = 0; waveformNormals[i * 6 + 4] = -1; waveformNormals[i * 6 + 5] = 0;

      waveformUvs[i * 4 + 0] = t; waveformUvs[i * 4 + 1] = 1;
      waveformUvs[i * 4 + 2] = t; waveformUvs[i * 4 + 3] = 0;

      if (i < WAVEFORM_POINTS - 1) {
        const base = i * 2;
        waveformIndices.push(base, base + 1, base + 2);
        waveformIndices.push(base + 1, base + 3, base + 2);
      }
    }

    const waveformGeo = new THREE.BufferGeometry();
    waveformGeo.setAttribute('position', new THREE.BufferAttribute(waveformPositions, 3));
    waveformGeo.setAttribute('normal', new THREE.BufferAttribute(waveformNormals, 3));
    waveformGeo.setAttribute('uv', new THREE.BufferAttribute(waveformUvs, 2));
    waveformGeo.setIndex(waveformIndices);

    const waveformMat = new THREE.MeshStandardMaterial({
      color: 0x40e0ff,
      emissive: 0x103060,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.6,
      side: THREE.DoubleSide,
    });

    const waveformMesh = new THREE.Mesh(waveformGeo, waveformMat);
    waveformMesh.position.y = 1;
    waveformMesh.castShadow = true;
    scene.add(waveformMesh);

    // Edge glow line
    const edgePoints = [];
    for (let i = 0; i < WAVEFORM_POINTS; i++) {
      edgePoints.push(new THREE.Vector3());
    }
    const edgeLineGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
    const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x80ffff, transparent: true, opacity: 0.7 });
    const edgeLine = new THREE.Line(edgeLineGeo, edgeLineMat);
    edgeLine.position.y = 1.5;
    scene.add(edgeLine);

    // ─── Spectrum Bars ─────────────────────────────────────────────────────────
    const BAR_COUNT = 128;
    const BAR_SPACING = 0.25;
    const BAR_TOTAL_WIDTH = BAR_COUNT * BAR_SPACING;

    const barGeo = new THREE.BoxGeometry(0.18, 1, 0.18);
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      roughness: 0.2,
      metalness: 0.8,
    });

    const barInstancedMesh = new THREE.InstancedMesh(barGeo, barMat, BAR_COUNT);
    barInstancedMesh.castShadow = true;
    barInstancedMesh.receiveShadow = true;
    scene.add(barInstancedMesh);

    const dummy = new THREE.Object3D();
    const spectrumHeights = new Float32Array(BAR_COUNT);

    for (let i = 0; i < BAR_COUNT; i++) {
      const x = (i / (BAR_COUNT - 1) - 0.5) * BAR_TOTAL_WIDTH;
      dummy.position.set(x, 0, 0);
      dummy.scale.set(1, 0.01, 1);
      dummy.updateMatrix();
      barInstancedMesh.setMatrixAt(i, dummy.matrix);
      barInstancedMesh.setColorAt(i, new THREE.Color().setHSL(0, 0, 0));
    }
    barInstancedMesh.instanceMatrix.needsUpdate = true;
    barInstancedMesh.instanceColor.needsUpdate = true;

    // ─── Audio State ───────────────────────────────────────────────────────────
    let audioCtx = null;
    let analyser = null;
    let sourceNode = null;
    let audioBuffer = null;
    let isPlaying = false;
    let startTime = 0;
    let pauseTime = 0;
    let mode = 'spectrum'; // 'spectrum' | 'waveform'
    let audioLoaded = false;
    let demoPhase = 0;

    const timeDomainData = new Uint8Array(1024);
    const frequencyData = new Uint8Array(512);

    function initAudio() {
      if (audioCtx) return;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(audioCtx.destination);
    }

    function loadAudioFile(file) {
      initAudio();
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          audioBuffer = await audioCtx.decodeAudioData(e.target.result);
          audioLoaded = true;
          pauseTime = 0;
          document.getElementById('fileName').textContent = file.name;
          playAudio();
        } catch (err) {
          console.error('Failed to decode audio:', err);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    function generateDemoData(time) {
      demoPhase += 0.016;
      const freqCount = frequencyData.length;
      const timeCount = timeDomainData.length;

      for (let i = 0; i < freqCount; i++) {
        const t = i / freqCount;
        // layered sine waves for demo spectrum
        const base = Math.sin(t * Math.PI * 4 + demoPhase * 1.5) * 0.4;
        const mid = Math.sin(t * Math.PI * 12 + demoPhase * 2.3) * 0.25;
        const high = Math.sin(t * Math.PI * 24 + demoPhase * 3.7) * 0.15;
        const peak = Math.exp(-Math.pow((t - 0.5 + Math.sin(demoPhase * 0.5) * 0.1) * 6, 2)) * 0.6;
        const noise = (Math.random() - 0.5) * 0.08;
        const val = Math.abs(base + mid + high + peak + noise);
        frequencyData[i] = Math.min(255, Math.max(0, val * 255));
      }

      for (let i = 0; i < timeCount; i++) {
        const t = i / timeCount;
        const val = Math.sin(t * Math.PI * 8 + demoPhase * 2) * 0.3
                  + Math.sin(t * Math.PI * 20 + demoPhase * 1.2) * 0.2
                  + Math.sin(t * Math.PI * 40 + demoPhase * 3) * 0.1
                  + (Math.random() - 0.5) * 0.05;
        timeDomainData[i] = 128 + val * 80;
      }
    }

    function playAudio() {
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      stopSource();

      if (audioLoaded && audioBuffer) {
        sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(analyser);
        sourceNode.start(0, pauseTime);
        sourceNode.onended = () => { isPlaying = false; updatePlayBtn(); };
        startTime = audioCtx.currentTime - pauseTime;
      } else {
        isPlaying = true;
      }
      isPlaying = true;
      updatePlayBtn();
    }

    function stopSource() {
      if (sourceNode) {
        try { sourceNode.onended = null; sourceNode.stop(); } catch (_) {}
        try { sourceNode.disconnect(); } catch (_) {}
        sourceNode = null;
      }
    }

    function pauseAudio() {
      if (!audioCtx) return;
      if (audioLoaded && audioBuffer && isPlaying) {
        pauseTime = audioCtx.currentTime - startTime;
        if (pauseTime < 0) pauseTime = 0;
        if (pauseTime >= audioBuffer.duration) pauseTime = 0;
      }
      stopSource();
      isPlaying = false;
      updatePlayBtn();
    }

    function togglePlay() {
      initAudio();
      if (isPlaying) {
        pauseAudio();
      } else {
        playAudio();
      }
    }

    function updatePlayBtn() {
      document.getElementById('playBtn').textContent = isPlaying ? 'Pause' : 'Play';
    }

    function toggleMode() {
      mode = mode === 'spectrum' ? 'waveform' : 'spectrum';
      document.getElementById('toggleBtn').textContent = mode === 'spectrum' ? 'Spectrum' : 'Waveform';
      document.getElementById('toggleBtn').classList.toggle('active', mode === 'spectrum');
      waveformMesh.visible = mode === 'waveform';
      edgeLine.visible = mode === 'waveform';
      barInstancedMesh.visible = mode === 'spectrum';
    }

    // ─── Update Functions ───────────────────────────────────────────────────────
    function updateWaveform() {
      const pos = waveformGeo.attributes.position.array;
      const edgePos = edgeLineGeo.attributes.position.array;

      for (let i = 0; i < WAVEFORM_POINTS; i++) {
        const idx = Math.floor(i / WAVEFORM_POINTS * timeDomainData.length);
        const val = (timeDomainData[idx] - 128) / 128;

        const t = i / (WAVEFORM_POINTS - 1);
        const x = (t - 0.5) * WAVEFORM_WIDTH;

        // top vertex
        pos[i * 6 + 0] = x;
        pos[i * 6 + 1] = val * 3 + 0.25;
        pos[i * 6 + 2] = 0;
        // bottom vertex
        pos[i * 6 + 3] = x;
        pos[i * 6 + 4] = val * 3 - 0.25;
        pos[i * 6 + 5] = 0;

        edgePos[i * 3] = x;
        edgePos[i * 3 + 1] = val * 3 + 0.5;
        edgePos[i * 3 + 2] = 0;
      }

      waveformGeo.attributes.position.needsUpdate = true;
      waveformGeo.computeVertexNormals();
      edgeLineGeo.attributes.position.needsUpdate = true;

      // Update waveform color based on amplitude
      let maxAmp = 0;
      for (let i = 0; i < WAVEFORM_POINTS; i++) {
        const idx = Math.floor(i / WAVEFORM_POINTS * timeDomainData.length);
        const val = Math.abs((timeDomainData[idx] - 128) / 128);
        if (val > maxAmp) maxAmp = val;
      }
      const hue = 0.5 - maxAmp * 0.4;
      waveformMat.color.setHSL(hue, 0.8, 0.5);
      waveformMat.emissive.setHSL(hue, 0.8, 0.15);
      edgeLineMat.color.setHSL(hue, 1.0, 0.65);
    }

    function updateSpectrum() {
      for (let i = 0; i < BAR_COUNT; i++) {
        // Map bar index to frequency bin (non-linear, focus on lower freqs)
        const fi = Math.floor(Math.pow(i / BAR_COUNT, 1.4) * (frequencyData.length * 0.6));
        const val = frequencyData[fi] / 255;
        spectrumHeights[i] = val;

        const hue = 0.0 + (i / BAR_COUNT) * 0.65; // red (0) to blue (0.65)
        const lightness = 0.2 + val * 0.5;
        const color = new THREE.Color().setHSL(hue, 0.9, lightness);

        const x = (i / (BAR_COUNT - 1) - 0.5) * BAR_TOTAL_WIDTH;
        const height = Math.max(0.02, val * 12);
        dummy.position.set(x, height / 2, 0);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();
        barInstancedMesh.setMatrixAt(i, dummy.matrix);
        barInstancedMesh.setColorAt(i, color);
      }
      barInstancedMesh.instanceMatrix.needsUpdate = true;
      barInstancedMesh.instanceColor.needsUpdate = true;
    }

    // ─── Event Listeners ────────────────────────────────────────────────────────
    document.getElementById('fileInput').addEventListener('change', (e) => {
      if (e.target.files[0]) loadAudioFile(e.target.files[0]);
    });
    document.getElementById('playBtn').addEventListener('click', togglePlay);
    document.getElementById('toggleBtn').addEventListener('click', toggleMode);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'KeyT') toggleMode();
      if (e.code === 'KeyR') {
        camera.position.set(0, 8, 22);
        controls.target.set(0, 3, 0);
        controls.update();
      }
    });

    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // ─── Attach to window ──────────────────────────────────────────────────────
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;
    window.analyser = analyser;
    window.audioCtx = audioCtx;

    // ─── Animation Loop ────────────────────────────────────────────────────────
    let frameCount = 0;
    function animate() {
      requestAnimationFrame(animate);
      frameCount++;

      // Update audio data every 2 frames for performance
      if (frameCount % 2 === 0) {
        if (isPlaying && analyser && audioLoaded) {
          analyser.getByteTimeDomainData(timeDomainData);
          analyser.getByteFrequencyData(frequencyData);
        } else if (isPlaying) {
          generateDemoData(0);
        } else {
          // Still animate demo waveform when paused
          generateDemoData(0);
          if (analyser) {
            analyser.getByteTimeDomainData(timeDomainData);
            analyser.getByteFrequencyData(frequencyData);
          }
        }

        if (mode === 'waveform') {
          updateWaveform();
        } else {
          updateSpectrum();
        }
      }

      // Subtle camera sway
      pointLight.position.x = Math.sin(Date.now() * 0.0008) * 5;
      pointLight.position.z = Math.cos(Date.now() * 0.0006) * 5;

      controls.update();
      renderer.render(scene, camera);
    }

    // Initial demo data
    generateDemoData(0);
    animate();