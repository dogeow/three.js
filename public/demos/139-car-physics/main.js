import * as THREE from 'three';

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 80, 300);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    dirLight.shadow.camera.top = 120;
    dirLight.shadow.camera.bottom = -120;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x606080, 0x404040, 0.5);
    scene.add(hemiLight);

    // --- Ground ---
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x1e2a1e });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- Road ---
    const roadW = 20;
    const roadL = 400;
    const roadGeo = new THREE.PlaneGeometry(roadW, roadL);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    road.receiveShadow = true;
    scene.add(road);

    // Road markings - dashed center line
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xeeee44 });
    for (let i = -190; i < 190; i += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 6), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, i);
      scene.add(dash);
    }

    // Side lines
    [-roadW / 2 + 0.5, roadW / 2 - 0.5].forEach(x => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, roadL), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.02, 0);
      scene.add(line);
    });

    // --- Car Mesh ---
    const carGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(2.4, 0.7, 4.2);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe53935 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.55;
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(2.0, 0.6, 2.0);
    const cabinMat = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.1, -0.3);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Windshield trim
    const trimGeo = new THREE.BoxGeometry(2.02, 0.05, 2.02);
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x0d47a1 });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, 0.8, -0.3);
    carGroup.add(trim);

    // Headlights
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    [-0.8, 0.8].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), headlightMat);
      hl.position.set(x, 0.55, -2.12);
      carGroup.add(hl);
    });

    // Taillights
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    [-0.9, 0.9].forEach(x => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.06), taillightMat);
      tl.position.set(x, 0.55, 2.12);
      carGroup.add(tl);
    });

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 20);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const hubMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });

    const wheelPositions = [
      { x: -1.2, z: -1.4 },
      { x: 1.2, z: -1.4 },
      { x: -1.2, z: 1.4 },
      { x: 1.2, z: 1.4 },
    ];

    const wheels = [];
    const frontWheels = [];

    wheelPositions.forEach((pos, i) => {
      const wheelGroup = new THREE.Group();

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Hub cap
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.36, 8), hubMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      wheelGroup.position.set(pos.x, 0.42, pos.z);
      carGroup.add(wheelGroup);
      wheels.push(wheelGroup);

      if (i < 2) frontWheels.push(wheelGroup);
    });

    carGroup.position.set(0, 0, 0);
    scene.add(carGroup);

    // --- Obstacles ---
    const obstacles = [];

    function createObstacle(x, z, w, h, d, color) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Add thin edge lines for visibility
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
      );
      mesh.add(edges);

      obstacles.push({
        mesh,
        min: new THREE.Vector3(x - w / 2, 0, z - d / 2),
        max: new THREE.Vector3(x + w / 2, h, z + d / 2),
        radius: Math.max(w, d) / 2,
      });
    }

    // Traffic cones
    function createCone(x, z) {
      const coneGeo = new THREE.ConeGeometry(0.3, 0.9, 8);
      const coneMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(x, 0.45, z);
      cone.castShadow = true;
      scene.add(cone);

      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.22, 0.15, 8),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      stripe.position.y = 0.1;
      cone.add(stripe);

      obstacles.push({
        mesh: cone,
        min: new THREE.Vector3(x - 0.3, 0, z - 0.3),
        max: new THREE.Vector3(x + 0.3, 0.9, z + 0.3),
        radius: 0.35,
      });
    }

    // Concrete barriers
    [[-14, -20, 3, 1.5, 10], [14, 30, 3, 1.5, 8], [-13, 60, 3, 1.5, 12], [14, -50, 3, 1.5, 6]].forEach(([x, z, w, h, d]) => {
      createObstacle(x, z, w, h, d, 0x666666);
    });

    // Colored blocks
    createObstacle(-10, 10, 2, 2, 2, 0x43a047);
    createObstacle(9, -15, 3, 3, 3, 0x8e24aa);
    createObstacle(-8, -35, 2.5, 2.5, 2.5, 0xf4511e);
    createObstacle(11, 50, 2, 4, 2, 0x039be5);
    createObstacle(-9, 80, 3, 2, 3, 0xfdd835);

    // Cones scattered around
    [[-5, -5], [6, 5], [-7, 20], [5, -25], [-4, 40], [7, 70]].forEach(([x, z]) => createCone(x, z));

    // Barrier walls on sides
    [-roadW / 2 - 1, roadW / 2 + 1].forEach(x => {
      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.8, roadL),
        new THREE.MeshLambertMaterial({ color: 0xeeeeee })
      );
      barrier.position.set(x, 0.4, 0);
      barrier.castShadow = true;
      scene.add(barrier);

      obstacles.push({
        mesh: barrier,
        min: new THREE.Vector3(x - 0.25, 0, -roadL / 2),
        max: new THREE.Vector3(x + 0.25, 0.8, roadL / 2),
        radius: 0.5,
        isBarrier: true,
      });
    });

    // --- Physics State ---
    let velocity = 0;          // forward velocity (m/s)
    let heading = 0;           // car facing angle (radians)
    let steerAngle = 0;        // current wheel steer angle
    const maxSpeed = 35;       // m/s ~ 126 km/h
    const maxReverseSpeed = 10;
    const acceleration = 18;   // m/s^2
    const brakeForce = 28;
    const friction = 0.97;    // velocity multiplier per second approximation (using dt)
    const rollingFriction = 0.995;
    const maxSteerAngle = Math.PI / 5;  // ~36 degrees
    const steerSpeed = 3.0;
    const wheelBase = 2.8;

    // --- Input ---
    const keys = { w: false, s: false, a: false, d: false };
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k in keys) keys[k] = true;
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k in keys) keys[k] = false;
    });

    // --- AABB Collision ---
    function getCarAABB() {
      const cos = Math.cos(heading);
      const sin = Math.sin(heading);
      const hw = 1.3, hd = 2.3;
      const corners = [
        { x: -hw, z: -hd }, { x: hw, z: -hd },
        { x: hw, z: hd }, { x: -hw, z: hd },
      ].map(c => ({
        x: carGroup.position.x + c.x * cos - c.z * sin,
        z: carGroup.position.z + c.x * sin + c.z * cos,
      }));

      return {
        minX: Math.min(...corners.map(c => c.x)),
        maxX: Math.max(...corners.map(c => c.x)),
        minZ: Math.min(...corners.map(c => c.z)),
        maxZ: Math.max(...corners.map(c => c.z)),
      };
    }

    function aabbOverlap(carBox, obs) {
      return !(carBox.maxX < obs.min.x || carBox.minX > obs.max.x ||
               carBox.maxZ < obs.min.z || carBox.minZ > obs.max.z);
    }

    // --- UI Elements ---
    const speedEl = document.getElementById('speed-value');
    const speedUnitEl = document.getElementById('speed-unit');
    const throttleFillEl = document.getElementById('throttle-fill');
    const brakeFillEl = document.getElementById('brake-fill');
    const throttleLabelEl = document.getElementById('throttle-label');
    const brakeLabelEl = document.getElementById('brake-label');

    function updateUI(throttle, brake, speedKmh) {
      speedEl.childNodes[0].textContent = Math.round(speedKmh);
      throttleFillEl.style.width = (throttle * 100) + '%';
      brakeFillEl.style.width = (brake * 100) + '%';
      throttleLabelEl.textContent = 'THROTTLE ' + Math.round(throttle * 100) + '%';
      brakeLabelEl.textContent = 'BRAKE ' + Math.round(brake * 100) + '%';
    }

    // --- Camera State ---
    const cameraOffset = new THREE.Vector3(0, 5.5, 11);
    const cameraLookOffset = new THREE.Vector3(0, 1, -4);

    // --- Simple tire track effect ---
    const trackMeshes = [];
    let trackTimer = 0;

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    let prevTime = 0;

    function animate() {
      requestAnimationFrame(animate);

      const dt = Math.min(clock.getDelta(), 0.05);

      // --- Input handling ---
      const throttle = keys.w ? 1.0 : 0.0;
      const brake = keys.s ? 1.0 : 0.0;
      const steerInput = (keys.a ? -1 : 0) + (keys.d ? 1 : 0);

      // --- Velocity ---
      if (throttle > 0) {
        velocity += acceleration * dt;
      }
      if (brake > 0) {
        if (velocity > 0.1) {
          velocity -= brakeForce * dt;
        } else {
          velocity -= acceleration * 0.6 * dt; // reverse
        }
      }

      // Clamp velocity
      velocity = Math.max(-maxReverseSpeed, Math.min(maxSpeed, velocity));

      // Friction
      if (throttle === 0 && brake === 0) {
        velocity *= Math.pow(rollingFriction, dt * 60);
      }

      // Kill tiny velocities
      if (Math.abs(velocity) < 0.02) velocity = 0;

      // --- Steering ---
      const speedFactor = Math.min(Math.abs(velocity) / 5, 1);
      const targetSteer = -steerInput * maxSteerAngle * speedFactor;
      steerAngle += (targetSteer - steerAngle) * steerSpeed * dt * 8;

      // --- Heading (Ackermann-ish) ---
      if (Math.abs(velocity) > 0.05) {
        const turnRadius = wheelBase / (Math.tan(Math.abs(steerAngle)) + 0.0001);
        const angularVel = velocity / turnRadius * Math.sign(steerAngle);
        heading -= angularVel * dt;
      }

      // --- Move car ---
      const dx = Math.sin(heading) * velocity * dt;
      const dz = Math.cos(heading) * velocity * dt;

      const prevX = carGroup.position.x;
      const prevZ = carGroup.position.z;

      carGroup.position.x += dx;
      carGroup.position.z += dz;
      carGroup.rotation.y = heading;

      // --- Collision Detection ---
      const carBox = getCarAABB();
      let collided = false;

      for (const obs of obstacles) {
        if (aabbOverlap(carBox, obs)) {
          collided = true;
          break;
        }
      }

      if (collided) {
        // Bounce back
        carGroup.position.x = prevX;
        carGroup.position.z = prevZ;
        velocity *= -0.3; // bounce
      }

      // --- Wheel Rotation ---
      const wheelRotSpeed = velocity * dt / 0.42; // angular velocity = linear / radius
      wheels.forEach(w => {
        w.children[0].rotation.x += wheelRotSpeed;
        w.children[1].rotation.x += wheelRotSpeed;
      });

      // Front wheel steer visual
      frontWheels.forEach(w => {
        w.rotation.y = steerAngle;
      });

      // --- Camera Follow ---
      const targetCamPos = new THREE.Vector3(
        carGroup.position.x - Math.sin(heading) * cameraOffset.z,
        cameraOffset.y,
        carGroup.position.z - Math.cos(heading) * cameraOffset.z
      );

      camera.position.lerp(targetCamPos, 0.08);

      const lookTarget = new THREE.Vector3(
        carGroup.position.x + Math.sin(heading) * cameraLookOffset.z,
        carGroup.position.y + cameraLookOffset.y,
        carGroup.position.z + Math.cos(heading) * cameraLookOffset.z
      );
      camera.lookAt(lookTarget);

      // --- UI Update ---
      const speedKmh = Math.abs(velocity) * 3.6;
      updateUI(throttle, brake, speedKmh);

      renderer.render(scene, camera);
    }

    // --- Resize Handler ---
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Attach to window for debugging ---
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.car = carGroup;
    window.wheels = wheels;
    window.controls = {
      keys,
      get velocity() { return velocity; },
      get heading() { return heading; },
      get steerAngle() { return steerAngle; },
    };

    // Start
    animate();