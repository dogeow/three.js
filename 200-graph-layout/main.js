import * as THREE from 'three';
    import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Scene Setup ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 80);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(innerWidth, innerHeight);
    labelRenderer.domElement.id = 'label-container';
    document.body.appendChild(labelRenderer.domElement);

    const labelContainer = document.getElementById('label-container');

    // ─── Simulation Parameters ────────────────────────────────────────────
    const params = {
      repulsion: 800,
      springStiffness: 0.04,
      springLength: 12,
      damping: 0.88,
      showLabels: true,
      gravity: 0.02,
    };

    // ─── Graph Data ───────────────────────────────────────────────────────
    const nodes = [];
    const edges = [];
    const nodeMeshMap = new Map();
    const nodeLabelMap = new Map();
    const edgeMeshMap = new Map();
    let nodeIdCounter = 0;

    // ─── Color helpers ─────────────────────────────────────────────────────
    function degreeColor(degree, maxDegree) {
      const t = maxDegree <= 1 ? 0 : Math.log(degree + 1) / Math.log(maxDegree + 1);
      const color = new THREE.Color();
      // cyan → magenta → yellow for high-degree nodes
      color.setHSL(0.55 + t * 0.35, 1.0, 0.55 + t * 0.1);
      return color;
    }

    function nodeSize(degree, maxDegree) {
      const base = 0.8;
      const scale = maxDegree <= 1 ? 0 : (degree / maxDegree) * 1.4;
      return base + scale;
    }

    // ─── Node Creation ─────────────────────────────────────────────────────
    function addNode(x = (Math.random() - 0.5) * 60,
                    y = (Math.random() - 0.5) * 60,
                    z = (Math.random() - 0.5) * 20) {
      const id = nodeIdCounter++;
      const pos = { x, y, z, px: x, py: y, ppx: x, ppy: y, fx: 0, fy: 0 };

      const degree = 0;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(nodeSize(degree, 1), 20, 20),
        new THREE.MeshStandardMaterial({
          color: degreeColor(degree, 1),
          emissive: new THREE.Color(0x112244),
          roughness: 0.3,
          metalness: 0.6,
        })
      );
      mesh.position.set(x, y, z);
      mesh.userData = { nodeId: id };
      scene.add(mesh);

      const label = document.createElement('div');
      label.className = 'node-label';
      label.textContent = `#${id}`;
      const labelObj = new CSS2DObject(label);
      labelObj.position.set(0, 0, 0);
      mesh.add(labelObj);
      labelObj.visible = params.showLabels;

      nodes.push(pos);
      nodeMeshMap.set(id, mesh);
      nodeLabelMap.set(id, labelObj);
      return id;
    }

    // ─── Edge Creation ─────────────────────────────────────────────────────
    function addEdge(aId, bId) {
      if (aId === bId) return;
      if (edges.some(e => (e.a === aId && e.b === bId) || (e.a === bId && e.b === aId))) return;

      const aMesh = nodeMeshMap.get(aId);
      const bMesh = nodeMeshMap.get(bId);
      if (!aMesh || !bMesh) return;

      const positions = new Float32Array([
        aMesh.position.x, aMesh.position.y, aMesh.position.z,
        bMesh.position.x, bMesh.position.y, bMesh.position.z,
      ]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.35,
      });
      const line = new THREE.LineSegments(geo, mat);
      scene.add(line);

      const edge = { a: aId, b: bId, mesh: line };
      edges.push(edge);
      edgeMeshMap.set(`${aId}-${bId}`, line);
    }

    // ─── Degree Update ─────────────────────────────────────────────────────
    function recomputeDegrees() {
      const degree = {};
      nodes.forEach((_, i) => { degree[i] = 0; });
      edges.forEach(e => {
        degree[e.a] = (degree[e.a] || 0) + 1;
        degree[e.b] = (degree[e.b] || 0) + 1;
      });
      let maxDeg = 0;
      nodes.forEach((_, i) => { if (degree[i] > maxDeg) maxDeg = degree[i]; });
      return { degree, maxDeg };
    }

    function applyNodeAppearance() {
      const { degree, maxDeg } = recomputeDegrees();
      nodes.forEach((n, i) => {
        const mesh = nodeMeshMap.get(i);
        if (!mesh) return;
        const d = degree[i] || 0;
        mesh.material.color.copy(degreeColor(d, maxDeg));
        mesh.scale.setScalar(nodeSize(d, maxDeg));
      });
    }

    // ─── Scale-Free Network (Barabási–Albert) ──────────────────────────────
    function buildScaleFreeNetwork(nodeCount = 40, initialLinks = 3) {
      // Start with a small fully-connected core
      for (let i = 0; i < initialLinks; i++) {
        addNode();
      }
      for (let i = 0; i < initialLinks; i++) {
        for (let j = i + 1; j < initialLinks; j++) {
          addEdge(i, j);
        }
      }

      // Preferential attachment
      const degrees = [];
      for (let i = 0; i < initialLinks; i++) degrees.push(initialLinks - 1);

      for (let n = initialLinks; n < nodeCount; n++) {
        const newId = addNode();
        let linksAdded = 0;
        const targetLinks = Math.floor(Math.random() * 3) + 1;

        while (linksAdded < targetLinks && linksAdded < n) {
          // Weighted random selection
          const total = degrees.reduce((s, d) => s + d + 1, 0);
          let r = Math.random() * total;
          let target = 0;
          for (let i = 0; i < n; i++) {
            r -= degrees[i] + 1;
            if (r <= 0) { target = i; break; }
          }
          if (target !== newId) {
            const before = edges.length;
            addEdge(newId, target);
            if (edges.length > before) {
              degrees[target] = (degrees[target] || 0) + 1;
              degrees.push(0);
              linksAdded++;
            }
          }
        }
        degrees[newId] = linksAdded;
      }
      applyNodeAppearance();
    }

    // ─── Physics Simulation ───────────────────────────────────────────────
    let lastTime = performance.now();
    let simTime = 0;

    function simulate(dt) {
      const dtS = Math.min(dt, 0.05);
      simTime += dtS;

      // Reset forces
      nodes.forEach(n => { n.fx = 0; n.fy = 0; });

      // Repulsion (Coulomb) — all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const distSq = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(distSq);
          const force = params.repulsion / distSq;
          const fx = force * dx / dist;
          const fy = force * dy / dist;
          a.fx -= fx; a.fy -= fy;
          b.fx += fx; b.fy += fy;
        }
      }

      // Spring attraction along edges
      edges.forEach(e => {
        const a = nodes[e.a], b = nodes[e.b];
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        const displacement = dist - params.springLength;
        const force = params.springStiffness * displacement;
        const fx = force * dx / dist;
        const fy = force * dy / dist;
        a.fx += fx; a.fy += fy;
        b.fx -= fx; b.fy -= fy;
      });

      // Center gravity
      nodes.forEach(n => {
        n.fx -= n.x * params.gravity;
        n.fy -= n.y * params.gravity;
      });

      // Verlet integration
      nodes.forEach((n, i) => {
        if (n === draggedNode) return;
        const vx = (n.x - n.px) * params.damping;
        const vy = (n.y - n.py) * params.damping;
        n.ppx = n.px; n.ppy = n.py;
        n.px = n.x; n.py = n.y;
        n.x += vx + n.fx * dtS * dtS;
        n.y += vy + n.fy * dtS * dtS;
      });

      // Update meshes
      nodes.forEach((n, i) => {
        const mesh = nodeMeshMap.get(i);
        if (mesh) {
          mesh.position.x = n.x;
          mesh.position.y = n.y;
        }
      });

      // Update edge geometry
      edges.forEach(e => {
        const aMesh = nodeMeshMap.get(e.a);
        const bMesh = nodeMeshMap.get(e.b);
        if (!aMesh || !bMesh) return;
        const posAttr = e.mesh.geometry.getAttribute('position');
        posAttr.setXYZ(0, aMesh.position.x, aMesh.position.y, aMesh.position.z);
        posAttr.setXYZ(1, bMesh.position.x, bMesh.position.y, bMesh.position.z);
        posAttr.needsUpdate = true;
      });
    }

    // ─── Interaction ───────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let draggedNode = null;
    let hoveredNode = null;
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const planeHit = new THREE.Vector3();

    function getNodeMeshes() {
      return Array.from(nodeMeshMap.values());
    }

    function getMouseNode(event) {
      mouse.x = (event.clientX / innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(getNodeMeshes());
      if (hits.length > 0) {
        const id = hits[0].object.userData.nodeId;
        return { mesh: hits[0].object, node: nodes[id], id };
      }
      return null;
    }

    window.addEventListener('mousemove', e => {
      mouse.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / innerHeight) * 2 + 1;

      if (draggedNode !== null) {
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(plane, planeHit);
        const n = nodes[draggedNode];
        n.x = planeHit.x;
        n.y = planeHit.y;
        n.px = n.x; n.py = n.y;
        n.ppx = n.x; n.ppy = n.y;
      }
    });

    window.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const hit = getMouseNode(e);
      if (hit) {
        draggedNode = hit.id;
        const n = nodes[draggedNode];
        n.px = n.x; n.py = n.y;
        n.ppx = n.x; n.ppy = n.y;
      }
    });

    window.addEventListener('mouseup', () => {
      draggedNode = null;
    });

    window.addEventListener('dblclick', e => {
      if (e.target !== renderer.domElement) return;
      mouse.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(getNodeMeshes());
      if (hits.length === 0) {
        raycaster.ray.intersectPlane(plane, planeHit);
        const newId = addNode(planeHit.x, planeHit.y, 0);
        // Connect new node to 1-2 random existing nodes
        const numLinks = Math.floor(Math.random() * 2) + 1;
        const shuffled = nodes.map((_, i) => i).filter(i => i !== newId).sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(numLinks, shuffled.length); i++) {
          addEdge(newId, shuffled[i]);
        }
        applyNodeAppearance();
      }
    });

    window.addEventListener('contextmenu', e => {
      e.preventDefault();
      const hit = getMouseNode(e);
      if (hit) {
        const removeId = hit.id;
        // Remove connected edges
        for (let i = edges.length - 1; i >= 0; i--) {
          if (edges[i].a === removeId || edges[i].b === removeId) {
            scene.remove(edges[i].mesh);
            edges.splice(i, 1);
          }
        }
        // Remove node
        scene.remove(hit.mesh);
        nodes[removeId] = null;
        nodeMeshMap.delete(removeId);
        nodeLabelMap.delete(removeId);
        applyNodeAppearance();
      }
    });

    // ─── GUI ───────────────────────────────────────────────────────────────
    const gui = new GUI({ title: 'Graph Controls' });
    gui.add(params, 'repulsion', 50, 2000, 10).name('Repulsion').onChange(applyNodeAppearance);
    gui.add(params, 'springStiffness', 0.001, 0.2, 0.001).name('Spring Stiffness');
    gui.add(params, 'springLength', 3, 40, 1).name('Spring Length');
    gui.add(params, 'damping', 0.5, 0.99, 0.01).name('Damping');
    gui.add(params, 'gravity', 0, 0.1, 0.001).name('Gravity');
    gui.add(params, 'showLabels').name('Show Labels').onChange(v => {
      nodeLabelMap.forEach(l => { l.visible = v; });
    });

    // ─── Build Initial Graph ───────────────────────────────────────────────
    buildScaleFreeNetwork(40, 3);

    // ─── Animation Loop ────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      simulate(dt);

      // Gentle camera sway
      camera.position.x = Math.sin(simTime * 0.05) * 3;
      camera.position.y = Math.cos(simTime * 0.04) * 3;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }

    animate();

    // ─── Resize ───────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      labelRenderer.setSize(innerWidth, innerHeight);
    });