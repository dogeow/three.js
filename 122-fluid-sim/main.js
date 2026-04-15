import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    document.body.appendChild(renderer.domElement);

    // ---- Camera ----
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 3.5, 3.5);
    camera.lookAt(0, 0, 0);

    // ---- Controls ----
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.minDistance = 1.5;
    controls.maxDistance = 12;
    controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };

    // ---- Main Scene ----
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.08);

    // ---- Simulation resolution ----
    const SIM_RES = 512;
    const TEX_SIZE = SIM_RES;

    function makeRT(w, h) {
      return new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false,
      });
    }

    // Ping-pong render targets
    let velRT = [makeRT(TEX_SIZE, TEX_SIZE), makeRT(TEX_SIZE, TEX_SIZE)];
    let presRT = [makeRT(TEX_SIZE, TEX_SIZE), makeRT(TEX_SIZE, TEX_SIZE)];
    let dyeRT = [makeRT(TEX_SIZE, TEX_SIZE), makeRT(TEX_SIZE, TEX_SIZE)];
    let divRT = makeRT(TEX_SIZE, TEX_SIZE);
    let curlRT = makeRT(TEX_SIZE, TEX_SIZE);

    let velIdx = 0;
    let presIdx = 0;
    let dyeIdx = 0;

    // ---- Offscreen scene & camera ----
    const offCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const offScene = new THREE.Scene();
    const offGeo = new THREE.PlaneGeometry(2, 2);
    const offMesh = new THREE.Mesh(offGeo, null);
    offScene.add(offMesh);

    function blit(mat, target) {
      offMesh.material = mat;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(offScene, offCamera);
    }

    // ---- Helper: fullscreen quad material builder ----
    function makeMat(fragId, uniforms) {
      const vert = document.getElementById('baseVert').textContent;
      const frag = document.getElementById(fragId).textContent;
      return new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms,
        depthTest: false,
        depthWrite: false,
      });
    }

    const texelSize = new THREE.Vector2(1 / TEX_SIZE, 1 / TEX_SIZE);
    const simUniforms = () => ({
      uVelocity: { value: null },
      uTexture: { value: null },
      uSource: { value: null },
      uTarget: { value: null },
      uTexelSize: { value: texelSize },
      uDt: { value: 0.016 },
      uDissipation: { value: 0.995 },
      uColor: { value: new THREE.Vector3(0, 0, 0) },
      uScale: { value: 0.0 },
      uPoint: { value: new THREE.Vector2(0.5, 0.5) },
      uRadius: { value: 0.0005 },
      uPressure: { value: null },
      uDivergence: { value: null },
      uCurl: { value: null },
      uCurlStrength: { value: 30.0 },
      uDensity: { value: null },
      uExposure: { value: 2.8 },
    });

    const advectMat = makeMat('advectFrag', simUniforms());
    const divMat = makeMat('divergenceFrag', simUniforms());
    const presMat = makeMat('pressureFrag', simUniforms());
    const gradMat = makeMat('gradientSubtractFrag', simUniforms());
    const splatMat = makeMat('splatFrag', simUniforms());
    const curlMat = makeMat('curlFrag', simUniforms());
    const vortMat = makeMat('vorticityFrag', simUniforms());
    const clearMat = makeMat('clearFrag', simUniforms());
    const displayMat = makeMat('displayFrag', {
      uDensity: { value: null },
      uExposure: { value: 2.8 },
    });

    // ---- Display mesh ----
    const planeGeo = new THREE.PlaneGeometry(4, 4);
    const planeMesh = new THREE.Mesh(planeGeo, displayMat);
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.position.y = -0.001;
    scene.add(planeMesh);

    // ---- Floor plane ----
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.ShaderMaterial({
      vertexShader: document.getElementById('baseVert').textContent,
      fragmentShader: document.getElementById('floorFrag').textContent,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.01;
    scene.add(floor);

    // ---- Ambient lighting ----
    const ambLight = new THREE.AmbientLight(0x112244, 0.4);
    scene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0x334466, 0.3);
    dirLight.position.set(2, 5, 3);
    scene.add(dirLight);

    // ---- Simulation params ----
    const JACOBI_ITERS = 40;
    const ADVECT_DT = 0.5;
    const VEL_DISSIPATION = 0.99;
    const DYE_DISSIPATION = 0.982;
    const CURL_STRENGTH = 35.0;

    // ---- Clear all RTs ----
    function clearRT(rt) {
      clearMat.uniforms.uTexture.value = rt.texture;
      clearMat.uniforms.uColor.value.set(0, 0, 0);
      clearMat.uniforms.uScale.value = 0.0;
      blit(clearMat, rt);
    }

    // Init
    [velRT[0], velRT[1], dyeRT[0], dyeRT[1], presRT[0], presRT[1]].forEach(clearRT);

    // ---- Mouse interaction ----
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const mouseNDC = new THREE.Vector2();
    let isPointerDown = false;
    let lastPointer = null;
    let pointerVelocity = new THREE.Vector2(0, 0);
    let pointerColor = new THREE.Vector3(1, 1, 1);
    let colorPhase = 0;

    // Color cycling
    function nextColor() {
      colorPhase += 0.08;
      const r = 0.5 + 0.5 * Math.sin(colorPhase * 1.3 + 0.0);
      const g = 0.5 + 0.5 * Math.sin(colorPhase * 1.3 + 2.094);
      const b = 0.5 + 0.5 * Math.sin(colorPhase * 1.3 + 4.189);
      const mag = Math.sqrt(r * r + g * g + b * b) + 0.001;
      pointerColor.set(r / mag * 2.5, g / mag * 2.5, b / mag * 2.5);
    }

    function getSimUV(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = event.clientX !== undefined ? event.clientX : event.touches?.[0]?.clientX ?? 0;
      const clientY = event.clientY !== undefined ? event.clientY : event.touches?.[0]?.clientY ?? 0;
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(plane, target);
      if (!hit) return null;
      // Map world coords (-2..2) to UV (0..1)
      const u = (target.x + 2) / 4;
      const v = (target.z + 2) / 4;
      return new THREE.Vector2(
        Math.max(0.001, Math.min(0.999, u)),
        Math.max(0.001, Math.min(0.999, v))
      );
    }

    // Left click/drag = splat
    renderer.domElement.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        isPointerDown = true;
        lastPointer = getSimUV(e);
        nextColor();
        pointerVelocity.set(0, 0);
      }
    });

    renderer.domElement.addEventListener('pointermove', (e) => {
      if (isPointerDown && e.button === 0) {
        const cur = getSimUV(e);
        if (!cur || !lastPointer) return;

        const dx = cur.x - lastPointer.x;
        const dy = cur.y - lastPointer.y;

        // Velocity splat
        splatMat.uniforms.uTarget.value = velRT[1 - velIdx].texture;
        splatMat.uniforms.uPoint.value.copy(cur);
        splatMat.uniforms.uColor.value.set(dx * 25.0, dy * 25.0, 0);
        splatMat.uniforms.uRadius.value = 0.0004;
        blit(splatMat, velRT[velIdx]);
        velIdx = 1 - velIdx;

        // Dye splat
        splatMat.uniforms.uTarget.value = dyeRT[1 - dyeIdx].texture;
        splatMat.uniforms.uColor.value.copy(pointerColor);
        splatMat.uniforms.uRadius.value = 0.0008;
        blit(splatMat, dyeRT[dyeIdx]);
        dyeIdx = 1 - dyeIdx;

        pointerVelocity.set(dx, dy);
        lastPointer = cur;
      }
    });

    renderer.domElement.addEventListener('pointerup', () => {
      isPointerDown = false;
      lastPointer = null;
    });

    renderer.domElement.addEventListener('pointerleave', () => {
      isPointerDown = false;
      lastPointer = null;
    });

    // ---- Simulation step ----
    function step(dt) {
      const clampedDt = Math.min(dt, 0.025);
      const advectDt = ADVECT_DT;

      // 1. Curl
      curlMat.uniforms.uVelocity.value = velRT[1 - velIdx].texture;
      blit(curlMat, curlRT);

      // 2. Vorticity confinement
      vortMat.uniforms.uVelocity.value = velRT[1 - velIdx].texture;
      vortMat.uniforms.uCurl.value = curlRT.texture;
      vortMat.uniforms.uCurlStrength.value = CURL_STRENGTH;
      vortMat.uniforms.uDt.value = clampedDt;
      blit(vortMat, velRT[velIdx]);
      velIdx = 1 - velIdx;

      // 3. Advect velocity
      advectMat.uniforms.uVelocity.value = velRT[1 - velIdx].texture;
      advectMat.uniforms.uSource.value = velRT[1 - velIdx].texture;
      advectMat.uniforms.uDissipation.value = VEL_DISSIPATION;
      advectMat.uniforms.uDt.value = advectDt;
      blit(advectMat, velRT[velIdx]);
      velIdx = 1 - velIdx;

      // 4. Compute divergence
      divMat.uniforms.uVelocity.value = velRT[1 - velIdx].texture;
      blit(divMat, divRT);

      // 5. Clear pressure
      clearRT(presRT[presIdx]);

      // 6. Jacobi pressure solve
      for (let i = 0; i < JACOBI_ITERS; i++) {
        presMat.uniforms.uPressure.value = presRT[1 - presIdx].texture;
        presMat.uniforms.uDivergence.value = divRT.texture;
        blit(presMat, presRT[presIdx]);
        presIdx = 1 - presIdx;
      }

      // 7. Gradient subtraction
      gradMat.uniforms.uPressure.value = presRT[1 - presIdx].texture;
      gradMat.uniforms.uVelocity.value = velRT[1 - velIdx].texture;
      blit(gradMat, velRT[velIdx]);
      velIdx = 1 - velIdx;

      // 8. Advect dye
      advectMat.uniforms.uVelocity.value = velRT[1 - velIdx].texture;
      advectMat.uniforms.uSource.value = dyeRT[1 - dyeIdx].texture;
      advectMat.uniforms.uDissipation.value = DYE_DISSIPATION;
      advectMat.uniforms.uDt.value = advectDt;
      blit(advectMat, dyeRT[dyeIdx]);
      dyeIdx = 1 - dyeIdx;
    }

    // ---- Auto splats ----
    let autoTime = 0;
    function autoSplats(t) {
      // Add some swirling auto-drips
      const cx = 0.5 + 0.25 * Math.sin(t * 0.3);
      const cy = 0.5 + 0.25 * Math.cos(t * 0.4);

      // Velocity curl
      const ang = t * 0.7;
      const vr = 1.2;
      splatMat.uniforms.uTarget.value = velRT[1 - velIdx].texture;
      splatMat.uniforms.uPoint.value.set(cx, cy);
      splatMat.uniforms.uColor.value.set(
        Math.cos(ang) * vr,
        Math.sin(ang) * vr,
        0
      );
      splatMat.uniforms.uRadius.value = 0.0015;
      blit(splatMat, velRT[velIdx]);
      velIdx = 1 - velIdx;

      // Dye
      const cr = 0.5 + 0.5 * Math.sin(t * 1.1 + 1.0);
      const cg = 0.5 + 0.5 * Math.sin(t * 1.1 + 3.0);
      const cb = 0.5 + 0.5 * Math.sin(t * 1.1 + 5.0);
      const cm = Math.sqrt(cr * cr + cg * cg + cb * cb) + 0.001;
      splatMat.uniforms.uTarget.value = dyeRT[1 - dyeIdx].texture;
      splatMat.uniforms.uPoint.value.set(cx, cy);
      splatMat.uniforms.uColor.value.set(
        cr / cm * 3.0,
        cg / cm * 3.0,
        cb / cm * 3.0
      );
      splatMat.uniforms.uRadius.value = 0.003;
      blit(splatMat, dyeRT[dyeIdx]);
      dyeIdx = 1 - dyeIdx;
    }

    // ---- Resize ----
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // ---- FPS counter ----
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 0;
    const fpsEl = document.getElementById('fps');
    const itersEl = document.getElementById('iters');
    const texSizeEl = document.getElementById('texSize');
    const particlesEl = document.getElementById('particles');

    texSizeEl.textContent = SIM_RES + 'x' + SIM_RES;
    particlesEl.textContent = (SIM_RES * SIM_RES).toLocaleString();

    // ---- Animation loop ----
    function animate() {
      requestAnimationFrame(animate);

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      frameCount++;
      if (frameCount % 30 === 0) {
        fps = Math.round(1 / dt);
        fpsEl.textContent = fps;
        itersEl.textContent = JACOBI_ITERS;
      }

      autoTime += dt;
      autoSplats(autoTime);

      step(dt);

      controls.update();

      // Render display
      displayMat.uniforms.uDensity.value = dyeRT[1 - dyeIdx].texture;
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(scene, camera);
    }

    animate();

    // ---- Expose to window ----
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;