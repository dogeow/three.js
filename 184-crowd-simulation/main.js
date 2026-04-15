import * as THREE from 'three';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Config ──────────────────────────────────────────────────────────────
    const BOUNDS = 80;          // half-size of cubic simulation volume
    const LEADER_COUNT = 5;
    const PREDATOR_COUNT = 4;

    const params = {
      num个体数:    200,
      separation:   1.5,
      alignment:    1.0,
      cohesion:     1.0,
      maxSpeed:     0.35,
      maxForce:     0.05,
      predatorWeight:  2.5,
      leaderWeight:    0.8,
      leaderWeight:     0.8,
      perception:   8,
      boundarySoft: 0.18,
      coneHeight:   0.7,
      coneRadius:   0.15,
      predatorColor: '#ff3344',
      leaderColor:  '#ffcc00',
      boidColor:    '#44aaff',
      autoRotate:   true,
      wireframe:    false,
    };

    // ─── Scene ───────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000811, 0.006);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 55, 95);
    camera.lookAt(0, 0, 0);

    // ─── Lighting ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x334466, 1.2));
    const dirLight = new THREE.DirectionalLight(0xaaccff, 1.8);
    dirLight.position.set(40, 80, 30);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x223355, 0.8);
    rimLight.position.set(-30, -20, -50);
    scene.add(rimLight);

    // ─── Boundary wireframe ───────────────────────────────────────────────────
    const boundGeo = new THREE.BoxGeometry(BOUNDS * 2, BOUNDS * 2, BOUNDS * 2);
    const boundEdges = new THREE.EdgesGeometry(boundGeo);
    const boundLine = new THREE.LineSegments(boundEdges,
      new THREE.LineBasicMaterial({ color: 0x1a3355, transparent: true, opacity: 0.35 }));
    scene.add(boundLine);

    // ─── Boid State ───────────────────────────────────────────────────────────
    let agents = [];
    let boidMesh, leaderMesh, predatorMesh;
    let predatorMaterial, leaderMaterial, boidMaterial;

    class Agent {
      constructor(isPredator = false, isLeader = false) {
        this.pos = new THREE.Vector3(
          (Math.random() - 0.5) * BOUNDS * 1.6,
          (Math.random() - 0.5) * BOUNDS * 0.8,
          (Math.random() - 0.5) * BOUNDS * 1.6
        );
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.05 + Math.random() * 0.1;
        this.vel = new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
        this.acc = new THREE.Vector3();
        this.isPredator = isPredator;
        this.isLeader   = isLeader;
        this.maxSpeed   = params.maxSpeed * (isPredator ? 1.6 : isLeader ? 1.3 : 1.0);
        this.maxForce   = params.maxForce * (isPredator ? 2.0 : 1.0);
      }
    }

    // ─── Mesh Setup ───────────────────────────────────────────────────────────
    function createMeshes() {
      // Dispose old
      if (boidMesh)     { boidMesh.dispose();     scene.remove(boidMesh); }
      if (leaderMesh)   { leaderMesh.dispose();   scene.remove(leaderMesh); }
      if (predatorMesh) { predatorMesh.dispose(); scene.remove(predatorMesh); }

      const coneGeo = new THREE.ConeGeometry(params.coneRadius, params.coneHeight, 6);
      boidMaterial = new THREE.MeshPhongMaterial({
        color: params.boidColor, wireframe: params.wireframe, shininess: 80,
        transparent: true, opacity: 0.85,
      });
      leaderMaterial = new THREE.MeshPhongMaterial({
        color: params.leaderColor, wireframe: params.wireframe, shininess: 120,
        transparent: true, opacity: 1.0, emissive: new THREE.Color(params.leaderColor).multiplyScalar(0.3),
      });
      predatorMaterial = new THREE.MeshPhongMaterial({
        color: params.predatorColor, wireframe: params.wireframe, shininess: 100,
        transparent: true, opacity: 1.0, emissive: new THREE.Color(params.predatorColor).multiplyScalar(0.4),
      });

      boidMesh = new THREE.InstancedMesh(coneGeo, boidMaterial, params.numAgents);
      boidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      boidMesh.count = params.numAgents;
      scene.add(boidMesh);

      leaderMesh = new THREE.InstancedMesh(coneGeo, leaderMaterial, LEADER_COUNT);
      leaderMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(leaderMesh);

      predatorMesh = new THREE.InstancedMesh(coneGeo, predatorMaterial, PREDATOR_COUNT);
      predatorMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(predatorMesh);
    }

    // ─── Init Agents ──────────────────────────────────────────────────────────
    function initAgents() {
      agents = [];
      // Predators first
      for (let i = 0; i < PREDATOR_COUNT; i++) agents.push(new Agent(true, false));
      // Leaders
      for (let i = 0; i < LEADER_COUNT; i++)   agents.push(new Agent(false, true));
      // Regular boids
      for (let i = 0; i < params.numAgents; i++) agents.push(new Agent(false, false));
    }

    // ─── Boid Forces ───────────────────────────────────────────────────────────
    function separate(agent, neighbors) {
      if (neighbors.length === 0) return new THREE.Vector3();
      const steer = new THREE.Vector3();
      let count = 0;
      for (const other of neighbors) {
        const d = agent.pos.distanceTo(other.pos);
        if (d > 0 && d < params.perception * 0.6) {
          const diff = new THREE.Vector3().subVectors(agent.pos, other.pos).normalize().divideScalar(d);
          steer.add(diff);
          count++;
        }
      }
      if (count > 0) { steer.divideScalar(count); steer.setLength(agent.maxSpeed); steer.sub(agent.vel); steer.clampLength(0, agent.maxForce); }
      return steer;
    }

    function align(agent, neighbors) {
      if (neighbors.length === 0) return new THREE.Vector3();
      const avg = new THREE.Vector3();
      for (const other of neighbors) avg.add(other.vel);
      avg.divideScalar(neighbors.length);
      avg.setLength(agent.maxSpeed);
      const steer = avg.sub(agent.vel);
      steer.clampLength(0, agent.maxForce);
      return steer;
    }

    function cohere(agent, neighbors) {
      if (neighbors.length === 0) return new THREE.Vector3();
      const center = new THREE.Vector3();
      for (const other of neighbors) center.add(other.pos);
      center.divideScalar(neighbors.length);
      const desired = new THREE.Vector3().subVectors(center, agent.pos);
      desired.setLength(agent.maxSpeed);
      const steer = desired.sub(agent.vel);
      steer.clampLength(0, agent.maxForce);
      return steer;
    }

    function boundaryForce(pos) {
      const f = new THREE.Vector3();
      const d = BOUNDS - 2;
      if (pos.x >  d) f.x = -(pos.x -  d) * params.boundarySoft;
      if (pos.x < -d) f.x =  (pos.x + d) * params.boundarySoft;
      if (pos.y >  d) f.y = -(pos.y -  d) * params.boundarySoft;
      if (pos.y < -d) f.y =  (pos.y + d) * params.boundarySoft;
      if (pos.z >  d) f.z = -(pos.z -  d) * params.boundarySoft;
      if (pos.z < -d) f.z =  (pos.z + d) * params.boundarySoft;
      return f;
    }

    function findNeighbors(agent, predicate) {
      return agents.filter(a =>
        a !== agent &&
        !a.isPredator &&
        predicate(a) &&
        agent.pos.distanceTo(a.pos) < params.perception
      );
    }

    // ─── Update ────────────────────────────────────────────────────────────────
    const _dummy = new THREE.Object3D();
    const _up    = new THREE.Vector3(0, 1, 0);
    const _quat  = new THREE.Quaternion();

    function update() {
      const predators = agents.filter(a => a.isPredator);
      const leaders   = agents.filter(a => a.isLeader);
      const boids     = agents.filter(a => !a.isPredator && !a.isLeader);

      // Compute forces for boids
      for (const agent of boids) {
        const neighbors = findNeighbors(agent, () => true);

        let sep = separate(agent, neighbors).multiplyScalar(params.separation);
        let ali = align(agent, neighbors).multiplyScalar(params.alignment);
        let coh = cohere(agent, neighbors).multiplyScalar(params.cohesion);

        // Flee predators
        let flee = new THREE.Vector3();
        for (const pred of predators) {
          const d = agent.pos.distanceTo(pred.pos);
          if (d < params.perception * 2.5) {
            const diff = new THREE.Vector3().subVectors(agent.pos, pred.pos);
            diff.divideScalar(d * d); // stronger when closer
            flee.add(diff);
          }
        }
        flee.multiplyScalar(params.predatorWeight);

        // Seek leaders
        let seek = new THREE.Vector3();
        for (const leader of leaders) {
          const d = agent.pos.distanceTo(leader.pos);
          if (d < params.perception * 1.8) {
            const diff = new THREE.Vector3().subVectors(leader.pos, agent.pos);
            diff.divideScalar(d);
            seek.add(diff);
          }
        }
        seek.multiplyScalar(params.leaderWeight);

        const bound = boundaryForce(agent.pos);

        agent.acc.add(sep).add(ali).add(coh).add(flee).add(seek).add(bound);
      }

      // Leaders wander with slight cohesion to center
      for (const leader of leaders) {
        const bound = boundaryForce(leader.pos);
        const toCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), leader.pos).multiplyScalar(0.005);
        // gentle wander
        leader.acc.add(bound).add(toCenter);
        leader.acc.x += (Math.random() - 0.5) * 0.01;
        leader.acc.z += (Math.random() - 0.5) * 0.01;
      }

      // Predators wander aggressively, ignore boundary soft
      for (const pred of predators) {
        const bound = boundaryForce(pred.pos);
        pred.acc.add(bound);
        pred.acc.x += (Math.random() - 0.5) * 0.015;
        pred.acc.z += (Math.random() - 0.5) * 0.015;
        pred.acc.y += (Math.random() - 0.5) * 0.005;
      }

      // Integrate
      for (const agent of agents) {
        agent.vel.add(agent.acc);
        agent.vel.clampLength(0, agent.maxSpeed);
        agent.pos.add(agent.vel);
        agent.acc.set(0, 0, 0);

        // Hard boundary wrap
        const H = BOUNDS - 1;
        if (agent.pos.x >  H) agent.pos.x = -H;
        if (agent.pos.x < -H) agent.pos.x =  H;
        if (agent.pos.y >  H) agent.pos.y = -H;
        if (agent.pos.y < -H) agent.pos.y =  H;
        if (agent.pos.z >  H) agent.pos.z = -H;
        if (agent.pos.z < -H) agent.pos.z =  H;
      }

      // Update InstancedMesh matrices
      const boids_list     = agents.filter(a => !a.isPredator && !a.isLeader);
      const leaders_list   = agents.filter(a => a.isLeader);
      const predators_list = agents.filter(a => a.isPredator);

      for (let i = 0; i < boids_list.length; i++) {
        const a = boids_list[i];
        _dummy.position.copy(a.pos);
        _dummy.quaternion.setFromUnitVectors(_up, a.vel.clone().normalize().length() > 0.001 ? a.vel.clone().normalize() : new THREE.Vector3(0,1,0));
        _dummy.updateMatrix();
        boidMesh.setMatrixAt(i, _dummy.matrix);
      }
      boidMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < leaders_list.length; i++) {
        const a = leaders_list[i];
        _dummy.position.copy(a.pos);
        _dummy.quaternion.setFromUnitVectors(_up, a.vel.clone().normalize().length() > 0.001 ? a.vel.clone().normalize() : new THREE.Vector3(0,1,0));
        _dummy.updateMatrix();
        leaderMesh.setMatrixAt(i, _dummy.matrix);
      }
      leaderMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < predators_list.length; i++) {
        const a = predators_list[i];
        _dummy.position.copy(a.pos);
        _dummy.quaternion.setFromUnitVectors(_up, a.vel.clone().normalize().length() > 0.001 ? a.vel.clone().normalize() : new THREE.Vector3(0,1,0));
        _dummy.updateMatrix();
        predatorMesh.setMatrixAt(i, _dummy.matrix);
      }
      predatorMesh.instanceMatrix.needsUpdate = true;
    }

    // ─── Camera orbit ─────────────────────────────────────────────────────────
    let camAngle = 0;
    function orbitCamera() {
      if (!params.autoRotate) return;
      camAngle += 0.0015;
      camera.position.x = Math.sin(camAngle) * 110;
      camera.position.z = Math.cos(camAngle) * 110;
      camera.position.y = 50 + Math.sin(camAngle * 0.3) * 20;
      camera.lookAt(0, 0, 0);
    }

    // ─── Resize ───────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── GUI ──────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: 'Boids Controls' });
    const simFolder = gui.addFolder('Simulation');
    simFolder.add(params, 'numAgents', 50, 500, 1).name('Num Agents').onChange(v => {
      initAgents();
      createMeshes();
    });
    simFolder.add(params, 'maxSpeed', 0.1, 1.0, 0.01).name('Max Speed');
    simFolder.add(params, 'maxForce', 0.01, 0.2, 0.005).name('Max Force');

    const forcesFolder = gui.addFolder('Forces');
    forcesFolder.add(params, 'separation', 0, 5, 0.05).name('Separation');
    forcesFolder.add(params, 'alignment', 0, 5, 0.05).name('Alignment');
    forcesFolder.add(params, 'cohesion', 0, 5, 0.05).name('Cohesion');
    forcesFolder.add(params, 'predatorWeight', 0, 8, 0.1).name('Predator Weight');
    forcesFolder.add(params, 'leaderWeight', 0, 5, 0.05).name('Leader Weight');
    forcesFolder.add(params, 'perception', 2, 25, 0.5).name('Perception Range');
    forcesFolder.add(params, 'boundarySoft', 0.05, 1.0, 0.01).name('Boundary Force');

    const visFolder = gui.addFolder('Visuals');
    visFolder.addColor(params, 'boidColor').name('Boid Color').onChange(v => { boidMaterial.color.set(v); });
    visFolder.addColor(params, 'leaderColor').name('Leader Color').onChange(v => {
      leaderMaterial.color.set(v);
      leaderMaterial.emissive.set(v).multiplyScalar(0.3);
    });
    visFolder.addColor(params, 'predatorColor').name('Predator Color').onChange(v => {
      predatorMaterial.color.set(v);
      predatorMaterial.emissive.set(v).multiplyScalar(0.4);
    });
    visFolder.add(params, 'wireframe').name('Wireframe').onChange(v => {
      boidMaterial.wireframe = v;
      leaderMaterial.wireframe = v;
      predatorMaterial.wireframe = v;
    });
    visFolder.add(params, 'autoRotate').name('Auto Rotate Camera');
    visFolder.close();

    // ─── FPS counter ───────────────────────────────────────────────────────────
    let lastTime = performance.now();
    let frameCount = 0;
    const fpsEl = document.getElementById('fps');
    const countEl = document.getElementById('count');

    function tickFPS() {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        fpsEl.textContent = `帧率: ${frameCount}`;
        frameCount = 0;
        lastTime = now;
      }
    }

    // ─── Boot ──────────────────────────────────────────────────────────────────
    createMeshes();
    initAgents();
    countEl.textContent = `个体数: ${agents.length}`;

    // ─── Render Loop ───────────────────────────────────────────────────────────
    function animate() {
      requestAnimationFrame(animate);
      update();
      orbitCamera();
      renderer.render(scene, camera);
      tickFPS();
    }

    animate();