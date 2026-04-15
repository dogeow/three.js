import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { VRButton } from 'three/addons/webxr/VRButton.js';
    import { XRHandSpaceMode, XRHandMeshModel } from 'three/addons/webxr/XRHandMeshModel.js';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Scene Setup ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 1.6, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    // ─── Lights ───────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x404060, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x4fc3f7, 1.5, 10);
    pointLight.position.set(-2, 3, -1);
    scene.add(pointLight);

    // ─── Stars ────────────────────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 80;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));

    // ─── Grab Objects ─────────────────────────────────────────────────────────
    const grabObjects = [];
    const objectColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xc3a6ff, 0x74b9ff, 0xa8e6cf];

    function createObject(geometry, color, position) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.15,
        metalness: 0.3,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.copy(position);
      mesh.userData.baseColor = color;
      mesh.userData.grabbed = false;
      mesh.userData.grabOffset = new THREE.Vector3();
      scene.add(mesh);
      grabObjects.push(mesh);
      return mesh;
    }

    const geometries = [
      new THREE.BoxGeometry(0.14, 0.14, 0.14),
      new THREE.SphereGeometry(0.09, 20, 20),
      new THREE.ConeGeometry(0.08, 0.16, 16),
      new THREE.OctahedronGeometry(0.09),
      new THREE.TetrahedronGeometry(0.10),
      new THREE.TorusKnotGeometry(0.06, 0.02, 64, 8),
    ];

    const positions = [
      new THREE.Vector3(-0.5, 1.2, -1.2),
      new THREE.Vector3(0.5, 1.4, -1.0),
      new THREE.Vector3(-0.3, 1.6, -1.5),
      new THREE.Vector3(0.6, 1.0, -1.3),
      new THREE.Vector3(0.0, 1.8, -1.6),
      new THREE.Vector3(-0.7, 1.3, -0.8),
    ];

    positions.forEach((pos, i) => {
      createObject(geometries[i], objectColors[i], pos);
    });

    // Floating animation state
    const floatPhases = positions.map(() => Math.random() * Math.PI * 2);
    const floatSpeeds = positions.map(() => 0.5 + Math.random() * 0.5);

    // ─── Glow Pulse Helper ────────────────────────────────────────────────────
    function pulseGlow(mesh, active) {
      const target = active ? 0.8 : 0.15;
      mesh.material.emissiveIntensity += (target - mesh.material.emissiveIntensity) * 0.1;
    }

    // ─── OrbitControls (fallback) ──────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.4, -1.2);
    controls.update();
    controls.minDistance = 0.5;
    controls.maxDistance = 8;

    // ─── WebXR Setup ───────────────────────────────────────────────────────────
    let hand0 = null;
    let hand1 = null;
    let controller0 = null;
    let controller1 = null;

    const isXRSupported = navigator.xr !== undefined;

    async function checkXRSupport() {
      const status = document.getElementById('status');
      if (!isXRSupported) {
        status.textContent = 'WebXR not supported in this browser';
        return;
      }
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (supported) {
        document.getElementById('vrButton').style.display = 'block';
        status.textContent = 'WebXR VR detected — button enabled';
        setupXR();
      } else {
        status.textContent = 'WebXR immersive-vr not supported';
      }
    }

    function setupXR() {
      const btn = document.getElementById('vrButton');
      btn.style.display = 'block';
      btn.addEventListener('click', () => {
        navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['hand-tracking', 'hit-test', 'local-floor'],
        }).then(onSessionStarted);
      });

      renderer.xr.addEventListener('sessionstart', () => {
        document.getElementById('status').textContent = 'VR session started — use hands to grab!';
        controls.enabled = false;
      });

      renderer.xr.addEventListener('sessionend', () => {
        document.getElementById('status').textContent = 'VR session ended';
        controls.enabled = true;
        resetObjects();
      });

      // Controllers for raycasting fallback
      controller0 = renderer.xr.getController(0);
      controller1 = renderer.xr.getController(1);
      scene.add(controller0);
      scene.add(controller1);

      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -2),
      ]);
      const rayMat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, linewidth: 2 });
      controller0.add(new THREE.Line(rayGeo, rayMat.clone()));
      controller1.add(new THREE.Line(rayGeo.clone(), rayMat.clone()));
    }

    let xrSession = null;

    async function onSessionStarted(session) {
      xrSession = session;
      await renderer.xr.setSession(session);
      setupHandTracking(session);
    }

    function setupHandTracking(session) {
      // Use XRHandMeshModel via WebXR hand tracking
      session.addEventListener('inputsourceschange', (e) => {
        for (const src of e.added) {
          if (src.hand) {
            if (!hand0 && src.handedness === 'right') {
              hand0 = src.hand;
              hand0.userData.index = 0;
            } else if (!hand1 && src.handedness === 'left') {
              hand1 = src.hand;
              hand1.userData.index = 1;
            }
          }
          if (src.session) {
            src.addEventListener('selectstart', onSelectStart);
            src.addEventListener('selectend', onSelectEnd);
          }
        }
        for (const src of e.removed) {
          if (src.hand) {
            if (hand0 && src.handedness === 'right') hand0 = null;
            if (hand1 && src.handedness === 'left') hand1 = null;
          }
        }
      });
    }

    // Simple hand joint positions for grab detection
    const THUMB_TIP = 17;  // thumb tip joint index
    const INDEX_TIP = 21;  // index finger tip joint index
    const MIDDLE_TIP = 25; // middle finger tip joint index

    let grabbedObject = null;
    let grabHandIndex = -1;

    function checkGrab(jointPositions) {
      // Simple proximity grab: check if index+thumb tips are close together
      if (jointPositions.length > THUMB_TIP && jointPositions.length > INDEX_TIP) {
        const thumb = new THREE.Vector3().fromArray(jointPositions[THUMB_TIP], 0);
        const index = new THREE.Vector3().fromArray(jointPositions[INDEX_TIP], 0);
        const dist = thumb.distanceTo(index);
        return dist < 0.06; // grab threshold
      }
      return false;
    }

    function onSelectStart(event) {}

    function onSelectEnd(event) {
      if (grabbedObject) {
        grabbedObject.userData.grabbed = false;
        grabbedObject = null;
        grabHandIndex = -1;
      }
    }

    // ─── GUI ──────────────────────────────────────────────────────────────────
    const params = {
      showHandMesh: true,
      handSize: 1.0,
      grabThreshold: 0.06,
      glowIntensity: 0.8,
      objectScale: 1.0,
    };

    const gui = new GUI();
    gui.add(params, 'showHandMesh').name('Show Hand Mesh').onChange((v) => {
      if (handMeshes) {
        handMeshes.visible = v;
      }
    });
    gui.add(params, 'handSize', 0.5, 2.0).name('Hand Size').onChange((v) => {
      if (handMeshes) {
        handMeshes.scale.setScalar(v);
      }
    });
    gui.add(params, 'glowIntensity', 0.0, 1.5).name('Glow Intensity');
    gui.add(params, 'objectScale', 0.5, 2.0).name('Object Scale').onChange((v) => {
      grabObjects.forEach(obj => obj.scale.setScalar(v));
    });

    // ─── Hand Mesh Visualization ─────────────────────────────────────────────
    let handMeshes = null;

    function createHandVisual(hand) {
      // Build a simple hand skeleton mesh for visualization
      const group = new THREE.Group();
      const jointGeo = new THREE.SphereGeometry(0.015, 8, 8);
      const jointMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.8 });
      const boneMat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.5 });

      // Create joint spheres for all 26 joints
      for (let i = 0; i < 26; i++) {
        const sphere = new THREE.Mesh(jointGeo, jointMat.clone());
        sphere.userData.jointIndex = i;
        group.add(sphere);
      }

      // Bone lines connecting joints
      const bones = [
        [0,1],[1,2],[2,3],[3,4],          // thumb
        [0,5],[5,6],[6,7],[7,8],          // index
        [0,9],[9,10],[10,11],[11,12],     // middle
        [0,13],[13,14],[14,15],[15,16],   // ring
        [0,17],[17,18],[18,19],[19,20],   // pinky
        [5,9],[9,13],[13,17],             // palm
      ];

      bones.forEach(([a, b]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(), new THREE.Vector3()
        ]);
        const line = new THREE.Line(geo, boneMat.clone());
        line.userData.bone = [a, b];
        group.add(line);
      });

      group.visible = params.showHandMesh;
      return group;
    }

    // Unified hand meshes group
    handMeshes = new THREE.Group();
    scene.add(handMeshes);
    const handVisuals = [null, null];

    function updateHandVisual(handVisual, jointData, scale) {
      if (!handVisual || !jointData) return;
      const joints = handVisual.children;

      jointData.forEach((pos, i) => {
        if (joints[i] && pos) {
          joints[i].position.set(pos.x * scale, pos.y * scale, pos.z * scale);
        }
      });

      // Update bone lines
      const bones = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [5,9],[9,13],[13,17],
      ];

      bones.forEach(([a, b]) => {
        const line = joints.find(c => c.userData.bone && c.userData.bone[0] === a && c.userData.bone[1] === b);
        if (line && jointData[a] && jointData[b]) {
          const pos = line.geometry.attributes.position;
          pos.setXYZ(0, jointData[a].x * scale, jointData[a].y * scale, jointData[a].z * scale);
          pos.setXYZ(1, jointData[b].x * scale, jointData[b].y * scale, jointData[b].z * scale);
          pos.needsUpdate = true;
        }
      });
    }

    // ─── XR Hit Test + Grab ───────────────────────────────────────────────────
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    function resetObjects() {
      grabObjects.forEach(obj => {
        const orig = positions[grabObjects.indexOf(obj)];
        if (orig) obj.position.copy(orig);
        obj.userData.grabbed = false;
        obj.scale.setScalar(params.objectScale);
      });
      grabbedObject = null;
    }

    // ─── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── Animation Loop ────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Floating animation for objects
      positions.forEach((basePos, i) => {
        const obj = grabObjects[i];
        if (!obj.userData.grabbed) {
          obj.position.y = basePos.y + Math.sin(elapsed * floatSpeeds[i] + floatPhases[i]) * 0.05;
          obj.rotation.x += delta * 0.3;
          obj.rotation.y += delta * 0.5;
        }
      });

      // Glow pulse for all objects
      grabObjects.forEach(obj => {
        const isNear = obj.userData.grabbed;
        pulseGlow(obj, isNear);
      });

      // Update hand visuals if in VR
      const session = renderer.xr.getSession();
      if (session) {
        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then((refSpace) => {
            session.requestHitTestSource?.({ space: refSpace }).then((source) => {
              hitTestSource = source;
            }).catch(() => {});
          });
          hitTestSourceRequested = true;
        }

        // Update hand visuals
        [hand0, hand1].forEach((hand, idx) => {
          if (hand && !handVisuals[idx]) {
            const visual = createHandVisual(hand);
            handVisuals[idx] = visual;
            handMeshes.add(visual);
          }

          if (hand && handVisuals[idx]) {
            const jointPositions = [];
            for (let i = 0; i < 26; i++) {
              const joint = hand.get(i);
              if (joint) {
                joint.getPosition(new THREE.Vector3());
                jointPositions.push({ x: joint.x || 0, y: joint.y || 0, z: joint.z || 0 });
              } else {
                jointPositions.push(null);
              }
            }
            updateHandVisual(handVisuals[idx], jointPositions, params.handSize);

            // Check for grab gesture
            if (jointPositions[THUMB_TIP] && jointPositions[INDEX_TIP]) {
              const thumbTip = jointPositions[THUMB_TIP];
              const indexTip = jointPositions[INDEX_TIP];
              const dist = Math.sqrt(
                (thumbTip.x - indexTip.x) ** 2 +
                (thumbTip.y - indexTip.y) ** 2 +
                (thumbTip.z - indexTip.z) ** 2
              );

              const worldThumb = new THREE.Vector3(thumbTip.x, thumbTip.y, thumbTip.z);
              const worldIndex = new THREE.Vector3(indexTip.x, indexTip.y, indexTip.z);

              // Check proximity to objects
              if (!grabbedObject) {
                grabObjects.forEach(obj => {
                  const mid = new THREE.Vector3(
                    (worldThumb.x + worldIndex.x) / 2,
                    (worldThumb.y + worldIndex.y) / 2,
                    (worldThumb.z + worldIndex.z) / 2
                  );
                  const d = mid.distanceTo(obj.position);
                  if (d < 0.15 && dist < params.grabThreshold) {
                    grabbedObject = obj;
                    grabHandIndex = idx;
                    obj.userData.grabbed = true;
                  }
                });
              }
            }
          }
        });

        // Move grabbed object to hand position
        if (grabbedObject && grabHandIndex >= 0 && handVisuals[grabHandIndex]) {
          const visual = handVisuals[grabHandIndex];
          const indexMesh = visual.children[INDEX_TIP];
          if (indexMesh) {
            const worldPos = new THREE.Vector3();
            indexMesh.getWorldPosition(worldPos);
            grabbedObject.position.copy(worldPos);
          }
        }

        // Release on session end handled above
      }

      if (!renderer.xr.isPresenting) {
        controls.update();
      }

      renderer.render(scene, camera);
    });

    // ─── Init ──────────────────────────────────────────────────────────────────
    checkXRSupport();

    // Desktop info
    if (!isXRSupported || !navigator.xr) {
      document.getElementById('status').textContent = 'WebXR not available — desktop mode, orbit with mouse';
    }