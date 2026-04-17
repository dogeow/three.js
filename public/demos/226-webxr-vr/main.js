import * as THREE from 'three';
    import { VRButton } from 'three/addons/webxr/VRButton.js';
    import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
    import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

    // ─── Globals ───────────────────────────────────────────────────────────
    let camera, scene, renderer, controls;
    let controller1, controller2, controllerGrip1, controllerGrip2;
    const controllerModelFactory = new XRControllerModelFactory();
    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();
    const clock = new THREE.Clock();

    // Grab state
    const grabbed = new Map();   // mesh uuid → { offsetMatrix, angularVel }
    let activeGrabController = null;
    let hoveredMesh = null;
    const grabDistance = 0.3;

    // Scene objects
    let floor, roomEnv;
    const floatingObjects = [];
    const baseVelocity = new THREE.Vector3();

    // lil-gui params
    const params = {
      objectCount: 18,
      spawnRadius: 4,
      throwSpeed: 5,
      vibration: true,
      vibrationIntensity: 0.8,
      vibrationDuration: 0.15,
      objectColor: '#7c3aed',
      resetScene: () => rebuildScene(),
    };

    // ─── Init ───────────────────────────────────────────────────────────────
    function init() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a1a);

      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
      camera.position.set(0, 1.6, 3);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      document.body.appendChild(renderer.domElement);

      // VR Button
      const vrButton = VRButton.createButton(renderer);
      vrButton.style.cssText += `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        z-index: 200; font-family: monospace;
      `;
      document.body.appendChild(vrButton);

      // XR error handling
      renderer.xr.addEventListener('session start', onSessionStarted);
      renderer.xr.addEventListener('session end', onSessionEnded);
      if (!navigator.xr) {
        showError('WebXR is not available. Please use a WebXR-compatible browser on a VR-capable device (Quest Browser, Chrome with WebXR emulator extension, etc.).');
      }

      // Non-VR controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1.4, 0);
      controls.update();
      controls.minDistance = 0.5;
      controls.maxDistance = 10;

      // Environment (RoomEnvironment for desktop fallback)
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      roomEnv = new RoomEnvironment();
      scene.environment = pmremGenerator.fromScene(roomEnv).texture;
      scene.fog = new THREE.FogExp2(0x0a0a1a, 0.06);

      // Lighting
      setupLighting();

      // Floor
      createFloor();

      // Scene objects
      rebuildScene();

      // Controllers (VR)
      setupVRControllers();

      // GUI
      setupGUI();

      // Events
      window.addEventListener('resize', onWindowResize);
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      renderer.domElement.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
      renderer.domElement.addEventListener('touchend', onTouchEnd);

      renderer.setAnimationLoop(animate);
    }

    function setupLighting() {
      const ambient = new THREE.AmbientLight(0x4040ff, 0.4);
      scene.add(ambient);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(5, 8, 5);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const hemi = new THREE.HemisphereLight(0x606080, 0x303050, 0.5);
      scene.add(hemi);

      // Point lights for atmosphere
      const pl1 = new THREE.PointLight(0x7c3aed, 2, 12);
      pl1.position.set(-3, 3, -3);
      scene.add(pl1);
      const pl2 = new THREE.PointLight(0x06b6d4, 2, 12);
      pl2.position.set(3, 3, 3);
      scene.add(pl2);
    }

    function createFloor() {
      if (floor) scene.remove(floor);
      const geo = new THREE.PlaneGeometry(30, 30);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x111122,
        roughness: 0.8,
        metalness: 0.2,
      });
      floor = new THREE.Mesh(geo, mat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // Grid helper
      const grid = new THREE.GridHelper(30, 30, 0x222244, 0x111133);
      grid.position.y = 0.002;
      scene.add(grid);
    }

    function buildGeometry(type) {
      switch (type) {
        case 0: return new THREE.BoxGeometry(0.25, 0.25, 0.25);
        case 1: return new THREE.SphereGeometry(0.14, 20, 16);
        case 2: return new THREE.ConeGeometry(0.15, 0.3, 6);
        case 3: return new THREE.TorusGeometry(0.12, 0.05, 12, 24);
        case 4: return new THREE.DodecahedronGeometry(0.15);
        case 5: return new THREE.OctahedronGeometry(0.16);
        case 6: return new THREE.TetrahedronGeometry(0.18);
        default: return new THREE.BoxGeometry(0.25, 0.25, 0.25);
      }
    }

    function rebuildScene() {
      // Remove old objects
      floatingObjects.forEach(o => scene.remove(o.mesh));
      floatingObjects.length = 0;
      grabbed.clear();

      const color = new THREE.Color(params.objectColor);

      for (let i = 0; i < params.objectCount; i++) {
        const type = Math.floor(Math.random() * 7);
        const geo = buildGeometry(type);
        const hue = (i / params.objectCount);
        const mat = new THREE.MeshStandardMaterial({
          color: color.clone().offsetHSL(hue * 0.3 - 0.15, 0.3, 0.2),
          roughness: 0.4,
          metalness: 0.6,
          emissive: color.clone().multiplyScalar(0.15),
        });
        const mesh = new THREE.Mesh(geo, mat);

        const angle = Math.random() * Math.PI * 2;
        const r = 0.8 + Math.random() * params.spawnRadius;
        mesh.position.set(
          Math.cos(angle) * r,
          0.5 + Math.random() * 3.5,
          Math.sin(angle) * r
        );
        mesh.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Per-object velocity & spin
        mesh.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        mesh.userData.angularVelocity = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );
        mesh.userData.baseColor = mat.color.clone();

        scene.add(mesh);
        floatingObjects.push(mesh);
      }
    }

    // ─── VR Controllers ─────────────────────────────────────────────────────
    function setupVRControllers() {
      controller1 = renderer.xr.getController(0);
      controller1.name = 'controller1';
      controller1.addEventListener('selectstart', onSelectStart);
      controller1.addEventListener('selectend', onSelectEnd);
      controller1.addEventListener('squeezestart', onSqueezeStart);
      controller1.addEventListener('squeezeend', onSqueezeEnd);
      controller1.addEventListener('connected', onControllerConnected);
      controller1.addEventListener('disconnected', onControllerDisconnected);
      scene.add(controller1);

      controller2 = renderer.xr.getController(1);
      controller2.name = 'controller2';
      controller2.addEventListener('selectstart', onSelectStart);
      controller2.addEventListener('selectend', onSelectEnd);
      controller2.addEventListener('squeezestart', onSqueezeStart);
      controller2.addEventListener('squeezeend', onSqueezeEnd);
      controller2.addEventListener('connected', onControllerConnected);
      controller2.addEventListener('disconnected', onControllerDisconnected);
      scene.add(controller2);

      // Controller models (visual)
      controllerGrip1 = renderer.xr.getControllerGrip(0);
      controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
      scene.add(controllerGrip1);

      controllerGrip2 = renderer.xr.getControllerGrip(1);
      controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
      scene.add(controllerGrip2);

      // Ray visual (line)
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -2),
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x7c3aed,
        transparent: true,
        opacity: 0.7,
      });
      controller1.add(new THREE.Line(lineGeo.clone(), lineMat.clone()));
      controller2.add(new THREE.Line(lineGeo.clone(), lineMat.clone()));
    }

    function onControllerConnected(event) {
      const ctrl = event.target;
      const src = event.data;
      ctrl.children.forEach(child => {
        if (child.isLine) child.material.color.setHex(src.handedness === 'right' ? 0x7c3aed : 0x06b6d4);
      });
      triggerVibration(ctrl, 0.3, 80);
    }

    function onControllerDisconnected(event) {
      scene.remove(event.target);
    }

    function onSelectStart(event) {
      tryGrab(event.target);
    }

    function onSelectEnd(event) {
      releaseGrab(event.target);
    }

    function onSqueezeStart(event) {
      tryGrab(event.target);
    }

    function onSqueezeEnd(event) {
      releaseGrab(event.target);
    }

    // ─── Grab Logic ─────────────────────────────────────────────────────────
    function tryGrab(controller) {
      if (activeGrabController) return;

      const tempVec = new THREE.Vector3();
      const controllerPos = new THREE.Vector3();
      controller.getWorldPosition(controllerPos);

      let closest = null;
      let closestDist = Infinity;

      floatingObjects.forEach(mesh => {
        const dist = controllerPos.distanceTo(mesh.position);
        if (dist < grabDistance && dist < closestDist) {
          closestDist = dist;
          closest = mesh;
        }
      });

      if (closest) {
        activeGrabController = controller;

        // Compute offset from controller to object
        const offsetMatrix = new THREE.Matrix4();
        const inverseControllerMatrix = new THREE.Matrix4().copy(controller.matrixWorld).invert();
        offsetMatrix.multiplyMatrices(inverseControllerMatrix, closest.matrixWorld);

        grabbed.set(closest.uuid, {
          mesh: closest,
          offsetMatrix,
          angularVel: closest.userData.angularVelocity.clone(),
        });

        // Detach from world physics
        closest.userData.velocity.set(0, 0, 0);
        closest.userData.angularVelocity.set(0, 0, 0);

        // Attach to controller
        controller.add(closest);
        closest.position.setFromMatrixPosition(offsetMatrix);
        closest.rotation.setFromRotationMatrix(offsetMatrix);

        triggerVibration(controller, params.vibrationIntensity, params.vibrationDuration * 500);
      }
    }

    function releaseGrab(controller) {
      if (!activeGrabController || activeGrabController !== controller) return;

      const entry = Array.from(grabbed.values()).find(e => e.mesh.parent === controller);
      if (!entry) return;

      const { mesh } = entry;
      grabbed.delete(mesh.uuid);

      // Compute throw velocity from controller motion
      const controllerVel = new THREE.Vector3();
      controller.getWorldPosition(controllerVel);
      const dir = controllerVel.sub(mesh.position).normalize();
      mesh.userData.velocity.copy(dir).multiplyScalar(params.throwSpeed);
      mesh.userData.angularVelocity.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      );

      // Detach from controller, re-attach to scene
      controller.remove(mesh);
      scene.add(mesh);
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      mesh.getWorldPosition(worldPos);
      mesh.getWorldQuaternion(worldQuat);
      mesh.position.copy(worldPos);
      mesh.quaternion.copy(worldQuat);

      activeGrabController = null;
      triggerVibration(controller, params.vibrationIntensity * 0.6, params.vibrationDuration * 300);
    }

    function tryGrabMouse(clientX, clientY) {
      if (activeGrabController) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(floatingObjects);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        activeGrabController = { isMouse: true };
        grabbed.set(mesh.uuid, {
          mesh,
          offsetMatrix: intersects[0].face.normal.clone(),
          angularVel: mesh.userData.angularVelocity.clone(),
        });
        mesh.userData.velocity.set(0, 0, 0);
        mesh.userData.angularVelocity.set(0, 0, 0);
      }
    }

    function releaseGrabMouse() {
      if (!activeGrabController || !activeGrabController.isMouse) return;
      const entry = Array.from(grabbed.values())[0];
      if (entry) {
        const { mesh } = entry;
        grabbed.delete(mesh.uuid);
        const dir = new THREE.Vector3(
          (Math.random() - 0.5),
          0.5,
          (Math.random() - 0.5)
        ).normalize().multiplyScalar(params.throwSpeed);
        mesh.userData.velocity.copy(dir);
        mesh.userData.angularVelocity.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        );
      }
      activeGrabController = null;
    }

    // ─── Desktop Mouse / Touch ───────────────────────────────────────────────
    let mouseDown = false;
    let mouseDownPos = new THREE.Vector2();

    function onMouseDown(e) {
      if (e.button !== 0) return;
      mouseDown = true;
      mouseDownPos.set(e.clientX, e.clientY);
      tryGrabMouse(e.clientX, e.clientY);
    }

    function onMouseUp(e) {
      mouseDown = false;
      releaseGrabMouse();
    }

    function onMouseMove(e) {
      if (activeGrabController && activeGrabController.isMouse) {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);
        const entry = Array.from(grabbed.values())[0];
        if (entry) {
          const { mesh, offsetMatrix } = entry;
          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion), 0);
          plane.constant = -camera.position.z;
          const target = new THREE.Vector3();
          raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion), -camera.position.z), target);
          mesh.position.lerp(target, 0.3);
        }
      }
    }

    function onTouchStart(e) {
      if (e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        tryGrabMouse(t.clientX, t.clientY);
      }
    }

    function onTouchEnd(e) {
      releaseGrabMouse();
    }

    // ─── Haptic Feedback ────────────────────────────────────────────────────
    function triggerVibration(controller, intensity, durationMs) {
      if (!params.vibration) return;
      const session = renderer.xr.getSession();
      if (!session) return;
      try {
        const inputSource = getInputSourceForController(controller);
        if (inputSource && inputSource.gamepad && inputSource.gamepad.hapticActuators) {
          const haptic = inputSource.gamepad.hapticActuators[0];
          if (haptic && typeof haptic.pulse === 'function') {
            haptic.pulse(intensity, durationMs);
          }
        }
      } catch (err) {
        // Silently ignore haptic errors
      }
    }

    function getInputSourceForController(controller) {
      const session = renderer.xr.getSession();
      if (!session) return null;
      for (const source of session.inputSources) {
        if (source.gamepad) {
          const idx = controller.name === 'controller1' ? 0 : 1;
          const ctrl = renderer.xr.getController(idx);
          if (ctrl === controller) return source;
        }
      }
      return null;
    }

    // ─── GUI ────────────────────────────────────────────────────────────────
    function setupGUI() {
      const gui = new GUI({ title: '🎮 VR Grab Controls' });
      gui.domElement.style.position = 'fixed';
      gui.domElement.style.top = '0px';
      gui.domElement.style.right = '0px';

      gui.add(params, 'objectCount', 5, 40, 1).name('Object Count').onFinishChange(rebuildScene);
      gui.add(params, 'spawnRadius', 1, 8, 0.5).name('Spawn Radius').onFinishChange(rebuildScene);
      gui.add(params, 'throwSpeed', 1, 15, 0.5).name('Throw Speed');
      gui.addColor(params, 'objectColor').name('Object Color').onChange(v => {
        floatingObjects.forEach((mesh, i) => {
          const hue = (i / floatingObjects.length);
          mesh.material.color.set(new THREE.Color(v).offsetHSL(hue * 0.3 - 0.15, 0.3, 0.2));
          mesh.material.emissive.set(new THREE.Color(v).multiplyScalar(0.15));
        });
      });
      gui.add(params, 'vibration').name('Haptic Vibration');
      gui.add(params, 'vibrationIntensity', 0.1, 1, 0.05).name('Vibration Power');
      gui.add(params, 'vibrationDuration', 0.05, 0.5, 0.01).name('Vibration Duration (s)');
      gui.add(params, 'resetScene').name('🔄 Reset Scene');
    }

    // ─── Session callbacks ───────────────────────────────────────────────────
    function onSessionStarted() {
      // Entered VR
      scene.background = null;
      scene.fog = null;
    }

    function onSessionEnded() {
      scene.background = new THREE.Color(0x0a0a1a);
      scene.fog = new THREE.FogExp2(0x0a0a1a, 0.06);
    }

    // ─── Error overlay ───────────────────────────────────────────────────────
    function showError(msg) {
      const overlay = document.getElementById('error-overlay');
      document.getElementById('error-msg').textContent = msg;
      overlay.style.display = 'flex';
    }

    // ─── Window resize ───────────────────────────────────────────────────────
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ─── Animate ─────────────────────────────────────────────────────────────
    function animate() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Update physics for all floating objects (only un-grabbed)
      floatingObjects.forEach(mesh => {
        if (grabbed.has(mesh.uuid)) return;

        const vel = mesh.userData.velocity;
        const angVel = mesh.userData.angularVelocity;

        // Gravity & bounce
        vel.y -= 4.0 * delta;
        mesh.position.addScaledVector(vel, delta);

        // Floor bounce
        if (mesh.position.y < 0.12) {
          mesh.position.y = 0.12;
          vel.y = Math.abs(vel.y) * 0.55;
          vel.x *= 0.85;
          vel.z *= 0.85;
        }

        // Boundary bounce
        const bound = 8;
        ['x', 'z'].forEach(ax => {
          if (Math.abs(mesh.position[ax]) > bound) {
            vel[ax] *= -0.8;
            mesh.position[ax] = Math.sign(mesh.position[ax]) * bound;
          }
        });

        // Angular spin (decay)
        angVel.multiplyScalar(0.995);
        mesh.rotation.x += angVel.x * delta;
        mesh.rotation.y += angVel.y * delta;
        mesh.rotation.z += angVel.z * delta;

        // Idle bob
        if (vel.length() < 0.1) {
          mesh.position.y += Math.sin(elapsed * 1.2 + mesh.id * 0.7) * 0.0015;
        }
      });

      // Update hovered state (VR)
      if (renderer.xr.isPresenting) {
        const controller = controller1; // approximate
        const controllerPos = new THREE.Vector3();
        controller1.getWorldPosition(controllerPos);

        hoveredMesh = null;
        let minDist = Infinity;
        floatingObjects.forEach(mesh => {
          if (grabbed.has(mesh.uuid)) return;
          const dist = controllerPos.distanceTo(mesh.position);
          if (dist < grabDistance && dist < minDist) {
            minDist = dist;
            hoveredMesh = mesh;
          }
        });

        floatingObjects.forEach(mesh => {
          if (mesh === hoveredMesh) {
            mesh.material.emissiveIntensity = 0.6;
          } else {
            mesh.material.emissiveIntensity = 0.15;
          }
        });
      }

      renderer.render(scene, camera);
    }

    init();